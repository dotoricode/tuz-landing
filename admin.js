import { supabase, refreshTable } from './app.js';

// ─── 테이블 스키마 ──────────────────────────
// noun: UI에서 부를 자연스러운 이름 (예: "공지" → "+ 공지 추가")
const SCHEMAS = {
  news: {
    label: '공지 · 이벤트',
    noun: '공지',
    mode: 'list',
    views: ['news'],
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
    noun: '추천',
    mode: 'list',
    views: ['pick'],
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
    noun: '당첨자',
    mode: 'list',
    views: ['event'],
    fields: [
      { col: 'nick',      label: '닉네임',       type: 'text', required: true },
      { col: 'month',     label: '혜택',         type: 'text', placeholder: '5월 무료음료' },
    ],
  },
  greeting: {
    label: '사장님 인사말',
    noun: '인사말',
    mode: 'single',
    views: ['greeting'],
    fields: [
      { col: 'photo',     label: '사진',         type: 'photo' },
      { col: 'body',      label: '인사말 본문',  type: 'textarea', rows: 8 },
      { col: 'sign',      label: '서명',         type: 'text', placeholder: '— TUZ 드림' },
    ],
  },
  menu: {
    label: '메뉴',
    noun: '메뉴',
    mode: 'list',
    views: ['menu'],
    fields: [
      { col: 'hero_photo', label: '대표 사진 (첫 행만)', type: 'photo' },
      { col: 'category',   label: '카테고리', type: 'text', required: true, placeholder: 'COFFEE · 커피' },
      { col: 'name',       label: '메뉴명 (한글)', type: 'text', required: true },
      { col: 'name_en',    label: '메뉴명 (영문)', type: 'text' },
      { col: 'price',      label: '가격', type: 'text', placeholder: '4,500' },
      { col: 'tag',        label: '뱃지', type: 'text', placeholder: 'NEW' },
    ],
  },
  settings: {
    label: 'WiFi 정보',
    noun: 'WiFi',
    mode: 'single',
    views: ['wifi'],
    table: 'settings',
    fields: [
      { col: 'wifi_ssid',     label: '네트워크 이름 (SSID)', type: 'text', required: true, placeholder: 'TUZ_Guest' },
      { col: 'wifi_password', label: '비밀번호',             type: 'text', required: true, placeholder: 'tuz12345' },
    ],
  },
};

let currentUser = null;

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ─── 모달 헬퍼 ──────────────────────────────
function openModal({ title, body, actions = [], onClose }) {
  let root = document.getElementById('tuz-admin-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'tuz-admin-root';
    document.body.appendChild(root);
  }
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

  document.getElementById('tuz-admin-root').appendChild(overlay);
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

// ─── 로그인 / 로그아웃 FAB ──────────────────
function renderFab() {
  const existing = document.getElementById('tuz-admin-fab');
  if (existing) existing.remove();

  const fab = document.createElement('button');
  fab.id = 'tuz-admin-fab';
  fab.type = 'button';

  if (currentUser) {
    fab.className = 'is-logged-in';
    fab.setAttribute('aria-label', '로그아웃');
    fab.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
      <span>로그아웃</span>
    `;
    fab.addEventListener('click', async () => {
      if (!confirm('로그아웃 하시겠어요?')) return;
      await supabase.auth.signOut();
      toast('로그아웃되었습니다');
    });
  } else {
    fab.setAttribute('aria-label', '관리자 로그인');
    fab.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/></svg>
    `;
    fab.addEventListener('click', openLogin);
  }
  document.body.appendChild(fab);
}

// ─── 페이지별 관리 버튼 ─────────────────────
function renderPageActions() {
  document.querySelectorAll('[data-admin-actions]').forEach((el) => el.remove());
  if (!currentUser) return;

  Object.entries(SCHEMAS).forEach(([key, schema]) => {
    schema.views.forEach((viewName) => {
      const view = document.querySelector(`[data-view="${viewName}"]`);
      if (!view) return;
      const head = view.querySelector('.page-head');
      if (!head) return;

      const bar = document.createElement('div');
      bar.className = 'tuz-admin-bar';
      bar.setAttribute('data-admin-actions', key);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tuz-admin-action';
      if (schema.mode === 'single') {
        btn.classList.add('is-edit');
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          ${esc(schema.noun)} 수정
        `;
      } else {
        btn.classList.add('is-add');
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          ${esc(schema.noun)} 추가
        `;
      }
      btn.addEventListener('click', () => openEditor(key, { addNew: schema.mode === 'list' }));
      bar.appendChild(btn);

      head.insertAdjacentElement('afterend', bar);
    });
  });
}

// ─── 입력 필드 빌더 (공용) ──────────────────
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

// ─── 사진 업로드 (공용) ──────────────────────
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

  openModal({
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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.parentElement.parentElement.querySelector('.tuz-sheet__foot .is-primary').click();
  });
}

