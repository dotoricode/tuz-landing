const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lwgissxdvemamuybxmxz.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3Z2lzc3hkdmVtYW11eWJ4bXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjMxNjgsImV4cCI6MjA5MjA5OTE2OH0.bslx3DGC2KPKleWo9KejERD10e92OeBEUoQHg2_jPOo';
const MAX_BODY_BYTES = 5000;
const MAX_REFRESH_TAGS = 20;
const DEFAULT_RESULTS_PER_TAG = 12;
const DEFAULT_ACTOR_ID = 'apify/instagram-hashtag-scraper';
const SOURCE = 'apify-hashtag-scraper';

const DEFAULT_BRAND_TAGS = ['#tuzz2026', '#투즈', '#TUZ'];
const DEFAULT_LOCAL_TAGS = ['#울산카페', '#성남동카페', '#울산중구카페', '#울산카페추천'];
const DEFAULT_MENU_HINTS = [
  '카페', '커피', '라떼', '아메리카노', '크림', '디저트', '케이크', '말차',
  '초코', '딸기', '음료', '브런치', '원두', '시그니처', '성남동', '울산', '중구', '투즈', 'tuz'
];
const BLOCKED_DEFAULT = ['#맞팔', '#선팔', '#좋아요반사', '#팔로우', '#followforfollow', '#likeforlikes'];

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Hashtag-Research-Key');
  res.setHeader('Cache-Control', 'no-store');
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
  return cleaned ? `#${cleaned}` : '';
}

