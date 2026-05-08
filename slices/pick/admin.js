// 두 사장(큰 사장 / 작은 사장)이 각자 독립적으로 선정. 같은 pick 테이블을 barista 컬럼으로 분리.
const PICK_FIELDS = [
  { col: 'menu_id', label: '메뉴 선택', type: 'menu-select', required: true },
  { col: 'photo',   label: '사진 (선택 — 비우면 메뉴 사진 사용)', type: 'photo' },
  { col: 'note',    label: '한줄 설명', type: 'textarea' },
];

export const PICK_BIG_SCHEMA = {
  label: '큰 사장 pick',
  noun: '큰 사장 pick',
  mode: 'single',
  views: ['pick'],
  table: 'pick',
  filter: { barista: '큰 사장' },
  itemContainer: ['#pickBig', '#pickSmall'], // 두 사장 카드 모두 동일 view 안
  fields: PICK_FIELDS,
};

export const PICK_SMALL_SCHEMA = {
  label: '작은 사장 pick',
  noun: '작은 사장 pick',
  mode: 'single',
  views: ['pick'],
  table: 'pick',
  filter: { barista: '작은 사장' },
  fields: PICK_FIELDS,
};
