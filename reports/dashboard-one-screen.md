# Dashboard — the one-screen redesign · build report

**7 August 2026.** Nine commits, all four gates green on each; the suite grew 3097 → **3204
passing**. Design authority: `design-refs/dashboard-one-screen.html` (= `37-settled-one-screen-v15`),
`design-refs/dashboard-spotlight-tour.html` (= `39`), and the settled spec committed verbatim as
`design-refs/dashboard-one-screen-spec.md`.

## Commits

| | | |
|---|---|---|
| P0 | `09c23cd` | refs + spec committed |
| P1 | `910b4cd` | derivation layer (ledger, curve, pill rule, goals) + rules edits |
| P2 | `8a9f9be` | scaffold — the lock, header F, skeletons |
| P3 | `b32be19` | the chart — pixels, pins, keyboard, ledger view |
| P4 | `4c5e0eb` | tasks — fixed grid, crossfading end cell |
| P5 | `1e6074c` | rail — author tile, goals, activity expand, Pro mini |
| P6 | `3bea9a4` | first-run states + count-up |
| P7 | `2b85486` | spotlight tour |
| P8 | `366f207` | the atomic swap — settled desk stands down |

## ⚠️ Two of the four named refs were never supplied

**`38-first-run-states.html` and `28-chart-popup-containers.html` do not exist on this machine**
(searched Downloads/Desktop/Documents before starting — yesterday's wrong-ref lesson, applied).
§9 and §4 of the spec are the standing authority for those sections, and the committed spec records
this at its head. **If the files arrive and disagree, the mockup wins** per the house rule — drop
them in Downloads and say so.

## Decisions worth a second look

- **The lock measures the stage, not the viewport.** The dashboard sits in a *flow* StagePage slot
  whose percentage chain breaks at the slot div; the clean declarative fix (`layout="fill"`) lives
  in App.tsx, which the To-do session held dirty all day and whole-file staging cannot split. So
  the root's height is `#app-stage-scroll`'s clientHeight via ResizeObserver — stage-relative by
  construction (no 100vh anywhere; locked), released by the §11 media queries with
  `height:auto !important`, which is what outranks an inline height. If the flow slot ever becomes
  `fill`, this keeps working; the measured value just equals the flex height.
- **Early days suppresses the achievement pill although §7's fallback is "always true".** The two
  sections conflict; §9 is the specific one and won. The chart's chip carries the awaiting count
  instead. Locked in both directions.
- **The greeting's name is plain ink again** — the third swing of that pendulum (v37 plain → settled
  desk burgundy italic → §2 plain), each recorded at the rule.
- **The tasks ⋯ and the avatar "+" both go somewhere real** (the board; Settings) rather than
  rendering dead — the spec drew them without wiring them, and a dead control breaks house law.
  `TODO(avatar-upload)` / `TODO(cover-upload)` mark the eventual homes.
- **Goal editing**: the spec never says how a goal is set or changed. A small inline editor lives
  in the card (Set a goal → number + period; clicking the `{done}/{target}` figure reopens it).
  Flagged as an interpretation.
- **The old `<md` desk line and to-do doorway left with the page** (§13 wholesale). Their lock now
  pins the retirement. The one-screen page renders at every width under §11's rules.

## Stored fields + the rules queue

`goalTarget`, `goalPeriod`, `tourCompletedAt`, `tourDismissed` joined the User type, `isValidUser`
and the update allowlist. **Edited, NOT deployed** — writes are silently denied everywhere until
the next `firestore:rules` deploy (both dev configs, per the dual-DB note). Until then: goals can't
be saved (the editor closes, nothing persists) and the tour may auto-run again next load. Progress
and the 7-day chip remain derived; nothing else is stored. Rules tests are CI-only locally.

## Unmounted, not deleted

The settled desk (DashboardHero, DeskStats, DeskBelow, DeskTodoCard, deskTooltip/DeskCard,
DashboardSkeleton, the v37 CSS) survives on disk with its tests, recoverable at
`b6c8546..67adf9a`. DeskCard/DeskTooltip are still consumed by nothing — a cleanup pack can take
them together. `focusSlot.ts` and `TimelineDrawer.tsx` remain from yesterday's pack for the same
reason.

## What jsdom cannot verify — Nick's browser walk

Manual review is required for exactly the spec's §13 list, plus the pack's own additions:

1. **The viewport-height chain**: the page fills the stage with zero page scroll at ≥1025px width
   and >680px height; only tasks and activity scroll internally. Then shrink below both thresholds
   and confirm the lock RELEASES (page scrolls; nothing clipped behind overflow:hidden).
2. **The rail expand/collapse**: author + goals fold away (spacing and all), activity grows via
   flex, esc hint shows, footer hides; Escape returns focus to the arrows; click-away closes.
3. **Chart resize**: drag the window — the line redraws at pixel scale with no stroke distortion;
   the draw-in must NOT re-run.
4. **Skeleton→content swap**: throttle the network — per-card shimmer, then content lands with no
   layout shift.
5. **The reading zone**: cursor flips default↔crosshair across the line; pins beat the crosshair;
   the popup never blocks a pin.
6. **Keyboard walk**: tab to the chart, arrows/Home/End, the aria-live narration; the numbers
   toggle; the tour's focus walk and its Escape.
7. **The tour** at 1440: hole eases between the five targets, card side-switches, final step
   centres; Skip stamps completion (once rules deploy).

## Carried forward

- **The rules deploy** (the four user fields) — dev first, both configs; prod is Nick's.
- **`DashboardSkeleton`/settled-desk cleanup pack** when wanted.
- **App.tsx `layout` flip** is unnecessary but available once the To-do stream releases the file.
- The spec's §13 says pipeline/diary "live elsewhere; not this page's concern" — nothing was
  re-homed here. If they are wanted on another page, that is its own pack.
