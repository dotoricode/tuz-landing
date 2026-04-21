import "server-only";
import { cache } from "react";
import { getPayload } from "@/lib/payload";
import type { Locale } from "@/lib/i18n/routing";
import type {
  Notice,
  MenuItem,
  TodayPick,
  Winner,
  Gallery,
  Setting,
  StoreHour,
  Location,
  AboutStory,
  Faq,
} from "@/payload-types";

/**
 * Single-surface query layer between Payload and Server Components.
 * React `cache()` dedupes identical calls inside a single request.
 * Sprint 4 will wrap these with `'use cache'` + `cacheTag` for build-time caching.
 */

export const getSettings = cache(async (locale: Locale): Promise<Setting> => {
  const payload = await getPayload();
  return payload.findGlobal({ slug: "settings", locale, fallbackLocale: "ko" });
});

export const getStoreHours = cache(async (locale: Locale): Promise<StoreHour> => {
  const payload = await getPayload();
  return payload.findGlobal({ slug: "storeHours", locale, fallbackLocale: "ko" });
});

export const getLocation = cache(async (locale: Locale): Promise<Location> => {
  const payload = await getPayload();
  return payload.findGlobal({ slug: "location", locale, fallbackLocale: "ko" });
});

export const getAbout = cache(async (locale: Locale): Promise<AboutStory> => {
  const payload = await getPayload();
  return payload.findGlobal({ slug: "aboutStory", locale, fallbackLocale: "ko" });
});

export const getNotices = cache(async (locale: Locale): Promise<Notice[]> => {
  const payload = await getPayload();
  const result = await payload.find({
    collection: "notices",
    locale,
    fallbackLocale: "ko",
    where: { published: { equals: true } },
    sort: ["-isPinned", "sortOrder", "-date"],
    limit: 12,
  });
  return result.docs;
});

export const getPinnedNotice = cache(
  async (locale: Locale): Promise<Notice | null> => {
    const payload = await getPayload();
    const result = await payload.find({
      collection: "notices",
      locale,
      fallbackLocale: "ko",
      where: {
        and: [{ published: { equals: true } }, { isPinned: { equals: true } }],
      },
      sort: "-date",
      limit: 1,
    });
    return result.docs[0] ?? null;
  },
);

export const getSignatureMenu = cache(
  async (locale: Locale): Promise<MenuItem[]> => {
    const payload = await getPayload();
    const result = await payload.find({
      collection: "menuItems",
      locale,
      fallbackLocale: "ko",
      where: {
        and: [
          { published: { equals: true } },
          { isSignature: { equals: true } },
        ],
      },
      sort: "sortOrder",
      limit: 8,
    });
    return result.docs;
  },
);

export const getAllMenuItems = cache(
  async (locale: Locale): Promise<MenuItem[]> => {
    const payload = await getPayload();
    const result = await payload.find({
      collection: "menuItems",
      locale,
      fallbackLocale: "ko",
      where: { published: { equals: true } },
      sort: ["category", "sortOrder"],
      limit: 100,
    });
    return result.docs;
  },
);

export const getFaqs = cache(async (locale: Locale): Promise<Faq[]> => {
  const payload = await getPayload();
  const result = await payload.find({
    collection: "faqs",
    locale,
    fallbackLocale: "ko",
    where: { published: { equals: true } },
    sort: ["sortOrder"],
    limit: 50,
  });
  return result.docs;
});

export const getTodayPicks = cache(async (locale: Locale): Promise<TodayPick[]> => {
  const payload = await getPayload();
  const result = await payload.find({
    collection: "todayPicks",
    locale,
    fallbackLocale: "ko",
    where: {
      and: [{ published: { equals: true } }, { active: { equals: true } }],
    },
    sort: ["sortOrder", "-date"],
    limit: 2,
  });
  return result.docs;
});

export const getWinners = cache(async (): Promise<Winner[]> => {
  const payload = await getPayload();
  const result = await payload.find({
    collection: "winners",
    where: { published: { equals: true } },
    sort: "sortOrder",
    limit: 5,
  });
  return result.docs;
});

export const getGallery = cache(async (locale: Locale): Promise<Gallery[]> => {
  const payload = await getPayload();
  const result = await payload.find({
    collection: "gallery",
    locale,
    fallbackLocale: "ko",
    where: { published: { equals: true } },
    sort: "sortOrder",
    limit: 20,
  });
  return result.docs;
});
