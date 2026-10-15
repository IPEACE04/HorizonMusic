"use client";

import { ContentSelect } from "@/components/ui/content-select";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  RiAddLine,
  RiArchiveLine,
  RiCloseLine,
  RiCoupon3Line,
  RiEditLine,
  RiSearchLine,
  RiTimeLine,
} from "react-icons/ri";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { Pagination } from "@/components/ui/pagination";
import { StatusBanner } from "@/components/ui/status-banner";
import {
  PromoValidationError,
  parsePromoInput,
} from "@/features/admin/promo-contracts";
import {
  formatBangkokDateTime,
  formatThaiBaht,
  localBangkokDateTimeToIso,
} from "@/lib/presentation";

export type PromoRecord = {
  id: string;
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxDiscountAmount: number | null;
  minBookingAmount: number;
  startsAt: string;
  endsAt: string | null;
  totalUsageLimit: number | null;
  perUserLimit: number | null;
  appliesToAllRooms: boolean;
  isActive: boolean;
  roomIds: string[];
  usageCount: number;
};
export type PromoRoom = { id: string; name: string };
type PromoStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "PAUSED" | "QUOTA_FULL";
type ApiEnvelope<T> = {
  data?: T;
  error?: { message?: string; fieldErrors?: Record<string, string> };
};
const empty = {
  appliesToAllRooms: true,
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: 10,
  endsAt: "",
  isActive: true,
  maxDiscountAmount: "",
  minBookingAmount: 0,
  perUserLimit: "",
  roomIds: [],
  startsAt: "",
  totalUsageLimit: "",
};

