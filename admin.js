import { supabase, refreshTable } from './app.js';

// ─── 테이블 스키마 ──────────────────────────
// 각 테이블의 "편집 가능한 컬럼 정의". Supabase 컬럼명은 snake_case 유지.
const SCHEMAS = {
  news: {
    label: '공지 · 이벤트',
    mode: 'list',
    fields: [
      { col: 'tag',       label: '분류',         type: 'select', options: ['EVENT','NEW','HOURS','NOTICE'], placeholder: 'NOTICE' },
      { col: 'title',     label: '제목 (한글)',  type: 'text',   required: true },
      { col: 'title_en',  label: '제목 (영문)',  type: 'text' },
      { col: 'body',      label: '본문',         type: 'textarea' },
      { col: 'date',      label: '날짜',         type: 'date' },
    ],
  },
  pick: {
    label: '오늘의 추천',
    mode: 'list',
    fields: [
      { col: 'photo',     label: '사진',         type: 'photo' },
      { col: 'name',      label: '메뉴명 (한글)', type: 'text', required: true },
      { col: 'name_en',   label: '메뉴명 (영문)', type: 'text' },
      { col: 'price',     label: '가격',         type: 'text', placeholder: '6,500' },
      { col: 'barista',   label: '추천자',       type: 'text', placeholder: '큰 사장 pick' },
      { col: 'note',      label: '한줄 설명',    type: 'textarea' },
      { col: 'date',      label: '날짜',         type: 'date' },
    ],
  },
  winners: {
    label: '이달의 당첨자',
    mode: 'list',
    fields: [
      { col: 'nick',      label: '닉네임',       type: 'text', required: true },
      { col: 'month',     label: '혜택',         type: 'text', placeholder: '5월 무료음료' },
    ],
  },
  greeting: {
    label: '사장님 인사말',
    mode: 'single',
    fields: [
      { col: 'photo',     label: '사진',         type: 'photo' },
      { col: 'body',      label: '인사말 본문',  type: 'textarea', rows: 8 },
      { col: 'sign',      label: '서명',         type: 'text', placeholder: '— TUZ 드림' },
    ],
  },
  menu: {
    label: '메뉴',
    mode: 'list',
    fields: [
      { col: 'hero_photo', label: '대표 사진 (첫 행만)', type: 'photo' },
      { col: 'category',   label: '카테고리', type: 'text', required: true, placeholder: 'COFFEE · 커피' },
      { col: 'name',       label: '메뉴명 (한글)', type: 'text', required: true },
      { col: 'name_en',    label: '메뉴명 (영문)', type: 'text' },
      { col: 'price',      label: '가격', type: 'text', placeholder: '4,500' },
      { col: 'tag',        label: '뱃지', type: 'text', placeholder: 'NEW' },
    ],
  },
};

// ─── 상태 ──────────────────────────────────
let currentUser = null;
let rootEl = null; // admin overlay root

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ─── 루트 / 플로팅 버튼 ──────────────────────
function ensureRoot() {
  if (rootEl) return rootEl;
  rootEl = document.createElement('div');
  rootEl.id = 'tuz-admin-root';
  document.body.appendChild(rootEl);
  return rootEl;
}

function renderFab() {
  const existing = document.getElementById('tuz-admin-fab');
  if (existing) existing.remove();

  const fab = document.createElement('button');
  fab.id = 'tuz-admin-fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', currentUser ? '관리' : '관리자 로그인');
  fab.innerHTML = currentUser
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16M4 12h16"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/></svg>`;
  fab.addEventListener('click', () => {
    if (currentUser) openDashboard();
    else openLogin();
  });
  document.body.appendChild(fab);
}

// ─── 모달 헬퍼 ──────────────────────────────
function openModal({ title, body, actions = [], onClose }) {
  const root = ensureRoot();
  root.innerHTML = '';
  const overlay = document.createElement('div');
  overlay.className = 'tuz-ovl';
  overlay.innerHTML = `
    <div class="tuz-sheet" role="dialog" aria-modal="true">
      <header class="tuz-sheet__head">
        <h2>${esc(title)}</h2>
        <button class="tuz-sheet__close" type="button" aria-label="닫기">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </header>
      <div class="tuz-sheet__body"></div>
      <footer class="tuz-sheet__foot"></footer>
    </div>
  `;
  overlay.querySelector('.tuz-sheet__body').appendChild(body);

  const footEl = overlay.querySelector('.tuz-sheet__foot');
  if (actions.length === 0) footEl.hidden = true;
  actions.forEach((a) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tuz-btn2 ${a.primary ? 'is-primary' : 'is-ghost'}`;
    btn.textContent = a.label;
    btn.addEventListener('click', () => a.onClick && a.onClick({ close }));
    footEl.appendChild(btn);
  });

  function close() {
    overlay.remove();
    if (onClose) onClose();
  }
  overlay.querySelector('.tuz-sheet__close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  root.appendChild(overlay);
  return { close, overlay };
}

function toast(msg, { error = false } = {}) {
  const t = document.createElement('div');
  t.className = `tuz-admin-toast ${error ? 'is-error' : ''}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('is-leaving'), 1800);
  setTimeout(() => t.remove(), 2400);
}

