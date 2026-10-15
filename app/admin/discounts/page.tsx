import type { Metadata } from "next";
import { RiCoupon3Line } from "react-icons/ri";
import {
  PromoManager,
  type PromoRecord,
  type PromoRoom,
} from "@/features/admin/promo-manager";
import { listAdminRooms } from "@/server/admin/catalog/service";
import { listAdminPromos } from "@/server/admin/promos/service";

export const metadata: Metadata = { title: "Promo Codes — Horizon Music" };
export default async function AdminDiscountsPage() {
  const [promos, roomRows] = await Promise.all([
    listAdminPromos(),
    listAdminRooms(),
  ]);
  const rooms = roomRows.map((room) => ({
    id: room.id as string,
    name: room.name as string,
  }));
  const active = (promos as PromoRecord[]).filter(
    (item) =>
      item.isActive &&
      new Date(item.startsAt) <= new Date() &&
      (!item.endsAt || new Date(item.endsAt) > new Date()),
  ).length;
  return (
    <>
      <p className="text-xs font-medium tracking-[.16em] text-zinc-500">
        REVENUE TOOLS
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-4xl font-medium tracking-normal sm:text-5xl">
            ส่วนลดและ Promo
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-500">
            ออกแบบแคมเปญโดยไม่กระทบราคาหรือส่วนลดที่ถูกบันทึกใน Booking เดิม
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-500">
          <RiCoupon3Line /> {active} กำลังเปิดใช้ · {promos.length} ทั้งหมด
        </div>
      </div>
      <PromoManager
        initialPromos={promos as PromoRecord[]}
        rooms={rooms as PromoRoom[]}
      />
    </>
  );
}
