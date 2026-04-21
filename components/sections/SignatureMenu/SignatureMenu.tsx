import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { getSignatureMenu } from "@/lib/queries";
import { SectionAnchor } from "@/components/chrome/SectionAnchor";
import { MenuCard } from "./MenuCard";
import { MenuCarousel } from "./MenuCarousel";
import { FadeUp } from "@/components/motion/FadeUp";
import { TextReveal } from "@/components/motion/TextReveal";

export async function SignatureMenu({ locale }: { locale: Locale }) {
  const [items, t] = await Promise.all([
    getSignatureMenu(locale),
    getTranslations({ locale, namespace: "sections.menu" }),
  ]);

  return (
    <SectionAnchor id="signature" aria-labelledby="signature-heading" dense>
      <div className="container mx-auto max-w-7xl px-5 md:px-8">
        <FadeUp className="mb-8 md:mb-12 max-w-2xl">
          <p className="eyebrow text-tuz-red">{t("eyebrow")}</p>
          <h2
            id="signature-heading"
            className="mt-3 font-body text-display-md text-tuz-ink"
          >
            <TextReveal text={t("title")} />
          </h2>
          <p className="mt-3 font-body text-base md:text-lg text-tuz-ink-2">
            {t("description")}
          </p>
        </FadeUp>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-tuz-ink/15 p-10 text-center text-tuz-ink-3 font-body">
            아직 등록된 시그니처 메뉴가 없습니다. /admin 에서 추가하세요.
          </div>
        ) : (
          <>
            {/* Desktop: even 3-column grid (hero tile removed) */}
            <div className="hidden md:grid md:grid-cols-3 md:gap-5">
              {items.slice(0, 6).map((item, i) => (
                <FadeUp key={item.id} delay={0.06 * i}>
                  <MenuCard item={item} size="md" className="h-full" />
                </FadeUp>
              ))}
            </div>

            {/* Mobile: carousel */}
            <div className="md:hidden">
              <MenuCarousel items={items} />
            </div>
          </>
        )}
      </div>
    </SectionAnchor>
  );
}
