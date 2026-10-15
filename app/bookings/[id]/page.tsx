import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { CancelBookingButton } from "@/features/booking/cancel-booking-button";
import { formatBangkokDateTime, formatThaiBaht } from "@/lib/presentation";
import { getAppSession } from "@/server/auth/session";
import { getUserBooking } from "@/server/bookings/service";
type Detail = {
  id: string;
  bookingNumber: string;
  roomName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  roomSubtotal: number;
  addonSubtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentDueAt: string | null;
  addons: Array<{
    id: string;
    name: string;
    quantity: number;
    lineTotal: number;
  }>;
  history: Array<{
    toStatus: string;
    reason: string | null;
    createdAt: string;
  }>;
  payments: Array<{
    id: string;
    status: string;
    attemptNumber: number;
    reviewNote: string | null;
  }>;
};

function bookingGuidance(detail: Detail) {
  const pendingPayment = detail.payments.some(
    (payment) => payment.status === "PENDING",
  );
  const rejectedPayment = detail.payments.find(
    (payment) => payment.status === "FAILED",
  );

  if (detail.status === "PENDING_PAYMENT" && pendingPayment)
    return {
      actionLabel: null,
      className: "bg-amber-100 text-amber-900",
      label: "กำลังตรวจสอบสลิป",
      message: "เราได้รับหลักฐานแล้ว ทีมงานกำลังตรวจสอบการชำระเงินของคุณ",
    };
  if (detail.status === "PENDING_PAYMENT" && rejectedPayment)
    return {
      actionLabel: "ส่งสลิปใหม่",
      className: "bg-red-100 text-red-900",
      label: "สลิปไม่ผ่านการตรวจสอบ",
      message:
        rejectedPayment.reviewNote ||
        "กรุณาตรวจสอบหลักฐานและส่งสลิปฉบับใหม่ก่อนหมดเวลาชำระเงิน",
    };
  if (detail.status === "PENDING_PAYMENT")
    return {
      actionLabel: "ส่งหลักฐานการชำระเงิน",
      className: "bg-amber-100 text-amber-900",
      label: "รอชำระเงิน",
      message: detail.paymentDueAt
        ? `กรุณาส่งหลักฐานภายใน ${formatBangkokDateTime(detail.paymentDueAt)}`
        : "กรุณาส่งหลักฐานการชำระเงิน",
    };
  if (detail.status === "CONFIRMED")
    return {
      actionLabel: null,
      className: "bg-emerald-100 text-emerald-900",
      label: "จองสำเร็จ",
      message: "การชำระเงินผ่านการตรวจสอบแล้ว พบกันตามเวลาที่จองไว้",
    };
  if (detail.status === "COMPLETED")
    return {
      actionLabel: null,
      className: "bg-zinc-100 text-zinc-700",
      label: "ใช้บริการเสร็จสิ้น",
      message: "ขอบคุณที่ใช้บริการ Horizon Music",
    };
  if (detail.status === "CANCELLED")
    return {
      actionLabel: null,
      className: "bg-zinc-100 text-zinc-700",
      label: "ยกเลิกแล้ว",
      message: "รายการนี้ถูกยกเลิกแล้ว",
    };
  return {
    actionLabel: null,
    className: "bg-zinc-100 text-zinc-700",
    label: "หมดเวลาชำระเงิน",
    message: "รายการนี้หมดเวลาชำระเงินแล้ว กรุณาสร้างการจองใหม่",
  };
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAppSession(await headers());
  if (!session) redirect("/login?callbackUrl=/bookings");
  const detail = (await getUserBooking(
    (await params).id,
    session.user.id,
  ).catch(() => null)) as Detail | null;
  if (!detail) notFound();
  const cancellable = ["PENDING_PAYMENT", "CONFIRMED"].includes(detail.status);
  const guidance = bookingGuidance(detail);
  return (
    <CustomerShell email={session.user.email} name={session.user.name}>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-medium tracking-[.16em] text-zinc-500">
            {detail.bookingNumber}
          </p>
          <h1 className="mt-3 text-4xl font-medium tracking-normal">
            {detail.roomName}
          </h1>
          <p className="mt-3 text-zinc-500">
            {formatBangkokDateTime(detail.startsAt)} —{" "}
            {formatBangkokDateTime(detail.endsAt)}
          </p>
        </div>
        <span
          className={`rounded-full px-4 py-2 text-xs font-medium ${guidance.className}`}
        >
          {guidance.label}
        </span>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-zinc-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-medium">สถานะและประวัติ</h2>
          <div className="mt-5 rounded-lg bg-zinc-100 p-5">
            <p className="text-sm font-medium">{guidance.label}</p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              {guidance.message}
            </p>
          </div>
          <ol className="mt-6 space-y-5">
            {detail.history.map((item, index) => (
              <li
                key={`${item.toStatus}-${index}`}
                className="border-l-2 border-zinc-200 pl-5"
              >
                <b>{item.toStatus}</b>
                <p className="mt-1 text-sm text-zinc-500">
                  {item.reason ?? "อัปเดตสถานะ"} ·{" "}
                  {formatBangkokDateTime(item.createdAt)}
                </p>
              </li>
            ))}
          </ol>
          {cancellable ? (
            <div className="mt-8 border-t border-zinc-100 pt-6">
              <CancelBookingButton bookingId={detail.id} />
            </div>
          ) : null}
        </section>
        <aside className="h-fit rounded-lg bg-black p-7 text-white">
          <h2 className="text-xl font-medium">สรุปยอด</h2>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-white/55">ค่าห้อง</span>
              <b>{formatThaiBaht(detail.roomSubtotal)}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-white/55">บริการเสริม</span>
              <b>{formatThaiBaht(detail.addonSubtotal)}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-white/55">ส่วนลด</span>
              <b>-{formatThaiBaht(detail.discountAmount)}</b>
            </div>
            <div className="my-5 h-px bg-white/15" />
            <div className="flex items-end justify-between">
              <span>ยอดสุทธิ</span>
              <b className="text-3xl">{formatThaiBaht(detail.totalAmount)}</b>
            </div>
          </div>
          {guidance.actionLabel ? (
            <a
              href={`/bookings/${detail.id}/payment`}
              className="mt-7 block rounded-none bg-white px-5 py-4 text-center font-medium text-black"
            >
              {guidance.actionLabel}
            </a>
          ) : null}
        </aside>
      </div>
    </CustomerShell>
  );
}
