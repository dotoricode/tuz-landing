import { supabase, refreshTable } from './app.js?v=52';
import { GREETING_SCHEMA } from './slices/greeting/admin.js?v=52';
import { WINNERS_SCHEMA } from './slices/winners/admin.js?v=52';
import { WIFI_SCHEMA } from './slices/wifi/admin.js?v=52';
import { HOURS_SCHEMA } from './slices/hours/admin.js?v=52';
import { MENU_SCHEMA, MENU_HERO_SCHEMA } from './slices/menu/admin.js?v=52';
import { NEWS_SCHEMA, enforceNewsPinnedExclusive } from './slices/news/admin.js?v=52';
import { PICK_BIG_SCHEMA, PICK_SMALL_SCHEMA } from './slices/pick/admin.js?v=52';

// ─── 날짜 헬퍼 ──────────────────────────────
function autoToday() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// ─── 메뉴 옵션 캐시 (menu-select 필드용) ───────
let _menuOptions = null;
async function loadMenuOptions() {
  if (_menuOptions) return _menuOptions;
  const { data } = await supabase.from('menu').select('id, name, price').order('sort_order', { ascending: true });
  _menuOptions = data || [];
  return _menuOptions;
}

// ─── 테이블 스키마 ──────────────────────────
// noun: UI에서 부를 자연스러운 이름 (예: "공지" → "+ 공지 추가")
const SCHEMAS = {
  news: NEWS_SCHEMA,
  pick_big: PICK_BIG_SCHEMA,
  pick_small: PICK_SMALL_SCHEMA,
  winners: WINNERS_SCHEMA,
  greeting: GREETING_SCHEMA,
  menu: MENU_SCHEMA,
  settings_menu_hero: MENU_HERO_SCHEMA,
  settings_hours: HOURS_SCHEMA,
  settings_wifi: WIFI_SCHEMA,
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

  function close() {
    overlay.remove();
    if (onClose) onClose();
  }

  actions.forEach((a) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tuz-btn2 ${a.primary ? 'is-primary' : 'is-ghost'}`;
    btn.textContent = a.label;
    btn.addEventListener('click', () => a.onClick && a.onClick({ close, overlay }));
    footEl.appendChild(btn);
  });

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
    let logoutPending = false;
    let logoutTimer = null;
    fab.addEventListener('click', async () => {
      if (!logoutPending) {
        logoutPending = true;
        fab.querySelector('span').textContent = '한 번 더 탭';
        logoutTimer = setTimeout(() => {
          logoutPending = false;
          fab.querySelector('span').textContent = '로그아웃';
        }, 3000);
        return;
      }
      clearTimeout(logoutTimer);
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

      if (schema.mode === 'single') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tuz-admin-action is-edit';
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          ${esc(schema.noun)} 수정
        `;
        btn.addEventListener('click', () => openEditor(key));
        bar.appendChild(btn);
      } else {
        // list mode — 추가와 편집 분리
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'tuz-admin-action is-add';
        addBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          ${esc(schema.noun)} 추가
        `;
        addBtn.addEventListener('click', () => openEditor(key, { addOnly: true }));
        bar.appendChild(addBtn);

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'tuz-admin-action is-edit';
        editBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          목록 편집
        `;
        editBtn.addEventListener('click', () => openEditor(key, { manage: true }));
        bar.appendChild(editBtn);
      }

      head.insertAdjacentElement('afterend', bar);
    });
  });
}

