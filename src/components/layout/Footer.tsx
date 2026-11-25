import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { getSetting } from "@/lib/data";
import { pick } from "@/i18n";
import { Wordmark } from "./Wordmark";

export async function Footer() {
  const { t, locale } = await getI18n();
  const b = await getSetting("boutique");
  const phonePretty = b.phone.replace(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/, "+7 $1 $2 $3 $4");
  return (
    <footer className="border-t border-line mt-24">
      <div className="container-lux py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-5 text-muted max-w-sm text-sm">{t.home.closingText}</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[
            ["/book", t.nav.book],
            ["/formulas", t.nav.formulas],
            ["/collection", t.nav.collection],
            ["/account", t.nav.account],
            ["/about", t.nav.about],
            ["/boutique", t.nav.boutique],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="text-cream/75 hover:text-champagne py-1">
              {label}
            </Link>
          ))}
        </nav>
        <address className="not-italic text-sm text-cream/75 space-y-2">
          <p>{pick(b, "address", locale)}</p>
          {b.hours && <p>{t.boutique.hours}: {b.hours}, {t.boutique.daily}</p>}
          <p>
            <a href={`tel:${b.phone}`} className="hover:text-champagne">{phonePretty}</a>
          </p>
          <p>
            <a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-champagne">
              WhatsApp
            </a>
          </p>
        </address>
      </div>
      <div className="border-t border-line">
        <div className="container-lux py-5 flex flex-col sm:flex-row gap-2 justify-between text-xs text-muted-dark">
          <span>© {new Date().getFullYear()} AMAVI. {t.footer.rights}</span>
          <span>{t.footer.privacy}</span>
        </div>
      </div>
    </footer>
  );
}
