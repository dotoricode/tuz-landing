# tuz-landing 프로젝트 지침

> **현재 상태**: 바닐라 HTML → **Next.js 15 + Payload CMS**로 리빌드 중 (Sprint 1 진행).
> 레거시 바닐라 사이트는 `_legacy/` 에 참고용으로 보관되어 있으며 Sprint 4에서 삭제 예정.

## 스택

- Next.js 15+ App Router (TypeScript)
- Payload CMS v3 (임베드, `/admin`에 마운트)
- shadcn/ui + Tailwind v4
- next-intl (ko 기본, `/en`)
- Embla Carousel, Framer Motion, Lucide
- pnpm

## 배포 워크플로우

**배포 전 반드시 로컬 검증을 완료해야 한다.**

### 로컬 검증 체크리스트
1. `pnpm dev` — `/ko`, `/en` 모두 정상 렌더
2. `/admin` — Payload 어드민 로드, 로그인 동작
3. 주요 섹션 CRUD (Notice, MenuItem, TodayPick) admin 왕복 테스트
4. 모바일 뷰 확인 (Chrome DevTools 320/768)
5. `pnpm build` 에러 없이 통과

### 커밋/푸시
```bash
git add .
git commit -m "<type>: ..."
git push origin <branch>
```

> `git push` 훅으로 배포 커맨드가 자동 차단됨. 위 체크리스트 완료 후 진행.

## 디렉토리

- `app/(frontend)/[locale]/` — 프론트 페이지
- `app/(payload)/` — Payload 어드민 + 내부 API
- `components/sections/` — 8개 섹션 컴포넌트
- `payload/collections/`, `payload/globals/` — CMS 스키마
- `lib/queries/` — Payload ↔ UI 쿼리 경계
- `_legacy/` — 바닐라 사이트 참조본 (삭제 예정)

상세 계획: `~/.claude/plans/rebuild-tuz-kr-as-a-shiny-charm.md`