// ─── 입력 필드 빌더 (공용) ──────────────────
function buildField(f, row, { menuOptions = null } = {}) {
  if (f.autoDate) return document.createDocumentFragment();

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
    if (f.hint) {
      const hint = document.createElement('span');
      hint.className = 'tuz-field__hint';
      hint.textContent = f.hint;
      wrap.appendChild(hint);
    }
    return wrap;
  }

  if (f.type === 'checkbox') {
    const checkRow = document.createElement('div');
    checkRow.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `field-${f.col}`;
    input.checked = !!row[f.col];
    if (f.col === 'is_pinned') input.dataset.exclusivePin = '1';
    input.addEventListener('change', () => {
      row[f.col] = input.checked;
      if (f.col === 'is_pinned' && input.checked) {
        const sheet = input.closest('.tuz-sheet');
        if (sheet) {
          sheet.querySelectorAll('input[data-exclusive-pin]').forEach((other) => {
            if (other === input) return;
            other.checked = false;
            const card = other.closest('.tuz-row-card');
            if (card?._row) card._row.is_pinned = false;
          });
        }
      }
    });
    checkRow.appendChild(input);
    wrap.appendChild(checkRow);
    return wrap;
  }

  if (f.type === 'menu-select') {
    const sel = document.createElement('select');
    sel.innerHTML = '<option value="">메뉴를 선택하세요</option>';
    (menuOptions || []).forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      const priceStr = m.price
        ? ` (₩${Number(String(m.price).replace(/[^0-9]/g, '')).toLocaleString('ko-KR')})`
        : '';
      opt.textContent = m.name + priceStr;
      if (m.id === row[f.col]) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => { row[f.col] = sel.value || null; });
    wrap.appendChild(sel);
    return wrap;
  }

  if (f.type === 'tags') {
    // 뱃지 다중 선택 — CSV 로 저장
    const current = new Set(
      String(row[f.col] || '').split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.toUpperCase())
    );
    const group = document.createElement('div');
    group.className = 'tuz-tags';
    const autoSet = new Set((f.autoTags || []).map((s) => s.toUpperCase()));
    (f.options || []).forEach((optRaw) => {
      const opt = String(optRaw).toUpperCase();
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tuz-tag';
      const isAuto = autoSet.has(opt);
      if (isAuto) btn.classList.add('is-auto');
      btn.dataset.tag = opt;
      const label = (f.labels && f.labels[opt]) || opt;
      btn.textContent = isAuto ? `${label} (자동)` : label;
      if (current.has(opt) || isAuto) btn.classList.add('is-on');
      btn.disabled = isAuto;
      btn.addEventListener('click', () => {
        if (isAuto) return;
        if (btn.classList.toggle('is-on')) current.add(opt);
        else current.delete(opt);
        const manual = [...current].filter((t) => !autoSet.has(t));
        row[f.col] = manual.length ? manual.join(',') : null;
      });
      group.appendChild(btn);
    });
    wrap.appendChild(group);
    if (f.hint) {
      const hint = document.createElement('span');
      hint.className = 'tuz-field__hint';
      hint.textContent = f.hint;
      wrap.appendChild(hint);
    }
    return wrap;
  }

  let input;
  if (f.type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = f.rows || 3;
  } else if (f.type === 'select') {
    input = document.createElement('select');
    const options = (f.options || []).slice();
    const current = row[f.col];
    if (current != null && current !== '' && !options.includes(current)) {
      options.push(current); // 기존 값 보존
    }
    options.forEach((o) => {
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
  if (f.hint) {
    const hint = document.createElement('span');
    hint.className = 'tuz-field__hint';
    hint.textContent = f.hint;
    wrap.appendChild(hint);
  }
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
async function openEditor(key, { addOnly = false, manage = false } = {}) {
  const schema = SCHEMAS[key];
  if (!schema) return;
  const tableName = schema.table || key;
  const menuOptions = schema.fields.some((f) => f.type === 'menu-select')
    ? await loadMenuOptions()
    : null;

  // fetch current rows
  let rows = [];
  let existingRows = []; // manage 모드에서 사용 (순서 비교)
  if (schema.mode === 'single') {
    let q = supabase.from(tableName).select('*');
    if (schema.filter) {
      Object.entries(schema.filter).forEach(([k, v]) => { q = q.eq(k, v); });
    }
    const { data, error } = await q.maybeSingle();
    if (error) { toast(`불러오기 실패: ${error.message}`, { error: true }); return; }
    const base = schema.filter ? { ...schema.filter } : (tableName === 'settings' ? { id: 1 } : {});
    rows = [data ? { ...data } : base];
  } else {
    if (addOnly) {
      // 추가 전용 — 빈 행 하나만
      rows = [{}];
    } else {
      const { data, error } = await supabase.from(tableName).select('*').order('sort_order', { ascending: true });
      if (error) { toast(`불러오기 실패: ${error.message}`, { error: true }); return; }
      existingRows = (data || []).map((r) => ({ ...r }));
      rows = existingRows.map((r) => ({ ...r }));
    }
  }

  const removedIds = [];
  const isListAdd = schema.mode === 'list' && addOnly;
  const isListManage = schema.mode === 'list' && manage;

  const body = document.createElement('div');
  body.className = 'tuz-editor';

  // 그룹 탭 (편집 모드에서 schema.groupBy 가 있을 때)
  const useGroups = isListManage && !!schema.groupBy;
  let activeTab = null;
  let groupOptions = [];
  if (useGroups) {
    const groupField = schema.fields.find((f) => f.col === schema.groupBy);
    const seen = new Set();
    groupOptions = (groupField?.options || []).slice();
    groupOptions.forEach((o) => seen.add(o));
    // 스키마에 없는 카테고리도 포함 (legacy 데이터 보존)
    rows.forEach((r) => {
      const v = r[schema.groupBy];
      if (v && !seen.has(v)) { groupOptions.push(v); seen.add(v); }
    });
    activeTab = groupOptions[0] || null;
  }

  const tabsEl = document.createElement('div');
  tabsEl.className = 'tuz-tabs';
  if (useGroups) body.appendChild(tabsEl);

  const listEl = document.createElement('div');
  listEl.className = 'tuz-editor__list';
  if (isListManage) listEl.classList.add('is-manage');
  body.appendChild(listEl);

  function renderTabs() {
    if (!useGroups) return;
    tabsEl.innerHTML = '';
    groupOptions.forEach((cat) => {
      const count = rows.filter((r) => r[schema.groupBy] === cat).length;
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'tuz-tab';
      if (cat === activeTab) tab.classList.add('is-active');
      tab.innerHTML = `<span>${esc(cat)}</span><span class="tuz-tab__count">${count}</span>`;
      tab.addEventListener('click', () => {
        if (activeTab === cat) return;
        activeTab = cat;
        renderTabs();
        rebuild();
      });
      tabsEl.appendChild(tab);
    });
  }

  // 컨테이너 레벨 dragover — FLIP 애니메이션으로 부드럽게 재배치
  if (isListManage) {
    listEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const dragging = listEl.querySelector('.is-dragging');
      if (!dragging) return;
      const afterCard = getCardAfter(listEl, e.clientY);
      if (afterCard === dragging) return;
      if (afterCard && afterCard === dragging.nextSibling) return;

      // FLIP: 이동 전 위치 기록
      const cards = [...listEl.querySelectorAll('.tuz-row-card:not(.is-dragging)')];
      const firstRects = new Map();
      cards.forEach((c) => firstRects.set(c, c.getBoundingClientRect()));

      if (afterCard == null) listEl.appendChild(dragging);
      else listEl.insertBefore(dragging, afterCard);

      // FLIP: 새 위치에서 역방향 transform 적용 후 해제 → 애니메이션
      cards.forEach((c) => {
        const first = firstRects.get(c);
        const last = c.getBoundingClientRect();
        const dy = first.top - last.top;
        if (Math.abs(dy) < 0.5) return;
        c.style.transition = 'none';
        c.style.transform = `translateY(${dy}px)`;
        void c.offsetHeight; // force reflow
        c.style.transition = 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)';
        c.style.transform = '';
      });
    });
    listEl.addEventListener('drop', (e) => e.preventDefault());
  }

  function getCardAfter(container, y) {
    const cards = [...container.querySelectorAll('.tuz-row-card:not(.is-dragging)')];
    for (const c of cards) {
      const box = c.getBoundingClientRect();
      // 카드 상단 30% 또는 최대 36px 이내 → BEFORE 삽입
      // (펼쳐진 카드에서도 조금만 올려도 스왑되도록 캡 설정)
      const threshold = box.top + Math.min(box.height * 0.3, 36);
      if (y < threshold) return c;
    }
    return null;
  }

  function rebuild() {
    listEl.innerHTML = '';
    if (useGroups) {
      let visibleIdx = 0;
      rows.forEach((row) => {
        if (row[schema.groupBy] !== activeTab) return;
        listEl.appendChild(buildRowCard(row, visibleIdx));
        visibleIdx++;
      });
      if (visibleIdx === 0) {
        const empty = document.createElement('div');
        empty.className = 'tuz-editor__empty';
        empty.textContent = `이 카테고리에 등록된 ${schema.noun}이(가) 없습니다.`;
        listEl.appendChild(empty);
      }
      renderTabs();
    } else {
      rows.forEach((row, idx) => listEl.appendChild(buildRowCard(row, idx)));
    }
  }

  function buildRowCard(row, idx) {
    const card = document.createElement('div');
    card.className = 'tuz-row-card';
    card._row = row; // DOM → rows 동기화용

    if (isListManage) {
      // 편집 모드 — 드래그 핸들 + 삭제 + 인라인 필드 (축약)
      card.setAttribute('draggable', 'true');
      card.classList.add('is-draggable');
      const head = document.createElement('div');
      head.className = 'tuz-row-card__head';
      const displayLabel = summarizeRow(schema, row);
      head.innerHTML = `
        <span class="tuz-drag-handle" aria-hidden="true">⋮⋮</span>
        <span class="tuz-row-card__num">${idx + 1}</span>
        <span class="tuz-row-card__summary">${esc(displayLabel)}</span>
        <div class="tuz-row-card__actions">
          <button type="button" class="tuz-icon-btn" data-act="edit" aria-label="수정">✎</button>
          <button type="button" class="tuz-icon-btn is-danger" data-act="del" aria-label="삭제">✕</button>
        </div>
      `;
      card.appendChild(head);

      const fieldsWrap = document.createElement('div');
      fieldsWrap.className = 'tuz-row-card__fields';
      fieldsWrap.hidden = true;
      schema.fields.forEach((f) => fieldsWrap.appendChild(buildField(f, row, { menuOptions })));
      card.appendChild(fieldsWrap);

      head.querySelector('[data-act="edit"]').addEventListener('click', () => {
        fieldsWrap.hidden = !fieldsWrap.hidden;
      });
      head.querySelector('[data-act="del"]').addEventListener('click', () => {
        if (!confirm('이 항목을 삭제할까요?')) return;
        if (row.id) removedIds.push(row.id);
        const i = rows.indexOf(row);
        if (i >= 0) rows.splice(i, 1);
        rebuild();
      });

      // Drag 시작/종료 (재배치는 컨테이너 dragover 가 처리)
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', ''); } catch (_) { /* Safari */ }
        // 드래그 고스트 이미지가 먼저 캡처되도록 한 프레임 뒤에 클래스 부여
        requestAnimationFrame(() => card.classList.add('is-dragging'));
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        // 잔여 transform / transition 정리
        listEl.querySelectorAll('.tuz-row-card').forEach((c) => {
          c.style.transition = '';
          c.style.transform = '';
        });
        // 현재 DOM 순서 → rows 반영
        const newVisible = [...listEl.querySelectorAll('.tuz-row-card')]
          .map((c) => c._row)
          .filter(Boolean);
        if (useGroups) {
          // 활성 카테고리만 재배치, 나머지 행은 제자리 유지
          let vi = 0;
          const merged = rows.map((r) =>
            r[schema.groupBy] === activeTab ? newVisible[vi++] || r : r
          );
          rows.length = 0;
          rows.push(...merged);
        } else if (newVisible.length === rows.length) {
          rows.length = 0;
          rows.push(...newVisible);
        }
        rebuild();
      });
    } else if (schema.mode === 'list') {
      // 추가 모드 — 순수 입력 폼, 순서 조정 없음
      schema.fields.forEach((f) => card.appendChild(buildField(f, row, { menuOptions })));
      return card;
    } else {
      // single 모드
      schema.fields.forEach((f) => card.appendChild(buildField(f, row, { menuOptions })));
    }
    return card;
  }

  // 추가 모드 — "하나 더 추가" 버튼 (연속 등록)
  if (isListAdd) {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'tuz-btn2 is-ghost tuz-editor__add';
    addBtn.textContent = `＋ ${schema.noun} 하나 더 추가`;
    addBtn.addEventListener('click', () => {
      rows.push({});
      rebuild();
      const last = listEl.lastElementChild;
      if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    body.appendChild(addBtn);
  }

  rebuild();

  const title = isListManage
    ? `${schema.label} · 목록 편집`
    : isListAdd
      ? `${schema.label} · 추가`
      : `${schema.label} 수정`;

  openModal({
    title,
    body,
    actions: [
      { label: '취소', onClick: ({ close }) => close() },
      {
        label: '저장', primary: true,
        onClick: async (ctx) => {
          const btn = ctx.overlay.querySelector('.tuz-sheet__foot .is-primary');
          if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; btn.setAttribute('aria-busy', 'true'); }
          try {
            if (isListAdd) {
              await appendRows(tableName, schema, rows);
            } else {
              await saveRows(tableName, schema, rows, removedIds);
            }
            toast('저장되었습니다');
            await refreshTable(tableName);
            ctx.close();
          } catch (e) {
            toast(`저장 실패: ${e.message || e}`, { error: true });
            if (btn) { btn.disabled = false; btn.textContent = '저장'; btn.removeAttribute('aria-busy'); }
          }
        },
      },
    ],
  });
}

