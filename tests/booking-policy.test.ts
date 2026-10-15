import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateQuote,
  canCancelBooking,
  overlaps,
  validateBookingTime,
} from "../server/bookings/policy";

test("quote calculates room, addon and capped percentage discount in satang", () => {
  assert.deepEqual(
    calculateQuote({
      addons: [
        { pricingType: "FIXED", quantity: 1, unitPrice: "200.00" },
        { pricingType: "PER_HOUR", quantity: 1, unitPrice: "100.00" },
        { pricingType: "PER_UNIT", quantity: 2, unitPrice: "50.00" },
      ],
      durationMinutes: 90,
      promo: {
        discountType: "PERCENTAGE",
        discountValue: "10.00",
        maxDiscountAmount: "100.00",
        minBookingAmount: "0.00",
      },
      roomHourlyRate: "500.00",
    }),
    {
      addonSubtotal: 45000,
      discountAmount: 10000,
      roomSubtotal: 75000,
      subtotal: 120000,
      totalAmount: 110000,
    },
  );
});

test("booking time requires future 30-minute boundary and minimum duration", () => {
  assert.throws(
    () =>
      validateBookingTime(
        "2026-09-08T04:15:00.000Z",
        60,
        new Date("2026-09-08T00:00:00Z"),
      ),
    /30 นาที/,
  );
  assert.throws(
    () =>
      validateBookingTime(
        "2026-09-08T04:30:00.000Z",
        30,
        new Date("2026-09-08T00:00:00Z"),
      ),
    /อย่างน้อย 60 นาที/,
  );
});

test("half-open intervals allow adjacent sessions but reject overlap", () => {
  assert.equal(
    overlaps(
      "2026-09-08T10:00:00Z",
      "2026-09-08T11:00:00Z",
      "2026-09-08T11:00:00Z",
      "2026-09-08T12:00:00Z",
    ),
    false,
  );
  assert.equal(
    overlaps(
      "2026-09-08T10:00:00Z",
      "2026-09-08T11:00:00Z",
      "2026-09-08T10:30:00Z",
      "2026-09-08T12:00:00Z",
    ),
    true,
  );
});

test("cancellation requires at least twelve hours before start", () => {
  assert.equal(
    canCancelBooking("2026-09-08T18:00:00Z", new Date("2026-09-08T06:00:00Z")),
    true,
  );
  assert.equal(
    canCancelBooking("2026-09-08T18:00:00Z", new Date("2026-09-08T06:00:01Z")),
    false,
  );
});
