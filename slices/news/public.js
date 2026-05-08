import { esc, imgUrl } from '../../shared/dom.js?v=47';
import { renderEmpty } from '../../shared/empty.js?v=47';
import { isNewSince, markTileUpdate } from '../../shared/tiles.js?v=47';

export const NEWS_LABEL = '공지 · 이벤트';

export const NEWS_LOADER_SPEC = {
  view: 'news',
  table: 'news',
  rendererKey: 'news',
  options: {},
};

const EMPTY_TEXT = {
  title: '등록된 공지사항이 없습니다',
  sub: '새 공지가 올라오면 이 자리에 표시됩니다',
};

const NEWS_TAG_META = {
  NOTICE:   { label: 'NOTICE',   cls: 'chip--notice',  icon: '📌' },
  EVENT:    { label: 'EVENT',    cls: 'chip--event',   icon: '🎁' },
  NEW:      { label: 'NEW',      cls: 'chip--new',     icon: '✨' },
  SCHEDULE: { label: 'SCHEDULE', cls: 'chip--hours',   icon: '⏰' },
  SEASON:   { label: 'SEASON',   cls: 'chip--season',  icon: '🌸' },
  SPECIAL:  { label: 'SPECIAL',  cls: 'chip--special', icon: '⭐' },
};

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

function updatePinnedNotice(items) {
  const ticker = document.getElementById('notice');
  const tickerMirror = document.getElementById('noticeMirror');
  const card = document.getElementById('todayNoticeCard');
  const pinned = (items || []).filter((n) => (n.isPinned || n.isToday) && n.title);
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

export function renderNews(items) {
  const list = document.getElementById('newsList');
  updatePinnedNotice(items); // 핀 점도 여기서 처리됨 (markTileUpdate)
  if (!list) return;
  if (!items || !items.length) {
    renderEmpty('newsList', EMPTY_TEXT);
    return;
  }
  const valid = items.filter((n) => n.title);
  if (!valid.length) {
    renderEmpty('newsList', EMPTY_TEXT);
    return;
  }
  list.innerHTML = valid.map((n) => {
    const tagKey = String(n.tag || '').toUpperCase();
    const meta = NEWS_TAG_META[tagKey];
    const chipHtml = meta
      ? `<span class="chip ${meta.cls}"><span class="chip-icon">${meta.icon}</span>${esc(meta.label)}</span>`
      : '';
    const isPinned = n.isPinned || n.isToday;
    const todayChip = isPinned
      ? `<span class="chip chip--pin" title="홈 고정 공지">📌 고정 공지</span>`
      : '';
    const photoUrl = imgUrl(n.photo);
    const photoHtml = photoUrl
      ? `<img class="notice__photo" src="${esc(photoUrl)}" alt="${esc(n.title || '')}" loading="lazy">`
      : '';
    const noticeCls = ['notice'];
    if (tagKey === 'EVENT') noticeCls.push('notice--event');
    if (isPinned) noticeCls.push('notice--pinned');
    return `
    <article class="${noticeCls.join(' ')}"${n.id ? ` data-item-id="${esc(n.id)}"` : ''} data-pinned="${isPinned ? 'true' : 'false'}">
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
