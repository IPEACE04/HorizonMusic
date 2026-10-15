export const acceptedSlipMimeTypes = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;
export const maxSlipBytes = 10 * 1024 * 1024;

export function validateSlipFile(
  input: Readonly<{ mimeType: string; size: number }>,
) {
  if (
    !acceptedSlipMimeTypes.includes(
      input.mimeType as (typeof acceptedSlipMimeTypes)[number],
    )
  ) {
    throw new Error("รองรับสลิปประเภท JPEG, PNG หรือ PDF เท่านั้น");
  }
  if (!Number.isInteger(input.size) || input.size < 1)
    throw new Error("ไฟล์สลิปว่างเปล่า");
  if (input.size > maxSlipBytes)
    throw new Error("ไฟล์สลิปต้องมีขนาดไม่เกิน 10 MB");
  const extension =
    input.mimeType === "image/jpeg"
      ? "jpg"
      : input.mimeType === "image/png"
        ? "png"
        : "pdf";
  return { extension, maxBytes: maxSlipBytes, mimeType: input.mimeType };
}

export function assertPaymentReview(
  action: "APPROVE" | "REJECT",
  paymentStatus: string,
  bookingStatus: string,
  note?: string,
) {
  if (paymentStatus !== "PENDING")
    throw new Error("สลิปรายการนี้ถูกตรวจไปแล้ว");
  if (action === "REJECT" && !note?.trim())
    throw new Error("กรุณาระบุเหตุผลที่ไม่อนุมัติ");
  if (
    action === "APPROVE" &&
    !["PENDING_PAYMENT", "CANCELLED"].includes(bookingStatus)
  ) {
    throw new Error("สถานะ Booking นี้ไม่อนุญาตให้ยืนยันการจอง");
  }
  return action === "REJECT"
    ? "FAILED"
    : bookingStatus === "CANCELLED"
      ? "REFUND_PENDING"
      : "PAID";
}

export function validateRefundReference(value: string) {
  const reference = value.trim();
  if (!reference || reference.length > 255)
    throw new Error("กรุณาระบุเลขอ้างอิงการคืนเงิน");
  return reference;
}
