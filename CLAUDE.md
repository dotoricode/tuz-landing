# tuz-landing 프로젝트 지침

## 개요
울산 Tuz 카페의 정적 랜딩 페이지. 빌드 도구 없음 — HTML/CSS/JS를 그대로 서빙.
백엔드: Supabase(콘텐츠/인증/스토리지) + Kakao Maps SDK.

## 핵심 파일
- `index.html` — 단일 페이지, 해시 라우팅(`#wifi`, `#menu`, …)
- `app.js` — 공개 뷰 렌더링 + Supabase 클라이언트. 마지막 줄에서 `admin.js`를 동적 import.
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
`index.html`의 모든 로컬 자산은 `?v=NN` 쿼리로 버전 관리. **`app.js` / `styles.css` / `admin.css` / `admin.js` 수정 시 `index.html`(필요 시 `app.js` 내 admin import도)에서 `?v=` 숫자를 함께 올리지 않으면 모바일/사용자 브라우저가 옛 캐시를 사용한다.**

## 키 / 시크릿
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`(`app.js`), `KAKAO_APP_KEY`(`index.html`)는 **공개 클라이언트 키**라 커밋되어 있어도 정상. RLS와 도메인 제한으로 보호.
- service-role 키, Storage admin 키 등은 절대 클라이언트/저장소에 두지 말 것.
- 운영 중 Kakao 키 회전은 `settings.kakao_app_key` 컬럼으로 DB 오버라이드 가능(코드 변경 없음).

## 배포 워크플로우

**배포 전 반드시 로컬 테스트를 완료해야 합니다.**

### 로컬 테스트 체크리스트
1. 정적 서버로 띄우고 `http://localhost:8000` 열기 (위 "로컬 실행" 참고)
2. Pick 생성 기능 동작 확인 (큰사장/작은사장 섹션)
3. 관리자 페이지(`admin.js`) 기능 확인
4. 모바일 뷰(반응형) 확인
5. 자산을 수정했다면 `?v=` 버전 번호를 올렸는지 확인

### 테스트 완료 후 배포
```bash
git add .
git commit -m "..."
git push origin main
```

> 훅 설정: `git push` 등 배포 명령 실행 시 자동으로 차단되며, 테스트 완료 확인 후 진행합니다.

## Agent skills

### Issue tracker

GitHub Issues at `github.com/dotoricode/tuz-landing`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` at repo root + `docs/adr/`. See `docs/agents/domain.md`.
