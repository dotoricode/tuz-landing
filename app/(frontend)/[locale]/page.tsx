import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/lib/i18n/routing";
import { Hero } from "@/components/sections/Hero/Hero";
import { SignatureMenu } from "@/components/sections/SignatureMenu/SignatureMenu";
import { TodaysPick } from "@/components/sections/TodaysPick/TodaysPick";
import { Notice } from "@/components/sections/Notice/Notice";
import { Gallery } from "@/components/sections/Gallery/Gallery";
import { VisitUs } from "@/components/sections/VisitUs/VisitUs";
import { StoreInfo } from "@/components/sections/StoreInfo/StoreInfo";

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

  return (
    <>
      <Hero locale={loc} />
      <SignatureMenu locale={loc} />
      <TodaysPick locale={loc} />
      <Notice locale={loc} />
      <Gallery locale={loc} />
      <VisitUs locale={loc} />
      <StoreInfo locale={loc} />
    </>
  );
}
