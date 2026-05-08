import { esc } from '../../shared/dom.js?v=47';
import { subscribeSettings } from '../../shared/settings.js?v=47';

export const HOURS_LABEL = '영업시간';

function toMin(s) {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
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

export function renderHours(s) {
  if (!s) return;
  updateStatusBar(s);
  updateHoursPage(s);
}

export function initHours() {
  subscribeSettings(renderHours);
}
