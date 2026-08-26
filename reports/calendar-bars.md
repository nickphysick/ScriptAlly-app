# Calendar — journey bars, and one control row

One continuous bar per agent × manuscript, changing colour when the move changes hands, breaking
around events, and gaining weight the longer it has been the writer's move.

---

## Phase 0 — recon (read-only)

Ran against `main` at `42b588df`, worktree level with `main`. `src/` is clean; the only dirt is
another session's `reports/` and `run-artifacts/` files, untouched.

### Red gate — clear

* **No other worktree is in this territory.** Six exist; none has a modified file matching
  `calendar|todoTimeline|calLook`.
* **Nothing of mine has been touched since my last commit.** `git log 3a5aba4f..HEAD` over
  `todoTimeline.ts`, `TodoCalendarPage.tsx`, `todoCalendar.css`, `calLook.measure.ts` and
  `todoCalendar.ts` returns nothing. The five commits in between are the waitlist email, a
  measurement catalogue and a CLAUDE.md update.
* **The task pane mount is unchanged** — `useTaskPaneSession(paneCard, paneHost, CAL_PANE_PREFIX)`
  → `<TaskPane journey onPrimary>` in the Do column.

### 1 · What `timelineRows`/`timelineBands` emit today, and what changes

Today the row is a **bag of independent objects**: `TimelineItem[]` (each a point at a whole-day
`idx`, with a `lane` and a `spanTo`) plus a flat `TimelineBand[]` keyed back by `rowKey` (each a
whole-day `fromIdx`/`toIdx` span). Both are packed into lanes by one greedy pass, and both render
as separate pills.

Three things change, and none of them reaches below the view:

