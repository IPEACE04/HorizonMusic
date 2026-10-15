import type { Metadata } from "next";
import { AdminCalendarView } from "@/features/admin/operations-workspace";

export const metadata: Metadata = { title: "ปฏิทิน — Horizon Music" };
export default function AdminCalendarPage() {
  return <AdminCalendarView referenceDate={new Date().toISOString()} />;
}
