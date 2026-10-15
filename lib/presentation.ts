const bangkokOffsetMinutes = 7 * 60;

export function formatThaiBaht(amount: number): string {
  const hasFraction = !Number.isInteger(amount);

  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
    maximumFractionDigits: hasFraction ? 2 : 0,
    minimumFractionDigits: hasFraction ? 2 : 0,
    style: "currency",
  })
    .format(amount)
    .replace("THB", "฿")
    .replace(/\s/g, "");
}

export function localBangkokDateTimeToIso(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("วันที่ไม่ถูกต้อง");
  }

  const timeParts = /^(\d{2}):(\d{2})$/.exec(time);
  const hours = Number(timeParts?.[1]);
  const minutes = Number(timeParts?.[2]);

  if (!timeParts || hours > 23 || minutes > 59) {
    throw new Error("เวลาเริ่มต้นไม่ถูกต้อง");
  }

  const localMilliseconds = Date.parse(`${date}T${time}:00.000Z`);
  if (Number.isNaN(localMilliseconds)) {
    throw new Error("วันที่ไม่ถูกต้อง");
  }

  return new Date(
    localMilliseconds - bangkokOffsetMinutes * 60_000,
  ).toISOString();
}

export function formatBangkokDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}
