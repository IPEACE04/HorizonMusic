import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/features/auth/login-form";

function safeCallback(value: string | string[] | undefined) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : "/profile";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
    <AuthShell eyebrow="WELCOME BACK" title="กลับเข้าสู่จังหวะของคุณ">
      <LoginForm callbackUrl={safeCallback(query.callbackUrl)} />
    </AuthShell>
  );
}
