"use client";
import { bangkokDayKey, calendarDateLabel, calendarDayLabel, calendarDayNumber, weekBounds } from "@/features/admin/calendar-date";

import { ContentSelect } from "@/components/ui/content-select";

import { useEffect, useMemo, useState } from "react";
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCloseLine,
  RiEyeLine,
  RiFileList3Line,
  RiLoader4Line,
  RiSave3Line,
  RiSearchLine,
} from "react-icons/ri";

import { StatusBanner } from "@/components/ui/status-banner";
import { Pagination } from "@/components/ui/pagination";
import { formatBangkokDateTime, formatThaiBaht } from "@/lib/presentation";

type Envelope<T> = {
  data?: T;
  error?: { message?: string; fieldErrors?: Record<string, string> };
};
type ListResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};
type Booking = {
  id: string;
  bookingNumber: string;
  customerName: string;
  email: string;
  roomName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  totalAmount: number;
};
type BookingDetail = Booking & {
  addons: Array<{
    id: string;
    name: string;
    quantity: number;
    lineTotal: number;
  }>;
  history: Array<{
    fromStatus: string | null;
    toStatus: string;
    actorType: string;
    reason: string | null;
    createdAt: string;
  }>;
  payments: Array<{
    id: string;
    attemptNumber: number;
    amount: number;
    status: string;
    submittedAt: string;
  }>;
};
type CalendarEvent = {
  eventId: string;
  roomId: string;
  roomName: string;
  startsAt: string;
  endsAt: string;
  eventStatus: string;
  eventType: "BOOKING" | "BLOCK";
};
type User = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  phone: string | null;
  createdAt: string;
  bookingCount: number;
};
type Log = {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  actorType: string;
  createdAt: string;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: unknown;
};

async function getJson<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || payload.data === undefined)
    throw new Error(payload.error?.message ?? "ไม่สามารถโหลดข้อมูลได้");
  return payload.data;
}

function Shell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <p className="text-xs font-medium tracking-[.16em] text-zinc-500">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-4xl font-medium tracking-normal sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-zinc-500">{description}</p>
      {children}
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const positive = ["CONFIRMED", "COMPLETED", "PAID"].includes(status);
  const warning = ["PENDING_PAYMENT", "PENDING", "REFUND_PENDING"].includes(
    status,
  );
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${positive ? "bg-emerald-100 text-emerald-800" : warning ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"}`}
    >
      {status}
    </span>
  );
}

