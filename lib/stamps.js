// Tuz · 스탬프 적립/조회/교환 (per-user)
// Edge Functions: issue-code (staff), claim-stamp (user) — 배포 후에 적립 가능
import { supabase } from '../app.js?v=32';
import { getUser, isLoggedIn } from './auth.js';

// 본인의 활성 스탬프 카운트 (redeemed_at IS NULL)
export async function getMyActiveCount() {
  if (window.__tuzMock) return window.__tuzMock.activeCount ?? 0;
  if (!isLoggedIn()) return 0;
  const { data, error } = await supabase.rpc('my_active_stamp_count');
  if (!error && typeof data === 'number') return data;
  const user = getUser();
  if (!user) return 0;
  const res = await supabase
    .from('stamps').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).is('redeemed_at', null);
  return res.count || 0;
}

// 본인 적립/교환 이력 (최근 N개) — art_id, bonus_type 포함
export async function getMyHistory(limit = 30) {
  if (window.__tuzMock) return { stamps: window.__tuzMock.stamps ?? [], rewards: [] };
  if (!isLoggedIn()) return { stamps: [], rewards: [] };
  const user = getUser();
  const [s, r] = await Promise.all([
    supabase.from('stamps')
      .select('id,note,created_at,redeemed_at,art_id,bonus_type')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit),
    supabase.from('rewards').select('id,reward_type,redeemed_at')
      .eq('user_id', user.id).order('redeemed_at', { ascending: false }).limit(limit),
  ]);
  return { stamps: s.data || [], rewards: r.data || [] };
}

// 활성화된 아트 도안 목록
export async function listArts() {
  if (window.__tuzMock) return window.__tuzMock.arts ?? [];
  const { data } = await supabase
    .from('stamp_arts')
    .select('id, label, image_url, weight, enabled')
    .eq('enabled', true)
    .order('created_at');
  return data || [];
}

// 매장 코드로 스탬프 적립 — Edge Function이 RLS 우회해 insert
// 반환: { ok, bonus_type, art: { id, label, image_url } | null, new_count }
export async function claimWithCode(code) {
  if (window.__tuzMock) {
    const tiers = ['normal','normal','normal','normal','double','half_off','free_drink'];
    const bonus_type = tiers[Math.floor(Math.random() * tiers.length)];
    const arts = window.__tuzMock.arts ?? [];
    const art = arts.length ? arts[Math.floor(Math.random() * arts.length)] : null;
    const add = bonus_type === 'double' ? 2 : 1;
    window.__tuzMock.activeCount = (window.__tuzMock.activeCount ?? 0) + add;
    const now = new Date().toISOString();
    const newStamps = Array.from({ length: add }, (_, i) => ({
      id: `mock-s${Date.now()}-${i}`, created_at: now, redeemed_at: null, art_id: art?.id ?? null, bonus_type,
    }));
    window.__tuzMock.stamps = [...newStamps, ...(window.__tuzMock.stamps ?? [])].slice(0, 30);
    return { ok: true, bonus_type, art, new_count: window.__tuzMock.activeCount };
  }
  if (!isLoggedIn()) throw new Error('login_required');
  const trimmed = String(code || '').trim().toUpperCase();
  if (!trimmed) throw new Error('empty_code');
  const { data, error } = await supabase.functions.invoke('claim-stamp', {
    body: { code: trimmed },
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

// 스태프: 아트 도안 업로드 후 stamp_arts 테이블에 insert
export async function createArt({ id, label, imageUrl }) {
  const { data, error } = await supabase.from('stamp_arts').insert({
    id, label, image_url: imageUrl, weight: 1, enabled: true,
  }).select().single();
  if (error) throw error;
  return data;
}

// 스태프: 아트 enabled 토글
export async function toggleArt(id, enabled) {
  const { error } = await supabase.from('stamp_arts').update({ enabled }).eq('id', id);
  if (error) throw error;
}

// 스태프: 아트 삭제
export async function deleteArt(id) {
  const { error } = await supabase.from('stamp_arts').delete().eq('id', id);
  if (error) throw error;
}
