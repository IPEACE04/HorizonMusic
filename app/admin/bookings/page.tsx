import type { Metadata } from "next";
import { AdminBookingsView } from "@/features/admin/operations-workspace";

export const metadata: Metadata = { title: "การจอง — Horizon Music" };
export default function AdminBookingsPage() {
  return <AdminBookingsView />;
}
