import "server-only";

import type { Pool, PoolClient } from "pg";

import { databasePool } from "@/lib/db";

type Queryable = Pick<Pool | PoolClient, "query">;

/**
 * Delegates expiry to the database function also used by Supabase Cron.
 * This keeps booking status, promo reservation, audit history and customer
 * notification behavior in one authoritative transaction.
 */
export async function expireOverdueBookings(
  queryable: Queryable = databasePool,
) {
  const result = await queryable.query<{ expired: number }>(
    "select private.expire_overdue_bookings() as expired",
  );

  return { expired: Number(result.rows[0]?.expired ?? 0) };
}
