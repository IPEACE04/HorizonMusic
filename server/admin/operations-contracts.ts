import { InputValidationError } from "@/features/auth/contracts";

export const adminBookingStatuses = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
] as const;
export type AdminBookingStatus = (typeof adminBookingStatuses)[number];

const adminBookingTransitionStatuses = [
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
] as const;

function optionalText(value: string | null | undefined) {
  const text = value?.trim();
  return text || undefined;
}

export function parseAdminBookingFilters(params: URLSearchParams) {
  const page = Math.max(1, Math.min(10_000, Number(params.get("page") || 1)));
  const pageSize = Math.max(
    10,
    Math.min(100, Number(params.get("pageSize") || 50)),
  );
  const status = optionalText(params.get("status"));
  return {
    page: Number.isInteger(page) ? page : 1,
    pageSize: Number.isInteger(pageSize) ? pageSize : 50,
    search: optionalText(params.get("search")),
    status: adminBookingStatuses.includes(status as AdminBookingStatus)
      ? (status as AdminBookingStatus)
      : undefined,
    roomId: optionalText(params.get("roomId")),
    from: optionalText(params.get("from")),
    to: optionalText(params.get("to")),
  };
}

export function parseBookingTransitionInput(value: unknown) {
  const input = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const status = typeof input.status === "string" ? input.status : "";
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (
    !adminBookingTransitionStatuses.includes(
      status as (typeof adminBookingTransitionStatuses)[number],
    )
  )
    throw new InputValidationError("สถานะ Booking ไม่ถูกต้อง");
  if (status === "CANCELLED" && (reason.length < 2 || reason.length > 500))
    throw new InputValidationError("กรุณาระบุเหตุผลการยกเลิก 2–500 ตัวอักษร", {
      reason: "กรุณาระบุเหตุผลการยกเลิก 2–500 ตัวอักษร",
    });
  return {
    status: status as AdminBookingStatus,
    reason: reason || undefined,
  };
}

export function parseBookingPolicyInput(value: unknown) {
  const input = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const number = (key: string) => Number(input[key]);
  const output = {
    open24Hours: input.open24Hours === true,
    minimumMinutes: number("minimumMinutes"),
    incrementMinutes: number("incrementMinutes"),
    cancellationCutoffHours: number("cancellationCutoffHours"),
    paymentDueMinutes: number("paymentDueMinutes"),
    version: number("version"),
  };
  if (
    !Number.isInteger(output.minimumMinutes) ||
    output.minimumMinutes < 30 ||
    output.minimumMinutes > 1_440 ||
    !Number.isInteger(output.incrementMinutes) ||
    output.incrementMinutes < 30 ||
    output.incrementMinutes > 1_440 ||
    !Number.isInteger(output.cancellationCutoffHours) ||
    output.cancellationCutoffHours < 0 ||
    output.cancellationCutoffHours > 168 ||
    !Number.isInteger(output.paymentDueMinutes) ||
    output.paymentDueMinutes < 5 ||
    output.paymentDueMinutes > 1_440 ||
    !Number.isInteger(output.version) ||
    output.version < 1
  )
    throw new InputValidationError("ค่า Booking policy ไม่ถูกต้อง");
  if (output.minimumMinutes % output.incrementMinutes !== 0)
    throw new InputValidationError(
      "Minimum duration ต้องสอดคล้องกับช่วงเวลาเพิ่มทีละ increment",
    );
  return output;
}
