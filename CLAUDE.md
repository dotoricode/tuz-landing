# tuz-landing 프로젝트 지침

## 개요
울산 Tuz 카페의 정적 랜딩 페이지. 빌드 도구 없음 — HTML/CSS/JS를 그대로 서빙.
백엔드: Supabase(콘텐츠/인증/스토리지) + Kakao Maps SDK.

## 핵심 파일
- `index.html` — 단일 페이지, 해시 라우팅(`#wifi`, `#menu`, …)
- `app.js` — 라우팅 + `LOADERS`/`RENDERERS` + Supabase 로더. 렌더링은 slice가 담당. 마지막 줄에서 `admin.js`를 동적 import.
- `slices/<domain>/{public,admin}.js` — 도메인별 vertical slice (8개: greeting / winners / wifi / hours / location / menu / news / pick).
- `shared/{supabase,dom,empty,tiles}.js` — slice 공통 모듈.
- `admin.js` — 관리자 오버레이(FAB, 모달, CRUD). 비로그인 사용자에겐 UI만 숨김.
- `styles.css` / `admin.css` — 디자인 토큰은 `styles.css` 상단 `:root`.
- `schema.sql` — Supabase 스키마 + RLS + 트리거의 **source of truth**. 변경은 Supabase Dashboard → SQL Editor에 붙여넣어 적용.
- `trend/index.html` — 관리자 전용 트렌드 리포트(noindex). 일반 메뉴에서 직접 링크하지 않음.

## 로컬 실행 (정적 서버 필수)
`<script type="module">` 사용으로 `file://`에서 직접 열면 CORS로 실패. 항상 정적 서버로 띄울 것.
```bash
python3 -m http.server 8000   # 그 외 `npx serve .` 등 어느 정적 서버든 OK
# → http://localhost:8000
```

## 캐시 버스팅 규약
`index.html`의 모든 로컬 자산은 `?v=NN` 쿼리로 버전 관리. **자산 수정 시 `?v=` 숫자를 올리지 않으면 모바일/사용자 브라우저가 옛 캐시를 사용한다.** slice 분리 후엔 모든 import 에 `?v=` 가 박혀있어 일괄 갱신:
```bash
find . -type f \( -name "*.js" -o -name "*.html" \) -not -path "./.serena/*" -not -path "./.git/*" -not -path "./.playwright-mcp/*" -not -path "./supabase/*" -not -path "./trend/*" -exec sed -i '' 's/?v=NN/?v=NN+1/g' {} +
```

## 키 / 시크릿
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`(`app.js`), `KAKAO_APP_KEY`(`index.html`)는 **공개 클라이언트 키**라 커밋되어 있어도 정상. RLS와 도메인 제한으로 보호.
- service-role 키, Storage admin 키 등은 절대 클라이언트/저장소에 두지 말 것.
- 운영 중 Kakao 키 회전은 `settings.kakao_app_key` 컬럼으로 DB 오버라이드 가능(코드 변경 없음).

## 배포 워크플로우

**배포 전 반드시 로컬 테스트를 완료해야 합니다.**

### 로컬 테스트 체크리스트
1. 정적 서버로 띄우고 `http://localhost:8000` 열기 (위 "로컬 실행" 참고)
2. **자동 회귀**: 아래 "자동 회귀 검증 (playwright MCP)" 패턴으로 9개 view 순회 + 콘솔 에러 확인 (Claude 가 실행 가능)
3. **수동 회귀** (인증 필요): 관리자 로그인 → Pick 생성 / 메뉴 추가 / WiFi 수정 등 CRUD 한 사이클 — playwright 로 자동화 어려운 영역
4. 모바일 뷰(반응형) 확인
5. 자산을 수정했다면 `?v=` 버전 번호를 올렸는지 확인

### 테스트 완료 후 배포
```bash
git add .
git commit -m "..."
git push origin main
```

> 훅 설정: `git push` 등 배포 명령 실행 시 자동으로 차단되며, 테스트 완료 확인 후 진행합니다.

## 개발 팁 & 함정

