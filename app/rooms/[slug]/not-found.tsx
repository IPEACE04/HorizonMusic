import Link from "next/link";
import { RiArrowLeftLine, RiMusic2Line } from "react-icons/ri";

export default function RoomNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--canvas)] p-6">
      <section className="w-full max-w-xl rounded-lg bg-[var(--panel)] p-10 text-center sm:p-16">
        <RiMusic2Line className="mx-auto text-4xl" />
        <h1 className="mt-6 text-4xl font-medium tracking-normal">
          ไม่พบห้องนี้
        </h1>
        <p className="mt-3 text-zinc-500">
          ห้องอาจยังไม่เผยแพร่หรือถูกนำออกจากระบบแล้ว
        </p>
        <Link
          href="/rooms"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 font-medium text-white"
        >
          <RiArrowLeftLine /> ดูห้องทั้งหมด
        </Link>
      </section>
    </main>
  );
}