// ─── 에디터 ─────────────────────────────────
async function openEditor(key, { addNew = false } = {}) {
  const schema = SCHEMAS[key];
  if (!schema) return;
  const tableName = schema.table || key;

  // fetch current rows
  let rows = [];
  if (schema.mode === 'single') {
    const { data, error } = await supabase.from(tableName).select('*').maybeSingle();
    if (error) { toast(`불러오기 실패: ${error.message}`, { error: true }); return; }
    rows = [data ? { ...data } : (tableName === 'settings' ? { id: 1 } : { id: 1 })];
  } else {
    const { data, error } = await supabase.from(tableName).select('*').order('sort_order', { ascending: true });
    if (error) { toast(`불러오기 실패: ${error.message}`, { error: true }); return; }
    rows = (data || []).map((r) => ({ ...r }));
    if (addNew) rows.push({});
  }

  const removedIds = [];

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
        if (!confirm('이 항목을 삭제할까요?')) return;
        if (row.id) removedIds.push(row.id);
        rows.splice(idx, 1);
        rebuild();
      });
    }

    schema.fields.forEach((f) => card.appendChild(buildField(f, row)));
    return card;
  }

  // bottom add button for list mode — natural label
  if (schema.mode === 'list') {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'tuz-btn2 is-ghost tuz-editor__add';
    addBtn.textContent = `＋ ${schema.noun} 하나 더 추가`;
    addBtn.addEventListener('click', () => {
      rows.push({});
      rebuild();
      // 새 카드로 스크롤
      const last = listEl.lastElementChild;
      if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    body.appendChild(addBtn);
  }

  rebuild();

  openModal({
    title: schema.mode === 'list' ? `${schema.label} 관리` : `${schema.label} 수정`,
    body,
    actions: [
      { label: '취소', onClick: ({ close }) => close() },
      {
        label: '저장', primary: true,
        onClick: async ({ close }) => {
          try {
            await saveRows(tableName, schema, rows, removedIds);
            toast('저장되었습니다');
            await refreshTable(tableName);
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
async function saveRows(tableName, schema, rows, removedIds) {
  if (schema.mode === 'single') {
    const r = rows[0] || {};
    const payload = { id: 1 };
    schema.fields.forEach((f) => { payload[f.col] = r[f.col] ?? null; });
    const req = schema.fields.find((f) => f.required);
    if (req && !payload[req.col]) throw new Error(`${req.label}은(는) 필수입니다`);
    const { error } = await supabase.from(tableName).upsert(payload);
    if (error) throw error;
    return;
  }

  if (removedIds.length) {
    const { error } = await supabase.from(tableName).delete().in('id', removedIds);
    if (error) throw error;
  }

  const payload = rows.map((r, i) => {
    const out = { sort_order: i };
    schema.fields.forEach((f) => { out[f.col] = r[f.col] ?? null; });
    if (r.id) out.id = r.id;
    const req = schema.fields.find((f) => f.required);
    if (req && !out[req.col]) return null; // skip empty draft rows
    return out;
  }).filter(Boolean);

  if (!payload.length) return;
  const { error } = await supabase.from(tableName).upsert(payload);
  if (error) throw error;
}

// ─── 항목별 수정/삭제 오버레이 ──────────────
const VIEW_TO_TABLE = { news: 'news', pick: 'pick', event: 'winners', menu: 'menu' };

function findSchemaByTable(tableName) {
  return Object.values(SCHEMAS).find((s, i, arr) => {
    const key = Object.keys(SCHEMAS)[i];
    return (s.table || key) === tableName;
  });
}

function renderItemActions() {
  document.querySelectorAll('.tuz-item-actions').forEach((el) => el.remove());
  if (!currentUser) return;

  document.querySelectorAll('[data-item-id]').forEach((item) => {
    const view = item.closest('[data-view]');
    const tableName = VIEW_TO_TABLE[view?.dataset.view];
    const id = item.dataset.itemId;
    if (!tableName || !id) return;

    if (getComputedStyle(item).position === 'static') {
      item.style.position = 'relative';
    }

    const actions = document.createElement('div');
    actions.className = 'tuz-item-actions';
    actions.innerHTML = `
      <button type="button" class="tuz-item-btn" data-act="edit" aria-label="수정">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      </button>
      <button type="button" class="tuz-item-btn is-danger" data-act="del" aria-label="삭제">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
      </button>
    `;
    actions.querySelector('[data-act="edit"]').addEventListener('click', (e) => {
      e.stopPropagation();
      openItemEditor(tableName, id);
    });
    actions.querySelector('[data-act="del"]').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('이 항목을 삭제할까요? 되돌릴 수 없습니다.')) return;
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) { toast(`삭제 실패: ${error.message}`, { error: true }); return; }
      toast('삭제되었습니다');
      await refreshTable(tableName);
    });
    item.appendChild(actions);
  });
}

async function openItemEditor(tableName, itemId) {
  const schema = findSchemaByTable(tableName);
  if (!schema) return;

  const { data, error } = await supabase.from(tableName).select('*').eq('id', itemId).maybeSingle();
  if (error || !data) { toast(`불러오기 실패: ${error?.message || '항목 없음'}`, { error: true }); return; }

  const row = { ...data };

  const body = document.createElement('div');
  body.className = 'tuz-editor';
  const card = document.createElement('div');
  card.className = 'tuz-row-card';
  schema.fields.forEach((f) => card.appendChild(buildField(f, row)));
  body.appendChild(card);

  openModal({
    title: `${schema.label} · 수정`,
    body,
    actions: [
      { label: '취소', onClick: ({ close }) => close() },
      {
        label: '저장', primary: true,
        onClick: async ({ close }) => {
          try {
            const req = schema.fields.find((f) => f.required);
            if (req && !row[req.col]) throw new Error(`${req.label}은(는) 필수입니다`);
            const payload = { id: itemId };
            schema.fields.forEach((f) => { payload[f.col] = row[f.col] ?? null; });
            const { error: upErr } = await supabase.from(tableName).upsert(payload);
            if (upErr) throw upErr;
            toast('저장되었습니다');
            await refreshTable(tableName);
            close();
          } catch (e) {
            toast(`저장 실패: ${e.message || e}`, { error: true });
          }
        },
      },
    ],
  });
}

// ─── 세션 부팅 ──────────────────────────────
function applyAdminState() {
  document.body.classList.toggle('is-admin', !!currentUser);
  renderFab();
  renderPageActions();
  renderItemActions();
}

// 컨텐츠 컨테이너가 바뀔 때마다 (새 데이터 렌더링 등) 아이템 액션 재주입
let itemActionsPending = false;
function scheduleItemActions() {
  if (itemActionsPending) return;
  itemActionsPending = true;
  requestAnimationFrame(() => {
    itemActionsPending = false;
    renderItemActions();
  });
}

function observeContentMutations() {
  const targets = ['newsList', 'pickList', 'winnerList', 'menuCategories'];
  const observer = new MutationObserver(scheduleItemActions);
  targets.forEach((id) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el, { childList: true, subtree: false });
  });
}

async function init() {
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user || null;
  applyAdminState();
  observeContentMutations();

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    applyAdminState();
  });

  window.addEventListener('popstate', () => {
    requestAnimationFrame(() => { renderPageActions(); renderItemActions(); });
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-go], [data-back]')) {
      requestAnimationFrame(() => { renderPageActions(); renderItemActions(); });
    }
  }, true);
}

init();
