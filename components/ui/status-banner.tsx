import type { ReactNode } from "react";

export function StatusBanner({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "success" | "info";
}) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-zinc-200 bg-zinc-100 text-zinc-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-none border p-4 text-sm ${tones[tone]}`}
    >
      {children}
    </div>
  );
}
