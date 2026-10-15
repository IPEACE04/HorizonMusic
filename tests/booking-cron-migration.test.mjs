import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("booking expiry cron migration keeps the database function and schedule reproducible", async () => {
  const sql = await readFile(
    new URL("../db/migrations/0003_booking_expiry_cron.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /create extension if not exists pg_cron/i);
  assert.match(sql, /private\.expire_overdue_bookings/i);
  assert.match(sql, /cron\.schedule/i);
  assert.match(sql, /expire-overdue-bookings/);
});