function uniqTags(tags) {
  const seen = new Set();
  return (Array.isArray(tags) ? tags : []).map(normalizeTag).filter(tag => {
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function tagKey(tag) {
  return normalizeTag(tag).toLowerCase();
}

function tagText(tag) {
  return normalizeTag(tag).slice(1).toLowerCase();
}

function toArray(value, fallback = []) {
  return Array.isArray(value) ? value.filter(Boolean) : fallback;
}

function numberFrom(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function median(values) {
  const sorted = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function getEnv() {
  return {
    researchKey: process.env.HASHTAG_RESEARCH_KEY || '',
    apifyKey: process.env.APIFY_KEY || process.env.APIFY_TOKEN || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    apifyActorId: process.env.HASHTAG_APIFY_ACTOR_ID || DEFAULT_ACTOR_ID,
    apifyInputTemplate: process.env.HASHTAG_APIFY_INPUT_TEMPLATE || ''
  };
}

function headerValue(req, name) {
  const headers = req.headers || {};
  const direct = headers[name] || headers[name.toLowerCase()];
  if (Array.isArray(direct)) return direct[0] || '';
  return String(direct || '');
}

async function fetchSupabase(path, { serviceRole = false } = {}) {
  const env = getEnv();
  const key = serviceRole && env.supabaseServiceRoleKey ? env.supabaseServiceRoleKey : SUPABASE_ANON_KEY;
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

async function upsertSupabase(path, payload) {
  const env = getEnv();
  if (!env.supabaseServiceRoleKey) {
    throw Object.assign(new Error('Supabase 쓰기 키가 필요해요. Vercel에 SUPABASE_SERVICE_ROLE_KEY를 추가해 주세요.'), {
      statusCode: 503,
      code: 'SUPABASE_SERVICE_ROLE_KEY_REQUIRED'
    });
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: env.supabaseServiceRoleKey,
      Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase upsert ${response.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : [];
}

async function loadCafeContext() {
  try {
    const [menu, picks, settingsRows] = await Promise.all([
      fetchSupabase('menu?select=name,category&order=sort_order.asc&limit=40'),
      fetchSupabase('pick?select=name,menu:menu_id(name)&order=sort_order.asc&limit=10'),
      fetchSupabase('hashtag_settings?select=blocked_tags,required_brand_tags,required_local_tags,min_post_count,max_post_count&id=eq.1&limit=1')
    ]);
    const menuNames = (menu || []).map(item => item.name).filter(Boolean);
    const pickNames = (picks || []).map(item => item.menu?.name || item.name).filter(Boolean);
    const settings = settingsRows?.[0] || {};
    return {
      menuNames,
      pickNames,
      menuTags: uniqTags([...pickNames, ...menuNames].map(name => `#${name}`)),
      brandTags: uniqTags(toArray(settings.required_brand_tags, DEFAULT_BRAND_TAGS)),
      localTags: uniqTags(toArray(settings.required_local_tags, DEFAULT_LOCAL_TAGS)),
      blockedTags: uniqTags([...BLOCKED_DEFAULT, ...toArray(settings.blocked_tags, [])]),
      minPostCount: Number(settings.min_post_count) || 500,
      maxPostCount: Number(settings.max_post_count) || 500000
    };
  } catch (err) {
    console.warn('[hashtag-research] Supabase context fallback:', err.message || err);
    return {
      menuNames: [],
      pickNames: [],
      menuTags: [],
      brandTags: DEFAULT_BRAND_TAGS,
      localTags: DEFAULT_LOCAL_TAGS,
      blockedTags: BLOCKED_DEFAULT,
      minPostCount: 500,
      maxPostCount: 500000
    };
  }
}

function isTuzRelevant(tag, context) {
  const text = tagText(tag);
  if (!text) return false;
  if (/tuz|투즈/.test(text)) return true;
  if (/울산|성남동|중구/.test(text)) return true;
  if (DEFAULT_MENU_HINTS.some(hint => text.includes(hint.toLowerCase()))) return true;
  if ((context.menuNames || []).some(name => {
    const plain = String(name).replace(/\s+/g, '').toLowerCase();
    return plain && (text.includes(plain) || plain.includes(text));
  })) return true;
  return false;
}

function buildResearchCandidates(body, context) {
  const requested = uniqTags(body.tags || body.hashtags || []);
  const base = [
    ...(body.includeBrandTags === false ? [] : context.brandTags),
    ...(body.includeLocalTags === false ? [] : context.localTags),
    ...(body.includeMenuTags === false ? [] : context.menuTags),
    ...requested
  ];
  const blocked = new Set((context.blockedTags || []).map(tagKey));
  const accepted = [];
  const rejected = [];

  for (const tag of uniqTags(base)) {
    if (blocked.has(tagKey(tag))) {
      rejected.push({ tag, reason: 'blocked' });
      continue;
    }
    if (!isTuzRelevant(tag, context)) {
      rejected.push({ tag, reason: 'not_tuz_relevant' });
      continue;
    }
    accepted.push(tag);
  }

  const limit = Math.max(1, Math.min(Number(body.maxTags) || MAX_REFRESH_TAGS, MAX_REFRESH_TAGS));
  return {
    tags: accepted.slice(0, limit),
    rejectedTags: rejected
  };
}

function actorPathId(actorId) {
  return String(actorId || DEFAULT_ACTOR_ID).replace('/', '~');
}

function buildApifyInput(tags, resultsPerTag, template = '') {
  const bareTags = tags.map(tag => tag.slice(1));
  if (template) {
    const json = template
      .replaceAll('{{hashtags}}', JSON.stringify(bareTags))
      .replaceAll('{{resultsLimit}}', String(resultsPerTag));
    return JSON.parse(json);
  }
  return {
    hashtags: bareTags,
    resultsLimit: resultsPerTag,
    resultsType: 'posts',
    searchType: 'hashtag',
    addParentData: false
  };
}

async function runApifyHashtagScraper(tags, { resultsPerTag }) {
  const env = getEnv();
  if (!env.apifyKey) {
    throw Object.assign(new Error('Apify 키가 필요해요. Vercel에 APIFY_KEY를 추가해 주세요.'), {
      statusCode: 503,
      code: 'APIFY_KEY_REQUIRED'
    });
  }

  const input = buildApifyInput(tags, resultsPerTag, env.apifyInputTemplate);
  const endpoint = `https://api.apify.com/v2/acts/${encodeURIComponent(actorPathId(env.apifyActorId))}/run-sync-get-dataset-items?timeout=120&memory=1024`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.apifyKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(input)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Apify ${response.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : [];
}

function itemHashtags(item) {
  const values = [
    ...(Array.isArray(item?.hashtags) ? item.hashtags : []),
    ...(Array.isArray(item?.captionHashtags) ? item.captionHashtags : []),
    item?.hashtag,
    item?.input,
    item?.query
  ];
  const caption = String(item?.caption || item?.text || item?.description || '');
  const captionTags = caption.match(/#[0-9A-Za-z_가-힣]+/g) || [];
  return uniqTags([...values, ...captionTags]);
}

function itemMatchesTag(item, tag) {
  const key = tagKey(tag);
  const tags = itemHashtags(item).map(tagKey);
  if (tags.includes(key)) return true;
  const plain = tagText(tag);
  const source = [
    item?.url,
    item?.inputUrl,
    item?.displayUrl,
    item?.ownerUsername,
    item?.caption
  ].map(value => String(value || '').toLowerCase()).join(' ');
  return source.includes(plain);
}

function directPostCount(items) {
  for (const item of items) {
    const candidates = [
      item?.postCount,
      item?.postsCount,
      item?.mediaCount,
      item?.count,
      item?.edge_hashtag_to_media?.count
    ].map(numberFrom).filter(Number.isFinite);
    if (candidates.length) return Math.max(...candidates);
  }
  return null;
}

function extractHashtagResearch(tags, items, context = {}) {
  const rows = [];
  const minPostCount = Number(context.minPostCount) || 500;

  for (const tag of uniqTags(tags)) {
    const matched = (Array.isArray(items) ? items : []).filter(item => itemMatchesTag(item, tag));
    const workingSet = matched.length ? matched : [];
    const postCountFromActor = directPostCount(workingSet);
    const sampleSize = workingSet.length;
    const estimatedPostCount = Math.max(minPostCount, sampleSize * 100);
    const postCount = postCountFromActor ?? estimatedPostCount;
    const relatedCounts = new Map();

    for (const item of workingSet) {
      for (const related of itemHashtags(item)) {
        if (tagKey(related) === tagKey(tag)) continue;
        if (!isTuzRelevant(related, context)) continue;
        relatedCounts.set(tagKey(related), {
          tag: normalizeTag(related),
          count: (relatedCounts.get(tagKey(related))?.count || 0) + 1
        });
      }
    }

    const likes = workingSet.map(item => item?.likesCount ?? item?.likes ?? item?.likeCount);
    const comments = workingSet.map(item => item?.commentsCount ?? item?.comments ?? item?.commentCount);
    const plays = workingSet.map(item => item?.videoPlayCount ?? item?.videoViewCount ?? item?.viewsCount ?? item?.views);
    const medianLikes = median(likes);
    const medianComments = median(comments);
    const medianPlays = median(plays);
    const engagementScore = Number((
      (medianLikes || 0) +
      (medianComments || 0) * 3 +
      (medianPlays || 0) * 0.01
    ).toFixed(2));
    const qualityFlags = [
      'tuz_scoped',
      ...(postCountFromActor == null ? ['post_count_estimated', 'apify_sample'] : ['post_count_actor']),
      ...(sampleSize === 0 ? ['no_sample_match'] : [])
    ];

    rows.push({
      tag,
      post_count: Math.round(postCount),
      sampled_at: new Date().toISOString(),
      source: SOURCE,
      related_terms: [...relatedCounts.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(item => item.tag),
      quality_flags: qualityFlags,
      sample_size: sampleSize,
      median_likes: medianLikes,
      median_comments: medianComments,
      median_plays: medianPlays,
      engagement_score: engagementScore
    });
  }

  return rows;
}

async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'POST만 지원합니다.', code: 'METHOD_NOT_ALLOWED' });
    return;
  }

  try {
    const env = getEnv();
    if (!env.researchKey) {
      sendJson(res, 503, {
        error: '해시태그 리서치 관리자 키가 필요해요. Vercel에 HASHTAG_RESEARCH_KEY를 추가해 주세요.',
        code: 'HASHTAG_RESEARCH_KEY_REQUIRED'
      });
      return;
    }
    if (headerValue(req, 'x-hashtag-research-key') !== env.researchKey) {
      sendJson(res, 401, { error: '해시태그 리서치 권한이 없어요.', code: 'UNAUTHORIZED_RESEARCH_REFRESH' });
      return;
    }

    const body = await readJsonBody(req);
    const context = await loadCafeContext();
    const { tags, rejectedTags } = buildResearchCandidates(body, context);
    const resultsPerTag = Math.max(3, Math.min(Number(body.maxResultsPerTag) || DEFAULT_RESULTS_PER_TAG, 30));

    if (!tags.length) {
      sendJson(res, 400, {
        error: 'TUZ와 관련 있는 리서치 후보가 없어요.',
        code: 'NO_TUZ_RESEARCH_CANDIDATES',
        rejectedTags
      });
      return;
    }

    if (body.dryRun === true) {
      sendJson(res, 200, {
        dryRun: true,
        tags,
        rejectedTags,
        apifyActorId: env.apifyActorId,
        apifyInput: buildApifyInput(tags, resultsPerTag, env.apifyInputTemplate)
      });
      return;
    }

    const items = await runApifyHashtagScraper(tags, { resultsPerTag });
    const rows = extractHashtagResearch(tags, items, context);
    const refreshed = await upsertSupabase('hashtag_research_cache?on_conflict=tag', rows);

    sendJson(res, 200, {
      refreshedCount: rows.length,
      tags,
      rejectedTags,
      source: SOURCE,
      rows: refreshed.length ? refreshed : rows
    });
  } catch (err) {
    console.error('[hashtag-research]', JSON.stringify({
      code: err.code || 'HASHTAG_RESEARCH_ERROR',
      message: err.message || String(err)
    }));
    sendJson(res, err.statusCode || 500, {
      error: err.message || '해시태그 리서치 중 오류가 발생했습니다.',
      code: err.code || 'HASHTAG_RESEARCH_ERROR'
    });
  }
}

module.exports = handler;
module.exports._test = {
  DEFAULT_BRAND_TAGS,
  DEFAULT_LOCAL_TAGS,
  normalizeTag,
  uniqTags,
  tagKey,
  isTuzRelevant,
  buildResearchCandidates,
  buildApifyInput,
  extractHashtagResearch,
  actorPathId
};
