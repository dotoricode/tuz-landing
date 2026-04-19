import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// ─── Supabase 연결 ───────────────────────────
export const SUPABASE_URL = 'https://lwgissxdvemamuybxmxz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3Z2lzc3hkdmVtYW11eWJ4bXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjMxNjgsImV4cCI6MjA5MjA5OTE2OH0.bslx3DGC2KPKleWo9KejERD10e92OeBEUoQHg2_jPOo';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

let WIFI_PW = 'tuz12345';  // settings 테이블에서 덮어씀
let CURRENT_SETTINGS = null; // 최신 settings 공유
const ADDRESS = '울산광역시 중구 염포로22, 2층';
const CACHE_MS = 2 * 60 * 1000;

// ─── 연결 오류 토스트 ─────────────────────────
let _connToastShown = false;
function showConnectionToast() {
  if (_connToastShown) return;
  _connToastShown = true;
  const el = document.createElement('div');
  el.className = 'tuz-conn-toast';
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'assertive');
  el.innerHTML = `<span>네트워크 연결을 확인해주세요</span><button type="button" aria-label="닫기">×</button>`;
  el.querySelector('button').addEventListener('click', () => el.remove());
  document.body.appendChild(el);
}

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
    ? 'Tuz · coffee & dessert'
    : `Tuz · ${titleOf(target)}`;

  if (['news', 'menu', 'pick', 'faq'].includes(target)) {
    localStorage.setItem(`tuz_seen_${target}`, Date.now());
  }
  const loader = LOADERS[target];
  if (loader) loader();
}

function titleOf(view) {
  return {
    wifi: '와이파이', news: '공지 · 이벤트', menu: '메뉴', hours: '영업시간',
    location: '오시는 길', event: '이달의 당첨자', pick: '오늘의 추천', greeting: '사장님 인사말',
    faq: '자주 묻는 질문',
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
    ? `<div class="photo-block"><img src="${esc(u)}" alt="${esc(placeholder)}" loading="lazy"></div>`
    : `<div class="photo-block is-empty"></div>`;
}

// ─── empty state ──────────────────────────────
const EMPTY_COPY = {
  news:    { title: '등록된 공지사항이 없습니다',         sub: '새 공지가 올라오면 이 자리에 표시됩니다' },
  menu:    { title: '메뉴 등록 준비 중입니다',           sub: '매장 내 메뉴판을 참고해주세요' },
  pick:    { title: '이번 주 추천 메뉴가 등록되지 않았습니다', sub: null },
  winners: { title: '이번 달 이벤트 발표 전입니다',       sub: '매달 1일 발표됩니다' },
};
function renderEmpty(containerId, key) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const { title, sub } = EMPTY_COPY[key] || { title: '준비 중입니다', sub: null };
  el.innerHTML = `<div class="card empty-state"><p class="empty-state__title">${esc(title)}</p>${sub ? `<p class="empty-state__sub">${esc(sub)}</p>` : ''}</div>`;
}

function renderSkeleton(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="sk-card">
      <div class="sk sk--photo"></div>
      <div class="sk sk--line"></div>
      <div class="sk sk--line is-short"></div>
    </div>
  `;
}

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}.${mm}.${dd}`;
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const m = String(dateStr).match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})/);
  if (!m) return dateStr;
  const target = new Date(+m[1], +m[2] - 1, +m[3]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - target) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  if (diff > 1 && diff <= 7) return `${diff}일 전`;
  if (diff > 7 && diff <= 14) return '지난주';
  if (diff > 14 && diff <= 30) return `${Math.floor(diff / 7)}주 전`;
  return `${m[1]}.${m[2].padStart(2, '0')}.${m[3].padStart(2, '0')}`;
}

const NEWS_TAG_META = {
  NOTICE:  { label: 'NOTICE',   cls: 'chip--notice',  icon: '📌' },
  EVENT:   { label: 'EVENT',   cls: 'chip--event',   icon: '🎁' },
  NEW:     { label: 'NEW',     cls: 'chip--new',     icon: '✨' },
  HOURS:   { label: 'HOURS',   cls: 'chip--hours',   icon: '⏰' },
  SEASON:  { label: 'SEASON',  cls: 'chip--season',  icon: '🌸' },
  SPECIAL: { label: 'SPECIAL', cls: 'chip--special', icon: '⭐' },
};

