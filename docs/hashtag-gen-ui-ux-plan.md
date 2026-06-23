# Instagram Hashtag Generator UI/UX Plan

## Product Brief

`/hashtag-gen` is an owner-facing tool for Tuz cafe owners to turn an Instagram post draft into practical hashtag sets. The first version should feel like a quiet work tool, not a marketing landing page.

- User: non-developer cafe owners writing Instagram captions for Tuz.
- Core task: paste or type an Instagram post, generate relevant Korean and local cafe hashtags, copy the final set.
- Deployment: same static Vercel project.
- Data/context: same Supabase project, with Tuz cafe profile and cafe-owned reference data available to the generator.
- Future learning: hashtag generation criteria will be analyzed and trained separately, so the UI and API should isolate criteria/config from the screen.

## Design Direction

Match the current TUZ visual system from `styles.css`.

- Color: `--tuz-red`, `--tuz-red-deep`, `--tuz-red-soft`, white/ivory paper surfaces, ink text.
- Type: Pretendard for tool UI, existing TUZ display font only for compact brand moments.
- Shape: keep tool controls closer to `--r-sm` or `--r-md`; avoid large decorative cards.
- Tone: calm, direct, owner-friendly Korean. Avoid developer terms such as prompt, model, token, schema, API.
- Density: mobile-first, efficient, with desktop centered at a wider work surface than the public QR landing page if needed.

## Route And Navigation

Use a standalone route:

- URL: `https://tuz.kr/hashtag-gen`
- Source path candidate: `hashtag-gen/index.html`
- Robots: `noindex,nofollow` unless owners later want it discoverable.
- Home navigation: do not add to public customer tile grid. Add an admin-only entry only if owners need it from the site.

This should follow the existing `/trend/` pattern: a separate static page using shared visual tokens and Supabase-aware scripts.

## Primary Flow

1. Owner opens `/hashtag-gen`.
2. Page shows a simple input area: "오늘 올릴 게시글을 붙여넣어 주세요".
3. Owner optionally selects intent:
   - 신메뉴
   - 오늘의 추천
   - 이벤트/공지
   - 매장 분위기
   - 직접 선택 안 함
4. Owner taps "해시태그 만들기".
5. Result returns grouped tags:
   - 바로 붙여넣기
   - 지역/상권
   - 메뉴/음료
   - 분위기/방문상황
   - 가게 고정태그
6. Owner can remove individual tags, copy all, or regenerate once.

## Screen Structure

### Top Bar

- Back link: "홈"
- Page title: "해시태그 만들기"
- Small brand text: "TUZ Instagram Helper"

### Input Panel

Recommended copy:

- Label: "게시글 내용"
- Placeholder: "예: 오늘은 고소한 크림라떼가 잘 나왔어요. 점심 지나고 조용한 시간에 들르기 좋아요."
- Helper text: "메뉴 이름, 분위기, 이벤트 내용을 넣으면 더 잘 맞춰드려요."
- Character counter: owner-facing, simple: "312자"

Controls:

- Segmented control for post type.
- Optional checkbox: "울산/성남동 태그 포함".
- Optional checkbox: "TUZ 고정태그 포함".
- Primary button: "해시태그 만들기".

### Result Panel

Result summary:

- "게시글에 맞춰 24개를 골랐어요."
- "복사해서 인스타그램 맨 아래에 붙여넣으면 됩니다."

Tag display:

- Use tappable chips with remove `x`.
- Group labels should be plain Korean:
  - "복사 추천"
  - "지역"
  - "메뉴"
  - "분위기"
  - "TUZ 고정"

Actions:

- Primary: "전체 복사"
- Secondary: "다시 만들기"
- Tertiary: "처음부터"

Copy success:

- Toast: "복사했어요. 인스타그램에 붙여넣어 주세요."

### Empty And Error States

- Empty input: "게시글 내용을 먼저 넣어주세요."
- Too short: "조금만 더 적어주시면 더 정확하게 골라드릴 수 있어요."
- API error: "잠시 연결이 불안정해요. 방금 쓴 글은 그대로 두었으니 다시 눌러주세요."
- No result: "이번 글에는 고정태그 위주로 먼저 제안할게요."

