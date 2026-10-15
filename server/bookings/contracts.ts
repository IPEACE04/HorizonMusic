import { InputValidationError } from "@/features/auth/contracts";

export type BookingIntent = Readonly<{
  addons: ReadonlyArray<Readonly<{ id: string; quantity: number }>>;
  durationMinutes: number;
  idempotencyKey?: string;
  promoCode?: string;
  roomId: string;
  startsAt: string;
}>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseBookingIntent(
  value: unknown,
  requireIdempotency = false,
): BookingIntent {
  if (!value || typeof value !== "object")
    throw new InputValidationError("ข้อมูลการจองไม่ถูกต้อง");
  const input = value as Record<string, unknown>;
  const roomId = typeof input.roomId === "string" ? input.roomId : "";
  const startsAt = typeof input.startsAt === "string" ? input.startsAt : "";
  const durationMinutes = Number(input.durationMinutes);
  const promoCode =
    typeof input.promoCode === "string"
      ? input.promoCode.trim().toUpperCase() || undefined
      : undefined;
  const idempotencyKey =
    typeof input.idempotencyKey === "string"
      ? input.idempotencyKey.trim()
      : undefined;
  const rawAddons = Array.isArray(input.addons) ? input.addons : [];
  const addons = rawAddons.map((item) => {
    const addon = item as Record<string, unknown>;
    return {
      id: typeof addon.id === "string" ? addon.id : "",
      quantity: Number(addon.quantity),
    };
  });
  if (!uuidPattern.test(roomId) || Number.isNaN(Date.parse(startsAt)))
    throw new InputValidationError("ห้องหรือเวลาเริ่มไม่ถูกต้อง");
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 60 ||
    durationMinutes % 30 !== 0
  )
    throw new InputValidationError(
      "ระยะเวลาต้องเริ่มที่ 60 นาทีและเพิ่มครั้งละ 30 นาที",
    );
  if (
    addons.some(
      (addon) =>
        !uuidPattern.test(addon.id) ||
        !Number.isInteger(addon.quantity) ||
        addon.quantity < 1,
    )
  )
    throw new InputValidationError("บริการเสริมไม่ถูกต้อง");
  if (requireIdempotency && (!idempotencyKey || idempotencyKey.length > 128))
    throw new InputValidationError("ไม่พบรหัสป้องกันการจองซ้ำ");
  return {
    addons,
    durationMinutes,
    idempotencyKey,
    promoCode,
    roomId,
    startsAt,
  };
}
