# HANDOVER — tuz-landing 모바일 버그 수정 + 50+ 타겟 UX 개선

**작성:** 2026-04-21
**재개 예정:** 오늘 저녁 8시 이후 (다른 환경)
**브랜치:** `dotori/relaxed-kalam-f88432`

---

## 현재 상태 (커밋 완료)

### Sprint 3 완료 (이전 세션)
- Gallery Lightbox (네이티브 `<dialog>`, Escape/화살표 키 네비)
- TextReveal 섹션 제목 효과 (scroll-trigger + immediate 모드)
- `sitemap.xml` + `hreflang`
- WinnersStrip 모바일 마키

### 폰트 재정리 완료
- Puradak Gentle Gothic — **3곳만**: 헤더 로고(desktop/mobile), Hero h1 `Tuz`, Hero 태그라인 `Have a Tuz day!`, 푸터 Tuz 워드마크
- Pretendard — 나머지 전부 (`next/font/local`로 `fonts/Pretendard-1.3.9/web/variable/woff2/PretendardVariable.woff2` 참조)
- Fraunces(editorial) 완전 제거

### Sprint 4 완료
- `_legacy/` 디렉토리 제거
- `next.config.ts`: 보안 헤더(HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) + CSP `report-only` (/admin 제외)
- `app/(frontend)/[locale]/opengraph-image.tsx`: `next/og` + Puradak 폰트 1200×630 OG 이미지
- Playwright 셋업 + 비주얼 스냅샷(320/768/1024/1440 × ko/en) — **23 passed, 1 skipped(webkit Tab)**
- Lightbox a11y: 이미지 alt 폴백, 카운터 `aria-live="polite"`

### Sprint 4 남은 항목 (실서버/배포 필요)
- [ ] **DNS 컷오버** — `tuz.kr` → Vercel (사용자 승인 후)
- [ ] CSP `report-only` → enforce 전환 (48h 모니터링 후)
- [ ] axe/pa11y 실기기 스캔
- [ ] Lighthouse 실측 (LCP < 2.0, CLS < 0.05, INP < 200ms)
- [ ] Kakao Developers 허용 도메인 정비 (`tuz.kr`, `*.vercel.app`)

---

## 다음 작업 (오늘 저녁 8시 재개)

