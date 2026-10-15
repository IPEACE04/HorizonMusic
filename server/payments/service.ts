import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";

import { databasePool } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { expireOverdueBookings } from "@/server/bookings/lifecycle";
import {
  assertPaymentReview,
  validateRefundReference,
  validateSlipFile,
} from "@/server/payments/policy";

export class PaymentDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export async function createPaymentUploadIntent(
  bookingId: string,
  userId: string,
  mimeType: string,
  size: number,
  pool: Pool = databasePool,
) {
  const file = validateSlipFile({ mimeType, size });
  await expireOverdueBookings(pool);
  const booking = await pool.query<{
    payment_due_at: Date | null;
    status: string;
  }>(
    `select status, payment_due_at from public.bookings where id = $1 and user_id = $2`,
    [bookingId, userId],
  );
  const row = booking.rows[0];
  if (!row)
    throw new PaymentDomainError("BOOKING_NOT_FOUND", "ไม่พบรายการจอง", 404);
  if (row.status !== "PENDING_PAYMENT")
    throw new PaymentDomainError(
      "PAYMENT_NOT_ALLOWED",
      "สถานะนี้ไม่สามารถส่งสลิปได้",
      409,
    );
  if (row.payment_due_at && row.payment_due_at <= new Date())
    throw new PaymentDomainError(
      "PAYMENT_DEADLINE_PASSED",
      "หมดเวลาส่งหลักฐานการชำระเงินแล้ว",
      409,
    );
  const pending = await pool.query(
    `select 1 from public.payments where booking_id = $1 and status in ('PENDING','PAID','REFUND_PENDING','REFUNDED') limit 1`,
    [bookingId],
  );
  if (pending.rowCount)
    throw new PaymentDomainError(
      "PAYMENT_ALREADY_SUBMITTED",
      "รายการนี้มีหลักฐานที่กำลังตรวจสอบหรือชำระแล้ว",
      409,
    );
  const intentId = randomUUID();
  const path = `${userId}/${bookingId}/${intentId}.${file.extension}`;
  const signed = await supabaseAdmin.storage
    .from("payment-slips")
    .createSignedUploadUrl(path, { upsert: false });
  if (signed.error || !signed.data)
    throw new PaymentDomainError(
      "STORAGE_UNAVAILABLE",
      "ไม่สามารถเตรียมพื้นที่อัปโหลดได้",
      503,
    );
  const expiresAt = new Date(Date.now() + 15 * 60_000);
  await pool.query(
    `insert into public.payment_upload_intents (id, booking_id, user_id, storage_path, expected_mime_type, max_bytes, expires_at) values ($1,$2,$3,$4,$5,$6,$7)`,
    [
      intentId,
      bookingId,
      userId,
      path,
      file.mimeType,
      file.maxBytes,
      expiresAt,
    ],
  );
  return {
    expiresAt: expiresAt.toISOString(),
    intentId,
    path,
    token: signed.data.token,
  };
}

