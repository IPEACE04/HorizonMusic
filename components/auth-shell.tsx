import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { RiArrowLeftLine } from "react-icons/ri";

export function AuthShell({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[var(--canvas)] p-2.5 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-1.25rem)] max-w-[1500px] overflow-hidden rounded-lg border border-white bg-[var(--surface)] lg:grid-cols-[1fr_1fr] sm:min-h-[calc(100vh-3rem)]">
        <section className="flex flex-col px-5 py-6 sm:px-12 sm:py-10 lg:px-16">
          <div className="flex items-center justify-between">
            <BrandMark />
            <Link
              href="/"
              aria-label="กลับหน้าหลัก"
              className="grid size-11 place-items-center rounded-full border border-[var(--line)] transition hover:bg-[var(--panel)]"
            >
              <RiArrowLeftLine aria-hidden />
            </Link>
          </div>
          <div className="mx-auto my-auto w-full max-w-lg py-14">
            <p className="studio-eyebrow">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-medium leading-tight tracking-normal sm:text-5xl">
              {title}
            </h1>
            <div className="mt-10">{children}</div>
          </div>
        </section>
        <aside className="relative m-3 hidden overflow-hidden rounded-lg bg-[var(--ink)] lg:block">
          <Image
            src="/picture/concert2.jpg"
            alt="นักดนตรีกำลังแสดงสด"
            fill
            priority
            className="object-cover"
            sizes="54vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
          <div className="absolute inset-x-10 bottom-12 text-white">
            <p className="mb-5 text-xs tracking-[.18em] text-[var(--brand)]">
              MAKE ROOM FOR YOUR SOUND
            </p>
            <p className="max-w-md text-4xl font-medium leading-[1.3] tracking-normal">
              ทุก session ที่ดี<br />เริ่มจากพื้นที่ที่พร้อม
            </p>
            <p className="mt-6 border-t border-white/30 pt-5 text-sm text-white/80">
              ห้องซ้อม · ห้องบันทึกเสียง · เปิด 24 ชั่วโมง
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