## Cafe Context The Generator Should Know

The generator should not rely only on the pasted post. It should receive a compact Tuz profile with:

- Brand: Tuz / 투즈
- Location: 울산 중구, 성남동 context if confirmed in production data
- Instagram account: `@tuzz2026`
- Cafe category: coffee and dessert cafe
- Current menu names and categories from `menu`
- Today's picks from `pick` joined to `menu`
- Current notices/events from `news`
- Operating context from `settings` when relevant
- Brand-fixed hashtags approved by owners
- Banned or low-quality hashtag list once the analysis is ready

The UI should show only owner-friendly labels. The API can assemble the actual context internally.

## Supabase Data Plan

Do not expose service-role keys in the browser. Any generation call should go through a Vercel serverless API.

Suggested tables/config:

- `hashtag_settings`
  - singleton row for fixed tags, location tags, blocked tags, default tag count, criteria version
- `hashtag_generations`
  - audit log for input summary, selected intent, generated tags, copied tags, criteria version, created_at
- optional `hashtag_feedback`
  - owner marks tags as useful/not useful for later criteria tuning

Security expectations:

- Enable RLS on all public schema tables.
- Public browser should not write generation logs directly.
- API route should write server-side logs with safe credentials only when needed.
- Owner-editable settings require authenticated access, matching the existing admin model.

## Vercel/API Plan

Candidate endpoint:

- `POST /api/hashtag-gen`

Request body:

- `postText`
- `postType`
- `includeLocalTags`
- `includeBrandTags`
- optional `regenerateFrom`

Response body:

- `tags`: grouped tag arrays
- `copyText`: final newline/space-formatted hashtag block
- `reasonSummary`: short owner-facing sentence, not model reasoning
- `criteriaVersion`

The API should:

- Validate origin like existing API routes.
- Limit input size.
- Load cafe context from Supabase.
- Apply future hashtag criteria/config before calling the model.
- Return stable JSON only.
- Avoid storing raw full post text unless the owner explicitly approves logging.

## Generation Criteria Integration

The upcoming hashtag analysis should become a versioned criteria module, not screen copy.

Recommended boundaries:

- `hashtagCriteriaVersion`: stored in settings/logs.
- `buildHashtagPrompt(context, post, options)`: server-only.
- `normalizeHashtags(tags)`: removes duplicates, enforces `#`, filters blocked tags.
- `rankHashtags(tags, context)`: keeps a balanced mix of local/menu/occasion/brand tags.
- `formatCopyText(groups)`: UI-independent output formatting.

This keeps the UI stable while the generation standard changes.

## Copywriting Guidelines

Use practical owner language:

- "해시태그 만들기"
- "전체 복사"
- "이 태그 빼기"
- "지역 태그 포함"
- "TUZ 고정태그 포함"
- "게시글에 맞춰 골랐어요"

Avoid:

- "AI 프롬프트"
- "모델 응답"
- "토큰"
- "파라미터"
- "RAG"

## MVP Scope

MVP should include:

- Standalone `/hashtag-gen` page.
- Post input and post type selector.
- Generate/copy/remove/regenerate interactions.
- Vercel API endpoint.
- Supabase cafe context read.
- Fixed brand/location tags config.
- Basic generation log without raw full text by default.

Defer:

- Owner feedback training UI.
- Hashtag performance analytics.
- Instagram API posting.
- Multi-account management.
- Public navigation exposure.

## Acceptance Criteria

- Page works on mobile and desktop without horizontal scrolling.
- Input text remains intact after failed generation.
- Owners can copy tags in one tap.
- Result never includes tags without `#`.
- Duplicate tags are removed.
- Banned tags are filtered.
- Generated tags include Tuz/cafe context when enabled.
- API failure states are understandable to non-developers.
- No service-role secrets are exposed to client files.
- Vercel route and Supabase tables follow existing project deployment patterns.
