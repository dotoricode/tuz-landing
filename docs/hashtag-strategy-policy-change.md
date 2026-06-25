# Hashtag Strategy Policy Change

## Source Strategy

The generator now follows the cafe-account strategy supplied for TUZ: use 3-5 precise Instagram hashtags as search and classification signals, not a large exposure-maximizing block.

The preferred 5-tag structure is:

```text
large region + sub-region + menu/category + situation/intent + brand
```

For TUZ, the default examples are:

```text
#울산카페 #울산중구카페 #휘낭시에 #울산디저트 #카페튜즈
#울산카페 #울산중구카페 #카페대관 #울산모임장소 #카페튜즈
```

## Previous Logic

The previous selector ranked researched candidates by relevance, competition, local intent, brand safety, and freshness. It then filled the final 5 tags with this fixed category balance:

```text
brand 1 + local 1 + content 2 + discovery 1
```

That kept the result compact, but it did not distinguish `#울산카페` from a sub-region tag. It also reserved one slot for discovery-style tags, so the output could drift away from the supplied cafe strategy.

## New Logic

The selector now assigns a strategy slot to each candidate and fills those slots first:

```text
large_region 1 + sub_region 1 + menu/category 1 + intent/category 1 + brand 1
```

Key behavior changes:

- `#울산카페` is treated as the large-region slot.
- `#울산중구카페` and `#반구동카페` are treated as sub-region slots.
- Menu terms such as `#휘낭시에`, `#쑥라떼`, `#스콘맛집`, and `#에그타르트` are preferred when the memo supports them.
- Situation terms such as `#카페대관`, `#울산모임장소`, `#울산데이트`, and `#비오는날카페` are preferred for intent-led posts.
- `#카페튜즈` is preferred over `#TUZ` because the strategy says the Korean brand tag comes first.
- Generic or engagement-exchange tags such as `#카페`, `#맛집`, `#일상`, `#좋아요반사`, `#선팔`, and `#맞팔` stay blocked or deprioritized.

## Quantitative Comparison

These numbers are deterministic policy metrics from `scripts/verify-hashtag-gen.cjs`, not production Instagram performance telemetry.

| Metric | Previous policy | New policy | Change |
| --- | ---: | ---: | ---: |
| Strategy slot coverage in the default 5-tag formula | 60% | 100% | +40pp |
| Local precision coverage | 50% | 100% | +50pp |
| Reserved broad discovery slot rate | 20% | 0% | -20pp |
| Document sample exact-match fixtures | 0 | 2 | +2 |
| Maximum default hashtag count | 5 | 5 | unchanged |

Measured fixtures:

```text
menu fixture:
#울산카페 #울산중구카페 #휘낭시에 #울산디저트 #카페튜즈

rental fixture:
#울산카페 #울산중구카페 #카페대관 #울산모임장소 #카페튜즈
```

## Expected Impact

The improvement is policy quality, not a guaranteed reach increase. The generator is now more likely to produce tags that match local discovery, menu search, customer intent, and brand accumulation. Real Instagram impact should still be judged by non-follower reach, saves, shares, profile visits, directions, calls, and DMs.
