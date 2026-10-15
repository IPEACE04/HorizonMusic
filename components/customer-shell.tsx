import Link from "next/link";
import type { ReactNode } from "react";
import {
  RiCalendarCheckLine,
  RiChat3Line,
  RiHome5Line,
  RiNotification3Line,
  RiUser3Line,
} from "react-icons/ri";

import { LogoutButton } from "@/features/auth/logout-button";
import { NavCountBadge } from "@/components/nav-count-badge";
import { BrandMark } from "@/components/brand-mark";
import { NavigationLink } from "@/components/ui/navigation-link";

const navigation = [
  { href: "/profile", icon: RiUser3Line, label: "โปรไฟล์" },
  { href: "/bookings", icon: RiCalendarCheckLine, label: "การจอง" },
  { badge: "chat", href: "/chat", icon: RiChat3Line, label: "แชต" },
  {
    badge: "notifications",
    href: "/notifications",
    icon: RiNotification3Line,
    label: "แจ้งเตือน",
  },
];

export function CustomerShell({
  children,
  email,
  name,
}: {
  children: ReactNode;
  email: string;
  name: string;
}) {
  return (
    <main className="studio-workspace min-h-svh w-full bg-[var(--canvas)]">
      <a href="#customer-content" className="studio-skip-link">
        ข้ามไปเนื้อหา
      </a>
      <div className="grid min-h-svh w-full bg-[var(--panel)] lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/15 bg-[var(--ink)] px-5 py-1 text-white lg:flex lg:flex-col">
          <BrandMark inverted />
          <p className="studio-eyebrow mt-8 px-4 text-[var(--brand)]">YOUR MUSIC SPACE</p>
          <nav aria-label="เมนูลูกค้า" className="mt-4 space-y-1">
            {navigation.map((item) => (
              <NavigationLink
                key={item.href}
                href={item.href}
                className="studio-nav-link--dark group"
              >
                <item.icon aria-hidden className="text-lg" />
                {item.label}
                {item.badge ? (
                  <NavCountBadge
                    endpoint={
                      item.badge === "chat"
                        ? "/api/v1/chat"
                        : "/api/v1/notifications"
                    }
                    mode={item.badge as "chat" | "notifications"}
                  />
                ) : null}
              </NavigationLink>
            ))}
          </nav>
          <div className="mt-auto border border-white/15 bg-white p-4 text-[var(--ink)]">
            <p className="break-words font-medium">{name}</p>
            <p className="mt-1 break-words text-xs text-[var(--muted)]">{email}</p>
            <div className="mt-3 border-t border-[var(--line)] pt-2">
              <LogoutButton />
            </div>
          </div>
        </aside>
        <section className="min-w-0 bg-white">
          <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-white/15 bg-[var(--ink)] px-5 py-1 text-[var(--brand)] sm:px-8 lg:px-10">
            <div className="lg:hidden">
              <BrandMark inverted />
            </div>
            <span className="studio-eyebrow hidden text-[var(--brand)] lg:block">พื้นที่ของคุณ / HORIZON MUSIC</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="lg:hidden">
                <LogoutButton compact />
              </div>
              <Link
                href="/rooms"
                className="studio-button studio-button--secondary"
              >
                <RiHome5Line aria-hidden /> ดูห้อง
              </Link>
            </div>
          </header>
          <div
            id="customer-content"
            tabIndex={-1}
            className="studio-content pb-32 lg:pb-10"
          >
            {children}
          </div>
        </section>
        <nav
          aria-label="เมนูลูกค้าบนมือถือ"
          className="studio-mobile-nav fixed inset-x-3 z-40 mx-auto flex max-w-md items-center gap-1 rounded-lg border border-white/20 bg-[var(--ink)] p-1.5 text-white shadow-xl lg:hidden"
        >
          {navigation.map((item) => (
            <NavigationLink
              key={item.href}
              href={item.href}
              className="group"
            >
              <item.icon aria-hidden className="text-xl" />
              {item.label}
              {item.badge ? (
                <span className="absolute right-1 top-1">
                  <NavCountBadge
                    endpoint={
                      item.badge === "chat"
                        ? "/api/v1/chat"
                        : "/api/v1/notifications"
                    }
                    mode={item.badge as "chat" | "notifications"}
                  />
                </span>
              ) : null}
            </NavigationLink>
          ))}
        </nav>
      </div>
    </main>
  );
}
