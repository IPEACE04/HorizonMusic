import assert from "node:assert/strict";
import test from "node:test";

import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });

const databaseUrl = process.env.DATABASE_URL;
const integrationTest =
  process.env.SMT_DATABASE_INTEGRATION === "1" && databaseUrl
    ? test
    : test.skip;

integrationTest(
  "admin operations can read activity logs and a calendar range from Postgres",
  { skip: !databaseUrl },
  async () => {
    const pool = new Pool({ connectionString: databaseUrl });

    try {
      const { listActivityLogs, listAdminCalendar } =
        await import("../server/admin/operations");
      const logs = await listActivityLogs(
        new URLSearchParams("page=1&pageSize=50"),
        pool,
      );
      const calendar = await listAdminCalendar(
        "2026-09-06T17:00:00.000Z",
        "2026-09-13T17:00:00.000Z",
        undefined,
        pool,
      );

      assert.ok(Array.isArray(logs.items));
      assert.ok(Array.isArray(calendar));
    } finally {
      await pool.end();
    }
  },
);
