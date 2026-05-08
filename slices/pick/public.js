import { esc, imgUrl } from '../../shared/dom.js?v=54';
import { isNewSince, markTileUpdate } from '../../shared/tiles.js?v=54';

export const PICK_LABEL = '오늘의 추천';

export const PICK_LOADER_SPEC = {
  view: 'pick',
  table: 'pick',
  rendererKey: 'pick',
  options: { select: '*, menu(name, name_en, price, photo)' },
};

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}.${mm}.${dd}`;
}

function renderPickCard(p) {
  const name = p.menu?.name || p.name || '';
  const nameEn = p.menu?.nameEn || p.nameEn || '';
  const price = p.menu?.price || p.price || '';
  const photo = p.photo || p.menu?.photo;
  const photoUrl = imgUrl(photo);
  const photoHtml = photoUrl
    ? `<div class="photo-block"><img src="${esc(photoUrl)}" alt="${esc(name || 'pick')}"></div>`
    : `<div class="photo-block is-empty"></div>`;
  const priceStr = price ? '₩' + Number(String(price).replace(/[^0-9]/g, '')).toLocaleString('ko-KR') : '';
  return `
    <article class="card"${p.id ? ` data-item-id="${esc(p.id)}"` : ''}>
      <div style="margin-bottom:12px">${photoHtml}</div>
      <div class="pick__meta">
        <span class="chip">${esc(p.barista || '사장 pick')}</span>
        <time>${esc(p.date || todayStr())}</time>
      </div>
      <div class="display display--md">${esc(name)}</div>
      ${nameEn ? `<div class="pick__en">${esc(nameEn)}</div>` : ''}
      ${p.note ? `<p class="pick__note">${esc(p.note)}</p>` : ''}
      <div class="pick__price">
        <span class="eyebrow">TODAY'S PRICE</span>
        <span class="display display--sm">${esc(priceStr || price)}</span>
      </div>
    </article>
  `;
}

export function renderPicks(picks) {
  const bigEl = document.getElementById('pickBig');
  const smallEl = document.getElementById('pickSmall');
  if (!bigEl && !smallEl) return;

  const big = (picks || []).find((p) => p.barista === '큰 사장' && (p.name || p.menuId));
  const small = (picks || []).find((p) => p.barista === '작은 사장' && (p.name || p.menuId));

  if (bigEl) bigEl.innerHTML = big ? renderPickCard(big) : '';
  if (smallEl) smallEl.innerHTML = small ? renderPickCard(small) : '';

  // 최근 7일 이내 추가/수정된 pick이 있으면 타일에 점
  const recent = (picks || []).some((p) => isNewSince(p.createdAt, 'pick') || isNewSince(p.updatedAt, 'pick'));
  markTileUpdate('pick', recent);
}
