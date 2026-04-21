import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import type { Locale } from "@/lib/i18n/routing";
import { getLocation, getSettings } from "@/lib/queries";
import { SectionAnchor } from "@/components/chrome/SectionAnchor";
import { FadeUp } from "@/components/motion/FadeUp";
import { WifiCard } from "./WifiCard";
import { AddressCopy } from "./AddressCopy";

export async function VisitUs({ locale }: { locale: Locale }) {
  const [location, settings, t] = await Promise.all([
    getLocation(locale),
    getSettings(locale),
    getTranslations({ locale, namespace: "sections.visit" }),
  ]);

  const address = location.address ?? "";
  const mapHref = location.lat && location.lng
    ? `https://map.kakao.com/link/map/${encodeURIComponent(
        address,
      )},${location.lat},${location.lng}`
    : undefined;

  // Place coordinates for port city signature
  const coord =
    location.lat && location.lng
      ? `${location.lat.toFixed(4)}° N, ${location.lng.toFixed(4)}° E`
      : null;

  return (
    <SectionAnchor id="visit" aria-labelledby="visit-heading">
      <div className="container mx-auto max-w-7xl px-5 md:px-8">
        <FadeUp className="mb-10 md:mb-14 max-w-2xl">
          <p className="eyebrow text-tuz-red">{t("eyebrow")}</p>
          <h2
            id="visit-heading"
            className="mt-4 font-display text-display-lg text-tuz-ink"
          >
            {t("title")}
          </h2>
          {coord && (
            <p className="mt-3 font-mono text-xs tracking-widest uppercase text-tuz-ink-3">
              {coord} · Ulsan
            </p>
          )}
        </FadeUp>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-12 items-start">
          {/* Map placeholder — Sprint 2b will wire Kakao SDK lazily */}
          <FadeUp className="relative aspect-[4/3] lg:aspect-[5/4] rounded-lg overflow-hidden bg-tuz-ivory border border-tuz-ink/10">
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center px-6">
                <MapPin className="size-6 text-tuz-red mx-auto" aria-hidden />
                <p className="mt-3 font-editorial italic text-tuz-ink-2">
                  {location.addressShort ?? address}
                </p>
                <p className="mt-1 font-mono text-xs text-tuz-ink-3">
                  {coord ?? ""}
                </p>
                {mapHref && (
                  <a
                    href={mapHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block font-body text-sm text-tuz-red-deep underline-offset-4 hover:underline"
                  >
                    {t("directions")} ↗
                  </a>
                )}
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.08} className="flex flex-col gap-5">
            <WifiCard ssid={settings.wifiSsid} password={settings.wifiPassword} />
            <div className="rounded-lg border border-tuz-ink/10 p-6 md:p-7 bg-tuz-paper">
              <p className="eyebrow text-tuz-ink-3 mb-3">Address</p>
              <p className="font-display text-2xl md:text-3xl text-tuz-ink leading-snug">
                {address}
              </p>
              {location.phone && (
                <p className="mt-3 font-mono text-sm text-tuz-ink-2">
                  {location.phone}
                </p>
              )}
              <div className="mt-5">
                <AddressCopy address={address} />
              </div>
            </div>
          </FadeUp>
        </div>
      </div>
    </SectionAnchor>
  );
}
