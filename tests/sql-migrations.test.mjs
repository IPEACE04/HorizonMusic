import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const businessMigrationPath = new URL(
  "../db/migrations/0001_business_schema.sql",
  import.meta.url,
);
const authLinksMigrationPath = new URL(
  "../db/migrations/0002_auth_foreign_keys.sql",
  import.meta.url,
);

const businessTables = [
  "user_profiles",
  "rooms",
  "room_images",
  "equipment",
  "room_equipment",
  "room_blocks",
  "addons",
  "bookings",
  "booking_addons",
  "booking_status_history",
  "promo_codes",
  "promo_code_rooms",
  "promo_redemptions",
  "payment_upload_intents",
  "payments",
  "conversations",
  "messages",
  "conversation_read_states",
  "notifications",
  "activity_logs",
  "system_settings",
];

test("business migration creates the complete protected schema without Better Auth foreign keys", async () => {
  const sql = await readFile(businessMigrationPath, "utf8");

  assert.match(sql, /^begin;/im);
  assert.match(sql, /commit;\s*$/im);

  for (const extension of ["pgcrypto", "citext", "btree_gist"]) {
    assert.match(
      sql,
      new RegExp(`create extension if not exists "?${extension}"?`, "i"),
    );
  }

  for (const table of businessTables) {
    assert.match(
      sql,
      new RegExp(`create table public\\.${table}\\b`, "i"),
      `missing table ${table}`,
    );
    assert.match(
      sql,
      new RegExp(
        `alter table public\\.${table} enable row level security`,
        "i",
      ),
      `RLS is not enabled for ${table}`,
    );
  }

  assert.doesNotMatch(sql, /references\s+public\."user"/i);
  assert.match(sql, /exclude using gist/i);
  assert.match(sql, /tstzrange\(starts_at, ends_at, '\[\)'\) with &&/i);
  assert.match(sql, /where \(status in \('PENDING_PAYMENT', 'CONFIRMED'\)\)/i);
  assert.match(sql, /prevent_activity_log_mutation/i);
  assert.match(sql, /open24Hours/i);
  assert.match(sql, /"cancellationCutoffHours": 12/i);
  assert.match(sql, /"paymentDueMinutes": 30/i);
});

test("auth-link migration fails fast and links every user-owned area to Better Auth", async () => {
  const sql = await readFile(authLinksMigrationPath, "utf8");

  assert.match(sql, /^begin;/im);
  assert.match(sql, /commit;\s*$/im);
  assert.match(sql, /to_regclass\('public\.(?:"user"|user)'\) is null/i);
  assert.match(sql, /udt_name <> 'text'/i);

  for (const table of [
    "user_profiles",
    "rooms",
    "equipment",
    "bookings",
    "booking_status_history",
    "promo_codes",
    "promo_redemptions",
    "payment_upload_intents",
    "payments",
    "conversations",
    "messages",
    "conversation_read_states",
    "notifications",
    "activity_logs",
    "system_settings",
  ]) {
    assert.match(
      sql,
      new RegExp(`alter table public\\.${table}\\b`, "i"),
      `missing Better Auth link for ${table}`,
    );
  }

  const userReferenceCount =
    sql.match(/references\s+public\."user"\s*\(id\)/gi)?.length ?? 0;
  assert.ok(
    userReferenceCount >= 20,
    `expected at least 20 Better Auth foreign keys, found ${userReferenceCount}`,
  );
});
