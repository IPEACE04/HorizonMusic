import "server-only";
import { roomDisplayOrder } from "@/server/rooms/display-order";

import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

import { databasePool } from "@/lib/db";
import type { EquipmentCategory } from "@/lib/equipment-categories";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { RoomInput } from "@/features/admin/catalog-contracts";
import {
  parseAddonInput,
  parseEquipmentInput,
  parseRoomEquipmentInput,
  parseRoomImageInput,
  parseRoomInput,
} from "@/features/admin/catalog-contracts";

export class CatalogDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
    readonly fieldErrors: Readonly<Record<string, string>> = {},
  ) {
    super(message);
  }
}

type Executor = Pick<Pool, "query"> | Pick<PoolClient, "query">;
function mapDatabaseError(error: unknown): never {
  const code = (error as { code?: string }).code;
  if (code === "23505") {
    const constraint = String(
      (error as { constraint?: string }).constraint ?? "",
    );
    const fieldErrors: Record<string, string> = {};
    if (constraint.includes("slug")) {
      fieldErrors.slug = "Slug นี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น";
    }
    throw new CatalogDomainError(
      "CATALOG_DUPLICATE",
      "ชื่อหรือ Slug นี้มีอยู่ในระบบแล้ว",
      409,
      fieldErrors,
    );
  }
  if (error instanceof CatalogDomainError) throw error;
  throw new CatalogDomainError(
    "CATALOG_WRITE_FAILED",
    "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่",
    500,
  );
}

export async function listAdminRooms(pool: Pool = databasePool) {
  const result = await pool.query(`
    select r.id,r.slug::text,r.name,r.type,r.description,r.capacity,r.hourly_rate::float8 as "hourlyRate",r.status,r.is_published as "isPublished",r.updated_at as "updatedAt",
      (select ri.storage_path from public.room_images ri where ri.room_id=r.id order by ri.sort_order,ri.id limit 1) as "imagePath",
      coalesce((select jsonb_agg(jsonb_build_object('equipmentId',e.id,'name',e.name,'category',e.category,'description',e.description,'quantity',re.quantity,'note',re.note) order by e.category,e.name) from public.room_equipment re join public.equipment e on e.id=re.equipment_id where re.room_id=r.id and e.deleted_at is null),'[]'::jsonb) as equipment
    from public.rooms r where r.deleted_at is null order by ${roomDisplayOrder} limit 100
  `);
  return result.rows;
}

export async function listAdminEquipment(pool: Pool = databasePool) {
  const result = await pool.query(
    `select id,name,category,description,updated_at as "updatedAt" from public.equipment where deleted_at is null order by category,name,id limit 200`,
  );
  return result.rows;
}

export async function listAdminAddons(pool: Pool = databasePool) {
  const result = await pool.query(
    `select id,name,description,pricing_type as "pricingType",unit_price::float8 as "unitPrice",is_active as "isActive",updated_at as "updatedAt" from public.addons where deleted_at is null order by name,id limit 200`,
  );
  return result.rows;
}

async function withTransaction<T>(
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
    mapDatabaseError(error);
  } finally {
    client.release();
  }
}

function roomValues(input: RoomInput) {
  return [
    input.slug,
    input.name,
    input.type,
    input.description,
    input.capacity,
    input.hourlyRate,
    input.status,
    input.isPublished,
  ];
}

export async function createRoom(
  actorId: string,
  raw: unknown,
  pool: Pool = databasePool,
) {
  const input = parseRoomInput(raw);
  return withTransaction(pool, async (client) => {
    const result = await client.query<{ id: string }>(
      `insert into public.rooms (slug,name,type,description,capacity,hourly_rate,status,is_published,created_by,updated_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) returning id`,
      [...roomValues(input), actorId],
    );
    const id = result.rows[0]!.id;
    await client.query(
      `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id,after_data) values ('ADMIN',$1,'ROOM_CREATED','ROOM',$2,jsonb_build_object('name',$3::text,'status',$4::text,'isPublished',$5::boolean))`,
      [actorId, id, input.name, input.status, input.isPublished],
    );
    return { id };
  });
}

export async function updateRoom(
  id: string,
  actorId: string,
  raw: unknown,
  pool: Pool = databasePool,
) {
  const input = parseRoomInput(raw);
  return withTransaction(pool, async (client) => {
    const before = await client.query<{
      name: string;
      status: string;
      isPublished: boolean;
    }>(
      `select name,status,is_published as "isPublished" from public.rooms where id=$1 and deleted_at is null for update`,
      [id],
    );
    if (!before.rows[0])
      throw new CatalogDomainError(
        "ROOM_NOT_FOUND",
        "ไม่พบห้องที่ต้องการ",
        404,
      );
    await client.query(
      `update public.rooms set slug=$2,name=$3,type=$4,description=$5,capacity=$6,hourly_rate=$7,status=$8,is_published=$9,updated_by=$10 where id=$1`,
      [id, ...roomValues(input), actorId],
    );
    await client.query(
      `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id,before_data,after_data) values ('ADMIN',$1,'ROOM_UPDATED','ROOM',$2,$3,jsonb_build_object('name',$4::text,'status',$5::text,'isPublished',$6::boolean))`,
      [
        actorId,
        id,
        JSON.stringify(before.rows[0]),
        input.name,
        input.status,
        input.isPublished,
      ],
    );
    return { id };
  });
}

