// ─── 외부 모듈 ───────────────────────────────
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './shared/supabase.js?v=48';
import { showConnectionToast } from './shared/conn-toast.js?v=48';
import { bootSettings, refreshSettings } from './shared/settings.js?v=48';
import {
  renderGreeting,
  GREETING_LABEL,
  GREETING_LOADER_SPEC,
} from './slices/greeting/public.js?v=48';
import {
  renderWinners,
  WINNERS_LABEL,
  WINNERS_LOADER_SPEC,
} from './slices/winners/public.js?v=48';
import {
  renderWifi,
  WIFI_LABEL,
  initWifi,
} from './slices/wifi/public.js?v=48';
import {
  renderHours,
  HOURS_LABEL,
  initHours,
} from './slices/hours/public.js?v=48';
import {
  LOCATION_LABEL,
  LOCATION_LOADER,
  initLocation,
} from './slices/location/public.js?v=48';
import {
  renderMenu,
  MENU_LABEL,
  MENU_LOADER_SPEC,
  initMenu,
} from './slices/menu/public.js?v=48';
import {
  renderNews,
  NEWS_LABEL,
  NEWS_LOADER_SPEC,
} from './slices/news/public.js?v=48';
import {
  renderPicks,
  PICK_LABEL,
  PICK_LOADER_SPEC,
} from './slices/pick/public.js?v=48';

// admin.js 등 외부 import 호환을 위해 re-export
export { supabase, SUPABASE_URL, SUPABASE_ANON_KEY };

const CACHE_MS = 2 * 60 * 1000;

// ─── 라우팅 ──────────────────────────────────
const views = document.querySelectorAll('[data-view]');
const validViews = new Set([...views].map((v) => v.dataset.view));

export function showView(name, { pushHistory = true } = {}) {
  const target = validViews.has(name) ? name : 'home';
  views.forEach((v) => { v.hidden = v.dataset.view !== target; });
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

  const hash = target === 'home' ? '' : `#${target}`;
  if (pushHistory && window.location.hash !== hash) {
    history.pushState({ view: target }, '', hash || window.location.pathname);
  }
  document.title = target === 'home'
    ? 'Tuz · coffee & dessert'
    : `Tuz · ${titleOf(target)}`;

  if (['news', 'menu', 'pick'].includes(target)) {
    localStorage.setItem(`tuz_seen_${target}`, Date.now());
  }
  const loader = LOADERS[target];
  if (loader) loader.fn();
}

function titleOf(view) {
  return {
    wifi: WIFI_LABEL, news: NEWS_LABEL, menu: MENU_LABEL, hours: HOURS_LABEL,
    location: LOCATION_LABEL, event: WINNERS_LABEL, pick: PICK_LABEL, greeting: GREETING_LABEL,
  }[view] || '';
}

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go) { e.preventDefault(); showView(go.dataset.go); return; }
  if (e.target.closest('[data-back]')) { e.preventDefault(); showView('home'); }
});

window.addEventListener('popstate', (e) => {
  const name = (e.state && e.state.view) || (window.location.hash.slice(1) || 'home');
  showView(name, { pushHistory: false });
});

initWifi();
initHours();
initLocation();
initMenu();

// ─── 테마 ─────────────────────────────────────
const themeBtn = document.getElementById('themeToggle');
try {
  if (localStorage.getItem('tuz-theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
} catch (_) { /* ignore */ }

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? '' : 'dark';
    if (next) document.documentElement.setAttribute('data-theme', next);
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('tuz-theme', next); } catch (_) { /* ignore */ }
  });
}

// settings 데이터 흐름은 shared/settings.js로 이전 (ADR-0005).
// wifi/hours/menu 슬라이스는 자기 init 함수에서 subscribeSettings 호출.

// ─── DB 컬럼(snake_case) → JS(camelCase) 변환 ──
function toCamel(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const key = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = (v && typeof v === 'object' && !Array.isArray(v)) ? toCamel(v) : v;
  }
  return out;
}

