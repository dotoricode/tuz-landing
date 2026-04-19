# Claude Code 작업 요청 프롬프트 — tuz.kr 스탬프 카드 + 카카오 로그인

> 아래 블록 전체를 Claude Code에 붙여넣으면 됩니다.
> 프로젝트 루트에서 `claude` 실행 후 프롬프트 입력.

---

```
너는 tuz.kr(울산 Tuz 카페) 웹사이트에 카카오 로그인 기반 스탬프 카드 기능을 추가하는 작업을 맡았다.
완전 무료 티어에서 운영 가능하도록 설계하고, 개인정보 처리방침과 Supabase 프로젝트 비활성화 방지까지 함께 세팅한다.

## 1. 전제 조건 (이미 준비된 것)
- **작업 루트**: `D:/00_work/tuz-landing` — 이미 작업 중인 실제 코드베이스.
  먼저 이 폴더를 `Read`·`Glob`·`Grep`으로 전수 탐색하고 구조·스택·컴포넌트 네이밍 규칙을 파악한 뒤 시작해.
- Supabase 프로젝트가 이미 생성·연동되어 있음 (`.env.local` 또는 기존 설정 파일에서 URL/anon key 먼저 확인)
- 카카오 디벨로퍼스 앱이 이미 존재하고 **카카오맵 API는 활성화된 상태** → 카카오 로그인만 추가 활성화하면 됨
- **활용할 기존 페이지/섹션** (이미 구현되어 있는 것 — 재구성 금지, 연결만 해):
  - 공지
  - 메뉴
  - 오늘의 추천
  - 오시는 길 (카카오맵 연동)
  - 인사말
  - WiFi
  - 영업시간
  기존 페이지의 디자인·토큰·라우팅 방식을 그대로 유지하면서, 스탬프 카드 섹션만 새로 추가한다.
- **디자인 참고용**: `D:/01_cowork/2026-04-19-tuz-kr-디자인-개선안.html` — 스탬프 타일·다크모드 토글 등 레이아웃 참고 자료로만 사용 (스타일 가이드는 기존 `tuz-landing`을 따를 것)

## 2. 사용자가 직접 해야 할 외부 설정 (체크리스트로 안내할 것)
### 카카오 디벨로퍼스
1. 내 애플리케이션 → 제품 설정 → **카카오 로그인 활성화 ON**
2. 동의 항목: 닉네임(필수), 프로필 사진(선택), 카카오계정(이메일)(선택)
3. Redirect URI 등록: `https://<supabase-project>.supabase.co/auth/v1/callback`
4. 보안 → **Client Secret 발급 및 사용함 ON** → Secret 복사

### Supabase
1. Authentication → Providers → **Kakao 활성화**
2. Client ID = 카카오 앱의 REST API 키
3. Client Secret = 위에서 복사한 값
4. 콜백 URL은 자동 생성된 것 사용

이 과정을 README.md 상단의 **SETUP** 섹션에 스크린샷 경로와 함께 명시.

## 3. 스택 결정
- 프런트엔드: 단일 HTML → 모듈 분리 허용 (하지만 번들러 없이 브라우저 네이티브 ES Modules + importmap 권장)
- Supabase Client: `@supabase/supabase-js` v2 (CDN 로드 OK)
- 호스팅: Vercel 또는 Cloudflare Pages (정적), 배포 명령어도 README에 기재
- 백엔드 로직: Supabase Postgres + RLS + Edge Functions (Deno TypeScript)

## 4. 데이터 모델 (Supabase SQL 마이그레이션으로 생성)
```sql
-- profiles: auth.users 1:1 확장
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  avatar_url text,
  created_at timestamptz default now()
);

-- stamps: 1 row = 1 스탬프
create table public.stamps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  issued_by text,           -- 매장 코드 또는 스태프 닉네임
  note text,
  created_at timestamptz default now()
);
create index stamps_user_created_idx on public.stamps(user_id, created_at desc);

-- rewards: 10개 채웠을 때 교환 기록
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz default now(),
  reward_type text default 'free_drink'
);

-- 매장 코드 (staff가 POS 옆 태블릿에 띄우는 회전 코드)
create table public.store_codes (
  code text primary key,
  valid_until timestamptz not null,
  created_by uuid references auth.users(id)
);
```

### RLS 정책 (꼭 포함)
- 모든 테이블 `enable row level security`
- profiles: 본인만 select/update
- stamps: 본인만 select; insert는 Edge Function의 service role만
- rewards: 본인만 select; insert는 Edge Function만
- store_codes: staff 역할(`auth.jwt()->>'role' = 'staff'` 기반 app_metadata)만 insert/select

## 5. 스탬프 적립 플로우
두 가지 방식을 **모두** 구현하되 MVP는 A만 바로 동작하도록.