// ─── 렌더러 ──────────────────────────────────
function renderPickCard(p) {
  const photoUrl = imgUrl(p.photo);
  const photoHtml = photoUrl
    ? `<div class="photo-block"><img src="${esc(photoUrl)}" alt="${esc(p.name || 'pick')}"></div>`
    : `<div class="photo-block is-empty"></div>`;
  const priceStr = p.price ? '₩' + Number(String(p.price).replace(/[^0-9]/g, '')).toLocaleString('ko-KR') : '';
  return `
    <article class="card"${p.id ? ` data-item-id="${esc(p.id)}"` : ''}>
      <div style="margin-bottom:12px">${photoHtml}</div>
      <div class="pick__meta">
        <span class="chip">${esc(p.barista || '사장 pick')}</span>
        <time>${esc(p.date || todayStr())}</time>
      </div>
      <div class="display display--md">${esc(p.name || '')}</div>
      ${p.nameEn ? `<div class="pick__en">${esc(p.nameEn)}</div>` : ''}
      ${p.note ? `<p class="pick__note">${esc(p.note)}</p>` : ''}
      <div class="pick__price">
        <span class="eyebrow">TODAY'S PRICE</span>
        <span class="display display--sm">${esc(priceStr || p.price || '')}</span>
      </div>
    </article>
  `;
}

function renderPicks(picks) {
  LATEST_PICKS = picks || [];

  const bigEl = document.getElementById('pickBig');
  const smallEl = document.getElementById('pickSmall');

  const big = (picks || []).find((p) => p.barista === '큰 사장' && p.name);
  const small = (picks || []).find((p) => p.barista === '작은 사장' && p.name);

  if (bigEl) bigEl.innerHTML = big ? renderPickCard(big) : '';
  if (smallEl) smallEl.innerHTML = small ? renderPickCard(small) : '';

  // 최근 7일 이내 추가/수정된 pick이 있으면 타일에 점
  const recent = (picks || []).some((p) => isNewSince(p.createdAt, 'pick') || isNewSince(p.updatedAt, 'pick'));
  markTileUpdate('pick', recent);

  // 홈 spotlight도 picks 변경 시 재계산
  renderSpotlight();
}

// 타일에 "업데이트 있음" 표시 — 빨간 점 + 딥레드 테두리 (.has-update 클래스)
// .tile[data-go=...] 로 한정해 마퀴/카드 버튼 같은 다른 [data-go] 요소를 제외
function markTileUpdate(viewName, hasUpdate) {
  const tile = document.querySelector(`.tile[data-go="${viewName}"]`);
  if (!tile) return;
  tile.classList.toggle('has-update', !!hasUpdate);
  const existing = tile.querySelector('.tile__dot');
  if (hasUpdate && !existing) {
    const dot = document.createElement('span');
    dot.className = 'tile__dot';
    dot.setAttribute('aria-label', '새 업데이트');
    tile.appendChild(dot);
  } else if (!hasUpdate && existing) {
    existing.remove();
  }
}

// "최근 N일 이내" 판정 — createdAt 기준
function isRecent(isoTs, days = 7) {
  if (!isoTs) return false;
  const t = new Date(isoTs);
  if (isNaN(t.getTime())) return false;
  return (Date.now() - t.getTime()) <= days * 86400000;
}

function isNewSince(isoTs, viewName) {
  if (!isoTs) return false;
  const t = new Date(isoTs);
  if (isNaN(t.getTime())) return false;
  const seen = parseInt(localStorage.getItem(`tuz_seen_${viewName}`) || '0', 10);
  return seen ? t.getTime() > seen : isRecent(isoTs);
}