function summarizeRow(schema, row) {
  const nameField = schema.fields.find((f) => f.col === 'name' || f.col === 'title' || f.col === 'nick');
  const catField = schema.fields.find((f) => f.col === 'category');
  const pieces = [];
  if (catField && row[catField.col]) pieces.push(row[catField.col]);
  if (nameField && row[nameField.col]) pieces.push(row[nameField.col]);
  return pieces.join(' · ') || '(비어있는 항목)';
}

async function appendRows(tableName, schema, rows) {
  // 기존 마지막 sort_order 계산
  const { data: last } = await supabase
    .from(tableName)
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  const startOrder = ((last && last[0]?.sort_order) || 0) + 1;

  const payload = rows.map((r, i) => {
    const out = { sort_order: startOrder + i };
    schema.fields.forEach((f) => {
      if (f.autoDate) { out[f.col] = r[f.col] ?? autoToday(); return; }
      out[f.col] = r[f.col] ?? null;
    });
    const firstReq = schema.fields.find((f) => f.required);
    if (firstReq && !out[firstReq.col]) return null;
    for (const f of schema.fields) {
      if (f.required && !out[f.col]) throw new Error(`${f.label}을(를) 입력해주세요`);
    }
    return out;
  }).filter(Boolean);

  if (!payload.length) throw new Error('추가할 항목이 없습니다. 필수 항목을 입력해주세요.');
  const { error } = await supabase.from(tableName).insert(payload);
  if (error) throw error;
}

