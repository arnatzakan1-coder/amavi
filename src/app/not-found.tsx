import Link from "next/link";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="container-lux py-28 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 text-5xl">AMAVI</h1>
      <Link href="/" className="btn btn-gold mt-10">{t.nav.home}</Link>
    </div>
  );
}
