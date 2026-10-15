"use client";

import { ContentSelect } from "@/components/ui/content-select";

/* eslint-disable @next/next/no-img-element -- Supabase Storage URLs are runtime-managed public objects. */

import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  RiAddLine,
  RiArchiveLine,
  RiCameraLine,
  RiCloseLine,
  RiEditLine,
  RiEqualizer2Line,
  RiMusic2Line,
  RiPriceTag3Line,
  RiSearchLine,
  RiUploadCloud2Line,
} from "react-icons/ri";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { Pagination } from "@/components/ui/pagination";
import { StatusBanner } from "@/components/ui/status-banner";
import { formatThaiBaht } from "@/lib/presentation";
import {
  equipmentCategories,
  equipmentCategoryLabel,
  type EquipmentCategory,
} from "@/lib/equipment-categories";
import {
  CatalogValidationError,
  parseAddonInput,
  parseEquipmentInput,
  parseRoomImageInput,
  parseRoomInput,
} from "@/features/admin/catalog-contracts";

export type AdminRoom = {
  id: string;
  slug: string;
  name: string;
  type: "REHEARSAL" | "RECORDING";
  description: string;
  capacity: number;
  hourlyRate: number;
  status: "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE";
  isPublished: boolean;
  imagePath: string | null;
  equipment: Array<{
    category: EquipmentCategory;
    description: string;
    equipmentId: string;
    name: string;
    quantity: number;
    note: string | null;
  }>;
};
export type AdminEquipment = {
  category: EquipmentCategory;
  description: string;
  id: string;
  name: string;
};
export type AdminAddon = {
  id: string;
  name: string;
  description: string;
  pricingType: "FIXED" | "PER_HOUR" | "PER_UNIT";
  unitPrice: number;
  isActive: boolean;
};
type Mode = "rooms" | "equipment" | "addons";
type ApiResult<T> = {
  data?: T;
  error?: { message?: string; fieldErrors?: Record<string, string> };
};

const tabs = [
  { href: "/admin/rooms", label: "ห้อง", icon: RiMusic2Line },
  {
    href: "/admin/rooms?view=equipment",
    label: "อุปกรณ์",
    icon: RiEqualizer2Line,
  },
  {
    href: "/admin/rooms?view=addons",
    label: "บริการเสริม",
    icon: RiPriceTag3Line,
  },
] as const;
const roomEmpty = {
  capacity: 4,
  description: "",
  hourlyRate: 500,
  isPublished: false,
  name: "",
  slug: "",
  status: "AVAILABLE",
  type: "REHEARSAL",
} as const;

