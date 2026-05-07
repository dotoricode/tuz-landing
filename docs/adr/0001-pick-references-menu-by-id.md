# 0001. Pick은 Menu를 ID로 참조한다

**Status:** Proposed  
**Date:** 2026-05-07

## Context

Pick(오늘의 추천)은 항상 메뉴판에 실제로 존재하는 항목이다.
초기 구현은 Pick 테이블에 `name`, `name_en`, `price`를 자유 텍스트로 직접 입력하는 방식을 썼다.
이 경우 메뉴 가격이 변경돼도 Pick 카드가 자동으로 반영되지 않고, 입력 오류(오타, 가격 불일치)가 생길 수 있다.

## Decision

Pick 테이블에 `menu_id uuid references public.menu(id)` FK 컬럼을 추가하고,
관리자 에디터에서 메뉴판 항목을 드롭다운으로 선택하는 방식으로 변경한다.
`name`, `name_en`, `price`는 렌더링 시 Menu 테이블에서 JOIN해서 가져온다.

`photo` 컬럼은 Pick에 유지한다. 값이 있으면 Pick 전용 사진을 표시하고,
비어 있으면 선택된 Menu 항목의 `hero_photo`로 폴백한다.

## Trade-offs

**이 방식의 이점:**
- 가격·메뉴명 변경 시 Pick 카드가 자동 반영됨
- 존재하지 않는 메뉴를 Pick으로 올리는 실수 방지

**포기하는 것:**
- 자유 텍스트보다 입력 유연성이 떨어짐 (메뉴판에 없는 한정 메뉴를 Pick으로 올릴 수 없음)
- schema 변경 + 관리자 UI 변경 필요
