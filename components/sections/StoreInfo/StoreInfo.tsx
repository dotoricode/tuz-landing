import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { getStoreHours } from "@/lib/queries";
import { SectionAnchor } from "@/components/chrome/SectionAnchor";
import { FadeUp } from "@/components/motion/FadeUp";
import { TextReveal } from "@/components/motion/TextReveal";
import { HoursTable } from "./HoursTable";

export async function StoreInfo({ locale }: { locale: Locale }) {
  const [hours, t] = await Promise.all([
    getStoreHours(locale),
    getTranslations({ locale, namespace: "sections.store" }),
  ]);

  return (
    <SectionAnchor id="store" aria-labelledby="store-heading" dense>
      <div className="container mx-auto max-w-3xl px-5 md:px-8">
        <FadeUp>
          <p className="eyebrow text-tuz-red">{t("eyebrow")}</p>
          <h2
            id="store-heading"
            className="mt-4 font-body text-display-md text-tuz-ink"
          >
            <TextReveal text={t("title")} />
          </h2>
          <div className="mt-8">
            <HoursTable
              weekday={hours.weekday}
              weekend={hours.weekend}
              regularClosure={hours.regularClosure}
            />
          </div>
        </FadeUp>
      </div>
    </SectionAnchor>
  );
}
