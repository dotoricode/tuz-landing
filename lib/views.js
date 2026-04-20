// Tuz · 카카오 로그인 기반 뷰 렌더 (#stamp, #staff, 홈 stamp card, 동의 모달, 룰렛)
import { showView } from '../app.js?v=32';
import {
  onAuthChange, getUser, getProfile, isLoggedIn, isStaff,
  signInKakao, signInEmail, signInPassword, signOut, hasConsent, acceptConsent,
} from './auth.js';
import {
  getMyActiveCount, getMyHistory, claimWithCode, redeemReward, issueStaffCode,
  listArts, createArt, toggleArt, deleteArt,
} from './stamps.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function loginButtonHtml({ style = '' } = {}) {
  return `
    <button class="btn btn--primary" type="button" data-tuz-action="kakao-login"${style ? ` style="${style}"` : ''}>카카오로 로그인</button>
    <div class="email-login-wrap" style="margin-top:10px">
      <form data-tuz-form="email-login" style="display:flex;gap:6px">
        <input type="text" name="email" placeholder="이메일로 로그인 (테스트용)"
          style="flex:1;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink);font-size:13px">
        <button class="btn btn--ghost" type="submit" style="white-space:nowrap;font-size:13px">OTP 전송</button>
      </form>
      <form data-tuz-form="password-login" style="display:flex;gap:6px;margin-top:6px">
        <input type="text" name="email" placeholder="이메일"
          style="flex:1;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink);font-size:13px">
        <input type="password" name="password" placeholder="비밀번호"
          style="flex:1;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink);font-size:13px">
        <button class="btn btn--ghost" type="submit" style="white-space:nowrap;font-size:13px">로그인</button>
      </form>
      <p class="email-login-sent" style="display:none;font-size:12px;color:var(--ink-3);margin:6px 0 0">메일함을 확인해주세요 ✓</p>
    </div>
  `;
}

// 사용자별 활성 카운트 캐시
let _activeCount = 0;
async function refreshActiveCount() {
  _activeCount = isLoggedIn() ? await getMyActiveCount() : 0;
  return _activeCount;
}

// ─── 룰렛 ──────────────────────────────────────
// conic-gradient 섹터 정의 (pointer = top, 시계방향)
// 각 tier의 섹터 중앙 각도 → 포인터에 맞추려면 wheel을 (360 - center)도 회전
const TIER_INFO = {
  normal:     { label: '도장 +1',       sub: '잘 오셨어요 :)', color: '#d4a574', start: 0,     end: 288,   center: 144   },
  double:     { label: '더블 도장!',    sub: '오늘 운 좋은 날이에요', color: '#a52a1a', start: 288,  end: 324,   center: 306   },
  half_off:   { label: '반값 쿠폰',     sub: '다음 음료 50% 할인', color: '#5c7a4e', start: 324,  end: 349.2, center: 336.6 },
  free_drink: { label: '무료 음료권!',  sub: '카운터에 알려주세요', color: '#2d5016', start: 349.2, end: 360, center: 354.6 },
};

export function showRoulette({ bonus_type = 'normal', art = null, new_count = null } = {}) {
  const modal   = document.getElementById('rouletteModal');
  const wheel   = document.getElementById('rouletteWheel');
  const result  = document.getElementById('rouletteResult');
  const artEl   = document.getElementById('rouletteArt');
  const tierEl  = document.getElementById('rouletteTier');
  const subEl   = document.getElementById('rouletteSub');
  if (!modal || !wheel) return;

  result.hidden = true;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  const tier = TIER_INFO[bonus_type] || TIER_INFO.normal;
  const targetAngle = (360 - tier.center + 360) % 360;
  const totalRotation = (3 + Math.floor(Math.random() * 3)) * 360 + targetAngle;

  // reset without transition
  wheel.style.transition = 'none';
  wheel.style.transform = 'rotate(0deg)';
  void wheel.offsetWidth;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onDone() {
    // snap to exact angle to avoid floating point drift
    wheel.style.transition = 'none';
    wheel.style.transform = `rotate(${targetAngle}deg)`;
    if (artEl) {
      artEl.innerHTML = art?.image_url
        ? `<img src="${esc(art.image_url)}" alt="${esc(art.label || '도장')}" class="roulette-art-img">`
        : `<div class="roulette-art-placeholder"></div>`;
    }
    if (tierEl) tierEl.textContent = tier.label;
    if (subEl)  subEl.textContent  = tier.sub;
    result.hidden = false;
  }

  if (prefersReduced) {
    wheel.style.transform = `rotate(${targetAngle}deg)`;
    onDone();
  } else {
    wheel.style.transition = 'transform 3s cubic-bezier(0.15, 0.85, 0.25, 1)';
    wheel.style.transform = `rotate(${totalRotation}deg)`;
    wheel.addEventListener('transitionend', onDone, { once: true });
  }
}

