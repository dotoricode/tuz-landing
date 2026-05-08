import { esc, copyText } from '../../shared/dom.js?v=45';

export const LOCATION_LABEL = '오시는 길';
export const ADDRESS = '울산광역시 중구 염포로22, 2층';

// 울산광역시 중구 염포로 22 — Nominatim 지오코딩 기준 반구1동 염포로 시작점
const TUZ_LAT = 35.5596;
const TUZ_LNG = 129.3443;

// LOADER 는 fetch 없이 초기화만 하므로 spec 대신 fn 자체를 export
export const LOCATION_LOADER = {
  view: 'location',
  table: null,
  fn: () => initKakaoMap(),
};

function clearMapEl(mapEl) {
  mapEl.innerHTML = '';
  mapEl.classList.remove('is-empty');
  mapEl.removeAttribute('title');
}

function renderLinkCardFallback(mapEl, reason) {
  clearMapEl(mapEl);
  mapEl.classList.add('is-empty');
  const q = encodeURIComponent(ADDRESS);
  mapEl.innerHTML = `
    <a class="map-fallback" href="https://map.kakao.com/?q=${q}" target="_blank" rel="noopener">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-7.5 7-12a7 7 0 10-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>
      <span class="map-fallback__title">카카오맵에서 보기</span>
      <span class="map-fallback__sub">${esc(ADDRESS)}</span>
    </a>
  `;
  if (reason) mapEl.title = reason;
}

// Leaflet + OpenStreetMap 폴백 — 어떤 도메인에서도 동작
function renderLeafletMap(mapEl) {
  if (mapEl.dataset.mapDrawn === 'leaflet') return;

  const loadCss = () => new Promise((resolve) => {
    if (document.querySelector('link[data-tuz-leaflet]')) return resolve();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    link.dataset.tuzLeaflet = '1';
    link.onload = resolve;
    link.onerror = resolve;
    document.head.appendChild(link);
  });

  const loadJs = () => new Promise((resolve, reject) => {
    if (window.L) return resolve();
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    s.crossOrigin = '';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('leaflet js load failed'));
    document.head.appendChild(s);
  });

  Promise.all([loadCss(), loadJs()]).then(() => {
    clearMapEl(mapEl);
    mapEl.dataset.mapDrawn = 'leaflet';
    const map = window.L.map(mapEl, { zoomControl: true, attributionControl: true })
      .setView([TUZ_LAT, TUZ_LNG], 16);
    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    window.L.marker([TUZ_LAT, TUZ_LNG])
      .addTo(map)
      .bindPopup(`<b>Tuz</b><br>${esc(ADDRESS)}`)
      .openPopup();
  }).catch((e) => {
    console.warn('[tuz] leaflet fallback failed:', e);
    renderLinkCardFallback(mapEl, 'Leaflet 로드 실패 — 네트워크 확인');
  });
}

function initKakaoMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;
  // 중복 실행 방지 (dual-module 방어)
  if (mapEl.dataset.mapInit === '1') return;
  mapEl.dataset.mapInit = '1';

  // 키가 없으면 바로 Leaflet로
  if (!window.KAKAO_APP_KEY) {
    renderLeafletMap(mapEl);
    return;
  }

  let kakaoSucceeded = false;
  const drawKakao = () => {
    try {
      clearMapEl(mapEl);
      const map = new window.kakao.maps.Map(mapEl, {
        center: new window.kakao.maps.LatLng(TUZ_LAT, TUZ_LNG),
        level: 3,
      });
      new window.kakao.maps.Marker({
        map,
        position: new window.kakao.maps.LatLng(TUZ_LAT, TUZ_LNG),
        title: 'Tuz',
      });
      kakaoSucceeded = true;
      mapEl.dataset.mapDrawn = 'kakao';
    } catch (e) {
      console.warn('[tuz] kakao map init failed, using leaflet:', e);
      renderLeafletMap(mapEl);
    }
  };

  const tryLoad = () => {
    if (window.kakao && window.kakao.maps && typeof window.kakao.maps.load === 'function') {
      window.kakao.maps.load(drawKakao);
      return true;
    }
    return false;
  };

  if (tryLoad()) return;

  const existing = document.querySelector('script[data-tuz-kakao]');
  if (existing) {
    existing.addEventListener('load', tryLoad);
    existing.addEventListener('error', () => renderLeafletMap(mapEl));
  } else {
    const script = document.createElement('script');
    script.dataset.tuzKakao = '1';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${window.KAKAO_APP_KEY}&autoload=false`;
    script.onload = tryLoad;
    script.onerror = () => renderLeafletMap(mapEl);
    document.head.appendChild(script);
  }

  // 안전망: 3.5초 안에 Kakao가 window.kakao를 정의하지 않으면 Leaflet로 전환
  // (도메인 whitelist 미등록 시 Kakao는 빈 응답을 보내 SDK가 초기화되지 않음)
  setTimeout(() => {
    if (!kakaoSucceeded && !(window.kakao && window.kakao.maps)) {
      renderLeafletMap(mapEl);
    }
  }, 3500);
}

export function initLocation() {
  const btnCopyAddr = document.getElementById('btnCopyAddr');
  if (btnCopyAddr) {
    btnCopyAddr.addEventListener('click', async () => {
      const ok = await copyText(ADDRESS);
      btnCopyAddr.textContent = ok ? '복사됨 ✓' : '복사 실패';
      setTimeout(() => { btnCopyAddr.textContent = '주소 복사'; }, 1400);
    });
  }
  const btnRoute = document.getElementById('btnRoute');
  if (btnRoute) {
    btnRoute.addEventListener('click', () => {
      window.open(`https://map.kakao.com/?q=${encodeURIComponent(ADDRESS)}`, '_blank', 'noopener');
    });
  }
}
