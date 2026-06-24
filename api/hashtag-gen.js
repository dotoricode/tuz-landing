const { createHash } = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lwgissxdvemamuybxmxz.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3Z2lzc3hkdmVtYW11eWJ4bXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjMxNjgsImV4cCI6MjA5MjA5OTE2OH0.bslx3DGC2KPKleWo9KejERD10e92OeBEUoQHg2_jPOo';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_MEMO_CHARS = 500;
const MAX_BODY_BYTES = 5000;
const CRITERIA_VERSION = 'hashtag-ranking-2026-06-24';

const ALLOWED_ORIGINS = [
  /^https:\/\/(www\.)?tuz\.kr$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /^http:\/\/\[::1\](:\d+)?$/
];

const POST_TYPES = {
  post_body: { label: '본문 기반', tags: ['#카페게시물', '#오늘의카페'] },
  new_menu: { label: '신메뉴', tags: ['#신메뉴', '#카페신메뉴', '#신메뉴출시'] },
  today_pick: { label: '오늘의 추천', tags: ['#오늘의추천', '#카페추천'] },
  notice: { label: '이벤트/공지', tags: ['#카페이벤트', '#카페공지', '#이벤트'] },
  mood: { label: '매장 분위기', tags: ['#카페분위기', '#조용한카페', '#감성카페'] },
  menu_photo: { label: '메뉴 사진', tags: ['#카페메뉴', '#디저트사진', '#커피사진'] },
  drink_dessert: { label: '디저트/음료', tags: ['#디저트카페', '#커피스타그램', '#음료추천'] }
};

const DEFAULT_SETTINGS = {
  targetCount: 5,
  minPostCount: 500,
  maxPostCount: 500000,
  broadPostCount: 500000,
  staleAfterDays: 14,
  blockedTags: ['#맞팔', '#선팔', '#좋아요반사', '#팔로우', '#followforfollow', '#likeforlikes'],
  requiredBrandTags: ['#tuzz2026', '#투즈', '#TUZ'],
  requiredLocalTags: ['#울산카페', '#성남동카페', '#울산중구카페'],
  criteriaVersion: CRITERIA_VERSION
};

const DEFAULT_CONTEXT = {
  brandTags: ['#tuzz2026', '#투즈', '#TUZ'],
  localTags: ['#울산카페', '#성남동카페', '#울산중구카페', '#울산카페추천'],
  baseTags: ['#카페', '#카페스타그램', '#커피', '#디저트', '#카페투어']
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
    if (raw.length > MAX_BODY_BYTES) {
      throw Object.assign(new Error('요청이 너무 큽니다.'), { statusCode: 413, code: 'PAYLOAD_TOO_LARGE' });
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

function tagKey(tag) {
  return normalizeTag(tag).toLowerCase();
}

function hashMemo(memo) {
  return createHash('sha256').update(String(memo || '').trim()).digest('hex');
}

function toArray(value, fallback = []) {
  return Array.isArray(value) ? value.filter(Boolean) : fallback;
}

function daysSince(value, now = new Date()) {
  if (!value) return Infinity;
  const sampledAt = new Date(value);
  if (Number.isNaN(sampledAt.getTime())) return Infinity;
  return Math.max(0, Math.floor((now.getTime() - sampledAt.getTime()) / 86400000));
}

async function fetchSupabase(path, { serviceRole = false } = {}) {
  const key = serviceRole && SUPABASE_SERVICE_ROLE_KEY ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  return response.json();
}

async function writeSupabase(path, payload, { serviceRole = false } = {}) {
  const key = serviceRole && SUPABASE_SERVICE_ROLE_KEY ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Supabase write ${response.status}`);
}

async function loadCafeContext() {
  try {
    const [menu, picks] = await Promise.all([
      fetchSupabase('menu?select=name,category&order=sort_order.asc&limit=30'),
      fetchSupabase('pick?select=name,menu:menu_id(name)&order=sort_order.asc&limit=6')
    ]);
    const menuNames = (menu || []).map(item => item.name).filter(Boolean);
    const pickNames = (picks || []).map(item => item.menu?.name || item.name).filter(Boolean);
    const menuTags = uniqTags([...pickNames, ...menuNames].slice(0, 20).map(name => `#${name}`));
    return {
      ...DEFAULT_CONTEXT,
      menuNames,
      pickNames,
      menuTags
    };
  } catch (err) {
    console.warn('[hashtag-gen] Supabase cafe context fallback:', err.message || err);
    return DEFAULT_CONTEXT;
  }
}

function mapSettings(row) {
  if (!row) return DEFAULT_SETTINGS;
  return {
    targetCount: Number(row.target_count) || DEFAULT_SETTINGS.targetCount,
    minPostCount: Number(row.min_post_count) || DEFAULT_SETTINGS.minPostCount,
    maxPostCount: Number(row.max_post_count) || DEFAULT_SETTINGS.maxPostCount,
    broadPostCount: Number(row.max_post_count) || DEFAULT_SETTINGS.broadPostCount,
    staleAfterDays: Number(row.stale_after_days) || DEFAULT_SETTINGS.staleAfterDays,
    blockedTags: uniqTags(toArray(row.blocked_tags, DEFAULT_SETTINGS.blockedTags)),
    requiredBrandTags: uniqTags(toArray(row.required_brand_tags, DEFAULT_SETTINGS.requiredBrandTags)),
    requiredLocalTags: uniqTags(toArray(row.required_local_tags, DEFAULT_SETTINGS.requiredLocalTags)),
    criteriaVersion: row.criteria_version || CRITERIA_VERSION
  };
}

async function loadHashtagSettings() {
  try {
    const rows = await fetchSupabase('hashtag_settings?select=*&id=eq.1&limit=1');
    return mapSettings(rows?.[0]);
  } catch (err) {
    console.warn('[hashtag-gen] hashtag settings fallback:', err.message || err);
    return DEFAULT_SETTINGS;
  }
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
    ['이벤트', '#카페이벤트'],
    ['조용', '#조용한카페'],
    ['오후', '#오후카페'],
    ['신메뉴', '#신메뉴출시'],
    ['말차', '#말차라떼'],
    ['초코', '#초코디저트'],
    ['딸기', '#딸기디저트'],
    ['케이크', '#케이크맛집'],
    ['성남동', '#성남동카페'],
    ['울산', '#울산카페'],
    ['작업', '#작업하기좋은카페'],
    ['혼자', '#혼카페']
  ];
  return pairs.filter(([keyword]) => source.includes(keyword)).map(([, tag]) => tag);
}

function parseJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {}
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {}
  }
  return null;
}

async function callGeminiForCandidates({ memo, context }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return { tags: [], keywords: [], intent: 'no_ai_key' };

  const systemPrompt = [
    '너는 TUZ 카페 인스타그램 해시태그 후보를 만드는 보조 엔진이다.',
    '반드시 JSON만 출력한다. 마크다운과 설명문은 금지한다.',
    '최종 선택은 서버 랭킹 엔진이 하므로 후보만 만든다.',
    '본문과 직접 관련 있는 카페 메뉴, 장소, 방문 상황, 분위기 해시태그만 만든다.',
    '맞팔, 선팔, 좋아요반사, 과도하게 넓은 바이럴 태그는 금지한다.',
    `TUZ 메뉴 후보: ${(context.menuNames || []).slice(0, 20).join(', ')}`,
    `TUZ 지역 후보: ${DEFAULT_CONTEXT.localTags.join(', ')}`
  ].join('\n');
  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: memo.slice(0, MAX_MEMO_CHARS) }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 500,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 }
    }
  };
  const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(payload)
  });
  const raw = await upstream.text();
  if (!upstream.ok) {
    console.warn('[hashtag-gen] Gemini candidate fallback:', raw.slice(0, 300));
    return { tags: [], keywords: [], intent: 'ai_error' };
  }
  const text = (JSON.parse(raw)?.candidates || [])
    .flatMap(candidate => candidate?.content?.parts || [])
    .map(part => part?.text || '')
    .join('\n')
    .trim();
  const parsed = parseJsonObject(text);
  return {
    tags: uniqTags(parsed?.tags || parsed?.hashtags || []),
    keywords: toArray(parsed?.keywords, []),
    intent: String(parsed?.intent || 'post_body').slice(0, 80)
  };
}

function candidate(tag, category, source, weight = 1) {
  const normalized = normalizeTag(tag);
  if (!normalized) return null;
  return { tag: normalized, category, source, weight };
}

