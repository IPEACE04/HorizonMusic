import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("booking lifecycle delegates expiry to the private database function", async () => {
  const source = await readFile(
    new URL("../server/bookings/lifecycle.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /select private\.expire_overdue_bookings\(\) as expired/i);
  assert.doesNotMatch(source, /update public\.bookings/i);
});
