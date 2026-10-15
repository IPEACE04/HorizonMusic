import "server-only";

import type { Pool } from "pg";

import { databasePool } from "@/lib/db";
import { expireOverdueBookings } from "@/server/bookings/lifecycle";
import {
  parseAdminBookingFilters,
  parseBookingPolicyInput,
  type AdminBookingStatus,
} from "@/server/admin/operations-contracts";

export class AdminOperationsError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function addFilter(
  conditions: string[],
  values: unknown[],
  sql: string,
  value: unknown,
) {
  values.push(value);
  conditions.push(sql.replaceAll("?", `$${values.length}`));
}

export async function listAdminBookings(
  params: URLSearchParams,
  pool: Pool = databasePool,
) {
  await expireOverdueBookings(pool);
  const filters = parseAdminBookingFilters(params);
  const values: unknown[] = [];
  const conditions: string[] = [];
  if (filters.search)
    addFilter(
      conditions,
      values,
      `(b.booking_number ilike ? or u.name ilike ? or u.email ilike ?)`,
      `%${filters.search}%`,
    );
  if (filters.status)
    addFilter(conditions, values, `b.status = ?`, filters.status);
  if (filters.roomId && uuid.test(filters.roomId))
    addFilter(conditions, values, `b.room_id = ?::uuid`, filters.roomId);
  if (filters.from)
    addFilter(
      conditions,
      values,
      `b.starts_at >= ?::timestamptz`,
      filters.from,
    );
  if (filters.to)
    addFilter(conditions, values, `b.starts_at < ?::timestamptz`, filters.to);
  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
  const count = await pool.query<{ count: string }>(
    `select count(*)::text as count from public.bookings b join public."user" u on u.id=b.user_id ${where}`,
    values,
  );
  const offset = (filters.page - 1) * filters.pageSize;
  const listValues = [...values, filters.pageSize, offset];
  const rows = await pool.query(
    `select b.id,b.booking_number as "bookingNumber",b.user_id as "userId",u.name as "customerName",u.email,b.room_id as "roomId",b.room_name_snapshot as "roomName",b.starts_at as "startsAt",b.ends_at as "endsAt",b.duration_minutes as "durationMinutes",b.status,b.total_amount::float8 as "totalAmount",b.payment_due_at as "paymentDueAt",b.created_at as "createdAt" from public.bookings b join public."user" u on u.id=b.user_id ${where} order by b.starts_at desc,b.id desc limit $${listValues.length - 1} offset $${listValues.length}`,
    listValues,
  );
  const total = Number(count.rows[0]?.count ?? 0);
  return {
    items: rows.rows,
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    hasMore: offset + rows.rows.length < total,
  };
}

export async function getAdminBooking(id: string, pool: Pool = databasePool) {
  await expireOverdueBookings(pool);
  const booking = await pool.query(
    `select b.id,b.booking_number as "bookingNumber",b.user_id as "userId",u.name as "customerName",u.email,b.room_id as "roomId",b.room_name_snapshot as "roomName",b.starts_at as "startsAt",b.ends_at as "endsAt",b.duration_minutes as "durationMinutes",b.status,b.room_subtotal::float8 as "roomSubtotal",b.addon_subtotal::float8 as "addonSubtotal",b.subtotal::float8,b.discount_amount::float8 as "discountAmount",b.total_amount::float8 as "totalAmount",b.currency,b.promo_code_snapshot as "promoCode",b.payment_due_at as "paymentDueAt",b.created_at as "createdAt" from public.bookings b join public."user" u on u.id=b.user_id where b.id=$1::uuid`,
    [id],
  );
  if (!booking.rows[0])
    throw new AdminOperationsError("BOOKING_NOT_FOUND", "ไม่พบรายการจอง", 404);
  const [addons, history, payments] = await Promise.all([
    pool.query(
      `select addon_id as id,name_snapshot as name,pricing_type_snapshot as "pricingType",unit_price_snapshot::float8 as "unitPrice",quantity,line_total::float8 as "lineTotal" from public.booking_addons where booking_id=$1::uuid order by id`,
      [id],
    ),
    pool.query(
      `select from_status as "fromStatus",to_status as "toStatus",actor_type as "actorType",reason,created_at as "createdAt" from public.booking_status_history where booking_id=$1::uuid order by created_at,id`,
      [id],
    ),
    pool.query(
      `select id,attempt_number as "attemptNumber",amount::float8,status,submitted_at as "submittedAt",reviewed_at as "reviewedAt",review_note as "reviewNote" from public.payments where booking_id=$1::uuid order by attempt_number desc`,
      [id],
    ),
  ]);
  return {
    ...booking.rows[0],
    addons: addons.rows,
    history: history.rows,
    payments: payments.rows,
  };
}

