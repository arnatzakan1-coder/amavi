import type { Metadata } from "next";
import { MapPin, Phone, Clock, Navigation, ExternalLink } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { pick } from "@/i18n";
import { getSetting } from "@/lib/data";
import { InquiryForm } from "@/components/boutique/InquiryForm";
import { TwoGisMap } from "@/components/boutique/TwoGisMap";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.boutique.title, description: t.boutique.subtitle };
}

function WhatsAppIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.7.5-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
    </svg>
  );
}

export default async function BoutiquePage() {
  const { t, locale } = await getI18n();
  const b = await getSetting("boutique");
  const address = pick(b, "address", locale);
  const phonePretty = b.phone.replace(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/, "+7 $1 $2 $3 $4");
  const hasCoords = b.lat != null && b.lon != null;
  const routeUrl = hasCoords
    ? `https://2gis.kz/almaty/directions/points/%7C${b.lon}%2C${b.lat}`
    : b.twoGisUrl ?? `https://2gis.kz/almaty/search/${encodeURIComponent(address)}`;
  const openUrl = b.twoGisUrl ?? `https://2gis.kz/almaty/search/${encodeURIComponent(address)}`;
  const mapKey = process.env.NEXT_PUBLIC_2GIS_API_KEY ?? "";

  return (
    <div className="container-lux py-10 sm:py-14">
      <p className="eyebrow">AMAVI Studio</p>
      <h1 className="mt-3 text-4xl sm:text-6xl">{t.boutique.title}</h1>
      <p className="mt-4 text-cream/75 max-w-2xl">{t.boutique.subtitle}</p>
      {!b.leaseSigned && <p className="chip mt-5 text-champagne border-gold/50">{t.boutique.openingSoon}</p>}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section className="card p-6 sm:p-8 space-y-7">
          <div className="flex gap-4">
            <MapPin className="text-gold shrink-0 mt-1" size={20} aria-hidden />
            <div>
              <h2 className="font-sans text-xs uppercase tracking-[0.2em] text-muted">{t.boutique.address}</h2>
              <p className="mt-1 font-display text-2xl">{address}</p>
              {b.areaM2 && <p className="text-xs text-muted mt-1">{b.areaM2} m²</p>}
            </div>
          </div>
          <div className="flex gap-4">
            <Clock className="text-gold shrink-0 mt-1" size={20} aria-hidden />
            <div>
              <h2 className="font-sans text-xs uppercase tracking-[0.2em] text-muted">{t.boutique.hours}</h2>
              <p className="mt-1">{b.hours ?? <span className="text-muted">{t.common.pending}</span>}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Phone className="text-gold shrink-0 mt-1" size={20} aria-hidden />
            <div>
              <h2 className="font-sans text-xs uppercase tracking-[0.2em] text-muted">{t.boutique.contacts}</h2>
              <p className="mt-1 text-lg tabular-nums">{phonePretty}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 pt-2">
            <a href={`tel:${b.phone}`} className="btn btn-gold btn-sm"><Phone size={15} aria-hidden /> {t.boutique.call}</a>
            <a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><WhatsAppIcon /> {t.boutique.whatsapp}</a>
            <a href={openUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={15} aria-hidden /> {t.boutique.open2gis}</a>
            <a href={routeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><Navigation size={15} aria-hidden /> {t.boutique.route}</a>
          </div>
        </section>

        <section className="card overflow-hidden min-h-[360px] relative" aria-label="2GIS">
          {mapKey && hasCoords ? (
            <TwoGisMap apiKey={mapKey} lat={b.lat!} lon={b.lon!} label="AMAVI" />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-8 text-center" style={{ background: "repeating-linear-gradient(45deg, #171512 0 22px, #1b1915 22px 44px)" }}>
              <div>
                <MapPin className="mx-auto text-gold" size={34} aria-hidden />
                <p className="mt-4 font-display text-2xl">{address}</p>
                <p className="mt-3 text-sm text-muted max-w-sm mx-auto">{t.boutique.mapUnavailable}</p>
                <a href={openUrl} target="_blank" rel="noopener noreferrer" className="btn btn-gold btn-sm mt-6">{t.boutique.open2gis}</a>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.3fr]" aria-labelledby="inq-h">
        <div>
          <h2 id="inq-h" className="text-4xl">{t.boutique.inquiryTitle}</h2>
          <p className="mt-3 text-cream/75">{t.boutique.inquiryText}</p>
        </div>
        <InquiryForm />
      </section>
    </div>
  );
}
