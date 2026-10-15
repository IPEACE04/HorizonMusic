import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CustomerShell } from "@/components/customer-shell";
import { ProfileForm } from "@/features/auth/profile-form";
import { ProfileAvatar } from "@/features/auth/profile-avatar";
import { getAppSession } from "@/server/auth/session";
import { profileRepository } from "@/server/profile";

export default async function ProfilePage() {
  const session = await getAppSession(await headers());
  if (!session) redirect("/login?callbackUrl=/profile");
  const profile = await profileRepository
    .findByUserId(session.user.id)
    .catch(() => null);
  const [firstName = session.user.name, ...lastNameParts] =
    session.user.name.split(" ");
  const initialProfile = profile ?? {
    email: session.user.email,
    firstName,
    lastName: lastNameParts.join(" "),
    phone: "",
    userId: session.user.id,
  };

  return (
    <CustomerShell email={session.user.email} name={session.user.name}>
      <div className="mx-auto w-full max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-medium tracking-[.16em] text-zinc-500">
            ACCOUNT
          </p>
          <h1 className="mt-3 text-3xl font-normal tracking-normal sm:text-4xl">
            ข้อมูลส่วนตัว
          </h1>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-zinc-500">
            ข้อมูลนี้ใช้สำหรับติดต่อเกี่ยวกับการจองและการชำระเงินของคุณ
          </p>
        </div>
        <div className="mt-8 border border-zinc-200 bg-white p-5 sm:p-8">
          <ProfileAvatar initialImage={session.user.image ?? null} />
          <ProfileForm initialProfile={initialProfile} />
        </div>
      </div>
    </CustomerShell>
  );
}
