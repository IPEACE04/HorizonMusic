import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/features/auth/register-form";

function safeCallback(value: string | string[] | undefined) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : "/profile";
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
    <AuthShell eyebrow="CREATE ACCOUNT" title="เริ่มต้น session แรกกับเรา">
      <RegisterForm callbackUrl={safeCallback(query.callbackUrl)} />
    </AuthShell>
  );
}
