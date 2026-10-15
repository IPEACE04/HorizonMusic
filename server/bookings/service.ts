import "server-only";

import type { Pool, PoolClient } from "pg";
import { createHash, randomUUID } from "node:crypto";

import { databasePool } from "@/lib/db";
import { expireOverdueBookings } from "@/server/bookings/lifecycle";
import type { BookingIntent } from "@/server/bookings/contracts";
import {
  calculateQuote,
  overlaps,
  validateBookingTime,
} from "@/server/bookings/policy";
import {
  canCancelBooking,
  satangToDatabaseMoney,
} from "@/server/bookings/policy";

type Queryable = Pick<Pool | PoolClient, "query">;
type RoomRow = {
  hourly_rate: string;
  id: string;
  name: string;
  status: string;
};
type AddonRow = {
  description: string;
  id: string;
  name: string;
  pricing_type: "FIXED" | "PER_HOUR" | "PER_UNIT";
  unit_price: string;
};
type PromoRow = {
  code: string;
  discount_type: "FIXED" | "PERCENTAGE";
  discount_value: string;
  id: string;
  max_discount_amount: string | null;
  min_booking_amount: string;
};

export class BookingDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

async function loadPricing(
  queryable: Queryable,
  intent: BookingIntent,
  userId?: string,
) {
  const roomResult = await queryable.query<RoomRow>(
    `select id, name, hourly_rate, status from public.rooms where id = $1 and is_published = true and deleted_at is null limit 1`,
    [intent.roomId],
  );
  const room = roomResult.rows[0];
  if (!room)
    throw new BookingDomainError("ROOM_NOT_FOUND", "ไม่พบห้องที่ต้องการ", 404);
  if (room.status !== "AVAILABLE")
    throw new BookingDomainError(
      "ROOM_UNAVAILABLE",
      "ห้องนี้ยังไม่พร้อมให้จอง",
      409,
    );

  const ids = intent.addons.map((addon) => addon.id);
  const addons = ids.length
    ? (
        await queryable.query<AddonRow>(
          `select id, name, description, pricing_type, unit_price from public.addons where id = any($1::uuid[]) and is_active = true and deleted_at is null`,
          [ids],
        )
      ).rows
    : [];
  if (addons.length !== new Set(ids).size)
    throw new BookingDomainError(
      "INVALID_ADDON",
      "บริการเสริมบางรายการไม่พร้อมใช้งาน",
    );
  const selectedAddons = addons.map((addon) => ({
    ...addon,
    quantity: intent.addons.find((item) => item.id === addon.id)?.quantity ?? 1,
  }));

  let promo: PromoRow | null = null;
  if (intent.promoCode) {
    const result = await queryable.query<PromoRow>(
      `
      select p.id, p.code::text, p.discount_type, p.discount_value, p.max_discount_amount, p.min_booking_amount
      from public.promo_codes p
      where p.code = $1 and p.is_active = true and p.deleted_at is null and p.starts_at <= now()
        and (p.ends_at is null or p.ends_at > now())
        and (p.applies_to_all_rooms or exists (select 1 from public.promo_code_rooms pr where pr.promo_code_id = p.id and pr.room_id = $2))
        and (p.total_usage_limit is null or (select count(*) from public.promo_redemptions r where r.promo_code_id = p.id and r.status in ('RESERVED','APPLIED')) < p.total_usage_limit)
        and ($3::text is null or p.per_user_limit is null or (select count(*) from public.promo_redemptions r where r.promo_code_id = p.id and r.user_id = $3 and r.status in ('RESERVED','APPLIED')) < p.per_user_limit)
      limit 1
    `,
      [intent.promoCode, intent.roomId, userId ?? null],
    );
    promo = result.rows[0] ?? null;
    if (!promo)
      throw new BookingDomainError(
        "PROMO_INELIGIBLE",
        "โค้ดส่วนลดหมดอายุ ไม่ตรงเงื่อนไข หรือครบจำนวนแล้ว",
      );
  }
  const quote = calculateQuote({
    addons: selectedAddons.map((addon) => ({
      pricingType: addon.pricing_type,
      quantity: addon.quantity,
      unitPrice: addon.unit_price,
    })),
    durationMinutes: intent.durationMinutes,
    promo: promo
      ? {
          discountType: promo.discount_type,
          discountValue: promo.discount_value,
          maxDiscountAmount: promo.max_discount_amount,
          minBookingAmount: promo.min_booking_amount,
        }
      : null,
    roomHourlyRate: room.hourly_rate,
  });
  return { addons: selectedAddons, promo, quote, room };
}

