# Dashboard fixes and author tile — build report

**8 August 2026.** Six commits, all gates green on each; the suite grew 3377 → **3411 passing**
across 213 files. Refs: `design-refs/dashboard-v16.html` and `design-refs/author-tile-round2.html`
(committed with the code, per the rule that cost a round trip last time).

| | | |
|---|---|---|
| P1 | `5d954f3` | the page no longer scrolls |
| P2 | `f6a3456` | the goal meter draws one block per query |
| P3 | `f66b1a8` | remove the numbers view |
| P4 | `67e553b` | author tile — option A |
| P5 | `139e76f` | activity feed names its subject |
| P6 | `<this>` | verification + this report |

## Phase 1 — the height chain, and why it broke

The page scrolled by **66px**, and `--head` is **66px**. That arithmetic was the whole diagnosis.

`#app-stage-scroll` is `.ws-cscroll`, and it contains the sticky `.ws-bar` as its FIRST CHILD.
`useStageLock` measured that scroller and stamped the result as `.os-root`'s pixel height, so the
scroller's content came to `bar + full-scroller-height`. StagePage's own comment already described
this failure — the dashboard had simply never opted into the fix.

Fixed in two route declarations, with no override stacked on the old one:

```
App.tsx       <StagePage active={…dashboard} layout="fill">
AppShell.tsx  fit={… || routeKey === "dashboard"}
```

**⚠️ Both are required and neither is sufficient.** `layout="fill"` gives the slot
`flex:1; min-height:0` — the space *remaining* under the bar. But `.ws-work` is `flex: 1 0 auto`
by default (**shrink 0**), so it can never be smaller than its content and the card scrolls
anyway. `fit` swaps in the definite basis. **That rule carries its own ⚠️ recording that
`min-height: 0` does NOT substitute for a definite basis — measured at a 720px viewport, 2345px
both with and without it.** Do not simplify either half away.

**The JS lock is deleted, not disabled.** `useStageLock`, its ResizeObserver, the import and the
inline style are gone; `.os-root` is plain `height: 100%`.

## Measured, on the real chain

The harness reproduces the app's own shell — same classes, same `StagePage` component, built CSS —
because a chain I invented would prove nothing.

| viewport | `scrollHeight === innerHeight` | scroller overflow | notes |
|---|---|---|---|
| 1280×800 | ✅ | 0 | both inner bodies scroll |
| 1440×900 | ✅ | 0 | root 804 = 900 − 66 − frame |
| 1920×1080 | ✅ | 0 | Pro banner shows |
| 1440×720 | ✅ | 0 | no cards clipped |

**A correction to the pack's spec:** at 1440×**720** the release does *not* fire — the threshold is
`max-height: 680px` — so the lock correctly still holds and the page still fits. I checked
1440×**640** separately to exercise the release: it fires, the root grows to 1420px, overflow goes
visible, the shell scrolls, nothing clipped. Both behaviours are right; 720 is on the holding side.

## Goals — all four states

| target | line | blocks | filled | note |
|---|---|---|---|---|
| none | "Set a target for the quarter" | ghost | 0 | + "Set a goal"; no fake progress |
| 1 | "Query **1 agent** this quarter" | 1 | 1 | the noun agrees |
| 25 (10 done) | "Query 25 agents this quarter" | 25 | 10 | matches the 10/25 header exactly |
| 100 (10 done) | "Query 100 agents this quarter" | **60** | 6 | proportional; gap 1px, 3.2px blocks, fits |

The old meter was a fixed 25 blocks with `done/target` scaled onto them — at target 1 that drew
25 full blocks beside "1/1". Above 60 a block stops meaning one query, and the aria-label says
"the meter shows the share completed" rather than claiming a count it isn't showing.

**The unset path was already correct and is untouched** — the live target of 1 is real stored data
on your account, not a default.

## Numbers view — removed, swept

Button, state, markup and 25 CSS rules. Nothing matching `os-tbl` / `os-dtable` / `dtable` /
`tableOn` / "Show the numbers" survives outside the tests, locked in markup and stylesheet.
**The `aria-pressed` assertion was retargeted, not deleted** — it was this component's only
accessibility check, and the frequency select's and slider's labels carry it now.

## Author tile — and a discrepancy worth knowing

**⚠️ The ref's tile is 436×436; ours is 302×302.** Its 96px plate, 20px padding and 14px gaps are
proportioned for a tile 44% larger and genuinely overflow here — measured, with the word count
pushed clean out of the tile. The ref's intro says it is drawn "at the size the tile actually
occupies in the build", and it is not. **Type sizes kept as specified** (23px title, 18px name —
they are the identity); elastic parts scaled: padding 20→16, gaps 14→10, plate 96→72.

The dead-space fix is `justify-content: center` on the body: measured at three content lengths,
the space above and below is **equal every time** (17/17, 16/16, 50/50), so no gap can open at any
tile height. The plate yields further on a two-line title (72 → 50, staying square via
`aspect-ratio`).

**⚠️ The title's wrapper is load-bearing and its absence is silent.** `-webkit-line-clamp` needs
`display:-webkit-box`, and a **flex item's display is blockified** — as a direct child of the shelf
the title computed to `flow-root`, the clamp died, and it collapsed to **zero height with the title
absent from the tile**. The ref wraps it for exactly this reason; I flattened that away and
reintroduced a bug the ref had already solved.

## Activity feed — resolve, per type

The subject was never missing from the data. **One universal lookup path was the root cause:**
every row resolved through `queryId → query → agent`, but agent and manuscript events are written
with `queryId: ""` **deliberately**, so all of them hit both fallbacks at once — an em dash, and
"Status changed" on an agent being added.

Now: query events resolve as before; **manuscript** events through `manuscriptId` to the real
title; **agent** events through their `description`, used whole and never parsed (`Activity`
carries no `agentId`, and the description is the sentence the action produced). Every type has its
own pill, a `resultingStatus` still wins where present, and **an unmapped type returns null and
drops the row** — a lock enumerates the entire enum so a new type without a label fails the suite.

Verified with a mixed feed: `Agent added — Added Daniel O'Rourke at Inkwell & Stone`,
`Manuscript updated — Murphy's Day Out`, `Agent updated — You updated details for Tom Ellery…`,
`Full requested — Jonathan Marsh`. **No em dash anywhere**, and a query event whose query no longer
exists is dropped rather than blanked.

**⚠️ The old test fixture set `activityType: "STATUS_CHANGE"` — not an ActivityType value at all.**
Nothing noticed while the feed never read the type. It does now.

**Watch the volume.** The feed's remit is wider; if agent-added events start drowning the query
story, the answer is a filter, not silent exclusion.

## For your eye — what I could not check

- **Themes.** Everything was rendered in **Cappuccino only**. The tile's burgundy frame and sage
  band, the goal blocks and the counter chips are all untested against Bold and Editorial, and
  those themes retoken exactly these colours.
- **"Three genres"** in the pack's tile check is not reachable: the model carries `ageCategory` +
  `genre`, so two pills is the maximum.
- **Real data volume** in the feed, and whether the wider remit reads well on a busy account.
- Nothing here is deployed — dev still runs `7703827`, so none of these six commits are live.

## Carried forward

- The **`responseRatePercent` reconciliation** remains a tracked follow-up (it divides by every
  query including unsent drafts; three call sites, one of them a hand-rolled copy).
- The rules deploy for the four one-screen user fields is still pending prod.
