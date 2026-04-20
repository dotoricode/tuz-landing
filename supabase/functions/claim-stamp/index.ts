// Tuz · 스탬프 적립 / 보상 교환 (로그인 사용자)
// 두 가지 동작:
//   - { code: "123456" } : 매장 코드 검증 후 stamps insert + 보상 tier/art 추첨
//   - { action: "redeem", stamp_max: 10 } : 활성 스탬프 N개 redeemed 처리 + rewards insert
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BONUS_TIERS = [
  { tier: 'normal',     weight: 80 },
  { tier: 'double',     weight: 10 },
  { tier: 'half_off',   weight: 7  },
  { tier: 'free_drink', weight: 3  },
] as const;

type BonusTier = typeof BONUS_TIERS[number]['tier'];
type ArtRow = { id: string; label: string; image_url: string; weight: number };

function pickWeighted<T extends { weight: number }>(items: readonly T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  let r = buf[0] % total;
  for (const item of items) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return items[items.length - 1];
}

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

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: 'unauthorized' }, 401);

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

      const ids = active.map((s: { id: string }) => s.id);
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

    const { data: storeCode, error: codeErr } = await admin
      .from('store_codes').select('code, valid_until')
      .eq('code', code).maybeSingle();
    if (codeErr) return json({ error: codeErr.message }, 500);
    if (!storeCode) return json({ error: 'invalid_code' }, 400);
    if (new Date(storeCode.valid_until).getTime() < Date.now()) {
      return json({ error: 'expired_code' }, 400);
    }

    // 중복 방지 — .limit(1) 사용 (double 시 동일 user+code 행이 2개일 수 있음)
    const { data: existingRows } = await admin
      .from('stamps').select('id').eq('user_id', user.id).eq('code', code).limit(1);
    if (existingRows && existingRows.length > 0) return json({ error: 'already_claimed' }, 400);

    // 보상 tier 추첨 (서버 랜덤)
    const bonusType: BonusTier = pickWeighted(BONUS_TIERS).tier;

    // 랜덤 아트 선택 (enabled 아트가 없으면 null)
    const { data: arts } = await admin
      .from('stamp_arts').select('id, label, image_url, weight')
      .eq('enabled', true);
    const artRows = (arts || []) as ArtRow[];
    const art = artRows.length > 0 ? pickWeighted(artRows) : null;

    // 스탬프 insert — double이면 2개 (두 번째는 _x2 suffix로 dedup 키 분리)
    const baseRow = { user_id: user.id, code, bonus_type: bonusType, art_id: art?.id ?? null };
    const insertRows = bonusType === 'double'
      ? [
          { ...baseRow, note: '스탬프 적립 (2배)' },
          { ...baseRow, code: code + '_x2', note: '보너스 스탬프' },
        ]
      : [{ ...baseRow, note: '스탬프 적립' }];

    const { error: insErr } = await admin.from('stamps').insert(insertRows);
    if (insErr) return json({ error: insErr.message }, 500);

    const { count } = await admin
      .from('stamps').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).is('redeemed_at', null);

    return json({
      ok: true,
      bonus_type: bonusType,
      art: art ? { id: art.id, label: art.label, image_url: art.image_url } : null,
      new_count: count ?? 0,
    });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
