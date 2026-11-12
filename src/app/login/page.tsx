import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, enabledOAuth } from "@/auth";
import { getI18n } from "@/i18n/server";
import { AuthForm } from "@/components/auth/AuthForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.loginTitle, robots: { index: false } };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; registered?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/account";
  if ((await auth())?.user) redirect(next);
  return (
    <div className="container-lux py-12 sm:py-20 grid place-items-center">
      <AuthForm mode="login" next={next} oauth={enabledOAuth} registered={sp.registered === "1"} />
    </div>
  );
}
