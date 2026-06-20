-- ============================================================
-- TUZ 재고 관리 데모용 더미 데이터
-- Supabase Dashboard > SQL Editor 에서 실행
-- ============================================================

-- 인사말
insert into public.greeting (id, body, sign) values (
  1,
  '안녕하세요! 투즈 재고 관리 데모 페이지입니다.\n실제 카페 운영 환경과 동일한 UI로 재고를 확인하고 수정해볼 수 있어요.',
  '— 투즈 데모'
) on conflict (id) do update set body = excluded.body, sign = excluded.sign;

-- WiFi 설정
insert into public.settings (id, wifi_ssid, wifi_password) values (
  1, 'TUZ_Guest', 'tuz12345'
) on conflict (id) do update set wifi_ssid = excluded.wifi_ssid, wifi_password = excluded.wifi_password;

-- ─── 재고 아이템 (카페 실제 사용 품목 기반 더미) ───────────────

insert into public.inventory_items (sort_order, name, quantity, unit, category, min_quantity, expiry_date, expiry_type, storage_method, stock_group) values

-- 원두 / 커피
(10,  '에스프레소 블렌드',       2.5,  'kg',  '원두',    1.0,  '2026-08-01', 'SELL-BY', '냉동',     'coffee'),
(11,  '싱글오리진 에티오피아',   0.8,  'kg',  '원두',    0.5,  '2026-07-15', 'SELL-BY', '냉동',     'coffee'),
(12,  '디카페인 블렌드',         1.2,  'kg',  '원두',    0.5,  '2026-07-20', 'SELL-BY', '냉동',     'coffee'),

-- 우유 / 유제품
(20,  '매일 우유 (1L)',          8,    '개',  '유제품',  4,    '2026-06-28', 'SELL-BY', '냉장',     'dairy'),
(21,  '오트 밀크 (1L)',          6,    '개',  '유제품',  3,    '2026-09-01', 'SELL-BY', '상온',     'dairy'),
(22,  '두유 (190ml)',            12,   '개',  '유제품',  6,    '2026-08-15', 'SELL-BY', '상온',     'dairy'),
(23,  '생크림 (500ml)',          2,    '개',  '유제품',  1,    '2026-06-25', 'SELL-BY', '냉장',     'dairy'),

-- 시럽 / 소스
(30,  '바닐라 시럽 (1L)',        1,    '병',  '시럽',    1,    null,         'NONE',    '상온',     'syrup'),
(31,  '헤이즐넛 시럽 (1L)',      2,    '병',  '시럽',    1,    null,         'NONE',    '상온',     'syrup'),
(32,  '캐러멜 소스 (2kg)',       1,    '통',  '시럽',    1,    null,         'NONE',    '냉장',     'syrup'),
(33,  '초콜릿 소스 (2kg)',       1,    '통',  '시럽',    1,    null,         'NONE',    '냉장',     'syrup'),
(34,  '말차 파우더 (1kg)',       0.6,  'kg',  '파우더',  0.3,  '2027-01-01', 'SELL-BY', '냉동',     'powder'),
(35,  '고구마 라떼 파우더 (1kg)',0.4,  'kg',  '파우더',  0.3,  '2026-11-01', 'SELL-BY', '냉동',     'powder'),

-- 일회용 / 포장
(40,  '테이크아웃 컵 12oz',      180,  '개',  '포장재',  50,   null,         'NONE',    '상온',     'packaging'),
(41,  '테이크아웃 컵 16oz',      120,  '개',  '포장재',  50,   null,         'NONE',    '상온',     'packaging'),
(42,  '컵 뚜껑 (공용)',          250,  '개',  '포장재',  80,   null,         'NONE',    '상온',     'packaging'),
(43,  '종이 봉투 (소)',           60,   '개',  '포장재',  30,   null,         'NONE',    '상온',     'packaging'),
(44,  '냅킨',                   400,  '장',  '소모품',  100,  null,         'NONE',    '상온',     'supplies'),
(45,  '빨대 (개별 포장)',         150,  '개',  '소모품',  50,   null,         'NONE',    '상온',     'supplies'),

-- 디저트 재료
(50,  '버터 (무염, 500g)',        3,   '개',  '베이킹',  2,    '2026-09-01', 'SELL-BY', '냉장',     'baking'),
(51,  '설탕 (1kg)',               2,   '봉',  '베이킹',  1,    null,         'NONE',    '상온',     'baking'),
(52,  '박력분 (1kg)',             1.5, 'kg',  '베이킹',  1,    '2027-03-01', 'SELL-BY', '냉동',     'baking'),
(53,  '달걀 (30구)',              1,   '판',  '베이킹',  1,    '2026-06-30', 'SELL-BY', '냉장',     'baking'),

-- 음료 재료
(60,  '탄산수 (500ml)',           24,  '캔',  '음료',    12,   '2027-06-01', 'SELL-BY', '상온',     'beverage'),
(61,  '레몬즙 (500ml)',           2,   '병',  '음료',    1,    '2026-08-01', 'SELL-BY', '냉장',     'beverage'),

-- 청소 / 위생
(70,  '에스프레소 머신 세정제',   2,   '개',  '소모품',  1,    null,         'NONE',    '상온',     'cleaning'),
(71,  '행주',                    8,   '장',  '소모품',  4,    null,         'NONE',    '상온',     'cleaning');
