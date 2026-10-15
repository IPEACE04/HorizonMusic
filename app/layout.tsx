import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Prompt } from "next/font/google";
import { headers } from "next/headers";
import { getAppSession } from "@/server/auth/session";
import { FloatingSupportChat } from "@/features/chat/floating-support-chat";
import "./globals.css";

const prompt = Prompt({
  display: "swap",
  subsets: ["latin", "thai"],
  variable: "--font-prompt",
  weight: ["200", "300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Horizon Music | จองห้องซ้อมและห้องบันทึกเสียง",
  description: "จองห้องซ้อมและห้องบันทึกเสียงกับ The Horizon Music ที่ Soccer Pro Ratchada 18 ติดต่อ 062-309-8937",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getAppSession(await headers()).catch(() => null);
  return (
    <html lang="th" className={prompt.variable}>
      <body>
        {children}
        <FloatingSupportChat currentUserId={session?.user.id ?? null} />
      </body>
    </html>
  );
}
