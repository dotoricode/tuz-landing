# ADR-0005: Settings는 데이터 모듈, WiFi/Hours/Menu 슬라이스는 표현 모듈로 분리 유지

## 상태

Proposed (2026-05-08)

## 배경

`settings` 테이블은 `id=1` 단일 행 강제 (DB `check (id = 1)` constraint). 한 행에 wifi, 영업시간, 메뉴 hero, kakao 키 등 가게 운영 파라미터가 모두 들어 있다 (CONTEXT.md "Settings (운영 설정)" 참조).

Vertical slice 분리 후, 세 슬라이스(WiFi/Hours/Menu)가 각자 `LOADER_SPEC`을 export하면서 모두 `table: 'settings'`를 가리킨다. 동시 fetch를 막기 위해 `app.js`에 `renderAllSettings(items)` fan-out 콜백이 있고, Menu 슬라이스는 `latestSettingsRow` 모듈 변수로 settings fetch와 menu view 진입 타이밍의 비대칭을 미봉한다. CLAUDE.md는 이 구조를 "settings 다중 renderer 트랩"으로 함정 표시.

이 friction을 해소하는 후보로 두 안이 검토됐다:
1. 세 슬라이스를 통째로 새 `settings` 슬라이스에 흡수
2. **데이터 source만 분리하고 표현 슬라이스는 그대로 두는 안**

## 결정

`shared/settings.js`를 **데이터 전담 모듈**로 도입한다. 인터페이스는 3 entry:

- `bootSettings()` — app.js 부팅에서 한 번 호출, 첫 fetch 트리거
- `subscribeSettings(cb)` — 슬라이스가 자기 표현 로직 등록. cb는 즉시 동기 호출 (값 없으면 `{}`), row 객체 reference 유지, cb 에러 격리
- `refreshSettings()` — admin 저장 후 호출, 모든 구독자 자동 재발행

WiFi/Hours/Menu는 표현 슬라이스로 그대로 유지하며 `subscribeSettings`로 자기 facet을 받는다.

세 슬라이스를 settings 슬라이스 하위로 **흡수하지 않는다**.

## 이유

세 슬라이스는 각자 **자체 표현 로직**을 가진다:

- **WiFi**: 비밀번호 복사 토스트 (`initWifi()` 클릭 핸들러, `flashToast` 애니메이션)
- **Hours**: status bar 실시간 계산 (`updateStatusBar`, `Date()` 기반 분기), 정기·임시 휴무 표시 로직
- **Menu**: hero 사진 그리기, 메뉴 카테고리 그룹핑·뱃지 처리

데이터 source가 한 행이라는 사실은 **데이터 모델의 형태**이고, 슬라이스의 표현·UX 책임은 **별개의 도메인 사실**이다. 통째 흡수는 두 책임을 섞고, 한 슬라이스의 표현 변경이 settings 모듈 수정으로 번지는 결합을 만든다.

`shared/settings.js`가 fetch · 캐시 · 변경 알림을 한 곳에 모음으로써:

- `renderAllSettings` fan-out이 사라짐
- `latestSettingsRow` 모듈 변수가 사라짐 (subscribe 시 동기 replay invariant)
- 새 facet 추가(예: 풋터 공지, 운영 정책)가 슬라이스 자율 — `app.js`의 LOADERS·boot 흐름을 손대지 않음
- 테스트 가능한 seam 확보 (fetch 함수 rebind로 in-memory fake 주입)

## 계층 경계로서의 의미

- **Data layer (`shared/settings.js`)**: settings 행의 fetch · 캐시 · dedup · 변경 알림. DOM에 손대지 않음.
- **Presentation layer (`slices/wifi|hours|menu`)**: 자기 view의 DOM·UX. settings 행을 받아 자기 facet만 렌더.

이 경계는 명시적 계약이다. 향후 다음 변경은 이 경계 침범으로 본다:

- `shared/settings.js`가 DOM을 직접 조작
- 슬라이스가 `supabase.from('settings')`를 직접 호출
- "Settings 슬라이스" 안에 WiFi/Hours/Menu 표현 로직 흡수

ADR-0002(영업시간 변경 시 Schedule Notice 자동 모달)는 그대로 유효하며, 해당 로직은 Hours 슬라이스가 owner로 들고 간다 — settings 모듈은 "변경됨" 시그널만 흘려보낸다.
