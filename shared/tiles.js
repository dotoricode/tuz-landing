export function isRecent(isoTs, days = 7) {
  if (!isoTs) return false;
  const t = new Date(isoTs);
  if (isNaN(t.getTime())) return false;
  return (Date.now() - t.getTime()) <= days * 86400000;
}

export function isNewSince(isoTs, viewName) {
  if (!isoTs) return false;
  const t = new Date(isoTs);
  if (isNaN(t.getTime())) return false;
  const seen = parseInt(localStorage.getItem(`tuz_seen_${viewName}`) || '0', 10);
  return seen ? t.getTime() > seen : isRecent(isoTs);
}

// 타일에 "업데이트 있음" 표시 — 빨간 점 + 딥레드 테두리 (.has-update 클래스)
// .tile[data-go=...] 로 한정해 마퀴/카드 버튼 같은 다른 [data-go] 요소를 제외
export function markTileUpdate(viewName, hasUpdate) {
  const tile = document.querySelector(`.tile[data-go="${viewName}"]`);
  if (!tile) return;
  tile.classList.toggle('has-update', !!hasUpdate);
  const existing = tile.querySelector('.tile__dot');
  if (hasUpdate && !existing) {
    const dot = document.createElement('span');
    dot.className = 'tile__dot';
    dot.setAttribute('aria-label', '새 업데이트');
    tile.appendChild(dot);
  } else if (!hasUpdate && existing) {
    existing.remove();
  }
}
