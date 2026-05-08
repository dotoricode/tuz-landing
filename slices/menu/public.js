import { esc, imgUrl } from '../../shared/dom.js?v=46';
import { renderEmpty } from '../../shared/empty.js?v=46';
import { isNewSince, markTileUpdate } from '../../shared/tiles.js?v=46';
import { subscribeSettings } from '../../shared/settings.js?v=46';

export const MENU_LABEL = '메뉴';

export const MENU_LOADER_SPEC = {
  view: 'menu',
  table: 'menu',
  rendererKey: 'menu',
  options: {},
};

const EMPTY_TEXT = {
  title: '메뉴 등록 준비 중입니다',
  sub: '매장 내 메뉴판을 참고해주세요',
};

const BADGE_LABEL = { NEW: 'NEW', SEASON: 'SEASON' };
const BADGE_CLASS = { NEW: 'chip--new', SEASON: 'chip--season' };

// 뱃지 CSV → 배열 (선택 기반)
function resolveBadges(m) {
  const raw = String(m.tag || '').split(',').map((s) => s.trim()).filter(Boolean);
  return [...new Set(raw.map((s) => s.toUpperCase()))];
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

export function renderMenu(items) {
  // 대표 사진(hero)은 shared/settings.js subscribeSettings 로 별도 갱신
  // (initMenu 에서 등록). renderMenu 는 카테고리만 그림.

  // 최근 7일 이내 추가/수정된 메뉴가 있으면 타일에 점
  const recent = (items || []).some((m) => isNewSince(m.createdAt, 'menu') || isNewSince(m.updatedAt, 'menu'));
  markTileUpdate('menu', recent);

  if (!items || !items.length) { renderEmpty('menuCategories', EMPTY_TEXT); return; }

  const CATEGORY_ORDER = ['SIGNATURE · 시그니처', 'COFFEE · 커피', 'NON-COFFEE · 논커피'];
  const groups = new Map();
  for (const r of items) {
    if (!r.name) continue;
    const cat = (r.category || '메뉴').trim();
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(r);
  }
  const order = [
    ...CATEGORY_ORDER.filter((c) => groups.has(c)),
    ...[...groups.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];
  if (!order.length) { renderEmpty('menuCategories', EMPTY_TEXT); return; }

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

export function initMenu() {
  // 메뉴 hero 사진은 settings facet 으로 구독
  subscribeSettings((row) => updateMenuHero(row || {}));

  // 메뉴 사진 라이트박스 — 카테고리별 썸네일 클릭
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-menu-photo]');
    if (!btn) return;
    e.preventDefault();
    openPhotoLightbox(btn.dataset.menuPhoto, btn.dataset.menuName || '');
  });
}