### Context
1. **버그:** 사용자가 iPhone에서 테스트 → Hero 섹션 "Tuz" 제목 + "Have a Tuz day!" 태그라인이 **invisible**. 로고·햄버거·주소·시간만 보이고 Hero 본문은 공백.
2. **타겟 UX:** 가게 위치가 울산 중구 반구동(염포로) → 주 방문객이 **50대+** 시니어일 가능성. 현재 UI는 editorial 톤(14px 본문, #6b625b 저대비, 아이콘-온리 버튼, 스크롤 애니메이션 의존)으로 시니어 친화성 부족.

### Root Cause (Hero invisible)
`components/motion/FadeUp.tsx:28-30`의 `whileInView`가 iOS Safari에서 hydration 타이밍 문제로 IntersectionObserver 초기 감지 실패 → `opacity: 0` 영구 고정. Hero.tsx의 태그라인(43-47)과 CTA 링크(49-62)가 모두 FadeUp으로 감싸져 invisible. `TextReveal`은 `trigger="immediate"`여서 안전.

### 승인된 구현 방향 (사용자 결정 완료)
| 결정 포인트 | 선택 |
|---|---|
| Hero 애니메이션 | **eager 모드로 즉시 표시** — FadeUp에 `eager?: boolean` prop 추가, Hero에서 활용 |
| 모바일 하단 sticky CTA | **추가** — "📞 전화 \| 📍 길찾기" 2버튼, 항상 하단 고정 |
| 지도 | **정적 이미지 + 큰 CTA 버튼** — Kakao static map API + "카카오맵으로 길찾기" |

### 구현 계획 (승인됨)

전체 상세: `~/.claude/plans/jaunty-beaming-cupcake.md`

#### Part 1 — Hero invisible 버그 수정
- `components/motion/FadeUp.tsx`: `eager?: boolean` prop 추가. `eager=true` → `animate` 사용(whileInView 대신)
- `components/sections/Hero/Hero.tsx`: 내부 3개 FadeUp 모두 `eager` 전달

#### Part 2 — 시니어 친화 UX

**A. 전화 click-to-call + 모바일 sticky CTA**
- `components/sections/VisitUs/VisitUs.tsx:82-86`: 전화 plain text → `<a href={\`tel:${phone}\`}>` 크게(`text-2xl md:text-3xl`)
- `components/sections/Footer/Footer.tsx`: 전화번호 블록 신규 추가
- **신규:** `components/chrome/MobileStickyCTA.tsx` — 모바일 하단 고정 바
- **수정:** `app/(frontend)/[locale]/layout.tsx` — StickyCTA 마운트, `pb-safe` 여백

**B. 본문 글자 크기 ≥16px baseline**
| 파일 | 요소 | 현재 → 변경 |
|---|---|---|
| `Hero.tsx:51-61` | CTA 링크 | `text-sm` → `text-base md:text-lg`, 버튼 스타일 |
| `HoursTable.tsx:61` | 요일 레이블 | `text-sm uppercase` → `text-base normal case 한글` |
| `Footer.tsx:77,84` | 주소·시간 | `text-sm` → `text-base` |
| `VisitUs.tsx:43` | 좌표 표시 | **제거** (시니어에 무의미) |
| `Footer.tsx:52,66,95` | IG/YT 약어 | `text-[10px]` → `text-xs` + 풀네임 "인스타그램"·"유튜브" |

**C. 아이콘 + 텍스트 라벨 병행**
- `SiteHeader.tsx:69-76` 햄버거 → 아이콘 + "메뉴" 텍스트 (모바일)
- `AddressCopy.tsx:27-41` → `text-base`, 버튼 보더 + padding 증가
- `WifiCard.tsx:65-84` 복사 버튼 → 크기 ↑, `size-5` 아이콘, `text-base` 라벨

**D. 대비 상향 (중요 정보만)**
- 중요 정보(주소·전화·시간) → `tuz-ink-3`(#6b625b) → `tuz-ink-2`(#3d3631) 또는 `tuz-ink`(#1a1612)
- 보조 정보(eyebrow, 메타) → `tuz-ink-3` 유지 OK

**E. 지도 실용화**
- `components/sections/VisitUs/VisitUs.tsx:50-72`: placeholder 제거
- **신규:** `components/sections/VisitUs/StaticMap.tsx` — Kakao static map API 이미지 + 큰 CTA "카카오맵으로 길찾기"
- URL 스킴: `https://map.kakao.com/link/to/...` + 대체 `https://www.google.com/maps?q=...`

**F. 터치 타겟 ≥44×44px 보장**
- Hero CTA → 패딩 `px-6 py-3` 실제 버튼
- Desktop nav 링크 → 패딩 추가
- AddressCopy → 외곽선 + padding

**G. 애니메이션 절제**
- Hero `FadeUp` → `eager` (Part 1)
- 그 외 `FadeUp.distance`: `24` → `12` 축소
- `TextReveal` 섹션 제목은 유지
- `prefers-reduced-motion` 전역 CSS 유지

**H. 모바일 헤더 시트 연락처 블록**
- `SiteHeader.tsx`: 햄버거 시트 상단에 전화·주소 블록 추가 — 메뉴 열면 즉시 노출

### 변경 파일 요약
**수정 11개:**
- `components/motion/FadeUp.tsx`
- `components/sections/Hero/Hero.tsx`
- `components/sections/VisitUs/VisitUs.tsx`
- `components/sections/VisitUs/AddressCopy.tsx`
- `components/sections/VisitUs/WifiCard.tsx`
- `components/sections/StoreInfo/HoursTable.tsx`
- `components/sections/Footer/Footer.tsx`
- `components/chrome/SiteHeader.tsx`
- `app/(frontend)/[locale]/layout.tsx`

**신규 2개:**
- `components/chrome/MobileStickyCTA.tsx`
- `components/sections/VisitUs/StaticMap.tsx`

### 검증 체크리스트
1. iOS Safari 실기기에서 `/ko`, `/en` Hero 제목·태그라인 즉시 노출
2. Playwright 스냅샷 업데이트: `pnpm test:update`
3. 모바일 Chrome/Safari 전화 터치 → 다이얼러
4. axe 스캔 (color-contrast, link-name, button-name)
5. 반응형 DevTools 320/375/768/1024/1440 렌더 체크
6. `pnpm build` 그린

### 재사용할 기존 자산
- `lib/motion-tokens.ts` — `motionDuration`, `motionEase`
- `components/ui/badge.tsx` — chip 스타일
- `@/payload-types.Location.phone` — 기존 필드
- Tailwind `tuz-*` 팔레트

---

## 재개 절차

```bash
cd ~/.claude-personal/tuz-landing/relaxed-kalam-f88432
git pull
cat HANDOVER.md  # 이 문서 재확인
cat ~/.claude/plans/jaunty-beaming-cupcake.md  # 상세 플랜 (있다면)

# 개발 서버 기동
pnpm dev
# → http://localhost:3000
# → Payload admin: http://localhost:3000/admin
```

Part 1 먼저 수정 → 커밋 → 모바일 검증 → Part 2 진행. 각 커밋은 작게.

---

## 로그

- **2026-04-21 07:00대:** 세션 재개(`/checkpoint resume`). Sprint 3 완료.
- **2026-04-21 오전:** 로컬 폰트(Puradak, Pretendard) `next/font/local` 전환.
- **2026-04-21 오전:** 폰트 정리 — Puradak 4곳, Pretendard 전체, Fraunces 제거.
- **2026-04-21 오후:** Sprint 4 구현(보안 헤더, OG 이미지, Playwright 셋업, a11y 패치, `_legacy/` 제거).
- **2026-04-21 18:20:** 사용자 iPhone 테스트 → Hero invisible 버그 + 50+ 타겟 UX 방향 전환 요청.
- **2026-04-21 저녁:** 다음 세션 재개 예정.
