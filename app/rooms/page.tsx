import Link from "next/link";
import { RiArrowLeftLine, RiMusic2Line } from "react-icons/ri";

import { AvailabilitySearch } from "@/components/availability-search";
import { RoomCard } from "@/components/room-card";
import { SiteHeader } from "@/components/site-header";
import { parseRoomListQuery } from "@/server/rooms/contracts";
import { roomService } from "@/server/rooms";
import type { PublicRoomDto } from "@/server/rooms/service";

type RoomsPageProperties = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RoomsPage({ searchParams }: RoomsPageProperties) {
  const parameters = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (typeof value === "string") query.set(key, value);
  }

  let rooms: PublicRoomDto[] = [];
  try {
    rooms = await roomService.listPublishedRooms(parseRoomListQuery(query));
  } catch {
    rooms = [];
  }

  return (
    <main className="studio-page">
      <div className="studio-frame min-h-screen">
        <SiteHeader />
        <section className="py-10 sm:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-black"
          >
            <RiArrowLeftLine />
            กลับหน้าหลัก
          </Link>
          <h1 className="mt-6 text-4xl font-medium tracking-normal sm:text-6xl">
            พื้นที่สำหรับ session ของคุณ
          </h1>
          <p className="mt-3 text-zinc-500">
            เลือกเวลาให้ตรง แล้วเริ่มต้น session ต่อไปของคุณ
          </p>
          <div className="mt-10">
            <AvailabilitySearch />
          </div>
        </section>
        <section className="pb-20">
          {rooms.length ? (
            <div className="studio-room-collection">
              {rooms.map((room, index) => (
                <RoomCard key={room.id} room={room} index={index} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center">
              <RiMusic2Line className="mx-auto text-3xl" />
              <h2 className="mt-4 text-xl font-medium">
                ไม่พบห้องที่ตรงเงื่อนไข
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                ลองเปลี่ยนประเภทห้องหรือวันเวลาอีกครั้ง
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
