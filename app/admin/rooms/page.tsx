import type { Metadata } from "next";
import { RiGroupLine } from "react-icons/ri";
import {
  CatalogManager,
  type AdminAddon,
  type AdminEquipment,
  type AdminRoom,
} from "@/features/admin/catalog-manager";
import {
  listAdminAddons,
  listAdminEquipment,
  listAdminRooms,
} from "@/server/admin/catalog/service";

export const metadata: Metadata = { title: "จัดการ Catalog — Horizon Music" };
export default async function AdminRoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const requested = (await searchParams).view;
  const mode =
    requested === "equipment" || requested === "addons" ? requested : "rooms";
  const [rooms, equipment, addons] = await Promise.all([
    listAdminRooms(),
    listAdminEquipment(),
    listAdminAddons(),
  ]);
  return (
    <>
      <p className="text-xs font-medium tracking-[.16em] text-zinc-500">
        STUDIO CATALOG
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-4xl font-medium tracking-normal sm:text-5xl">
            ห้องและบริการ
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-500">
            จัดการข้อมูลที่ลูกค้าใช้เลือก session โดยการแก้ไขราคาจะมีผลกับ
            Booking ใหม่เท่านั้น
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-500">
          <RiGroupLine /> {rooms.length} ห้อง · {equipment.length} อุปกรณ์ ·{" "}
          {addons.length} บริการ
        </div>
      </div>
      <CatalogManager
        mode={mode}
        rooms={rooms as AdminRoom[]}
        equipment={equipment as AdminEquipment[]}
        addons={addons as AdminAddon[]}
      />
    </>
  );
}
