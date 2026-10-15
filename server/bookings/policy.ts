export type AddonPricingType = "FIXED" | "PER_HOUR" | "PER_UNIT";
export type DiscountType = "FIXED" | "PERCENTAGE";

function toSatang(value: string) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new Error("จำนวนเงินไม่ถูกต้อง");
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

function roundDivide(value: number, divisor: number) {
  return Math.round(value / divisor);
}

export function validateBookingTime(
  startsAt: string,
  durationMinutes: number,
  now = new Date(),
) {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime()) || start <= now)
    throw new Error("เวลาเริ่มต้องอยู่ในอนาคต");
  if (
    start.getUTCMinutes() % 30 !== 0 ||
    start.getUTCSeconds() !== 0 ||
    start.getUTCMilliseconds() !== 0
  )
    throw new Error("เวลาเริ่มต้องตรงช่วง 30 นาที");
  if (!Number.isInteger(durationMinutes) || durationMinutes < 60)
    throw new Error("ระยะเวลาต้องอย่างน้อย 60 นาที");
  if (durationMinutes % 30 !== 0)
    throw new Error("ระยะเวลาต้องเพิ่มครั้งละ 30 นาที");
  return {
    endsAt: new Date(start.getTime() + durationMinutes * 60_000).toISOString(),
    startsAt: start.toISOString(),
  };
}

export function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) {
  return (
    new Date(aStart).getTime() < new Date(bEnd).getTime() &&
    new Date(bStart).getTime() < new Date(aEnd).getTime()
  );
}

export function canCancelBooking(startsAt: string, now = new Date()) {
  return new Date(startsAt).getTime() - now.getTime() >= 12 * 60 * 60 * 1000;
}

export function calculateQuote(
  input: Readonly<{
    addons: ReadonlyArray<
      Readonly<{
        pricingType: AddonPricingType;
        quantity: number;
        unitPrice: string;
      }>
    >;
    durationMinutes: number;
    promo?: Readonly<{
      discountType: DiscountType;
      discountValue: string;
      maxDiscountAmount: string | null;
      minBookingAmount: string;
    }> | null;
    roomHourlyRate: string;
  }>,
) {
  const roomSubtotal = roundDivide(
    toSatang(input.roomHourlyRate) * input.durationMinutes,
    60,
  );
  const addonSubtotal = input.addons.reduce((total, addon) => {
    if (!Number.isInteger(addon.quantity) || addon.quantity < 1)
      throw new Error("จำนวนบริการเสริมไม่ถูกต้อง");
    const unit = toSatang(addon.unitPrice);
    if (addon.pricingType === "PER_HOUR")
      return (
        total + roundDivide(unit * input.durationMinutes * addon.quantity, 60)
      );
    return total + unit * addon.quantity;
  }, 0);
  const subtotal = roomSubtotal + addonSubtotal;
  let discountAmount = 0;
  if (input.promo) {
    if (subtotal < toSatang(input.promo.minBookingAmount))
      throw new Error("ยอดจองไม่ถึงขั้นต่ำของส่วนลด");
    discountAmount =
      input.promo.discountType === "FIXED"
        ? toSatang(input.promo.discountValue)
        : roundDivide(subtotal * Number(input.promo.discountValue), 100);
    if (input.promo.maxDiscountAmount)
      discountAmount = Math.min(
        discountAmount,
        toSatang(input.promo.maxDiscountAmount),
      );
    discountAmount = Math.min(discountAmount, subtotal);
  }
  return {
    addonSubtotal,
    discountAmount,
    roomSubtotal,
    subtotal,
    totalAmount: subtotal - discountAmount,
  };
}

export function satangToDatabaseMoney(satang: number) {
  return `${Math.floor(satang / 100)}.${String(satang % 100).padStart(2, "0")}`;
}
