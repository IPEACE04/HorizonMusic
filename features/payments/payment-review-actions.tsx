"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RiExternalLinkLine } from "react-icons/ri";
import { StatusBanner } from "@/components/ui/status-banner";

type ReviewAction = "APPROVE" | "REJECT" | "REFUND";

export function PaymentReviewActions({
  paymentId,
  status,
}: {
  paymentId: string;
  status: string;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [action, setAction] = useState<ReviewAction>(
    status === "REFUND_PENDING" ? "REFUND" : "APPROVE",
  );
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function view() {
    setError("");
    const response = await fetch(`/api/v1/admin/payments/${paymentId}/slip`);
    const payload = await response.json();
    if (!response.ok)
      return setError(payload.error?.message ?? "เปิดสลิปไม่ได้");
    window.open(payload.data.url, "_blank", "noopener,noreferrer");
  }
  function open(next: ReviewAction) {
    setAction(next);
    setError("");
    setNote("");
    dialog.current?.showModal();
  }
  async function review() {
    if ((action === "REJECT" || action === "REFUND") && !note.trim())
      return setError(
        action === "REFUND"
          ? "กรุณาระบุเลขอ้างอิงการคืนเงิน"
          : "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
      );
    setPending(true);
    const response = await fetch(`/api/v1/admin/payments/${paymentId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error?.message ?? "บันทึกผลไม่สำเร็จ");
      setPending(false);
      return;
    }
    dialog.current?.close();
    router.refresh();
  }
  const title =
    action === "APPROVE"
      ? "ยืนยันว่าชำระเงินถูกต้อง?"
      : action === "REJECT"
        ? "ไม่อนุมัติหลักฐานนี้?"
        : "ยืนยันว่าคืนเงินแล้ว?";
  return (
    <div className="flex flex-wrap gap-2">
      {error ? (
        <div className="w-full">
          <StatusBanner>{error}</StatusBanner>
        </div>
      ) : null}
      <button
        type="button"
        onClick={view}
        className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
      >
        <RiExternalLinkLine />
        ดูสลิป
      </button>
      {status === "REFUND_PENDING" ? (
        <button
          type="button"
          onClick={() => open("REFUND")}
          className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
        >
          ยืนยันคืนเงิน
        </button>
      ) : status === "PENDING" ? (
        <>
          <button
            type="button"
            onClick={() => open("APPROVE")}
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
          >
            อนุมัติ
          </button>
          <button
            type="button"
            onClick={() => open("REJECT")}
            className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700"
          >
            ไม่อนุมัติ
          </button>
        </>
      ) : (
        <span className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-500">
          ตรวจสอบแล้ว
        </span>
      )}
      <dialog
        ref={dialog}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg p-0 backdrop:bg-black/55"
      >
        <div className="p-7 sm:p-9">
          <h2 className="text-2xl font-medium">{title}</h2>
          <p className="mt-3 leading-7 text-zinc-500">
            {action === "APPROVE"
              ? "ระบบจะยืนยัน Booking และใช้สิทธิ์ Promo ทันที"
              : action === "REJECT"
                ? "ลูกค้าจะเห็นเหตุผลและส่งหลักฐานใหม่ได้หากยังไม่หมดเวลา"
                : "ระบบจะบันทึกเลขอ้างอิงและแจ้งลูกค้าว่าคืนเงินสำเร็จ"}
          </p>
          <label className="mt-6 block text-sm font-medium">
            {action === "REFUND" ? "เลขอ้างอิงการคืนเงิน" : "บันทึกการตรวจสอบ"}
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-2 min-h-28 w-full resize-none rounded-none border border-zinc-300 p-4 outline-none"
            />
          </label>
          {error ? (
            <div className="mt-4">
              <StatusBanner>{error}</StatusBanner>
            </div>
          ) : null}
          <div className="mt-7 flex justify-end gap-3">
            <button
              type="button"
              autoFocus
              disabled={pending}
              onClick={() => dialog.current?.close()}
              className="rounded-full border border-zinc-300 px-5 py-2.5 font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={review}
              className={`rounded-full px-5 py-2.5 font-medium text-white disabled:cursor-wait disabled:opacity-60 ${action === "REJECT" ? "bg-red-700" : "bg-black"}`}
            >
              {pending
                ? "กำลังบันทึก…"
                : action === "APPROVE"
                  ? "ยืนยันการชำระเงิน"
                  : action === "REJECT"
                    ? "ยืนยันไม่อนุมัติ"
                    : "ยืนยันคืนเงินแล้ว"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
