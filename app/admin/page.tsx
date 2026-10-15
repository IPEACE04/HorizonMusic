import {
  RiBankCardLine,
  RiCalendarCheckLine,
  RiGroupLine,
  RiLineChartLine,
} from "react-icons/ri";

import { formatThaiBaht } from "@/lib/presentation";
import { getDashboardSummary } from "@/server/admin/dashboard";

export default async function AdminDashboardPage() {
  const summary = await getDashboardSummary().catch(() => ({
    bookings: 0,
    pendingPayments: 0,
    revenue: 0,
    users: 0,
  }));
  const cards = [
    [
      "การจองเดือนนี้",
      summary.bookings.toLocaleString("th-TH"),
      RiCalendarCheckLine,
    ],
    [
      "สลิปรอตรวจ",
      summary.pendingPayments.toLocaleString("th-TH"),
      RiBankCardLine,
    ],
    ["รายรับเดือนนี้", formatThaiBaht(summary.revenue), RiLineChartLine],
    ["ผู้ใช้งานทั้งหมด", summary.users.toLocaleString("th-TH"), RiGroupLine],
  ] as const;
  return (
    <>
      <p className="text-xs font-medium tracking-[.16em] text-zinc-500">
        TODAY AT HORIZON
      </p>
      <h1 className="mt-3 text-4xl font-medium tracking-normal sm:text-5xl">
        ภาพรวมการดำเนินงาน
      </h1>
      <p className="mt-4 text-zinc-500">
        ข้อมูลจากระบบล่าสุดสำหรับตัดสินใจและจัดการงานที่ต้องดำเนินการ
      </p>
      <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon], index) => (
          <article
            key={label}
            className={`rounded-lg p-6 ${index === 0 ? "bg-black text-white" : "border border-zinc-200 bg-white"}`}
          >
            <div className="flex items-center justify-between">
              <p
                className={`text-sm ${index === 0 ? "text-white/55" : "text-zinc-500"}`}
              >
                {label}
              </p>
              <Icon className="text-xl" />
            </div>
            <p className="mt-8 text-3xl font-medium tracking-tight">{value}</p>
          </article>
        ))}
      </section>
      <section className="mt-5 rounded-lg border border-zinc-200 bg-white p-7 sm:p-9">
        <h2 className="text-xl font-medium">งานที่ควรจัดการก่อน</h2>
        <div className="mt-6 rounded-lg bg-zinc-100 p-6">
          <p className="font-medium">
            มีสลิปรอตรวจ {summary.pendingPayments} รายการ
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            ตรวจยอดและหลักฐานก่อนเปลี่ยนสถานะการจองเป็น Confirmed
          </p>
        </div>
      </section>
    </>
  );
}
