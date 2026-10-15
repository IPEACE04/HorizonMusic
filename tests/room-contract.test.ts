import assert from "node:assert/strict";
import test from "node:test";

import { parseRoomListQuery } from "../server/rooms/contracts";

test("parseRoomListQuery applies safe defaults to an empty public room search", () => {
  assert.deepEqual(parseRoomListQuery(new URLSearchParams()), {
    cursor: undefined,
    limit: 12,
    roomType: undefined,
    search: undefined,
  });
});

test("parseRoomListQuery accepts a published room type and trims search text", () => {
  assert.deepEqual(
    parseRoomListQuery(
      new URLSearchParams({
        type: "RECORDING",
        q: "  vocal booth  ",
        limit: "6",
      }),
    ),
    {
      cursor: undefined,
      limit: 6,
      roomType: "RECORDING",
      search: "vocal booth",
    },
  );
});

test("parseRoomListQuery rejects unsupported room types and oversized pages", () => {
  assert.throws(
    () => parseRoomListQuery(new URLSearchParams({ type: "LIVE" })),
    /ประเภทห้องไม่ถูกต้อง/,
  );
  assert.throws(
    () => parseRoomListQuery(new URLSearchParams({ limit: "51" })),
    /จำนวนรายการต้องอยู่ระหว่าง 1 ถึง 50/,
  );
});
