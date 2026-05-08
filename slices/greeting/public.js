import { esc, imgUrl } from '../../shared/dom.js?v=47';

export const GREETING_LABEL = '사장님 인사말';

export const GREETING_LOADER_SPEC = {
  view: 'greeting',
  table: 'greeting',
  options: { single: true },
};

export function renderGreeting(items) {
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
