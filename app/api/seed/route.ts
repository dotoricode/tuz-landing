import { NextResponse } from "next/server";
import { getPayload } from "@/lib/payload";

export const dynamic = "force-dynamic";

function lexParagraph(text: string) {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: [
        {
          type: "paragraph",
          format: "",
          indent: 0,
          version: 1,
          direction: "ltr",
          textFormat: 0,
          children: [
            {
              type: "text",
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text,
              version: 1,
            },
          ],
        },
      ],
    },
  };
}

function lexMulti(paragraphs: string[]) {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: paragraphs.map((text) => ({
        type: "paragraph",
        format: "",
        indent: 0,
        version: 1,
        direction: "ltr",
        textFormat: 0,
        children: [
          {
            type: "text",
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text,
            version: 1,
          },
        ],
      })),
    },
  };
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "seed is disabled in production" },
      { status: 403 },
    );
  }
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (secret !== "dev") {
    return NextResponse.json(
      { error: "append ?secret=dev to the URL" },
      { status: 401 },
    );
  }

  const log: string[] = [];
  const payload = await getPayload();

  await payload.updateGlobal({
    slug: "settings",
    locale: "ko",
    data: {
      tagline: 'Have a "TUZ" day!',
      wifiSsid: "Tuz_Guest",
      wifiPassword: "tuz12345",
      social: { instagram: "tuzz2026", youtube: "monday_channel94" },
    },
  });
  log.push("settings (ko) ✓");

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
  log.push("storeHours ✓");

  await payload.updateGlobal({
    slug: "location",
    locale: "ko",
    data: {
      address: "울산광역시 중구 염포로22, 2층",
      addressShort: "염포로 22",
      phone: "052-123-4567",
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
  log.push("location ✓");

  const currentAbout = await payload.findGlobal({
    slug: "aboutStory",
    locale: "ko",
  });
  const aboutBody = (currentAbout as { body?: { root?: { children?: Array<{ children?: Array<{ text?: string }> }> } } }).body;
  const hasAboutText =
    typeof aboutBody?.root?.children?.[0]?.children?.[0]?.text === "string" &&
    aboutBody.root.children[0].children[0].text.length > 0;
  if (!hasAboutText) {
    await payload.updateGlobal({
      slug: "aboutStory",
      locale: "ko",
      data: {
        body: lexMulti([
          "안녕하세요, 울산 중구 염포로의 작은 카페 Tuz입니다. 오랫동안 동네에 머무를 따뜻한 공간을 꿈꾸며 두 사장이 매일 한 잔씩 정성껏 내립니다.",
          "커피는 진하지 않아도 괜찮습니다. 서두르지 않는 하루의 온도를 담아 드립니다.",
        ]),
        signatureName: "큰 사장 & 작은 사장 드림",
        published: true,
      },
    });
    await payload.updateGlobal({
      slug: "aboutStory",
      locale: "en",
      data: {
        body: lexMulti([
          "Hello — we are Tuz, a small cafe on Yeompo-ro in Jung-gu, Ulsan. Two owners brew every cup with care, dreaming of a warm place that stays long in the neighborhood.",
          "Coffee doesn't need to be strong. We serve the temperature of an unhurried day.",
        ]),
        signatureName: "From the two owners",
      },
    });
    log.push("aboutStory ✓");
  } else {
    log.push("aboutStory (existing, skip)");
  }

  const { totalDocs: noticeCount } = await payload.find({
    collection: "notices",
    limit: 0,
  });
  if (noticeCount === 0) {
    const notices = [
      {
        ko: { title: "봄 시즌 메뉴 출시", body: "딸기 라떼·청귤 에이드 등 봄 한정 메뉴가 출시되었습니다." },
        en: { title: "Spring seasonal menu", body: "Strawberry latte and more — spring-only drinks are now available." },
        tag: "NEW" as const,
        isPinned: true,
        sortOrder: 0,
      },
      {
        ko: { title: "정기휴무 안내", body: "매월 마지막 월요일은 정기 휴무입니다." },
        en: { title: "Regular closure", body: "We are closed on the last Monday of every month." },
        tag: "HOURS" as const,
        isPinned: false,
        sortOrder: 1,
      },
      {
        ko: { title: "단체석 예약 안내", body: "10명 이상 단체는 미리 전화(052-123-4567)로 예약 부탁드립니다." },
        en: { title: "Group bookings", body: "For groups of 10+, please reserve by phone in advance." },
        tag: "EVENT" as const,
        isPinned: false,
        sortOrder: 2,
      },
    ];
    for (const n of notices) {
      const created = await payload.create({
        collection: "notices",
        locale: "ko",
        data: {
          title: n.ko.title,
          body: lexParagraph(n.ko.body),
          tag: n.tag,
          date: new Date().toISOString(),
          isPinned: n.isPinned,
          sortOrder: n.sortOrder,
          published: true,
        },
      });
      await payload.update({
        collection: "notices",
        id: created.id,
        locale: "en",
        data: { title: n.en.title, body: lexParagraph(n.en.body) },
      });
    }
    log.push(`notices (${notices.length} demo) ✓`);
  } else {
    log.push(`notices (${noticeCount} existing, skip)`);
  }

  const { totalDocs: menuCount } = await payload.find({
    collection: "menuItems",
    limit: 0,
  });
  if (menuCount === 0) {
    const demo = [
      { ko: "에스프레소", en: "Espresso", category: "COFFEE", price: "3,500", tag: "", isSignature: false },
      { ko: "아메리카노", en: "Americano", category: "COFFEE", price: "4,000", tag: "", isSignature: false },
      { ko: "카페라떼", en: "Cafe Latte", category: "COFFEE", price: "4,500", tag: "", isSignature: false },
      { ko: "TUZ 시그니처", en: "TUZ Signature", category: "COFFEE", price: "5,500", tag: "NEW", isSignature: true },
      { ko: "핸드드립", en: "Hand Drip", category: "COFFEE", price: "5,000", tag: "", isSignature: true },
      { ko: "유자차", en: "Yuja Tea", category: "NON_COFFEE", price: "4,500", tag: "", isSignature: false },
      { ko: "아이스티", en: "Iced Tea", category: "NON_COFFEE", price: "4,500", tag: "", isSignature: false },
      { ko: "초코라떼", en: "Chocolate Latte", category: "NON_COFFEE", price: "5,000", tag: "", isSignature: false },
      { ko: "버터 스콘", en: "Butter Scone", category: "BAKERY", price: "3,500", tag: "", isSignature: false },
      { ko: "크로플", en: "Croffle", category: "BAKERY", price: "4,500", tag: "NEW", isSignature: true },
      { ko: "바닐라 휘낭시에", en: "Vanilla Financier", category: "BAKERY", price: "3,000", tag: "", isSignature: false },
      { ko: "바스크 치즈케이크", en: "Basque Cheesecake", category: "DESSERT", price: "5,500", tag: "BEST", isSignature: true },
      { ko: "티라미수", en: "Tiramisu", category: "DESSERT", price: "5,500", tag: "", isSignature: false },
      { ko: "딸기 라떼", en: "Strawberry Latte", category: "SEASONAL", price: "5,500", tag: "SEASONAL", isSignature: false },
      { ko: "청귤 에이드", en: "Green Tangerine Ade", category: "SEASONAL", price: "5,000", tag: "SEASONAL", isSignature: false },
    ] as const;
    for (let i = 0; i < demo.length; i++) {
      const m = demo[i];
      const created = await payload.create({
        collection: "menuItems",
        locale: "ko",
        data: {
          name: m.ko,
          nameEn: m.en,
          category: m.category,
          price: m.price,
          tag: m.tag,
          isSignature: m.isSignature,
          sortOrder: i,
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
    log.push(`menuItems (${demo.length} demo) ✓`);
  } else {
    log.push(`menuItems (${menuCount} existing, skip)`);
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
        name: "TUZ 시그니처",
        note: "직접 볶은 원두의 향이 차분하게 퍼집니다.",
        price: "5,500",
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
      data: {
        name: "TUZ Signature",
        note: "Aromas from our own roast unfold gently in the cup.",
      },
    });
    const small = await payload.create({
      collection: "todayPicks",
      locale: "ko",
      data: {
        name: "딸기 라떼",
        note: "제철 딸기를 통째로 갈아 만든 봄 한정 음료.",
        price: "5,500",
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
        name: "Strawberry Latte",
        note: "Whole seasonal strawberries, blended — a spring-only pour.",
      },
    });
    log.push("todayPicks (2 demo) ✓");
  } else {
    log.push(`todayPicks (${pickCount} existing, skip)`);
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
    log.push(`winners (${winners.length} demo) ✓`);
  } else {
    log.push(`winners (${winnersCount} existing, skip)`);
  }

  const { totalDocs: faqCount } = await payload.find({
    collection: "faqs",
    limit: 0,
  });
  if (faqCount === 0) {
    const faqs = [
      {
        ko: { q: "주차가 가능한가요?", a: "가게 바로 앞은 주차가 어렵습니다. 염포로 골목 공영주차장(도보 3분)을 이용해 주세요." },
        en: { q: "Is parking available?", a: "Parking right in front is difficult. Please use the public lot on Yeompo-ro (3-min walk)." },
        category: "visit" as const,
        sortOrder: 0,
      },
      {
        ko: { q: "와이파이는 있나요?", a: "네, 매장 전체에 무료 와이파이가 제공됩니다. 비밀번호는 카운터 또는 오시는 길 섹션의 Wi-Fi 카드에서 확인하실 수 있습니다." },
        en: { q: "Is there Wi-Fi?", a: "Yes — free Wi-Fi covers the entire cafe. Password is at the counter or on the Wi-Fi card in the Visit us section." },
        category: "visit" as const,
        sortOrder: 1,
      },
      {
        ko: { q: "반려동물 동반이 가능한가요?", a: "죄송합니다. 위생상의 이유로 반려동물 동반은 제한됩니다. 단, 시각 장애인 보조견은 언제든 환영합니다." },
        en: { q: "Can I bring a pet?", a: "Unfortunately pets are not allowed for hygiene reasons. Guide dogs for the visually impaired are always welcome." },
        category: "visit" as const,
        sortOrder: 2,
      },
      {
        ko: { q: "예약이 필요한가요?", a: "평일에는 예약 없이 방문하셔도 자리가 있을 확률이 높습니다. 주말 오후에는 혼잡할 수 있으니 전화(052-123-4567)로 미리 문의해 주세요." },
        en: { q: "Do I need a reservation?", a: "Weekdays usually have open seats without a reservation. Weekend afternoons can be busy — please call ahead." },
        category: "general" as const,
        sortOrder: 3,
      },
      {
        ko: { q: "단체(10명 이상) 이용이 가능한가요?", a: "네, 사전에 전화로 연락 주시면 조용한 시간대로 자리를 준비해 드립니다." },
        en: { q: "Can you host groups of 10+?", a: "Yes — please call in advance and we will arrange seating during a quieter slot." },
        category: "general" as const,
        sortOrder: 4,
      },
      {
        ko: { q: "노키즈존인가요?", a: "아닙니다. 아이와 함께 오시는 분들을 환영합니다. 다만 다른 손님에게 방해가 되지 않도록 보호자께서 함께 지켜봐 주시면 감사하겠습니다." },
        en: { q: "Is this a no-kids zone?", a: "No — families with children are welcome. We kindly ask guardians to help keep the space comfortable for other guests." },
        category: "general" as const,
        sortOrder: 5,
      },
      {
        ko: { q: "비건 메뉴가 있나요?", a: "블랙 커피 계열과 유자차, 아이스티 등 비건 선택지가 있습니다. 베이커리는 버터·우유가 포함되어 있어 비건이 아닙니다." },
        en: { q: "Are there vegan options?", a: "Black coffees, yuja tea, and iced tea are vegan. Bakery items contain butter and milk, so they are not vegan-friendly." },
        category: "menu" as const,
        sortOrder: 6,
      },
    ];
    for (const f of faqs) {
      const created = await payload.create({
        collection: "faqs",
        locale: "ko",
        data: {
          question: f.ko.q,
          answer: lexParagraph(f.ko.a),
          category: f.category,
          sortOrder: f.sortOrder,
          published: true,
        },
      });
      await payload.update({
        collection: "faqs",
        id: created.id,
        locale: "en",
        data: {
          question: f.en.q,
          answer: lexParagraph(f.en.a),
        },
      });
    }
    log.push(`faqs (${faqs.length} demo) ✓`);
  } else {
    log.push(`faqs (${faqCount} existing, skip)`);
  }

  return NextResponse.json({ ok: true, log });
}
