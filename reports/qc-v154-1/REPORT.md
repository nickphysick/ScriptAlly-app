# Query Centre v154.1 — warm page, quiet Queried cards, quiet seals, receding filter and toolbar

Branch `query-centre-v154-1`, cut from `query-centre-v154` at 724c233c6 (v154 is not on `main`). The ref is
`design-refs/query-centre-v154-1.html`, sha256 `3926888e…be081`, verified.

## Premises that turned out false or needed adjusting

1. **"Measure on dev at 1920px."** The browser pane is not signed in to dev, and Claude does not type passwords.
   Dev serves `index-hyqKHEqz.js`, which is v154 exactly (my own deploy), so the Step 0 readings were taken from the
   emulator build of the same commit at 1440 and 1920 (`readings-before-*.json`).
2. **"The toolbar's … blur."** v154's toolbar had no backdrop blur (`backdrop-filter: none` before); only the ref's
   mock had one. The override still states `backdrop-filter: none`.
3. **"Search the Query Centre CSS for any other `#f5f5f3`."** There were only two sheets with it. See the list below.
4. **Seal size.** On this branch the cards are ~311px wide (no dev-line workspace width), so the seal measures 32px
   (v154's narrow-card size) at both widths, before and after. Unchanged.

## Step 0 readings (before, emulator build of v154, identical at 1440 and 1920)

| What | Before |
|---|---|
| Page ground / doodle wash | `rgb(245,245,243)` / `rgba(245,245,243,.45)` over the tile |
| Toolbar strip fade | `#f5f5f3` → `rgba(245,245,243,0)` over the last 22px |
| Queried card band | `rgb(239,231,218)` (sand), no shadow |
| Seal | fill navy `rgb(42,58,82)`, text `rgb(244,238,229)`, ring `0 0 0 2.5px #fff, 0 0 0 3.5px rgba(42,58,82,.35)` |
| Rail panels | fill `#fff`, ring `0 0 0 1px rgb(232,225,214)`, padding 6px |
| Toolbar | fill `#fff`, ring `0 0 0 1px rgb(227,213,201)` + shadow `0 12px 24px -18px rgba(28,19,15,.4)`, no blur, padding 7px |
| Search field | `rgb(247,243,238)`, no ring |
| Streak copy at streak 0 | pill "0-week streak" (hidden only before the first send); line "3 more keeps the streak going." |

## Commits

| Phase | Commit |
|---|---|
| 1 · warm page (+ ref, read-out spec, before readings) | 4157dd494 |
| 2 · quiet Queried bands and quiet seals | 6dde7438a |
| 3 · filter rail and toolbar | b5a4b1553 |
| 4 · streak copy | ff86284dd |
| 5 · measured, screenshots, report | (this commit) |

## Gates against baseline

| Gate | Baseline | After |
|---|---|---|
| tsc | 0 errors | 0 errors |
| Build | clean | clean |
| Vitest | 4 failed / 11572 passed / 3 skipped | 4 failed (the same 4) / 11584 passed / 3 skipped |

The 4 baseline failures are unrelated and fail on `main` too: `functions/eval/generate`, `emuGuard`, `firestoreTarget` ×2.

## Cool-grey values found and moved (all in `qcv1541.css`; the older sheets are not edited)

- `qcv1534.css` ground rule: `background-color: #f5f5f3`, plus the wash's `rgba(245,245,243,.45)` ×2.
  Re-painted as `#f6f3ee` / `rgba(246,243,238,.45)`.
- `qcv154.css` toolbar strip: `#f5f5f3` ×2 and `rgba(245,245,243,0)`. Re-painted as the brief's warm gradient.
- `qcv154.css` the goal line's label halo: `stroke: #f5f5f3`. Re-painted as `#f6f3ee`.
- `qcv154.css`, one mention in a comment (no paint).

The measurement also sweeps every element in the scrollport for 245,245,243 in fill, image, stroke, border and
shadow, and finds none.

## Toolbar height

54px before and after, at both widths. Only the side padding changed. The switch now starts 0px from the list's left
edge (its first button 3px in, the switch's own padding) and the last button ends 0px from its right edge. Before,
those were 10px and 7px.

## Measurement (`tests/e2e/qc1541.measure.ts`, emulator build, 1440 and 1920)

19 checks per width, all pass: ground, wash, fade, no cool paint, Queried band, Partial keeps rose, every other stage
coloured, seal, rail panels, hairlines, rail stickiness, toolbar container, toolbar ends, search field, toolbar
height, no 0-week streak, the line by streak, and the warm fade mid-scroll in Offers and in Materials requested.

## Screenshots (this folder; `ref-*` are the ref at the same width)

- At rest: `rest-1440/1920.png` against `ref-rest-*`.
- Mid-scroll in two groups: `scroll-offers-*` and `scroll-materials-requested-*`, against `ref-scroll-*`.
- The filter rail: `rail-*` against `ref-rail-*`.
- A Queried card beside a Partial card: `card-queried-*` and `card-partial-*` (and `card-full-*`), against
  `ref-card-queried-*` and `ref-card-other-*`.
- The chart at streak 0: `chart-*`. The harness's streak is 0, so it shows no pill and reads "3 more to hit your goal
  this week." The ref's chart (`ref-chart-*`) has a 6-week streak.

## Departures from the ref

- **Search field hover and focus.** The ref states only the resting field. Because the new rule outranks v153's
  hover and focus rules, both are restated here. Hover deepens the ring to `#d3cabd`, and focus keeps v153's navy
  ring.
- **Chart label overlap (from v154, left as is).** The goal line's words sit over tall bars with a halo, as v154 drew
  them. The brief puts the chart's bars and line out of scope.
- **Card layout and data.** The cards are narrower on this branch than on dev (see premise 4), and the harness data
  differs from the mock. The colours and surfaces match.

## Deferred

- Nothing from this brief.
- Still open from v154: the `FALLBACK_WEEKLY_GOAL = 3` decision, and measuring the wide dev-line card.

## Dev

https://scriptally-dev.web.app serves `index-DN1T-SE6.js`, built from `dev/…-laq131-qc154-qc1541` (a7bbf38eb, pushed). That is the dev line dev was serving (`…-qc154`, `index-hyqKHEqz.js`) with this branch merged in. The merge was clean; on the merged tree tsc was 0 and the Query Centre specs passed (354). The served CSS and JS chunks carry the v154.1 values and the new copy.
