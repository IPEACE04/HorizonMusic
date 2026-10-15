import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiGroupLine,
  RiMusic2Line,
  RiTimeLine,
} from "react-icons/ri";

import { Reveal } from "@/components/reveal";
import { SiteHeader } from "@/components/site-header";
import { formatThaiBaht } from "@/lib/presentation";
import {
  equipmentCategories,
  equipmentCategoryLabel,
} from "@/lib/equipment-categories";
import { roomService } from "@/server/rooms";

const fallbackGallery = [
  { altText: "บรรยากาศห้องซ้อม Horizon Music", url: "/picture/guitar1.jpg" },
  { altText: "พื้นที่สำหรับการแสดงดนตรี", url: "/picture/concert.jpg" },
  { altText: "Session ภายใน Horizon Music", url: "/picture/concert2.jpg" },
];

const statusCopy = {
  AVAILABLE: { label: "พร้อมให้จอง", tone: "bg-black text-white" },
  MAINTENANCE: {
    label: "อยู่ระหว่างบำรุงรักษา",
    tone: "bg-amber-100 text-amber-950",
  },
  UNAVAILABLE: { label: "ยังไม่เปิดให้จอง", tone: "bg-zinc-200 text-zinc-700" },
} as const;

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const room = await roomService.getPublishedRoom(slug).catch(() => null);
  if (!room) notFound();

  const gallery = room.images.length ? room.images : fallbackGallery;
  const status = statusCopy[room.status];
  const equipmentGroups = equipmentCategories
    .map((category) => ({
      category,
      items: room.equipment.filter((item) => item.category === category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <main className="studio-page">
      <div className="studio-frame min-h-screen">
        <SiteHeader />

        <section className="pb-16 pt-6 sm:pb-24 sm:pt-10">
          <Link
            href="/rooms"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-black"
          >
            <RiArrowLeftLine /> ห้องทั้งหมด
          </Link>

          <div className="mt-7 flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0 flex-1 basis-64">
              <p className="text-xs font-medium tracking-[.14em] text-[var(--muted)]">
                {room.type === "REHEARSAL"
                  ? "REHEARSAL ROOM"
                  : "RECORDING STUDIO"}
              </p>
              <h1 className="mt-2 wrap-anywhere text-4xl font-medium leading-tight tracking-normal sm:text-6xl">
                {room.name}
              </h1>
            </div>
            <span
              className={`inline-flex max-w-full rounded-full px-4 py-2 text-xs font-medium ${status.tone}`}
            >
              {status.label}
            </span>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-[1.55fr_.75fr] lg:grid-rows-2">
            {gallery.slice(0, 3).map((image, index) => (
              <div
                key={`${image.url}-${index}`}
                className={`relative overflow-hidden bg-zinc-900 ${
                  index === 0
                    ? "col-span-2 aspect-[4/3] rounded-lg lg:col-span-1 lg:row-span-2 lg:aspect-auto lg:min-h-[520px]"
                    : "aspect-video rounded-lg lg:aspect-auto"
                }`}
              >
                <Image
                  src={image.url}
                  alt={image.altText}
                  fill
                  priority={index === 0}
                  unoptimized={image.url.startsWith("/storage/")}
                  className="object-cover"
                  sizes={
                    index === 0
                      ? "(max-width: 1024px) 94vw, 65vw"
                      : "(max-width: 1024px) 44vw, 28vw"
                  }
                />
              </div>
            ))}
          </div>
        </section>

        <Reveal>
          <section className="grid gap-12 border-t border-zinc-200 py-16 sm:py-24 lg:grid-cols-[1fr_380px] lg:gap-24">
            <div>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium">
                  <RiGroupLine /> สูงสุด {room.capacity} คน
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium">
                  <RiTimeLine /> เปิด 24 ชั่วโมง
                </span>
              </div>

              <h2 className="mt-10 max-w-2xl text-3xl font-medium tracking-normal sm:text-5xl">
                พื้นที่ที่พร้อมสำหรับทุกไอเดียและทุกจังหวะ
              </h2>
              <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-8 text-zinc-600 sm:text-lg">
                {room.description ||
                  "ออกแบบเพื่อให้วงของคุณโฟกัสกับเสียงดนตรีได้เต็มที่ พร้อมพื้นที่และอุปกรณ์สำหรับ session ที่จริงจัง"}
              </p>

              <div className="mt-14">
                <p className="text-xs font-medium tracking-[.16em] text-zinc-500">
                  ROOM EQUIPMENT
                </p>
                {equipmentGroups.length ? (
                  <div className="mt-5 space-y-8">
                    {equipmentGroups.map(({ category, items }) => (
                      <section key={category}>
                        <h3 className="text-lg font-medium">
                          {equipmentCategoryLabel[category]}
                        </h3>
                        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                          {items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-start justify-between gap-5 rounded-lg border border-zinc-200 bg-white p-5"
                            >
                              <span className="min-w-0">
                                <span className="flex gap-3 font-medium">
                                  <RiMusic2Line className="mt-1 shrink-0" />
                                  {item.name}
                                </span>
                                {item.description ? (
                                  <span className="mt-2 block text-sm leading-6 text-zinc-500">
                                    {item.description}
                                  </span>
                                ) : null}
                              </span>
                              <span className="shrink-0 text-sm text-zinc-500">
                                × {item.quantity}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
                    รายการอุปกรณ์กำลังอัปเดต กรุณาสอบถามทีมงานก่อนจอง
                  </p>
                )}
              </div>
            </div>

            <aside className="h-fit rounded-lg bg-black p-7 text-white shadow-[0_24px_70px_rgba(0,0,0,.16)] sm:p-9 lg:sticky lg:top-8">
              <p className="text-xs font-medium tracking-[.14em] text-white/55">
                STARTING RATE
              </p>
              <p className="mt-3 text-4xl font-medium tracking-normal">
                {formatThaiBaht(room.hourlyRate)}
                <span className="ml-1 text-base font-normal text-white/55">
                  / ชั่วโมง
                </span>
              </p>
              <div className="my-7 h-px bg-white/15" />
              <p className="text-sm leading-7 text-white/65">
                ราคาสุดท้ายจะคำนวณจากระยะเวลา บริการเสริม และส่วนลดที่ใช้
                ระบบจะตรวจเวลาว่างซ้ำก่อนยืนยันการจอง
              </p>
              <Link
                href={`/booking/new?roomId=${room.id}`}
                className="mt-8 flex min-h-14 items-center justify-between rounded-lg bg-white px-5 font-medium text-black transition hover:bg-zinc-200"
              >
                เลือกวันและเวลา <RiArrowRightLine className="text-xl" />
              </Link>
              <p className="mt-4 text-center text-xs text-white/45">
                ยกเลิกได้ก่อนเวลาเริ่มอย่างน้อย 12 ชั่วโมง
              </p>
            </aside>
          </section>
        </Reveal>
      </div>
    </main>
  );
}