export async function confirmPaymentUpload(
  intentId: string,
  userId: string,
  pool: Pool = databasePool,
) {
  await expireOverdueBookings(pool);
  const intentResult = await pool.query<{
    booking_id: string;
    expected_mime_type: string;
    expires_at: Date;
    max_bytes: number;
    status: string;
    storage_path: string;
  }>(
    `select booking_id, storage_path, expected_mime_type, max_bytes, status, expires_at from public.payment_upload_intents where id = $1 and user_id = $2`,
    [intentId, userId],
  );
  const intent = intentResult.rows[0];
  if (!intent)
    throw new PaymentDomainError(
      "UPLOAD_INTENT_NOT_FOUND",
      "ไม่พบคำขออัปโหลด",
      404,
    );
  if (intent.status !== "CREATED" || intent.expires_at <= new Date())
    throw new PaymentDomainError(
      "UPLOAD_INTENT_EXPIRED",
      "คำขออัปโหลดหมดอายุแล้ว",
      409,
    );
  const download = await supabaseAdmin.storage
    .from("payment-slips")
    .download(intent.storage_path);
  if (download.error || !download.data)
    throw new PaymentDomainError(
      "SLIP_NOT_FOUND",
      "ยังไม่พบไฟล์สลิปที่อัปโหลด",
      409,
    );
  const bytes = Buffer.from(await download.data.arrayBuffer());
  const actualMimeType = download.data.type || intent.expected_mime_type;
  if (actualMimeType !== intent.expected_mime_type)
    throw new PaymentDomainError(
      "SLIP_TYPE_MISMATCH",
      "ประเภทไฟล์ไม่ตรงกับคำขออัปโหลด",
      409,
    );
  validateSlipFile({ mimeType: actualMimeType, size: bytes.byteLength });
  if (bytes.byteLength > intent.max_bytes)
    throw new PaymentDomainError(
      "SLIP_TOO_LARGE",
      "ไฟล์สลิปมีขนาดเกินกำหนด",
      413,
    );
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("begin");
    const locked = await client.query<{ amount: string; booking_id: string }>(
      `select b.id as booking_id, b.total_amount as amount from public.payment_upload_intents i join public.bookings b on b.id = i.booking_id where i.id = $1 and i.user_id = $2 and i.status = 'CREATED' and i.expires_at > now() and b.status = 'PENDING_PAYMENT' and (b.payment_due_at is null or b.payment_due_at > now()) for update of i, b`,
      [intentId, userId],
    );
    const booking = locked.rows[0];
    if (!booking)
      throw new PaymentDomainError(
        "PAYMENT_STATE_CHANGED",
        "สถานะการจองเปลี่ยนแล้ว กรุณาโหลดหน้าใหม่",
        409,
      );
    const attempt = await client.query<{ next: number }>(
      `select (count(*) + 1)::int as next from public.payments where booking_id = $1`,
      [booking.booking_id],
    );
    const paymentId = randomUUID();
    await client.query(
      `insert into public.payments (id, booking_id, upload_intent_id, attempt_number, amount, slip_storage_path, slip_sha256) values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        paymentId,
        booking.booking_id,
        intentId,
        attempt.rows[0]?.next ?? 1,
        booking.amount,
        intent.storage_path,
        sha256,
      ],
    );
    await client.query(
      `update public.payment_upload_intents set status = 'CONFIRMED', confirmed_at = now() where id = $1`,
      [intentId],
    );
    await client.query(
      `insert into public.notifications (user_id,type,title,body,data) values ($1,'PAYMENT','รับหลักฐานการชำระเงินแล้ว','ทีมงานกำลังตรวจสอบสลิปของคุณ',jsonb_build_object('bookingId',$2::uuid))`,
      [userId, booking.booking_id],
    );
    await client.query(
      `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id) values ('USER',$1,'PAYMENT_SUBMITTED','PAYMENT',$2)`,
      [userId, paymentId],
    );
    await client.query("commit");
    return { paymentId, status: "PENDING" };
  } catch (error) {
    await client.query("rollback");
    if ((error as { code?: string }).code === "23505")
      throw new PaymentDomainError(
        "DUPLICATE_SLIP",
        "สลิปนี้เคยถูกส่งเข้าระบบแล้ว",
        409,
      );
    throw error;
  } finally {
    client.release();
  }
}

export async function listPendingPayments(pool: Pool = databasePool) {
  const result = await pool.query(
    `select p.id, p.booking_id as "bookingId", p.attempt_number as "attemptNumber", p.amount::float8, p.status, p.submitted_at as "submittedAt", b.booking_number as "bookingNumber", b.room_name_snapshot as "roomName", u.name as "customerName" from public.payments p join public.bookings b on b.id=p.booking_id join public."user" u on u.id=b.user_id where p.status in ('PENDING','REFUND_PENDING') order by p.submitted_at asc limit 100`,
  );
  return result.rows;
}

export async function listPendingPaymentsPage(
  page = 1,
  pageSize = 10,
  pool: Pool = databasePool,
) {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize) || 10));
  const filter = `from public.payments p join public.bookings b on b.id=p.booking_id join public."user" u on u.id=b.user_id where p.status in ('PENDING','REFUND_PENDING')`;
  const [countResult, result] = await Promise.all([
    pool.query<{ count: string }>(`select count(*)::text as count ${filter}`),
    pool.query(
      `select p.id, p.booking_id as "bookingId", p.attempt_number as "attemptNumber", p.amount::float8, p.status, p.submitted_at as "submittedAt", b.booking_number as "bookingNumber", b.room_name_snapshot as "roomName", u.name as "customerName" ${filter} order by p.submitted_at asc limit $1 offset $2`,
      [safePageSize, (safePage - 1) * safePageSize],
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

export async function createSlipViewUrl(
  paymentId: string,
  pool: Pool = databasePool,
) {
  const result = await pool.query<{ slip_storage_path: string }>(
    `select slip_storage_path from public.payments where id=$1`,
    [paymentId],
  );
  if (!result.rows[0])
    throw new PaymentDomainError(
      "PAYMENT_NOT_FOUND",
      "ไม่พบรายการชำระเงิน",
      404,
    );
  const signed = await supabaseAdmin.storage
    .from("payment-slips")
    .createSignedUrl(result.rows[0].slip_storage_path, 300);
  if (signed.error || !signed.data)
    throw new PaymentDomainError(
      "SLIP_UNAVAILABLE",
      "ไม่สามารถเปิดสลิปได้",
      503,
    );
  return { url: signed.data.signedUrl, expiresIn: 300 };
}

export async function reviewPayment(
  paymentId: string,
  adminId: string,
  action: "APPROVE" | "REJECT",
  note: string | undefined,
  pool: Pool = databasePool,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query<{
      amount: string;
      booking_id: string;
      booking_status: string;
      status: string;
      user_id: string;
    }>(
      `select p.status,p.amount,p.booking_id,b.status as booking_status,b.user_id from public.payments p join public.bookings b on b.id=p.booking_id where p.id=$1 for update of p,b`,
      [paymentId],
    );
    const row = result.rows[0];
    if (!row)
      throw new PaymentDomainError(
        "PAYMENT_NOT_FOUND",
        "ไม่พบรายการชำระเงิน",
        404,
      );
    let outcome: "FAILED" | "PAID" | "REFUND_PENDING";
    try {
      outcome = assertPaymentReview(
        action,
        row.status,
        row.booking_status,
        note,
      );
    } catch (error) {
      throw new PaymentDomainError(
        "PAYMENT_REVIEW_NOT_ALLOWED",
        error instanceof Error ? error.message : "ไม่สามารถตรวจสอบรายการนี้ได้",
        409,
      );
    }
    if (outcome === "FAILED") {
      await client.query(
        `update public.payments set status='FAILED',reviewed_by=$2,reviewed_at=now(),review_note=$3,updated_at=now() where id=$1`,
        [paymentId, adminId, note?.trim()],
      );
    } else {
      await client.query(
        `update public.payments set status=$2::public.payment_status,reviewed_by=$3,reviewed_at=now(),review_note=$4,transfer_occurred_at=now(),refund_amount=case when $2::public.payment_status='REFUND_PENDING' then amount else null end,updated_at=now() where id=$1`,
        [paymentId, outcome, adminId, note?.trim() || null],
      );
      if (outcome === "PAID") {
        await client.query(
          `update public.bookings set status='CONFIRMED',confirmed_at=now(),updated_at=now() where id=$1`,
          [row.booking_id],
        );
        await client.query(
          `update public.promo_redemptions set status='APPLIED',applied_at=now() where booking_id=$1 and status='RESERVED'`,
          [row.booking_id],
        );
        await client.query(
          `insert into public.booking_status_history (booking_id,from_status,to_status,actor_type,actor_user_id,reason) values ($1,'PENDING_PAYMENT','CONFIRMED','ADMIN',$2,'ตรวจสอบการชำระเงินแล้ว')`,
          [row.booking_id, adminId],
        );
      }
    }
    await client.query(
      `insert into public.notifications (user_id,type,title,body,data) values ($1,'PAYMENT',$2,$3,jsonb_build_object('bookingId',$4::uuid))`,
      [
        row.user_id,
        outcome === "FAILED"
          ? "หลักฐานไม่ผ่านการตรวจสอบ"
          : outcome === "PAID"
            ? "ชำระเงินสำเร็จ"
            : "กำลังดำเนินการคืนเงิน",
        outcome === "FAILED"
          ? note?.trim() || "กรุณาส่งหลักฐานใหม่"
          : outcome === "PAID"
            ? "การจองได้รับการยืนยันแล้ว"
            : "ทีมงานจะติดต่อเมื่อคืนเงินสำเร็จ",
        row.booking_id,
      ],
    );
    await client.query(
      `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id,metadata) values ('ADMIN',$1,$2,'PAYMENT',$3,jsonb_build_object('note',$4::text))`,
      [adminId, `PAYMENT_${outcome}`, paymentId, note?.trim() || null],
    );
    await client.query("commit");
    return { status: outcome };
  } catch (error) {
    await client.query("rollback");
    if (error instanceof PaymentDomainError) throw error;
    throw new PaymentDomainError(
      "PAYMENT_REVIEW_FAILED",
      error instanceof Error ? error.message : "ไม่สามารถตรวจสลิปได้",
      500,
    );
  } finally {
    client.release();
  }
}

export async function completeRefund(
  paymentId: string,
  adminId: string,
  rawReference: string,
  pool: Pool = databasePool,
) {
  const reference = validateRefundReference(rawReference);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query<{
      booking_id: string;
      status: string;
      user_id: string;
    }>(
      `select p.status,p.booking_id,b.user_id from public.payments p join public.bookings b on b.id=p.booking_id where p.id=$1 for update of p`,
      [paymentId],
    );
    const row = result.rows[0];
    if (!row)
      throw new PaymentDomainError(
        "PAYMENT_NOT_FOUND",
        "ไม่พบรายการชำระเงิน",
        404,
      );
    if (row.status !== "REFUND_PENDING")
      throw new PaymentDomainError(
        "REFUND_STATE_CHANGED",
        "รายการนี้ไม่ได้อยู่ระหว่างรอคืนเงิน",
        409,
      );
    await client.query(
      `update public.payments set status='REFUNDED',refund_reference=$2,refunded_at=now(),updated_at=now() where id=$1`,
      [paymentId, reference],
    );
    await client.query(
      `insert into public.notifications (user_id,type,title,body,data) values ($1,'PAYMENT','คืนเงินสำเร็จ','ทีมงานดำเนินการคืนเงินเรียบร้อยแล้ว',jsonb_build_object('bookingId',$2::uuid))`,
      [row.user_id, row.booking_id],
    );
    await client.query(
      `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id,metadata) values ('ADMIN',$1,'PAYMENT_REFUNDED','PAYMENT',$2,jsonb_build_object('refundReference',$3::text))`,
      [adminId, paymentId, reference],
    );
    await client.query("commit");
    return { status: "REFUNDED" };
  } catch (error) {
    await client.query("rollback");
    if (error instanceof PaymentDomainError) throw error;
    throw new PaymentDomainError(
      "REFUND_FAILED",
      error instanceof Error ? error.message : "ไม่สามารถยืนยันการคืนเงินได้",
      500,
    );
  } finally {
    client.release();
  }
}