const transitions: Record<string, readonly AdminBookingStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED", "EXPIRED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export async function transitionAdminBooking(
  id: string,
  actorId: string,
  nextStatus: AdminBookingStatus,
  reason: string | undefined,
  pool: Pool = databasePool,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await expireOverdueBookings(client);
    const current = await client.query<{
      status: AdminBookingStatus;
      user_id: string;
      total_amount: string;
    }>(
      `select status,user_id,total_amount from public.bookings where id=$1::uuid for update`,
      [id],
    );
    const booking = current.rows[0];
    if (!booking)
      throw new AdminOperationsError(
        "BOOKING_NOT_FOUND",
        "ไม่พบรายการจอง",
        404,
      );
    if (!transitions[booking.status]?.includes(nextStatus))
      throw new AdminOperationsError(
        "INVALID_BOOKING_TRANSITION",
        `ไม่สามารถเปลี่ยนจาก ${booking.status} เป็น ${nextStatus}`,
        409,
      );
    const safeReason = reason?.trim() || null;
    if (nextStatus === "CANCELLED" && !safeReason)
      throw new AdminOperationsError(
        "CANCELLATION_REASON_REQUIRED",
        "กรุณาระบุเหตุผลการยกเลิก",
      );
    await client.query(
      `update public.bookings set status=$2::public.booking_status,cancelled_at=case when $2::public.booking_status='CANCELLED' then now() else cancelled_at end,cancelled_by=case when $2::public.booking_status='CANCELLED' then $3 else cancelled_by end,cancellation_reason=case when $2::public.booking_status='CANCELLED' then $4 else cancellation_reason end,confirmed_at=case when $2::public.booking_status='CONFIRMED' then coalesce(confirmed_at,now()) else confirmed_at end,completed_at=case when $2::public.booking_status='COMPLETED' then coalesce(completed_at,now()) else completed_at end,updated_at=now() where id=$1::uuid`,
      [id, nextStatus, actorId, safeReason],
    );
    if (nextStatus === "CANCELLED") {
      await client.query(
        `update public.promo_redemptions set status='RELEASED',released_at=now() where booking_id=$1::uuid and status='RESERVED'`,
        [id],
      );
      await client.query(
        `update public.payments set status='REFUND_PENDING',refund_amount=amount,updated_at=now() where booking_id=$1::uuid and status='PAID'`,
        [id],
      );
    }
    await client.query(
      `insert into public.booking_status_history (booking_id,from_status,to_status,actor_type,actor_user_id,reason) values ($1::uuid,$2,$3,'ADMIN',$4,$5)`,
      [
        id,
        booking.status,
        nextStatus,
        actorId,
        safeReason ?? "เปลี่ยนสถานะโดย Admin",
      ],
    );
    await client.query(
      `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id,metadata) values ('ADMIN',$1,'BOOKING_STATUS_CHANGED','BOOKING',$2,jsonb_build_object('fromStatus',$3::text,'toStatus',$4::text))`,
      [actorId, id, booking.status, nextStatus],
    );
    await client.query(
      `insert into public.notifications (user_id,type,title,body,data) values ($1,'BOOKING',$2,$3,jsonb_build_object('bookingId',$4::uuid))`,
      [
        booking.user_id,
        nextStatus === "CANCELLED"
          ? "การจองถูกยกเลิก"
          : "สถานะการจองอัปเดตแล้ว",
        `รายการจองของคุณเปลี่ยนเป็น ${nextStatus}`,
        id,
      ],
    );
    await client.query("commit");
    return { id, status: nextStatus };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function listAdminCalendar(
  from: string,
  to: string,
  roomId?: string,
  pool: Pool = databasePool,
) {
  await expireOverdueBookings(pool);
  const values: unknown[] = [from, to];
  const roomFilter = roomId && uuid.test(roomId) ? `and room_id=$3::uuid` : "";
  if (roomFilter) values.push(roomId);
  const result = await pool.query(
    `select b.id as "eventId",b.room_id as "roomId",b.room_name_snapshot as "roomName",b.starts_at as "startsAt",b.ends_at as "endsAt",b.status::text as "eventStatus",'BOOKING' as "eventType" from public.bookings b where b.status in ('PENDING_PAYMENT','CONFIRMED') and b.starts_at < $2::timestamptz and b.ends_at > $1::timestamptz ${roomFilter} union all select rb.id as "eventId",rb.room_id as "roomId",r.name as "roomName",rb.starts_at as "startsAt",rb.ends_at as "endsAt",rb.type::text as "eventStatus",'BLOCK' as "eventType" from public.room_blocks rb join public.rooms r on r.id=rb.room_id where rb.starts_at < $2::timestamptz and rb.ends_at > $1::timestamptz ${roomFilter.replace("room_id", "rb.room_id")} order by "startsAt","roomName"`,
    values,
  );
  return result.rows;
}

export async function listAdminUsers(
  params: URLSearchParams,
  pool: Pool = databasePool,
) {
  const search = params.get("search")?.trim();
  const page = Math.max(1, Number(params.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(10, Number(params.get("pageSize") || 50)),
  );
  const values: unknown[] = [];
  const where = search
    ? (() => {
        values.push(`%${search}%`);
        return `where u.name ilike $1 or u.email ilike $1`;
      })()
    : "";
  const count = await pool.query<{ count: string }>(
    `select count(*)::text as count from public."user" u ${where}`,
    values,
  );
  const listValues = [...values, pageSize, (page - 1) * pageSize];
  const result = await pool.query(
    `select u.id,u.name,u.email,u.role,u.created_at as "createdAt",p.phone,(select count(*)::int from public.bookings b where b.user_id=u.id) as "bookingCount" from public."user" u left join public.user_profiles p on p.user_id=u.id ${where} order by u.created_at desc,u.id limit $${listValues.length - 1} offset $${listValues.length}`,
    listValues,
  );
  const total = Number(count.rows[0]?.count ?? 0);
  return {
    items: result.rows,
    page,
    pageSize,
    total,
    hasMore: (page - 1) * pageSize + result.rows.length < total,
  };
}

export async function getAdminUser(id: string, pool: Pool = databasePool) {
  const user = await pool.query(
    `select u.id,u.name,u.email,u.role,u.created_at as "createdAt",p.first_name as "firstName",p.last_name as "lastName",p.phone from public."user" u left join public.user_profiles p on p.user_id=u.id where u.id=$1`,
    [id],
  );
  if (!user.rows[0])
    throw new AdminOperationsError("USER_NOT_FOUND", "ไม่พบผู้ใช้งาน", 404);
  const bookings = await pool.query(
    `select id,booking_number as "bookingNumber",room_name_snapshot as "roomName",starts_at as "startsAt",status,total_amount::float8 as "totalAmount" from public.bookings where user_id=$1 order by starts_at desc limit 20`,
    [id],
  );
  return { ...user.rows[0], bookings: bookings.rows };
}

export async function listActivityLogs(
  params: URLSearchParams,
  pool: Pool = databasePool,
) {
  const values: unknown[] = [];
  const conditions: string[] = [];
  const add = (sql: string, value: unknown) =>
    addFilter(conditions, values, sql, value);
  const search = params.get("search")?.trim();
  if (search)
    add(
      `(a.action ilike ? or a.entity_type ilike ? or a.entity_id ilike ? or coalesce(u.name,'') ilike ?)`,
      `%${search}%`,
    );
  if (params.get("action")) add(`a.action = ?`, params.get("action"));
  if (params.get("entityType"))
    add(`a.entity_type = ?`, params.get("entityType"));
  if (params.get("from"))
    add(`a.created_at >= ?::timestamptz`, params.get("from"));
  if (params.get("to")) add(`a.created_at < ?::timestamptz`, params.get("to"));
  const page = Math.max(1, Number(params.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(10, Number(params.get("pageSize") || 50)),
  );
  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
  const count = await pool.query<{ count: string }>(
    `select count(*)::text as count from public.activity_logs a left join public."user" u on u.id=a.actor_user_id ${where}`,
    values,
  );
  const listValues = [...values, pageSize, (page - 1) * pageSize];
  const result = await pool.query(
    `select a.id,a.actor_type as "actorType",a.actor_user_id as "actorUserId",coalesce(u.name,a.actor_type::text) as "actorName",a.action,a.entity_type as "entityType",a.entity_id as "entityId",a.before_data as "beforeData",a.after_data as "afterData",a.metadata,a.created_at as "createdAt" from public.activity_logs a left join public."user" u on u.id=a.actor_user_id ${where} order by a.created_at desc,a.id desc limit $${listValues.length - 1} offset $${listValues.length}`,
    listValues,
  );
  const total = Number(count.rows[0]?.count ?? 0);
  return {
    items: result.rows,
    page,
    pageSize,
    total,
    hasMore: (page - 1) * pageSize + result.rows.length < total,
  };
}

export async function getActivityLog(id: string, pool: Pool = databasePool) {
  const result = await pool.query(
    `select a.id,a.actor_type as "actorType",a.actor_user_id as "actorUserId",coalesce(u.name,a.actor_type::text) as "actorName",a.action,a.entity_type as "entityType",a.entity_id as "entityId",a.before_data as "beforeData",a.after_data as "afterData",a.metadata,a.request_id as "requestId",a.created_at as "createdAt" from public.activity_logs a left join public."user" u on u.id=a.actor_user_id where a.id=$1::uuid`,
    [id],
  );
  if (!result.rows[0])
    throw new AdminOperationsError(
      "ACTIVITY_LOG_NOT_FOUND",
      "ไม่พบ Activity log",
      404,
    );
  return result.rows[0];
}

export async function getBookingPolicy(pool: Pool = databasePool) {
  const result = await pool.query<{
    value: Record<string, unknown>;
    version: number;
  }>(
    `select value,version from public.system_settings where key='booking.policy'`,
  );
  const row = result.rows[0];
  if (!row)
    throw new AdminOperationsError(
      "SETTING_NOT_FOUND",
      "ไม่พบ Booking policy",
      404,
    );
  return { ...row.value, version: row.version };
}

export async function updateBookingPolicy(
  actorId: string,
  raw: unknown,
  pool: Pool = databasePool,
) {
  const input = parseBookingPolicyInput(raw);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query<{
      value: Record<string, unknown>;
      version: number;
    }>(
      `update public.system_settings set value = value || $1::jsonb, updated_by=$2 where key='booking.policy' and version=$3 returning value,version`,
      [
        JSON.stringify({
          open24Hours: input.open24Hours,
          minimumMinutes: input.minimumMinutes,
          incrementMinutes: input.incrementMinutes,
          cancellationCutoffHours: input.cancellationCutoffHours,
          paymentDueMinutes: input.paymentDueMinutes,
        }),
        actorId,
        input.version,
      ],
    );
    if (!result.rows[0])
      throw new AdminOperationsError(
        "SETTING_VERSION_CONFLICT",
        "ข้อมูลถูกแก้ไขโดยผู้ใช้งานอื่น กรุณาโหลดใหม่",
        409,
      );
    await client.query(
      `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id,after_data) values ('ADMIN',$1,'SETTING_UPDATED','SYSTEM_SETTING','booking.policy',$2::jsonb)`,
      [actorId, JSON.stringify(result.rows[0].value)],
    );
    await client.query("commit");
    return { ...result.rows[0].value, version: result.rows[0].version };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
