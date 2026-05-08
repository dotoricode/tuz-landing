let _shown = false;

export function showConnectionToast() {
  if (_shown) return;
  _shown = true;
  const el = document.createElement('div');
  el.className = 'tuz-conn-toast';
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'assertive');
  el.innerHTML = `<span>네트워크 연결을 확인해주세요</span><button type="button" aria-label="닫기">×</button>`;
  el.querySelector('button').addEventListener('click', () => el.remove());
  document.body.appendChild(el);
}
