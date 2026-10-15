import type { Metadata } from "next";
import { ContactSection } from "@/components/contact-section";
import { SiteHeader } from "@/components/site-header";
import { BrandMark } from "@/components/brand-mark";

export const metadata: Metadata = {
  title: "ติดต่อเรา — Horizon Music",
  description: "ติดต่อ The Horizon Music ที่ Soccer Pro Ratchada 18 โทร 062-309-8937 หรือ LINE @thehorizonmusic",
};

export default function ContactPage() {
  return (
    <main className="studio-page min-h-screen">
      <div className="studio-frame">
        <SiteHeader />
        <div className="studio-section">
          <p className="studio-eyebrow">THE HORIZON MUSIC</p>
          <h1 className="mt-4 text-4xl font-medium tracking-tight sm:text-6xl">มาเจอกันที่สตูดิโอ</h1>
          <p className="mt-5 max-w-3xl text-2xl leading-relaxed text-[var(--muted)]">ให้ทุก session เริ่มต้นได้ง่ายขึ้น ติดต่อทีมงานเพื่อสอบถามรายละเอียด หรือดูเส้นทางมาหาเราได้ที่นี่</p>
        </div>
        <ContactSection />
        <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-[var(--line)] py-8 text-sm text-[var(--muted)]">
          <BrandMark />
          <span>© {new Date().getFullYear()} The Horizon Music</span>
        </footer>
      </div>
    </main>
  );
}
