"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RiCameraLine } from "react-icons/ri";
import { UserAvatar } from "@/components/user-avatar";
import { StatusBanner } from "@/components/ui/status-banner";
import { validateProfileImage } from "@/features/auth/profile-image-contract";

export function ProfileAvatar({ initialImage }: { initialImage: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [savedImage, setSavedImage] = useState(initialImage);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ tone: "error" | "success"; message: string } | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function save() {
    if (!file || pending) return;
    setPending(true);
    setStatus(null);
    try {
      const data = new FormData();
      data.set("image", file);
      const response = await fetch("/api/v1/profile/image", { method: "POST", body: data });
      const result = await response.json() as { data?: { image?: string }; error?: { message?: string } };
      if (!response.ok || !result.data?.image) throw new Error(result.error?.message ?? "ไม่สามารถบันทึกรูปโปรไฟล์ได้");
      setSavedImage(result.data.image);
      setFile(null);
      setPreview(null);
      setStatus({ tone: "success", message: "บันทึกรูปโปรไฟล์แล้ว" });
      router.refresh();
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "ไม่สามารถบันทึกรูปโปรไฟล์ได้" });
    } finally {
      setPending(false);
    }
  }

  const image = preview ?? savedImage;
  return (
    <section aria-label="รูปโปรไฟล์" className="flex flex-col items-center border-b border-zinc-200 pb-7 text-center">
      <UserAvatar image={image} className="size-28 border-2 sm:size-32" />
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-label="เลือกรูปโปรไฟล์" disabled={pending} onChange={(event) => {
        const selected = event.target.files?.[0];
        event.target.value = "";
        if (!selected) return;
        try {
          validateProfileImage(selected);
          setFile(selected);
          setPreview(URL.createObjectURL(selected));
          setStatus(null);
        } catch (error) {
          setStatus({ tone: "error", message: error instanceof Error ? error.message : "รูปภาพไม่ถูกต้อง" });
        }
      }} />
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <button type="button" className="studio-button studio-button--secondary" onClick={() => input.current?.click()} disabled={pending}><RiCameraLine aria-hidden /> เปลี่ยนรูปโปรไฟล์</button>
        {file ? <>
          <button type="button" className="studio-button studio-button--primary" onClick={() => void save()} disabled={pending} aria-busy={pending}>{pending ? "กำลังอัปโหลด…" : "บันทึกรูป"}</button>
          <button type="button" className="studio-button studio-button--secondary" disabled={pending} onClick={() => { setFile(null); setPreview(null); setStatus(null); }}>ยกเลิก</button>
        </> : null}
      </div>
      <p className="mt-3 text-xs text-zinc-500">JPG, PNG หรือ WebP ขนาดไม่เกิน 3 MB</p>
      {status ? <div className="mt-4 w-full"><StatusBanner tone={status.tone}>{status.message}</StatusBanner></div> : null}
    </section>
  );
}
