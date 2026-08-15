# Deferred — the timeline's per-row progress bar

**Status: DEFERRED, at Nick's call (15 Aug).** Noted here so it is not lost.

## What it is

Each timeline row in `design-refs/todo-workspace-v14.html` can carry a progress bar against the
**agent's stated response window**, with **both ends labelled** — sage inside the window, burgundy
past it, which is the rule the rail's numeral already follows so the two surfaces cannot disagree
about "late". A bar with no scale is a shape rather than a fact, which is why both ends are labelled.

## Why it is not built

Both halves exist and are not joined:

- **The renderer supports it already.** `DockTimelineEvent.progress` is declared, and `TodoDock`
  renders `.tdk-prog` with its fill, its `over` state and its two end labels.
- **The window derivation exists.** The agent's stated weeks reach `bandFacts` / `trackingStats`,
  and `figureFor` on the rail already decides inside-vs-past.
- **What is missing is the join**: `dockTimeline` populates `key`, `label`, `when`, `via` and
  `note`, and never `progress`. Wiring it means deciding WHICH row carries the bar (the most recent
  rung, not every row), and reconciling the window's anchor with that row's own date.

## Where to start

`dockTimeline` in `ToDoPage.tsx`, alongside the `via`/`note` mapping added in the v14 Phase 4
commit. The agent is already resolved there (`ag`), so the stated weeks are in hand.

⚠️ **The bar belongs to ONE row, not to every row that has a date.** The window runs from the last
thing the agent is waiting on; putting a bar on each rung would draw several overlapping clocks for
one wait, which is the "same figure twice" fault in a different shape.
