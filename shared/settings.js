// ADR-0005: Settings 데이터 모듈.
// 인터페이스 3 entry — bootSettings / subscribeSettings / refreshSettings.

import { supabase } from './supabase.js?v=52';
import { showConnectionToast } from './conn-toast.js?v=52';

const CACHE_KEY = 'tuz-cache-v5:settings';
const CACHE_MS = 2 * 60 * 1000;

let lastRow = {};
let inflight = null;
let booted = false;
const subscribers = new Set();

function toCamel(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const key = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = (v && typeof v === 'object' && !Array.isArray(v)) ? toCamel(v) : v;
  }
  return out;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) { return null; }
}

function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); }
  catch (_) { /* ignore */ }
}

function publish() {
  for (const cb of subscribers) {
    try { cb(lastRow); }
    catch (e) { console.warn('[tuz] settings subscriber threw:', e); }
  }
}

async function fetchRow() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from('settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      if (data) {
        lastRow = toCamel(data);
        writeCache(lastRow);
        publish();
      }
    } catch (e) {
      console.warn('[tuz] settings load failed:', e.message || e);
      showConnectionToast();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * 부팅 시 한 번 호출. 캐시가 있으면 즉시 publish, 그 후 백그라운드 fetch.
 * 멱등 — 두 번 호출해도 무해.
 */
export function bootSettings() {
  if (booted) return;
  booted = true;
  const cached = readCache();
  if (cached?.data) {
    lastRow = cached.data;
    publish();
    if (Date.now() - cached.at < CACHE_MS) return;
  }
  fetchRow();
}

/**
 * 자기 facet 렌더러를 등록. cb는 즉시 동기 호출됨 (값 없으면 {}).
 * row 변경 시 다시 호출.
 * @param {(row: object) => void} cb
 * @returns {() => void} unsubscribe
 */
export function subscribeSettings(cb) {
  subscribers.add(cb);
  try { cb(lastRow); }
  catch (e) { console.warn('[tuz] settings subscriber threw on subscribe:', e); }
  return () => { subscribers.delete(cb); };
}

/**
 * 강제 재fetch + 모든 subscriber 재호출. admin 저장 후 호출.
 */
export async function refreshSettings() {
  try { localStorage.removeItem(CACHE_KEY); } catch (_) { /* ignore */ }
  await fetchRow();
}