export async function checkAvailability(
  roomId: string,
  startsAt: string,
  durationMinutes: number,
  queryable: Queryable = databasePool,
) {
  const range = validateBookingTime(startsAt, durationMinutes);
  await expireOverdueBookings(queryable);
  const roomResult = await queryable.query<{ status: string }>(
    `select status from public.rooms where id = $1 and is_published = true and deleted_at is null`,
    [roomId],
  );
  if (!roomResult.rows[0])
    throw new BookingDomainError("ROOM_NOT_FOUND", "ไม่พบห้องที่ต้องการ", 404);
  if (roomResult.rows[0].status !== "AVAILABLE")
    return { available: false, endsAt: range.endsAt, reason: "ROOM_STATUS" };
  const busy = await queryable.query<{ ends_at: Date; starts_at: Date }>(
    `
    select starts_at, ends_at from public.room_blocks where room_id = $1 and starts_at < $3 and ends_at > $2
    union all
    select starts_at, ends_at from public.bookings where room_id = $1 and status in ('PENDING_PAYMENT','CONFIRMED') and starts_at < $3 and ends_at > $2
  `,
    [roomId, range.startsAt, range.endsAt],
  );
  const conflicting = busy.rows.some((item) =>
    overlaps(
      range.startsAt,
      range.endsAt,
      item.starts_at.toISOString(),
      item.ends_at.toISOString(),
    ),
  );
  return {
    available: !conflicting,
    endsAt: range.endsAt,
    reason: conflicting ? "TIME_CONFLICT" : null,
  };
}

export async function getActiveAddons(queryable: Queryable = databasePool) {
  const result = await queryable.query<AddonRow>(
    `select id, name, description, pricing_type, unit_price from public.addons where is_active = true and deleted_at is null order by name`,
  );
  return result.rows.map((row) => ({
    description: row.description,
    id: row.id,
    name: row.name,
    pricingType: row.pricing_type,
    unitPrice: Number(row.unit_price),
  }));
}

export async function getBookingQuote(
  intent: BookingIntent,
  userId?: string,
  queryable: Queryable = databasePool,
) {
  validateBookingTime(intent.startsAt, intent.durationMinutes);
  const availability = await checkAvailability(
    intent.roomId,
    intent.startsAt,
    intent.durationMinutes,
    queryable,
  );
  if (!availability.available)
    throw new BookingDomainError(
      "BOOKING_CONFLICT",
      "ช่วงเวลานี้ไม่ว่าง กรุณาเลือกเวลาใหม่",
      409,
    );
  const pricing = await loadPricing(queryable, intent, userId);
  const money = (satang: number) => satang / 100;
  return {
    addons: pricing.addons.map((addon) => ({
      id: addon.id,
      lineTotal: money(
        calculateQuote({
          addons: [
            {
              pricingType: addon.pricing_type,
              quantity: addon.quantity,
              unitPrice: addon.unit_price,
            },
          ],
          durationMinutes: intent.durationMinutes,
          roomHourlyRate: "0.00",
        }).addonSubtotal,
      ),
      name: addon.name,
      quantity: addon.quantity,
    })),
    currency: "THB",
    discountAmount: money(pricing.quote.discountAmount),
    endsAt: availability.endsAt,
    roomName: pricing.room.name,
    roomSubtotal: money(pricing.quote.roomSubtotal),
    addonSubtotal: money(pricing.quote.addonSubtotal),
    subtotal: money(pricing.quote.subtotal),
    totalAmount: money(pricing.quote.totalAmount),
    promoCode: pricing.promo?.code ?? null,
  };
}

