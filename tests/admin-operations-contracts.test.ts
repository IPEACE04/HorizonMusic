import assert from "node:assert/strict";
import test from "node:test";

import {
  parseAdminBookingFilters,
  parseBookingTransitionInput,
  parseBookingPolicyInput,
} from "../server/admin/operations-contracts";

test("admin booking filters normalize safe pagination and status", () => {
  assert.deepEqual(
    parseAdminBookingFilters(
      new URLSearchParams(
        "page=2&pageSize=50&search= SMT100 &status=CONFIRMED",
      ),
    ),
    {
      page: 2,
      pageSize: 50,
      search: "SMT100",
      status: "CONFIRMED",
      roomId: undefined,
      from: undefined,
      to: undefined,
    },
  );
});

test("admin booking transition requires reason when cancelling", () => {
  assert.throws(
    () => parseBookingTransitionInput({ status: "CANCELLED", reason: " " }),
    /เหตุผล/,
  );
  assert.deepEqual(parseBookingTransitionInput({ status: "COMPLETED" }), {
    status: "COMPLETED",
    reason: undefined,
  });
});

test("admin booking transition does not allow bypassing payment confirmation", () => {
  assert.throws(
    () => parseBookingTransitionInput({ status: "CONFIRMED" }),
    /สถานะ Booking ไม่ถูกต้อง/,
  );
});

test("booking policy accepts bounded operational values", () => {
  assert.deepEqual(
    parseBookingPolicyInput({
      open24Hours: true,
      minimumMinutes: 60,
      incrementMinutes: 30,
      cancellationCutoffHours: 12,
      paymentDueMinutes: 30,
      version: 1,
    }),
    {
      open24Hours: true,
      minimumMinutes: 60,
      incrementMinutes: 30,
      cancellationCutoffHours: 12,
      paymentDueMinutes: 30,
      version: 1,
    },
  );
});
