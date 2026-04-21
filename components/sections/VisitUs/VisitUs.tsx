import { getTranslations } from "next-intl/server";
import { Phone, MapPin, ArrowUpRight } from "lucide-react";
import type { Locale } from "@/lib/i18n/routing";
import { getLocation } from "@/lib/queries";
import { SectionAnchor } from "@/components/chrome/SectionAnchor";
import { FadeUp } from "@/components/motion/FadeUp";
import { TextReveal } from "@/components/motion/TextReveal";
import { AddressCopy } from "./AddressCopy";

export async function VisitUs({ locale }: { locale: Locale }) {
  const [location, t] = await Promise.all([
    getLocation(locale),
    getTranslations({ locale, namespace: "sections.visit" }),
  ]);

  const address = location.address ?? "";
  const kakaoHref = location.lat && location.lng
    ? `https://map.kakao.com/link/map/${encodeURIComponent(
        address,
      )},${location.lat},${location.lng}`
    : undefined;
  const naverHref = location.lat && location.lng
    ? `https://map.naver.com/v5/search/${encodeURIComponent(address)}`
    : undefined;
  const telHref = location.phone ? `tel:${location.phone.replace(/\s+/g, "")}` : null;

  return (
    <SectionAnchor id="visit" aria-labelledby="visit-heading">
      <div className="container mx-auto max-w-7xl px-5 md:px-8">
        <FadeUp className="mb-10 md:mb-14 max-w-2xl">
          <p className="eyebrow text-tuz-red">{t("eyebrow")}</p>
          <h2
            id="visit-heading"
            className="mt-4 font-body text-display-lg text-tuz-ink"
          >
            <TextReveal text={t("title")} />
          </h2>
        </FadeUp>

        <div className="flex flex-col gap-6 md:gap-8">
          <FadeUp className="relative rounded-lg overflow-hidden bg-tuz-ivory border border-tuz-ink/10 p-6 md:p-8">
            <div className="flex items-start gap-3 mb-5">
              <MapPin className="size-6 text-tuz-red shrink-0 mt-1" aria-hidden />
              <div>
                <p className="eyebrow text-tuz-ink-3">{t("eyebrow")}</p>
                <p className="mt-2 font-body text-xl md:text-2xl text-tuz-ink leading-snug">
                  {location.addressShort ?? address}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {kakaoHref && (
                <a
                  href={kakaoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-between gap-3 min-h-[52px] px-5 rounded-md bg-tuz-red-deep text-tuz-paper font-body text-base md:text-lg font-semibold hover:bg-tuz-red transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="size-5" aria-hidden />
                    {t("kakaoDirections")}
                  </span>
                  <ArrowUpRight className="size-5 opacity-80" aria-hidden />
                </a>
              )}
              {naverHref && (
                <a
                  href={naverHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-between gap-3 min-h-[52px] px-5 rounded-md border border-tuz-ink/15 bg-tuz-paper text-tuz-ink font-body text-base md:text-lg font-semibold hover:bg-tuz-ivory transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="size-5 text-tuz-red" aria-hidden />
                    {t("naverDirections")}
                  </span>
                  <ArrowUpRight className="size-5 opacity-60" aria-hidden />
                </a>
              )}
            </div>
          </FadeUp>

          <FadeUp delay={0.08} className="flex flex-col gap-5">
            <div className="rounded-lg border border-tuz-ink/10 p-6 md:p-7 bg-tuz-paper">
              <p className="eyebrow text-tuz-ink-3 mb-3">{t("eyebrow")}</p>
              <p className="font-body text-xl md:text-2xl text-tuz-ink-2 leading-snug">
                {address}
              </p>

              {telHref && location.phone && (
                <div className="mt-5 pt-5 border-t border-tuz-ink/8">
                  <p className="eyebrow text-tuz-ink-3 mb-3">
                    {t("phoneLabel")}
                  </p>
                  <a
                    href={telHref}
                    className="inline-flex items-center gap-3 font-body text-2xl md:text-3xl font-semibold text-tuz-ink hover:text-tuz-red-deep"
                    aria-label={`${t("callNow")} ${location.phone}`}
                  >
                    <Phone className="size-6 text-tuz-red" aria-hidden />
                    <span>{location.phone}</span>
                  </a>
                </div>
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