// ─── 저장 로직 ──────────────────────────────
// (enforceNewsPinnedExclusive 는 ADR-0006 에 따라 slices/news/admin.js 로 이전.
// 이 모듈은 import 해서 News 도메인 invariant 를 호출한다.)

// ─── ADR-0002: 영업시간 변경 후 SCHEDULE 공지 생성 모달 ─
async function promptScheduleNews(newValues, oldValues) {
  const hoursChanged = (
    newValues.hours_weekday !== oldValues.hours_weekday ||
    newValues.hours_weekend !== oldValues.hours_weekend ||
    newValues.holiday_notice !== oldValues.holiday_notice
  );
  if (!hoursChanged) return;

  const autoText = newValues.holiday_notice
    ? `임시 안내: ${newValues.holiday_notice}`
    : `영업시간 안내: 평일 ${newValues.hours_weekday || '-'} · 주말 ${newValues.hours_weekend || '-'}`;

  const body = document.createElement('div');
  body.className = 'tuz-editor';
  const ta = document.createElement('textarea');
  ta.rows = 3;
  ta.style.cssText = 'width:100%;margin-top:8px;padding:8px;border:1px solid var(--line);border-radius:var(--r-sm);font-size:14px;resize:vertical';
  ta.value = autoText;
  body.innerHTML = '<p style="font-size:14px;color:var(--ink-2);margin-bottom:4px">영업시간이 변경되었습니다. 공지사항에 함께 올리시겠습니까?</p>';
  body.appendChild(ta);

  openModal({
    title: '영업시간 변경 공지',
    body,
    actions: [
      { label: '건너뛰기', onClick: ({ close }) => close() },
      {
        label: '공지 올리기', primary: true,
        onClick: async ({ close }) => {
          const title = ta.value.trim();
          if (!title) { close(); return; }
          const today = autoToday();
          const { error } = await supabase.from('news').insert({
            tag: 'SCHEDULE', title, date: today, sort_order: 0,
          });
          if (error) { toast(`공지 생성 실패: ${error.message}`, { error: true }); return; }
          toast('공지가 등록되었습니다');
          await refreshTable('news');
          close();
        },
      },
    ],
  });
}

