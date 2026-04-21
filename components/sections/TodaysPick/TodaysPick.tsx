import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { getTodayPicks } from "@/lib/queries";
import { SectionAnchor } from "@/components/chrome/SectionAnchor";
import { BaristaPickCard } from "./BaristaPickCard";
import { FadeUp } from "@/components/motion/FadeUp";

export async function TodaysPick({ locale }: { locale: Locale }) {
  const [picks, t] = await Promise.all([
    getTodayPicks(locale),
    getTranslations({ locale, namespace: "sections.pick" }),
  ]);

  const big = picks.find((p) => p.barista === "owner_big");
  const small = picks.find((p) => p.barista === "owner_small");

  if (!big && !small) {
    return null;
  }

  return (
    <SectionAnchor id="pick" aria-labelledby="pick-heading" dense>
      <div className="container mx-auto max-w-7xl px-5 md:px-8">
        <FadeUp className="mb-12 md:mb-20 text-center">
          <p className="eyebrow text-tuz-red">{t("eyebrow")}</p>
          <h2
            id="pick-heading"
            className="mt-4 font-display text-display-lg text-tuz-ink"
          >
            {t("title")}
          </h2>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] md:gap-10 gap-16 items-start">
          <FadeUp>
            {big ? (
              <BaristaPickCard pick={big} baristaLabel={t("ownerBig")} locale={locale} />
            ) : (
              <div className="rounded-lg border border-dashed border-tuz-ink/15 p-10 text-center text-tuz-ink-3">
                {t("ownerBig")} · TBD
              </div>
            )}
          </FadeUp>

          {/* Editorial vertical rule + ampersand — dialogue between the two owners */}
          <div className="hidden md:flex items-center justify-center h-full">
            <div className="relative h-full">
              <span
                aria-hidden
                className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-tuz-red/25"
              />
              <span
                aria-hidden
                className="relative top-1/2 -translate-y-1/2 block font-editorial italic text-5xl text-tuz-red px-3 bg-tuz-paper"
              >
                &amp;
              </span>
            </div>
          </div>

          <FadeUp delay={0.1}>
            {small ? (
              <BaristaPickCard pick={small} baristaLabel={t("ownerSmall")} locale={locale} />
            ) : (
              <div className="rounded-lg border border-dashed border-tuz-ink/15 p-10 text-center text-tuz-ink-3">
                {t("ownerSmall")} · TBD
              </div>
            )}
          </FadeUp>
        </div>
      </div>
    </SectionAnchor>
  );
}