export function AdminBookingsView() {
  const [result, setResult] = useState<ListResult<Booking>>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<BookingDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  async function load() {
    setError("");
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (search.trim()) query.set("search", search.trim());
      if (status) query.set("status", status);
      setResult(
        await getJson<ListResult<Booking>>(`/api/v1/admin/bookings?${query}`),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "โหลดรายการจองไม่สำเร็จ",
      );
    }
  }
  // Defer the initial request to avoid a synchronous state update during effect setup.
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);
  async function transition(nextStatus: string) {
    if (!selected || busy) return;
    if (nextStatus === "CANCELLED" && reason.trim().length < 2) {
      setError("กรุณาระบุเหตุผลการยกเลิก");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await getJson(`/api/v1/admin/bookings/${selected.id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus, reason }),
      });
      setSelected(null);
      setReason("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "เปลี่ยนสถานะไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  }
  async function openBooking(booking: Booking) {
    try {
      setError("");
      setSelected(
        await getJson<BookingDetail>(`/api/v1/admin/bookings/${booking.id}`),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "โหลดรายละเอียดไม่สำเร็จ",
      );
    }
  }
  return (
    <Shell
      eyebrow="BOOKING OPERATIONS"
      title="การจองทั้งหมด"
      description="ค้นหา ตรวจสอบรายละเอียด และจัดการสถานะการจองจากรายการเดียว"
    >
      <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap gap-3">
          <label className="flex min-h-12 min-w-[240px] flex-1 items-center gap-2 rounded-full bg-zinc-100 px-4">
            <RiSearchLine className="text-zinc-400" />
            <span className="sr-only">ค้นหา Booking</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  void load();
                }
              }}
              placeholder="Booking number, ชื่อลูกค้า หรืออีเมล"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            {search ? (
              <button
                type="button"
                aria-label="ล้างคำค้นหา"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                  void load();
                }}
              >
                <RiCloseLine />
              </button>
            ) : null}
          </label>
          <ContentSelect
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="min-h-12 rounded-full border border-zinc-300 bg-white px-4 text-sm outline-none"
          >
            <option value="">ทุกสถานะ</option>
            <option value="PENDING_PAYMENT">รอชำระเงิน</option>
            <option value="CONFIRMED">ยืนยันแล้ว</option>
            <option value="COMPLETED">เสร็จสิ้น</option>
            <option value="CANCELLED">ยกเลิก</option>
            <option value="EXPIRED">หมดอายุ</option>
          </ContentSelect>
        </div>
        {error ? (
          <div className="mt-4">
            <StatusBanner>{error}</StatusBanner>
          </div>
        ) : null}
        {!result && !error ? (
          <div className="grid min-h-48 place-items-center">
            <RiLoader4Line className="animate-spin text-2xl text-zinc-400" />
          </div>
        ) : null}
        {result && !result.items.length ? (
          <div className="grid min-h-56 place-items-center text-center">
            <RiFileList3Line className="text-4xl text-zinc-300" />
            <p className="mt-3 font-medium">ยังไม่มีรายการที่ตรงกับการค้นหา</p>
          </div>
        ) : null}
        {result?.items.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="p-3">Booking</th>
                  <th className="p-3">ลูกค้า</th>
                  <th className="p-3">ห้อง/เวลา</th>
                  <th className="p-3">ยอดรวม</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.id} className="border-t border-zinc-100">
                    <td className="p-3 font-medium">{item.bookingNumber}</td>
                    <td className="p-3">
                      <b>{item.customerName}</b>
                      <small className="block text-zinc-400">
                        {item.email}
                      </small>
                    </td>
                    <td className="p-3">
                      {item.roomName}
                      <small className="block text-zinc-500">
                        {formatBangkokDateTime(item.startsAt)}
                      </small>
                    </td>
                    <td className="p-3 font-medium">
                      {formatThaiBaht(item.totalAmount)}
                    </td>
                    <td className="p-3">
                      <StatusPill status={item.status} />
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => void openBooking(item)}
                        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-300 px-4 text-xs font-medium hover:bg-zinc-100"
                      >
                        <RiEyeLine /> ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {result ? (
          <Pagination page={page} pageSize={10} total={result.total} onPageChange={setPage} />
        ) : null}
      </div>
      {selected ? (
        <dialog
          open
          className="fixed inset-0 z-20 m-auto w-[calc(100%-2rem)] max-w-xl rounded-lg border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-black/50"
        >
          <div className="p-7 sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-[.15em] text-zinc-400">
                  {selected.bookingNumber}
                </p>
                <h2 className="mt-2 text-2xl font-medium">{selected.roomName}</h2>
              </div>
              <button
                type="button"
                aria-label="ปิดรายละเอียด"
                onClick={() => setSelected(null)}
                className="grid size-10 place-items-center rounded-full border border-zinc-200"
              >
                <RiCloseLine />
              </button>
            </div>
            <div className="mt-7 grid gap-3 rounded-2xl bg-zinc-50 p-4 text-sm">
              <p>
                <b>ลูกค้า:</b> {selected.customerName} · {selected.email}
              </p>
              <p>
                <b>เวลา:</b> {formatBangkokDateTime(selected.startsAt)} –{" "}
                {formatBangkokDateTime(selected.endsAt)}
              </p>
              <p>
                <b>ยอดรวม:</b> {formatThaiBaht(selected.totalAmount)}
              </p>
              <p>
                <b>สถานะ:</b> <StatusPill status={selected.status} />
              </p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium">บริการเสริม</h3>
                <p className="mt-2 text-sm text-zinc-500">
                  {selected.addons.length
                    ? selected.addons
                        .map((addon) => `${addon.name} × ${addon.quantity}`)
                        .join(", ")
                    : "ไม่มีบริการเสริม"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium">การชำระเงิน</h3>
                <p className="mt-2 text-sm text-zinc-500">
                  {selected.payments.length
                    ? selected.payments
                        .map(
                          (payment) =>
                            `${payment.status} · ${formatThaiBaht(payment.amount)}`,
                        )
                        .join(", ")
                    : "ยังไม่มีรายการชำระเงิน"}
                </p>
              </div>
            </div>
            {["PENDING_PAYMENT", "CONFIRMED"].includes(selected.status) ? (
              <div className="mt-6">
                <label className="block text-sm font-medium">
                  เหตุผล (จำเป็นเมื่อยกเลิก)
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-2xl border border-zinc-300 p-3 outline-none"
                    placeholder="เช่น ลูกค้าขอยกเลิกผ่านโทรศัพท์"
                  />
                </label>
                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void transition("CANCELLED")}
                    className="min-h-11 rounded-full border border-red-200 px-5 text-sm font-medium text-red-700"
                  >
                    ยกเลิกการจอง
                  </button>
                  {selected.status === "CONFIRMED" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void transition("COMPLETED")}
                      className="min-h-11 rounded-full bg-black px-5 text-sm font-medium text-white"
                    >
                      ทำเครื่องหมายเสร็จสิ้น
                    </button>
                  ) : (
                    <p className="max-w-xs self-center text-right text-xs leading-5 text-zinc-500">
                      ยืนยันการจองผ่านการอนุมัติสลิปในเมนูชำระเงินเท่านั้น
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </dialog>
      ) : null}
    </Shell>
  );
}

export function AdminCalendarView({ referenceDate }: { referenceDate: string }) {
  const [offset, setOffset] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState("");
  const bounds = useMemo(() => weekBounds(offset, referenceDate), [offset, referenceDate]);
  async function load() {
    try {
      setError("");
      const data = await getJson<CalendarEvent[]>(
        `/api/v1/admin/calendar?from=${encodeURIComponent(bounds.from.toISOString())}&to=${encodeURIComponent(bounds.to.toISOString())}`,
      );
      setEvents(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "โหลดปฏิทินไม่สำเร็จ");
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);
  const days = Array.from({ length: 7 }, (_, index) => {
    return new Date(bounds.from.getTime() + index * 24 * 60 * 60 * 1000);
  });
  return (
    <Shell
      eyebrow="SCHEDULE CONTROL"
      title="ปฏิทินการใช้งาน"
      description="ดู Booking และช่วงปิดห้องในสัปดาห์เดียว แยกตามห้องและเวลา Bangkok"
    >
      <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium">
              {calendarDateLabel(bounds.from)}{" "}
              –{" "}
              {calendarDateLabel(new Date(bounds.to.getTime() - 1))}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              แสดงเฉพาะ Booking ที่ active และ Room Block
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOffset((v) => v - 1)}
              className="grid size-10 place-items-center rounded-full border border-zinc-300"
            >
              <RiArrowLeftLine />
            </button>
            <button
              type="button"
              onClick={() => setOffset(0)}
              className="rounded-full border border-zinc-300 px-4 text-xs font-medium"
            >
              สัปดาห์นี้
            </button>
            <button
              type="button"
              onClick={() => setOffset((v) => v + 1)}
              className="grid size-10 place-items-center rounded-full border border-zinc-300"
            >
              <RiArrowRightLine />
            </button>
          </div>
        </div>
        {error ? (
          <div className="mt-4">
            <StatusBanner>{error}</StatusBanner>
          </div>
        ) : null}
        <div className="mt-6 grid gap-3 md:grid-cols-7">
          {days.map((day) => {
            const key = bangkokDayKey(day);
            const dayEvents = events.filter(
              (event) => bangkokDayKey(event.startsAt) === key,
            );
            return (
              <article
                key={key}
                className="min-h-48 rounded-2xl bg-zinc-50 p-3"
              >
                <p className="text-xs font-medium text-zinc-500">
                  {calendarDayLabel(day)}
                </p>
                <p className="mt-1 text-lg font-medium">{calendarDayNumber(day)}</p>
                <div className="mt-4 space-y-2">
                  {dayEvents.length ? (
                    dayEvents.map((event) => (
                      <div
                        key={event.eventId}
                        className={`rounded-xl p-3 text-xs ${event.eventType === "BLOCK" ? "border border-amber-200 bg-amber-50" : "bg-black text-white"}`}
                      >
                        <p className="font-medium">{event.roomName}</p>
                        <p className="mt-1 opacity-70">
                          {new Intl.DateTimeFormat("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Bangkok",
                          }).format(new Date(event.startsAt))}{" "}
                          –{" "}
                          {new Intl.DateTimeFormat("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Bangkok",
                          }).format(new Date(event.endsAt))}
                        </p>
                        <p className="mt-1 opacity-70">
                          {event.eventType === "BLOCK"
                            ? event.eventStatus
                            : event.eventStatus}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="pt-4 text-xs text-zinc-400">ว่าง</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

export function AdminUsersView() {
  const [result, setResult] = useState<ListResult<User>>();
  const [selected, setSelected] = useState<
    | (User & { bookings?: Booking[]; firstName?: string; lastName?: string })
    | null
  >(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  async function load() {
    try {
      setError("");
      const query = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (search.trim()) query.set("search", search.trim());
      setResult(
        await getJson<ListResult<User>>(`/api/v1/admin/users?${query}`),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "โหลดผู้ใช้งานไม่สำเร็จ",
      );
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);
  async function open(id: string) {
    try {
      setSelected(await getJson(`/api/v1/admin/users/${id}`));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "โหลดรายละเอียดไม่สำเร็จ",
      );
    }
  }
  return (
    <Shell
      eyebrow="CUSTOMER DIRECTORY"
      title="ผู้ใช้งาน"
      description="ดูข้อมูลลูกค้าและประวัติการจองแบบ read-only สำหรับทีมงาน"
    >
      <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
        <div className="flex gap-3">
          <label className="flex min-h-12 flex-1 items-center gap-2 rounded-full bg-zinc-100 px-4">
            <RiSearchLine className="text-zinc-400" />
            <span className="sr-only">ค้นหาผู้ใช้งาน</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  void load();
                }
              }}
              placeholder="ค้นหาชื่อหรืออีเมล"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            {search ? (
              <button
                type="button"
                aria-label="ล้างคำค้นหา"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                  void load();
                }}
              >
                <RiCloseLine />
              </button>
            ) : null}
          </label>
        </div>
        {error ? (
          <div className="mt-4">
            <StatusBanner>{error}</StatusBanner>
          </div>
        ) : null}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-zinc-500">
              <tr>
                <th className="p-3">ผู้ใช้งาน</th>
                <th className="p-3">เบอร์โทร</th>
                <th className="p-3">Booking</th>
                <th className="p-3">สมัครเมื่อ</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {result?.items.map((user) => (
                <tr key={user.id} className="border-t border-zinc-100">
                  <td className="p-3">
                    <b>{user.name}</b>
                    <small className="block text-zinc-400">
                      {user.email} · {user.role ?? "user"}
                    </small>
                  </td>
                  <td className="p-3">{user.phone ?? "—"}</td>
                  <td className="p-3">{user.bookingCount}</td>
                  <td className="p-3 text-zinc-500">
                    {formatBangkokDateTime(user.createdAt)}
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => void open(user.id)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-300 px-4 text-xs font-medium hover:bg-zinc-100"
                    >
                      <RiEyeLine /> ดูข้อมูล
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result ? (
          <Pagination page={page} pageSize={10} total={result.total} onPageChange={setPage} />
        ) : (
          <div className="grid min-h-48 place-items-center">
            <RiLoader4Line className="animate-spin text-2xl text-zinc-400" />
          </div>
        )}
      </div>
      {selected ? (
        <dialog
          open
          className="fixed inset-0 z-20 m-auto w-[calc(100%-2rem)] max-w-2xl rounded-lg border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-black/50"
        >
          <div className="p-7 sm:p-9">
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-medium tracking-[.15em] text-zinc-400">
                  PROFILE
                </p>
                <h2 className="mt-2 text-2xl font-medium">{selected.name}</h2>
              </div>
              <button
                type="button"
                aria-label="ปิดข้อมูลผู้ใช้"
                onClick={() => setSelected(null)}
                className="grid size-10 place-items-center rounded-full border border-zinc-200"
              >
                <RiCloseLine />
              </button>
            </div>
            <p className="mt-5 text-sm text-zinc-500">
              {selected.email} · {selected.phone ?? "ไม่มีเบอร์โทร"}
            </p>
            <h3 className="mt-8 font-medium">ประวัติการจองล่าสุด</h3>
            <div className="mt-3 space-y-2">
              {selected.bookings?.length ? (
                selected.bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 text-sm"
                  >
                    <span>
                      <b>{booking.bookingNumber}</b>
                      <small className="ml-2 text-zinc-500">
                        {booking.roomName}
                      </small>
                    </span>
                    <StatusPill status={booking.status} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-400">ยังไม่มีประวัติการจอง</p>
              )}
            </div>
          </div>
        </dialog>
      ) : null}
    </Shell>
  );
}

export function AdminActivityLogsView() {
  const [result, setResult] = useState<ListResult<Log>>();
  const [selected, setSelected] = useState<Log | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  async function load() {
    try {
      setError("");
      const query = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (search.trim()) query.set("search", search.trim());
      setResult(
        await getJson<ListResult<Log>>(`/api/v1/admin/activity-logs?${query}`),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "โหลด Activity log ไม่สำเร็จ",
      );
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);
  return (
    <Shell
      eyebrow="AUDIT TRAIL"
      title="Activity log"
      description="ตรวจสอบว่าใครทำอะไรกับข้อมูลใด โดย log นี้แก้ไขหรือลบไม่ได้"
    >
      <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
        <label className="flex min-h-12 items-center gap-2 rounded-full bg-zinc-100 px-4">
          <RiSearchLine className="text-zinc-400" />
          <span className="sr-only">ค้นหา Activity log</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                void load();
              }
            }}
            placeholder="ค้นหา action, entity หรือผู้กระทำ"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {search ? (
            <button
              type="button"
              aria-label="ล้างคำค้นหา"
              onClick={() => {
                setSearch("");
                setPage(1);
                void load();
              }}
            >
              <RiCloseLine />
            </button>
          ) : null}
        </label>
        {error ? (
          <div className="mt-4">
            <StatusBanner>{error}</StatusBanner>
          </div>
        ) : null}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="text-xs text-zinc-500">
              <tr>
                <th className="p-3">เวลา</th>
                <th className="p-3">ผู้กระทำ</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {result?.items.map((log) => (
                <tr key={log.id} className="border-t border-zinc-100">
                  <td className="p-3 text-zinc-500">
                    {formatBangkokDateTime(log.createdAt)}
                  </td>
                  <td className="p-3">{log.actorName}</td>
                  <td className="p-3 font-medium">{log.action}</td>
                  <td className="p-3">
                    {log.entityType} · {log.entityId.slice(0, 12)}…
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => setSelected(log)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-300 px-4 text-xs font-medium hover:bg-zinc-100"
                    >
                      <RiEyeLine /> ดูข้อมูล
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result ? (
          <Pagination page={page} pageSize={10} total={result.total} onPageChange={setPage} />
        ) : (
          <div className="grid min-h-48 place-items-center">
            <RiLoader4Line className="animate-spin text-2xl text-zinc-400" />
          </div>
        )}
      </div>
      {selected ? (
        <dialog
          open
          className="fixed inset-0 z-20 m-auto w-[calc(100%-2rem)] max-w-2xl rounded-lg border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-black/50"
        >
          <div className="p-7 sm:p-9">
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-medium tracking-[.15em] text-zinc-400">
                  AUDIT EVENT
                </p>
                <h2 className="mt-2 text-2xl font-medium">{selected.action}</h2>
              </div>
              <button
                type="button"
                aria-label="ปิด Activity log"
                onClick={() => setSelected(null)}
                className="grid size-10 place-items-center rounded-full border border-zinc-200"
              >
                <RiCloseLine />
              </button>
            </div>
            <dl className="mt-7 grid gap-3 rounded-2xl bg-zinc-50 p-4 text-sm">
              <div>
                <dt className="text-zinc-500">ผู้กระทำ</dt>
                <dd className="font-medium">{selected.actorName}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Entity</dt>
                <dd>
                  {selected.entityType} · {selected.entityId}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">เวลา</dt>
                <dd>{formatBangkokDateTime(selected.createdAt)}</dd>
              </div>
            </dl>
            <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-black p-4 text-xs text-white">
              {JSON.stringify(
                {
                  beforeData: selected.beforeData,
                  afterData: selected.afterData,
                  metadata: selected.metadata,
                },
                null,
                2,
              )}
            </pre>
          </div>
        </dialog>
      ) : null}
    </Shell>
  );
}

type Policy = {
  open24Hours: boolean;
  minimumMinutes: number;
  incrementMinutes: number;
  cancellationCutoffHours: number;
  paymentDueMinutes: number;
  timezone?: string;
  currency?: string;
  version: number;
};

export function AdminSettingsView() {
  const [policy, setPolicy] = useState<Policy>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      setError("");
      setPolicy(await getJson<Policy>("/api/v1/admin/settings/booking"));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "โหลดการตั้งค่าไม่สำเร็จ",
      );
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!policy || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setPolicy(
        await getJson<Policy>("/api/v1/admin/settings/booking", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(policy),
        }),
      );
      setMessage("บันทึก Booking policy แล้ว");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell
      eyebrow="SYSTEM CONTROL"
      title="ตั้งค่า"
      description="กำหนดกติกา Booking กลางของร้าน พร้อมป้องกันการเขียนทับด้วย version"
    >
      <div className="mt-8 max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 sm:p-9">
        {error ? <StatusBanner>{error}</StatusBanner> : null}
        {message ? <StatusBanner tone="success">{message}</StatusBanner> : null}
        {!policy && !error ? (
          <div className="grid min-h-48 place-items-center">
            <RiLoader4Line className="animate-spin text-2xl text-zinc-400" />
          </div>
        ) : null}
        {policy ? (
          <form noValidate onSubmit={save} className="space-y-6">
            <label className="flex items-center justify-between gap-4 rounded-2xl bg-zinc-50 p-4 text-sm font-medium">
              เปิด 24 ชั่วโมง
              <input
                type="checkbox"
                checked={policy.open24Hours}
                onChange={(e) =>
                  setPolicy({ ...policy, open24Hours: e.target.checked })
                }
                className="size-5 accent-black"
              />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              {(
                [
                  ["minimumMinutes", "ระยะเวลาขั้นต่ำ (นาที)"],
                  ["incrementMinutes", "เพิ่มครั้งละ (นาที)"],
                  ["cancellationCutoffHours", "ยกเลิกล่วงหน้า (ชั่วโมง)"],
                  ["paymentDueMinutes", "เวลารอชำระ (นาที)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm font-medium">
                  {label}
                  <input
                    type="number"
                    min={1}
                    value={policy[key]}
                    onChange={(e) =>
                      setPolicy({ ...policy, [key]: Number(e.target.value) })
                    }
                    className="mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 outline-none"
                  />
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-zinc-100 pt-5 text-xs text-zinc-500">
              <span>
                {policy.timezone} · {policy.currency} · version {policy.version}
              </span>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white disabled:opacity-50"
              >
                <RiSave3Line /> {busy ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </Shell>
  );
}