### A. 매장 회전 코드 (MVP, 기본)
1. 매장 태블릿: `/staff`에 스태프가 카카오 로그인 후 접속 → 6자리 코드 표시, 5분마다 자동 갱신 (Edge Function `issue-code`로 DB에 저장)
2. 고객: 메인 페이지 스탬프 타일 → "스탬프 받기" → 로그인 안 돼 있으면 카카오 로그인 → 6자리 입력 → Edge Function `claim-stamp`가 코드 유효성 확인 + 중복 방지(같은 코드로 같은 user 1회 한정) + `stamps` insert

### B. QR 스캔 (선택, 2차)
- store_codes에 유효기간 2분짜리 QR용 긴 토큰 저장
- `/scan` 페이지에서 브라우저 카메라로 QR 읽고 `claim-stamp` 호출

## 6. UI 요구사항

### 기존 페이지 통합
기존 `tuz-landing`의 **공지 / 메뉴 / 오늘의 추천 / 오시는 길 / 인사말 / WiFi / 영업시간** 페이지(또는 섹션)를 그대로 활용하여 랜딩에서 각각으로 라우팅/스크롤하도록 연결.
- 새로 만들지 말고 기존 마크업·컴포넌트·스타일 재사용
- 라우팅 방식(멀티페이지 vs SPA 앵커 스크롤)도 기존 규칙 유지

### 히어로 타이포그래피 — 푸라닭 폰트 적용
- 메인 타이틀 "**Tuz**"와 서브 태그라인 "**Have a "TUZ" day!**" 에 **푸라닭 폰트** 적용.
- `assets/fonts/puradak/` 하위에 폰트 파일이 이미 있는지 먼저 확인(`Glob "**/puradak*"`, `Glob "**/푸라닭*"`). 없으면 사용자에게 파일 경로를 물어봐 `assets/fonts/`에 배치 후 `@font-face`로 등록.
- CSS:
  ```css
  @font-face {
    font-family: "Puradak";
    src: url("/assets/fonts/puradak/Puradak-Regular.woff2") format("woff2");
    font-weight: 400 700;
    font-display: swap;
    unicode-range: U+0020-007E, U+AC00-D7A3; /* ASCII + 한글 */
  }
  .hero__title, .hero__tagline { font-family: "Puradak", var(--font-serif), serif; }
  ```
- **라이선스 주의**: 푸라닭 폰트는 상용 사용 조건이 따로 있으니, 로드 전에 `LICENSE.md`·공식 배포 페이지를 확인하라. 상업적 사용 허가 문구가 명확하지 않으면 작업을 멈추고 사용자에게 "상용 라이선스 확인됐는지" 되물어볼 것. 대체안으로 `Fraunces` + `Pretendard` 조합 유지를 제시.

### 스탬프 카드 섹션 (신규)
- 로그인 전: "로그인하고 스탬프 시작하기" CTA 표시, 점선 10개
- 로그인 후: `stamps` 카운트를 실시간으로 반영 (10개 채워지면 "커피 한 잔 교환하기" 버튼 활성화)
- 보상 교환 시 `rewards` insert + `stamps` 10개 archive(soft delete) → 카운트 리셋
- 푸시/토스트 알림: stamp 적립 성공 시 "☕️ 1 / 10 적립 완료!" 스낵바

디자인 토큰·다크모드·폰트는 **기존 `tuz-landing`을 그대로 계승**한다. 새 CSS는 `:where()`로 특이도 낮춰 작성해 기존 스타일과 충돌 없게 할 것.

## 7. 개인정보 처리방침 & 약관
- `/privacy` 정적 페이지 생성. 아래 항목 포함:
  - 수집 항목: 카카오 제공 닉네임, 프로필 이미지(선택), 이메일(선택)
  - 수집 목적: 스탬프 카드 식별·보상 지급
  - 보관 기간: 회원 탈퇴 시 즉시 삭제
  - **수탁자**: Supabase Inc.(미국), Kakao Corp.(대한민국)
  - 해외 이전 동의: "Supabase는 데이터를 미국 리전에 저장합니다. 동의합니까?"
- 첫 로그인 직후 동의 화면: 체크박스 2개 (필수: 개인정보 수집·이용, 필수: 해외 이전) → 모두 체크해야 profile 생성

## 8. 운영 자동화 (GitHub Actions 2개 생성)
### `.github/workflows/keep-alive.yml`
- cron: 매일 09:00 KST
- Supabase REST `/rest/v1/profiles?limit=1` 호출로 pause 방지
- SUPABASE_URL, SUPABASE_ANON_KEY는 repo secret으로 읽기

### `.github/workflows/db-backup.yml`
- cron: 매주 일요일 새벽 3시 KST
- `pg_dump` → gzip → GitHub Release에 업로드 (rolling 4주 보관)
- DATABASE_URL은 repo secret

## 9. 보안 체크리스트
- anon key는 공개되어도 RLS로 막으므로 프런트 번들에 포함 OK
- service_role key는 Edge Function env에만. 절대 프런트 금지
- `claim-stamp` Edge Function 내부에서 user_id를 `context.user.id`로만 신뢰 (클라이언트 payload에서 받지 말 것)
- store_codes는 구현 시 time-safe 비교 사용
- 카카오 토큰은 Supabase Auth가 관리하므로 별도 저장 금지

