-- stamp_arts: 도장 아트 콜렉션 도안 풀
CREATE TABLE IF NOT EXISTS stamp_arts (
  id          TEXT PRIMARY KEY,
  label       TEXT        NOT NULL,
  image_url   TEXT        NOT NULL,
  weight      INT         NOT NULL DEFAULT 1 CHECK (weight > 0),
  enabled     BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stamp_arts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stamp_arts_read" ON stamp_arts
  FOR SELECT USING (true);

CREATE POLICY "stamp_arts_write" ON stamp_arts
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
  );

-- stamps 테이블에 보상·아트 컬럼 추가 (테이블이 이미 존재하는 경우에만)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stamps'
  ) THEN
    ALTER TABLE public.stamps
      ADD COLUMN IF NOT EXISTS bonus_type TEXT NOT NULL DEFAULT 'normal',
      ADD COLUMN IF NOT EXISTS art_id     TEXT;
  END IF;
END $$;

-- NOTE: Storage 버킷 'stamp-arts' 는 Supabase Dashboard에서 수동 생성 필요.
-- (Public bucket, anyone can read, staff can upload/delete)
