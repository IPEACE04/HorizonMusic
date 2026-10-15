import { InputValidationError } from "@/features/auth/contracts";

export const maxProfileImageSize = 3 * 1024 * 1024;
export const profileImageTypes = ["image/jpeg", "image/png", "image/webp"];

export function validateProfileImage(file: { size: number; type: string }) {
  if (!profileImageTypes.includes(file.type))
    throw new InputValidationError("กรุณาเลือกรูป JPG, PNG หรือ WebP");
  if (!file.size || file.size > maxProfileImageSize)
    throw new InputValidationError("รูปโปรไฟล์ต้องมีขนาดไม่เกิน 3 MB");
}

export function profileImageExtension(bytes: Uint8Array, type: string) {
  const matches = (offset: number, signature: number[]) =>
    signature.every((value, index) => bytes[offset + index] === value);
  if (type === "image/jpeg" && matches(0, [255, 216, 255])) return "jpg";
  if (type === "image/png" && matches(0, [137, 80, 78, 71, 13, 10, 26, 10])) return "png";
  if (type === "image/webp" && matches(0, [82, 73, 70, 70]) && matches(8, [87, 69, 66, 80])) return "webp";
  throw new InputValidationError("ไฟล์ไม่ใช่รูปภาพชนิดที่รองรับ");
}
