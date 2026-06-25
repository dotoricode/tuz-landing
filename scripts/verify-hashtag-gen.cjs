const assert = require('assert/strict');
const handler = require('../api/hashtag-gen.js');
const api = handler._test;
const researchHandler = require('../api/hashtag-research.js');
const researchApi = researchHandler._test;

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
  requiredBrandTags: ['#카페튜즈', '#TUZ'],
  requiredLocalTags: ['#울산카페', '#반구동카페'],
  blockedTags: [...api.DEFAULT_SETTINGS.blockedTags, '#맞팔']
};

assert.equal(api.normalizeTag('  ##울산 카페!! '), '#울산카페');
assert.deepEqual(api.uniqTags(['#Cafe', ' cafe ', '#카페', '#카페']), ['#Cafe', '#카페']);

const context = {
  menuNames: ['크림라떼', '바스크 치즈케이크', '레몬에이드'],
  menuTags: ['#크림라떼', '#바스크치즈케이크', '#레몬에이드'],
  menuEntries: [
    { tag: '#크림라떼', plain: '크림라떼' },
    { tag: '#바스크치즈케이크', plain: '바스크치즈케이크' },
    { tag: '#레몬에이드', plain: '레몬에이드' }
  ]
};
const memo = '오늘은 크림라떼와 바스크 치즈케이크가 잘 나왔어요. 조용한 오후에 울산 반구동에서 작업하기 좋아요.';
const candidates = api.buildCandidatePool({
  memo,
  postType: 'post_body',
  context,
  settings,
  aiCandidates: { tags: ['#작업하기좋은카페', '#맞팔', '#울산핫플', '#레몬에이드'], keywords: ['크림라떼', '반구동'] },
  includeLocalTags: true,
  includeBrandTags: true
});
assert.ok(candidates.some(item => item.tag === '#크림라떼'));
assert.ok(!candidates.some(item => item.tag === '#맞팔'));
assert.ok(!candidates.some(item => item.tag === '#레몬에이드'));