async function saveRows(tableName, schema, rows, removedIds) {
  if (schema.mode === 'single') {
    const r = rows[0] || {};
    const payload = r.id ? { id: r.id } : {};
    schema.fields.forEach((f) => {
      if (f.autoDate) { payload[f.col] = r[f.col] ?? autoToday(); return; }
      payload[f.col] = r[f.col] ?? null;
    });
    if (schema.filter) Object.assign(payload, schema.filter);
    for (const f of schema.fields) {
      if (f.required && !payload[f.col]) throw new Error(`${f.label}을(를) 입력해주세요`);
    }
    if (tableName === 'news') await enforceNewsPinnedExclusive(supabase, payload);

    // ADR-0002: 영업시간 변경 감지를 위해 저장 전 현재 값 스냅샷
    let oldSettings = null;
    const isHoursSchema = tableName === 'settings' && schema === SCHEMAS.settings_hours;
    if (isHoursSchema) {
      const { data } = await supabase.from('settings')
        .select('hours_weekday, hours_weekend, holiday_notice').eq('id', 1).maybeSingle();
      oldSettings = data;
    }

    const { error } = await supabase.from(tableName).upsert(payload);
    if (error) throw error;

    if (isHoursSchema && oldSettings) {
      promptScheduleNews(payload, oldSettings);
    }
    return;
  }

  if (removedIds.length) {
    const { error } = await supabase.from(tableName).delete().in('id', removedIds);
    if (error) throw error;
  }

  const payload = rows.map((r, i) => {
    const out = { sort_order: i };
    schema.fields.forEach((f) => {
      if (f.autoDate) { out[f.col] = r[f.col] ?? autoToday(); return; }
      out[f.col] = r[f.col] ?? null;
    });
    if (r.id) out.id = r.id;
    const firstReq = schema.fields.find((f) => f.required);
    if (firstReq && !out[firstReq.col]) return null;
    for (const f of schema.fields) {
      if (f.required && !out[f.col]) throw new Error(`${f.label}을(를) 입력해주세요`);
    }
    return out;
  }).filter(Boolean);

  if (!payload.length) return;
  if (tableName === 'news') await enforceNewsPinnedExclusive(supabase, payload);
  const { error } = await supabase.from(tableName).upsert(payload);
  if (error) throw error;
  if (tableName === 'menu') _menuOptions = null;
}

