import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing, locales } from "@/lib/i18n/routing";
import { fontClassNames } from "@/lib/fonts";
import { SiteHeader } from "@/components/chrome/SiteHeader";
import { MobileStickyCTA } from "@/components/chrome/MobileStickyCTA";
import { Footer } from "@/components/sections/Footer/Footer";
import { getLocation } from "@/lib/queries";
import type { Locale } from "@/lib/i18n/routing";
import "../styles/globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tuz.kr";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: { default: "Tuz", template: "%s · Tuz" },
    description: "Have a Tuz day!",
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: locale === "ko" ? "/" : `/${locale}`,
      languages: Object.fromEntries(
        locales.map((l) => [l, l === "ko" ? "/" : `/${l}`]),
      ),
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const [messages, location] = await Promise.all([
    getMessages(),
    getLocation(locale as Locale),
  ]);

  const mapHref =
    location.lat && location.lng
      ? `https://map.kakao.com/link/map/${encodeURIComponent(
          location.address ?? "Tuz",
        )},${location.lat},${location.lng}`
      : null;

  return (
    <html lang={locale} className={`${fontClassNames} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground pb-[64px] lg:pb-0">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SiteHeader phone={location.phone} address={location.address} />
          <main className="flex-1">{children}</main>
          <Footer locale={locale as Locale} />
          <MobileStickyCTA phone={location.phone} mapHref={mapHref} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
