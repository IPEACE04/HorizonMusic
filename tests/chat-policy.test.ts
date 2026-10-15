import assert from "node:assert/strict";
import test from "node:test";

import { parseMessageBody, parseMessageCursor } from "../server/chat/contracts";

test("chat trims messages and accepts up to two thousand characters", () => {
  assert.equal(
    parseMessageBody({ body: "  ขอสอบถามเรื่องห้องซ้อม  " }),
    "ขอสอบถามเรื่องห้องซ้อม",
  );
  assert.equal(parseMessageBody({ body: "ก".repeat(2000) }).length, 2000);
});

test("chat rejects empty and oversized messages", () => {
  assert.throws(() => parseMessageBody({ body: "   " }), /1–2,000/);
  assert.throws(() => parseMessageBody({ body: "a".repeat(2001) }), /1–2,000/);
});

test("message cursor accepts only ISO timestamps", () => {
  assert.equal(parseMessageCursor(undefined), undefined);
  assert.equal(
    parseMessageCursor("2026-09-08T12:00:00.000Z"),
    "2026-09-08T12:00:00.000Z",
  );
  assert.throws(() => parseMessageCursor("yesterday"), /cursor/);
});