function promoStatus(item: PromoRecord): PromoStatus {
  const now = Date.now();
  if (!item.isActive) return "PAUSED";
  if (new Date(item.startsAt).getTime() > now) return "SCHEDULED";
  if (item.endsAt && new Date(item.endsAt).getTime() <= now) return "EXPIRED";
  if (item.totalUsageLimit !== null && item.usageCount >= item.totalUsageLimit)
    return "QUOTA_FULL";
  return "ACTIVE";
}
function statusLabel(value: PromoStatus) {
  return {
    ACTIVE: "ใช้งานอยู่",
    SCHEDULED: "รอเริ่ม",
    EXPIRED: "หมดอายุ",
    PAUSED: "ปิดใช้งาน",
    QUOTA_FULL: "ครบโควตา",
  }[value];
}
function toLocalInput(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Bangkok",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
function toIso(value: string) {
  const [date, time] = value.split("T");
  return localBangkokDateTimeToIso(date ?? "", time ?? "");
}

export function PromoManager({
  initialPromos,
  rooms,
}: {
  initialPromos: PromoRecord[];
  rooms: PromoRoom[];
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | PromoStatus>("ALL");
  const [status, setStatus] = useState<{
    tone: "error" | "success";
    message: string;
  } | null>(null);
  const [archive, setArchive] = useState<PromoRecord | null>(null);
  const [pending, setPending] = useState(false);
  const [page, setPage] = useState(1);
  const filtered = initialPromos.filter(
    (item) =>
      (filter === "ALL" || promoStatus(item) === filter) &&
      `${item.code} ${item.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const paged = filtered.slice((page - 1) * 10, page * 10);
  async function archivePromo() {
    if (!archive) return;
    setPending(true);
    const response = await fetch(`/api/v1/admin/discounts/${archive.id}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as ApiEnvelope<unknown>;
    if (!response.ok) {
      setStatus({
        tone: "error",
        message: payload.error?.message ?? "Archive ไม่สำเร็จ",
      });
      setPending(false);
      return;
    }
    const code = archive.code;
    setArchive(null);
    setPending(false);
    setStatus({ tone: "success", message: `Archive ${code} แล้ว` });
    router.refresh();
  }
  return (
    <>
      <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-zinc-100 px-4 sm:max-w-md">
            <RiSearchLine className="text-zinc-400" />
            <span className="sr-only">ค้นหา Promo Code</span>
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="ค้นหาโค้ดหรือรายละเอียด"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                  searchRef.current?.focus();
                }}
                aria-label="ล้างคำค้นหา"
                className="grid size-8 place-items-center rounded-full hover:bg-zinc-200"
              >
                <RiCloseLine />
              </button>
            ) : null}
          </label>
          <label className="sr-only" htmlFor="promo-status-filter">
            กรองสถานะ
          </label>
          <ContentSelect
            id="promo-status-filter"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as typeof filter);
              setPage(1);
            }}
            className="min-h-12 rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium"
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="ACTIVE">ใช้งานอยู่</option>
            <option value="SCHEDULED">รอเริ่ม</option>
            <option value="PAUSED">ปิดใช้งาน</option>
            <option value="EXPIRED">หมดอายุ</option>
            <option value="QUOTA_FULL">ครบโควตา</option>
          </ContentSelect>
          <PromoEditor
            rooms={rooms}
            onSuccess={(message) => {
              setStatus({ tone: "success", message });
              router.refresh();
            }}
          />
        </div>
        {status ? (
          <div className="mt-4">
            <StatusBanner tone={status.tone}>{status.message}</StatusBanner>
          </div>
        ) : null}
        <p role="status" className="mt-5 text-xs font-medium text-zinc-400">
          แสดง {filtered.length.toLocaleString("th-TH")} จาก{" "}
          {initialPromos.length.toLocaleString("th-TH")} โค้ด
        </p>
        {filtered.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {paged.map((item) => (
              <PromoCard
                key={item.id}
                item={item}
                rooms={rooms}
                onArchive={() => setArchive(item)}
                onSuccess={(message) => {
                  setStatus({ tone: "success", message });
                  router.refresh();
                }}
              />
            ))}
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center text-center">
            <div>
              <RiCoupon3Line className="mx-auto text-5xl text-zinc-300" />
              <h2 className="mt-4 text-xl font-medium">
                {query || filter !== "ALL"
                  ? "ไม่พบโค้ดที่ตรงกับตัวกรอง"
                  : "ยังไม่มี Promo Code"}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                {query || filter !== "ALL"
                  ? "ลองเปลี่ยนคำค้นหาหรือสถานะ"
                  : "สร้างโค้ดแรกเพื่อใช้กับ Booking ใหม่"}
              </p>
              {query || filter !== "ALL" ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setFilter("ALL");
                    setPage(1);
                  }}
                  className="mt-4 text-sm font-medium underline"
                >
                  ล้างตัวกรอง
                </button>
              ) : null}
            </div>
          </div>
        )}
        <Pagination
          page={page}
          pageSize={10}
          total={filtered.length}
          onPageChange={setPage}
        />
      </section>
      <ConfirmDialog
        open={Boolean(archive)}
        busy={pending}
        title={`Archive ${archive?.code ?? "Promo Code"}?`}
        description="โค้ดนี้จะใช้กับ Booking ใหม่ไม่ได้ แต่ Booking และประวัติการใช้ส่วนลดเดิมจะไม่ถูกแก้ไข"
        confirmLabel="Archive"
        onClose={() => setArchive(null)}
        onConfirm={() => void archivePromo()}
      />
    </>
  );
}

