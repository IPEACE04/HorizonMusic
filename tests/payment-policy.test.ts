import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPaymentReview,
  validateRefundReference,
  validateSlipFile,
} from "../server/payments/policy";

test("slip accepts JPEG PNG PDF up to ten megabytes", () => {
  assert.deepEqual(validateSlipFile({ mimeType: "image/png", size: 2048 }), {
    extension: "png",
    maxBytes: 10485760,
    mimeType: "image/png",
  });
  assert.throws(
    () => validateSlipFile({ mimeType: "image/webp", size: 2048 }),
    /JPEG, PNG หรือ PDF/,
  );
  assert.throws(
    () => validateSlipFile({ mimeType: "image/jpeg", size: 10485761 }),
    /10 MB/,
  );
});

test("payment approval is allowed only for pending payment and active booking", () => {
  assert.doesNotThrow(() =>
    assertPaymentReview("APPROVE", "PENDING", "PENDING_PAYMENT"),
  );
  assert.throws(
    () => assertPaymentReview("APPROVE", "PAID", "PENDING_PAYMENT"),
    /ตรวจไปแล้ว/,
  );
  assert.throws(
    () => assertPaymentReview("APPROVE", "PENDING", "EXPIRED"),
    /ยืนยันการจอง/,
  );
});

test("payment rejection requires a review reason", () => {
  assert.throws(
    () => assertPaymentReview("REJECT", "PENDING", "PENDING_PAYMENT", "  "),
    /เหตุผล/,
  );
});

test("refund completion requires a reference", () => {
  assert.equal(validateRefundReference("  RF-2026-001  "), "RF-2026-001");
  assert.throws(() => validateRefundReference(""), /เลขอ้างอิง/);
});
