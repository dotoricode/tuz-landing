// Tuz · 매장 회전 코드 발급 (스태프 전용)
// 배포: supabase functions deploy issue-code --no-verify-jwt=false
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function randomCode(): string {
  // 6자리 숫자, 0/O 헷갈림 회피 위해 0 제외하고 1~9 만
  let s = '';
  const digits = '123456789';
  for (let i = 0; i < 6; i++) s += digits[Math.floor(Math.random() * digits.length)];
  return s;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1) JWT로 호출자 확인
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // 2) staff role 확인 (app_metadata.role === 'staff')
    const role = (user.app_metadata as any)?.role;
    if (role !== 'staff') {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const ttlMin = Math.max(1, Math.min(30, parseInt(body?.ttl_min, 10) || 5));
    const validUntil = new Date(Date.now() + ttlMin * 60 * 1000);

    // 3) service role로 store_codes insert (충돌 시 다시 생성)
    const admin = createClient(url, serviceKey);
    let code = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      code = randomCode();
      const { error } = await admin.from('store_codes').insert({
        code,
        valid_until: validUntil.toISOString(),
        created_by: user.id,
      });
      if (!error) break;
      if (!/duplicate|unique/i.test(error.message)) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ code, valid_until: validUntil.toISOString() }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
