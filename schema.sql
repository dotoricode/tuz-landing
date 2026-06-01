-- ============================================================
-- TUZ 카페 관리자 스키마
-- 사용법: Supabase Dashboard → SQL Editor → 새 쿼리 →
--         이 파일 전체 내용 복사-붙여넣기 → Run (Ctrl+Enter)
-- ============================================================

-- ─── 1. 테이블 ─────────────────────────────

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  tag text default 'NOTICE',
  title text not null,
  title_en text,
  body text,
  date date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.pick (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  name text not null,
  name_en text,
  price text,
  note text,
  barista text default '사장 pick',
  date date default current_date,
  photo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.winners (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  nick text not null,
  month text default '무료음료',
  period text,
  created_at timestamptz default now()
);

-- greeting: 한 행만 존재 (사장님 한 분, 인사말 한 개)
create table if not exists public.greeting (
  id int primary key default 1 check (id = 1),
  photo text,
  body text,
  sign text default '— TUZ 드림',
  updated_at timestamptz default now()
);
insert into public.greeting (id) values (1) on conflict (id) do nothing;

-- settings: 단일 행 (사이트 전역 설정 — WiFi 등)
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  wifi_ssid text default 'TUZ_Guest',
  wifi_password text default 'tuz12345',
  updated_at timestamptz default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.menu (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  category text default 'MENU',
  name text not null,
  name_en text,
  price text,
  tag text,
  hero_photo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  name text not null,
  quantity numeric not null default 0 check (quantity >= 0),
  unit text not null default '개',
  category text default '',
  min_quantity numeric check (min_quantity is null or min_quantity >= 0),
  expiry_date date,
  expiry_type text not null default 'SELL-BY' check (expiry_type in ('SELL-BY', 'NONE')),
  storage_method text default '',
  origin text default '',
  stock_group text,
  updated_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── 2. Row Level Security (보안 정책) ──────────

alter table public.news     enable row level security;
alter table public.pick     enable row level security;
alter table public.winners  enable row level security;
alter table public.greeting enable row level security;
alter table public.menu     enable row level security;
alter table public.settings enable row level security;
alter table public.inventory_items enable row level security;

-- 공개 읽기 — 방문자 누구나 사이트 내용 볼 수 있음
drop policy if exists "public_read_news"     on public.news;
drop policy if exists "public_read_pick"     on public.pick;
drop policy if exists "public_read_winners"  on public.winners;
drop policy if exists "public_read_greeting" on public.greeting;
drop policy if exists "public_read_menu"     on public.menu;
drop policy if exists "public_read_settings" on public.settings;
drop policy if exists "public_read_inventory_items" on public.inventory_items;

create policy "public_read_news"     on public.news     for select using (true);
create policy "public_read_pick"     on public.pick     for select using (true);
create policy "public_read_winners"  on public.winners  for select using (true);
create policy "public_read_greeting" on public.greeting for select using (true);
create policy "public_read_menu"     on public.menu     for select using (true);
create policy "public_read_settings" on public.settings for select using (true);
create policy "public_read_inventory_items" on public.inventory_items for select using (true);

-- 인증된 사용자만 쓰기 — 관리자 로그인 시에만 수정 가능
drop policy if exists "auth_write_news"     on public.news;
drop policy if exists "auth_write_pick"     on public.pick;
drop policy if exists "auth_write_winners"  on public.winners;
drop policy if exists "auth_write_greeting" on public.greeting;
drop policy if exists "auth_write_menu"     on public.menu;
drop policy if exists "auth_write_settings" on public.settings;
drop policy if exists "public_write_inventory_items" on public.inventory_items;

create policy "auth_write_news"     on public.news     for all to authenticated using (true) with check (true);
create policy "auth_write_pick"     on public.pick     for all to authenticated using (true) with check (true);
create policy "auth_write_winners"  on public.winners  for all to authenticated using (true) with check (true);
create policy "auth_write_greeting" on public.greeting for all to authenticated using (true) with check (true);
create policy "auth_write_menu"     on public.menu     for all to authenticated using (true) with check (true);
create policy "auth_write_settings" on public.settings for all to authenticated using (true) with check (true);

-- inventory는 별도 PIN 게이트가 있는 정적 관리 화면에서 anon client로 동작한다.
-- 더 강한 보호가 필요해지면 서버 함수 + service role 쓰기로 옮긴다.
create policy "public_write_inventory_items" on public.inventory_items for all using (true) with check (true);

-- ─── 3. Storage 버킷 + 정책 ─────────────────────

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "public_read_photos" on storage.objects;
drop policy if exists "auth_insert_photos" on storage.objects;
drop policy if exists "auth_update_photos" on storage.objects;
drop policy if exists "auth_delete_photos" on storage.objects;

create policy "public_read_photos" on storage.objects
  for select using (bucket_id = 'photos');

create policy "auth_insert_photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos');

create policy "auth_update_photos" on storage.objects
  for update to authenticated using (bucket_id = 'photos');

create policy "auth_delete_photos" on storage.objects
  for delete to authenticated using (bucket_id = 'photos');

-- ─── 4. updated_at 자동 갱신 트리거 ────────────

create or replace function public.tz_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_news_updated     on public.news;
drop trigger if exists trg_pick_updated     on public.pick;
drop trigger if exists trg_greeting_updated on public.greeting;
drop trigger if exists trg_menu_updated     on public.menu;
drop trigger if exists trg_settings_updated on public.settings;
drop trigger if exists trg_inventory_items_updated on public.inventory_items;

create trigger trg_news_updated     before update on public.news     for each row execute function public.tz_touch_updated_at();
create trigger trg_pick_updated     before update on public.pick     for each row execute function public.tz_touch_updated_at();
create trigger trg_greeting_updated before update on public.greeting for each row execute function public.tz_touch_updated_at();
create trigger trg_menu_updated     before update on public.menu     for each row execute function public.tz_touch_updated_at();
create trigger trg_settings_updated before update on public.settings for each row execute function public.tz_touch_updated_at();
create trigger trg_inventory_items_updated before update on public.inventory_items for each row execute function public.tz_touch_updated_at();

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'inventory_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
  END IF;
END $$;

-- 끝. 오류 없이 끝났다면 설정 완료.

-- ─── 2026-04 디자인 개선: 신규 컬럼 ─────────
ALTER TABLE menu ADD COLUMN IF NOT EXISTS is_signature BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS kakao_app_key TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS kakao_lat DOUBLE PRECISION DEFAULT 35.5596;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS kakao_lng DOUBLE PRECISION DEFAULT 129.3443;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS hours_weekday TEXT DEFAULT '08:00-22:00';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS hours_weekend TEXT DEFAULT '10:00-23:00';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS holiday_notice TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS regular_closure_kr TEXT DEFAULT '매월 마지막 월요일';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS regular_closure_en TEXT DEFAULT 'Last Mon';
ALTER TABLE winners ADD COLUMN IF NOT EXISTS period TEXT;

-- ─── 2026-04-19 개선: 메뉴 사진 + 오늘의 공지 ─────────
ALTER TABLE settings ADD COLUMN IF NOT EXISTS menu_hero_photo TEXT;
ALTER TABLE menu ADD COLUMN IF NOT EXISTS photo TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS is_today BOOLEAN DEFAULT false;

-- ─── 2026-04-19 추가: 공지 사진 ─────────
ALTER TABLE news ADD COLUMN IF NOT EXISTS photo TEXT;

-- ─── 2026-05 ADR-0001: Pick → Menu FK ─────────
ALTER TABLE pick ADD COLUMN IF NOT EXISTS menu_id uuid REFERENCES public.menu(id) ON DELETE SET NULL;
-- menu_id FK 도입으로 name은 optional (메뉴 이름은 menu 테이블에서 join)
ALTER TABLE pick ALTER COLUMN name DROP NOT NULL;

-- ─── 2026-05 ADR-0003 + 명명 정리 ─────────
-- is_today → is_pinned (수동 해제 전까지 유지되는 홈 화면 고정 공지)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news' AND column_name = 'is_today'
  ) THEN
    ALTER TABLE news RENAME COLUMN is_today TO is_pinned;
  END IF;
END $$;
-- is_signature 제거 (카테고리로 통일 — ADR-0003)
ALTER TABLE menu DROP COLUMN IF EXISTS is_signature;

-- ─── 2026-05 카테고리 재편: SIGNATURE / COFFEE / NON-COFFEE ─────────
UPDATE menu SET category = 'NON-COFFEE · 논커피'
  WHERE category IN ('BAKERY · 베이커리', 'DESSERT · 디저트');

-- ─── 2026-05 inventory: explicit stock grouping for low-stock checks ─────────
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS stock_group TEXT;

-- ─── 2026-06 inventory: event-log based stock operations ────────────────
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('use', 'discard', 'open', 'restock', 'adjust')),
  item_id uuid,
  stock_key text,
  lot_id uuid,
  quantity_delta numeric not null default 0,
  reason text,
  undo_until timestamptz,
  reversed_at timestamptz,
  reverses_event_id uuid references public.inventory_events(id) on delete set null,
  actor text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_events_created_at
  ON public.inventory_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_events_stock_key_created_at
  ON public.inventory_events (stock_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_events_lot_id_created_at
  ON public.inventory_events (lot_id, created_at DESC);

ALTER TABLE public.inventory_events enable row level security;

DROP POLICY IF EXISTS "public_read_inventory_events" on public.inventory_events;
DROP POLICY IF EXISTS "public_write_inventory_events" on public.inventory_events;

CREATE POLICY "public_read_inventory_events" on public.inventory_events for select using (true);
CREATE POLICY "public_write_inventory_events" on public.inventory_events for all using (true) with check (true);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'inventory_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_events;
  END IF;
END $$;
