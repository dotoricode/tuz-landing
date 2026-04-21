import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { getAbout } from "@/lib/queries";
import { SectionAnchor } from "@/components/chrome/SectionAnchor";
import { FadeUp } from "@/components/motion/FadeUp";
import { TextReveal } from "@/components/motion/TextReveal";
import { AboutStory } from "@/components/sections/StoreInfo/AboutStory";

export async function About({ locale }: { locale: Locale }) {
  const [about, t] = await Promise.all([
    getAbout(locale),
    getTranslations({ locale, namespace: "sections.about" }),
  ]);

  if (!about.published) return null;

  return (
    <SectionAnchor id="about" aria-labelledby="about-heading">
      <div className="container mx-auto max-w-5xl px-5 md:px-8">
        <FadeUp className="mb-10 md:mb-14 max-w-2xl">
          <p className="eyebrow text-tuz-red">{t("eyebrow")}</p>
          <h2
            id="about-heading"
            className="mt-3 font-body text-display-md text-tuz-ink"
          >
            <TextReveal text={t("title")} />
          </h2>
        </FadeUp>

        <FadeUp delay={0.06}>
          <AboutStory about={about} />
        </FadeUp>
      </div>
    </SectionAnchor>
  );
}