function payloadHash(intent: BookingIntent) {
  const canonical = JSON.stringify({
    ...intent,
    addons: [...intent.addons].sort((a, b) => a.id.localeCompare(b.id)),
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export async function createBooking(
  intent: BookingIntent,
  userId: string,
  pool: Pool = databasePool,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const hash = payloadHash(intent);
    const existing = await client.query<{
      id: string;
      idempotency_payload_hash: string;
    }>(
      `select id, idempotency_payload_hash from public.bookings where user_id = $1 and idempotency_key = $2`,
      [userId, intent.idempotencyKey],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].idempotency_payload_hash !== hash)
        throw new BookingDomainError(
          "IDEMPOTENCY_MISMATCH",
          "คำขอนี้ใช้รหัสซ้ำกับข้อมูลการจองอื่น",
          409,
        );
      await client.query("commit");
      return { bookingId: existing.rows[0].id, reused: true };
    }

    const range = validateBookingTime(intent.startsAt, intent.durationMinutes);
    const availability = await checkAvailability(
      intent.roomId,
      intent.startsAt,
      intent.durationMinutes,
      client,
    );
    if (!availability.available)
      throw new BookingDomainError(
        "BOOKING_CONFLICT",
        "ช่วงเวลานี้เพิ่งถูกจอง กรุณาเลือกเวลาใหม่",
        409,
      );
    const pricing = await loadPricing(client, intent, userId);
    const total = pricing.quote.totalAmount;
    const bookingId = randomUUID();
    const bookingNumber = `SMT${Date.now().toString(36).toUpperCase()}${bookingId.slice(0, 4).toUpperCase()}`;
    const status = total === 0 ? "CONFIRMED" : "PENDING_PAYMENT";
    const paymentDueAt =
      total === 0 ? null : new Date(Date.now() + 30 * 60_000).toISOString();
    await client.query(
      `
      insert into public.bookings (
        id, booking_number, user_id, room_id, starts_at, ends_at, duration_minutes, status,
        room_name_snapshot, room_rate_snapshot, room_subtotal, addon_subtotal, subtotal,
        discount_amount, total_amount, promo_code_snapshot, promo_type_snapshot, promo_value_snapshot,
        payment_due_at, confirmed_at, idempotency_key, idempotency_payload_hash
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
    `,
      [
        bookingId,
        bookingNumber,
        userId,
        intent.roomId,
        range.startsAt,
        range.endsAt,
        intent.durationMinutes,
        status,
        pricing.room.name,
        pricing.room.hourly_rate,
        satangToDatabaseMoney(pricing.quote.roomSubtotal),
        satangToDatabaseMoney(pricing.quote.addonSubtotal),
        satangToDatabaseMoney(pricing.quote.subtotal),
        satangToDatabaseMoney(pricing.quote.discountAmount),
        satangToDatabaseMoney(total),
        pricing.promo?.code ?? null,
        pricing.promo?.discount_type ?? null,
        pricing.promo?.discount_value ?? null,
        paymentDueAt,
        total === 0 ? new Date().toISOString() : null,
        intent.idempotencyKey,
        hash,
      ],
    );
    for (const addon of pricing.addons) {
      const line = calculateQuote({
        addons: [
          {
            pricingType: addon.pricing_type,
            quantity: addon.quantity,
            unitPrice: addon.unit_price,
          },
        ],
        durationMinutes: intent.durationMinutes,
        roomHourlyRate: "0.00",
      }).addonSubtotal;
      await client.query(
        `insert into public.booking_addons (booking_id, addon_id, name_snapshot, pricing_type_snapshot, unit_price_snapshot, quantity, line_total) values ($1,$2,$3,$4,$5,$6,$7)`,
        [
          bookingId,
          addon.id,
          addon.name,
          addon.pricing_type,
          addon.unit_price,
          addon.quantity,
          satangToDatabaseMoney(line),
        ],
      );
    }
    if (pricing.promo)
      await client.query(
        `insert into public.promo_redemptions (promo_code_id, booking_id, user_id, status, discount_amount, applied_at) values ($1,$2,$3,$4,$5,$6)`,
        [
          pricing.promo.id,
          bookingId,
          userId,
          total === 0 ? "APPLIED" : "RESERVED",
          satangToDatabaseMoney(pricing.quote.discountAmount),
          total === 0 ? new Date().toISOString() : null,
        ],
      );
    await client.query(
      `insert into public.booking_status_history (booking_id, to_status, actor_type, actor_user_id, reason) values ($1,$2,'USER',$3,'สร้างรายการจอง')`,
      [bookingId, status, userId],
    );
    await client.query(
      `insert into public.activity_logs (actor_type, actor_user_id, action, entity_type, entity_id, after_data) values ('USER',$1,'BOOKING_CREATED','BOOKING',$2,jsonb_build_object('status',$3::text))`,
      [userId, bookingId, status],
    );
    await client.query(
      `insert into public.notifications (user_id, type, title, body, data) values ($1,'BOOKING','สร้างรายการจองแล้ว',$2,jsonb_build_object('bookingId',$3::uuid))`,
      [
        userId,
        total === 0 ? "การจองได้รับการยืนยันแล้ว" : "กรุณาส่งสลิปภายใน 30 นาที",
        bookingId,
      ],
    );
    await client.query("commit");
    return { bookingId, bookingNumber, paymentDueAt, reused: false, status };
  } catch (error) {
    await client.query("rollback");
    if ((error as { code?: string }).code === "23P01")
      throw new BookingDomainError(
        "BOOKING_CONFLICT",
        "ช่วงเวลานี้เพิ่งถูกจอง กรุณาเลือกเวลาใหม่",
        409,
      );
    throw error;
  } finally {
    client.release();
  }
}

