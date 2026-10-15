"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBanner } from "@/components/ui/status-banner";
export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function cancel() {
    setPending(true);
    setError("");
    const response = await fetch(`/api/v1/bookings/${bookingId}/cancel`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error?.message ?? "ไม่สามารถยกเลิกได้");
      setPending(false);
      return;
    }
    dialog.current?.close();
    router.refresh();
  }
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        ยกเลิกการจอง
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg bg-white p-0 backdrop:bg-black/55"
      >
        <div className="p-7 sm:p-9">
          <h2 className="text-2xl font-medium">ยกเลิกรายการจองนี้?</h2>
          <p className="mt-3 leading-7 text-zinc-500">
            ระบบอนุญาตเมื่อเหลืออย่างน้อย 12 ชั่วโมงก่อนเริ่ม
            หากชำระแล้วรายการจะเข้าสู่สถานะรอคืนเงิน
          </p>
          {error ? (
            <div className="mt-5">
              <StatusBanner>{error}</StatusBanner>
            </div>
          ) : null}
          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              autoFocus
              onClick={() => dialog.current?.close()}
              disabled={pending}
              className="rounded-full border border-zinc-300 px-5 py-2.5 font-medium"
            >
              กลับไปตรวจสอบ
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="rounded-full bg-red-700 px-5 py-2.5 font-medium text-white disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? "กำลังยกเลิก…" : "ยืนยันยกเลิก"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
