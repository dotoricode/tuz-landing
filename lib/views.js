// Tuz · 카카오 로그인 기반 뷰 렌더 (#stamp, #staff, 홈 stamp card, 동의 모달)
import { showView } from '../app.js?v=31';
import {
  onAuthChange, getUser, getProfile, isLoggedIn, isStaff,
  signInKakao, signOut, hasConsent, acceptConsent,
} from './auth.js';
import { getMyActiveCount, getMyHistory, claimWithCode, redeemReward, issueStaffCode } from './stamps.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// 사용자별 활성 카운트 캐시 (홈/스탬프 뷰가 공유)
let _activeCount = 0;
async function refreshActiveCount() {
  _activeCount = isLoggedIn() ? await getMyActiveCount() : 0;
  return _activeCount;
}

// ─── 홈 stamp card — 로그인 상태에 따라 CTA + 카운트 갱신 ─────
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
    cta.innerHTML = count >= max
      ? `<button class="btn btn--primary" data-go="stamp" type="button">교환하러 가기</button>`
      : `<button class="btn btn--ghost" data-go="stamp" type="button">스탬프 적립하기 →</button>`;
  } else {
    // 로그아웃 상태 — 점선만 + 로그인 CTA
    cta.innerHTML = `<button class="btn btn--primary" data-tuz-action="kakao-login" type="button">카카오로 로그인하고 시작하기</button>`;
  }
}

// ─── 동의 모달 (첫 로그인 직후 — 둘 다 체크 필요) ─────────
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

// ─── #stamp 뷰 본문 렌더 ──────────────────────────
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
        <button class="btn btn--primary" type="button" data-tuz-action="kakao-login" style="width:100%">카카오로 로그인</button>
      </div>
    `;
    return;
  }
  const user = getUser();
  const profile = getProfile();
  const max = parseInt(document.getElementById('stampMax')?.textContent, 10) || 10;
  const count = await refreshActiveCount();
  const { stamps, rewards } = await getMyHistory(20);

  const nick = esc(profile?.nickname || user?.user_metadata?.name || '손님');
  const avatar = profile?.avatar_url || user?.user_metadata?.avatar_url || '';

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
      ${count >= max ? `<button class="btn btn--primary" type="button" data-tuz-action="redeem" style="width:100%">한 달 무료 음료권 교환</button>` : ''}
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

// ─── #staff 뷰 본문 렌더 ──────────────────────────
let _staffTimer = null;
let _staffCurrentCode = null;
async function renderStaffView() {
  const root = document.getElementById('staffViewBody');
  if (!root) return;
  if (!isLoggedIn()) {
    root.innerHTML = `
      <div class="card">
        <p style="font-size:14px;margin:0 0 12px">스태프 계정으로 로그인해주세요.</p>
        <button class="btn btn--primary" type="button" data-tuz-action="kakao-login" style="width:100%">카카오로 로그인</button>
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
        <button class="staff-code__refresh" type="button" data-tuz-action="staff-refresh">새 코드</button>
      </div>
    </div>
    <p style="font-size:12px;color:var(--ink-3);text-align:center;line-height:1.6">
      손님이 매장 코드 입력 화면에 위 6자리를 입력하면 스탬프가 적립됩니다.<br/>
      코드는 5분마다 자동 갱신됩니다.
    </p>
  `;
  await fetchStaffCode();
  if (_staffTimer) clearInterval(_staffTimer);
  _staffTimer = setInterval(() => fetchStaffCode().catch(() => {}), 5 * 60 * 1000);
}

async function fetchStaffCode() {
  const valEl = document.querySelector('[data-staff-code]');
  const expEl = document.querySelector('[data-staff-expiry]');
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
  } catch (e) {
    valEl.textContent = '------';
    expEl.textContent = e?.message === 'function_not_deployed'
      ? 'Edge Function 미배포 — README 참고'
      : '발급 실패 — 다시 시도';
  }
}

// ─── 전역 액션 핸들러 ─────────────────────────────
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tuz-action]');
  if (!t) return;
  const action = t.dataset.tuzAction;
  if (action === 'kakao-login') { e.preventDefault(); signInKakao(); return; }
  if (action === 'signout') { e.preventDefault(); signOut(); return; }
  if (action === 'consent-accept') {
    e.preventDefault();
    acceptConsent().then((ok) => { if (ok) closeConsentModal(); });
    return;
  }
  if (action === 'consent-cancel') { e.preventDefault(); closeConsentModal(); return; }
  if (action === 'staff-refresh') { e.preventDefault(); fetchStaffCode(); return; }
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

// 적립 폼 제출
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-tuz-form="claim"]');
  if (!f) return;
  e.preventDefault();
  const input = f.querySelector('input[name="code"]');
  const msg = f.querySelector('[data-msg]');
  const code = (input?.value || '').trim();
  if (!code) { msg.textContent = '코드를 입력해주세요'; msg.className = 'stamp-claim-msg is-err'; return; }
  msg.textContent = '확인 중…'; msg.className = 'stamp-claim-msg';
  claimWithCode(code).then(() => {
    msg.textContent = '적립 완료 ✓';
    msg.className = 'stamp-claim-msg is-ok';
    if (input) input.value = '';
    refreshActiveCount().then(() => { refreshHomeStampCard(); renderStampView(); });
  }).catch((err) => {
    const m = err?.message || '';
    msg.className = 'stamp-claim-msg is-err';
    if (m === 'function_not_deployed') msg.textContent = 'Edge Function이 아직 배포되지 않았습니다 (README 참고)';
    else if (m.includes('expired') || m.includes('invalid')) msg.textContent = '만료되었거나 잘못된 코드예요';
    else if (m.includes('duplicate') || m.includes('already')) msg.textContent = '이미 적립한 코드입니다';
    else msg.textContent = '적립 실패 — 다시 시도해주세요';
  });
});

// auth 변경 시 홈 카드/현재 뷰 업데이트, 첫 로그인이면 동의 모달
let _wasLoggedIn = false;
onAuthChange(({ session, profile }) => {
  const nowLoggedIn = !!session;
  refreshHomeStampCard();
  // 현재 뷰가 stamp/staff면 다시 그려줌
  const visible = document.querySelector('[data-view]:not([hidden])')?.dataset.view;
  if (visible === 'stamp') renderStampView();
  if (visible === 'staff') renderStaffView();

  // 새로 로그인했고 동의가 비어있으면 모달 표시
  if (nowLoggedIn && !_wasLoggedIn && profile && !hasConsent()) {
    setTimeout(openConsentModal, 200);
  }
  // 이미 로그인 상태인데 profile만 늦게 도착하고 동의가 비어있으면도 표시
  if (nowLoggedIn && profile && !hasConsent() && !document.getElementById('tuz-consent')) {
    setTimeout(openConsentModal, 200);
  }
  _wasLoggedIn = nowLoggedIn;
});

// app.js LOADERS 가 호출할 수 있도록 globally expose
window.tuzStamp = { renderView: renderStampView, refreshHomeCard: refreshHomeStampCard };
window.tuzStaff = { renderView: renderStaffView };

// 페이지 로드 시 한 번 홈 카드 동기화 (DOMContentLoaded 보장)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', refreshHomeStampCard);
} else {
  refreshHomeStampCard();
}
