import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { AdminCalendarView } from "../features/admin/operations-workspace";

test("actual calendar first render is identical across server/browser timezones and ICU variants", () => {
  const originalTimezone = process.env.TZ;
  const originalFormatter = Intl.DateTimeFormat;
  const props = { referenceDate: "2026-10-11T18:00:00.000Z" };
  try {
    process.env.TZ = "UTC";
    const server = renderToString(createElement(AdminCalendarView, props));
    process.env.TZ = "America/Los_Angeles";
    Intl.DateTimeFormat = class { constructor() { throw new Error("ICU differs on client"); } } as unknown as typeof Intl.DateTimeFormat;
    const client = renderToString(createElement(AdminCalendarView, props));
    assert.equal(client, server);
    assert.match(server, /จ\./);
    assert.match(server, /12 ต\.ค\. 2569/);
    assert.equal((server.match(/<article/g) ?? []).length, 7);
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
    Intl.DateTimeFormat = originalFormatter;
  }
});
