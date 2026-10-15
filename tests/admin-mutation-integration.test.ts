import assert from "node:assert/strict";
import test from "node:test";

import { config } from "dotenv";
import { Pool, type PoolClient } from "pg";

config({ path: ".env.local", quiet: true });

const databaseUrl = process.env.DATABASE_URL;
const integrationTest =
  process.env.SMT_DATABASE_INTEGRATION === "1" && databaseUrl
    ? test
    : test.skip;

function rollbackOnlyPool(pool: Pool) {
  return {
    async connect() {
      const client = await pool.connect();
      return {
        query: async (...args: Parameters<PoolClient["query"]>) => {
          if (args[0] === "commit") return client.query("rollback");
          return client.query(...args);
        },
        release: () => client.release(),
      };
    },
  } as unknown as Pool;
}

integrationTest(
  "admin can approve a pending payment but cannot bypass payment confirmation",
  async (context) => {
    const pool = new Pool({ connectionString: databaseUrl });

    try {
      const fixtures = await pool.query<{
        admin_id: string;
        booking_id: string | null;
        payment_id: string | null;
      }>(
        `select
          (select id from public."user" where role='admin' limit 1) as admin_id,
          (select id from public.bookings where status='PENDING_PAYMENT' limit 1) as booking_id,
          (select id from public.payments where status='PENDING' limit 1) as payment_id`,
      );
      const fixture = fixtures.rows[0];
      if (!fixture?.admin_id || !fixture.booking_id || !fixture.payment_id) {
        context.skip(
          "requires an admin, pending booking, and pending payment fixture",
        );
        return;
      }

      const { AdminOperationsError, transitionAdminBooking } =
        await import("../server/admin/operations");
      const { reviewPayment } = await import("../server/payments/service");
      const isolatedPool = rollbackOnlyPool(pool);

      await assert.rejects(
        () =>
          transitionAdminBooking(
            fixture.booking_id!,
            fixture.admin_id,
            "CONFIRMED",
            undefined,
            isolatedPool,
          ),
        (error) =>
          error instanceof AdminOperationsError &&
          error.code === "INVALID_BOOKING_TRANSITION",
      );
      const payment = await reviewPayment(
        fixture.payment_id,
        fixture.admin_id,
        "APPROVE",
        undefined,
        isolatedPool,
      );

      assert.equal(payment.status, "PAID");
    } finally {
      await pool.end();
    }
  },
);

integrationTest(
  "reviewing an already reviewed payment returns a business conflict instead of a 500",
  async (context) => {
    const pool = new Pool({ connectionString: databaseUrl });

    try {
      const fixtures = await pool.query<{
        admin_id: string;
        payment_id: string | null;
      }>(
        `select
          (select id from public."user" where role='admin' limit 1) as admin_id,
          (select id from public.payments where status in ('FAILED','PAID') limit 1) as payment_id`,
      );
      const fixture = fixtures.rows[0];
      if (!fixture?.admin_id || !fixture.payment_id) {
        context.skip(
          "requires an admin and an already reviewed payment fixture",
        );
        return;
      }

      const { PaymentDomainError, reviewPayment } =
        await import("../server/payments/service");

      await assert.rejects(
        () =>
          reviewPayment(
            fixture.payment_id!,
            fixture.admin_id,
            "APPROVE",
            undefined,
            rollbackOnlyPool(pool),
          ),
        (error) =>
          error instanceof PaymentDomainError &&
          error.status === 409 &&
          error.code === "PAYMENT_REVIEW_NOT_ALLOWED",
      );
    } finally {
      await pool.end();
    }
  },
);
