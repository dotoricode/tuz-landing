import { esc } from '../../shared/dom.js?v=53';
import { renderEmpty } from '../../shared/empty.js?v=53';

export const WINNERS_LABEL = '이달의 당첨자';

// LOADERS / RENDERERS map key — view 이름은 'event', table 은 'winners'
export const WINNERS_LOADER_SPEC = {
  view: 'event',
  table: 'winners',
  rendererKey: 'winners',
  options: {},
};

const EMPTY_TEXT = {
  title: '이번 달 이벤트 발표 전입니다',
  sub: '매달 1일 발표됩니다',
};

export function renderWinners(items) {
  const list = document.getElementById('winnerList');
  if (!list) return;
  if (!items || !items.length) { renderEmpty('winnerList', EMPTY_TEXT); return; }
  const valid = items.filter((w) => w.nick);
  if (!valid.length) { renderEmpty('winnerList', EMPTY_TEXT); return; }
  list.innerHTML = valid.map((w, i) => `
    <div class="winner"${w.id ? ` data-item-id="${esc(w.id)}"` : ''}>
      <span class="winner__num">${i + 1}</span>
      <span class="winner__nick">${esc(w.nick || '')}</span>
      <span class="chip">${esc(w.month || '무료음료')}</span>
      ${w.period ? `<span class="winner__period">${esc(w.period)}</span>` : ''}
    </div>
  `).join('');
}
