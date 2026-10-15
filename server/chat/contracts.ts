export function parseMessageBody(value: unknown) {
  const body =
    value &&
    typeof value === "object" &&
    typeof (value as { body?: unknown }).body === "string"
      ? (value as { body: string }).body.trim()
      : "";
  if (body.length < 1 || body.length > 2000)
    throw new Error("ข้อความต้องมี 1–2,000 ตัวอักษร");
  return body;
}

export function parseMessageCursor(value: string | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value)
    throw new Error("message cursor ไม่ถูกต้อง");
  return value;
}