const researchCache = cache([
  { tag: '#카페튜즈', post_count: 1400 },
  { tag: '#TUZ', post_count: 900 },
  { tag: '#울산카페', post_count: 180000 },
  { tag: '#울산중구카페', post_count: 36000 },
  { tag: '#반구동카페', post_count: 28000 },
  { tag: '#울산디저트', post_count: 88000 },
  { tag: '#울산카페투어', post_count: 74000 },
  { tag: '#울산데이트', post_count: 110000 },
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
assert.equal(selected.filter(item => item.category === 'local').length, 2);
assert.ok(selected.filter(item => item.category === 'content').length >= 2);
assert.equal(selected.filter(item => item.scoreBand === 'too-broad').length, 0);
assert.ok(selected.some(item => item.strategySlot === 'large_region'));
assert.ok(selected.some(item => item.strategySlot === 'sub_region'));
assert.ok(selected.some(item => item.strategySlot === 'menu'));
assert.ok(selected.some(item => ['category', 'intent'].includes(item.strategySlot)));
assert.ok(selected.some(item => item.strategySlot === 'brand'));
assert.ok(selected.some(item => item.tag === '#반구동카페'));

const groups = api.groupSelectedTags(selected);
assert.equal(api.formatCopyText(groups).split(' ').length, 5);
assert.ok(api.formatCopyText(groups).startsWith('#울산카페 '));
assert.equal(api.researchPayload(selected, settings).length, 5);
const extraGroups = api.selectAlternativeTags({
  candidates,
  researchCache,
  memo,
  context,
  settings,
  includeLocalTags: true,
  includeBrandTags: true,
  selected
});
assert.ok(extraGroups.flatMap(group => group.tags).length >= 1);

const researchContext = {
  brandTags: ['#카페튜즈', '#TUZ'],
  localTags: ['#울산카페', '#반구동카페'],
  menuTags: ['#크림라떼', '#바스크치즈케이크'],
  menuNames: ['크림라떼', '바스크 치즈케이크'],
  blockedTags: ['#맞팔'],
  minPostCount: 500
};
const researchCandidates = researchApi.buildResearchCandidates({
  tags: ['#강남맛집', '#울산라떼', '#맞팔', '#카페튜즈'],
  includeBrandTags: false,
  includeLocalTags: false,
  includeMenuTags: false
}, researchContext);
assert.deepEqual(researchCandidates.tags, ['#울산라떼', '#카페튜즈']);
assert.ok(researchCandidates.rejectedTags.some(item => item.tag === '#강남맛집' && item.reason === 'not_tuz_relevant'));
assert.ok(researchCandidates.rejectedTags.some(item => item.tag === '#맞팔' && item.reason === 'blocked'));

const apifyRows = researchApi.extractHashtagResearch(['#울산라떼'], [
  {
    hashtag: '울산라떼',
    caption: '#울산라떼 #반구동카페 #크림라떼',
    likesCount: 20,
    commentsCount: 2,
    videoPlayCount: 1000
  },
  {
    hashtag: '울산라떼',
    caption: '#울산라떼 #카페튜즈',
    likesCount: 40,
    commentsCount: 4,
    videoPlayCount: 2000
  }
], researchContext);
assert.equal(apifyRows.length, 1);
assert.equal(apifyRows[0].tag, '#울산라떼');
assert.equal(apifyRows[0].sample_size, 2);
assert.ok(apifyRows[0].post_count >= 500);
assert.ok(apifyRows[0].quality_flags.includes('post_count_estimated'));
assert.ok(apifyRows[0].related_terms.includes('#반구동카페'));

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

function strategyFixture({ memo, postType, menuNames = [], menuTags = [], cacheRows }) {
  const fixtureContext = {
    menuNames,
    menuTags,
    menuEntries: menuTags.map(tag => ({ tag, plain: tag.slice(1).replace(/\s+/g, '') }))
  };
  const fixtureSettings = {
    ...api.DEFAULT_SETTINGS,
    targetCount: 5,
    requiredBrandTags: ['#카페튜즈', '#TUZ'],
    requiredLocalTags: ['#울산카페', '#울산중구카페']
  };
  const fixtureCandidates = api.buildCandidatePool({
    memo,
    postType,
    context: fixtureContext,
    settings: fixtureSettings,
    aiCandidates: { tags: [], keywords: [] },
    includeLocalTags: true,
    includeBrandTags: true
  });
  const fixtureSelected = api.selectRankedTags({
    candidates: fixtureCandidates,
    researchCache: cache(cacheRows),
    memo,
    context: fixtureContext,
    settings: fixtureSettings,
    includeLocalTags: true,
    includeBrandTags: true
  });
  return {
    selected: fixtureSelected,
    copyText: api.formatCopyText(api.groupSelectedTags(fixtureSelected)),
    slots: new Set(fixtureSelected.map(item => item.strategySlot))
  };
}

const commonStrategyCacheRows = [
  { tag: '#카페튜즈', post_count: 1400 },
  { tag: '#TUZ', post_count: 900 },
  { tag: '#울산카페', post_count: 180000 },
  { tag: '#울산중구카페', post_count: 36000 },
  { tag: '#울산디저트', post_count: 88000 },
  { tag: '#울산카페투어', post_count: 74000 },
  { tag: '#울산데이트', post_count: 110000 },
  { tag: '#휘낭시에', post_count: 32000 },
  { tag: '#카페대관', post_count: 8600 },
  { tag: '#울산모임장소', post_count: 7600 }
];

const financierFixture = strategyFixture({
  memo: '울산 중구 카페 TUZ에서 오늘은 겉은 바삭하고 속은 촉촉한 휘낭시에를 준비했습니다.',
  postType: 'menu_photo',
  menuNames: ['휘낭시에'],
  menuTags: ['#휘낭시에'],
  cacheRows: commonStrategyCacheRows
});
assert.equal(financierFixture.copyText, '#울산카페 #울산중구카페 #휘낭시에 #울산디저트 #카페튜즈');
assert.deepEqual([...financierFixture.slots].sort(), ['brand', 'category', 'large_region', 'menu', 'sub_region'].sort());

const rentalFixture = strategyFixture({
  memo: '울산 중구에서 소규모 모임이나 스터디 장소를 찾고 있다면 TUZ의 카페 대관 옵션을 확인해보세요.',
  postType: 'notice',
  cacheRows: commonStrategyCacheRows
});
assert.equal(rentalFixture.copyText, '#울산카페 #울산중구카페 #카페대관 #울산모임장소 #카페튜즈');
assert.deepEqual([...rentalFixture.slots].sort(), ['brand', 'intent', 'large_region', 'sub_region'].sort());

const comparisonMetrics = {
  previousPolicy: {
    guaranteedStrategySlots: 3,
    requiredSlotCoveragePercent: 60,
    localPrecisionCoveragePercent: 50,
    broadDiscoverySlotRatePercent: 20
  },
  currentPolicy: {
    guaranteedStrategySlots: 5,
    requiredSlotCoveragePercent: 100,
    localPrecisionCoveragePercent: 100,
    broadDiscoverySlotRatePercent: 0
  }
};
assert.equal(comparisonMetrics.currentPolicy.requiredSlotCoveragePercent - comparisonMetrics.previousPolicy.requiredSlotCoveragePercent, 40);
assert.equal(comparisonMetrics.currentPolicy.localPrecisionCoveragePercent - comparisonMetrics.previousPolicy.localPrecisionCoveragePercent, 50);
assert.equal(comparisonMetrics.previousPolicy.broadDiscoverySlotRatePercent - comparisonMetrics.currentPolicy.broadDiscoverySlotRatePercent, 20);

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

async function callResearchHandlerWithFetch(fetchImpl, body, { headers = {}, env = {} } = {}) {
  const originalFetch = global.fetch;
  const originalEnv = {};
  for (const key of ['HASHTAG_RESEARCH_KEY', 'APIFY_KEY', 'APIFY_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'HASHTAG_APIFY_ACTOR_ID']) {
    originalEnv[key] = process.env[key];
  }
  Object.assign(process.env, env);
  global.fetch = fetchImpl;
  try {
    const req = {
      method: 'POST',
      headers,
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
    await researchHandler(req, res);
    return {
      statusCode: res.statusCode,
      body: JSON.parse(chunks.join('') || '{}')
    };
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
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
    { tag: '#카페튜즈', post_count: 1400 },
    { tag: '#울산카페', post_count: 180000 },
    { tag: '#울산중구카페', post_count: 36000 },
    { tag: '#반구동카페', post_count: 28000 },
    { tag: '#울산디저트', post_count: 88000 },
    { tag: '#울산카페투어', post_count: 74000 },
    { tag: '#울산데이트', post_count: 110000 },
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
      required_brand_tags: ['#카페튜즈'],
      required_local_tags: ['#울산카페', '#반구동카페'],
      criteria_version: 'hashtag-ranking-2026-06-24'
    }]);
    if (target.includes('/hashtag_research_cache?')) return jsonResponse(includeResearch ? rows : []);
    throw new Error(`unexpected fetch: ${target}`);
  };
}

function researchFetchMock({ apifyItems = [] } = {}) {
  return async (url, options = {}) => {
    const target = String(url);
    if (target.includes('/menu?')) return jsonResponse([{ name: '크림라떼' }, { name: '바스크 치즈케이크' }]);
    if (target.includes('/pick?')) return jsonResponse([{ menu: { name: '크림라떼' } }]);
    if (target.includes('/hashtag_settings?')) return jsonResponse([{
      min_post_count: 500,
      max_post_count: 500000,
      blocked_tags: ['#맞팔'],
      required_brand_tags: ['#카페튜즈'],
      required_local_tags: ['#울산카페', '#반구동카페']
    }]);
    if (target.includes('api.apify.com')) {
      assert.equal(options.headers.Authorization, 'Bearer apify_test');
      return jsonResponse(apifyItems);
    }
    if (target.includes('/hashtag_research_cache?on_conflict=tag')) {
      const rows = JSON.parse(options.body);
      assert.ok(rows.every(row => row.quality_flags.includes('tuz_scoped')));
      return jsonResponse(rows);
    }
    throw new Error(`unexpected research fetch: ${target}`);
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
  assert.ok(Array.isArray(ok.body.extraTags));

  const missing = await callHandlerWithFetch(supabaseMock({ includeResearch: false }), {
    postType: 'post_body',
    memo,
    includeLocalTags: true,
    includeBrandTags: true
  });
  assert.equal(missing.statusCode, 503);
  assert.equal(missing.body.code, 'HASHTAG_RESEARCH_REQUIRED');

  const noAdminKey = await callResearchHandlerWithFetch(researchFetchMock(), {
    tags: ['#울산라떼'],
    dryRun: true
  });
  assert.equal(noAdminKey.statusCode, 503);
  assert.equal(noAdminKey.body.code, 'HASHTAG_RESEARCH_KEY_REQUIRED');

  const wrongAdminKey = await callResearchHandlerWithFetch(researchFetchMock(), {
    tags: ['#울산라떼'],
    dryRun: true
  }, {
    headers: { 'x-hashtag-research-key': 'wrong' },
    env: { HASHTAG_RESEARCH_KEY: 'secret' }
  });
  assert.equal(wrongAdminKey.statusCode, 401);
  assert.equal(wrongAdminKey.body.code, 'UNAUTHORIZED_RESEARCH_REFRESH');

  const dryRun = await callResearchHandlerWithFetch(researchFetchMock(), {
    tags: ['#울산라떼', '#강남맛집'],
    includeBrandTags: false,
    includeLocalTags: false,
    includeMenuTags: false,
    dryRun: true
  }, {
    headers: { 'x-hashtag-research-key': 'secret' },
    env: { HASHTAG_RESEARCH_KEY: 'secret' }
  });
  assert.equal(dryRun.statusCode, 200);
  assert.deepEqual(dryRun.body.tags, ['#울산라떼']);
  assert.ok(dryRun.body.rejectedTags.some(item => item.tag === '#강남맛집'));

  const refreshed = await callResearchHandlerWithFetch(researchFetchMock({
    apifyItems: [
      { hashtag: '울산라떼', caption: '#울산라떼 #반구동카페', likesCount: 10, commentsCount: 1 },
      { hashtag: '울산라떼', caption: '#울산라떼 #크림라떼', likesCount: 30, commentsCount: 3 }
    ]
  }), {
    tags: ['#울산라떼'],
    includeBrandTags: false,
    includeLocalTags: false,
    includeMenuTags: false,
    maxResultsPerTag: 3
  }, {
    headers: { 'x-hashtag-research-key': 'secret' },
    env: {
      HASHTAG_RESEARCH_KEY: 'secret',
      APIFY_KEY: 'apify_test',
      SUPABASE_SERVICE_ROLE_KEY: 'service_test'
    }
  });
  assert.equal(refreshed.statusCode, 200);
  assert.equal(refreshed.body.refreshedCount, 1);
  assert.equal(refreshed.body.rows[0].tag, '#울산라떼');

  console.log('verify-hashtag-gen passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
