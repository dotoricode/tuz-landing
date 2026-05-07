# 0002. 영업시간 변경 시 공지 생성 모달을 자동으로 띄운다

**Status:** Proposed  
**Date:** 2026-05-07

## Context

영업시간은 `settings` 테이블이 status bar 실시간 계산의 source of truth다.
변경 시 News에 `SCHEDULE` 공지도 따로 올려야 방문객이 이유를 알 수 있는데,
두 단계를 각각 해야 한다는 걸 잊기 쉽다 (연 3–5회 발생).

## Decision

관리자가 `settings`에서 영업시간(`hours_weekday`, `hours_weekend`, `holiday_notice`)을
저장할 때, 변경이 감지되면 "공지를 함께 올리시겠습니까?" 모달을 자동으로 띄운다.

모달에는 자동 생성 문구가 미리 채워지며 편집 가능하다:
- 예: "영업시간이 변경되었습니다: 평일 08:00–22:00 · 주말 10:00–23:00"
- 확인하면 `SCHEDULE` 태그로 News 항목이 생성된다
- 취소하면 settings 저장만 완료된다

## Trade-offs

**이점:** settings 저장과 공지 생성을 한 흐름에서 처리 — 빠뜨릴 가능성 제거  
**포기하는 것:** settings 저장 로직이 News 생성 로직과 결합됨