function closeRoulette() {
  const modal = document.getElementById('rouletteModal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
}

document.getElementById('rouletteConfirm')?.addEventListener('click', () => {
  closeRoulette();
  const visible = document.querySelector('[data-view]:not([hidden])')?.dataset.view;
  if (visible === 'stamp') {
    renderStampView();
  } else {
    refreshHomeStampCard();
    showView('stamp');
  }
});

document.getElementById('rouletteBackdrop')?.addEventListener('click', closeRoulette);

// ─── pending QR claim 처리 ─────────────────────
async function processPendingClaim() {
  let code;
  try { code = sessionStorage.getItem('pendingClaim'); } catch (_) {}
  if (!code) return;
  if (!isLoggedIn() || !hasConsent()) return;
  try { sessionStorage.removeItem('pendingClaim'); } catch (_) {}
  try {
    const result = await claimWithCode(code);
    await refreshActiveCount();
    refreshHomeStampCard();
    showRoulette(result || { bonus_type: 'normal', art: null });
  } catch (e) {
    const m = e?.message || '';
    if (m === 'already_claimed') {
      // user scanned same QR twice — silently ignore
    } else {
      console.warn('[pendingClaim] failed:', m);
    }
  }
}

// ─── 홈 stamp card ─────────────────────────────
async function refreshHomeStampCard() {
  const card = document.getElementById('stampCard');
  const cta = document.getElementById('stampCardCta');
  if (!card || !cta) return;

  const maxEl = document.getElementById('stampMax');
  const max = parseInt(maxEl?.textContent, 10) || 10;
  if (card.hidden && max <= 0) return;

  if (isLoggedIn()) {
    const count = await refreshActiveCount();
    card.hidden = false;
    document.getElementById('stampFill').textContent = String(count);
    document.getElementById('stampMax').textContent = String(max);
    const dotsEl = document.getElementById('stampDots');
    if (dotsEl) {
      dotsEl.style.gridTemplateColumns = `repeat(${max}, 1fr)`;
      dotsEl.innerHTML = Array.from({ length: max }, (_, i) =>
        `<span class="stamp-card__dot${i < count ? ' is-filled' : ''}"></span>`
      ).join('');
    }
    const noteEl = document.getElementById('stampNote');
    if (noteEl) {
      const remaining = max - count;
      noteEl.textContent = remaining > 0
        ? `${remaining}잔 더 모으면 음료 한 잔`
        : '교환 가능 · 카운터로 와주세요';
    }
    const staffBtn = isStaff()
      ? `<button class="btn btn--ghost" data-go="staff" type="button" style="margin-top:6px;width:100%">코드 발급 (스태프)</button>`
      : '';
    cta.innerHTML = (count >= max
      ? `<button class="btn btn--primary" data-go="stamp" type="button">교환하러 가기</button>`
      : `<button class="btn btn--ghost" data-go="stamp" type="button">스탬프 적립하기 →</button>`) + staffBtn;
  } else {
    cta.innerHTML = loginButtonHtml();
  }
}

// ─── 동의 모달 ─────────────────────────────────
function openConsentModal() {
  if (document.getElementById('tuz-consent')) return;
  const ovl = document.createElement('div');
  ovl.id = 'tuz-consent';
  ovl.className = 'consent-ovl';
  ovl.innerHTML = `
    <div class="consent-sheet" role="dialog" aria-modal="true" aria-labelledby="consentTitle">
      <h2 id="consentTitle">스탬프를 시작하기 전에</h2>
      <p class="consent-sheet__lead">카카오 로그인 정보를 안전하게 사용하기 위해 두 가지 동의가 필요해요.</p>
      <label class="consent-check">
        <input type="checkbox" id="consent1">
        <div>
          <div class="consent-check__title">개인정보 수집·이용 동의 (필수)</div>
          <div class="consent-check__sub">닉네임·프로필 사진을 스탬프 카드 식별에 사용합니다.
            자세한 내용은 <a href="#privacy" data-go="privacy">처리방침</a>에서 확인.</div>
        </div>
      </label>
      <label class="consent-check">
        <input type="checkbox" id="consent2">
        <div>
          <div class="consent-check__title">개인정보 해외 이전 동의 (필수)</div>
          <div class="consent-check__sub">데이터는 Supabase Inc.(미국 리전)에 저장됩니다.</div>
        </div>
      </label>
      <div class="consent-actions">
        <button class="btn btn--ghost" type="button" data-tuz-action="consent-cancel">나중에</button>
        <button class="btn btn--primary" type="button" data-tuz-action="consent-accept" disabled>동의하고 시작</button>
      </div>
    </div>
  `;
  document.body.appendChild(ovl);
  const c1 = ovl.querySelector('#consent1');
  const c2 = ovl.querySelector('#consent2');
  const accept = ovl.querySelector('[data-tuz-action="consent-accept"]');
  const sync = () => { accept.disabled = !(c1.checked && c2.checked); };
  c1.addEventListener('change', sync);
  c2.addEventListener('change', sync);
}
function closeConsentModal() { document.getElementById('tuz-consent')?.remove(); }

// ─── #stamp 뷰 본문 렌더 ─────────────────────────
async function renderStampView() {
  const root = document.getElementById('stampViewBody');
  if (!root) return;
  if (!isLoggedIn()) {
    root.innerHTML = `
      <div class="card">
        <div class="stamp-balance">
          <div class="stamp-balance__label">STAMP</div>
          <div class="stamp-balance__count">— / 10</div>
          <p class="stamp-balance__sub">카카오 로그인 후 스탬프를 적립할 수 있어요</p>
        </div>
        ${loginButtonHtml({ style: 'width:100%' })}
      </div>
    `;
    return;
  }

  const user = getUser();
  const profile = getProfile();
  const max = parseInt(document.getElementById('stampMax')?.textContent, 10) || 10;
  const count = await refreshActiveCount();
  const [{ stamps, rewards }, arts] = await Promise.all([
    getMyHistory(40),
    listArts(),
  ]);
  const artMap = Object.fromEntries(arts.map((a) => [a.id, a]));

  const nick = esc(profile?.nickname || user?.user_metadata?.name || '손님');
  const avatar = profile?.avatar_url || user?.user_metadata?.avatar_url || '';

  // 활성 스탬프를 시간순(오래된→최신)으로 정렬
  const activeStamps = stamps.filter((s) => !s.redeemed_at).reverse();

  // 아트 셀 grid (max 칸)
  const artCells = Array.from({ length: max }, (_, i) => {
    const s = activeStamps[i];
    if (!s) return `<div class="stamp-cell stamp-cell--empty" aria-label="빈 칸"></div>`;
    const art = s.art_id ? artMap[s.art_id] : null;
    const label = esc(art?.label || '도장');
    return art?.image_url
      ? `<div class="stamp-cell stamp-cell--filled" title="${label} · ${formatDateShort(s.created_at)}">
           <img src="${esc(art.image_url)}" alt="${label}" loading="lazy">
         </div>`
      : `<div class="stamp-cell stamp-cell--filled stamp-cell--default" title="${formatDateShort(s.created_at)}" aria-label="${label}"></div>`;
  }).join('');

  root.innerHTML = `
    <div class="account-row">
      ${avatar ? `<img src="${esc(avatar)}" alt="" loading="lazy">` : `<div style="width:36px;height:36px;border-radius:50%;background:var(--tuz-red-soft);"></div>`}
      <div class="account-row__name">${nick}</div>
      <button class="account-row__signout" type="button" data-tuz-action="signout">로그아웃</button>
    </div>

    <div class="card">
      <div class="stamp-balance">
        <div class="stamp-balance__label">활성 스탬프</div>
        <div class="stamp-balance__count">${count} / ${max}</div>
        <p class="stamp-balance__sub">${count >= max ? '교환 가능합니다 — 카운터에 알려주세요' : `${max - count}잔 더 모으면 음료 한 잔`}</p>
      </div>
      <div class="stamp-grid" style="--stamp-max:${max}">${artCells}</div>
      ${count >= max ? `<button class="btn btn--primary" type="button" data-tuz-action="redeem" style="width:100%;margin-top:14px">한 달 무료 음료권 교환</button>` : ''}
    </div>

    <div class="card">
      <div class="eyebrow" style="margin-bottom:10px">매장 코드 입력</div>
      <form class="stamp-claim-form" data-tuz-form="claim">
        <input type="text" name="code" autocomplete="off" inputmode="text" maxlength="12" placeholder="6자리 코드" />
        <button class="btn btn--primary" type="submit">적립</button>
        <p class="stamp-claim-msg" data-msg></p>
      </form>
    </div>

    <div class="card">
      <div class="eyebrow" style="margin-bottom:10px">최근 이력</div>
      <div class="stamp-history">
        ${[
          ...rewards.map((r) => ({ kind: 'reward', date: r.redeemed_at, label: '보상 교환' })),
          ...stamps.map((s) => ({ kind: s.redeemed_at ? 'used' : 'active', date: s.created_at, label: s.note || '스탬프 적립' })),
        ].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 30).map((row) => `
          <div class="stamp-history__row">
            <span class="stamp-history__date">${esc(formatDateShort(row.date))}</span>
            <span>${esc(row.label)}</span>
            <span class="stamp-history__tag${row.kind !== 'active' ? ' is-redeemed' : ''}">${esc(
              row.kind === 'reward' ? '보상' : row.kind === 'used' ? '사용' : '+1'
            )}</span>
          </div>
        `).join('') || '<p style="color:var(--ink-3);font-size:13px;margin:6px 0">아직 이력이 없어요</p>'}
      </div>
    </div>

    <p style="font-size:11px;color:var(--ink-3);text-align:center"><a href="#privacy" data-go="privacy" style="color:inherit;text-decoration:underline">개인정보 처리방침</a></p>
  `;
}

function formatDateShort(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((today - day) / 86400000);
  if (diff === 0) return '오늘 ' + d.toTimeString().slice(0, 5);
  if (diff === 1) return '어제';
  if (diff <= 7) return `${diff}일 전`;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// ─── #staff 뷰 본문 렌더 ─────────────────────────
let _staffTimer = null;
let _staffCurrentCode = null;

async function renderStaffView() {
  const root = document.getElementById('staffViewBody');
  if (!root) return;
  if (!isLoggedIn()) {
    root.innerHTML = `
      <div class="card">
        <p style="font-size:14px;margin:0 0 12px">스태프 계정으로 로그인해주세요.</p>
        ${loginButtonHtml({ style: 'width:100%' })}
      </div>
    `;
    return;
  }
  if (!isStaff()) {
    root.innerHTML = `
      <div class="card">
        <p style="font-size:14px;margin:0">이 페이지는 스태프 전용입니다.</p>
        <p style="font-size:12px;color:var(--ink-3);margin:8px 0 0">권한 부여는 사장님에게 문의해주세요.</p>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <div class="card">
      <div class="staff-code">
        <div class="staff-code__label">현재 코드 (5분 유효)</div>
        <div class="staff-code__value" data-staff-code>------</div>
        <p class="staff-code__expiry" data-staff-expiry>발급 중…</p>
        <div class="staff-qr-wrap" data-staff-qr-wrap>
          <img id="staffQrImg" class="staff-qr-img" src="" alt="QR 코드" hidden>
          <p class="staff-qr-hint">손님이 카메라로 QR을 스캔하면 자동 적립됩니다</p>
        </div>
        <button class="staff-code__refresh" type="button" data-tuz-action="staff-refresh">새 코드</button>
      </div>
    </div>

    <div class="card" id="staffArtsCard">
      <div class="eyebrow" style="margin-bottom:12px">아트 도안 관리</div>
      <div id="staffArtsList" class="staff-arts-list">불러오는 중…</div>
      <label class="btn btn--ghost" style="display:block;text-align:center;margin-top:10px;cursor:pointer">
        + 도안 추가
        <input type="file" accept="image/*" id="staffArtUpload" style="display:none">
      </label>
    </div>
  `;
  await fetchStaffCode();
  await renderStaffArts();
  if (_staffTimer) clearInterval(_staffTimer);
  _staffTimer = setInterval(() => fetchStaffCode().catch(() => {}), 5 * 60 * 1000);
}

async function fetchStaffCode() {
  const valEl  = document.querySelector('[data-staff-code]');
  const expEl  = document.querySelector('[data-staff-expiry]');
  const qrImg  = document.getElementById('staffQrImg');
  if (!valEl || !expEl) return;
  try {
    const res = await issueStaffCode(5);
    _staffCurrentCode = res?.code || '------';
    valEl.textContent = _staffCurrentCode;
    if (res?.valid_until) {
      const t = new Date(res.valid_until);
      expEl.textContent = `만료 ${t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      expEl.textContent = '5분 유효';
    }
    if (qrImg && _staffCurrentCode !== '------') {
      const claimUrl = `https://tuz.kr/?claim=${_staffCurrentCode}`;
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=1a1612&bgcolor=ffffff&data=${encodeURIComponent(claimUrl)}`;
      qrImg.hidden = false;
    }
  } catch (e) {
    valEl.textContent = '------';
    expEl.textContent = e?.message === 'function_not_deployed'
      ? 'Edge Function 미배포 — README 참고'
      : '발급 실패 — 다시 시도';
    if (qrImg) qrImg.hidden = true;
  }
}

async function renderStaffArts() {
  const listEl = document.getElementById('staffArtsList');
  if (!listEl) return;
  try {
    const arts = await listArts();
    if (arts.length === 0) {
      listEl.innerHTML = '<p style="font-size:13px;color:var(--ink-3);margin:0">아직 등록된 도안이 없어요. 이미지를 추가해주세요.</p>';
      return;
    }
    listEl.innerHTML = arts.map((a) => `
      <div class="staff-art-row" data-art-id="${esc(a.id)}">
        <img src="${esc(a.image_url)}" alt="${esc(a.label)}" class="staff-art-thumb">
        <span class="staff-art-label">${esc(a.label)}</span>
        <button class="btn btn--ghost" type="button" data-tuz-action="art-delete" data-id="${esc(a.id)}" style="font-size:12px;padding:4px 10px">삭제</button>
      </div>
    `).join('');
  } catch (e) {
    listEl.innerHTML = `<p style="font-size:13px;color:#b03030">로드 실패: ${esc(e?.message || '알 수 없는 오류')}</p>`;
  }
}

// ─── 아트 업로드 ──────────────────────────────────
document.addEventListener('change', (e) => {
  const input = e.target.closest('#staffArtUpload');
  if (!input || !input.files?.length) return;
  const file = input.files[0];
  const rawId = prompt('도안 ID를 입력하세요 (영문 소문자·숫자, 예: bean, cat, heart)', file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/\s+/g, '-'));
  if (!rawId) return;
  const id = rawId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const label = prompt('도안 이름을 입력하세요 (예: 커피콩)', id) || id;
  if (!id) return;

  (async () => {
    try {
      const { supabase } = await import('../app.js?v=32');
      const ext = file.name.split('.').pop() || 'png';
      const path = `${id}.${ext}`;
      const { error: upErr } = await supabase.storage.from('stamp-arts').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('stamp-arts').getPublicUrl(path);
      await createArt({ id, label, imageUrl: publicUrl });
      await renderStaffArts();
    } catch (err) {
      alert('업로드 실패: ' + (err?.message || '알 수 없는 오류'));
    } finally {
      input.value = '';
    }
  })();
});

// ─── 전역 액션 핸들러 ─────────────────────────────
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tuz-action]');
  if (!t) return;
  const action = t.dataset.tuzAction;
  if (action === 'kakao-login')     { e.preventDefault(); signInKakao(); return; }
  if (action === 'signout')         { e.preventDefault(); signOut(); return; }
  if (action === 'consent-accept') {
    e.preventDefault();
    acceptConsent().then((ok) => { if (ok) closeConsentModal(); });
    return;
  }
  if (action === 'consent-cancel') { e.preventDefault(); closeConsentModal(); return; }
  if (action === 'staff-refresh')  { e.preventDefault(); fetchStaffCode(); return; }
  if (action === 'art-delete') {
    e.preventDefault();
    const id = t.dataset.id;
    if (!id || !confirm(`"${id}" 도안을 삭제할까요?`)) return;
    deleteArt(id).then(() => renderStaffArts()).catch((err) => alert('삭제 실패: ' + (err?.message || '')));
    return;
  }
  if (action === 'redeem') {
    e.preventDefault();
    if (!confirm('한 달 무료 음료권으로 교환할까요? 활성 스탬프가 0으로 초기화됩니다.')) return;
    const max = parseInt(document.getElementById('stampMax')?.textContent, 10) || 10;
    redeemReward(max)
      .then(() => { refreshHomeStampCard(); renderStampView(); alert('교환 완료! 카운터에 알려주세요.'); })
      .catch((err) => alert(err?.message === 'function_not_deployed'
        ? 'Edge Function이 아직 배포되지 않았습니다. README 참고.'
        : '교환 실패: ' + (err?.message || '알 수 없는 오류')));
  }
});

// 이메일 OTP 로그인
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-tuz-form="email-login"]');
  if (!f) return;
  e.preventDefault();
  const email = (f.querySelector('input[name="email"]')?.value || '').trim();
  if (!email) return;
  const sent = f.closest('.email-login-wrap')?.querySelector('.email-login-sent');
  signInEmail(email)
    .then(() => { if (sent) sent.style.display = ''; f.style.display = 'none'; })
    .catch((err) => { console.error('[email-login]', err); alert('전송 실패: ' + (err?.message || err)); });
});

// 비밀번호 로그인 (임시 테스트용)
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-tuz-form="password-login"]');
  if (!f) return;
  e.preventDefault();
  const email = (f.querySelector('input[name="email"]')?.value || '').trim();
  const password = (f.querySelector('input[name="password"]')?.value || '').trim();
  if (!email || !password) return;
  signInPassword(email, password)
    .catch((err) => { console.error('[password-login]', err); alert('로그인 실패: ' + (err?.message || err)); });
});

// 적립 폼 제출 → 룰렛 표시
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-tuz-form="claim"]');
  if (!f) return;
  e.preventDefault();
  const input = f.querySelector('input[name="code"]');
  const msg = f.querySelector('[data-msg]');
  const code = (input?.value || '').trim();
  if (!code) { msg.textContent = '코드를 입력해주세요'; msg.className = 'stamp-claim-msg is-err'; return; }
  msg.textContent = '확인 중…'; msg.className = 'stamp-claim-msg';
  claimWithCode(code).then((result) => {
    msg.textContent = '';
    if (input) input.value = '';
    refreshActiveCount().then(() => refreshHomeStampCard());
    showRoulette(result || { bonus_type: 'normal', art: null });
  }).catch((err) => {
    const m = err?.message || '';
    msg.className = 'stamp-claim-msg is-err';
    if (m === 'function_not_deployed') msg.textContent = 'Edge Function이 아직 배포되지 않았습니다 (README 참고)';
    else if (m.includes('expired') || m.includes('invalid')) msg.textContent = '만료되었거나 잘못된 코드예요';
    else if (m.includes('duplicate') || m.includes('already')) msg.textContent = '이미 적립한 코드입니다';
    else msg.textContent = '적립 실패 — 다시 시도해주세요';
  });
});

// auth 변경 → 홈 카드/뷰 갱신 + pending claim 소비
let _wasLoggedIn = false;
onAuthChange(({ session, profile }) => {
  const nowLoggedIn = !!session;
  refreshHomeStampCard();
  const visible = document.querySelector('[data-view]:not([hidden])')?.dataset.view;
  if (visible === 'stamp') renderStampView();
  if (visible === 'staff') renderStaffView();

  // 로그인 직후 동의 모달
  if (nowLoggedIn && !_wasLoggedIn && profile && !hasConsent()) {
    setTimeout(openConsentModal, 200);
  }
  if (nowLoggedIn && profile && !hasConsent() && !document.getElementById('tuz-consent')) {
    setTimeout(openConsentModal, 200);
  }

  // pending QR claim 소비 (로그인 + 동의 완료 상태일 때)
  if (nowLoggedIn && hasConsent()) {
    processPendingClaim();
  }

  _wasLoggedIn = nowLoggedIn;
});

// globally expose for app.js LOADERS
window.tuzStamp = { renderView: renderStampView, refreshHomeCard: refreshHomeStampCard };
window.tuzStaff = { renderView: renderStaffView };
window.tuzShowRoulette = showRoulette;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', refreshHomeStampCard);
} else {
  refreshHomeStampCard();
}
