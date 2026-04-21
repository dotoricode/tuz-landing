import { defineRouting } from "next-intl/routing";

export const locales = ["ko", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ko";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});
