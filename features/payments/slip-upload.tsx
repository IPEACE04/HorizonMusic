"use client";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RiCheckLine,
  RiFileUploadLine,
  RiFileLine,
  RiCloseLine,
} from "react-icons/ri";
import { StatusBanner } from "@/components/ui/status-banner";
const accepted = ["image/jpeg", "image/png", "application/pdf"];
export function SlipUpload({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  function choose(next: File | undefined) {
    setError("");
    if (!next) return;
    if (!accepted.includes(next.type)) {
      setError("รองรับเฉพาะ JPEG, PNG หรือ PDF");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setError("ไฟล์ต้องไม่เกิน 10 MB");
      return;
    }
    setFile(next);
  }
  async function upload() {
    if (!file) return;
    setPending(true);
    setError("");
    try {
      const intentResponse = await fetch(
        `/api/v1/bookings/${bookingId}/payment-upload-intents`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mimeType: file.type, size: file.size }),
        },
      );
      const intentPayload = await intentResponse.json();
      if (!intentResponse.ok)
        throw new Error(
          intentPayload.error?.message ?? "เตรียมอัปโหลดไม่สำเร็จ",
        );
      const client = getSupabaseBrowserClient();
      const uploaded = await client.storage
        .from("payment-slips")
        .uploadToSignedUrl(
          intentPayload.data.path,
          intentPayload.data.token,
          file,
          { contentType: file.type },
        );
      if (uploaded.error) throw uploaded.error;
      const confirmed = await fetch(
        `/api/v1/payment-upload-intents/${intentPayload.data.intentId}/confirm`,
        { method: "POST" },
      );
      const confirmedPayload = await confirmed.json();
      if (!confirmed.ok)
        throw new Error(
          confirmedPayload.error?.message ?? "ยืนยันไฟล์ไม่สำเร็จ",
        );
      router.push(`/bookings/${bookingId}`);
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "อัปโหลดไม่สำเร็จ",
      );
      setPending(false);
    }
  }
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 sm:p-8">
      {error ? (
        <div className="mb-5">
          <StatusBanner>{error}</StatusBanner>
        </div>
      ) : null}
      <div
        role="button"
        tabIndex={0}
        aria-label="เลือกไฟล์สลิป"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ")
            input.current?.click();
        }}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDrag(false);
          choose(event.dataTransfer.files[0]);
        }}
        className={`grid min-h-64 cursor-pointer place-items-center rounded-none border-2 border-dashed p-8 text-center transition ${drag ? "border-black bg-zinc-100" : "border-zinc-300 hover:border-zinc-500"}`}
      >
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="sr-only"
          onChange={(event) => choose(event.target.files?.[0])}
        />
        <div>
          {file ? (
            <RiFileLine className="mx-auto text-4xl" />
          ) : (
            <RiFileUploadLine className="mx-auto text-4xl" />
          )}
          <p className="mt-4 font-medium">
            {file ? file.name : "ลากไฟล์มาวาง หรือคลิกเพื่อเลือก"}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            JPEG, PNG หรือ PDF · สูงสุด 10 MB
          </p>
        </div>
      </div>
      {file ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setFile(null)}
            disabled={pending}
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500"
          >
            <RiCloseLine />
            นำไฟล์ออก
          </button>
          <button
            type="button"
            onClick={upload}
            disabled={pending}
            aria-busy={pending}
            className="inline-flex min-h-13 items-center gap-2 rounded-none bg-black px-6 font-medium text-white disabled:cursor-wait disabled:opacity-60"
          >
            <RiCheckLine />
            {pending ? "กำลังอัปโหลดและตรวจสอบ…" : "ส่งหลักฐานการชำระเงิน"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
