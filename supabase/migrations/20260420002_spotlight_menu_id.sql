-- 홈 Spotlight를 pick 테이블 대신 menu 테이블로 연결
-- spotlight_pick_id는 레거시 보존 (NULL로 유지 가능, Phase 2에서 드롭 예정)
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS spotlight_menu_id UUID REFERENCES menu(id) ON DELETE SET NULL;
