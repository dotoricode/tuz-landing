export const NEWS_SCHEMA = {
  label: '공지사항',
  noun: '공지',
  mode: 'list',
  views: ['news'],
  fields: [
    { col: 'tag',       label: '분류',        type: 'select',
      options: ['', 'NOTICE', 'EVENT', 'NEW', 'SCHEDULE', 'SEASON', 'SPECIAL'] },
    { col: 'title',     label: '제목 (한글)', type: 'text', required: true },
    { col: 'title_en',  label: '제목 (영문)', type: 'text', placeholder: '비워두면 영문 표시 안 됨' },
    { col: 'body',      label: '본문',        type: 'textarea' },
    { col: 'photo',     label: '사진 (선택)', type: 'photo',
      hint: '업로드 시 카드 상단에 16:9 배너로 표시됩니다.' },
    { col: 'is_pinned', label: '홈 화면 상단에 고정', type: 'checkbox',
      hint: '체크 시 홈 화면 마퀴에 이 공지가 노출됩니다. 수동으로 끄기 전까지 유지됩니다.' },
    { col: 'date',      autoDate: true },
  ],
};
