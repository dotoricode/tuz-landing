export const WINNERS_SCHEMA = {
  label: '이달의 당첨자',
  noun: '당첨자',
  mode: 'list',
  views: ['event'],
  fields: [
    { col: 'nick',   label: '닉네임',              type: 'text', required: true },
    { col: 'month',  label: '혜택',                type: 'text', placeholder: '5월 무료음료' },
    { col: 'period', label: '이벤트 기간 (선택)',  type: 'text', placeholder: '2026.04.01 ~ 2026.04.30' },
  ],
};