function buildCandidatePool({ memo, postType, context, settings, aiCandidates, includeLocalTags, includeBrandTags }) {
  const typeTags = POST_TYPES[postType]?.tags || [];
  const pool = [
    ...keywordTags(memo).map(tag => candidate(tag, 'content', 'keyword', 1.2)),
    ...typeTags.map(tag => candidate(tag, 'content', 'post_type', 0.8)),
    ...(context.menuTags || []).map(tag => candidate(tag, 'content', 'menu', 1.1)),
    ...(aiCandidates.tags || []).map(tag => candidate(tag, 'content', 'gemini', 1)),
    ...DEFAULT_CONTEXT.baseTags.map(tag => candidate(tag, 'discovery', 'base', 0.65))
  ];
  if (includeBrandTags) {
    pool.push(...settings.requiredBrandTags.map(tag => candidate(tag, 'brand', 'settings', 1.2)));
    pool.push(...DEFAULT_CONTEXT.brandTags.map(tag => candidate(tag, 'brand', 'default', 1)));
  }
  if (includeLocalTags) {
    pool.push(...settings.requiredLocalTags.map(tag => candidate(tag, 'local', 'settings', 1.2)));
    pool.push(...DEFAULT_CONTEXT.localTags.map(tag => candidate(tag, 'local', 'default', 1)));
  }
  const seen = new Map();
  const categoryPriority = { brand: 4, local: 3, content: 2, discovery: 1 };
  for (const item of pool.filter(Boolean)) {
    const key = tagKey(item.tag);
    const existing = seen.get(key);
    const itemPriority = categoryPriority[item.category] || 0;
    const existingPriority = categoryPriority[existing?.category] || 0;
    if (!existing || itemPriority > existingPriority || (itemPriority === existingPriority && item.weight > existing.weight)) {
      seen.set(key, item);
    }
  }
  const blocked = new Set(settings.blockedTags.map(tagKey));
  return [...seen.values()].filter(item => !blocked.has(tagKey(item.tag)));
}

async function loadResearchCache(tags) {
  const normalized = uniqTags(tags);
  if (!normalized.length) return new Map();
  const inList = normalized.map(tag => encodeURIComponent(tag)).join(',');
  const rows = await fetchSupabase(`hashtag_research_cache?select=tag,post_count,sampled_at,source,related_terms,quality_flags&tag=in.(${inList})`);
  return new Map((rows || []).map(row => [tagKey(row.tag), row]));
}

function competitionScore(postCount, settings) {
  if (!Number.isFinite(postCount)) return 0;
  if (postCount < settings.minPostCount) return 8;
  if (postCount <= 50000) return 25;
  if (postCount <= settings.maxPostCount) return 18;
  return 6;
}

function scoreBand(postCount, settings) {
  if (!Number.isFinite(postCount)) return 'missing';
  if (postCount < settings.minPostCount) return 'too-small';
  if (postCount <= 50000) return 'long-tail';
  if (postCount <= settings.maxPostCount) return 'mid';
  return 'too-broad';
}

function scoreCandidate(item, research, { memo, context, settings }) {
  const plain = item.tag.slice(1).toLowerCase();
  const memoText = String(memo || '').toLowerCase();
  const menuNames = (context.menuNames || []).map(name => String(name).toLowerCase());
  let relevance = 8;
  if (memoText.includes(plain)) relevance += 16;
  if (keywordTags(memo).some(tag => tagKey(tag) === tagKey(item.tag))) relevance += 14;
  if (menuNames.some(name => plain.includes(name) || memoText.includes(name))) relevance += 10;
  if (item.source === 'gemini') relevance += 8;
  if (item.source === 'menu') relevance += 8;
  relevance = Math.min(40, Math.round(relevance * item.weight));

  const postCount = Number(research?.post_count);
  const competition = competitionScore(postCount, settings);
  const localIntent = item.category === 'local' || /울산|성남동|중구/.test(item.tag) ? 20 : 0;
  const brandSafety = item.category === 'brand' || /tuz|투즈/i.test(item.tag) ? 10 : 5;
  const diversity = 5;
  const freshnessPenalty = daysSince(research?.sampled_at) > settings.staleAfterDays ? 4 : 0;
  return Math.max(0, relevance + competition + localIntent + brandSafety + diversity - freshnessPenalty);
}

function pickBest(scored, category, selectedKeys, maxBroad = 1) {
  const broadAlready = scored.filter(item => selectedKeys.has(tagKey(item.tag)) && item.scoreBand === 'too-broad').length;
  return scored.find(item => (
    item.category === category &&
    !selectedKeys.has(tagKey(item.tag)) &&
    (item.scoreBand !== 'too-broad' || broadAlready < maxBroad)
  ));
}

function selectRankedTags({ candidates, researchCache, memo, context, settings, includeLocalTags, includeBrandTags }) {
  const scored = candidates.map(item => {
    if (!includeBrandTags && item.category === 'brand') return null;
    if (!includeLocalTags && item.category === 'local') return null;
    const research = researchCache.get(tagKey(item.tag));
    if (!research) return null;
    const postCount = Number(research.post_count);
    return {
      ...item,
      postCount,
      sampledAt: research.sampled_at || null,
      researchSource: research.source || 'apify',
      scoreBand: scoreBand(postCount, settings),
      score: scoreCandidate(item, research, { memo, context, settings })
    };
  }).filter(Boolean).sort((a, b) => b.score - a.score);

  const selected = [];
  const selectedKeys = new Set();
  const add = (item) => {
    if (!item || selectedKeys.has(tagKey(item.tag))) return;
    selected.push(item);
    selectedKeys.add(tagKey(item.tag));
  };

  if (includeBrandTags) add(pickBest(scored, 'brand', selectedKeys));
  if (includeLocalTags) add(pickBest(scored, 'local', selectedKeys));
  add(pickBest(scored, 'content', selectedKeys));
  add(pickBest(scored, 'content', selectedKeys));
  add(pickBest(scored, 'discovery', selectedKeys));

  for (const item of scored) {
    const broadCount = selected.filter(tag => tag.scoreBand === 'too-broad').length;
    if (selected.length >= settings.targetCount) break;
    if (selectedKeys.has(tagKey(item.tag))) continue;
    if (item.scoreBand === 'too-broad' && broadCount >= 1) continue;
    add(item);
  }

  return selected.slice(0, settings.targetCount);
}

