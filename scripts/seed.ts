import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });

import { getPayload } from "payload";
import config from "../payload.config.ts";

/**
 * One-shot seed: default globals + demo collection content.
 * Idempotent — safe to re-run.
 * Run with: pnpm exec tsx scripts/seed.ts
 */
async function seed() {
  console.log("[seed] script start");
  console.log("[seed] config loaded, DATABASE_URI set:", Boolean(process.env.DATABASE_URI));

  const payload = await getPayload({ config });
  console.log("[seed] payload ready");

  console.log("→ globals");
  await payload.updateGlobal({
    slug: "settings",
    locale: "ko",
    data: {
      tagline: "Have a Tuz day!",
      wifiSsid: "Tuz_Guest",
      wifiPassword: "tuz12345",
      social: { instagram: "tuzz2026", youtube: "monday_channel94" },
    },
  });
  console.log("  settings (ko) ✓");

  await payload.updateGlobal({
    slug: "storeHours",
    locale: "ko",
    data: {
      weekday: "08:00-22:00",
      weekend: "10:00-23:00",
      regularClosure: "매월 마지막 월요일",
      timezone: "Asia/Seoul",
    },
  });
  await payload.updateGlobal({
    slug: "storeHours",
    locale: "en",
    data: { regularClosure: "Last Monday of every month" },
  });
  console.log("  storeHours ✓");

  await payload.updateGlobal({
    slug: "location",
    locale: "ko",
    data: {
      address: "울산광역시 중구 염포로22, 2층",
      addressShort: "염포로 22",
      lat: 35.5596,
      lng: 129.3443,
    },
  });
  await payload.updateGlobal({
    slug: "location",
    locale: "en",
    data: {
      address: "2F, 22 Yeompo-ro, Jung-gu, Ulsan, Republic of Korea",
      addressShort: "22 Yeompo-ro",
    },
  });
  console.log("  location ✓");

  console.log("→ collections");

  const { totalDocs: noticeCount } = await payload.find({
    collection: "notices",
    limit: 0,
  });
  if (noticeCount === 0) {
    const n1 = await payload.create({
      collection: "notices",
      locale: "ko",
      data: {
        title: "봄 시즌 메뉴 출시",
        tag: "NEW",
        date: new Date().toISOString(),
        isPinned: true,
        sortOrder: 0,
        published: true,
      },
    });
    await payload.update({
      collection: "notices",
      id: n1.id,
      locale: "en",
      data: { title: "Spring seasonal menu" },
    });

    const n2 = await payload.create({
      collection: "notices",
      locale: "ko",
      data: {
        title: "정기휴무 안내",
        tag: "HOURS",
        date: new Date().toISOString(),
        sortOrder: 1,
        published: true,
      },
    });
    await payload.update({
      collection: "notices",
      id: n2.id,
      locale: "en",
      data: { title: "Scheduled closure notice" },
    });
    console.log("  notices (2 demo) ✓");
  } else {
    console.log(`  notices (${noticeCount} existing, skip) ✓`);
  }

  const { totalDocs: menuCount } = await payload.find({
    collection: "menuItems",
    limit: 0,
  });
  if (menuCount === 0) {
    const demo = [
      { ko: "시그니처 라떼", en: "Signature Latte", category: "COFFEE", price: "5,500", sortOrder: 0 },
      { ko: "에스프레소", en: "Espresso", category: "COFFEE", price: "4,000", sortOrder: 1 },
      { ko: "아이스 바닐라 라떼", en: "Iced Vanilla Latte", category: "COFFEE", price: "6,000", sortOrder: 2 },
      { ko: "밀크티", en: "Milk Tea", category: "NON_COFFEE", price: "5,500", sortOrder: 3 },
      { ko: "크루아상", en: "Croissant", category: "BAKERY", price: "4,500", sortOrder: 4 },
    ] as const;
    for (const m of demo) {
      const created = await payload.create({
        collection: "menuItems",
        locale: "ko",
        data: {
          name: m.ko,
          category: m.category,
          price: m.price,
          isSignature: true,
          sortOrder: m.sortOrder,
          published: true,
        },
      });
      await payload.update({
        collection: "menuItems",
        id: created.id,
        locale: "en",
        data: { name: m.en },
      });
    }
    console.log("  menuItems (5 demo) ✓");
  } else {
    console.log(`  menuItems (${menuCount} existing, skip) ✓`);
  }

  const { totalDocs: pickCount } = await payload.find({
    collection: "todayPicks",
    limit: 0,
  });
  if (pickCount === 0) {
    const big = await payload.create({
      collection: "todayPicks",
      locale: "ko",
      data: {
        name: "헤이즐넛 라떼",
        note: "오늘따라 포근한 단맛이 어울리는 날.",
        price: "6,000",
        barista: "owner_big",
        date: new Date().toISOString(),
        active: true,
        sortOrder: 0,
        published: true,
      },
    });
    await payload.update({
      collection: "todayPicks",
      id: big.id,
      locale: "en",
      data: { name: "Hazelnut Latte", note: "A warm, gentle sweetness for today." },
    });
    const small = await payload.create({
      collection: "todayPicks",
      locale: "ko",
      data: {
        name: "아이스 아메리카노",
        note: "하루의 리듬을 다잡는 깔끔한 한 잔.",
        price: "4,500",
        barista: "owner_small",
        date: new Date().toISOString(),
        active: true,
        sortOrder: 1,
        published: true,
      },
    });
    await payload.update({
      collection: "todayPicks",
      id: small.id,
      locale: "en",
      data: {
        name: "Iced Americano",
        note: "A clean cup to set the rhythm of the day.",
      },
    });
    console.log("  todayPicks (2 demo) ✓");
  } else {
    console.log(`  todayPicks (${pickCount} existing, skip) ✓`);
  }

  const { totalDocs: winnersCount } = await payload.find({
    collection: "winners",
    limit: 0,
  });
  if (winnersCount === 0) {
    const winners = [
      { nick: "커피러버", period: "2026.04", sortOrder: 0 },
      { nick: "Morning Regular", period: "2026.03", sortOrder: 1 },
      { nick: "염포단골", period: "2026.02", sortOrder: 2 },
    ];
    for (const w of winners) {
      await payload.create({
        collection: "winners",
        data: {
          nick: w.nick,
          period: w.period,
          sortOrder: w.sortOrder,
          published: true,
        },
      });
    }
    console.log("  winners (3 demo) ✓");
  } else {
    console.log(`  winners (${winnersCount} existing, skip) ✓`);
  }

  console.log("[seed] ✓ complete");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] FAILED:", err);
    process.exit(1);
  });