export function CatalogManager({
  addons,
  equipment,
  mode,
  rooms,
}: {
  addons: AdminAddon[];
  equipment: AdminEquipment[];
  mode: Mode;
  rooms: AdminRoom[];
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<{
    tone: "error" | "success";
    message: string;
  } | null>(null);
  const [archive, setArchive] = useState<{
    id: string;
    kind: Mode;
    name: string;
  } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [page, setPage] = useState(1);
  const records =
    mode === "rooms" ? rooms : mode === "equipment" ? equipment : addons;
  const filtered = records.filter((item) =>
    `${item.name} ${"description" in item ? item.description : ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const paged = filtered.slice((page - 1) * 10, page * 10);
  async function archiveRecord() {
    if (!archive) return;
    setArchiving(true);
    const base = archive.kind === "rooms" ? "rooms" : archive.kind;
    const response = await fetch(`/api/v1/admin/${base}/${archive.id}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as ApiResult<unknown>;
    if (!response.ok) {
      setStatus({
        tone: "error",
        message: payload.error?.message ?? "ไม่สามารถ Archive ได้",
      });
      setArchiving(false);
      return;
    }
    setArchive(null);
    setArchiving(false);
    setStatus({ tone: "success", message: `Archive ${archive.name} แล้ว` });
    router.refresh();
  }
  return (
    <>
      <nav
        aria-label="ประเภท Catalog"
        className="mt-8 flex gap-2 overflow-x-auto"
      >
        {tabs.map(({ href, label, icon: Icon }, index) => (
          <Link
            key={href}
            href={href}
            aria-current={
              index === (mode === "rooms" ? 0 : mode === "equipment" ? 1 : 2)
                ? "page"
                : undefined
            }
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-medium transition ${index === (mode === "rooms" ? 0 : mode === "equipment" ? 1 : 2) ? "bg-black text-white" : "border border-zinc-300 bg-white hover:border-black"}`}
          >
            <Icon />
            {label}
          </Link>
        ))}
      </nav>
      <section className="mt-5 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-zinc-100 px-4 sm:max-w-md">
            <RiSearchLine className="shrink-0 text-zinc-400" />
            <span className="sr-only">ค้นหา Catalog</span>
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={`ค้นหา${mode === "rooms" ? "ห้อง" : mode === "equipment" ? "อุปกรณ์" : "บริการเสริม"}`}
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
          {mode === "rooms" ? (
            <RoomEditor
              equipment={equipment}
              onSuccess={(message) => {
                setStatus({ tone: "success", message });
                router.refresh();
              }}
            />
          ) : (
            <SimpleEditor
              mode={mode}
              onSuccess={(message) => {
                setStatus({ tone: "success", message });
                router.refresh();
              }}
            />
          )}
        </div>
        {status ? (
          <div className="mt-4">
            <StatusBanner tone={status.tone}>{status.message}</StatusBanner>
          </div>
        ) : null}
        <p role="status" className="mt-5 text-xs font-medium text-zinc-400">
          แสดง {filtered.length.toLocaleString("th-TH")} จาก{" "}
          {records.length.toLocaleString("th-TH")} รายการ
        </p>
        {!filtered.length ? (
          <div className="grid min-h-64 place-items-center text-center">
            <div>
              <RiSearchLine className="mx-auto text-4xl text-zinc-300" />
              <h2 className="mt-4 text-lg font-medium">
                {query ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีข้อมูล"}
              </h2>
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
                  className="mt-3 text-sm font-medium underline"
                >
                  ล้างคำค้นหา
                </button>
              ) : null}
            </div>
          </div>
        ) : mode === "rooms" ? (
          <div className="mt-5 grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {(paged as AdminRoom[]).map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                equipment={equipment}
                onArchive={() =>
                  setArchive({ id: room.id, kind: "rooms", name: room.name })
                }
                onSuccess={(message) => {
                  setStatus({ tone: "success", message });
                  router.refresh();
                }}
              />
            ))}
          </div>
        ) : (
          <div className="mt-5 divide-y divide-zinc-100">
            {(paged as Array<AdminEquipment | AdminAddon>).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-4 py-5"
              >
                <span className="grid size-12 place-items-center rounded-full bg-zinc-100 text-xl">
                  {mode === "equipment" ? (
                    <RiEqualizer2Line />
                  ) : (
                    <RiPriceTag3Line />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-1 line-clamp-1 text-sm text-zinc-500">
                    {item.description || "ยังไม่มีรายละเอียด"}
                  </p>
                </div>
                {mode === "equipment" ? (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                    {equipmentCategoryLabel[(item as AdminEquipment).category]}
                  </span>
                ) : null}
                {"unitPrice" in item ? (
                  <div className="text-right">
                    <p className="font-medium">
                      {formatThaiBaht(item.unitPrice)}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {priceTypeLabel(item.pricingType)} ·{" "}
                      {item.isActive ? "เปิดใช้" : "ปิดใช้"}
                    </p>
                  </div>
                ) : null}
                <SimpleEditor
                  mode={mode}
                  item={item}
                  onSuccess={(message) => {
                    setStatus({ tone: "success", message });
                    router.refresh();
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    setArchive({ id: item.id, kind: mode, name: item.name })
                  }
                  className="grid size-10 place-items-center rounded-full border border-zinc-200 text-amber-700 transition hover:bg-amber-50"
                  aria-label={`Archive ${item.name}`}
                >
                  <RiArchiveLine />
                </button>
              </div>
            ))}
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
        busy={archiving}
        title={`Archive ${archive?.name ?? "รายการนี้"}?`}
        description="รายการจะถูกซ่อนจากหน้าจัดการและไม่สามารถนำไปใช้กับรายการใหม่ แต่ประวัติเดิมและ Activity Log จะยังคงอยู่"
        confirmLabel="Archive"
        onClose={() => setArchive(null)}
        onConfirm={() => void archiveRecord()}
      />
    </>
  );
}

function RoomCard({
  equipment,
  onArchive,
  onSuccess,
  room,
}: {
  equipment: AdminEquipment[];
  onArchive: () => void;
  onSuccess: (message: string) => void;
  room: AdminRoom;
}) {
  return (
    <article className="min-w-0 overflow-hidden border border-zinc-200 bg-white">
      <div className="grid aspect-square place-items-center border-b border-zinc-200 bg-black">
        {room.imagePath ? (
          <img
            src={`/storage/room-images/${room.imagePath}`}
            alt={room.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <RiCameraLine className="text-4xl text-zinc-300" />
        )}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-[.12em] text-[var(--focus)]">
              {room.type}
            </p>
            <h2 className="mt-1 break-words text-lg font-medium leading-7">{room.name}</h2>
            <p className="mt-1 break-all text-xs text-zinc-500">/{room.slug}</p>
          </div>
          {room.status !== "AVAILABLE" ? (
            <span className={`px-2 py-1 text-xs font-medium ${room.status === "MAINTENANCE" ? "bg-amber-100 text-amber-900" : "bg-zinc-200 text-zinc-700"}`}>
              {room.status}
            </span>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-y border-zinc-100 py-3 text-center text-sm tabular-nums">
          <div>
            <span className="font-medium">{formatThaiBaht(room.hourlyRate)}</span>
            <small className="block text-zinc-400">ต่อชั่วโมง</small>
          </div>
          <div>
            <span className="font-medium">{room.capacity}</span>
            <small className="block text-zinc-400">คน</small>
          </div>
          <div>
            <span className="font-medium">{room.equipment.length}</span>
            <small className="block text-zinc-400">อุปกรณ์</small>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span
            className={`text-xs font-medium ${room.isPublished ? "text-emerald-700" : "text-zinc-400"}`}
          >
            {room.isPublished ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
          </span>
          <div className="flex gap-2">
            <RoomEditor
              room={room}
              equipment={equipment}
              onSuccess={onSuccess}
            />
            <button
              type="button"
              onClick={onArchive}
              className="grid size-10 place-items-center rounded-full border border-zinc-200 text-amber-700 hover:bg-amber-50"
              aria-label={`Archive ${room.name}`}
            >
              <RiArchiveLine />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function RoomEditor({
  equipment,
  onSuccess,
  room,
}: {
  equipment: AdminEquipment[];
  onSuccess: (message: string) => void;
  room?: AdminRoom;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Record<string, unknown>>(room ?? roomEmpty);
  const [selected, setSelected] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      room?.equipment.map((item) => [item.equipmentId, item.quantity]) ?? [],
    ),
  );
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [altText, setAltText] = useState(room?.name ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  useEffect(
    () => () => {
      if (previewUrlRef.current)
        URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );
  function open() {
    setCreatedRoomId(null);
    setForm(room ?? roomEmpty);
    setSelected(
      Object.fromEntries(
        room?.equipment.map((item) => [item.equipmentId, item.quantity]) ?? [],
      ),
    );
    chooseFile(null);
    if (imageInput.current) imageInput.current.value = "";
    setAltText(room?.name ?? "");
    setErrors({});
    setMessage("");
    dialog.current?.showModal();
  }
  function chooseFile(nextFile: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreviewUrl = nextFile ? URL.createObjectURL(nextFile) : null;
    previewUrlRef.current = nextPreviewUrl;
    setFile(nextFile);
    setPreviewUrl(nextPreviewUrl);
    setErrors((current) => {
      const rest = { ...current };
      delete rest.file;
      return rest;
    });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    let input;
    try {
      input = parseRoomInput(form);
      if (file)
        parseRoomImageInput({ altText, mimeType: file.type, size: file.size });
    } catch (error) {
      if (error instanceof CatalogValidationError) {
        setErrors({ ...error.fieldErrors });
        setMessage(error.message);
        dialog.current?.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    setPending(true);
    const targetRoomId = room?.id ?? createdRoomId;
    try {
      const response = await fetch(
        targetRoomId
          ? `/api/v1/admin/rooms/${targetRoomId}`
          : "/api/v1/admin/rooms",
        {
          method: targetRoomId ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const payload = (await response.json()) as ApiResult<{ id: string }>;
      if (!response.ok || !payload.data)
        throw Object.assign(
          new Error(payload.error?.message ?? "บันทึกห้องไม่สำเร็จ"),
          { fieldErrors: payload.error?.fieldErrors },
        );
      const roomId = targetRoomId ?? payload.data.id;
      setCreatedRoomId(roomId);
      const assignments = Object.entries(selected)
        .filter(([, quantity]) => quantity > 0)
        .map(([equipmentId, quantity]) => ({ equipmentId, quantity }));
      const assignmentResponse = await fetch(
        `/api/v1/admin/rooms/${roomId}/equipment`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items: assignments }),
        },
      );
      if (!assignmentResponse.ok) {
        const p = (await assignmentResponse.json()) as ApiResult<unknown>;
        throw new Error(p.error?.message ?? "บันทึกอุปกรณ์ในห้องไม่สำเร็จ");
      }
      if (file) {
        const intentResponse = await fetch(
          `/api/v1/admin/rooms/${roomId}/images/upload-intents`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              altText,
              mimeType: file.type,
              size: file.size,
            }),
          },
        );
        const intent = (await intentResponse.json()) as ApiResult<{
          path: string;
          token: string;
        }>;
        if (!intentResponse.ok || !intent.data)
          throw new Error(intent.error?.message ?? "เตรียมอัปโหลดภาพไม่สำเร็จ");
        const supabase = getSupabaseBrowserClient();
        const upload = await supabase.storage
          .from("room-images")
          .uploadToSignedUrl(intent.data.path, intent.data.token, file, {
            contentType: file.type,
          });
        if (upload.error) throw upload.error;
        const confirm = await fetch(`/api/v1/admin/rooms/${roomId}/images`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ altText, path: intent.data.path }),
        });
        const confirmed = (await confirm.json()) as ApiResult<unknown>;
        if (!confirm.ok)
          throw new Error(confirmed.error?.message ?? "ยืนยันภาพไม่สำเร็จ");
      }
      dialog.current?.close();
      setCreatedRoomId(null);
      onSuccess(
        room ? `บันทึก ${input.name} แล้ว` : `สร้าง ${input.name} แล้ว`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "บันทึกห้องไม่สำเร็จ",
      );
      setErrors(
        (error as { fieldErrors?: Record<string, string> }).fieldErrors ?? {},
      );
      dialog.current?.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setPending(false);
    }
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
  return (
    <>
      <button
        type="button"
        onClick={open}
        className={
          room
            ? "grid size-10 place-items-center rounded-full border border-zinc-200 hover:bg-zinc-100"
            : "inline-flex min-h-12 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white"
        }
        aria-label={room ? `แก้ไข ${room.name}` : undefined}
      >
        {room ? (
          <RiEditLine />
        ) : (
          <>
            <RiAddLine />
            เพิ่มห้อง
          </>
        )}
      </button>
      <dialog
        ref={dialog}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto rounded-lg p-0 backdrop:bg-black/60"
      >
        <form noValidate onSubmit={submit} className="p-6 sm:p-9">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[.14em] text-zinc-400">
                ROOM CATALOG
              </p>
              <h2 className="mt-2 text-3xl font-medium">
                {room ? "แก้ไขห้อง" : "เพิ่มห้องใหม่"}
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
          </div>
          {message ? (
            <div className="mt-5">
              <StatusBanner>{message}</StatusBanner>
            </div>
          ) : null}
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <FormField
              id={`room-name-${room?.id ?? "new"}`}
              label="ชื่อห้อง"
              value={String(form.name ?? "")}
              onChange={update("name")}
              error={errors.name}
              disabled={pending}
            />
            <FormField
              id={`room-slug-${room?.id ?? "new"}`}
              label="Slug"
              value={String(form.slug ?? "")}
              onChange={update("slug")}
              error={errors.slug}
              disabled={pending}
              hint="ตัวพิมพ์เล็ก ตัวเลข และขีดกลาง"
            />
            <SelectField
              id={`room-type-${room?.id ?? "new"}`}
              label="ประเภท"
              value={String(form.type)}
              onChange={update("type")}
              error={errors.type}
            >
              <option value="REHEARSAL">ห้องซ้อม</option>
              <option value="RECORDING">ห้องบันทึกเสียง</option>
            </SelectField>
            <SelectField
              id={`room-status-${room?.id ?? "new"}`}
              label="สถานะ"
              value={String(form.status)}
              onChange={update("status")}
              error={errors.status}
            >
              <option value="AVAILABLE">Available</option>
              <option value="UNAVAILABLE">Unavailable</option>
              <option value="MAINTENANCE">Maintenance</option>
            </SelectField>
            <FormField
              id={`room-capacity-${room?.id ?? "new"}`}
              label="ความจุ (คน)"
              type="number"
              min={1}
              max={500}
              value={String(form.capacity)}
              onChange={update("capacity")}
              error={errors.capacity}
              disabled={pending}
            />
            <FormField
              id={`room-rate-${room?.id ?? "new"}`}
              label="ราคาต่อชั่วโมง (บาท)"
              type="number"
              min={0.01}
              step="0.01"
              value={String(form.hourlyRate)}
              onChange={update("hourlyRate")}
              error={errors.hourlyRate}
              disabled={pending}
            />
          </div>
          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-medium">รายละเอียด</span>
            <textarea
              rows={4}
              value={String(form.description ?? "")}
              onChange={update("description")}
              aria-invalid={Boolean(errors.description)}
              className="w-full resize-none rounded-none border border-zinc-300 p-4 outline-none"
            />
          </label>
          <label className="mt-5 flex items-center gap-3 rounded-none bg-zinc-100 p-4">
            <input
              type="checkbox"
              checked={Boolean(form.isPublished)}
              onChange={update("isPublished")}
              className="size-5 accent-black"
            />
            <span>
              <b className="block text-sm">เผยแพร่ห้องนี้</b>
              <small className="text-zinc-500">
                ลูกค้าจะเห็นห้องเมื่อเผยแพร่และยังไม่ถูก Archive
              </small>
            </span>
          </label>
          <fieldset className="mt-7">
            <legend className="font-medium">อุปกรณ์ภายในห้อง</legend>
            <div className="mt-4 space-y-5">
              {equipmentCategories.map((category) => {
                const items = equipment.filter(
                  (item) => item.category === category,
                );
                if (!items.length) return null;
                return (
                  <section key={category}>
                    <p className="text-xs font-medium tracking-[.12em] text-zinc-500">
                      {equipmentCategoryLabel[category]}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {items.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 rounded-none border border-zinc-200 p-3"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(selected[item.id])}
                            onChange={(event) =>
                              setSelected((current) => ({
                                ...current,
                                [item.id]: event.target.checked ? 1 : 0,
                              }))
                            }
                            className="size-5 accent-black"
                          />
                          <span className="min-w-0 flex-1">
                            <b className="block truncate text-sm">{item.name}</b>
                            <small className="mt-0.5 block line-clamp-1 text-zinc-500">
                              {item.description || "ยังไม่มีรายละเอียด"}
                            </small>
                          </span>
                          {selected[item.id] ? (
                            <input
                              aria-label={`จำนวน ${item.name}`}
                              type="number"
                              min={1}
                              max={999}
                              value={selected[item.id]}
                              onChange={(event) =>
                                setSelected((current) => ({
                                  ...current,
                                  [item.id]: Number(event.target.value),
                                }))
                              }
                              className="h-10 w-20 rounded-xl border border-zinc-300 px-3"
                            />
                          ) : null}
                        </label>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </fieldset>
          <fieldset className="mt-7">
            <legend className="text-base font-medium">
              ภาพห้อง {room ? "(เพิ่มภาพใหม่)" : ""}
            </legend>
            <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <div className="grid sm:grid-cols-[auto_minmax(0,1fr)]">
                <input
                  ref={imageInput}
                  id={`room-image-${room?.id ?? "new"}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    chooseFile(event.target.files?.[0] ?? null)
                  }
                  className="sr-only"
                />
                <label
                  htmlFor={`room-image-${room?.id ?? "new"}`}
                  className="flex min-h-48 cursor-pointer flex-col items-center justify-center border-b border-dashed border-zinc-300 bg-zinc-50 px-10 text-center transition hover:bg-zinc-100 sm:min-w-72 sm:border-b-0"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-black text-xl text-white">
                    <RiUploadCloud2Line aria-hidden="true" />
                  </span>
                  <span className="mt-3 text-sm font-medium">อัปโหลดภาพห้อง</span>
                  <span className="mt-1 text-xs text-zinc-500">
                    เลือกไฟล์จากอุปกรณ์ของคุณ
                  </span>
                </label>
                <div className="min-w-0 p-4 sm:border-l sm:border-zinc-200 sm:p-5">
                  {previewUrl || room?.imagePath ? (
                    <div className="flex min-h-40 flex-col justify-center">
                      <img
                        src={
                          previewUrl ??
                          `/storage/room-images/${room?.imagePath ?? ""}`
                        }
                        alt={
                          file
                            ? `ตัวอย่าง ${file.name}`
                            : room?.name ?? "ภาพห้อง"
                        }
                        className="h-40 w-full rounded-none object-cover sm:h-36"
                      />
                      <div className="flex items-center justify-between gap-3 pt-3">
                        <p className="min-w-0 truncate text-sm font-medium">
                          {file?.name ?? "ภาพปัจจุบัน"}
                        </p>
                        <label
                          htmlFor={`room-image-${room?.id ?? "new"}`}
                          className="shrink-0 text-xs font-medium text-zinc-600 underline underline-offset-4"
                        >
                          เปลี่ยนภาพ
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-40 flex-col justify-center">
                      <p className="text-sm font-medium">ยังไม่ได้เลือกภาพ</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        ภาพแรกที่อัปโหลดจะใช้เป็นภาพหน้าปกของห้อง
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t border-zinc-200 bg-zinc-50/70 p-4 sm:p-5">
                <FormField
                  id={`room-alt-${room?.id ?? "new"}`}
                  label="คำอธิบายภาพ"
                  value={altText}
                  onChange={(event) => setAltText(event.target.value)}
                  error={errors.altText}
                  disabled={pending}
                  placeholder="เช่น มุมกว้างภายในห้องซ้อม North"
                />
              </div>
              {errors.file ? (
                <p className="border-t border-zinc-200 px-4 py-3 text-xs text-red-700 sm:px-5">
                  {errors.file}
                </p>
              ) : null}
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              JPEG, PNG หรือ WebP · สูงสุด 10 MB
            </p>
          </fieldset>
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
              className="min-w-32 rounded-full bg-black px-6 py-2.5 font-medium text-white disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? "กำลังบันทึก…" : "บันทึกห้อง"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function SimpleEditor({
  item,
  mode,
  onSuccess,
}: {
  item?: AdminEquipment | AdminAddon;
  mode: "equipment" | "addons";
  onSuccess: (message: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const isAddon = mode === "addons";
  const initial =
    item ??
    (isAddon
      ? {
          name: "",
          description: "",
          pricingType: "FIXED",
          unitPrice: 500,
          isActive: true,
        }
      : { category: "OTHER", name: "", description: "" });
  const [form, setForm] = useState<Record<string, unknown>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  function open() {
    setForm(initial);
    setErrors({});
    setMessage("");
    dialog.current?.showModal();
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    let input;
    try {
      input = isAddon ? parseAddonInput(form) : parseEquipmentInput(form);
    } catch (error) {
      if (error instanceof CatalogValidationError) {
        setErrors({ ...error.fieldErrors });
        setMessage(error.message);
      }
      return;
    }
    setPending(true);
    const base = isAddon ? "addons" : "equipment";
    const response = await fetch(
      item ? `/api/v1/admin/${base}/${item.id}` : `/api/v1/admin/${base}`,
      {
        method: item ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    const payload = (await response.json()) as ApiResult<unknown>;
    if (!response.ok) {
      setErrors(payload.error?.fieldErrors ?? {});
      setMessage(payload.error?.message ?? "บันทึกไม่สำเร็จ");
      setPending(false);
      return;
    }
    dialog.current?.close();
    setPending(false);
    onSuccess(`${item ? "บันทึก" : "เพิ่ม"} ${input.name} แล้ว`);
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
  return (
    <>
      <button
        type="button"
        onClick={open}
        className={
          item
            ? "grid size-10 place-items-center rounded-full border border-zinc-200 hover:bg-zinc-100"
            : "inline-flex min-h-12 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white"
        }
        aria-label={item ? `แก้ไข ${item.name}` : undefined}
      >
        {item ? (
          <RiEditLine />
        ) : (
          <>
            <RiAddLine />
            เพิ่ม{isAddon ? "บริการเสริม" : "อุปกรณ์"}
          </>
        )}
      </button>
      <dialog
        ref={dialog}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg p-0 backdrop:bg-black/60"
      >
        <form noValidate onSubmit={submit} className="p-7 sm:p-9">
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-medium">
              {item ? "แก้ไข" : "เพิ่ม"}
              {isAddon ? "บริการเสริม" : "อุปกรณ์"}
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="ปิด"
              className="grid size-10 place-items-center rounded-full border border-zinc-200"
            >
              <RiCloseLine />
            </button>
          </div>
          {message ? (
            <div className="mt-5">
              <StatusBanner>{message}</StatusBanner>
            </div>
          ) : null}
          <div className="mt-6">
            {!isAddon ? (
              <div className="mb-5">
                <SelectField
                  id={`equipment-category-${item?.id ?? "new"}`}
                  label="ประเภทอุปกรณ์"
                  value={String(form.category ?? "OTHER")}
                  onChange={update("category")}
                  error={errors.category}
                >
                  {equipmentCategories.map((category) => (
                    <option key={category} value={category}>
                      {equipmentCategoryLabel[category]}
                    </option>
                  ))}
                </SelectField>
              </div>
            ) : null}
            <FormField
              id={`${mode}-name-${item?.id ?? "new"}`}
              label="ชื่อ"
              value={String(form.name ?? "")}
              onChange={update("name")}
              error={errors.name}
              disabled={pending}
            />
          </div>
          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-medium">รายละเอียด</span>
            <textarea
              rows={4}
              value={String(form.description ?? "")}
              onChange={update("description")}
              className="w-full resize-none rounded-none border border-zinc-300 p-4 outline-none"
            />
          </label>
          {isAddon ? (
            <>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <SelectField
                  id={`addon-type-${item?.id ?? "new"}`}
                  label="รูปแบบราคา"
                  value={String(form.pricingType)}
                  onChange={update("pricingType")}
                  error={errors.pricingType}
                >
                  <option value="FIXED">ต่อ Booking</option>
                  <option value="PER_HOUR">ต่อชั่วโมง</option>
                  <option value="PER_UNIT">ต่อชิ้น</option>
                </SelectField>
                <FormField
                  id={`addon-price-${item?.id ?? "new"}`}
                  label="ราคา (บาท)"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={String(form.unitPrice)}
                  onChange={update("unitPrice")}
                  error={errors.unitPrice}
                  disabled={pending}
                />
              </div>
              <label className="mt-5 flex items-center gap-3 rounded-none bg-zinc-100 p-4">
                <input
                  type="checkbox"
                  checked={Boolean(form.isActive)}
                  onChange={update("isActive")}
                  className="size-5 accent-black"
                />
                <span className="text-sm font-medium">
                  เปิดให้ลูกค้าเลือกบริการนี้
                </span>
              </label>
            </>
          ) : null}
          <div className="mt-8 flex justify-end gap-3">
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
              className="min-w-28 rounded-full bg-black px-5 py-2.5 font-medium text-white disabled:opacity-50"
            >
              {pending ? "กำลังบันทึก…" : "บันทึก"}
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
    <label htmlFor={id} className="block">
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
function priceTypeLabel(type: string) {
  return type === "PER_HOUR"
    ? "ต่อชั่วโมง"
    : type === "PER_UNIT"
      ? "ต่อชิ้น"
      : "ต่อ Booking";
}
