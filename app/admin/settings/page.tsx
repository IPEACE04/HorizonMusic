import type { Metadata } from "next";
import { AdminSettingsView } from "@/features/admin/operations-workspace";

export const metadata: Metadata = { title: "ตั้งค่า — Horizon Music" };
export default function AdminSettingsPage() {
  return <AdminSettingsView />;
}
