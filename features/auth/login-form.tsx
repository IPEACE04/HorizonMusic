"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { RiArrowRightLine } from "react-icons/ri";

import { FormField } from "@/components/ui/form-field";
import { PasswordField } from "@/components/ui/password-field";
import { StatusBanner } from "@/components/ui/status-banner";
import { authClient } from "@/lib/auth-client";
import {
  InputValidationError,
  parseLoginInput,
} from "@/features/auth/contracts";
import { postLoginDestination } from "@/features/auth/post-login-destination";

export function LoginForm({
  callbackUrl = "/profile",
}: {
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    let input;
    try {
      input = parseLoginInput({ email, password });
    } catch (validationError) {
      setError(
        validationError instanceof InputValidationError
          ? validationError.message
          : "กรุณาตรวจสอบข้อมูล",
      );
      return;
    }

    setPending(true);
    const result = await authClient.signIn.email(input);
    if (result.error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setPassword("");
      setPending(false);
      return;
    }
    router.replace(postLoginDestination(result.data?.user.role, callbackUrl));
    router.refresh();
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      {error ? <StatusBanner>{error}</StatusBanner> : null}
      <FormField
        id="login-email"
        label="อีเมล"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={pending}
      />
      <PasswordField
        id="login-password"
        label="รหัสผ่าน"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={pending}
      />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="studio-button studio-button--primary min-h-14 w-full justify-between px-5"
      >
        <span>{pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</span>
        <RiArrowRightLine aria-hidden />
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        ยังไม่มีบัญชี?{" "}
        <Link
          href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-medium text-[var(--ink)] underline-offset-4 hover:underline"
        >
          สมัครสมาชิก
        </Link>
      </p>
    </form>
  );
}
