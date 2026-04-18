import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// ─── Supabase 연결 ───────────────────────────
export const SUPABASE_URL = 'https://lwgissxdvemamuybxmxz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3Z2lzc3hkdmVtYW11eWJ4bXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjMxNjgsImV4cCI6MjA5MjA5OTE2OH0.bslx3DGC2KPKleWo9KejERD10e92OeBEUoQHg2_jPOo';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const WIFI_PW = 'tuz12345';
const ADDRESS = '울산광역시 중구 염포로22, 2층';
const CACHE_MS = 2 * 60 * 1000;

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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
    ? 'TUZ · 커피와 사람 사이'
    : `TUZ · ${titleOf(target)}`;

  const loader = LOADERS[target];
  if (loader) loader();
}

function titleOf(view) {
  return {
    wifi: '와이파이', news: '공지 · 이벤트', menu: '메뉴', hours: '영업시간',
    location: '오시는 길', event: '이달의 당첨자', pick: '오늘의 추천', greeting: '사장님 인사말',
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

// ─── WiFi 비밀번호 복사 ─────────────────────
const pwBtn = document.getElementById('pwBtn');
const pwToast = document.getElementById('pwToast');
let toastTimer = null;

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) { return false; }
}

function flashToast(el, msg) {
  if (!el) return;
  if (msg) el.textContent = msg;
  el.hidden = false;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 1400);
}

if (pwBtn) {
  pwBtn.addEventListener('click', async () => {
    const ok = await copyText(WIFI_PW);
    flashToast(pwToast, ok ? '비밀번호 복사됨 ✓' : '복사 실패 · 길게 눌러 복사');
  });
}

// ─── 위치 버튼 ───────────────────────────────
const btnCopyAddr = document.getElementById('btnCopyAddr');
if (btnCopyAddr) {
  btnCopyAddr.addEventListener('click', async () => {
    const ok = await copyText(ADDRESS);
    btnCopyAddr.textContent = ok ? '복사됨 ✓' : '복사 실패';
    setTimeout(() => { btnCopyAddr.textContent = '주소 복사'; }, 1400);
  });
}
const btnRoute = document.getElementById('btnRoute');
if (btnRoute) {
  btnRoute.addEventListener('click', () => {
    window.open(`https://map.kakao.com/?q=${encodeURIComponent(ADDRESS)}`, '_blank', 'noopener');
  });
}

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

