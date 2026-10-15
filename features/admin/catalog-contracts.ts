export class CatalogValidationError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: Readonly<Record<string, string>> = {},
  ) {
    super(message);
  }
}

export type RoomInput = Readonly<{
  capacity: number;
  description: string;
  hourlyRate: number;
  isPublished: boolean;
  name: string;
  slug: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE";
  type: "REHEARSAL" | "RECORDING";
}>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function positiveNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : NaN;
}

export function parseRoomInput(value: unknown): RoomInput {
  const input = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const name = text(input.name);
  const slug = text(input.slug).toLowerCase();
  const description = text(input.description);
  const capacity = positiveNumber(input.capacity);
  const hourlyRate = positiveNumber(input.hourlyRate);
  const errors: Record<string, string> = {};
  if (!name || name.length > 160) errors.name = "ชื่อห้องต้องมี 1–160 ตัวอักษร";
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500)
    errors.capacity = "ความจุต้องเป็นจำนวนเต็ม 1–500 คน";
  if (!(hourlyRate > 0) || hourlyRate > 1_000_000)
    errors.hourlyRate = "ราคาต้องมากกว่า 0 และไม่เกิน 1,000,000 บาท";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120)
    errors.slug = "Slug ใช้ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น";
  if (!(["REHEARSAL", "RECORDING"] as unknown[]).includes(input.type))
    errors.type = "ประเภทห้องไม่ถูกต้อง";
  if (
    !(["AVAILABLE", "UNAVAILABLE", "MAINTENANCE"] as unknown[]).includes(
      input.status,
    )
  )
    errors.status = "สถานะห้องไม่ถูกต้อง";
  if (description.length > 5000)
    errors.description = "รายละเอียดต้องไม่เกิน 5,000 ตัวอักษร";
  if (Object.keys(errors).length)
    throw new CatalogValidationError(Object.values(errors)[0]!, errors);
  return {
    capacity,
    description,
    hourlyRate,
    isPublished: input.isPublished === true,
    name,
    slug,
    status: input.status as RoomInput["status"],
    type: input.type as RoomInput["type"],
  };
}

export function parseEquipmentInput(value: unknown) {
  const input = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const name = text(input.name);
  const description = text(input.description);
  const category = input.category;
  const errors: Record<string, string> = {};
  if (!name || name.length > 160)
    errors.name = "ชื่ออุปกรณ์ต้องมี 1–160 ตัวอักษร";
  if (description.length > 5000)
    errors.description = "รายละเอียดต้องไม่เกิน 5,000 ตัวอักษร";
  if (!equipmentCategories.includes(category as EquipmentCategory))
    errors.category = "ประเภทอุปกรณ์ไม่ถูกต้อง";
  if (Object.keys(errors).length)
    throw new CatalogValidationError(Object.values(errors)[0]!, errors);
  return { category: category as EquipmentCategory, description, name };
}

export function parseAddonInput(value: unknown) {
  const input = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const name = text(input.name);
  const description = text(input.description);
  const unitPrice = positiveNumber(input.unitPrice);
  const errors: Record<string, string> = {};
  if (!name || name.length > 160)
    errors.name = "ชื่อบริการเสริมต้องมี 1–160 ตัวอักษร";
  if (!(unitPrice > 0) || unitPrice > 1_000_000)
    errors.unitPrice = "ราคาต้องมากกว่า 0 และไม่เกิน 1,000,000 บาท";
  if (
    !(["FIXED", "PER_HOUR", "PER_UNIT"] as unknown[]).includes(
      input.pricingType,
    )
  )
    errors.pricingType = "รูปแบบราคาไม่ถูกต้อง";
  if (description.length > 5000)
    errors.description = "รายละเอียดต้องไม่เกิน 5,000 ตัวอักษร";
  if (Object.keys(errors).length)
    throw new CatalogValidationError(Object.values(errors)[0]!, errors);
  return {
    description,
    isActive: input.isActive !== false,
    name,
    pricingType: input.pricingType as "FIXED" | "PER_HOUR" | "PER_UNIT",
    unitPrice,
  };
}

export function parseRoomImageInput(value: unknown) {
  const input = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const altText = text(input.altText);
  const mimeType = text(input.mimeType);
  const size = positiveNumber(input.size);
  if (!altText || altText.length > 255)
    throw new CatalogValidationError("คำอธิบายภาพต้องมี 1–255 ตัวอักษร", {
      altText: "คำอธิบายภาพต้องมี 1–255 ตัวอักษร",
    });
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (!extensions[mimeType])
    throw new CatalogValidationError("รองรับภาพ JPEG, PNG หรือ WebP เท่านั้น", {
      file: "รองรับภาพ JPEG, PNG หรือ WebP เท่านั้น",
    });
  if (!Number.isInteger(size) || size < 1)
    throw new CatalogValidationError("ไฟล์ภาพว่างเปล่า", {
      file: "ไฟล์ภาพว่างเปล่า",
    });
  if (size > 10 * 1024 * 1024)
    throw new CatalogValidationError("ไฟล์ภาพต้องมีขนาดไม่เกิน 10 MB", {
      file: "ไฟล์ภาพต้องมีขนาดไม่เกิน 10 MB",
    });
  return { altText, extension: extensions[mimeType]!, mimeType, size };
}

export function parseRoomEquipmentInput(value: unknown) {
  const input = (value && typeof value === "object" ? value : {}) as {
    items?: unknown;
  };
  if (!Array.isArray(input.items) || input.items.length > 200)
    throw new CatalogValidationError("รายการอุปกรณ์ไม่ถูกต้อง");
  const seen = new Set<string>();
  return input.items.map((raw) => {
    const item = (raw && typeof raw === "object" ? raw : {}) as Record<
      string,
      unknown
    >;
    const equipmentId = text(item.equipmentId);
    const quantity = positiveNumber(item.quantity);
    const note = text(item.note) || null;
    if (
      !/^[0-9a-f-]{36}$/i.test(equipmentId) ||
      seen.has(equipmentId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 999
    )
      throw new CatalogValidationError("รายการอุปกรณ์ไม่ถูกต้อง");
    seen.add(equipmentId);
    return { equipmentId, note, quantity };
  });
}
import {
  equipmentCategories,
  type EquipmentCategory,
} from "@/lib/equipment-categories";
