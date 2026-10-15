import type { Metadata } from "next";
import { AdminUsersView } from "@/features/admin/operations-workspace";

export const metadata: Metadata = { title: "ผู้ใช้งาน — Horizon Music" };
export default function AdminUsersPage() {
  return <AdminUsersView />;
}
