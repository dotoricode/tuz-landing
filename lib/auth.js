// Tuz · 카카오 로그인 (Supabase Auth) + 동의 플래그 관리
// 외부 의존: Supabase Dashboard → Authentication → Providers → Kakao 활성화 필요
import { supabase } from '../app.js?v=31';

let _session = null;
let _profile = null;
const _listeners = new Set();

function notify() { _listeners.forEach((fn) => { try { fn({ session: _session, profile: _profile }); } catch (_) {} }); }

export function getSession()  { return _session; }
export function getProfile()  { return _profile; }
export function getUser()     { return _session?.user || null; }
export function isLoggedIn()  { return !!_session; }
export function onAuthChange(fn) {
  _listeners.add(fn);
  // 즉시 1회 발화 (구독자가 현재 상태를 받도록)
  try { fn({ session: _session, profile: _profile }); } catch (_) {}
  return () => _listeners.delete(fn);
}

async function loadProfile(userId) {
  if (!userId) { _profile = null; return; }
  const { data, error } = await supabase
    .from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) { console.warn('[auth] profile load failed:', error.message); _profile = null; return; }
  _profile = data || null;
}

export async function signInKakao() {
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo, scopes: 'profile_nickname profile_image account_email' },
  });
  if (error) {
    console.error('[auth] kakao sign-in failed:', error);
    alert('카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
}

export async function signOut() {
  await supabase.auth.signOut();
  _session = null; _profile = null;
  notify();
}

// 동의 처리 — 두 항목 모두 체크해야 호출
export async function acceptConsent() {
  const user = getUser();
  if (!user) return false;
  const now = new Date().toISOString();
  const { error } = await supabase.from('profiles').update({
    consent_personal_info_at: now,
    consent_overseas_transfer_at: now,
  }).eq('user_id', user.id);
  if (error) { console.warn('[auth] consent save failed:', error.message); return false; }
  await loadProfile(user.id);
  notify();
  return true;
}

export function hasConsent() {
  return !!(_profile && _profile.consent_personal_info_at && _profile.consent_overseas_transfer_at);
}

// 스태프 권한 (JWT app_metadata.role === 'staff')
export function isStaff() {
  const role = _session?.user?.app_metadata?.role;
  return role === 'staff';
}

// 부팅 시 1회: 현재 세션 + onAuthStateChange 구독
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  _session = session;
  if (session?.user) await loadProfile(session.user.id);
  notify();

  supabase.auth.onAuthStateChange(async (_event, sess) => {
    _session = sess;
    if (sess?.user) await loadProfile(sess.user.id);
    else _profile = null;
    notify();
  });
}
init();