export async function listUserBookings(
  userId: string,
  queryable: Queryable = databasePool,
) {
  await expireOverdueBookings(queryable);
  const result = await queryable.query(
    `select id, booking_number as "bookingNumber", room_name_snapshot as "roomName", starts_at as "startsAt", ends_at as "endsAt", status, total_amount::float8 as "totalAmount", currency from public.bookings where user_id = $1 order by created_at desc limit 50`,
    [userId],
  );
  return result.rows;
}

export async function listUserBookingsPage(
  userId: string,
  page = 1,
  pageSize = 10,
  queryable: Queryable = databasePool,
) {
  await expireOverdueBookings(queryable);
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize) || 10));
  const [countResult, result] = await Promise.all([
    queryable.query<{ count: string }>(
      `select count(*)::text as count from public.bookings where user_id = $1`,
      [userId],
    ),
    queryable.query(
      `select id, booking_number as "bookingNumber", room_name_snapshot as "roomName", starts_at as "startsAt", ends_at as "endsAt", status, total_amount::float8 as "totalAmount", currency from public.bookings where user_id = $1 order by created_at desc limit $2 offset $3`,
      [userId, safePageSize, (safePage - 1) * safePageSize],
    ),
  ]);
  const total = Number(countResult.rows[0]?.count ?? 0);
  return {
    items: result.rows,
    page: safePage,
    pageSize: safePageSize,
    total,
    hasMore: safePage * safePageSize < total,
  };
}

