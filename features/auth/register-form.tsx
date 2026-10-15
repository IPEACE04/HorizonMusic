"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { RiArrowRightLine } from "react-icons/ri";

import { FormField } from "@/components/ui/form-field";
import { PasswordField } from "@/components/ui/password-field";
import { StatusBanner } from "@/components/ui/status-banner";
import {
  InputValidationError,
  parseRegistrationInput,
} from "@/features/auth/contracts";
import { authClient } from "@/lib/auth-client";

const initialForm = {
  confirmPassword: "",
  email: "",
  firstName: "",
  lastName: "",
  password: "",
  phone: "",
};

export function RegisterForm({
  callbackUrl = "/profile",
}: {
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const update =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
      if (fieldErrors[key])
        setFieldErrors((current) => ({ ...current, [key]: "" }));
    };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    let input;
    try {
      input = parseRegistrationInput(form);
    } catch (validationError) {
      if (validationError instanceof InputValidationError) {
        setError(validationError.message);
        setFieldErrors({ ...validationError.fieldErrors });
      }
      return;
    }

    setPending(true);
    const authResult = await authClient.signUp.email({
      email: input.email,
      name: `${input.firstName} ${input.lastName}`,
      password: input.password,
    });
    if (authResult.error) {
      setError("ไม่สามารถสมัครสมาชิกได้ อีเมลนี้อาจถูกใช้งานแล้ว");
      setPending(false);
      return;
    }

    const profileResponse = await fetch("/api/v1/profile", {
      body: JSON.stringify({
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      }),
      headers: { "content-type": "application/json" },
      method: "PUT",
    });
    if (!profileResponse.ok) {
      setError(
        "สร้างบัญชีแล้ว แต่บันทึกข้อมูลส่วนตัวยังไม่สำเร็จ กรุณาลองอีกครั้ง",
      );
      setPending(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      {error ? <StatusBanner>{error}</StatusBanner> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="first-name"
          label="ชื่อ"
          autoComplete="given-name"
          value={form.firstName}
          onChange={update("firstName")}
          error={fieldErrors.firstName}
          disabled={pending}
        />
        <FormField
          id="last-name"
          label="นามสกุล"
          autoComplete="family-name"
          value={form.lastName}
          onChange={update("lastName")}
          error={fieldErrors.lastName}
          disabled={pending}
        />
      </div>
      <FormField
        id="register-email"
        label="อีเมล"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={form.email}
        onChange={update("email")}
        error={fieldErrors.email}
        disabled={pending}
      />
      <FormField
        id="phone"
        label="เบอร์โทรศัพท์"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={form.phone}
        onChange={update("phone")}
        error={fieldErrors.phone}
        hint="ตัวอย่าง 0812345678"
        disabled={pending}
      />
      <PasswordField
        id="register-password"
        label="รหัสผ่าน"
        autoComplete="new-password"
        value={form.password}
        onChange={update("password")}
        error={fieldErrors.password}
        hint="อย่างน้อย 8 ตัวอักษร"
        disabled={pending}
      />
      <PasswordField
        id="confirm-password"
        label="ยืนยันรหัสผ่าน"
        autoComplete="new-password"
        value={form.confirmPassword}
        onChange={update("confirmPassword")}
        error={fieldErrors.confirmPassword}
        disabled={pending}
      />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="studio-button studio-button--primary min-h-14 w-full justify-between px-5"
      >
        <span>{pending ? "กำลังสร้างบัญชี…" : "สมัครสมาชิก"}</span>
        <RiArrowRightLine aria-hidden />
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        มีบัญชีแล้ว?{" "}
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-medium text-[var(--ink)] underline-offset-4 hover:underline"
        >
          เข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}
