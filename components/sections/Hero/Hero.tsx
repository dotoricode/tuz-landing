import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { getSettings, getStoreHours } from "@/lib/queries";
import { HeroStatusPill } from "./HeroStatusPill";
import { TextReveal } from "@/components/motion/TextReveal";
import { FadeUp } from "@/components/motion/FadeUp";

type HeroProps = { locale: Locale };

export async function Hero({ locale }: HeroProps) {
  const [settings, hours, t, brandT] = await Promise.all([
    getSettings(locale),
    getStoreHours(locale),
    getTranslations({ locale, namespace: "sections.hero" }),
    getTranslations({ locale, namespace: "brand" }),
  ]);

  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-tuz-paper"
      aria-labelledby="hero-heading"
    >
      {/* Deep red gradient as backdrop placeholder until a real hero image lands */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_75%_18%,rgba(165,42,26,0.12),transparent_55%),radial-gradient(circle_at_18%_88%,rgba(122,29,16,0.08),transparent_50%)]"
      />
      <div className="relative container mx-auto max-w-7xl px-5 md:px-8 pt-28 md:pt-40 pb-24 md:pb-32">
        <div className="flex items-center gap-3 mb-6 md:mb-10">
          <span className="eyebrow text-tuz-red">{t("eyebrow")}</span>
          <span aria-hidden className="h-px w-12 bg-tuz-ink/15" />
          <HeroStatusPill weekday={hours.weekday} weekend={hours.weekend} />
        </div>

        <h1
          id="hero-heading"
          className="font-display text-display-xl text-tuz-ink leading-[0.9]"
        >
          <TextReveal text={brandT("name")} />
        </h1>

        <FadeUp delay={0.28} className="mt-6 max-w-2xl">
          <p className="font-editorial text-2xl md:text-4xl text-tuz-ink-2 leading-tight">
            {settings.tagline ?? brandT("tagline")}
          </p>
        </FadeUp>

        <FadeUp delay={0.4} className="mt-12 md:mt-20 flex flex-wrap items-center gap-6">
          <a
            href="#menu"
            className="font-body text-sm text-tuz-ink hover:text-tuz-red-deep underline-offset-8 hover:underline"
          >
            ↓ Signature menu
          </a>
          <a
            href="#visit"
            className="font-body text-sm text-tuz-ink-3 hover:text-tuz-red-deep"
          >
            Visit us →
          </a>
        </FadeUp>
      </div>
    </section>
  );
}
