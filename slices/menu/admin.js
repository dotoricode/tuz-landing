export const MENU_SCHEMA = {
  label: '메뉴',
  noun: '메뉴',
  mode: 'list',
  views: ['menu'],
  table: 'menu',
  itemContainer: '#menuCategories', // 카드는 카테고리 그룹 안에 nested
  // ADR-0006 Phase B: 카테고리(.card) 별로 묶이지만 카테고리 간 이동도 허용.
  // getGroupKey 가 있으면 admin.js 의 reorder dispatcher 가 cross-group drop 을
  // 허용하고, 드롭된 그룹의 eyebrow 텍스트(category) 를 groupField 로 함께 저장한다.
  reorder: {
    col: 'sort_order',
    groupSelector: '.card',
    groupField: 'category',
    getGroupKey: (groupEl) => groupEl.querySelector('.eyebrow')?.textContent?.trim() || null,
  },
  groupBy: 'category', // 편집 모드에서 카테고리 탭으로 분리
  fields: [
    { col: 'category', label: '카테고리', type: 'select', required: true,
      options: ['SIGNATURE · 시그니처', 'COFFEE · 커피', 'NON-COFFEE · 논커피'] },
    { col: 'name',     label: '메뉴명 (한글)', type: 'text', required: true },
    { col: 'name_en',  label: '메뉴명 (영문)', type: 'text' },
    { col: 'price',    label: '가격', type: 'text', placeholder: '4,500' },
    { col: 'photo',    label: '메뉴 사진 (선택)', type: 'photo',
      hint: '업로드 시 메뉴명 왼쪽에 썸네일이 표시됩니다.' },
    { col: 'tag',      label: '뱃지', type: 'tags',
      options: ['NEW', 'SEASON'],
      labels: { NEW: 'NEW', SEASON: 'SEASON' },
      hint: '원하는 뱃지를 눌러서 선택하세요. 여러 개 동시 선택 가능합니다.' },
  ],
};

// settings.menu_hero_photo — menu 페이지 상단 대표 사진 (settings 테이블 사용)
export const MENU_HERO_SCHEMA = {
  label: '메뉴 대표 사진',
  noun: '대표 사진',
  mode: 'single',
  views: ['menu'],
  table: 'settings',
  fields: [
    { col: 'menu_hero_photo', label: '대표 사진', type: 'photo',
      hint: '메뉴 페이지 상단에 표시되는 대표 이미지입니다.' },
  ],
};
