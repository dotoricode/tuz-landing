// ADR-0006: itemContainer + itemActions 는 슬라이스 schema 가 own.
// admin.js 는 schema 를 해석하는 dispatcher.

const PIN_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>';

// 공지 핀 단일화 — payload 에 is_pinned=true 인 행이 있으면 기존 핀을 모두 해제.
// 직후 upsert 가 payload 의 새 핀을 true 로 설정하므로 결과적으로 단일 핀 보장.
export async function enforceNewsPinnedExclusive(supabase, payload) {
  const arr = Array.isArray(payload) ? payload : [payload];
  const wantsPin = arr.some((r) => r.is_pinned === true);
  if (!wantsPin) return;
  // is_pinned 컬럼이 없으면(마이그레이션 전) 무시
  const { error } = await supabase.from('news').update({ is_pinned: false }).eq('is_pinned', true);
  if (error && error.message?.includes('is_pinned')) return;
  if (error) throw error;
}

export const NEWS_SCHEMA = {
  label: '공지사항',
  noun: '공지',
  mode: 'list',
  views: ['news'],
  table: 'news',
  itemContainer: '#newsList',
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
  itemActions: [
    {
      key: 'pin-toggle',
      label: '홈 고정',
      icon: PIN_ICON,
      // itemEl.dataset.pinned 가 'true' 면 on (golden), 아니면 off (회색)
      state: (itemEl) => itemEl.dataset.pinned === 'true' ? 'on' : 'off',
      handler: async (itemEl, ctx) => {
        const id = itemEl.dataset.itemId;
        const isPinned = itemEl.dataset.pinned === 'true';
        const next = !isPinned;
        if (next) {
          await enforceNewsPinnedExclusive(ctx.supabase, [{ is_pinned: true }]);
        }
        const { error } = await ctx.supabase.from('news').update({ is_pinned: next }).eq('id', id);
        if (error) { ctx.toast(`핀 토글 실패: ${error.message}`, { error: true }); return; }
        ctx.toast(next ? '홈 화면에 고정됨' : '고정 해제됨');
        await ctx.refreshTable('news');
      },
    },
  ],
};
