import "server-only";

import { databasePool } from "@/lib/db";

type DashboardRow = {
  bookings: string;
  pending_payments: string;
  revenue: string;
  users: string;
};

export async function getDashboardSummary() {
  const result = await databasePool.query<DashboardRow>(`
    select
      (select count(*) from public.bookings where created_at >= date_trunc('month', now()))::text as bookings,
      (select count(*) from public.payments where status = 'PENDING')::text as pending_payments,
      (select coalesce(sum(amount), 0) from public.payments where status in ('PAID','REFUND_PENDING','REFUNDED') and created_at >= date_trunc('month', now()))::text as revenue,
      (select count(*) from public."user")::text as users
  `);
  const row = result.rows[0];
  return {
    bookings: Number(row?.bookings ?? 0),
    pendingPayments: Number(row?.pending_payments ?? 0),
    revenue: Number(row?.revenue ?? 0),
    users: Number(row?.users ?? 0),
  };
}
