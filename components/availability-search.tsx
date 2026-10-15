"use client";

import { ContentSelect } from "@/components/ui/content-select";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { RiArrowRightLine, RiCalendarLine, RiTimeLine } from "react-icons/ri";

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="studio-search-field min-w-0 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3.5 transition sm:px-5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

export function AvailabilitySearch() {
  const router = useRouter();
  const dateRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState("120");
  const [type, setType] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date) {
      setError("เลือกวันที่ที่ต้องการค้นหาห้องก่อนครับ");
      dateRef.current?.focus();
      return;
    }
    setError("");
    const query = new URLSearchParams({ date, time, duration });
    if (type) query.set("type", type);
    router.push(`/rooms?${query}`);
  }

  const controlClass =
    "mt-1.5 w-full bg-transparent text-sm font-medium outline-none";
  return (
    <form
      noValidate
      onSubmit={submit}
      aria-label="ค้นหาห้อง"
      className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-4 shadow-[0_12px_32px_rgba(24,27,26,.04)] sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-medium">หาเวลาสำหรับเสียงของคุณ</h2>
        <p className="text-xs text-[var(--muted)]">
          เลือกห้อง วันที่ และเวลาที่ต้องการ
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_.8fr_.8fr_auto]">
        <Field label="ประเภทห้อง">
          <ContentSelect
            value={type}
            onChange={(event) => setType(event.target.value)}
            className={controlClass}
          >
            <option value="">ทุกประเภท</option>
            <option value="REHEARSAL">ห้องซ้อม</option>
            <option value="RECORDING">ห้องบันทึกเสียง</option>
          </ContentSelect>
        </Field>
        <Field label="วันที่" icon={<RiCalendarLine />}>
          <input
            ref={dateRef}
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setError("");
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            type="date"
            required
            aria-label="วันที่จอง"
            className={controlClass}
          />
        </Field>
        <Field label="เวลาเริ่ม" icon={<RiTimeLine />}>
          <input
            value={time}
            onChange={(event) => setTime(event.target.value)}
            type="time"
            step="1800"
            aria-label="เวลาเริ่ม"
            className={controlClass}
          />
        </Field>
        <Field label="ระยะเวลา">
          <ContentSelect
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className={controlClass}
          >
            <option value="60">1 ชั่วโมง</option>
            <option value="120">2 ชั่วโมง</option>
            <option value="180">3 ชั่วโมง</option>
            <option value="240">4 ชั่วโมง</option>
          </ContentSelect>
        </Field>
        <button
          type="submit"
          className="studio-button studio-button--primary min-h-16 gap-5 sm:col-span-2 xl:col-span-1"
        >
          ค้นหาห้อง <RiArrowRightLine className="text-lg" />
        </button>
      </div>
      <p
        id={errorId}
        role="status"
        className="mt-2 min-h-5 text-xs text-red-700"
      >
        {error}
      </p>
    </form>
  );
}
