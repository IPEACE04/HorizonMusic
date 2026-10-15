"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  RiArrowRightUpLine,
} from "react-icons/ri";
import {
  nextHeroIndex,
} from "@/components/hero-carousel-state";

const slides = [
  {
    src: "/picture/guitar1.jpg",
    alt: "นักกีตาร์กำลังแสดงบนเวที",
    label: "LIVE ROOM",
  },
  { src: "/picture/concert.jpg", alt: "ผู้ชมในคอนเสิร์ต", label: "REHEARSAL" },
  {
    src: "/picture/concert2.jpg",
    alt: "บรรยากาศการแสดงดนตรี",
    label: "RECORDING",
  },
] as const;

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const rotating = !reducedMotion;

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(
      () => setActiveIndex((current) => nextHeroIndex(current, slides.length)),
      3000,
    );
    return () => window.clearTimeout(timer);
  }, [rotating, activeIndex]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="บรรยากาศ Horizon Music"
      className="studio-full-bleed relative isolate overflow-hidden bg-[var(--ink)] text-white"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={slides[activeIndex].src}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.8 }}
          className="absolute inset-0 -z-20"
        >
          <Image
            src={slides[activeIndex].src}
            alt={slides[activeIndex].alt}
            fill
            priority={activeIndex === 0}
            className="object-cover object-center grayscale"
            sizes="100vw"
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 -z-10 bg-black/50" />
      <div className="flex min-h-svh flex-col px-[var(--page-gutter)] py-6 sm:py-10">
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center sm:py-24">
          <p className="mb-7 text-lg font-normal tracking-[.12em] text-white sm:text-[22px] sm:tracking-[.3em]">
            มิติใหม่แห่งการซ้อมดนตรี
          </p>
          <h1 className="max-w-6xl text-[clamp(2.5rem,6vw,5.5rem)] font-light leading-[1.3] tracking-[.08em] sm:tracking-[.16em]">
            Music Community
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/85 sm:text-xl">
            ห้องซ้อมและห้องบันทึกเสียงที่พร้อมให้ทุกไอเดีย
            <br className="hidden sm:block" /> กลายเป็นผลงานได้ทุกเวลา
          </p>
          <Link
            href="/booking/new"
            className="studio-button studio-button--outline-light mt-10 min-w-52 gap-5"
          >
            Book Now{" "}
            <RiArrowRightUpLine className="text-xl" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