* **Positions become fractional days.** An activity is stamped with a DAY and nothing finer — the
  day panel's own note says so — so an event's honest position is the **middle of its day**,
  `dayIndex + 0.5`. Every node and waypoint sits there; segments stop `GAP` short of it. Whole-day
  `idx` survives for the things that are still points (the writer's own tasks).
* **Bands become segments of one bar.** A `TimelineBand` is currently a whole reply window. A
  `Segment` is a PIECE of the journey between two interruptions, carrying which side holds the move.
  The bar is the sequence; the segments are what is left of it after the breaks.
* **Lanes stop being packing and start being manuscripts.** The row key becomes agent × manuscript,
  but the ROW HEAD stays per agent — two manuscripts is two lanes under one head, which is what v5
  draws (`tall` rows with an `ms` list in the head and `l2` on the second lane's parts).

### 2 · Where "whose move is it" already lives — one source, not two

**`getPrimaryAction(status).ballHolder`** (`src/lib/queryPrimaryAction.ts`) — `"writer"` or
`"agent"`. It is already what this page reads twice over: `agentTurn` (the row-head dot) calls it,
and `queryBucket` is the same split named for filtering. The your-turn cards exist *because* it
returns `"writer"`.

`side: 'theirs'|'yours'` is therefore **that value renamed for the view**, and nothing else. No
second derivation, no status list written out again.

### 3 · What supplies each boundary — all reachable, no new read

| Boundary | Source | Already held? |
|---|---|---|
| sends, requests, holding replies, closures | `recordDays(activities, queries, agents, range)` → `RecordItem { ymd, dir, label, queryId }` | yes — the page's own memo |
| expected date | `resolveExpectedDate(q, sentMs, agent.responseTimeWeeks, null)` | yes — the band already calls it |
| nudge forecast | **`Query.nudgeDate`** — *"when they plan to nudge"* (`types.ts:632`) | yes — `queries` |
| snooze return | `TaskFlag.snoozedUntil`, via the `snoozed` family `calendarDays` already places | yes — `taskFlags` |
| whose move | `getPrimaryAction(q.status).ballHolder` | pure |
| closure | `RecordItem` whose label is `Closed` (`RECORD_STATUS`) | yes |

`recordDays` returns only events **inside the range**, which is exactly what a bar in a seven-day
window needs. Nothing new is read and nothing below the view changes.

### 4 · Chrome today, measured at 900px

| | rest | scrolled |
|---|---|---|
| `.wpg-mast` | **102.89** | **57.00** |
| `.wpg-toolband` (holds `.tpl-tools` at 34) | 62.00 | 62.00 |
| `.tl-bar` (the filter row — a SECOND control row) | **42.25** | 42.25 |
| `.wpg-reclaim` (the spacer) | 16.00 | **77.89** |
| **board** | **543.86** | **543.86** |
| **zone (scrollport)** | **542** | **542** |
| chrome above the board | **335** | 335 |

Identical at 1280 and 1440; the bar does not wrap at either. **900 − 542 = 358px of chrome**, which
is last run's figure confirmed.

⚠️ **The settle recovers 45.89px and gives every pixel of it to the spacer.** `.wpg-reclaim` is
`calc(var(--wpg-chrome-gap) + var(--wpg-reclaim-pad, 0px))` and goes 16 → 77.89 as the masthead goes
102.89 → 57. That compensation exists so a SCROLLING scroll row keeps its `scrollTop` — and this
page is `fill`, so its scroll row does not scroll at all. On a fill page the spacer holds space for
a compensation that cannot be needed. **Phase 2's third job.**

### 5 · Reduced motion, and where animation belongs

`todoCalendar.css` already ends with
`@media (prefers-reduced-motion: reduce) { .tl-chip, .tl-band, .tl-kind, .tl-mbtn { transition: none } }`,
and the shell honours the query in several places (`.wpg-chevfold`, the rail).

⚠️ **The override must sit immediately after the rule it overrides.** A media query confers no
specificity, so at equal specificity the LATER declaration wins — this repo has already shipped a
`transition: none` that lost to a rule four hundred lines below it. Today's block is at the end of
the file and after every `.tl-*` rule, so it is correct by position; the pulse's own override goes
directly beneath the pulse.

⚠️ **And `var()` inside `@keyframes` fails silently in this setup** — no error, no animation, no
warning. v6's `@keyframes breathe` uses literal hexes for exactly this reason and so will ours.

---

## The refs, and the two places they need a decision

All four read before writing anything.

* **v4** is the bar grammar; **v6** settles the waiting treatment as **C — white fill `#fff`, sage
  hairline `#dfe6dc`, soft shadow, `breathe 4.2s ease-in-out infinite`** with literal colours in the
  keyframes.
* **v7** gives three weights: `y1` fresh `#fdf3ef`/`#eed8ce`/`#8a5442`, `y2` settled
  `#f3e0d6`/`#e8c8bc`/`#7a4636`, `y3` long-standing `#eec9ba`/`#dba892`/`#5f2a1c` at weight 600,
  plus the hatched `.overrun`.
* **v5** carries the nine rules with their modifiers: `openleft` (dotted left, square), `stops`
  (round right cap), `resumes` (round left cap), `future` (dashed right, square), `norail`
  (transparent, dashed, fully round), `openend` (mask fade), `l2` (second lane), and a `past`
  treatment where dashes become solid and waypoints go `opacity: .55`.

**Two things the refs cannot settle, decided here and flagged:**

1. **The overrun cannot be to scale, and that is forced rather than chosen.** v7 draws
   `over:[0, 3.2]` with a waypoint captioned *"Expected 16 Jul"* — a date two months before the
   week it is drawn in. A 41-day overrun cannot be drawn to scale in a seven-day window, and on a
   window that starts today it would have zero width, because the whole of it is in the past. It
   therefore renders as a **fixed-fraction lead-in** at the bar's left, hatched, `openLeft`, with
   the true count stated on it (`41 days your move`) and a waypoint naming the expected date. The
   hatch is a marker; **the number is the fact**, which is the half that has to be true.
2. **`GAP = 0.34` day is the ref's own constant** and is taken as the starting token, per the brief.