// ─── 캐시 ─────────────────────────────────────
function readCache(key) {
  try {
    const raw = localStorage.getItem(`tuz-cache-v5:${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) { return null; }
}
function writeCache(key, data) {
  try { localStorage.setItem(`tuz-cache-v5:${key}`, JSON.stringify({ at: Date.now(), data })); }
  catch (_) { /* ignore */ }
}

// ─── Supabase 로더 ────────────────────────────
const loadingFlags = {};
async function loadTable(table, renderer, { single = false, order = 'sort_order', select = '*' } = {}) {
  if (loadingFlags[table]) return;

  const cached = readCache(table);
  if (cached?.data) renderer(cached.data);
  if (cached && Date.now() - cached.at < CACHE_MS) return;

  loadingFlags[table] = true;
  try {
    let query = supabase.from(table).select(select);
    if (!single) query = query.order(order, { ascending: true });
    const { data, error } = single ? await query.maybeSingle() : await query;
    if (error) throw error;
    const rows = (single ? (data ? [data] : []) : data || []).map(toCamel);
    // 항상 renderer 호출 — 빈 배열이면 renderer가 빈 상태(empty-state)를 그림
    renderer(rows);
    if (rows.length) writeCache(table, rows);
  } catch (e) {
    console.warn(`[tuz] ${table} load failed:`, e.message || e);
    showConnectionToast();
  } finally {
    loadingFlags[table] = false;
  }
}

export const RENDERERS = {
  news: renderNews,
  pick: renderPicks,
  winners: renderWinners,
  greeting: renderGreeting,
  menu: renderMenu,
  wifi: renderWifi,
  hours: renderHours,
};

const LOADERS = {
  [NEWS_LOADER_SPEC.view]: {
    table: NEWS_LOADER_SPEC.table,
    fn: () => loadTable(NEWS_LOADER_SPEC.table, renderNews, NEWS_LOADER_SPEC.options),
  },
  [PICK_LOADER_SPEC.view]: {
    table: PICK_LOADER_SPEC.table,
    fn: () => loadTable(PICK_LOADER_SPEC.table, renderPicks, PICK_LOADER_SPEC.options),
  },
  [WINNERS_LOADER_SPEC.view]: {
    table: WINNERS_LOADER_SPEC.table,
    fn: () => loadTable(WINNERS_LOADER_SPEC.table, renderWinners, WINNERS_LOADER_SPEC.options),
  },
  [GREETING_LOADER_SPEC.view]: {
    table: GREETING_LOADER_SPEC.table,
    fn: () => loadTable(GREETING_LOADER_SPEC.table, renderGreeting, GREETING_LOADER_SPEC.options),
  },
  [MENU_LOADER_SPEC.view]: {
    table: MENU_LOADER_SPEC.table,
    fn: () => loadTable(MENU_LOADER_SPEC.table, renderMenu, MENU_LOADER_SPEC.options),
  },
  // wifi/hours view 는 LOADERS entry 가 없다 — settings 데이터는
  // shared/settings.js 가 own. 슬라이스 init 에서 subscribeSettings 등록.
  [LOCATION_LOADER.view]: { table: LOCATION_LOADER.table, fn: LOCATION_LOADER.fn },
};

// settings 첫 로드 — bootSettings 가 캐시 즉시 publish + 백그라운드 fetch
bootSettings();
// news도 먼저 로드 — 홈의 "오늘의 공지"가 필요
LOADERS.news.fn();

// 관리자가 저장한 후 현재 보이는 화면의 데이터를 강제 새로고침
export async function refreshTable(table) {
  if (table === 'settings') { await refreshSettings(); return; }
  try { localStorage.removeItem(`tuz-cache-v5:${table}`); } catch (_) { /* ignore */ }
  for (const { table: t, fn } of Object.values(LOADERS)) {
    if (t === table) await fn();
  }
}

// admin.js 등에서 직접 사용할 수 있도록 re-export
export { refreshSettings };

// ─── 초기 라우트 ──────────────────────────────
const initial = window.location.hash.slice(1) || 'home';
showView(initial, { pushHistory: false });

// admin module boot
import('./admin.js?v=48').catch((e) => console.warn('[tuz] admin module not loaded:', e));
