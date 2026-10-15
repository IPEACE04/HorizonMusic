import "server-only";
import type { Pool } from "pg";
import { databasePool } from "@/lib/db";
export async function listNotifications(
  userId: string,
  pool: Pool = databasePool,
) {
  const result = await pool.query(
    `select id,type,title,body,data,read_at as "readAt",created_at as "createdAt" from public.notifications where user_id=$1 order by created_at desc limit 100`,
    [userId],
  );
  return result.rows;
}

export async function listNotificationsPage(
  userId: string,
  page = 1,
  pageSize = 10,
  pool: Pool = databasePool,
) {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize) || 10));
  const [countResult, result] = await Promise.all([
    pool.query<{ count: string }>(
      `select count(*)::text as count from public.notifications where user_id=$1`,
      [userId],
    ),
    pool.query(
      `select id,type,title,body,data,read_at as "readAt",created_at as "createdAt" from public.notifications where user_id=$1 order by created_at desc limit $2 offset $3`,
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
export async function notificationUnreadCount(
  userId: string,
  pool: Pool = databasePool,
) {
  const result = await pool.query<{ count: string }>(
    `select count(*)::text from public.notifications where user_id=$1 and read_at is null`,
    [userId],
  );
  return Number(result.rows[0]?.count ?? 0);
}
export async function markNotificationsRead(
  userId: string,
  id: string | undefined,
  pool: Pool = databasePool,
) {
  if (id)
    await pool.query(
      `update public.notifications set read_at=coalesce(read_at,now()) where id=$1 and user_id=$2`,
      [id, userId],
    );
  else
    await pool.query(
      `update public.notifications set read_at=coalesce(read_at,now()) where user_id=$1`,
      [userId],
    );
  return { read: true };
}