export async function getUserBooking(
  bookingId: string,
  userId: string,
  queryable: Queryable = databasePool,
) {
  await expireOverdueBookings(queryable);
  const booking = await queryable.query(
    `select id, booking_number as "bookingNumber", room_id as "roomId", room_name_snapshot as "roomName", starts_at as "startsAt", ends_at as "endsAt", duration_minutes as "durationMinutes", status, room_subtotal::float8 as "roomSubtotal", addon_subtotal::float8 as "addonSubtotal", subtotal::float8, discount_amount::float8 as "discountAmount", total_amount::float8 as "totalAmount", currency, promo_code_snapshot as "promoCode", payment_due_at as "paymentDueAt" from public.bookings where id = $1 and user_id = $2`,
    [bookingId, userId],
  );
  if (!booking.rows[0])
    throw new BookingDomainError("BOOKING_NOT_FOUND", "ไม่พบรายการจอง", 404);
  const [addons, history, payments] = await Promise.all([
    queryable.query(
      `select addon_id as id, name_snapshot as name, quantity, line_total::float8 as "lineTotal" from public.booking_addons where booking_id = $1`,
      [bookingId],
    ),
    queryable.query(
      `select from_status as "fromStatus", to_status as "toStatus", reason, created_at as "createdAt" from public.booking_status_history where booking_id = $1 order by created_at`,
      [bookingId],
    ),
    queryable.query(
      `select id, attempt_number as "attemptNumber", status, amount::float8, submitted_at as "submittedAt", review_note as "reviewNote" from public.payments where booking_id = $1 order by attempt_number desc`,
      [bookingId],
    ),
  ]);
  return {
    ...booking.rows[0],
    addons: addons.rows,
    history: history.rows,
    payments: payments.rows,
  };
}

export async function cancelUserBooking(
  bookingId: string,
  userId: string,
  pool: Pool = databasePool,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await expireOverdueBookings(client);
    const result = await client.query<{ starts_at: Date; status: string }>(
      `select starts_at, status from public.bookings where id = $1 and user_id = $2 for update`,
      [bookingId, userId],
    );
    const booking = result.rows[0];
    if (!booking)
      throw new BookingDomainError("BOOKING_NOT_FOUND", "ไม่พบรายการจอง", 404);
    if (!["PENDING_PAYMENT", "CONFIRMED"].includes(booking.status))
      throw new BookingDomainError(
        "BOOKING_NOT_CANCELLABLE",
        "สถานะนี้ไม่สามารถยกเลิกได้",
        409,
      );
    if (!canCancelBooking(booking.starts_at.toISOString()))
      throw new BookingDomainError(
        "CANCELLATION_CUTOFF",
        "ต้องยกเลิกก่อนเวลาเริ่มอย่างน้อย 12 ชั่วโมง",
        409,
      );
    await client.query(
      `update public.bookings set status = 'CANCELLED', cancelled_at = now(), cancelled_by = $2, cancellation_reason = 'ยกเลิกโดยลูกค้า', updated_at = now() where id = $1`,
      [bookingId, userId],
    );
    await client.query(
      `update public.promo_redemptions set status = 'RELEASED', released_at = now() where booking_id = $1 and status = 'RESERVED'`,
      [bookingId],
    );
    await client.query(
      `update public.payments set status = 'REFUND_PENDING', refund_amount = amount, updated_at = now() where booking_id = $1 and status = 'PAID'`,
      [bookingId],
    );
    await client.query(
      `insert into public.booking_status_history (booking_id, from_status, to_status, actor_type, actor_user_id, reason) values ($1,$2,'CANCELLED','USER',$3,'ยกเลิกโดยลูกค้า')`,
      [bookingId, booking.status, userId],
    );
    await client.query(
      `insert into public.activity_logs (actor_type, actor_user_id, action, entity_type, entity_id) values ('USER',$1,'BOOKING_CANCELLED','BOOKING',$2)`,
      [userId, bookingId],
    );
    await client.query("commit");
    return { status: "CANCELLED" };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
