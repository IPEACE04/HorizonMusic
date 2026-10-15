import type { Metadata } from "next";
import { AdminActivityLogsView } from "@/features/admin/operations-workspace";

export const metadata: Metadata = { title: "Activity log — Horizon Music" };
export default function AdminActivityLogsPage() {
  return <AdminActivityLogsView />;
}
