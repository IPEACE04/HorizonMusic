"use client";

import { ContentSelect } from "@/components/ui/content-select";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  RiArrowRightLine,
  RiCalendarLine,
  RiCoupon3Line,
  RiPriceTag3Line,
} from "react-icons/ri";

import { StatusBanner } from "@/components/ui/status-banner";
import { formatThaiBaht, localBangkokDateTimeToIso } from "@/lib/presentation";

type Room = { hourlyRate: number; id: string; name: string };
type Addon = {
  description: string;
  id: string;
  name: string;
  pricingType: string;
  unitPrice: number;
};
type Quote = {
  addonSubtotal: number;
  discountAmount: number;
  endsAt: string;
  roomName: string;
  roomSubtotal: number;
  subtotal: number;
  totalAmount: number;
};

export function BookingWizard({
  addons,
  initialRoomId = "",
  rooms,
}: {
  addons: Addon[];
  initialRoomId?: string;
  rooms: Room[];
}) {
  const router = useRouter();
  const [roomId, setRoomId] = useState(initialRoomId || rooms[0]?.id || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState(120);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [promoCode, setPromoCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"quote" | "booking" | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const selectedAddons = useMemo(
    () =>
      addons
        .filter((addon) => selected[addon.id])
        .map((addon) => ({ id: addon.id, quantity: 1 })),
    [addons, selected],
  );
  const invalidate = () => {
    setQuote(null);
    setError("");
    idempotencyKey.current = null;
  };
  function payload(idempotencyKey?: string) {
    return {
      addons: selectedAddons,
      durationMinutes: duration,
      idempotencyKey,
      promoCode,
      roomId,
      startsAt: localBangkokDateTimeToIso(date, time),
    };
  }
  async function requestQuote(event: FormEvent) {
    event.preventDefault();
    if (!date || !roomId) {
      setError("กรุณาเลือกห้องและวันที่");
      return;
    }
    setPending("quote");
    setError("");
    try {
      const response = await fetch("/api/v1/booking-quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "ไม่สามารถคำนวณราคาได้");
      setQuote(result.data);
    } catch (requestError) {
      setQuote(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "ไม่สามารถคำนวณราคาได้",
      );
    } finally {
      setPending(null);
    }
  }
  async function create() {
    setPending("booking");
    setError("");
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload(idempotencyKey.current)),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "ไม่สามารถสร้างรายการจองได้");
      router.push(`/bookings/${result.data.bookingId}`);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "ไม่สามารถสร้างรายการจองได้",
      );
      setPending(null);
    }
  }
  const control =
    "mt-2 block min-h-12 w-full! min-w-0 rounded-none border border-zinc-300 bg-white px-4 text-base font-normal outline-none";
  return (
    <form
      noValidate
      onSubmit={requestQuote}
      className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] 2xl:gap-8"
    >
      <section className="min-w-0 space-y-8 border border-zinc-200 bg-white p-5 sm:p-7">
        <div>
          <p className="text-xs font-medium tracking-[.16em] text-[var(--focus)]">
            01 · SESSION
          </p>
          <div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col text-sm font-medium">
              ห้อง
              <ContentSelect
                value={roomId}
                onChange={(event) => {
                  setRoomId(event.target.value);
                  invalidate();
                }}
                className={control}
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} — {formatThaiBaht(room.hourlyRate)}/ชม.
                  </option>
                ))}
              </ContentSelect>
            </label>
            <label className="flex min-w-0 flex-col text-sm font-medium">
              วันที่
              <input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  invalidate();
                }}
                className={control}
              />
            </label>
            <label className="flex min-w-0 flex-col text-sm font-medium">
              เวลาเริ่ม
              <input
                type="time"
                step="1800"
                value={time}
                onChange={(event) => {
                  setTime(event.target.value);
                  invalidate();
                }}
                className={control}
              />
            </label>
            <label className="flex min-w-0 flex-col text-sm font-medium">
              ระยะเวลา
              <ContentSelect
                value={duration}
                onChange={(event) => {
                  setDuration(Number(event.target.value));
                  invalidate();
                }}
                className={control}
              >
                {[60, 90, 120, 150, 180, 240, 300, 360].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes / 60} ชั่วโมง
                  </option>
                ))}
              </ContentSelect>
            </label>
          </div>
        </div>
        <div className="border-t border-zinc-200 pt-7">
          <p className="text-xs font-medium tracking-[.16em] text-[var(--focus)]">
            02 · ADD-ONS
          </p>
          {addons.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {addons.map((addon) => (
                <label
                  key={addon.id}
                  className={`flex min-w-0 cursor-pointer items-start gap-3 border p-4 transition ${selected[addon.id] ? "border-[var(--focus)] bg-[var(--brand-soft)]" : "border-zinc-200 hover:border-zinc-400"}`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-[var(--focus)]"
                    checked={Boolean(selected[addon.id])}
                    onChange={(event) => {
                      setSelected((current) => ({
                        ...current,
                        [addon.id]: event.target.checked,
                      }));
                      invalidate();
                    }}
                  />
                  <span className="min-w-0 break-words">
                    <span className="block font-medium">{addon.name}</span>
                    <small className="text-zinc-500">
                      {formatThaiBaht(addon.unitPrice)} ·{" "}
                      {addon.pricingType === "PER_HOUR"
                        ? "ต่อชั่วโมง"
                        : addon.pricingType === "PER_UNIT"
                          ? "ต่อชิ้น"
                          : "ต่อครั้ง"}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">ยังไม่มีบริการเสริม</p>
          )}
        </div>
        <label className="block border-t border-zinc-200 pt-7 text-sm font-medium">
          <span className="flex items-center gap-2">
            <RiCoupon3Line /> Promo code
          </span>
          <input
            value={promoCode}
            onChange={(event) => {
              setPromoCode(event.target.value.toUpperCase());
              invalidate();
            }}
            placeholder="เช่น HORIZONWELCOME"
            className={control}
          />
        </label>
      </section>
      <aside className="min-w-0 border-t-2 border-[var(--brand)] bg-black p-5 text-white sm:p-7 xl:sticky xl:top-6">
        <div className="flex items-center gap-2 text-xs font-medium tracking-[.16em] text-[var(--brand)]">
          <RiPriceTag3Line /> PRICE REVIEW
        </div>
        <h2 className="mt-3 text-xl font-normal">สรุปการจอง</h2>
        {error ? (
          <div className="mt-5">
            <StatusBanner>{error}</StatusBanner>
          </div>
        ) : null}
        {quote ? (
          <div className="mt-7 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-white/75">ค่าห้อง</span>
              <b>{formatThaiBaht(quote.roomSubtotal)}</b>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/75">บริการเสริม</span>
              <b>{formatThaiBaht(quote.addonSubtotal)}</b>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/75">ส่วนลด</span>
              <b>-{formatThaiBaht(quote.discountAmount)}</b>
            </div>
            <div className="my-5 h-px bg-white/15" />
            <div className="flex flex-wrap items-end justify-between gap-3">
              <span>ยอดสุทธิ</span>
              <span className="text-3xl font-medium text-[var(--brand)]">{formatThaiBaht(quote.totalAmount)}</span>
            </div>
            <button
              type="button"
              onClick={create}
              disabled={Boolean(pending)}
              className="studio-button studio-button--primary mt-6 min-h-14 w-full justify-between"
            >
              {pending === "booking" ? "กำลังยืนยัน…" : "ยืนยันการจอง"}
              <RiArrowRightLine />
            </button>
          </div>
        ) : (
          <>
            <RiCalendarLine className="mt-7 text-3xl text-[var(--brand)]" aria-hidden />
            <p className="mt-4 text-sm leading-7 text-white/75">
              เลือกรายละเอียดแล้วกดคำนวณ
              ระบบจะตรวจเวลาว่างและเงื่อนไขส่วนลดจากข้อมูลล่าสุด
            </p>
            <button
              type="submit"
              disabled={Boolean(pending)}
              className="studio-button studio-button--primary mt-6 min-h-14 w-full"
            >
              {pending === "quote" ? "กำลังตรวจสอบ…" : "ตรวจเวลาและคำนวณราคา"}
            </button>
          </>
        )}
      </aside>
    </form>
  );
}