export async function archiveRoom(
  id: string,
  actorId: string,
  pool: Pool = databasePool,
) {
  return withTransaction(pool, async (client) => {
    const result = await client.query<{ name: string }>(
      `update public.rooms set deleted_at=now(),is_published=false,updated_by=$2 where id=$1 and deleted_at is null returning name`,
      [id, actorId],
    );
    if (!result.rows[0])
      throw new CatalogDomainError(
        "ROOM_NOT_FOUND",
        "ไม่พบห้องที่ต้องการ",
        404,
      );
    await client.query(
      `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id,before_data) values ('ADMIN',$1,'ROOM_ARCHIVED','ROOM',$2,jsonb_build_object('name',$3::text))`,
      [actorId, id, result.rows[0].name],
    );
    return { archived: true };
  });
}

export async function replaceRoomEquipment(
  roomId: string,
  actorId: string,
  raw: unknown,
  pool: Pool = databasePool,
) {
  const items = parseRoomEquipmentInput(raw);
  return withTransaction(pool, async (client) => {
    const room = await client.query(
      `select 1 from public.rooms where id=$1 and deleted_at is null for update`,
      [roomId],
    );
    if (!room.rowCount)
      throw new CatalogDomainError(
        "ROOM_NOT_FOUND",
        "ไม่พบห้องที่ต้องการ",
        404,
      );
    await client.query(`delete from public.room_equipment where room_id=$1`, [
      roomId,
    ]);
    for (const item of items)
      await client.query(
        `insert into public.room_equipment (room_id,equipment_id,quantity,note,updated_by) select $1,id,$3,$4,$5 from public.equipment where id=$2 and deleted_at is null`,
        [roomId, item.equipmentId, item.quantity, item.note, actorId],
      );
    await client.query(
      `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id,metadata) values ('ADMIN',$1,'ROOM_EQUIPMENT_REPLACED','ROOM',$2,jsonb_build_object('itemCount',$3::int))`,
      [actorId, roomId, items.length],
    );
    return { count: items.length };
  });
}

export async function createEquipment(
  actorId: string,
  raw: unknown,
  pool: Pool = databasePool,
) {
  const input = parseEquipmentInput(raw);
  return createSimple("equipment", input, actorId, pool);
}
export async function createAddon(
  actorId: string,
  raw: unknown,
  pool: Pool = databasePool,
) {
  const input = parseAddonInput(raw);
  return withTransaction(pool, async (client) => {
    const result = await client.query<{ id: string }>(
      `insert into public.addons (name,description,pricing_type,unit_price,is_active,created_by,updated_by) values ($1,$2,$3,$4,$5,$6,$6) returning id`,
      [
        input.name,
        input.description,
        input.pricingType,
        input.unitPrice,
        input.isActive,
        actorId,
      ],
    );
    const id = result.rows[0]!.id;
    await logSimple(client, actorId, "ADDON_CREATED", "ADDON", id, input.name);
    return { id };
  });
}
async function createSimple(
  table: "equipment",
  input: { category: EquipmentCategory; name: string; description: string },
  actorId: string,
  pool: Pool,
) {
  return withTransaction(pool, async (client) => {
    const result = await client.query<{ id: string }>(
      `insert into public.equipment (name,category,description,created_by,updated_by) values ($1,$2,$3,$4,$4) returning id`,
      [input.name, input.category, input.description, actorId],
    );
    const id = result.rows[0]!.id;
    await logSimple(
      client,
      actorId,
      "EQUIPMENT_CREATED",
      "EQUIPMENT",
      id,
      input.name,
    );
    return { id };
  });
}
async function logSimple(
  client: Executor,
  actorId: string,
  action: string,
  entityType: string,
  id: string,
  name: string,
) {
  await client.query(
    `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id,after_data) values ('ADMIN',$1,$2,$3,$4,jsonb_build_object('name',$5::text))`,
    [actorId, action, entityType, id, name],
  );
}