// ─── 로그인 ────────────────────────────────
function openLogin() {
  const form = document.createElement('form');
  form.className = 'tuz-form';
  form.innerHTML = `
    <label>이메일
      <input type="email" name="email" required autocomplete="username" inputmode="email"/>
    </label>
    <label>비밀번호
      <input type="password" name="password" required autocomplete="current-password"/>
    </label>
    <p class="tuz-form__hint">Supabase에 등록하신 관리자 계정으로 로그인하세요.</p>
  `;

  const { close } = openModal({
    title: '관리자 로그인',
    body: form,
    actions: [
      { label: '취소', onClick: ({ close }) => close() },
      {
        label: '로그인', primary: true,
        onClick: async ({ close }) => {
          const f = new FormData(form);
          const { error } = await supabase.auth.signInWithPassword({
            email: f.get('email'), password: f.get('password'),
          });
          if (error) { toast(`로그인 실패: ${error.message}`, { error: true }); return; }
          toast('로그인되었습니다');
          close();
        },
      },
    ],
  });

  // submit on Enter
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.parentElement.parentElement.querySelector('.tuz-sheet__foot .is-primary').click();
  });
}

// ─── 관리자 대시보드 (5개 테이블 선택) ─────
function openDashboard() {
  const list = document.createElement('div');
  list.className = 'tuz-dash';
  list.innerHTML = Object.entries(SCHEMAS).map(([key, s]) => `
    <button type="button" class="tuz-dash__row" data-key="${key}">
      <span>${esc(s.label)}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
    </button>
  `).join('') + `
    <div class="tuz-dash__user">
      <span>${esc(currentUser?.email || '')}</span>
      <button type="button" class="tuz-btn2 is-ghost" id="tuz-logout">로그아웃</button>
    </div>
  `;

  const { close } = openModal({ title: '관리 메뉴', body: list });

  list.querySelectorAll('.tuz-dash__row').forEach((b) => {
    b.addEventListener('click', () => {
      close();
      openEditor(b.dataset.key);
    });
  });
  list.querySelector('#tuz-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    close();
    toast('로그아웃되었습니다');
  });
}

