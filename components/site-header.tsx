import Link from "next/link";
import { headers } from "next/headers";
import { BrandMark } from "@/components/brand-mark";
import { NavigationLink } from "@/components/ui/navigation-link";
import { NotificationPreview } from "@/components/notification-preview";
import { UserAvatar } from "@/components/user-avatar";
import { getAppSession } from "@/server/auth/session";

export async function SiteHeader() {
  const session = await getAppSession(await headers()).catch(() => null);
  return (
    <header className="studio-site-header flex flex-wrap items-center justify-between gap-x-5 gap-y-4">
      <BrandMark inverted prominent />
      <div className="contents lg:ml-auto lg:flex lg:items-center lg:gap-4">
        <nav
          aria-label="เมนูหลัก"
          className="order-3 flex w-full flex-wrap items-center justify-center gap-2 border-t border-white/15 pt-3 lg:order-none lg:w-auto lg:gap-4 lg:border-0 lg:pt-0"
        >
          <NavigationLink href="/" exact>Home</NavigationLink>
          <Link href="/booking/new" className="studio-nav-link">
            Book Now
          </Link>
          <Link href="/contact" className="studio-nav-link">
            Contact Us
          </Link>
          <Link href="/bookings" className="studio-nav-link">
            My Order
          </Link>
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {session ? <NotificationPreview /> : null}
          <Link
            href={session ? "/profile" : "/login"}
            aria-label={session ? "โปรไฟล์ของฉัน" : "เข้าสู่ระบบ"}
            className={session ? "inline-flex size-11 items-center justify-center rounded-full" : "studio-nav-link"}
          >
            {session ? <UserAvatar image={session.user.image} /> : "Login"}
          </Link>
        </div>
      </div>
    </header>
  );
}
