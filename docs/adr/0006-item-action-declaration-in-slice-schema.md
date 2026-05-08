# ADR-0006: Item action declaration은 슬라이스 schema에 위치, admin.js는 dispatcher

## 상태

Proposed (2026-05-08)

## 배경

Vertical slice 분리 후, 각 슬라이스(News/Pick/Menu/Winners)는 자기 항목 카드에 `data-item-id` 속성을 찍는다. `admin.js`는 MutationObserver로 그걸 감지해 모든 카드에 표준 edit/delete 버튼을 주입한다 (`renderItemActions`, `observeContentMutations`).

이 구조의 한계:

- 슬라이스가 자기 항목의 admin 인터랙션에 대한 통제권이 0. 표준 edit/delete만 가능.
- 도메인 자연스럽게 요청되는 액션이 모달을 강제함:
  - **News 핀 토글** — 카드에서 바로 켜고 끄고 싶지만, 현재는 편집 모달 → checkbox → 저장
  - **Menu 드래그 정렬** — 카드 순서를 시각적으로 조정하고 싶지만, 현재는 편집 모달에서 sort_order 숫자 입력
- `admin.js`에 `VIEW_TO_TABLE` 매핑, `observeContentMutations`의 컨테이너 ID 하드코딩 등 도메인 인지가 누적됨. 새 슬라이스 추가 시 admin.js 수정 필요.

## 결정

슬라이스 admin schema에 다음 3 키를 도입한다:

```js
SLICE_SCHEMA = {
  ...,                              // 기존 label/noun/mode/views/fields/table

  itemContainer: '#newsList',       // 카드 컨테이너 selector (단수 또는 배열)

  itemActions: [                    // 슬라이스 추가 액션 (선택). default edit/delete는 admin이 자동 주입
    {
      key: 'pin-toggle',
      label: '고정',
      icon: '<svg>...</svg>',
      state: (item) => item.is_pinned ? 'on' : 'off',  // 있으면 토글, 없으면 즉시 액션
      handler: async (item, ctx) => { ... },           // ctx: { tableName, refreshTable, supabase, toast, openItemEditor }
    },
  ],

  reorder: { col: 'sort_order' },   // capability flag. 있으면 컨테이너에 드래그 정렬 활성화 (Menu 등)
}
```

`admin.js`는 dispatcher로 단순화된다:

- `VIEW_TO_TABLE` 상수 삭제 → SCHEMAS에서 자동 도출
- `observeContentMutations`의 컨테이너 하드코딩 삭제 → 모든 schema의 `itemContainer` 합침
- `renderItemActions`의 edit/delete 인라인 → `DEFAULT_ITEM_ACTIONS` 상수 + slice actions 합쳐 주입

## 인터페이스 invariants

- `itemContainer`는 `[data-item-id]` 자식을 가진 컨테이너를 가리킨다.
- `itemActions`가 정의되면 slice 액션이 카드 좌측, default edit/delete가 우측에 항상 함께 주입된다. default 끄기는 YAGNI — 필요 시 추가.
- `state(item)` 함수가 있는 액션은 시각적 토글 (on/off CSS 클래스). 없으면 즉시 액션.
- `handler`는 비동기. 에러는 `ctx.toast(msg, {error:true})`로 표시. 핸들러 자체는 throw 금지 (catch 책임).
- `reorder`는 capability flag. 활성 시 admin이 컨테이너에 dnd handler를 부착하고, drag 종료 시 모든 카드의 `reorder.col`을 카드 순서대로 일괄 UPDATE.

## 이유

슬라이스가 자기 항목의 인터랙션을 own함으로써:

- **Locality**: News 핀 토글, Menu 드래그 정렬, Pick menu 재선택 등 슬라이스 고유 액션이 슬라이스 안에 모임. admin.js의 도메인 인지가 사라짐.
- **Leverage**: 새 슬라이스 추가 시 admin.js 수정 0줄. schema declaration만으로 표준 admin UI를 받음.
- **테스트 가능성**: itemActions handler는 ctx mock으로 단위 테스트 가능. schema 자체가 declarative라 직접 검증 가능.
- **현실적 두 어댑터**: News 핀 토글, Menu 드래그 정렬이 즉시 도입 후보. 가설 seam이 아님.

반대 방향 (admin.js 본체에 새 분기 추가)은 슬라이스 자율성 침범으로 본다.

## 계층 경계로서의 의미

- **Dispatcher layer (`admin.js`)**: schema를 해석해 표준 admin UI(모달, 버튼, dnd)를 주입. 도메인 인지 없음.
- **Declaration layer (`slices/*/admin.js`)**: 자기 항목의 admin 컨트랙트 (컨테이너 위치, 추가 액션, 정렬 capability)를 declare.

향후 다음 변경은 이 경계 침범으로 본다:

- `admin.js`에 슬라이스별 분기 추가 (예: `if (tableName === 'news') ...`)
- 슬라이스가 admin.js의 dispatcher 함수를 직접 호출 (예: `renderItemActions()` 직접 호출)
- 슬라이스가 자기 카드의 표준 edit/delete를 override (필요 시 default-끄기 capability를 먼저 도입)

`enforceNewsPinnedExclusive` 같은 도메인 invariant는 News 슬라이스 또는 News 액션 핸들러 안으로 옮긴다 — admin.js의 책임 아님.
