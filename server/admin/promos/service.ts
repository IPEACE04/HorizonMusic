import "server-only";

import type { Pool, PoolClient } from "pg";
import { databasePool } from "@/lib/db";
import {
  parsePromoInput,
  PromoValidationError,
  type PromoInput,
} from "@/features/admin/promo-contracts";

export class PromoDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
    readonly fieldErrors: Readonly<Record<string, string>> = {},
  ) {
    super(message);
  }
}

function mapError(error: unknown): never {
  if (error instanceof PromoDomainError) throw error;
  if (error instanceof PromoValidationError)
    throw new PromoDomainError(
      "INVALID_PROMO",
      error.message,
      400,
      error.fieldErrors,
    );
  if ((error as { code?: string }).code === "23505")
    throw new PromoDomainError(
      "PROMO_CODE_EXISTS",
      "โค้ดส่วนลดนี้มีอยู่แล้ว",
      409,
      { code: "โค้ดส่วนลดนี้มีอยู่แล้ว" },
    );
  throw new PromoDomainError(
    "PROMO_WRITE_FAILED",
    "ไม่สามารถบันทึกโค้ดส่วนลดได้ กรุณาลองใหม่",
    500,
  );
}
async function transaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    mapError(error);
  } finally {
    client.release();
  }
}

export async function listAdminPromos(pool: Pool = databasePool) {
  const result = await pool.query(
    `select p.id,p.code::text,p.description,p.discount_type as "discountType",p.discount_value::float8 as "discountValue",p.max_discount_amount::float8 as "maxDiscountAmount",p.min_booking_amount::float8 as "minBookingAmount",p.starts_at as "startsAt",p.ends_at as "endsAt",p.total_usage_limit as "totalUsageLimit",p.per_user_limit as "perUserLimit",p.applies_to_all_rooms as "appliesToAllRooms",p.is_active as "isActive",p.updated_at as "updatedAt",coalesce((select jsonb_agg(pr.room_id order by pr.room_id) from public.promo_code_rooms pr where pr.promo_code_id=p.id),'[]'::jsonb) as "roomIds",(select count(*)::int from public.promo_redemptions r where r.promo_code_id=p.id and r.status in ('RESERVED','APPLIED')) as "usageCount" from public.promo_codes p where p.deleted_at is null order by p.updated_at desc,p.id limit 100`,
  );
  return result.rows;
}

async function assertRooms(client: PoolClient, input: PromoInput) {
  if (input.appliesToAllRooms) return;
  const result = await client.query<{ count: number }>(
    `select count(*)::int as count from public.rooms where id=any($1::uuid[]) and deleted_at is null`,
    [input.roomIds],
  );
  if (result.rows[0]?.count !== input.roomIds.length)
    throw new PromoDomainError(
      "PROMO_ROOM_INVALID",
      "มีห้องที่เลือกไม่พร้อมใช้งาน",
      409,
      { roomIds: "กรุณาเลือกห้องใหม่" },
    );
}
async function replaceRooms(
  client: PoolClient,
  promoId: string,
  input: PromoInput,
) {
  await client.query(
    `delete from public.promo_code_rooms where promo_code_id=$1`,
    [promoId],
  );
  if (!input.appliesToAllRooms)
    for (const roomId of input.roomIds)
      await client.query(
        `insert into public.promo_code_rooms (promo_code_id,room_id) values ($1,$2)`,
        [promoId, roomId],
      );
}
const values = (input: PromoInput) => [
  input.code,
  input.description,
  input.discountType,
  input.discountValue,
  input.maxDiscountAmount,
  input.minBookingAmount,
  input.startsAt,
  input.endsAt,
  input.totalUsageLimit,
  input.perUserLimit,
  input.appliesToAllRooms,
  input.isActive,
];

export async function createPromo(
  actorId: string,
  raw: unknown,
  pool: Pool = databasePool,
) {
  let input: PromoInput;
  try {
    input = parsePromoInput(raw);
  } catch (error) {
    mapError(error);
  }
  return transaction(pool, async (client) => {
    await assertRooms(client, input);
    const result = await client.query<{ id: string }>(
      `insert into public.promo_codes (code,description,discount_type,discount_value,max_discount_amount,min_booking_amount,starts_at,ends_at,total_usage_limit,per_user_limit,applies_to_all_rooms,is_active,created_by,updated_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13) returning id`,
      [...values(input), actorId],
    );
    const id = result.rows[0]!.id;
    await replaceRooms(client, id, input);
    await client.query(
      `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id,after_data) values ('ADMIN',$1,'PROMO_CREATED','PROMO_CODE',$2,jsonb_build_object('code',$3::text,'isActive',$4::boolean,'scope',$5::text))`,
      [
        actorId,
        id,
        input.code,
        input.isActive,
        input.appliesToAllRooms ? "ALL_ROOMS" : "SELECTED_ROOMS",
      ],
    );
    return { id };
  });
}

export async function updatePromo(
  id: string,
  actorId: string,
  raw: unknown,
  pool: Pool = databasePool,
) {
  let input: PromoInput;
  try {
    input = parsePromoInput(raw);
  } catch (error) {
    mapError(error);
  }
  return transaction(pool, async (client) => {
    await assertRooms(client, input);
    const before = await client.query<{ code: string; isActive: boolean }>(
      `select code::text,is_active as "isActive" from public.promo_codes where id=$1 and deleted_at is null for update`,
      [id],
    );
    if (!before.rows[0])
      throw new PromoDomainError("PROMO_NOT_FOUND", "ไม่พบโค้ดส่วนลด", 404);
    await client.query(
      `update public.promo_codes set code=$2,description=$3,discount_type=$4,discount_value=$5,max_discount_amount=$6,min_booking_amount=$7,starts_at=$8,ends_at=$9,total_usage_limit=$10,per_user_limit=$11,applies_to_all_rooms=$12,is_active=$13,updated_by=$14 where id=$1`,
      [id, ...values(input), actorId],
    );
    await replaceRooms(client, id, input);
    await client.query(
      `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id,before_data,after_data) values ('ADMIN',$1,'PROMO_UPDATED','PROMO_CODE',$2,$3,jsonb_build_object('code',$4::text,'isActive',$5::boolean,'scope',$6::text))`,
      [
        actorId,
        id,
        JSON.stringify(before.rows[0]),
        input.code,
        input.isActive,
        input.appliesToAllRooms ? "ALL_ROOMS" : "SELECTED_ROOMS",
      ],
    );
    return { id };
  });
}

export async function archivePromo(
  id: string,
  actorId: string,
  pool: Pool = databasePool,
) {
  return transaction(pool, async (client) => {
    const result = await client.query<{ code: string }>(
      `update public.promo_codes set deleted_at=now(),is_active=false,updated_by=$2 where id=$1 and deleted_at is null returning code::text`,
      [id, actorId],
    );
    if (!result.rows[0])
      throw new PromoDomainError("PROMO_NOT_FOUND", "ไม่พบโค้ดส่วนลด", 404);
    await client.query(
      `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id,before_data) values ('ADMIN',$1,'PROMO_ARCHIVED','PROMO_CODE',$2,jsonb_build_object('code',$3::text))`,
      [actorId, id, result.rows[0].code],
    );
    return { archived: true };
  });
}