// ─── 항목별 수정/삭제 오버레이 (ADR-0006) ──────
// 슬라이스 schema 의 itemActions 와 default edit/delete 를 합쳐 카드에 주입.
// admin.js 는 dispatcher — 도메인 인지 없음.

const EDIT_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
const DELETE_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>';
const GRIP_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>';

const DEFAULT_ITEM_ACTIONS = [
  {
    key: 'edit', label: '수정', icon: EDIT_ICON,
    handler: (itemEl, ctx) => ctx.openItemEditor(ctx.tableName, itemEl.dataset.itemId),
  },
  {
    key: 'delete', label: '삭제', variant: 'danger', icon: DELETE_ICON,
    handler: async (itemEl, ctx) => {
      if (!confirm('이 항목을 삭제할까요? 되돌릴 수 없습니다.')) return;
      const { error } = await ctx.supabase.from(ctx.tableName).delete().eq('id', itemEl.dataset.itemId);
      if (error) { ctx.toast(`삭제 실패: ${error.message}`, { error: true }); return; }
      ctx.toast('삭제되었습니다');
      await ctx.refreshTable(ctx.tableName);
    },
  },
];

function viewToTable(view) {
  for (const [key, schema] of Object.entries(SCHEMAS)) {
    if (schema.views?.includes(view)) return schema.table || key;
  }
  return null;
}

function findSchemaByTable(tableName) {
  for (const [key, schema] of Object.entries(SCHEMAS)) {
    if ((schema.table || key) === tableName) return schema;
  }
  return null;
}

function getSliceActions(view) {
  const actions = [];
  for (const schema of Object.values(SCHEMAS)) {
    if (schema.views?.includes(view) && Array.isArray(schema.itemActions)) {
      actions.push(...schema.itemActions);
    }
  }
  return actions;
}

function findReorderForView(view) {
  for (const schema of Object.values(SCHEMAS)) {
    if (schema.views?.includes(view) && schema.reorder) return schema.reorder;
  }
  return null;
}

function renderItemActions() {
  document.querySelectorAll('.tuz-item-actions').forEach((el) => el.remove());
  if (!currentUser) return;

  const baseCtx = { supabase, refreshTable, toast, openItemEditor };

  document.querySelectorAll('[data-item-id]').forEach((item) => {
    const view = item.closest('[data-view]')?.dataset.view;
    if (!view) return;
    const tableName = viewToTable(view);
    const id = item.dataset.itemId;
    if (!tableName || !id) return;

    if (getComputedStyle(item).position === 'static') item.style.position = 'relative';

    const actions = [...getSliceActions(view), ...DEFAULT_ITEM_ACTIONS];
    const ctx = { ...baseCtx, tableName };

    const container = document.createElement('div');
    container.className = 'tuz-item-actions';

    // reorder capability — drag handle 을 첫 자리에 주입 (실 dnd 는 attachReorder 가 delegation)
    if (findReorderForView(view)) {
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'tuz-item-btn tuz-drag-handle';
      handle.setAttribute('aria-label', '순서 변경 (드래그)');
      handle.innerHTML = GRIP_ICON;
      container.appendChild(handle);
    }

    for (const a of actions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      let cls = 'tuz-item-btn';
      if (a.variant === 'danger') cls += ' is-danger';
      if (typeof a.state === 'function') {
        cls += a.state(item) === 'on' ? ' is-on' : ' is-off';
      }
      btn.className = cls;
      btn.setAttribute('aria-label', a.label || a.key);
      btn.innerHTML = a.icon;
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try { await a.handler(item, ctx); }
        catch (err) { toast(`작업 실패: ${err.message || err}`, { error: true }); }
      });
      container.appendChild(btn);
    }
    item.appendChild(container);
  });
}

