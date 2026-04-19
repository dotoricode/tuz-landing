// Tuz · 스탬프 적립 / 보상 교환 (로그인 사용자)
// 두 가지 동작:
//   - { code: "123456" } : 매장 코드 검증 후 stamps insert (중복 방지)
//   - { action: "redeem", stamp_max: 10 } : 활성 스탬프 N개 redeemed 처리 + rewards insert
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // 1) JWT 검증
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: 'unauthorized' }, 401);

    // 2) profile 동의 확인
    const admin = createClient(url, serviceKey);
    const { data: profile } = await admin.from('profiles')
      .select('consent_personal_info_at, consent_overseas_transfer_at')
      .eq('user_id', user.id).maybeSingle();
    if (!profile?.consent_personal_info_at || !profile?.consent_overseas_transfer_at) {
      return json({ error: 'consent_required' }, 403);
    }

    const body = await req.json().catch(() => ({}));

    // ─── 보상 교환 ─────────────────────────
    if (body?.action === 'redeem') {
      const stampMax = Math.max(1, Math.min(20, parseInt(body?.stamp_max, 10) || 10));
      const { data: active, error: actErr } = await admin
        .from('stamps').select('id')
        .eq('user_id', user.id).is('redeemed_at', null)
        .order('created_at', { ascending: true }).limit(stampMax);
      if (actErr) return json({ error: actErr.message }, 500);
      if (!active || active.length < stampMax) return json({ error: 'not_enough_stamps' }, 400);

      const ids = active.map((s) => s.id);
      const now = new Date().toISOString();
      const { error: updErr } = await admin.from('stamps')
        .update({ redeemed_at: now }).in('id', ids);
      if (updErr) return json({ error: updErr.message }, 500);

      const { error: rewErr } = await admin.from('rewards').insert({
        user_id: user.id, reward_type: 'free_drink_month', redeemed_at: now,
      });
      if (rewErr) return json({ error: rewErr.message }, 500);

      return json({ ok: true, redeemed: ids.length });
    }

    // ─── 스탬프 적립 ────────────────────────
    const code = String(body?.code || '').trim().toUpperCase();
    if (!code) return json({ error: 'empty_code' }, 400);

    // 코드 유효성 (만료 안 됐는지)
    const { data: storeCode, error: codeErr } = await admin
      .from('store_codes').select('code, valid_until')
      .eq('code', code).maybeSingle();
    if (codeErr) return json({ error: codeErr.message }, 500);
    if (!storeCode) return json({ error: 'invalid_code' }, 400);
    if (new Date(storeCode.valid_until).getTime() < Date.now()) {
      return json({ error: 'expired_code' }, 400);
    }

    // 중복 방지: 같은 코드를 같은 user 가 한 번만 적립
    const { data: existing, error: existErr } = await admin
      .from('stamps').select('id').eq('user_id', user.id).eq('code', code).maybeSingle();
    if (existErr) return json({ error: existErr.message }, 500);
    if (existing) return json({ error: 'already_claimed' }, 400);

    const { error: insErr } = await admin.from('stamps').insert({
      user_id: user.id, code, note: '매장 코드 적립',
    });
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
