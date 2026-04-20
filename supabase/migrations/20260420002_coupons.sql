-- coupons: 룰렛 당첨 쿠폰 (half_off / free_drink) 발급·소진 추적
-- stamp_id는 참조 편의용 UUID (stamps 테이블 FK 없이 저장)
CREATE TABLE IF NOT EXISTS public.coupons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stamp_id     UUID,
  coupon_type  TEXT NOT NULL CHECK (coupon_type IN ('half_off', 'free_drink')),
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at  TIMESTAMPTZ,
  redeemed_by  UUID REFERENCES auth.users(id),
  note         TEXT
);

CREATE INDEX IF NOT EXISTS coupons_user_idx   ON public.coupons (user_id);
CREATE INDEX IF NOT EXISTS coupons_active_idx ON public.coupons (user_id) WHERE redeemed_at IS NULL;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- 본인 쿠폰 조회
DROP POLICY IF EXISTS "coupons_self_read" ON public.coupons;
CREATE POLICY "coupons_self_read" ON public.coupons
  FOR SELECT USING (auth.uid() = user_id);

-- 스태프: 전체 조회 (app_metadata.role = 'staff')
DROP POLICY IF EXISTS "coupons_staff_read" ON public.coupons;
CREATE POLICY "coupons_staff_read" ON public.coupons
  FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- 스태프: 소진 처리 update
DROP POLICY IF EXISTS "coupons_staff_update" ON public.coupons;
CREATE POLICY "coupons_staff_update" ON public.coupons
  FOR UPDATE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');