function PromoCard({
  item,
  onArchive,
  onSuccess,
  rooms,
}: {
  item: PromoRecord;
  onArchive: () => void;
  onSuccess: (message: string) => void;
  rooms: PromoRoom[];
}) {
  const state = promoStatus(item);
  const roomNames = item.appliesToAllRooms
    ? ["ทุกห้อง"]
    : rooms
        .filter((room) => item.roomIds.includes(room.id))
        .map((room) => room.name);
  return (
    <article className="overflow-hidden rounded-none border border-zinc-200">
      <div className="flex items-center justify-between bg-black px-5 py-4 text-white">
        <span className="font-wordmark text-sm tracking-widest">
          {item.code}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-medium ${state === "ACTIVE" ? "bg-emerald-300 text-black" : state === "SCHEDULED" ? "bg-blue-100 text-blue-900" : state === "EXPIRED" || state === "QUOTA_FULL" ? "bg-red-100 text-red-800" : "bg-white/15 text-white"}`}
        >
          {statusLabel(state)}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-3xl font-medium tracking-normal">
              {item.discountType === "PERCENTAGE"
                ? `${item.discountValue}%`
                : formatThaiBaht(item.discountValue)}
            </p>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
              {item.description || "ไม่มีรายละเอียดเพิ่มเติม"}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <PromoEditor item={item} rooms={rooms} onSuccess={onSuccess} />
            <button
              type="button"
              onClick={onArchive}
              aria-label={`Archive ${item.code}`}
              className="grid size-10 place-items-center rounded-full border border-zinc-200 text-amber-700 transition hover:bg-amber-50"
            >
              <RiArchiveLine />
            </button>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 rounded-none bg-zinc-100 p-4 text-sm">
          <div>
            <dt className="text-xs text-zinc-400">การใช้งาน</dt>
            <dd className="mt-1 font-medium">
              {item.usageCount.toLocaleString("th-TH")} /{" "}
              {item.totalUsageLimit?.toLocaleString("th-TH") ?? "ไม่จำกัด"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-400">ขั้นต่ำ</dt>
            <dd className="mt-1 font-medium">
              {formatThaiBaht(item.minBookingAmount)}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-zinc-400">ช่วงเวลา</dt>
            <dd className="mt-1 font-medium">
              {formatBangkokDateTime(item.startsAt)} —{" "}
              {item.endsAt
                ? formatBangkokDateTime(item.endsAt)
                : "ไม่กำหนดวันสิ้นสุด"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 truncate text-xs text-zinc-400">
          ใช้ได้กับ: {roomNames.join(", ") || "ห้องที่ถูก Archive"}
        </p>
      </div>
    </article>
  );
}

function PromoEditor({
  item,
  onSuccess,
  rooms,
}: {
  item?: PromoRecord;
  onSuccess: (message: string) => void;
  rooms: PromoRoom[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<Record<string, unknown>>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  function initial() {
    return item
      ? {
          ...item,
          endsAt: toLocalInput(item.endsAt),
          maxDiscountAmount: item.maxDiscountAmount ?? "",
          perUserLimit: item.perUserLimit ?? "",
          startsAt: toLocalInput(item.startsAt),
          totalUsageLimit: item.totalUsageLimit ?? "",
        }
      : { ...empty, startsAt: toLocalInput(new Date().toISOString()) };
  }
  function open() {
    setForm(initial());
    setErrors({});
    setMessage("");
    dialog.current?.showModal();
  }
  const update =
    (key: string) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((current) => ({
        ...current,
        [key]:
          event.target.type === "checkbox"
            ? (event.target as HTMLInputElement).checked
            : event.target.value,
      }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    let input;
    try {
      input = parsePromoInput({
        ...form,
        startsAt: toIso(String(form.startsAt ?? "")),
        endsAt: form.endsAt ? toIso(String(form.endsAt)) : null,
      });
    } catch (error) {
      if (error instanceof PromoValidationError) {
        setErrors({ ...error.fieldErrors });
        setMessage(error.message);
      } else
        setMessage(error instanceof Error ? error.message : "ข้อมูลไม่ถูกต้อง");
      return;
    }
    setPending(true);
    const response = await fetch(
      item ? `/api/v1/admin/discounts/${item.id}` : "/api/v1/admin/discounts",
      {
        method: item ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    const payload = (await response.json()) as ApiEnvelope<unknown>;
    if (!response.ok) {
      setErrors(payload.error?.fieldErrors ?? {});
      setMessage(payload.error?.message ?? "บันทึก Promo Code ไม่สำเร็จ");
      setPending(false);
      return;
    }
    dialog.current?.close();
    setPending(false);
    onSuccess(`${item ? "บันทึก" : "สร้าง"} ${input.code} แล้ว`);
  }
  const allRooms = Boolean(form.appliesToAllRooms);
  const selected = Array.isArray(form.roomIds)
    ? (form.roomIds as string[])
    : [];
  const percentage = form.discountType === "PERCENTAGE";
  return (
    <>
      <button
        type="button"
        onClick={open}
        className={
          item
            ? "grid size-10 place-items-center rounded-full border border-zinc-200 transition hover:bg-zinc-100"
            : "inline-flex min-h-12 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white"
        }
        aria-label={item ? `แก้ไข ${item.code}` : undefined}
      >
        {item ? (
          <RiEditLine />
        ) : (
          <>
            <RiAddLine />
            สร้าง Promo
          </>
        )}
      </button>
      <dialog
        ref={dialog}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto rounded-lg p-0 backdrop:bg-black/60"
      >
        <form noValidate onSubmit={submit} className="p-6 sm:p-9">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[.14em] text-zinc-400">
                DISCOUNT STUDIO
              </p>
              <h2 className="mt-2 text-3xl font-medium">
                {item ? "แก้ไข Promo Code" : "สร้าง Promo Code"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              disabled={pending}
              aria-label="ปิด"
              className="grid size-10 place-items-center rounded-full border border-zinc-200"
            >
              <RiCloseLine />
            </button>
          </header>
          {message ? (
            <div className="mt-5">
              <StatusBanner>{message}</StatusBanner>
            </div>
          ) : null}
          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_280px]">
            <div>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  id={`promo-code-${item?.id ?? "new"}`}
                  label="Promo Code"
                  value={String(form.code ?? "")}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  error={errors.code}
                  disabled={pending}
                  placeholder="HORIZONWELCOME"
                />
                <SelectField
                  id={`promo-type-${item?.id ?? "new"}`}
                  label="ประเภทส่วนลด"
                  value={String(form.discountType)}
                  onChange={update("discountType")}
                  error={errors.discountType}
                >
                  <option value="PERCENTAGE">เปอร์เซ็นต์</option>
                  <option value="FIXED">ยอดคงที่</option>
                </SelectField>
                <FormField
                  id={`promo-value-${item?.id ?? "new"}`}
                  label={percentage ? "ส่วนลด (%)" : "ส่วนลด (บาท)"}
                  type="number"
                  min={0.01}
                  max={percentage ? 100 : 1000000}
                  step="0.01"
                  value={String(form.discountValue ?? "")}
                  onChange={update("discountValue")}
                  error={errors.discountValue}
                  disabled={pending}
                />
                {percentage ? (
                  <FormField
                    id={`promo-cap-${item?.id ?? "new"}`}
                    label="ลดสูงสุด (บาท)"
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={String(form.maxDiscountAmount ?? "")}
                    onChange={update("maxDiscountAmount")}
                    error={errors.maxDiscountAmount}
                    disabled={pending}
                    placeholder="ไม่จำกัด"
                  />
                ) : (
                  <div />
                )}
                <FormField
                  id={`promo-min-${item?.id ?? "new"}`}
                  label="ยอดจองขั้นต่ำ (บาท)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={String(form.minBookingAmount ?? 0)}
                  onChange={update("minBookingAmount")}
                  error={errors.minBookingAmount}
                  disabled={pending}
                />
                <FormField
                  id={`promo-per-user-${item?.id ?? "new"}`}
                  label="จำกัดต่อผู้ใช้ (ครั้ง)"
                  type="number"
                  min={1}
                  step={1}
                  value={String(form.perUserLimit ?? "")}
                  onChange={update("perUserLimit")}
                  error={errors.perUserLimit}
                  disabled={pending}
                  placeholder="ไม่จำกัด"
                />
                <FormField
                  id={`promo-total-${item?.id ?? "new"}`}
                  label="โควตารวม (ครั้ง)"
                  type="number"
                  min={1}
                  step={1}
                  value={String(form.totalUsageLimit ?? "")}
                  onChange={update("totalUsageLimit")}
                  error={errors.totalUsageLimit}
                  disabled={pending}
                  placeholder="ไม่จำกัด"
                />
              </div>
              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-medium">
                  รายละเอียด
                </span>
                <textarea
                  rows={3}
                  value={String(form.description ?? "")}
                  onChange={update("description")}
                  className="w-full resize-none rounded-none border border-zinc-300 p-4 outline-none"
                />
              </label>
              <fieldset className="mt-6">
                <legend className="flex items-center gap-2 font-medium">
                  <RiTimeLine />
                  ช่วงเวลาที่ใช้ได้
                </legend>
                <div className="mt-3 grid gap-5 sm:grid-cols-2">
                  <FormField
                    id={`promo-start-${item?.id ?? "new"}`}
                    label="เริ่มใช้"
                    type="datetime-local"
                    value={String(form.startsAt ?? "")}
                    onChange={update("startsAt")}
                    error={errors.startsAt}
                    disabled={pending}
                  />
                  <FormField
                    id={`promo-end-${item?.id ?? "new"}`}
                    label="สิ้นสุด"
                    type="datetime-local"
                    value={String(form.endsAt ?? "")}
                    onChange={update("endsAt")}
                    error={errors.endsAt}
                    disabled={pending}
                    hint="เว้นว่างหากไม่กำหนด"
                  />
                </div>
              </fieldset>
              <fieldset className="mt-6">
                <legend className="font-medium">ห้องที่ใช้โค้ดได้</legend>
                <label className="mt-3 flex items-center gap-3 rounded-none bg-zinc-100 p-4">
                  <input
                    type="checkbox"
                    checked={allRooms}
                    onChange={update("appliesToAllRooms")}
                    className="size-5 accent-black"
                  />
                  <span className="text-sm font-medium">
                    ใช้ได้กับทุกห้อง
                  </span>
                </label>
                {!allRooms ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {rooms.map((room) => (
                      <label
                        key={room.id}
                        className="flex items-center gap-3 rounded-none border border-zinc-200 p-3"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(room.id)}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              roomIds: event.target.checked
                                ? [...selected, room.id]
                                : selected.filter((id) => id !== room.id),
                            }))
                          }
                          className="size-5 accent-black"
                        />
                        <span className="text-sm font-medium">
                          {room.name}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : null}
                {errors.roomIds ? (
                  <p className="mt-2 text-xs text-red-700">{errors.roomIds}</p>
                ) : null}
              </fieldset>
              <label className="mt-6 flex items-center gap-3 rounded-none border border-zinc-200 p-4">
                <input
                  type="checkbox"
                  checked={Boolean(form.isActive)}
                  onChange={update("isActive")}
                  className="size-5 accent-black"
                />
                <span>
                  <b className="block text-sm">เปิดใช้งานโค้ด</b>
                  <small className="text-zinc-500">
                    ระบบยังตรวจวัน เวลา ห้อง และโควตาก่อนใช้ทุกครั้ง
                  </small>
                </span>
              </label>
            </div>
            <aside className="h-fit overflow-hidden rounded-lg bg-black text-white lg:sticky lg:top-4">
              <div className="border-b border-dashed border-white/20 p-6">
                <p className="text-[10px] font-medium tracking-[.18em] text-white/40">
                  PROMO PREVIEW
                </p>
                <p className="mt-5 break-all font-wordmark text-sm tracking-widest">
                  {String(form.code || "YOURCODE")}
                </p>
                <p className="mt-4 text-5xl font-medium tracking-normal">
                  {percentage
                    ? `${Number(form.discountValue || 0)}%`
                    : formatThaiBaht(Number(form.discountValue || 0))}
                </p>
                <p className="mt-2 text-xs text-white/45">
                  {percentage && form.maxDiscountAmount
                    ? `ลดสูงสุด ${formatThaiBaht(Number(form.maxDiscountAmount))}`
                    : "ส่วนลดสำหรับ Booking ที่เข้าเงื่อนไข"}
                </p>
              </div>
              <div className="p-6 text-xs leading-6 text-white/55">
                ยอดขั้นต่ำ {formatThaiBaht(Number(form.minBookingAmount || 0))}
                <br />
                {allRooms
                  ? "ใช้ได้ทุกห้อง"
                  : `เลือกแล้ว ${selected.length} ห้อง`}
              </div>
            </aside>
          </div>
          <div className="sticky bottom-0 -mx-6 mt-8 flex justify-end gap-3 border-t border-zinc-200 bg-white/95 px-6 py-5 backdrop-blur sm:-mx-9 sm:px-9">
            <button
              type="button"
              disabled={pending}
              onClick={() => dialog.current?.close()}
              className="rounded-full border border-zinc-300 px-5 py-2.5 font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="min-w-36 rounded-full bg-black px-6 py-2.5 font-medium text-white disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? "กำลังบันทึก…" : "บันทึก Promo"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
function SelectField({
  children,
  error,
  id,
  label,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string;
  label: string;
}) {
  const messageId = `${id}-message`;
  return (
    <label htmlFor={id}>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <ContentSelect
        id={id}
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? messageId : undefined}
        className="min-h-13 w-full rounded-none border border-zinc-300 bg-white px-4 outline-none"
      >
        {children}
      </ContentSelect>
      {error ? (
        <span id={messageId} className="mt-2 block text-xs text-red-700">
          {error}
        </span>
      ) : null}
    </label>
  );
}