function updateTodayNotice(items) {
  const ticker = document.getElementById('notice');
  const tickerMirror = document.getElementById('noticeMirror');
  const card = document.getElementById('todayNoticeCard');
  const pinned = (items || []).filter((n) => n.isToday && n.title);
  // 공지 타일 업데이트 표시 — 핀된 공지가 있거나 7일 이내 새 공지가 있으면
  const hasRecent = (items || []).some((n) => isNewSince(n.createdAt, 'news') || isNewSince(n.updatedAt, 'news'));
  const hasPinnedNew = pinned.some((n) => isNewSince(n.createdAt, 'news') || isNewSince(n.updatedAt, 'news'));
  markTileUpdate('news', hasPinnedNew || hasRecent);
  if (!card) return;
  if (!pinned.length) {
    card.hidden = true;
    return;
  }
  // 가장 최근 항목 (date desc, 동일 날짜면 created_at desc)
  pinned.sort((a, b) => {
    const da = String(a.date || ''); const db = String(b.date || '');
    if (da !== db) return db.localeCompare(da);
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
  const top = pinned[0];
  if (ticker) ticker.textContent = top.title;
  if (tickerMirror) tickerMirror.textContent = top.title;
  card.hidden = false;
}

function renderNews(items) {
  const list = document.getElementById('newsList');
  updateTodayNotice(items); // 핀 점도 여기서 처리됨 (markTileUpdate)
  if (!list) return;
  if (!items || !items.length) {
    renderEmpty('newsList', 'news');
    return;
  }
  const valid = items.filter((n) => n.title);
  if (!valid.length) {
    renderEmpty('newsList', 'news');
    return;
  }
  list.innerHTML = valid.map((n) => {
    const tagKey = String(n.tag || '').toUpperCase();
    const meta = NEWS_TAG_META[tagKey];
    const chipHtml = meta
      ? `<span class="chip ${meta.cls}"><span class="chip-icon">${meta.icon}</span>${esc(meta.label)}</span>`
      : '';
    const todayChip = n.isToday
      ? `<span class="chip chip--pin" title="홈 오늘의 공지">📌 오늘의 공지</span>`
      : '';
    const photoUrl = imgUrl(n.photo);
    const photoHtml = photoUrl
      ? `<img class="notice__photo" src="${esc(photoUrl)}" alt="${esc(n.title || '')}" loading="lazy">`
      : '';
    const noticeCls = ['notice'];
    if (tagKey === 'EVENT') noticeCls.push('notice--event');
    if (n.isToday) noticeCls.push('notice--pinned');
    return `
    <article class="${noticeCls.join(' ')}"${n.id ? ` data-item-id="${esc(n.id)}"` : ''}>
      ${photoHtml}
      <div class="notice__body">
        <header class="notice__head">
          ${chipHtml}${todayChip}
          <time>${esc(relativeTime(n.date))}</time>
        </header>
        <div class="notice__title">${esc(n.title || '')}</div>
        ${n.titleEn ? `<div class="notice__title-en">${esc(n.titleEn)}</div>` : ''}
        ${n.body ? `<p>${esc(n.body)}</p>` : ''}
      </div>
    </article>
    `;
  }).join('');
}

function renderWinners(items) {
  const list = document.getElementById('winnerList');
  if (!list) return;
  if (!items || !items.length) { renderEmpty('winnerList', 'winners'); return; }
  const valid = items.filter((w) => w.nick);
  if (!valid.length) { renderEmpty('winnerList', 'winners'); return; }
  list.innerHTML = valid.map((w, i) => `
    <div class="winner"${w.id ? ` data-item-id="${esc(w.id)}"` : ''}>
      <span class="winner__num">${i + 1}</span>
      <span class="winner__nick">${esc(w.nick || '')}</span>
      <span class="chip">${esc(w.month || '무료음료')}</span>
      ${w.period ? `<span class="winner__period">${esc(w.period)}</span>` : ''}
    </div>
  `).join('');
}

function updateStatusBar(settings) {
  const bar = document.querySelector('.status-bar');
  const textEl = bar && bar.querySelector('.status-text');
  if (!bar || !textEl) return;

  const now = new Date();
  const day = now.getDay(); // 0=일, 6=토
  const hhmm = now.getHours() * 60 + now.getMinutes();

  if (settings.holidayNotice) {
    bar.className = 'status-bar is-closed';
    textEl.textContent = settings.holidayNotice;
    return;
  }

  const hoursStr = (day === 0 || day === 6)
    ? (settings.hoursWeekend || '10:00-23:00')
    : (settings.hoursWeekday || '08:00-22:00');

  const [openStr, closeStr] = hoursStr.split('-');
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0); };
  const open = toMin(openStr);
  const close = toMin(closeStr);

  if (hhmm >= open && hhmm < close) {
    bar.className = 'status-bar';
    textEl.textContent = `지금 영업 중 · ${hoursStr.replace('-', ' – ')}`;
  } else if (hhmm < open) {
    bar.className = 'status-bar is-soon';
    textEl.textContent = `곧 오픈 · ${openStr}부터`;
  } else {
    bar.className = 'status-bar is-closed';
    textEl.textContent = `오늘 영업 종료 · 내일 다시 오세요`;
  }
}

