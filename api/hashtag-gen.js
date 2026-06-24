const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lwgissxdvemamuybxmxz.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3Z2lzc3hkdmVtYW11eWJ4bXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjMxNjgsImV4cCI6MjA5MjA5OTE2OH0.bslx3DGC2KPKleWo9KejERD10e92OeBEUoQHg2_jPOo';
const MAX_MEMO_CHARS = 220;

const ALLOWED_ORIGINS = [
  /^https:\/\/(www\.)?tuz\.kr$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /^http:\/\/\[::1\](:\d+)?$/
];

const POST_TYPES = {
  post_body: { label: '본문 기반', tags: ['#인스타그램', '#카페게시물', '#오늘의카페'] },
  new_menu: { label: '신메뉴', tags: ['#신메뉴', '#카페신메뉴', '#신메뉴출시', '#오늘의메뉴'] },
  today_pick: { label: '오늘의 추천', tags: ['#오늘의추천', '#카페추천', '#오늘마실커피', '#오늘의카페'] },
  notice: { label: '이벤트/공지', tags: ['#카페이벤트', '#카페공지', '#이벤트', '#쿠폰이벤트'] },
  mood: { label: '매장 분위기', tags: ['#카페분위기', '#조용한카페', '#감성카페', '#오후카페'] },
  menu_photo: { label: '메뉴 사진', tags: ['#메뉴사진', '#카페메뉴', '#디저트사진', '#커피사진'] },
  drink_dessert: { label: '디저트/음료', tags: ['#디저트카페', '#커피스타그램', '#음료추천', '#디저트맛집'] }
};

const DEFAULT_CONTEXT = {
  brandTags: ['#TUZ', '#투즈', '#tuzz2026', '#울산카페', '#울산중구카페'],
  localTags: ['#울산', '#울산중구', '#성남동', '#성남동카페', '#울산카페추천'],
  baseTags: ['#카페', '#카페스타그램', '#커피', '#디저트', '#카페투어', '#일상', '#맛집추천']
};

function requestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `hash_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isAllowedOrigin(origin = '') {
  return !origin || ALLOWED_ORIGINS.some(pattern => pattern.test(origin));
}

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 3000) {
      throw Object.assign(new Error('요청이 너무 큽니다.'), { statusCode: 413 });
    }
  }
  return raw ? JSON.parse(raw) : {};
}

function normalizeTag(value) {
  const cleaned = String(value || '')
    .trim()
    .replace(/[,\s]+/g, '')
    .replace(/^#+/, '')
    .replace(/[^0-9A-Za-z_가-힣]/g, '');
  if (!cleaned) return '';
  return `#${cleaned}`;
}

function uniqTags(tags) {
  const seen = new Set();
  return tags.map(normalizeTag).filter(tag => {
    const key = tag.toLowerCase();
    if (!tag || /^#test\d*$/i.test(tag) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function limitGroups(groups, maxTags = 24) {
  let remaining = maxTags;
  return groups.map(group => {
    const tags = group.tags.slice(0, remaining);
    remaining -= tags.length;
    return { ...group, tags };
  }).filter(group => group.tags.length);
}

function dedupeGroups(groups) {
  const seen = new Set();
  return groups.map(group => {
    const tags = group.tags.filter(tag => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { ...group, tags };
  }).filter(group => group.tags.length);
}

function keywordTags(text) {
  const source = String(text || '').toLowerCase();
  const pairs = [
    ['크림', '#크림라떼'],
    ['라떼', '#라떼'],
    ['아메리카노', '#아메리카노'],
    ['커피', '#커피맛집'],
    ['디저트', '#디저트맛집'],
    ['쿠폰', '#쿠폰이벤트'],
    ['이벤트', '#이벤트중'],
    ['조용', '#조용한카페'],
    ['오후', '#오후카페'],
    ['신메뉴', '#신메뉴출시'],
    ['말차', '#말차라떼'],
    ['초코', '#초코디저트'],
    ['딸기', '#딸기디저트']
  ];
  return pairs.filter(([keyword]) => source.includes(keyword)).map(([, tag]) => tag);
}

async function fetchSupabase(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json'
    }
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  return response.json();
}

async function loadCafeContext() {
  try {
    const [menu, picks] = await Promise.all([
      fetchSupabase('menu?select=name,category&order=sort_order.asc&limit=20'),
      fetchSupabase('pick?select=name,menu:menu_id(name)&order=sort_order.asc&limit=4')
    ]);
    const menuNames = (menu || []).map(item => item.name).filter(Boolean);
    const pickNames = (picks || []).map(item => item.menu?.name || item.name).filter(Boolean);
    return {
      ...DEFAULT_CONTEXT,
      menuTags: uniqTags([...pickNames, ...menuNames].slice(0, 10).map(name => `#${name}`))
    };
  } catch (err) {
    console.warn('[hashtag-gen] Supabase context fallback:', err.message || err);
    return DEFAULT_CONTEXT;
  }
}

function buildTags({ postType, memo, includeLocalTags, includeBrandTags, context }) {
  const type = POST_TYPES[postType];
  const recommended = uniqTags([
    ...(type?.tags || ['#카페게시물', '#오늘의카페']),
    ...keywordTags(memo),
    ...DEFAULT_CONTEXT.baseTags
  ]).slice(0, 12);

  const groups = [
    { key: 'recommended', label: '복사 추천', tags: recommended }
  ];

  const menuTags = uniqTags(context.menuTags || []).slice(0, 6);
  if (menuTags.length) groups.push({ key: 'menu', label: '메뉴', tags: menuTags });
  if (includeLocalTags) groups.push({ key: 'local', label: '지역', tags: uniqTags(context.localTags).slice(0, 6) });
  if (includeBrandTags) groups.push({ key: 'brand', label: 'TUZ 고정', tags: uniqTags(context.brandTags).slice(0, 6) });

  return limitGroups(dedupeGroups(groups.filter(group => group.tags.length)));
}

function formatCopyText(groups) {
  return groups.flatMap(group => group.tags).join(' ');
}

module.exports = async function handler(req, res) {
  const id = requestId();
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'POST만 지원합니다.', requestId: id });
    return;
  }

  if (!isAllowedOrigin(req.headers.origin || '')) {
    sendJson(res, 403, { error: '허용되지 않은 호출 출처입니다.', requestId: id });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const postType = String(body.postType || '').trim();
    if (!POST_TYPES[postType]) {
      sendJson(res, 400, { error: '어떤 글인지 하나만 골라주세요.', requestId: id });
      return;
    }

    const memo = String(body.memo || '').trim().slice(0, MAX_MEMO_CHARS);
    const context = await loadCafeContext();
    const tags = buildTags({
      postType,
      memo,
      includeLocalTags: body.includeLocalTags !== false,
      includeBrandTags: body.includeBrandTags !== false,
      context
    });

    sendJson(res, 200, {
      tags,
      copyText: formatCopyText(tags),
      reasonSummary: `인스타그램에 붙여넣을 태그 ${tags.flatMap(group => group.tags).length}개를 골랐어요.`,
      criteriaVersion: 'mvp-static-2026-06-23',
      requestId: id
    });
  } catch (err) {
    sendJson(res, err.statusCode || 500, {
      error: err.message || '해시태그 생성 중 오류가 발생했습니다.',
      code: err.code || 'HANDLER_ERROR',
      requestId: id
    });
  }
};
