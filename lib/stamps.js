// Tuz · 스탬프 적립/조회/교환 (per-user)
// Edge Functions: issue-code (staff), claim-stamp (user) — 배포 후에 적립 가능
import { supabase } from '../app.js?v=31';
import { getUser, isLoggedIn } from './auth.js';

// 본인의 활성 스탬프 카운트 (redeemed_at IS NULL)
export async function getMyActiveCount() {
  if (!isLoggedIn()) return 0;
  // RPC 호출 — 빠르고 RLS 통과
  const { data, error } = await supabase.rpc('my_active_stamp_count');
  if (!error && typeof data === 'number') return data;
  // RPC 미배포 환경에서는 직접 select fallback
  const user = getUser();
  if (!user) return 0;
  const res = await supabase
    .from('stamps').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).is('redeemed_at', null);
  return res.count || 0;
}

// 본인 적립/교환 이력 (최근 N개)
export async function getMyHistory(limit = 30) {
  if (!isLoggedIn()) return { stamps: [], rewards: [] };
  const user = getUser();
  const [s, r] = await Promise.all([
    supabase.from('stamps').select('id,note,created_at,redeemed_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit),
    supabase.from('rewards').select('id,reward_type,redeemed_at')
      .eq('user_id', user.id).order('redeemed_at', { ascending: false }).limit(limit),
  ]);
  return { stamps: s.data || [], rewards: r.data || [] };
}

// 매장 코드로 스탬프 적립 — Edge Function이 RLS 우회해 insert
export async function claimWithCode(code) {
  if (!isLoggedIn()) throw new Error('login_required');
  const trimmed = String(code || '').trim().toUpperCase();
  if (!trimmed) throw new Error('empty_code');
  const { data, error } = await supabase.functions.invoke('claim-stamp', {
    body: { code: trimmed },
  });
  if (error) {
    // Edge Function 미배포 시 친절한 메시지
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('not found') || msg.includes('404')) {
      throw new Error('function_not_deployed');
    }
    throw error;
  }
  return data;
}

// 보상 교환 — 활성 스탬프 N개 redeemed 처리 + rewards insert
export async function redeemReward(stampMax = 10) {
  if (!isLoggedIn()) throw new Error('login_required');
  const { data, error } = await supabase.functions.invoke('claim-stamp', {
    body: { action: 'redeem', stamp_max: stampMax },
  });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('not found') || msg.includes('404')) {
      throw new Error('function_not_deployed');
    }
    throw error;
  }
  return data;
}

// 스태프: 6자리 회전 코드 발급 — 5분 유효
export async function issueStaffCode(ttlMin = 5) {
  const { data, error } = await supabase.functions.invoke('issue-code', {
    body: { ttl_min: ttlMin },
  });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('not found') || msg.includes('404')) {
      throw new Error('function_not_deployed');
    }
    throw error;
  }
  return data; // { code, valid_until }
}