function updateHoursPage(settings) {
  const weekdayEl = document.getElementById('hoursWeekdayTime');
  const weekendEl = document.getElementById('hoursWeekendTime');
  if (weekdayEl && settings.hoursWeekday) weekdayEl.textContent = settings.hoursWeekday.replace('-', ' – ');
  if (weekendEl && settings.hoursWeekend) weekendEl.textContent = settings.hoursWeekend.replace('-', ' – ');

  // 정기휴무 행 — 비어있으면 숨김, 값 있으면 표시 + 텍스트 교체
  const closureRow = document.getElementById('hoursRegularClosureRow');
  const closureKrEl = document.getElementById('hoursRegularClosureKr');
  const closureEnEl = document.getElementById('hoursRegularClosureEn');
  if (closureRow) {
    const kr = settings.regularClosureKr;
    const en = settings.regularClosureEn;
    // column이 없던(null) 경우엔 하드코딩 기본값 유지, 명시적 빈 문자열은 숨김
    const hasKr = typeof kr === 'string';
    const hasEn = typeof en === 'string';
    if (hasKr && kr === '' && (!hasEn || en === '')) {
      closureRow.hidden = true;
    } else {
      closureRow.hidden = false;
      if (hasKr && closureKrEl) closureKrEl.textContent = kr || '';
      if (hasEn && closureEnEl) closureEnEl.textContent = en || '';
    }
  }

  const card = document.getElementById('hoursOpenNow');
  if (!card) return;

  const now = new Date();
  const day = now.getDay();
  const hhmm = now.getHours() * 60 + now.getMinutes();

  if (settings.holidayNotice) {
    card.innerHTML = `<span class="dot-red"></span><div><b>임시휴무</b> · ${esc(settings.holidayNotice)}</div>`;
    return;
  }

  const hoursStr = (day === 0 || day === 6)
    ? (settings.hoursWeekend || '10:00-23:00')
    : (settings.hoursWeekday || '08:00-22:00');
  const [openStr, closeStr] = hoursStr.split('-');
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0); };
  const openMin = toMin(openStr);
  const closeMin = toMin(closeStr);

  if (hhmm >= openMin && hhmm < closeMin) {
    card.innerHTML = `<span class="dot-green"></span><div><b>지금 영업 중</b> · ${esc(closeStr)}에 마감합니다</div>`;
  } else if (hhmm < openMin) {
    card.innerHTML = `<span class="dot-yellow"></span><div><b>영업 준비 중</b> · ${esc(openStr)}에 오픈합니다</div>`;
  } else {
    card.innerHTML = `<span class="dot-red"></span><div><b>오늘 영업 종료</b> · 내일 다시 오세요</div>`;
  }
}

// 최신 picks 캐시 — settings(spotlight_pick_id) 또는 picks가 갱신되면 spotlight 재계산
let LATEST_PICKS = null;

function renderSettings(items) {
  const s = items && items[0];
  if (!s) return;
  CURRENT_SETTINGS = s;
  if (s.wifiSsid) {
    const el = document.getElementById('wifiSsid');
    if (el) el.textContent = s.wifiSsid;
    const tile = document.querySelector('[data-wifi-ssid-tile]');
    if (tile) tile.textContent = s.wifiSsid;
  }
  if (s.wifiPassword) {
    WIFI_PW = s.wifiPassword;
    const el = document.getElementById('pwText');
    if (el) el.textContent = s.wifiPassword;
  }
  updateStatusBar(s);
  updateHoursPage(s);
  updateMenuHero(s);
  renderStampCard(s);
  renderSpotlight();
}

function renderStampCard(s) {
  const card = document.getElementById('stampCard');
  if (!card) return;
  const rawMax = parseInt(s?.stampMax, 10);
  // 컬럼 자체가 없는 환경(마이그레이션 미실행) → 숨김. 0 으로 명시 설정해도 숨김.
  if (!Number.isFinite(rawMax) || rawMax <= 0) {
    card.hidden = true;
    return;
  }
  const max = Math.min(20, rawMax);
  const fill = Math.max(0, Math.min(max, parseInt(s?.stampFill, 10) || 0));
  card.hidden = false;

  const fillEl = document.getElementById('stampFill');
  const maxEl = document.getElementById('stampMax');
  if (fillEl) fillEl.textContent = String(fill);
  if (maxEl) maxEl.textContent = String(max);

  const dotsEl = document.getElementById('stampDots');
  if (dotsEl) {
    dotsEl.style.gridTemplateColumns = `repeat(${max}, 1fr)`;
    const dots = [];
    for (let i = 0; i < max; i++) {
      dots.push(`<span class="stamp-card__dot${i < fill ? ' is-filled' : ''}"></span>`);
    }
    dotsEl.innerHTML = dots.join('');
  }

  const noteEl = document.getElementById('stampNote');
  if (noteEl) {
    const remaining = max - fill;
    const defaultNote = remaining > 0
      ? `${remaining}잔 더 모으면 음료 한 잔`
      : '교환 가능 · 카운터로 와주세요';
    noteEl.textContent = s?.stampNote || defaultNote;
  }
}