// ─── 이미지 URL 변환 + 안전 가드 ───────────────
export function imgUrl(url) {
  if (!url) return '';
  const u = String(url).trim();
  if (!/^https?:\/\//i.test(u)) return '';
  let m = u.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1200`;
  m = u.match(/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1200`;
  m = u.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (m && /drive\.google\.com/.test(u)) return `https://lh3.googleusercontent.com/d/${m[1]}=w1200`;
  return u;
}

function photoOrPh(url, placeholder, height = 140) {
  const u = imgUrl(url);
  return u
    ? `<img class="photo" src="${esc(u)}" alt="${esc(placeholder)}" style="height:${height}px" loading="lazy">`
    : `<div class="ph" style="height:${height}px" aria-hidden="true">${esc(placeholder)}</div>`;
}

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}.${mm}.${dd}`;
}

// ─── 렌더러 ──────────────────────────────────
function renderPicks(picks) {
  const list = document.getElementById('pickList');
  if (!list || !picks || !picks.length) return;
  const valid = picks.filter((p) => p.name);
  if (!valid.length) return;
  list.innerHTML = valid.map((p) => {
    const photo = photoOrPh(p.photo, `${(p.nameEn || 'pick').toLowerCase()} photo`, 140);
    return `
      <article class="card">
        <div style="margin-bottom:12px">${photo}</div>
        <div class="pick__meta">
          <span class="chip">${esc(p.barista || '사장 pick')}</span>
          <time>${esc(p.date || todayStr())}</time>
        </div>
        <div class="display display--md">${esc(p.name || '')}</div>
        ${p.nameEn ? `<div class="pick__en">${esc(p.nameEn)}</div>` : ''}
        ${p.note ? `<p class="pick__note">${esc(p.note)}</p>` : ''}
        <div class="pick__price">
          <span class="eyebrow">TODAY'S PRICE</span>
          <span class="display display--sm">${esc(p.price || '')}</span>
        </div>
      </article>
    `;
  }).join('');
}

function renderNews(items) {
  const list = document.getElementById('newsList');
  if (!list || !items || !items.length) return;
  const valid = items.filter((n) => n.title);
  if (!valid.length) return;
  list.innerHTML = valid.map((n, i) => `
    <article class="notice${i === 0 ? '' : ' notice--soft'}">
      <header class="notice__head">
        <span class="chip${i === 0 ? '' : ' chip--ink'}">${esc(n.tag || 'NOTICE')}</span>
        <time>${esc(n.date || todayStr())}</time>
      </header>
      <div class="notice__title">${esc(n.title || '')}</div>
      ${n.titleEn ? `<div class="notice__title-en">${esc(n.titleEn)}</div>` : ''}
      ${n.body ? `<p>${esc(n.body)}</p>` : ''}
    </article>
  `).join('');
}

function renderWinners(items) {
  const list = document.getElementById('winnerList');
  if (!list || !items || !items.length) return;
  const valid = items.filter((w) => w.nick);
  if (!valid.length) return;
  list.innerHTML = valid.map((w, i) => `
    <div class="winner">
      <span class="winner__num">${i + 1}</span>
      <span class="winner__nick">${esc(w.nick || '')}</span>
      <span class="chip">${esc(w.month || '무료음료')}</span>
    </div>
  `).join('');
}

function renderGreeting(items) {
  const g = items && items[0];
  if (!g) return;
  if (!g.body && !g.photo && !g.sign) return;
  const photo = document.getElementById('greetPhoto');
  if (photo && g.photo) {
    const u = imgUrl(g.photo);
    if (u) {
      const img = document.createElement('img');
      img.className = 'photo';
      img.src = u; img.alt = 'owner portrait';
      img.loading = 'lazy'; img.style.height = '140px'; img.id = 'greetPhoto';
      photo.replaceWith(img);
    }
  }
  if (g.body) {
    const body = document.getElementById('greetBody');
    if (body) body.textContent = String(g.body).replace(/\\n/g, '\n');
  }
  if (g.sign) {
    const sign = document.getElementById('greetSign');
    if (sign) sign.textContent = g.sign;
  }
}

function renderMenu(items) {
  if (!items || !items.length) return;

  const heroRow = items.find((r) => r.heroPhoto);
  if (heroRow) {
    const hero = document.getElementById('menuHero');
    const u = imgUrl(heroRow.heroPhoto);
    if (hero && u) {
      const img = document.createElement('img');
      img.className = 'photo';
      img.src = u; img.alt = 'menu hero';
      img.loading = 'lazy'; img.style.height = '140px'; img.id = 'menuHero';
      hero.replaceWith(img);
    }
  }

  const order = [];
  const groups = new Map();
  for (const r of items) {
    if (!r.name) continue;
    const cat = (r.category || '메뉴').trim();
    if (!groups.has(cat)) { groups.set(cat, []); order.push(cat); }
    groups.get(cat).push(r);
  }
  if (!order.length) return;

  const container = document.getElementById('menuCategories');
  if (!container) return;
  container.innerHTML = order.map((cat, idx) => `
    <div class="card"${idx > 0 ? ' style="margin-top:14px"' : ''}>
      <div class="eyebrow">${esc(cat)}</div>
      ${groups.get(cat).map((m) => `
        <div class="menu-row">
          <div class="menu-row__l">
            <div class="name">${esc(m.name)}${m.tag ? ` <span class="chip chip--sm">${esc(m.tag)}</span>` : ''}</div>
            ${m.nameEn ? `<div class="name-en">${esc(m.nameEn)}</div>` : ''}
          </div>
          <div class="dots"></div>
          <div class="price">${esc(m.price || '')}</div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

// ─── DB 컬럼(snake_case) → JS(camelCase) 변환 ──
function toCamel(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return out;
}

// ─── 캐시 ─────────────────────────────────────
function readCache(key) {
  try {
    const raw = localStorage.getItem(`tuz-cache-v4:${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) { return null; }
}
function writeCache(key, data) {
  try { localStorage.setItem(`tuz-cache-v4:${key}`, JSON.stringify({ at: Date.now(), data })); }
  catch (_) { /* ignore */ }
}

// ─── Supabase 로더 ────────────────────────────
const loadingFlags = {};
async function loadTable(table, renderer, { single = false, order = 'sort_order' } = {}) {
  if (loadingFlags[table]) return;

  const cached = readCache(table);
  if (cached?.data) renderer(cached.data);
  if (cached && Date.now() - cached.at < CACHE_MS) return;

  loadingFlags[table] = true;
  try {
    let query = supabase.from(table).select('*');
    if (!single) query = query.order(order, { ascending: true });
    const { data, error } = single ? await query.maybeSingle() : await query;
    if (error) throw error;
    const rows = (single ? (data ? [data] : []) : data || []).map(toCamel);
    if (rows.length) {
      renderer(rows);
      writeCache(table, rows);
    }
  } catch (e) {
    console.warn(`[tuz] ${table} load failed:`, e.message || e);
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
};

const LOADERS = {
  news:     () => loadTable('news',     renderNews),
  pick:     () => loadTable('pick',     renderPicks),
  event:    () => loadTable('winners',  renderWinners),
  greeting: () => loadTable('greeting', renderGreeting, { single: true }),
  menu:     () => loadTable('menu',     renderMenu),
};

// 관리자가 저장한 후 현재 보이는 화면의 데이터를 강제 새로고침
export async function refreshTable(table) {
  // invalidate cache and reload
  try { localStorage.removeItem(`tuz-cache-v4:${table}`); } catch (_) { /* ignore */ }
  const viewMap = { news: 'news', pick: 'pick', winners: 'event', greeting: 'greeting', menu: 'menu' };
  const loader = LOADERS[viewMap[table]];
  if (loader) await loader();
}

// ─── 초기 라우트 ──────────────────────────────
const initial = window.location.hash.slice(1) || 'home';
showView(initial, { pushHistory: false });

// admin module boot
import('./admin.js?v=1').catch((e) => console.warn('[tuz] admin module not loaded:', e));
