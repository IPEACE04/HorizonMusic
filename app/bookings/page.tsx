import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RiArrowRightLine, RiCalendarCheckLine } from "react-icons/ri";
import { CustomerShell } from "@/components/customer-shell";
import { Pagination } from "@/components/ui/pagination";
import { formatBangkokDateTime, formatThaiBaht } from "@/lib/presentation";
import { getAppSession } from "@/server/auth/session";
import { listUserBookingsPage } from "@/server/bookings/service";
type Booking = {
  id: string;
  bookingNumber: string;
  roomName: string;
  startsAt: string;
  status: string;
  totalAmount: number;
};

function statusBadge(status: string) {
  const badges: Record<string, { className: string; label: string }> = {
    CANCELLED: { className: "bg-zinc-100 text-zinc-600", label: "ยกเลิกแล้ว" },
    COMPLETED: {
      className: "bg-emerald-100 text-emerald-800",
      label: "เสร็จสิ้น",
    },
    CONFIRMED: {
      className: "bg-emerald-100 text-emerald-800",
      label: "ยืนยันแล้ว",
    },
    EXPIRED: { className: "bg-zinc-100 text-zinc-600", label: "หมดอายุ" },
    PENDING_PAYMENT: {
      className: "bg-amber-100 text-amber-800",
      label: "รอชำระเงิน",
    },
  };
  return (
    badges[status] ?? { className: "bg-zinc-100 text-zinc-600", label: status }
  );
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getAppSession(await headers());
  if (!session) redirect("/login?callbackUrl=/bookings");
  const requestedPage = Number((await searchParams).page ?? "1");
  const result = await listUserBookingsPage(
    session.user.id,
    Number.isInteger(requestedPage) ? requestedPage : 1,
    10,
  );
  const bookings = result.items as Booking[];
  return (
    <CustomerShell email={session.user.email} name={session.user.name}>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-medium tracking-[.16em] text-zinc-500">
            MY SESSIONS
          </p>
          <h1 className="mt-3 text-4xl font-medium tracking-normal sm:text-5xl">
            การจองของฉัน
          </h1>
        </div>
        <Link
          href="/booking/new"
          className="rounded-full bg-black px-5 py-3 font-medium text-white"
        >
          จองห้องใหม่
        </Link>
      </div>
      {bookings.length ? (
        <div className="mt-10 space-y-3">
          {bookings.map((booking) => {
            const badge = statusBadge(booking.status);
            return (
              <Link
                key={booking.id}
                href={`/bookings/${booking.id}`}
                className="group grid gap-4 rounded-none border border-zinc-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{booking.roomName}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {booking.bookingNumber} ·{" "}
                    {formatBangkokDateTime(booking.startsAt)}
                  </p>
                </div>
                <p className="font-medium sm:text-right">
                  {formatThaiBaht(booking.totalAmount)}
                </p>
                <RiArrowRightLine className="text-xl" />
              </Link>
            );
          })}
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            pageHrefPrefix="/bookings?page="
          />
        </div>
      ) : (
        <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-12 text-center">
          <RiCalendarCheckLine className="mx-auto text-4xl" />
          <h2 className="mt-5 text-xl font-medium">ยังไม่มีรายการจอง</h2>
          <p className="mt-2 text-zinc-500">
            เลือกห้องและช่วงเวลาสำหรับ session แรกของคุณ
          </p>
        </div>
      )}
    </CustomerShell>
  );
}