## 10. 파일 구조 (기존 `D:/00_work/tuz-landing` 위에 얹을 것)
기존 프로젝트의 구조를 **우선 존중**하고, 아래 항목만 추가/확장한다.
```
D:/00_work/tuz-landing/
├── (기존 페이지: 공지 / 메뉴 / 오늘의 추천 / 오시는 길 / 인사말 / WiFi / 영업시간) ── 그대로
├── (기존 index / layout / 라우터 등) ── 스탬프 섹션만 주입
├── staff.{ext}                 # 스태프 코드 발급 대시보드 (기존 라우팅 규칙에 맞춤)
├── privacy.{ext}               # 개인정보 처리방침
├── assets/fonts/puradak/       # 푸라닭 폰트 (라이선스 확인 후)
├── src/lib/                    # 프레임워크 규칙에 맞춰 경로 조정
│   ├── supabase.ts             # createClient
│   ├── auth.ts                 # 카카오 로그인 / 세션 / 탈퇴
│   └── stamps.ts               # 스탬프 조회·적립·보상
├── supabase/
│   ├── migrations/20260420_init.sql
│   └── functions/
│       ├── issue-code/index.ts
│       └── claim-stamp/index.ts
├── .github/workflows/
│   ├── keep-alive.yml
│   └── db-backup.yml
├── .env.example
└── README.md
```
※ 기존 프로젝트의 빌드 도구(Next.js, Vite, Astro 등)에 맞춰 파일 확장자·폴더 네이밍 조정할 것. 기존 규칙을 깨지 말 것.

## 11. 산출물 검증 순서
구현 끝나면 아래 순서로 스스로 검증 후 리포트:
1. `supabase db reset` + 마이그레이션 실행 성공
2. 기존 7개 섹션(공지·메뉴·오늘의 추천·오시는 길·인사말·WiFi·영업시간)이 변경 없이 정상 표시되는지 Playwright 스크린샷으로 회귀 확인
3. 히어로 "Tuz" / "Have a \"TUZ\" day!" 에 푸라닭 폰트가 적용되어 있는지 `getComputedStyle` 또는 스크린샷 diff로 확인
4. 카카오 로그인 플로우 → 동의 화면 → 스탬프 1개 적립 → 카운트 증가 확인
5. 10개 채워서 보상 교환 → 카운트 0으로 리셋 확인
6. 비로그인 사용자로 스탬프 타일 접근 → 로그인 유도 확인
7. `/staff` 비스태프 계정으로 접근 시 차단 확인
8. RLS 정책 테스트: 다른 사용자의 stamps select 시도 → 0 rows

## 12. 작업 진행 방식
1. **먼저** `D:/00_work/tuz-landing` 전수 탐색 → 프레임워크/번들러/스타일 시스템 파악 → 한 줄 요약 리포트
2. 그 다음 기존 페이지(공지·메뉴·오늘의 추천·오시는 길·인사말·WiFi·영업시간) 각각의 파일 위치·연결 방식 정리
3. 푸라닭 폰트 파일 유무 + 라이선스 확인 결과 리포트 (없거나 상용 불가면 **여기서 멈추고 사용자 확인**)
4. 여기까지 완료되면 TodoWrite로 스탬프/로그인/자동화 단계를 쪼개고 각 단계마다 커밋
5. UI 변경 시 Playwright로 라이트/다크 스크린샷 찍어 회귀 확인
6. 모호한 점은 가정을 README에 명시하고 진행
7. 끝나면 README에 "남은 TODO" 섹션 (도메인 연결, Vercel 환경변수 설정, 푸라닭 폰트 상용 라이선스 계약 등) 나열

시작해.
```

---

## 참고 · 이 프롬프트 Claude Code에 넘기기 전에 해둘 것

1. **`D:/00_work/tuz-landing` 이 git 초기화 되어있는지 확인**
   ```bash
   cd D:/00_work/tuz-landing
   git status        # 미초기화면 git init + 현재 작업물 첫 커밋
   git checkout -b feature/stamp-login
   ```

2. **.env.local 미리 만들어두기** (Claude Code가 값 물어보는 시간 단축)
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   ```

3. **푸라닭 폰트 파일 준비** — `D:/00_work/tuz-landing/assets/fonts/puradak/` 에 `.woff2` / `.ttf` 배치. 상용 라이선스 계약서 PDF도 같은 폴더에 두면 Claude Code가 확인하고 넘어감.

4. **GitHub repo 비공개로 파두기** — 백업/keep-alive 워크플로우 돌리려면 필요

5. **Supabase Auth → Providers → Kakao** 화면은 미리 열어두면, 카카오 Client Secret 받자마자 바로 붙여넣을 수 있어 편함
