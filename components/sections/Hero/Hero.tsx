import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { getAbout, getSettings, getStoreHours } from "@/lib/queries";
import { HeroStatusPill } from "./HeroStatusPill";
import { TextReveal } from "@/components/motion/TextReveal";
import { FadeUp } from "@/components/motion/FadeUp";
import { AboutBubble } from "@/components/chrome/AboutBubble";
import { WifiCard } from "@/components/sections/VisitUs/WifiCard";

type HeroProps = { locale: Locale };

type LexicalNode = {
  type?: string;
  text?: string;
  children?: LexicalNode[];
};

type LexicalBody = { root?: { children?: LexicalNode[] } } | null | undefined;

function extractParagraphs(body: LexicalBody): string[] {
  const root = body?.root;
  if (!root?.children) return [];
  const walk = (nodes: LexicalNode[]): string =>
    nodes
      .map((n) => (n.text ? n.text : n.children ? walk(n.children) : ""))
      .join(" ")
      .trim();
  return root.children
    .map((node) => walk(node.children ?? []))
    .filter((p) => p.length > 0);
}

export async function Hero({ locale }: HeroProps) {
  const [settings, hours, about, t, brandT] = await Promise.all([
    getSettings(locale),
    getStoreHours(locale),
    getAbout(locale),
    getTranslations({ locale, namespace: "sections.hero" }),
    getTranslations({ locale, namespace: "brand" }),
  ]);

  const aboutParagraphs =
    about.published
      ? extractParagraphs((about as { body?: LexicalBody }).body)
      : [];

  const hasWifi = Boolean(settings.wifiSsid || settings.wifiPassword);

  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-tuz-paper"
      aria-labelledby="hero-heading"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_75%_18%,rgba(165,42,26,0.12),transparent_55%),radial-gradient(circle_at_18%_88%,rgba(122,29,16,0.08),transparent_50%)]"
      />
      <div className="relative container mx-auto max-w-7xl px-5 md:px-8 pt-24 md:pt-32 pb-16 md:pb-24">
        {hasWifi && (
          <FadeUp
            eager
            delay={0.2}
            className="mb-8 lg:mb-0 lg:absolute lg:right-8 lg:top-32 lg:w-60"
          >
            <WifiCard
              ssid={settings.wifiSsid}
              password={settings.wifiPassword}
            />
          </FadeUp>
        )}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-12">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-6 md:mb-10">
              <span className="eyebrow text-tuz-red">{t("eyebrow")}</span>
              <span aria-hidden className="h-px w-12 bg-tuz-ink/15" />
              <HeroStatusPill weekday={hours.weekday} weekend={hours.weekend} />
            </div>

            <h1
              id="hero-heading"
              className="font-display text-display-xl text-tuz-ink leading-[0.9]"
            >
              <TextReveal text={brandT("name")} trigger="immediate" />
            </h1>

            <FadeUp eager delay={0.28} className="mt-6 max-w-2xl">
              <p className="font-display text-2xl md:text-4xl text-tuz-ink-2 leading-tight">
                {settings.tagline ?? brandT("tagline")}
              </p>
            </FadeUp>

            {aboutParagraphs.length > 0 && (
              <FadeUp eager delay={0.36} className="mt-8 md:mt-10">
                <AboutBubble
                  paragraphs={aboutParagraphs}
                  signatureName={about.signatureName ?? null}
                />
              </FadeUp>
            )}

            <FadeUp
              eager
              delay={0.48}
              className="mt-8 md:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl"
            >
              <a
                href="#menu"
                className="inline-flex items-center justify-center h-12 rounded-md bg-tuz-red-deep text-tuz-paper font-body text-base font-semibold hover:bg-tuz-red transition-colors"
              >
                {t("ctaMenu")}
              </a>
              <a
                href="#pick"
                className="inline-flex items-center justify-center h-12 rounded-md border border-tuz-ink/15 bg-tuz-paper text-tuz-ink-2 font-body text-base font-semibold hover:text-tuz-red-deep hover:border-tuz-red-deep transition-colors"
              >
                {t("ctaPick")}
              </a>
              <a
                href="#hours"
                className="inline-flex items-center justify-center h-12 rounded-md border border-tuz-ink/15 bg-tuz-paper text-tuz-ink-2 font-body text-base font-semibold hover:text-tuz-red-deep hover:border-tuz-red-deep transition-colors"
              >
                {t("ctaHours")}
              </a>
            </FadeUp>
          </div>

        </div>
      </div>
    </section>
  );
}
