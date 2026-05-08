import { esc } from './dom.js?v=46';

export function renderEmpty(containerId, { title, sub }) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="card empty-state"><p class="empty-state__title">${esc(title)}</p>${sub ? `<p class="empty-state__sub">${esc(sub)}</p>` : ''}</div>`;
}
