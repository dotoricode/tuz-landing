export const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) { return false; }
}

export function imgUrl(url) {
  if (!url) return '';
  const u = String(url).trim();
  if (!/^https?:\/\//i.test(u)) return '';
  let m = u.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1200`;
  m = u.match(/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1200`;
  m = u.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (m && /drive\.google\.com/.test(u)) return `https://lh3.googleusercontent.com/d/${m[1]}=w1200`;
  return u;
}