### 문법 검사
슬라이스 / admin: `node --check <file>`. `app.js` 는 top-level ESM 의존이 깊어서 `node --input-type=module --check < app.js` 사용.

### Vertical Slice 추가 패턴
`slices/<name>/public.js` 는 다음을 export: `XXX_LABEL`, `XXX_LOADER_SPEC = {view, table, options}` (또는 fetch 없는 경우 `XXX_LOADER = {view, table:null, fn}`), `renderXxx`, 선택 `initXxx` (DOM 핸들러). admin schema 는 `slices/<name>/admin.js`. app.js 의 `LOADERS` / `RENDERERS` / `titleOf` 에 등록.

list-mode 슬라이스의 admin schema 추가 키 (ADR-0006):
- `table`: 명시 (없으면 SCHEMAS 키 사용)
- `itemContainer`: 카드 컨테이너 selector(s) — `[data-item-id]` 자식을 가진 요소. admin.js dispatcher 가 자동 observe.
- `itemActions`: 카드 위 추가 버튼 배열 `{key, label, icon, variant?, state?(itemEl), handler(itemEl, ctx)}`. default edit/delete 는 admin 이 자동 주입. ctx = `{tableName, supabase, refreshTable, toast, openItemEditor}`.
- `reorder.groupField` + `reorder.getGroupKey(groupEl)`: cross-group 드래그 허용. 드롭 위치의 groupSelector 요소에서 key를 추출해 DB 컬럼으로 저장. sort_order는 container 전체 글로벌 재할당. 예: `{ col:'sort_order', groupSelector:'.card', groupField:'category', getGroupKey:(el)=>el.querySelector('.eyebrow')?.textContent?.trim() }`

### settings 데이터는 shared/settings.js 가 own (ADR-0005)
`settings` 단일 행은 `shared/settings.js` 가 fetch · 캐시 · 변경 알림을 전담. wifi/hours/menu 슬라이스는 자기 `init` 함수에서 `subscribeSettings(renderXxx)` 한 줄로 자기 facet 구독. 새 settings-파생 facet 추가 시 슬라이스에서 `subscribeSettings` 호출만 하면 됨 — `app.js` 손대지 않음. admin 저장 후 `refreshTable('settings')` 는 자동으로 `refreshSettings()` 로 우회됨.

### 자동 회귀 검증 (playwright MCP)
프론트 변경 후 `browser_navigate` → `browser_evaluate` (모든 view 를 hashchange 로 순회하며 핵심 DOM 확인) → `browser_console_messages` (level: warning) 로 자동 회귀 확인. 정적 서버는 보통 사용자가 이미 띄워둠 (`lsof -i:8000` 으로 확인).

### menu 테이블 사진 컬럼
`photo` — 어드민이 쓰는 컬럼. `hero_photo`는 초기 스키마 잔재로 비어 있음. FK join 시 `photo` 선택.

### admin 모달 구조
모달 컨테이너: `.tuz-sheet`. 행 카드: `.tuz-row-card`, `card._row`로 DOM→데이터 동기화.
pick_big / pick_small은 `mode: 'single'` + `filter`로 동작 — 저장 시 filter가 payload에 자동 병합됨.

### 커밋 제외 파일
`.serena/`, `session-report-*.html`, `supabase/` — 커밋하지 말 것.

### 드래그 앤 드롭 구현 주의
`setPointerCapture` + `target.before/after(el)` 조합은 금지. DOM 재배치 시 capture 타깃이 일시 분리돼 `lostpointercapture` 발생 → 드래그 끊김. `window.addEventListener('pointermove', onMove, {passive:false})` + `window.addEventListener('pointerup', onUp)` 패턴을 쓸 것.

### schema.sql 마이그레이션
schema.sql에 추가 후 Supabase SQL Editor에 직접 붙여넣어야 적용됨. 자동 실행 없음.
새 컬럼 추가 시 기존 NOT NULL 제약과 충돌 여부 반드시 확인.

## Agent skills

### Issue tracker

GitHub Issues at `github.com/dotoricode/tuz-landing`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` at repo root + `docs/adr/`. See `docs/agents/domain.md`.