function renderSpotlight() {
  const card = document.getElementById('spotlightCard');
  if (!card) return;
  const picks = LATEST_PICKS || [];
  const settings = CURRENT_SETTINGS || {};

  // 1) settings.spotlightPickId 우선
  let target = null;
  if (settings.spotlightPickId) {
    target = picks.find((p) => p.id === settings.spotlightPickId);
  }
  // 2) 비어있으면 큰 사장 최신 행 (barista 값이 '큰 사장' 또는 '큰 사장 pick' 모두 매칭)
  if (!target) {
    target = picks
      .filter((p) => p.name && /큰\s*사장/.test(String(p.barista || '')))
      .sort((a, b) => {
        const da = String(a.date || a.createdAt || '');
        const db = String(b.date || b.createdAt || '');
        return db.localeCompare(da);
      })[0];
  }
  if (!target) {
    card.hidden = true;
    return;
  }

  card.hidden = false;
  const labelEl = document.getElementById('spotlightLabel');
  if (labelEl) labelEl.textContent = settings.spotlightLabel || '이번 주의 한 잔';

  const titleEl = document.getElementById('spotlightTitle');
  if (titleEl) titleEl.textContent = target.name || '';

  const enEl = document.getElementById('spotlightEn');
  if (enEl) {
    enEl.textContent = target.nameEn || '';
    enEl.style.display = target.nameEn ? '' : 'none';
  }

  const noteEl = document.getElementById('spotlightNote');
  if (noteEl) {
    noteEl.textContent = target.note || '';
    noteEl.style.display = target.note ? '' : 'none';
  }

  const photoEl = document.getElementById('spotlightPhoto');
  if (photoEl) {
    const u = imgUrl(target.photo);
    photoEl.innerHTML = u
      ? `<img src="${esc(u)}" alt="${esc(target.name || '')}" loading="lazy">`
      : '';
    photoEl.style.display = u ? '' : 'none';
  }
}

function renderMenuPreview(items) {
  const sec = document.getElementById('menuPreviewSection');
  const list = document.getElementById('menuPreview');
  if (!sec || !list) return;

  const sigs = (items || [])
    .filter((m) => m.name && (m.isSignature === true || /SIGNATURE/i.test(String(m.tag || ''))))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .slice(0, 8);

  if (!sigs.length) {
    sec.hidden = true;
    list.innerHTML = '';
    return;
  }
  sec.hidden = false;
  list.innerHTML = sigs.map((m) => {
    const u = imgUrl(m.photo);
    const priceStr = m.price ? '₩' + Number(String(m.price).replace(/[^0-9]/g, '')).toLocaleString('ko-KR') : '';
    const art = u
      ? `<img src="${esc(u)}" alt="${esc(m.name)}" loading="lazy">`
      : `<span class="menu-preview__art-mono" aria-hidden="true">T</span>`;
    return `
      <article class="menu-preview__card" data-go="menu">
        <div class="menu-preview__art">${art}</div>
        <div class="menu-preview__name">${esc(m.name)}</div>
        ${m.nameEn ? `<div class="menu-preview__name-en">${esc(m.nameEn)}</div>` : ''}
        ${priceStr ? `<div class="menu-preview__price">${esc(priceStr)}</div>` : ''}
      </article>
    `;
  }).join('');
}

function renderFaq(items) {
  const list = document.getElementById('faqList');
  if (!list) return;
  const valid = (items || []).filter((f) => f.questionKr && f.answerKr);

  // FAQ 타일 업데이트 표시 — 7일 이내 추가/수정 항목 있을 때만
  const recent = (items || []).some((f) => isNewSince(f.createdAt, 'faq') || isNewSince(f.updatedAt, 'faq'));
  markTileUpdate('faq', recent);

  if (!valid.length) {
    list.innerHTML = `<div class="card empty-state"><p class="empty-state__title">등록된 질문이 없습니다</p></div>`;
    return;
  }
  list.innerHTML = valid.map((f) => `
    <details class="faq-item"${f.id ? ` data-item-id="${esc(f.id)}"` : ''}>
      <summary>
        <span class="faq-item__q">${esc(f.questionKr)}</span>
        <svg class="faq-item__chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
      </summary>
      <div class="faq-item__a">
        <p>${esc(f.answerKr)}</p>
        ${f.answerEn ? `<p class="faq-item__a-en">${esc(f.answerEn)}</p>` : ''}
      </div>
    </details>
  `).join('');
}

