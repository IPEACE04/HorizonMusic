import assert from "node:assert/strict";
import test from "node:test";

import { formatThaiBaht, localBangkokDateTimeToIso } from "../lib/presentation";

test("formatThaiBaht formats whole and fractional amounts for the Thai UI", () => {
  assert.equal(formatThaiBaht(650), "฿650");
  assert.equal(formatThaiBaht(1250.5), "฿1,250.50");
});

test("localBangkokDateTimeToIso converts a booking form value to UTC", () => {
  assert.equal(
    localBangkokDateTimeToIso("2026-09-07", "00:30"),
    "2026-09-06T17:30:00.000Z",
  );
});

test("localBangkokDateTimeToIso rejects an invalid booking form time", () => {
  assert.throws(
    () => localBangkokDateTimeToIso("2026-09-07", "25:00"),
    /เวลาเริ่มต้นไม่ถูกต้อง/,
  );
});