// ─── 에디터 ─────────────────────────────────
async function openEditor(tableKey) {
  const schema = SCHEMAS[tableKey];
  if (!schema) return;

  // fetch current rows
  const { data, error } = schema.mode === 'single'
    ? await supabase.from(tableKey).select('*').maybeSingle().then((r) => ({ data: r.data ? [r.data] : [{ id: 1 }], error: r.error }))
    : await supabase.from(tableKey).select('*').order('sort_order', { ascending: true });

  if (error) { toast(`불러오기 실패: ${error.message}`, { error: true }); return; }

  const rows = Array.isArray(data) ? data.map((r) => ({ ...r })) : [];
  const removedIds = []; // track deletes for batch save

  const body = document.createElement('div');
  body.className = 'tuz-editor';
  const listEl = document.createElement('div');
  listEl.className = 'tuz-editor__list';
  body.appendChild(listEl);

  function rebuild() {
    listEl.innerHTML = '';
    rows.forEach((row, idx) => listEl.appendChild(buildRowCard(row, idx)));
  }

  function buildRowCard(row, idx) {
    const card = document.createElement('div');
    card.className = 'tuz-row-card';

    if (schema.mode === 'list') {
      const head = document.createElement('div');
      head.className = 'tuz-row-card__head';
      head.innerHTML = `
        <span class="tuz-row-card__num">${idx + 1}</span>
        <div class="tuz-row-card__actions">
          <button type="button" class="tuz-icon-btn" data-act="up"   aria-label="위로">▲</button>
          <button type="button" class="tuz-icon-btn" data-act="down" aria-label="아래로">▼</button>
          <button type="button" class="tuz-icon-btn is-danger" data-act="del" aria-label="삭제">✕</button>
        </div>
      `;
      card.appendChild(head);

      head.querySelector('[data-act="up"]').addEventListener('click', () => {
        if (idx === 0) return;
        [rows[idx - 1], rows[idx]] = [rows[idx], rows[idx - 1]];
        rebuild();
      });
      head.querySelector('[data-act="down"]').addEventListener('click', () => {
        if (idx === rows.length - 1) return;
        [rows[idx + 1], rows[idx]] = [rows[idx], rows[idx + 1]];
        rebuild();
      });
      head.querySelector('[data-act="del"]').addEventListener('click', () => {
        if (!confirm('이 행을 삭제할까요?')) return;
        if (row.id) removedIds.push(row.id);
        rows.splice(idx, 1);
        rebuild();
      });
    }

    schema.fields.forEach((f) => {
      card.appendChild(buildField(f, row));
    });
    return card;
  }

  function buildField(f, row) {
    const wrap = document.createElement('label');
    wrap.className = 'tuz-field';

    const lbl = document.createElement('span');
    lbl.className = 'tuz-field__label';
    lbl.textContent = f.label + (f.required ? ' *' : '');
    wrap.appendChild(lbl);

    if (f.type === 'photo') {
      const container = document.createElement('div');
      container.className = 'tuz-photo-field';
      const preview = document.createElement('div');
      preview.className = 'tuz-photo-preview';

      const renderPreview = (url) => {
        preview.innerHTML = url
          ? `<img src="${esc(url)}" alt=""/><button type="button" class="tuz-photo-clear">삭제</button>`
          : `<span class="tuz-photo-empty">사진 없음</span>`;
        const clear = preview.querySelector('.tuz-photo-clear');
        if (clear) clear.addEventListener('click', () => { row[f.col] = null; renderPreview(''); });
      };
      renderPreview(row[f.col] || '');

      const fileBtn = document.createElement('label');
      fileBtn.className = 'tuz-photo-upload';
      fileBtn.innerHTML = `<span>사진 업로드</span><input type="file" accept="image/*" hidden>`;
      const fileInput = fileBtn.querySelector('input');
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        try {
          lbl.textContent = f.label + ' · 업로드 중…';
          const url = await uploadPhoto(file);
          row[f.col] = url;
          renderPreview(url);
          toast('사진 업로드 완료');
        } catch (e) {
          toast(`업로드 실패: ${e.message || e}`, { error: true });
        } finally {
          lbl.textContent = f.label + (f.required ? ' *' : '');
          fileInput.value = '';
        }
      });

      container.appendChild(preview);
      container.appendChild(fileBtn);
      wrap.appendChild(container);
      return wrap;
    }

    let input;
    if (f.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = f.rows || 3;
    } else if (f.type === 'select') {
      input = document.createElement('select');
      (f.options || []).forEach((o) => {
        const opt = document.createElement('option');
        opt.value = o; opt.textContent = o;
        input.appendChild(opt);
      });
    } else {
      input = document.createElement('input');
      input.type = f.type || 'text';
    }
    if (f.placeholder) input.placeholder = f.placeholder;
    input.value = row[f.col] == null ? '' : row[f.col];
    input.addEventListener('input', () => { row[f.col] = input.value || null; });
    input.addEventListener('change', () => { row[f.col] = input.value || null; });
    wrap.appendChild(input);
    return wrap;
  }

  // bottom add button for list mode
  if (schema.mode === 'list') {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'tuz-btn2 is-ghost tuz-editor__add';
    addBtn.textContent = '＋ 행 추가';
    addBtn.addEventListener('click', () => {
      rows.push({});
      rebuild();
    });
    body.appendChild(addBtn);
  }

  rebuild();

  openModal({
    title: `${schema.label} 편집`,
    body,
    actions: [
      { label: '취소', onClick: ({ close }) => close() },
      {
        label: '저장', primary: true,
        onClick: async ({ close }) => {
          try {
            await saveRows(tableKey, schema, rows, removedIds);
            toast('저장되었습니다');
            await refreshTable(tableKey);
            close();
          } catch (e) {
            toast(`저장 실패: ${e.message || e}`, { error: true });
          }
        },
      },
    ],
  });
}

// ─── 저장 로직 ──────────────────────────────
async function saveRows(tableKey, schema, rows, removedIds) {
  if (schema.mode === 'single') {
    const r = rows[0] || {};
    const payload = { id: 1 };
    schema.fields.forEach((f) => { payload[f.col] = r[f.col] ?? null; });
    const { error } = await supabase.from(tableKey).upsert(payload);
    if (error) throw error;
    return;
  }

  // list mode: delete removed, upsert remaining with sort_order from index
  if (removedIds.length) {
    const { error } = await supabase.from(tableKey).delete().in('id', removedIds);
    if (error) throw error;
  }

  const payload = rows.map((r, i) => {
    const out = { sort_order: i };
    schema.fields.forEach((f) => { out[f.col] = r[f.col] ?? null; });
    if (r.id) out.id = r.id;
    // drop empty required rows
    const req = schema.fields.find((f) => f.required);
    if (req && !out[req.col]) return null;
    return out;
  }).filter(Boolean);

  if (!payload.length) return;
  const { error } = await supabase.from(tableKey).upsert(payload);
  if (error) throw error;
}

// ─── 사진 업로드 ────────────────────────────
async function uploadPhoto(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || 'jpg'}`;
  const { error } = await supabase.storage.from('photos').upload(path, file, {
    cacheControl: '3600', upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return data.publicUrl;
}

// ─── 세션 부팅 ──────────────────────────────
async function init() {
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user || null;
  renderFab();

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    renderFab();
  });
}

init();