function updateMenuHero(settings) {
  const heroEl = document.getElementById('menuHero');
  if (!heroEl) return;
  const heroUrl = imgUrl(settings?.menuHeroPhoto);
  if (heroUrl) {
    const block = document.createElement('div');
    block.className = 'photo-block';
    block.id = 'menuHero';
    block.innerHTML = `<img src="${esc(heroUrl)}" alt="menu hero">`;
    heroEl.replaceWith(block);
  } else {
    // 빈 상태 복원
    if (!heroEl.classList.contains('is-empty')) {
      const block = document.createElement('div');
      block.className = 'photo-block is-empty';
      block.id = 'menuHero';
      heroEl.replaceWith(block);
    }
  }
}

function renderGreeting(items) {
  const g = items && items[0];
  if (!g) return;
  if (!g.body && !g.photo && !g.sign) return;
  const photoEl = document.getElementById('greetPhoto');
  if (photoEl) {
    const photoUrl = imgUrl(g.photo);
    if (photoUrl) {
      const block = document.createElement('div');
      block.className = 'photo-block';
      block.id = 'greetPhoto';
      block.innerHTML = `<img src="${esc(photoUrl)}" alt="owner portrait">`;
      photoEl.replaceWith(block);
    }
    // if no photo, leave existing .photo-block.is-empty
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

function isToday(isoTs) {
  if (!isoTs) return false;
  const d = new Date(isoTs);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

// 뱃지 CSV → 배열 (선택 기반)
function resolveBadges(m) {
  const raw = String(m.tag || '').split(',').map((s) => s.trim()).filter(Boolean);
  const set = new Set(raw.map((s) => s.toUpperCase()));
  if (m.isSignature) set.add('SIGNATURE'); // 구 데이터 호환
  return [...set];
}

const BADGE_LABEL = {
  NEW: 'NEW',
  SEASON: 'SEASON',
  SIGNATURE: 'SIGNATURE',
};
const BADGE_CLASS = {
  NEW: 'chip--new',
  SEASON: 'chip--season',
  SIGNATURE: '',
};

function renderMenu(items) {
  // 대표 사진은 settings에서 가져옴 (setting이 이미 로드되어 있으면 적용)
  if (CURRENT_SETTINGS) updateMenuHero(CURRENT_SETTINGS);

  // 최근 7일 이내 추가/수정된 메뉴가 있으면 타일에 점
  const recent = (items || []).some((m) => isNewSince(m.createdAt, 'menu') || isNewSince(m.updatedAt, 'menu'));
  markTileUpdate('menu', recent);

  // 홈 시그니처 미리보기 — 메뉴 데이터 동시 사용
  renderMenuPreview(items);

  if (!items || !items.length) { renderEmpty('menuCategories', 'menu'); return; }

  const order = [];
  const groups = new Map();
  for (const r of items) {
    if (!r.name) continue;
    const cat = (r.category || '메뉴').trim();
    if (!groups.has(cat)) { groups.set(cat, []); order.push(cat); }
    groups.get(cat).push(r);
  }
  if (!order.length) { renderEmpty('menuCategories', 'menu'); return; }

  const container = document.getElementById('menuCategories');
  if (!container) return;
  container.innerHTML = order.map((cat, idx) => {
    const rows = groups.get(cat);
    // 카테고리 내에 사진 있는 항목이 하나라도 있으면 모든 행에 썸네일 슬롯 예약
    const categoryHasThumb = rows.some((m) => imgUrl(m.photo));
    return `
    <div class="card"${idx > 0 ? ' style="margin-top:14px"' : ''}>
      <div class="eyebrow">${esc(cat)}</div>
      ${rows.map((m) => {
        const priceStr = m.price ? '₩' + Number(String(m.price).replace(/[^0-9]/g, '')).toLocaleString('ko-KR') : '';
        const photoUrl = imgUrl(m.photo);
        const badges = resolveBadges(m);
        const badgesHtml = badges.map((b) => {
          const label = BADGE_LABEL[b] || b;
          const cls = BADGE_CLASS[b] || '';
          return ` <span class="chip chip--sm ${cls}">${esc(label)}</span>`;
        }).join('');
        const thumbHtml = photoUrl
          ? `<button type="button" class="menu-thumb" data-menu-photo="${esc(photoUrl)}" data-menu-name="${esc(m.name)}" aria-label="${esc(m.name)} 사진 보기"><img src="${esc(photoUrl)}" alt="${esc(m.name)}" loading="lazy"/></button>`
          : (categoryHasThumb ? `<span class="menu-thumb menu-thumb--empty" aria-hidden="true"></span>` : '');
        return `
        <div class="menu-row${categoryHasThumb ? ' has-thumb' : ''}"${m.id ? ` data-item-id="${esc(m.id)}"` : ''}>
          ${thumbHtml}
          <div class="menu-row__l">
            <div class="name">${esc(m.name)}${badgesHtml}</div>
            ${m.nameEn ? `<div class="name-en">${esc(m.nameEn)}</div>` : ''}
          </div>
          <div class="dots"></div>
          <div class="price">${esc(priceStr || m.price || '')}</div>
        </div>
        `;
      }).join('')}
    </div>
    `;
  }).join('');
}

// ─── 메뉴 사진 라이트박스 ──────────────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-menu-photo]');
  if (!btn) return;
  e.preventDefault();
  openPhotoLightbox(btn.dataset.menuPhoto, btn.dataset.menuName || '');
});

function openPhotoLightbox(url, caption) {
  const existing = document.getElementById('tuz-lightbox');
  if (existing) existing.remove();
  const box = document.createElement('div');
  box.id = 'tuz-lightbox';
  box.className = 'tuz-lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `
    <button type="button" class="tuz-lightbox__close" aria-label="닫기">×</button>
    <figure class="tuz-lightbox__fig">
      <img src="${esc(url)}" alt="${esc(caption)}"/>
      ${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}
    </figure>
  `;
  const close = () => box.remove();
  box.querySelector('.tuz-lightbox__close').addEventListener('click', close);
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  });
  document.body.appendChild(box);
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

// ─── 지도 초기화 (Kakao → Leaflet → 링크 카드 3단 폴백) ─
// 울산광역시 중구 염포로 22 — Nominatim 지오코딩 기준 반구1동 염포로 시작점
const TUZ_LAT = 35.5596;
const TUZ_LNG = 129.3443;

function clearMapEl(mapEl) {
  mapEl.innerHTML = '';
  mapEl.classList.remove('is-empty');
  mapEl.removeAttribute('title');
}

function renderLinkCardFallback(mapEl, reason) {
  clearMapEl(mapEl);
  mapEl.classList.add('is-empty');
  const q = encodeURIComponent(ADDRESS);
  mapEl.innerHTML = `
    <a class="map-fallback" href="https://map.kakao.com/?q=${q}" target="_blank" rel="noopener">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-7.5 7-12a7 7 0 10-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>
      <span class="map-fallback__title">카카오맵에서 보기</span>
      <span class="map-fallback__sub">${esc(ADDRESS)}</span>
    </a>
  `;
  if (reason) mapEl.title = reason;
}

// Leaflet + OpenStreetMap 폴백 — 어떤 도메인에서도 동작
function renderLeafletMap(mapEl) {
  if (mapEl.dataset.mapDrawn === 'leaflet') return;

  const loadCss = () => new Promise((resolve) => {
    if (document.querySelector('link[data-tuz-leaflet]')) return resolve();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    link.dataset.tuzLeaflet = '1';
    link.onload = resolve;
    link.onerror = resolve;
    document.head.appendChild(link);
  });

  const loadJs = () => new Promise((resolve, reject) => {
    if (window.L) return resolve();
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    s.crossOrigin = '';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('leaflet js load failed'));
    document.head.appendChild(s);
  });

  Promise.all([loadCss(), loadJs()]).then(() => {
    clearMapEl(mapEl);
    mapEl.dataset.mapDrawn = 'leaflet';
    const map = window.L.map(mapEl, { zoomControl: true, attributionControl: true })
      .setView([TUZ_LAT, TUZ_LNG], 16);
    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    window.L.marker([TUZ_LAT, TUZ_LNG])
      .addTo(map)
      .bindPopup(`<b>Tuz</b><br>${esc(ADDRESS)}`)
      .openPopup();
  }).catch((e) => {
    console.warn('[tuz] leaflet fallback failed:', e);
    renderLinkCardFallback(mapEl, 'Leaflet 로드 실패 — 네트워크 확인');
  });
}

function initKakaoMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;
  // 중복 실행 방지 (dual-module 방어)
  if (mapEl.dataset.mapInit === '1') return;
  mapEl.dataset.mapInit = '1';

  // 키가 없으면 바로 Leaflet로
  if (!window.KAKAO_APP_KEY) {
    renderLeafletMap(mapEl);
    return;
  }

  let kakaoSucceeded = false;
  const drawKakao = () => {
    try {
      clearMapEl(mapEl);
      const map = new window.kakao.maps.Map(mapEl, {
        center: new window.kakao.maps.LatLng(TUZ_LAT, TUZ_LNG),
        level: 3,
      });
      new window.kakao.maps.Marker({
        map,
        position: new window.kakao.maps.LatLng(TUZ_LAT, TUZ_LNG),
        title: 'Tuz',
      });
      kakaoSucceeded = true;
      mapEl.dataset.mapDrawn = 'kakao';
    } catch (e) {
      console.warn('[tuz] kakao map init failed, using leaflet:', e);
      renderLeafletMap(mapEl);
    }
  };

  const tryLoad = () => {
    if (window.kakao && window.kakao.maps && typeof window.kakao.maps.load === 'function') {
      window.kakao.maps.load(drawKakao);
      return true;
    }
    return false;
  };

  if (tryLoad()) return;

  const existing = document.querySelector('script[data-tuz-kakao]');
  if (existing) {
    existing.addEventListener('load', tryLoad);
    existing.addEventListener('error', () => renderLeafletMap(mapEl));
  } else {
    const script = document.createElement('script');
    script.dataset.tuzKakao = '1';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${window.KAKAO_APP_KEY}&autoload=false`;
    script.onload = tryLoad;
    script.onerror = () => renderLeafletMap(mapEl);
    document.head.appendChild(script);
  }

  // 안전망: 3.5초 안에 Kakao가 window.kakao를 정의하지 않으면 Leaflet로 전환
  // (도메인 whitelist 미등록 시 Kakao는 빈 응답을 보내 SDK가 초기화되지 않음)
  setTimeout(() => {
    if (!kakaoSucceeded && !(window.kakao && window.kakao.maps)) {
      renderLeafletMap(mapEl);
    }
  }, 3500);
}