function groupSelectedTags(selected) {
  const labels = {
    brand: 'TUZ',
    local: '지역',
    content: '본문',
    discovery: '탐색'
  };
  return ['brand', 'local', 'content', 'discovery'].map(key => ({
    key,
    label: labels[key],
    tags: selected.filter(item => item.category === key).map(item => item.tag)
  })).filter(group => group.tags.length);
}

function researchPayload(selected, settings) {
  return selected.map(item => ({
    tag: item.tag,
    postCount: item.postCount,
    source: item.researchSource,
    freshness: daysSince(item.sampledAt) <= settings.staleAfterDays ? 'fresh' : 'stale',
    scoreBand: item.scoreBand,
    score: item.score
  }));
}

function formatCopyText(groups) {
  return groups.flatMap(group => group.tags).join(' ');
}

async function logGeneration({ requestId: id, postType, memo, selected, criteriaVersion }) {
  if (!SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await writeSupabase('hashtag_generations', {
      request_id: id,
      post_type: postType,
      memo_hash: hashMemo(memo),
      generated_tags: selected.map(item => item.tag),
      selected_tags: selected.map(item => item.tag),
      criteria_version: criteriaVersion
    }, { serviceRole: true });
  } catch (err) {
    console.warn('[hashtag-gen] generation log skipped:', err.message || err);
  }
}

function dataConnectionError(id, missingTags) {
  return {
    error: '해시태그 데이터 연결이 필요해요. Apify로 게시글 수를 먼저 갱신해 주세요.',
    code: 'HASHTAG_RESEARCH_REQUIRED',
    missingTags: missingTags.slice(0, 12),
    requestId: id
  };
}

async function handler(req, res) {
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
    if (!memo) {
      sendJson(res, 400, { error: '인스타그램 게시글 본문을 먼저 입력해 주세요.', requestId: id });
      return;
    }

    const includeLocalTags = body.includeLocalTags !== false;
    const includeBrandTags = body.includeBrandTags !== false;
    const [context, settings] = await Promise.all([loadCafeContext(), loadHashtagSettings()]);
    const aiCandidates = await callGeminiForCandidates({ memo, context });
    const candidates = buildCandidatePool({
      memo,
      postType,
      context,
      settings,
      aiCandidates,
      includeLocalTags,
      includeBrandTags
    });
    const researchCache = await loadResearchCache(candidates.map(item => item.tag));
    const selected = selectRankedTags({
      candidates,
      researchCache,
      memo,
      context,
      settings,
      includeLocalTags,
      includeBrandTags
    });

    if (selected.length < settings.targetCount) {
      const missingTags = candidates
        .filter(item => !researchCache.has(tagKey(item.tag)))
        .map(item => item.tag);
      console.warn('[hashtag-gen] research required', JSON.stringify({ requestId: id, selected: selected.length, missing: missingTags.slice(0, 12) }));
      sendJson(res, 503, dataConnectionError(id, missingTags));
      return;
    }

    const tags = groupSelectedTags(selected);
    await logGeneration({ requestId: id, postType, memo, selected, criteriaVersion: settings.criteriaVersion });
    sendJson(res, 200, {
      tags,
      copyText: formatCopyText(tags),
      reasonSummary: `본문과 TUZ 맥락에 맞춰 해시태그 ${selected.length}개를 골랐어요.`,
      criteriaVersion: settings.criteriaVersion,
      research: researchPayload(selected, settings),
      requestId: id
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    console.error('[hashtag-gen]', JSON.stringify({
      requestId: id,
      code: err.code || 'HANDLER_ERROR',
      message: err.message || String(err)
    }));
    sendJson(res, statusCode, {
      error: err.message || '해시태그 생성 중 오류가 발생했습니다.',
      code: err.code || 'HANDLER_ERROR',
      requestId: id
    });
  }
}

module.exports = handler;
module.exports._test = {
  DEFAULT_SETTINGS,
  normalizeTag,
  uniqTags,
  keywordTags,
  buildCandidatePool,
  selectRankedTags,
  groupSelectedTags,
  researchPayload,
  formatCopyText,
  tagKey,
  hashMemo
};
