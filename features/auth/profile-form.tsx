"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { RiSave3Line } from "react-icons/ri";

import { FormField } from "@/components/ui/form-field";
import { StatusBanner } from "@/components/ui/status-banner";
import {
  InputValidationError,
  parseProfileInput,
} from "@/features/auth/contracts";

type Profile = Readonly<{
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}>;

export function ProfileForm({ initialProfile }: { initialProfile: Profile }) {
  const router = useRouter();
  const [form, setForm] = useState(initialProfile);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);
  const [pending, setPending] = useState(false);
  const update =
    (key: "firstName" | "lastName" | "phone") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
      setStatus(null);
    };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setFieldErrors({});
    let input;
    try {
      input = parseProfileInput(form);
    } catch (error) {
      if (error instanceof InputValidationError) {
        setFieldErrors({ ...error.fieldErrors });
        setStatus({ message: error.message, tone: "error" });
      }
      return;
    }

    setPending(true);
    const response = await fetch("/api/v1/profile", {
      body: JSON.stringify(input),
      headers: { "content-type": "application/json" },
      method: "PUT",
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: { fieldErrors?: Record<string, string>; message?: string };
    } | null;
    if (!response.ok) {
      setFieldErrors(payload?.error?.fieldErrors ?? {});
      setStatus({
        message: payload?.error?.message ?? "ไม่สามารถบันทึกข้อมูลได้",
        tone: "error",
      });
      setPending(false);
      return;
    }
    setStatus({ message: "บันทึกข้อมูลส่วนตัวแล้ว", tone: "success" });
    setPending(false);
    router.refresh();
  }

  return (
    <form noValidate onSubmit={submit} className="mt-8 space-y-5">
      {status ? (
        <StatusBanner tone={status.tone}>{status.message}</StatusBanner>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="profile-first-name"
          label="ชื่อ"
          autoComplete="given-name"
          value={form.firstName}
          onChange={update("firstName")}
          error={fieldErrors.firstName}
          disabled={pending}
        />
        <FormField
          id="profile-last-name"
          label="นามสกุล"
          autoComplete="family-name"
          value={form.lastName}
          onChange={update("lastName")}
          error={fieldErrors.lastName}
          disabled={pending}
        />
      </div>
      <FormField
        id="profile-email"
        label="อีเมล"
        type="email"
        value={form.email}
        disabled
        hint="การเปลี่ยนอีเมลจะเปิดใน Account Security ภายหลัง"
      />
      <FormField
        id="profile-phone"
        label="เบอร์โทรศัพท์"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={form.phone}
        onChange={update("phone")}
        error={fieldErrors.phone}
        disabled={pending}
      />
      <div className="flex justify-end border-t border-zinc-200 pt-6">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex min-h-13 items-center gap-2 rounded-none bg-black px-6 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60"
        >
          <RiSave3Line />
          {pending ? "กำลังบันทึก…" : "บันทึกโปรไฟล์"}
        </button>
      </div>
    </form>
  );
}
