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
    <SectionAnchor id="menu" aria-labelledby="menu-heading">
      <div className="container mx-auto max-w-7xl px-5 md:px-8">
        <FadeUp className="mb-10 md:mb-16 max-w-2xl">
          <p className="eyebrow text-tuz-red">{t("eyebrow")}</p>
          <h2
            id="menu-heading"
            className="mt-4 font-body text-display-lg text-tuz-ink"
          >
            <TextReveal text={t("title")} />
          </h2>
          <p className="mt-4 font-body text-lg md:text-xl text-tuz-ink-2">
            {t("description")}
          </p>
        </FadeUp>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-tuz-ink/15 p-10 text-center text-tuz-ink-3 font-body">
            아직 등록된 시그니처 메뉴가 없습니다. /admin 에서 추가하세요.
          </div>
        ) : (
          <>
            {/* Desktop: editorial bento — first item takes a 2×2 hero tile */}
            <div className="hidden md:grid md:grid-cols-3 md:grid-rows-2 md:gap-5 md:auto-rows-[260px]">
              {items.slice(0, 5).map((item, i) => (
                <FadeUp
                  key={item.id}
                  delay={0.06 * i}
                  className={
                    i === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-1"
                  }
                >
                  <MenuCard
                    item={item}
                    size={i === 0 ? "lg" : "md"}
                    className="h-full"
                  />
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
