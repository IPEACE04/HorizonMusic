import assert from "node:assert/strict";
import test from "node:test";
import { bangkokDayKey, calendarDateLabel, calendarDayLabel, calendarDayNumber, weekBounds } from "../features/admin/calendar-date";

test("Bangkok Monday starts on Sunday UTC, with stable Thai labels and dates", () => {
  const bounds = weekBounds(0, "2026-10-11T18:00:00Z");
  assert.equal(bounds.from.toISOString(), "2026-10-11T17:00:00.000Z");
  assert.equal(bounds.to.toISOString(), "2026-10-18T17:00:00.000Z");
  assert.equal(bangkokDayKey(bounds.from), "2026-10-12");
  assert.equal(calendarDayLabel(bounds.from), "จ.");
  assert.equal(calendarDayNumber(bounds.from), 12);
  assert.equal(calendarDateLabel(bounds.from), "12 ต.ค. 2569");
  assert.equal(calendarDateLabel(new Date(bounds.to.getTime() - 1)), "18 ต.ค. 2569");
});

test("the day before Bangkok Monday still belongs to the preceding week", () => {
  assert.equal(weekBounds(0, "2026-10-11T16:59:59Z").from.toISOString(), "2026-10-04T17:00:00.000Z");
  assert.equal(weekBounds(1, "2026-10-11T16:59:59Z").from.toISOString(), "2026-10-11T17:00:00.000Z");
});

test("server/client labels do not depend on ICU weekday abbreviation differences", () => {
  const formatter = Intl.DateTimeFormat;
  try {
    Intl.DateTimeFormat = class { constructor() { throw new Error("Platform locale unavailable"); } } as unknown as typeof Intl.DateTimeFormat;
    const bounds = weekBounds(0, "2026-10-13T08:00:00Z");
    assert.equal(calendarDayLabel(bounds.from), "จ.");
    assert.equal(calendarDateLabel(bounds.from), "12 ต.ค. 2569");
  } finally { Intl.DateTimeFormat = formatter; }
});
