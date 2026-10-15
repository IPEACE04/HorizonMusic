export class InputValidationError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: Readonly<Record<string, string>> = {},
  ) {
    super(message);
    this.name = "InputValidationError";
  }
}

type UnknownRecord = Readonly<Record<string, unknown>>;

function text(input: UnknownRecord, key: string) {
  return typeof input[key] === "string" ? input[key].trim() : "";
}

function normalizePhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^0\d{8,9}$/.test(compact)) return `+66${compact.slice(1)}`;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  throw new InputValidationError("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง", {
    phone: "ใช้เบอร์ไทย เช่น 0812345678 หรือรูปแบบสากล +66812345678",
  });
}

function profileFields(input: UnknownRecord) {
  const firstName = text(input, "firstName");
  const lastName = text(input, "lastName");
  const fieldErrors: Record<string, string> = {};

  if (!firstName || firstName.length > 100)
    fieldErrors.firstName = "กรุณากรอกชื่อไม่เกิน 100 ตัวอักษร";
  if (!lastName || lastName.length > 100)
    fieldErrors.lastName = "กรุณากรอกนามสกุลไม่เกิน 100 ตัวอักษร";
  if (Object.keys(fieldErrors).length)
    throw new InputValidationError("กรุณาตรวจสอบข้อมูลส่วนตัว", fieldErrors);

  return { firstName, lastName, phone: normalizePhone(text(input, "phone")) };
}

export function parseProfileInput(input: UnknownRecord) {
  return profileFields(input);
}

export function parseRegistrationInput(input: UnknownRecord) {
  const profile = profileFields(input);
  const email = text(input, "email").toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";
  const confirmPassword =
    typeof input.confirmPassword === "string" ? input.confirmPassword : "";
  const fieldErrors: Record<string, string> = {};

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fieldErrors.email = "กรุณากรอกอีเมลให้ถูกต้อง";
  if (password.length < 8 || password.length > 128)
    fieldErrors.password = "รหัสผ่านต้องมี 8–128 ตัวอักษร";
  if (password !== confirmPassword)
    fieldErrors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
  if (Object.keys(fieldErrors).length) {
    throw new InputValidationError(
      fieldErrors.confirmPassword ?? "กรุณาตรวจสอบข้อมูลสมัครสมาชิก",
      fieldErrors,
    );
  }

  return { ...profile, email, password };
}

export function parseLoginInput(input: UnknownRecord) {
  const email = text(input, "email").toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    throw new InputValidationError("กรุณาตรวจสอบอีเมลและรหัสผ่าน");
  }
  return { email, password };
}
