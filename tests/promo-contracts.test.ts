import assert from "node:assert/strict";
import test from "node:test";

import { parsePromoInput } from "../features/admin/promo-contracts";

const base = {
  appliesToAllRooms: true,
  code: " smt-welcome ",
  description: " เปิดตัว ",
  discountType: "PERCENTAGE",
  discountValue: "10",
  endsAt: "2026-12-31T17:00:00.000Z",
  isActive: true,
  maxDiscountAmount: "500",
  minBookingAmount: "1000",
  perUserLimit: "1",
  roomIds: [],
  startsAt: "2026-09-08T17:00:00.000Z",
  totalUsageLimit: "100",
};

test("promo input normalizes code, money, limits and instants", () => {
  assert.deepEqual(parsePromoInput(base), {
    appliesToAllRooms: true,
    code: "SMT-WELCOME",
    description: "เปิดตัว",
    discountType: "PERCENTAGE",
    discountValue: 10,
    endsAt: "2026-12-31T17:00:00.000Z",
    isActive: true,
    maxDiscountAmount: 500,
    minBookingAmount: 1000,
    perUserLimit: 1,
    roomIds: [],
    startsAt: "2026-09-08T17:00:00.000Z",
    totalUsageLimit: 100,
  });
});

test("percentage promo cannot exceed one hundred percent", () => {
  assert.throws(() => parsePromoInput({ ...base, discountValue: 101 }), /100%/);
});

test("promo end must be after start and limits must be positive integers", () => {
  assert.throws(
    () => parsePromoInput({ ...base, endsAt: base.startsAt }),
    /หลังวันเริ่ม/,
  );
  assert.throws(
    () => parsePromoInput({ ...base, perUserLimit: 0 }),
    /จำนวนเต็มบวก/,
  );
});

test("room-scoped promo requires unique valid room ids", () => {
  assert.throws(
    () => parsePromoInput({ ...base, appliesToAllRooms: false }),
    /อย่างน้อยหนึ่งห้อง/,
  );
  const roomId = "247e7767-8b2b-4e3d-b12f-ef31fba208c7";
  assert.equal(
    parsePromoInput({ ...base, appliesToAllRooms: false, roomIds: [roomId] })
      .roomIds[0],
    roomId,
  );
  assert.throws(
    () =>
      parsePromoInput({
        ...base,
        appliesToAllRooms: false,
        roomIds: [roomId, roomId],
      }),
    /ซ้ำ/,
  );
});
