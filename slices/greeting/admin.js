export const GREETING_SCHEMA = {
  label: '사장님 인사말',
  noun: '인사말',
  mode: 'single',
  views: ['greeting'],
  fields: [
    { col: 'photo', label: '사진',        type: 'photo' },
    { col: 'body',  label: '인사말 본문', type: 'textarea', rows: 8 },
    { col: 'sign',  label: '서명',        type: 'text', placeholder: '— TUZ 드림' },
  ],
};