export async function updateEquipment(
  id: string,
  actorId: string,
  raw: unknown,
  pool: Pool = databasePool,
) {
  const input = parseEquipmentInput(raw);
  return updateSimple("equipment", id, actorId, input, pool);
}
export async function updateAddon(
  id: string,
  actorId: string,
  raw: unknown,
  pool: Pool = databasePool,
) {
  const input = parseAddonInput(raw);
  return withTransaction(pool, async (client) => {
    const result = await client.query(
      `update public.addons set name=$2,description=$3,pricing_type=$4,unit_price=$5,is_active=$6,updated_by=$7 where id=$1 and deleted_at is null`,
      [
        id,
        input.name,
        input.description,
        input.pricingType,
        input.unitPrice,
        input.isActive,
        actorId,
      ],
    );
    if (!result.rowCount)
      throw new CatalogDomainError("ADDON_NOT_FOUND", "ไม่พบบริการเสริม", 404);
    await logSimple(client, actorId, "ADDON_UPDATED", "ADDON", id, input.name);
    return { id };
  });
}
async function updateSimple(
  table: "equipment",
  id: string,
  actorId: string,
  input: { category: EquipmentCategory; name: string; description: string },
  pool: Pool,
) {
  return withTransaction(pool, async (client) => {
    const result = await client.query(
      `update public.equipment set name=$2,category=$3,description=$4,updated_by=$5 where id=$1 and deleted_at is null`,
      [id, input.name, input.category, input.description, actorId],
    );
    if (!result.rowCount)
      throw new CatalogDomainError("EQUIPMENT_NOT_FOUND", "ไม่พบอุปกรณ์", 404);
    await logSimple(
      client,
      actorId,
      "EQUIPMENT_UPDATED",
      "EQUIPMENT",
      id,
      input.name,
    );
    return { id };
  });
}

export async function archiveCatalogItem(
  kind: "equipment" | "addons",
  id: string,
  actorId: string,
  pool: Pool = databasePool,
) {
  const entity = kind === "equipment" ? "EQUIPMENT" : "ADDON";
  return withTransaction(pool, async (client) => {
    const result = await client.query(
      `update public.${kind} set deleted_at=now(),updated_by=$2${kind === "addons" ? ",is_active=false" : ""} where id=$1 and deleted_at is null returning name`,
      [id, actorId],
    );
    if (!result.rows[0])
      throw new CatalogDomainError(
        `${entity}_NOT_FOUND`,
        `ไม่พบ${kind === "equipment" ? "อุปกรณ์" : "บริการเสริม"}`,
        404,
      );
    await client.query(
      `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id,before_data) values ('ADMIN',$1,$2,$3,$4,jsonb_build_object('name',$5::text))`,
      [actorId, `${entity}_ARCHIVED`, entity, id, result.rows[0].name],
    );
    return { archived: true };
  });
}

export async function prepareRoomImageUpload(
  roomId: string,
  raw: unknown,
  pool: Pool = databasePool,
) {
  const file = parseRoomImageInput(raw);
  const room = await pool.query(
    `select 1 from public.rooms where id=$1 and deleted_at is null`,
    [roomId],
  );
  if (!room.rowCount)
    throw new CatalogDomainError("ROOM_NOT_FOUND", "ไม่พบห้องที่ต้องการ", 404);
  const path = `rooms/${roomId}/${randomUUID()}.${file.extension}`;
  const signed = await supabaseAdmin.storage
    .from("room-images")
    .createSignedUploadUrl(path, { upsert: false });
  if (signed.error || !signed.data)
    throw new CatalogDomainError(
      "STORAGE_UNAVAILABLE",
      "ไม่สามารถเตรียมพื้นที่อัปโหลดได้",
      503,
    );
  return { altText: file.altText, path, token: signed.data.token };
}

export async function confirmRoomImageUpload(
  roomId: string,
  actorId: string,
  raw: unknown,
  pool: Pool = databasePool,
) {
  const input = (raw && typeof raw === "object" ? raw : {}) as {
    altText?: unknown;
    path?: unknown;
  };
  const altText = typeof input.altText === "string" ? input.altText.trim() : "";
  const path = typeof input.path === "string" ? input.path : "";
  if (
    !altText ||
    altText.length > 255 ||
    !new RegExp(`^rooms/${roomId}/[0-9a-f-]+\\.(jpg|png|webp)$`, `i`).test(path)
  )
    throw new CatalogDomainError(
      "INVALID_ROOM_IMAGE",
      "ข้อมูลภาพไม่ถูกต้อง",
      400,
    );
  const downloaded = await supabaseAdmin.storage
    .from("room-images")
    .download(path);
  if (downloaded.error || !downloaded.data)
    throw new CatalogDomainError(
      "ROOM_IMAGE_NOT_FOUND",
      "ยังไม่พบภาพที่อัปโหลด",
      409,
    );
  parseRoomImageInput({
    altText,
    mimeType: downloaded.data.type,
    size: downloaded.data.size,
  });
  return withTransaction(pool, async (client) => {
    const room = await client.query(
      `select 1 from public.rooms where id=$1 and deleted_at is null for update`,
      [roomId],
    );
    if (!room.rowCount)
      throw new CatalogDomainError(
        "ROOM_NOT_FOUND",
        "ไม่พบห้องที่ต้องการ",
        404,
      );
    await client.query(
      `update public.room_images set sort_order = sort_order + 1 where room_id = $1`,
      [roomId],
    );
    const result = await client.query<{ id: string }>(
      `insert into public.room_images (room_id,storage_path,alt_text,sort_order) values ($1,$2,$3,0) returning id`,
      [roomId, path, altText],
    );
    const id = result.rows[0]!.id;
    await client.query(
      `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id,metadata) values ('ADMIN',$1,'ROOM_IMAGE_ADDED','ROOM_IMAGE',$2,jsonb_build_object('roomId',$3::uuid))`,
      [actorId, id, roomId],
    );
    return { id, path };
  });
}
