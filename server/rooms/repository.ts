import "server-only";

import type { Pool } from "pg";

import { databasePool } from "@/lib/db";
import { roomDisplayOrder } from "@/server/rooms/display-order";
import type { EquipmentCategory } from "@/lib/equipment-categories";
import type { RoomListQuery, RoomType } from "@/server/rooms/contracts";

type RoomRow = {
  capacity: number;
  currency: string;
  description: string;
  hourly_rate: string;
  id: string;
  image_path: string | null;
  name: string;
  slug: string;
  status?: "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE";
  type: RoomType;
};

type RoomImageRow = { alt_text: string; storage_path: string };
type RoomEquipmentRow = {
  category: EquipmentCategory;
  description: string;
  id: string;
  name: string;
  note: string | null;
  quantity: number;
};

export function createRoomRepository(pool: Pool = databasePool) {
  return {
    async findPublishedRooms(
      query: Partial<Pick<RoomListQuery, "limit" | "roomType" | "search">>,
    ) {
      const values: Array<string | number> = [];
      const filters = ["r.is_published = true", "r.deleted_at is null"];

      if (query.roomType) {
        values.push(query.roomType);
        filters.push(`r.type = $${values.length}`);
      }

      if (query.search) {
        values.push(`%${query.search}%`);
        filters.push(
          `(r.name ilike $${values.length} or r.description ilike $${values.length})`,
        );
      }

      let limitClause = "";
      if (query.limit !== undefined) {
        values.push(query.limit);
        limitClause = `limit $${values.length}`;
      }
      const result = await pool.query<RoomRow>(
        `
          select
            r.id,
            r.slug::text,
            r.name,
            r.type,
            r.description,
            r.capacity,
            r.hourly_rate,
            r.currency,
            (
              select ri.storage_path
              from public.room_images ri
              where ri.room_id = r.id
              order by ri.sort_order asc, ri.created_at asc
              limit 1
            ) as image_path
          from public.rooms r
          where ${filters.join(" and ")}
          order by ${roomDisplayOrder}
          ${limitClause}
        `,
        values,
      );

      return result.rows.map((row) => ({
        capacity: row.capacity,
        currency: row.currency,
        description: row.description,
        hourlyRate: row.hourly_rate,
        id: row.id,
        imagePath: row.image_path,
        name: row.name,
        slug: row.slug,
        type: row.type,
      }));
    },
    async findPublishedRoomBySlug(slug: string) {
      const roomResult = await pool.query<RoomRow>(
        `
          select id, slug::text, name, type, description, capacity,
            hourly_rate, currency, status
          from public.rooms
          where slug = $1 and is_published = true and deleted_at is null
          limit 1
        `,
        [slug],
      );
      const room = roomResult.rows[0];
      if (!room || !room.status) return null;

      const [imageResult, equipmentResult] = await Promise.all([
        pool.query<RoomImageRow>(
          `select storage_path, alt_text from public.room_images where room_id = $1 order by sort_order asc, created_at asc`,
          [room.id],
        ),
        pool.query<RoomEquipmentRow>(
          `
            select e.id, e.name, e.category, e.description, re.quantity, re.note
            from public.room_equipment re
            join public.equipment e on e.id = re.equipment_id
            where re.room_id = $1 and e.deleted_at is null
            order by e.category asc, e.name asc
          `,
          [room.id],
        ),
      ]);

      return {
        capacity: room.capacity,
        currency: room.currency,
        description: room.description,
        equipment: equipmentResult.rows,
        hourlyRate: room.hourly_rate,
        id: room.id,
        imagePath: imageResult.rows[0]?.storage_path ?? null,
        images: imageResult.rows.map((image) => ({
          altText: image.alt_text,
          path: image.storage_path,
        })),
        name: room.name,
        slug: room.slug,
        status: room.status,
        type: room.type,
      };
    },
  };
}
