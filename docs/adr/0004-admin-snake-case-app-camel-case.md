# ADR-0004: admin.js는 snake_case, app.js는 camelCase 유지

## 상태

승인

## 배경

admin.js는 Supabase에서 로드한 raw row를 그대로 사용한다 (snake_case).
app.js는 `loadTable()` 내부에서 `toCamel()`을 적용해 렌더러에는 항상 camelCase row가 흐른다.

두 모듈이 다른 naming convention을 사용하는 것이 friction으로 보일 수 있다.

## 결정

이 bimodal 구조를 의도적으로 유지한다. 변경하지 않는다.

## 이유

admin.js는 snake_case 일관성을 내부적으로 유지한다.
- `f.col`(schema) → `row[f.col]`(read) → `out[f.col]`(write) → `supabase.upsert(out)` 경로가 모두 snake_case
- Supabase API 자체가 snake_case를 쓰므로 변환 없이 자연스럽게 흐른다

이를 camelCase로 통일하려면:
- `toSnake()` 함수 추가
- `buildField` 내 key 번역 레이어 추가 또는 schema col 전체 변경
- 마이그레이션 중 묵시적 버그 발생 위험

이 프로젝트 규모에서 득보다 실이 크다.

## 계층 경계로서의 의미

- **Persistence layer (admin.js)**: snake_case — DB schema와 동일
- **Presentation layer (app.js)**: camelCase — 관용적 JS 스타일

이 경계는 명시적 계약이다. 향후 코드 리뷰에서 admin.js에 `toCamel`을 적용하거나, app.js renderer에 raw row를 넘기는 변경은 이 경계를 침범하는 것으로 본다.