// ─── ADR-0006 Phase B: reorder dispatcher ───────────
// schema.reorder 가 있는 itemContainer 마다 pointer 기반 dnd 부착.
// 컨테이너에 한 번만 delegation — 카드가 재렌더돼도 이벤트는 살아있음.
const reorderAttached = new WeakSet();

function initReorder() {
  if (!currentUser) return;
  for (const [key, schema] of Object.entries(SCHEMAS)) {
    if (!schema.reorder) continue;
    const containers = Array.isArray(schema.itemContainer)
      ? schema.itemContainer : [schema.itemContainer];
    const tableName = schema.table || key;
    for (const sel of containers) {
      const el = document.querySelector(sel);
      if (el) attachReorder(el, schema.reorder, tableName);
    }
  }
}

function attachReorder(container, spec, tableName) {
  if (reorderAttached.has(container)) return;
  reorderAttached.add(container);

  // getGroupKey 가 있으면 그룹 간 이동을 허용한다 (예: 메뉴 카테고리 변경).
  const allowCrossGroup = typeof spec.getGroupKey === 'function' && !!spec.groupField;

  container.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.tuz-drag-handle');
    if (!handle) return;
    const card = handle.closest('[data-item-id]');
    if (!card) return;
    const startGroup = spec.groupSelector ? card.closest(spec.groupSelector) : container;
    if (!startGroup) return;

    e.preventDefault();
    // setPointerCapture 미사용: target.before/after(card) 로 DOM 이 재배치될 때
    // capture 타깃이 일시 분리되면 lostpointercapture 가 발생해 드래그가 끊김.
    // 대신 window 레벨 리스너를 사용하면 DOM 이동과 무관하게 이벤트를 계속 받는다.

    const startX = e.clientX, startY = e.clientY;
    const rect = card.getBoundingClientRect();

    const ghost = card.cloneNode(true);
    ghost.querySelectorAll('.tuz-item-actions').forEach((el) => el.remove());
    ghost.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;pointer-events:none;z-index:9999;transform:none;transition:none;`;
    ghost.classList.add('tuz-dragging');
    document.body.appendChild(ghost);

    card.classList.add('tuz-dragging-source');
    let moved = false;

    function onMove(ev) {
      ev.preventDefault(); // 스크롤 방지
      ghost.style.transform = `translate(${ev.clientX - startX}px, ${ev.clientY - startY}px)`;

      const allRows = [...container.querySelectorAll('[data-item-id]')].filter((r) => r !== card);
      if (!allRows.length) return;

      const y = ev.clientY;

      if (spec.groupSelector) {
        // cursor 가 어느 .card 안에 있는지 판별 — gap 구간이면 현재 위치 유지.
        // 이렇게 하면 "마지막 항목을 같은 카테고리 끝에 두려다 인접 카테고리로 빠지는"
        // 문제가 사라진다.
        const groups = [...container.querySelectorAll(spec.groupSelector)];
        const hoveredGroup = groups.find((g) => {
          const gr = g.getBoundingClientRect();
          return y >= gr.top && y <= gr.bottom;
        });
        if (!hoveredGroup) return; // gap 구간 — 현재 위치 유지

        if (!allowCrossGroup && hoveredGroup !== startGroup) return;

        const groupRows = allRows.filter((r) => hoveredGroup.contains(r));
        if (groupRows.length === 0) {
          // 이 그룹엔 source 외 항목이 없음 → 그룹 끝에 append (빈 카테고리로 이동)
          if (card.parentElement !== hoveredGroup) {
            hoveredGroup.appendChild(card);
            moved = true;
          }
          return;
        }

        let targetRow = null;
        let insertBefore = false;
        for (const row of groupRows) {
          const rowRect = row.getBoundingClientRect();
          if (y < rowRect.top + rowRect.height / 2) { targetRow = row; insertBefore = true; break; }
        }
        if (!targetRow) { targetRow = groupRows[groupRows.length - 1]; insertBefore = false; }

        if (insertBefore && card.nextElementSibling === targetRow) return;
        if (!insertBefore && card.previousElementSibling === targetRow) return;
        if (insertBefore) targetRow.before(card); else targetRow.after(card);
        moved = true;
        return;
      }

      // groupSelector 없는 flat 리스트 — 전체 nearest-row
      let targetRow = null;
      let insertBefore = false;
      for (const row of allRows) {
        const rowRect = row.getBoundingClientRect();
        if (y < rowRect.top + rowRect.height / 2) { targetRow = row; insertBefore = true; break; }
      }
      if (!targetRow) { targetRow = allRows[allRows.length - 1]; insertBefore = false; }
      if (insertBefore && card.nextElementSibling === targetRow) return;
      if (!insertBefore && card.previousElementSibling === targetRow) return;
      if (insertBefore) targetRow.before(card); else targetRow.after(card);
      moved = true;
    }

    async function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      ghost.remove();
      card.classList.remove('tuz-dragging-source');

      if (!moved) return;

      try {
        if (allowCrossGroup) {
          // 모든 그룹의 아이템을 DOM 순서로 순회하며 sort_order 를 글로벌하게 재할당하고,
          // 현재 속한 그룹의 key 를 groupField 로 함께 저장한다.
          const allItems = [...container.querySelectorAll('[data-item-id]')];
          for (let i = 0; i < allItems.length; i++) {
            const el = allItems[i];
            const id = el.dataset.itemId;
            const groupEl = spec.groupSelector ? el.closest(spec.groupSelector) : container;
            const groupKey = groupEl ? spec.getGroupKey(groupEl) : null;
            const payload = { [spec.col]: i + 1 };
            if (groupKey != null) payload[spec.groupField] = groupKey;
            const { error } = await supabase.from(tableName).update(payload).eq('id', id);
            if (error) throw error;
          }
        } else {
          const finalGroup = spec.groupSelector ? card.closest(spec.groupSelector) : container;
          const cards = [...finalGroup.querySelectorAll(':scope [data-item-id]')];
          for (let i = 0; i < cards.length; i++) {
            const id = cards[i].dataset.itemId;
            const { error } = await supabase.from(tableName)
              .update({ [spec.col]: i + 1 }).eq('id', id);
            if (error) throw error;
          }
        }
        toast('순서가 저장되었습니다');
      } catch (err) {
        toast(`순서 저장 실패: ${err.message || err}`, { error: true });
      }
      await refreshTable(tableName);
    }

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });
}

async function openItemEditor(tableName, itemId) {
  const schema = findSchemaByTable(tableName);
  if (!schema) return;

  const [{ data, error }, menuOptions] = await Promise.all([
    supabase.from(tableName).select('*').eq('id', itemId).maybeSingle(),
    schema.fields.some((f) => f.type === 'menu-select') ? loadMenuOptions() : Promise.resolve(null),
  ]);
  if (error || !data) { toast(`불러오기 실패: ${error?.message || '항목 없음'}`, { error: true }); return; }

  const row = { ...data };

  const body = document.createElement('div');
  body.className = 'tuz-editor';
  const card = document.createElement('div');
  card.className = 'tuz-row-card';
  schema.fields.forEach((f) => card.appendChild(buildField(f, row, { menuOptions })));
  body.appendChild(card);

  openModal({
    title: `${schema.label} · 수정`,
    body,
    actions: [
      { label: '취소', onClick: ({ close }) => close() },
      {
        label: '저장', primary: true,
        onClick: async (ctx) => {
          const btn = ctx.overlay.querySelector('.tuz-sheet__foot .is-primary');
          if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; btn.setAttribute('aria-busy', 'true'); }
          try {
            for (const f of schema.fields) {
              if (f.required && !row[f.col]) throw new Error(`${f.label}을(를) 입력해주세요`);
            }
            const payload = { id: itemId };
            schema.fields.forEach((f) => {
              if (!f.autoDate) payload[f.col] = row[f.col] ?? null;
            });
            if (tableName === 'news') await enforceNewsPinnedExclusive(supabase, [payload]);
            const { error: upErr } = await supabase.from(tableName).upsert(payload);
            if (upErr) throw upErr;
            toast('저장되었습니다');
            await refreshTable(tableName);
            ctx.close();
          } catch (e) {
            toast(`저장 실패: ${e.message || e}`, { error: true });
            if (btn) { btn.disabled = false; btn.textContent = '저장'; btn.removeAttribute('aria-busy'); }
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
  initReorder();
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
  // 슬라이스 schema 의 itemContainer 를 모두 수집 (ADR-0006)
  const selectors = new Set();
  for (const schema of Object.values(SCHEMAS)) {
    const c = schema.itemContainer;
    if (Array.isArray(c)) c.forEach((s) => selectors.add(s));
    else if (c) selectors.add(c);
  }
  const observer = new MutationObserver(scheduleItemActions);
  selectors.forEach((sel) => {
    const el = document.querySelector(sel);
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