export const RENDERERS = {
  news: renderNews,
  pick: renderPicks,
  winners: renderWinners,
  greeting: renderGreeting,
  menu: renderMenu,
  settings: renderSettings,
  faq: renderFaq,
};

const LOADERS = {
  news:     () => loadTable('news',     renderNews),
  pick:     () => loadTable('pick',     renderPicks),
  event:    () => loadTable('winners',  renderWinners),
  greeting: () => loadTable('greeting', renderGreeting, { single: true }),
  menu:     () => loadTable('menu',     renderMenu),
  wifi:     () => loadTable('settings', renderSettings, { single: true }),
  hours:    () => loadTable('settings', renderSettings, { single: true }),
  location: () => initKakaoMap(),
  faq:      () => loadTable('faq',      renderFaq),
};

// settings는 항상 먼저 로드 — 모든 페이지에서 WiFi 정보가 필요할 수 있음
LOADERS.wifi();
// news도 먼저 로드 — 홈의 "오늘의 공지"가 필요
LOADERS.news();
// 홈에서 spotlight + 시그니처 메뉴 미리보기를 보여주기 위해 picks/menu도 부팅 시 로드
LOADERS.pick();
LOADERS.menu();
// FAQ는 뷰 진입 시 로드 (boot 시 로드하면 마이그레이션 전 환경에서 토스트가 뜸)

// 관리자가 저장한 후 현재 보이는 화면의 데이터를 강제 새로고침
export async function refreshTable(table) {
  // invalidate cache and reload
  try { localStorage.removeItem(`tuz-cache-v5:${table}`); } catch (_) { /* ignore */ }
  const loaderKeys = {
    news: ['news'],
    pick: ['pick'],
    winners: ['event'],
    greeting: ['greeting'],
    menu: ['menu'],
    settings: ['wifi'], // settings 재로드 → wifi/hours/menuHero/stamp/spotlight 모두 갱신됨
    faq: ['faq'],
  };
  const keys = loaderKeys[table] || [];
  for (const k of keys) {
    const loader = LOADERS[k];
    if (loader) await loader();
  }
}

// ─── 초기 라우트 ──────────────────────────────
const initial = window.location.hash.slice(1) || 'home';
showView(initial, { pushHistory: false });

// admin module boot
import('./admin.js?v=31').catch((e) => console.warn('[tuz] admin module not loaded:', e));
