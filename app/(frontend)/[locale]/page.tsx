import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/lib/i18n/routing";
import { getAllMenuItems } from "@/lib/queries";
import { Hero } from "@/components/sections/Hero/Hero";
import { WinnersStrip } from "@/components/sections/Footer/WinnersStrip";
import { Notice } from "@/components/sections/Notice/Notice";
import { TodaysPick } from "@/components/sections/TodaysPick/TodaysPick";
import { VisitUs } from "@/components/sections/VisitUs/VisitUs";
import { Faq } from "@/components/sections/Faq/Faq";
import { Gallery } from "@/components/sections/Gallery/Gallery";
import { MenuModal } from "@/components/chrome/MenuModal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const loc = locale as Locale;

  const menuItems = await getAllMenuItems(loc);

  return (
    <>
      <Hero locale={loc} />
      <WinnersStrip locale={loc} />
      <Notice locale={loc} />
      <TodaysPick locale={loc} />
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <VisitUs locale={loc} />
        <Faq locale={loc} />
      </div>
      <Gallery locale={loc} />
      <MenuModal items={menuItems} />
    </>
  );
}
