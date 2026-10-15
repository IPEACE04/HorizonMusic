export class PromoValidationError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: Readonly<Record<string, string>> = {},
  ) {
    super(message);
  }
}

export type PromoInput = Readonly<{
  appliesToAllRooms: boolean;
  code: string;
  description: string;
  discountType: "FIXED" | "PERCENTAGE";
  discountValue: number;
  endsAt: string | null;
  isActive: boolean;
  maxDiscountAmount: number | null;
  minBookingAmount: number;
  perUserLimit: number | null;
  roomIds: string[];
  startsAt: string;
  totalUsageLimit: number | null;
}>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function trimmed(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : NaN;
}
function iso(value: unknown) {
  const raw = trimmed(value);
  const date = new Date(raw);
  return raw && Number.isFinite(date.getTime()) && date.toISOString() === raw
    ? raw
    : null;
}
function limit(value: unknown, field: string, errors: Record<string, string>) {
  const number = optionalNumber(value);
  if (number !== null && (!Number.isInteger(number) || number < 1))
    errors[field] = "จำนวนจำกัดต้องเป็นจำนวนเต็มบวก";
  return number;
}

export function parsePromoInput(value: unknown): PromoInput {
  const input = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const code = trimmed(input.code).toUpperCase();
  const description = trimmed(input.description);
  const discountType = input.discountType;
  const discountValue = optionalNumber(input.discountValue);
  const maxDiscountAmount = optionalNumber(input.maxDiscountAmount);
  const minBookingAmount = optionalNumber(input.minBookingAmount) ?? 0;
  const startsAt = iso(input.startsAt);
  const endsAt =
    input.endsAt === null || input.endsAt === "" ? null : iso(input.endsAt);
  const appliesToAllRooms = input.appliesToAllRooms === true;
  const roomIds = Array.isArray(input.roomIds)
    ? input.roomIds.filter((id): id is string => typeof id === "string")
    : [];
  const errors: Record<string, string> = {};
  if (!/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(code))
    errors.code = "โค้ดใช้ A–Z, 0–9, ขีดกลางหรือขีดล่าง สูงสุด 64 ตัว";
  if (description.length > 5000)
    errors.description = "รายละเอียดต้องไม่เกิน 5,000 ตัวอักษร";
  if (discountType !== "FIXED" && discountType !== "PERCENTAGE")
    errors.discountType = "ประเภทส่วนลดไม่ถูกต้อง";
  if (
    discountValue === null ||
    !(discountValue > 0) ||
    discountValue > 1_000_000
  )
    errors.discountValue = "มูลค่าส่วนลดต้องมากกว่า 0";
  else if (discountType === "PERCENTAGE" && discountValue > 100)
    errors.discountValue = "ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100%";
  if (
    maxDiscountAmount !== null &&
    (!(maxDiscountAmount > 0) || maxDiscountAmount > 1_000_000)
  )
    errors.maxDiscountAmount = "ส่วนลดสูงสุดต้องมากกว่า 0";
  if (!(minBookingAmount >= 0) || minBookingAmount > 10_000_000)
    errors.minBookingAmount = "ยอดจองขั้นต่ำต้องเป็น 0 หรือมากกว่า";
  if (!startsAt) errors.startsAt = "วันเริ่มไม่ถูกต้อง";
  if (input.endsAt !== null && input.endsAt !== "" && !endsAt)
    errors.endsAt = "วันสิ้นสุดไม่ถูกต้อง";
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt))
    errors.endsAt = "วันสิ้นสุดต้องอยู่หลังวันเริ่ม";
  const totalUsageLimit = limit(
    input.totalUsageLimit,
    "totalUsageLimit",
    errors,
  );
  const perUserLimit = limit(input.perUserLimit, "perUserLimit", errors);
  if (roomIds.some((id) => !uuidPattern.test(id)))
    errors.roomIds = "ห้องที่เลือกไม่ถูกต้อง";
  if (new Set(roomIds).size !== roomIds.length)
    errors.roomIds = "รายการห้องต้องไม่ซ้ำกัน";
  if (!appliesToAllRooms && !roomIds.length)
    errors.roomIds = "กรุณาเลือกอย่างน้อยหนึ่งห้อง";
  if (Object.keys(errors).length)
    throw new PromoValidationError(Object.values(errors)[0]!, errors);
  return {
    appliesToAllRooms,
    code,
    description,
    discountType: discountType as PromoInput["discountType"],
    discountValue: discountValue!,
    endsAt,
    isActive: input.isActive !== false,
    maxDiscountAmount: discountType === "PERCENTAGE" ? maxDiscountAmount : null,
    minBookingAmount,
    perUserLimit,
    roomIds: appliesToAllRooms ? [] : roomIds,
    startsAt: startsAt!,
    totalUsageLimit,
  };
}
