import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { getAllMenuItems } from "@/lib/queries";
import { SectionAnchor } from "@/components/chrome/SectionAnchor";
import { FadeUp } from "@/components/motion/FadeUp";
import { TextReveal } from "@/components/motion/TextReveal";
import { MenuListRow } from "./MenuListRow";

const CATEGORY_ORDER = [
  "COFFEE",
  "NON_COFFEE",
  "BAKERY",
  "DESSERT",
  "SEASONAL",
] as const;

export async function Menu({ locale }: { locale: Locale }) {
  const [items, t] = await Promise.all([
    getAllMenuItems(locale),
    getTranslations({ locale, namespace: "sections.menuList" }),
  ]);

  if (items.length === 0) return null;

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <SectionAnchor id="menu" aria-labelledby="menu-heading">
      <div className="container mx-auto max-w-3xl px-5 md:px-8">
        <FadeUp className="mb-10 md:mb-14">
          <p className="eyebrow text-tuz-red">{t("eyebrow")}</p>
          <h2
            id="menu-heading"
            className="mt-3 font-body text-display-md text-tuz-ink"
          >
            <TextReveal text={t("title")} />
          </h2>
        </FadeUp>

        <div className="flex flex-col gap-10 md:gap-14">
          {byCategory.map(({ category, items: catItems }, i) => (
            <FadeUp key={category} delay={0.05 * i}>
              <h3 className="font-mono text-sm uppercase tracking-[0.18em] text-tuz-ink-3 mb-4 pb-2 border-b border-tuz-ink/10">
                {t(`categories.${category}`)}
              </h3>
              <ul className="divide-y divide-tuz-ink/8">
                {catItems.map((item) => (
                  <MenuListRow key={item.id} item={item} />
                ))}
              </ul>
            </FadeUp>
          ))}
        </div>
      </div>
    </SectionAnchor>
  );
}
