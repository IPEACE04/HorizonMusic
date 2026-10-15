const dayMilliseconds = 24 * 60 * 60 * 1000;
const bangkokOffset = 7 * 60 * 60 * 1000;
const weekdays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function localDate(value: Date | string) {
  return new Date(new Date(value).getTime() + bangkokOffset);
}
export function bangkokDayKey(value: Date | string) {
  return localDate(value).toISOString().slice(0, 10);
}
export function calendarDayLabel(value: Date | string) {
  return weekdays[localDate(value).getUTCDay()];
}
export function calendarDayNumber(value: Date | string) {
  return localDate(value).getUTCDate();
}
export function calendarDateLabel(value: Date | string) {
  const date = localDate(value);
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear() + 543}`;
}
export function weekBounds(offset: number, reference: string) {
  const date = localDate(reference);
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - bangkokOffset;
  const monday = midnight - ((date.getUTCDay() + 6) % 7) * dayMilliseconds + offset * 7 * dayMilliseconds;
  return { from: new Date(monday), to: new Date(monday + 7 * dayMilliseconds) };
}
