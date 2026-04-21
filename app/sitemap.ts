import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/routing";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tuz.kr";

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: locale === "ko" ? BASE_URL : `${BASE_URL}/${locale}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
    alternates: {
      languages: Object.fromEntries(
        locales.map((l) => [l, l === "ko" ? BASE_URL : `${BASE_URL}/${l}`]),
      ),
    },
  }));
}
