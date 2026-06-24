const assert = require('assert/strict');
const handler = require('../api/hashtag-gen.js');
const api = handler._test;

function cache(rows) {
  return new Map(rows.map(row => [api.tagKey(row.tag), {
    tag: row.tag,
    post_count: row.post_count,
    sampled_at: row.sampled_at || new Date().toISOString(),
    source: row.source || 'test'
  }]));
}

const settings = {
  ...api.DEFAULT_SETTINGS,
  targetCount: 5,
  requiredBrandTags: ['#tuzz2026', '#투즈'],
  requiredLocalTags: ['#울산카페', '#성남동카페'],
  blockedTags: ['#맞팔']
};

assert.equal(api.normalizeTag('  ##울산 카페!! '), '#울산카페');
assert.deepEqual(api.uniqTags(['#Cafe', ' cafe ', '#카페', '#카페']), ['#Cafe', '#카페']);

const context = {
  menuNames: ['크림라떼', '바스크 치즈케이크'],
  menuTags: ['#크림라떼', '#바스크치즈케이크']
};
const memo = '오늘은 크림라떼와 바스크 치즈케이크가 잘 나왔어요. 조용한 오후에 울산 성남동에서 작업하기 좋아요.';
const candidates = api.buildCandidatePool({
  memo,
  postType: 'post_body',
  context,
  settings,
  aiCandidates: { tags: ['#작업하기좋은카페', '#맞팔', '#울산핫플'] },
  includeLocalTags: true,
  includeBrandTags: true
});
assert.ok(candidates.some(item => item.tag === '#크림라떼'));
assert.ok(!candidates.some(item => item.tag === '#맞팔'));

const researchCache = cache([
  { tag: '#tuzz2026', post_count: 1400 },
  { tag: '#투즈', post_count: 800 },
  { tag: '#울산카페', post_count: 180000 },
  { tag: '#성남동카페', post_count: 28000 },
  { tag: '#크림라떼', post_count: 42000 },
  { tag: '#바스크치즈케이크', post_count: 65000 },
  { tag: '#작업하기좋은카페', post_count: 12000 },
  { tag: '#울산핫플', post_count: 720000 },
  { tag: '#카페', post_count: 9000000 },
  { tag: '#카페스타그램', post_count: 1800000 },
  { tag: '#커피', post_count: 2300000 },
  { tag: '#디저트', post_count: 1300000 },
  { tag: '#오늘의카페', post_count: 76000 },
  { tag: '#카페게시물', post_count: 6000 }
]);
const selected = api.selectRankedTags({
  candidates,
  researchCache,
  memo,
  context,
  settings,
  includeLocalTags: true,
  includeBrandTags: true
});
assert.equal(selected.length, 5);
assert.equal(selected.filter(item => item.category === 'brand').length, 1);
assert.equal(selected.filter(item => item.category === 'local').length, 1);
assert.ok(selected.filter(item => item.category === 'content').length >= 2);
assert.ok(selected.filter(item => item.scoreBand === 'too-broad').length <= 1);

const groups = api.groupSelectedTags(selected);
assert.equal(api.formatCopyText(groups).split(' ').length, 5);
assert.equal(api.researchPayload(selected, settings).length, 5);

const noBrandLocal = api.selectRankedTags({
  candidates,
  researchCache,
  memo,
  context,
  settings,
  includeLocalTags: false,
  includeBrandTags: false
});
assert.equal(noBrandLocal.length, 5);
assert.equal(noBrandLocal.some(item => item.category === 'brand'), false);
assert.equal(noBrandLocal.some(item => item.category === 'local'), false);

const manyCandidates = Array.from({ length: 30 }, (_, index) => ({
  tag: `#테스트후보${index}`,
  category: index % 2 ? 'content' : 'discovery',
  source: 'test',
  weight: 1
}));
const manyCache = cache(manyCandidates.map((item, index) => ({
  tag: item.tag,
  post_count: 1000 + index * 100
})));
const capped = api.selectRankedTags({
  candidates: manyCandidates,
  researchCache: manyCache,
  memo: '테스트 후보',
  context: {},
  settings,
  includeLocalTags: false,
  includeBrandTags: false
});
assert.equal(capped.length, 5);

async function callHandlerWithFetch(fetchImpl, body) {
  const originalFetch = global.fetch;
  global.fetch = fetchImpl;
  try {
    const req = {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:8001' },
      body
    };
    const chunks = [];
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(key, value) {
        this.headers[key.toLowerCase()] = value;
      },
      end(value) {
        chunks.push(value || '');
      }
    };
    await handler(req, res);
    return {
      statusCode: res.statusCode,
      body: JSON.parse(chunks.join('') || '{}')
    };
  } finally {
    global.fetch = originalFetch;
  }
}

function jsonResponse(payload, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload)
  };
}

function supabaseMock({ includeResearch = true } = {}) {
  const rows = [
    { tag: '#tuzz2026', post_count: 1400 },
    { tag: '#울산카페', post_count: 180000 },
    { tag: '#크림라떼', post_count: 42000 },
    { tag: '#바스크치즈케이크', post_count: 65000 },
    { tag: '#작업하기좋은카페', post_count: 12000 },
    { tag: '#카페게시물', post_count: 6000 },
    { tag: '#오늘의카페', post_count: 76000 },
    { tag: '#카페', post_count: 9000000 }
  ].map(row => ({ ...row, sampled_at: new Date().toISOString(), source: 'test' }));
  return async (url) => {
    const target = String(url);
    if (target.includes('/menu?')) return jsonResponse([{ name: '크림라떼' }, { name: '바스크 치즈케이크' }]);
    if (target.includes('/pick?')) return jsonResponse([{ menu: { name: '크림라떼' } }]);
    if (target.includes('/hashtag_settings?')) return jsonResponse([{
      target_count: 5,
      min_post_count: 500,
      max_post_count: 500000,
      stale_after_days: 14,
      blocked_tags: ['#맞팔'],
      required_brand_tags: ['#tuzz2026'],
      required_local_tags: ['#울산카페'],
      criteria_version: 'hashtag-ranking-2026-06-24'
    }]);
    if (target.includes('/hashtag_research_cache?')) return jsonResponse(includeResearch ? rows : []);
    throw new Error(`unexpected fetch: ${target}`);
  };
}

(async () => {
  const ok = await callHandlerWithFetch(supabaseMock(), {
    postType: 'post_body',
    memo,
    includeLocalTags: true,
    includeBrandTags: true
  });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.copyText.split(' ').length, 5);
  assert.equal(ok.body.research.length, 5);

  const missing = await callHandlerWithFetch(supabaseMock({ includeResearch: false }), {
    postType: 'post_body',
    memo,
    includeLocalTags: true,
    includeBrandTags: true
  });
  assert.equal(missing.statusCode, 503);
  assert.equal(missing.body.code, 'HASHTAG_RESEARCH_REQUIRED');

  console.log('verify-hashtag-gen passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
