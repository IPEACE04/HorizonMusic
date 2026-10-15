import Image from "next/image";
import Link from "next/link";
import {
  RiArrowRightLine,
  RiCalendarLine,
  RiCalendarCheckLine,
  RiCheckboxCircleFill,
  RiEqualizerLine,
  RiHeadphoneLine,
  RiMusic2Line,
  RiTimeLine,
} from "react-icons/ri";

import { AvailabilitySearch } from "@/components/availability-search";
import { HeroCarousel } from "@/components/hero-carousel";
import { Reveal } from "@/components/reveal";
import { RoomCard } from "@/components/room-card";
import { SiteHeader } from "@/components/site-header";
import { BrandMark } from "@/components/brand-mark";
import { ContactSection } from "@/components/contact-section";
import { roomService } from "@/server/rooms";

const benefits = [
  {
    icon: RiHeadphoneLine,
    title: "Recording ready",
    copy: "เลือกบริการบันทึกเสียงและ Sound Engineer ให้เข้ากับ session",
  },
  {
    icon: RiTimeLine,
    title: "Flexible time",
    copy: "จองเริ่มต้น 1 ชั่วโมง และเพิ่มเวลาได้ครั้งละ 30 นาที",
  },
  {
    icon: RiCheckboxCircleFill,
    title: "Clear pricing",
    copy: "เห็นเวลาว่างและราคาสุทธิก่อนยืนยันรายการทุกครั้ง",
  },
] as const;

const steps = [
  ["01", "เลือกห้อง", "ระบุวันที่ เวลา และระยะเวลาที่ต้องการ", RiCalendarLine],
  ["02", "จัด session", "เพิ่มบริการเสริมและใช้ Promo Code", RiEqualizerLine],
  ["03", "ยืนยันการจอง", "ส่งสลิปและติดตามผลตรวจได้ในระบบ", RiCalendarCheckLine],
] as const;

export default async function Home() {
  const rooms = await roomService
    .listPublishedRooms({})
    .catch(() => []);

  return (
    <main className="studio-page min-h-screen">
      <div className="studio-frame">
        <SiteHeader />
        <div>
          <HeroCarousel />
        </div>

        <div className="mx-auto mt-8 max-w-5xl sm:mt-12">
          <AvailabilitySearch />
        </div>

        <Reveal className="studio-section">
          <section id="rooms">
            <div className="mb-12 flex flex-col items-center gap-5 text-center sm:mb-16">
              <div>
                <h2 className="studio-section-title">
                  STUDIO SERVICE
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[var(--muted)]">
                  พื้นที่สำหรับซ้อม อัดเสียง และทำสิ่งที่คุณรัก
                  <br className="hidden sm:block" /> เลือกห้องที่เข้ากับ session
                  ของคุณ
                </p>
              </div>
              <Link
                href="/rooms"
                className="studio-button studio-button--secondary shrink-0"
              >
                ดูทั้งหมด <RiArrowRightLine />
              </Link>
            </div>
            {rooms.length ? (
              <div className="studio-room-collection">
                {rooms.map((room, index) => (
                  <RoomCard room={room} index={index} key={room.id} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-white/45 p-12 text-center sm:p-16">
                <RiMusic2Line className="mx-auto text-3xl" />
                <h3 className="mt-5 text-xl font-medium">
                  กำลังเตรียมห้องให้คุณ
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                  ห้องและรายละเอียดจะปรากฏที่นี่เมื่อพร้อมเปิดให้จอง
                </p>
              </div>
            )}
          </section>
        </Reveal>

        <Reveal>
          <section
            id="services"
            className="studio-full-bleed grid overflow-hidden bg-[var(--ink)] text-white lg:grid-cols-[1.08fr_.92fr]"
          >
            <div className="p-7 sm:p-12 lg:p-16 xl:p-20">
              <p className="text-sm font-normal tracking-[.3em] text-[var(--brand)]">
                BUILT FOR MUSIC
              </p>
              <h2 className="mt-6 max-w-xl text-2xl font-normal leading-[1.6] sm:text-3xl">
                มากกว่าพื้นที่
                <br />
                คือจุดเริ่มต้นของเสียงใหม่
              </h2>
              <div className="mt-12 grid gap-7 sm:grid-cols-3 lg:mt-16">
                {benefits.map(({ icon: Icon, title, copy }) => (
                  <div key={title} className="border-t border-white/15 pt-5">
                    <Icon className="text-4xl text-[var(--brand)]" aria-hidden />
                    <h3 className="mt-5 font-medium">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/75">
                      {copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative min-h-[26rem] lg:min-h-full">
              <Image
                src="/picture/concert.jpg"
                alt="บรรยากาศการแสดง"
                fill
                className="object-cover grayscale"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          </section>
        </Reveal>

        <Reveal className="studio-section">
          <section id="how-it-works" aria-labelledby="how-it-works-heading" className="mx-auto max-w-6xl">
            <p className="studio-section-title">
              HOW IT WORKS
            </p>
            <h2 id="how-it-works-heading" className="mt-4 text-center text-xl font-normal leading-relaxed text-[var(--muted)] sm:text-2xl">
              จองง่าย ในสามจังหวะ
            </h2>
            <div className="relative mt-10 sm:mt-14">
              <div aria-hidden className="absolute inset-x-12 top-12 hidden h-px bg-[var(--brand)] sm:block" />
              <div className="relative grid gap-5 sm:grid-cols-3 sm:gap-7">
                {steps.map(([number, title, copy, Icon]) => (
                  <article
                    key={number}
                    className="group flex min-w-0 flex-col items-center text-center"
                  >
                    <div className="relative grid size-24 place-items-center border border-[var(--brand)] bg-[var(--ink)] text-[var(--brand)]">
                      <Icon aria-hidden className="size-11" />
                      <span className="absolute -bottom-3 bg-[var(--brand)] px-3 py-0.5 text-xs font-medium tracking-widest text-black">{number}</span>
                    </div>
                    <div className="mt-7 flex w-full flex-1 flex-col border border-[var(--line)] bg-white px-6 py-7 sm:px-5 lg:px-8">
                      <p className="text-[10px] font-medium tracking-[.2em] text-[var(--focus)]">STEP {number}</p>
                      <h3 className="mt-3 text-xl font-medium sm:text-2xl">{title}</h3>
                      <p className="mx-auto mt-3 max-w-64 text-base leading-7 text-[var(--muted)]">
                        {copy}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="mt-9 flex justify-center">
              <Link href="/booking/new" className="studio-button studio-button--primary min-w-52">
                เริ่มจองห้อง <RiArrowRightLine aria-hidden />
              </Link>
            </div>
          </section>
        </Reveal>

        <ContactSection dark />
        <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-[var(--line)] py-8 text-sm text-[var(--muted)] sm:py-10">
          <BrandMark />
          <Link href="/contact" className="rounded-lg underline-offset-4 hover:underline">Soccer Pro Ratchada 18 · 062-309-8937</Link>
          <span>© {new Date().getFullYear()} The Horizon Music</span>
        </footer>
      </div>
    </main>
  );
}
