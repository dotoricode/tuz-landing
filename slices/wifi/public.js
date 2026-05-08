import { copyText } from '../../shared/dom.js?v=54';
import { subscribeSettings } from '../../shared/settings.js?v=54';

export const WIFI_LABEL = '와이파이';

let WIFI_PW = 'tuz12345'; // settings facet 구독으로 갱신

let toastTimer = null;
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

export function renderWifi(s) {
  if (!s) return;
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
}

export function initWifi() {
  subscribeSettings(renderWifi);

  const pwBtn = document.getElementById('pwBtn');
  const pwToast = document.getElementById('pwToast');
  if (!pwBtn) return;
  pwBtn.addEventListener('click', async () => {
    const ok = await copyText(WIFI_PW);
    flashToast(pwToast, ok ? '비밀번호 복사됨 ✓' : '복사 실패 · 길게 눌러 복사');
  });
}
