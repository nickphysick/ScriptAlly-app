# Dashboard header counters — build report

**7 August 2026.** One commit. Design authority: `design-refs/dashboard-v16.html`, `.counters`.

## ⚠️ The committed ref was stale — process note first

The repo's `design-refs/dashboard-v16.html` had **no counters card**: it was the copy taken during
v16 Phase 1, i.e. an earlier iteration of the same mockup. The current file was found at
`~/Downloads/40-dashboard-v16 (1).html` and is now committed in its place.

The diff between them is exactly this pack and nothing else — counters card added, `.greet`
restructured to `align-items:center; gap:32px`, `.gl` changed from `flex:1` to `flex:0 0 auto`,
and the `16 agents on file` pill deleted. **The ref and the mockup now agree, and they must be
updated in the same commit as any future iteration** or the repo silently holds a different design
from the one approved in chat.

## Derivations — all read-time, no stored counters

| Figure | Source |
|---|---|
| Queries sent | **new** `queriesSentCount` (`lib/oneScreen.ts`) |
| Agents on file | `agents.length` |
| Responses | existing `responsesReceivedCount` (`lib/dashboardStats.ts`) |
| Sent / added this month | rolling 30 days off `dateSent` and `Agent.dateAdded` |
| Response rate | responses ÷ **queries sent** |

**One definition of "sent", two readers.** `sentAt(q)` is the single predicate; both
`queriesSentCount` and `dailyLedger` read it, so the counter above the chart and the line the
chart is drawn from cannot drift. Locked as an identity — the counter is asserted *equal to the
ledger's own total sends*, not merely equal to a number.

**The rate divides by sent, not by every query.** With 2 responses to 4 sends and one draft on
file it reads 50%; dividing by all five would report 40% and quietly punish the writer for having
a draft. Locked, including the case that adding a draft changes nothing.

**⚠️ `dashboardStats.responseRatePercent` still divides by every query and is therefore understated
wherever it is used** — `DeskStats`, `DashboardStatsRow`, and a third hand-rolled copy inside
`Dashboard.tsx:1002`. That is a bug in the shared selector, not a local deviation here. Fixing it
at source and checking each caller is a **tracked follow-up task**, not a report line: two things
named "response rate" disagreeing is fine for one commit and not fine indefinitely.

## Two bugs the browser caught that the tests did not

1. **⚠️ Every responsive step was dead.** The counters' base rules sit far below the page's
   responsive frame, so rules I had parked in the earlier `@media` blocks **lost on source order** —
   same specificity, base rule later in the file. Measured: at 1200px the icons were still shown
   and the figures still 24px while the h1 beside them had already stepped to 34px. The steps now
   sit *after* the base rules, and the lock asserts that ordering rather than merely that the
   declarations exist — which is what let this through.
2. **⚠️ A class-name collision.** `.os-ct` was the retired book-spine title class, and reusing the
   ref's `.ct` name for the counter column broke the Phase 2 tombstone lock *for a real reason*.
   The column is `.os-counter` now: a class that has meant two things is a class nobody can grep.

## Deviation, deliberate: the breakpoints

The pack asks for ≤1440 and ≤1240. **This page's own ladder is 1360 / 1240 / 1200 / 1024**, set in
the one-screen build. The steps ride the page's ladder — padding and figures at **1360**, icons at
**1240** (exactly the pack's number, because the page already breaks there). Matching the ref's
1440 would tighten the card while the greeting beside it stayed at 46px until 1360, putting the
card out of time with its own row. One rhythm per page. Moving the whole page onto the ref's ladder
is a separate change if you want it.

Also measured and left alone: the columns differ by exactly **1.0px** (312.95 / 313.95 / 313.95).
That is the divider border on columns two and three under `flex-basis: 0` — the same construction
the ref uses, and invisible.

## Browser verification (jsdom cannot do any of this)

| | 1280×800 | 1440×900 | 1920×1080 |
|---|---|---|---|
| vertically centred on the greeting | ✅ 0px offset | ✅ 0px offset | ✅ 0px offset |
| fills the remaining width | ✅ exact | ✅ exact | ✅ exact |
| columns even | ✅ within 1px | ✅ within 1px | ✅ within 1px |

- **No hover lift** — hovered for real (`:hover` confirmed true) and the shadow, transform and
  border are identical to rest.
- **Duplicate agents pill gone** — the pill row holds tenure and achievement only.
- **Zero-state** — three counters read `0`, **no chip elements at all**, no layout break.
- **≤1240** icons hidden, figures 21px, labels and figures intact. **≤1024** header stacks, card
  full width beneath with a 4px top margin.

## Gates

tsc · `vite build` · full Vitest — **212 files, 3374 passing**.
