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


---

# Phases 1–6 — the run

**DEPLOYED to dev, and the acceptance re-run against the deployed site: 9 of 9 green, clean
console at 1280 · 1440 · 1920 · 2400.** https://scriptally-dev.web.app/todo/calendar

Built and pushed from a throwaway worktree at my own HEAD. `src/` happened to be clean at the
moment of the deploy, but another session had a broken `src/marketing/FoundingSignup.tsx` in the
tree for most of Phase 3 — a dev deploy builds from the working tree, and the worktree removes
the race rather than betting on the timing. It is removed and its copy of `.env.local` deleted.

Nothing is queued for prod. No rules changed; hosting only.

## The seven answers

### 1 · Deployed, and why
Above.

### 2 · What the board gained at 900px

| | before | after |
|---|---|---|
| **zone, at rest** | 542 | **593** (+51) |
| **zone, scrolled** | 542 | **646** (+104) |
| chrome above the board | 335 | **284** |
| masthead | 102.89 → 57 settled | 94 → 57 settled |
| second control row | 42.25 | **gone** |
| `.wpg-reclaim` on settle | 16 → **77.89** | 16 → **16** |

Identical at 1280 and 1440. Three sources, in order of size:

* **The settle's reclaim now reaches the board** (+53 when scrolled). It sheds 37px of masthead and
  was handing every pixel to `.wpg-reclaim`, whose pad exists so a SCROLLING scroll row keeps its
  `scrollTop`. This page is `fill`: its scroll row does not scroll at all, and the only scrollport
  is the board's own zone, whose `scrollTop` is unaffected by its `clientHeight` growing. The
  opt-out is declared on the spacer itself, where the `calc()` reads it, and is scoped to this
  page — **the shared mechanism is untouched**.
* **The second control row is gone** (+42). Filters, sort, search and count are on the tool row.
* **The masthead lost its subtitle** (+9). It read *"26 Aug – 1 Sept — every relationship, and the
  time between"*; the day header names all seven dates and the pager offers Today.

**What I did NOT do, and the figure if you want it.** `.wpg-toolband` is **62px around a 34px
row** — 28px of padding on shared chrome that every workspace page wears. Tightening it here is a
one-line page-scoped override worth ~14px, and it is exactly the "pages came to disagree about
their top edge" fault. Your call, not mine.

### 3 · The duration thresholds as built

`FRESH_MAX_DAYS = 7` · `SETTLED_MAX_DAYS = 21` · long is 22+. Named tokens in `journeyBars.ts`,
one place, so a ruling is one edit.

**They probably should differ by task type, and I have not made them.** A fortnight sitting on a
*full request* is a writer who has not finished a draft; a fortnight sitting on a *nudge* is a
writer who has not sent one email. The same weight says the same thing about both, and one of them
is not urgent at all. If you want it split, the shape is a per-`TaskType` table beside `PILL_BY_TASK`
rather than three globals.

### 4 · Which edge cases are covered only by unit tests

A census over **thirteen weeks** of the harness account, on the deployed build:

| v5 rule | rendered? | count |
|---|---|---|
| the journey's events (nodes, in and out) | **yes** | 28 |
| a closure stops the bar dead | **yes** | 3 close nodes |
| two manuscripts, one agent, two lanes | **yes** | 26 rows |
| a past week — dashes solid, waypoints passed | **yes** | 16 rows |
| events on adjacent days leave nothing between | **yes** | Marcus Reed, two on one day |
| the expected-window waypoint | **yes** | 10 |
| the three duration weights | **yes** | 37 fresh · 19 settled · 35 long |
| **no reply time recorded — the dashed rail** | **NO** | every agent on the account states a window |
| **R&R and offers — the open-ended fade** | **NO** | no R&R and no offer on the account |
| **the hatched overrun** | **NO** | see below |
| **a snooze — the `Back on` waypoint** | **NO** | no sleeping flags on the account |
| **the reminder waypoint** | **NO** | no query has `nudgeDate` set |
| **an empty week** | **NO** | none of the thirteen is empty |

Those six are locked in `journeyBars.test.ts` — 42 cases — and **have never been drawn on a real
page**. That is the honest state, not a gap I can close from here: each needs data the account
does not hold, and seeding it would spend a fixture.

⚠️ **The overrun's absence is the interesting one, and it is correct.** It needs a your-move
stretch whose resolved expectation has already passed. The account has 35 long-weight stretches
and not one of them qualifies, because they are *"send the full"* tasks — the agent set no
deadline for the writer, so there is no expected date to run back to. **The overrun is right to
draw nothing.** Chasing that contradiction is what found the duration bug in Phase 6c.

### 5 · The pane squeeze still reproduces
`.tpn .ws` is unchanged: `grid-template-columns: minmax(0, 1fr) 288px`, **no container query and no
media query** (`taskPane.css:690`). Any mount narrower than about 600px squeezes the steps column
to whatever is left. The calendar's Do column carries a page-local fold from the last run
(`.tl-do .tpn .ws`, 0-3-0) and measures **one column at 428px**, so the calendar is not where you
saw it. Everywhere else the component is exactly as it was — it is a pane change, not a calendar
one, and I have not touched it.

### 6 · From v5: what I could not implement, and what I did instead

* **The overrun is not to scale, and that is forced rather than chosen.** v7 draws a 41-day overrun
  inside a seven-day week with its waypoint captioned *"Expected 16 Jul"* — two months before the
  week it sits in. It cannot be to scale, and on a window that starts today the whole of it is in
  the past, so a to-scale stretch would have zero width. It renders as a fixed lead-in
  (`OVERRUN_SPAN = 2` days) carrying the **true count**, with a waypoint naming the real date. The
  hatch is a marker; the number is the fact, and the number is the half that has to be true.
* **`GAP` is v5's own 0.34** and `MIN_SEG` is `0.33` — chosen so that two events one day apart
  (`1 − 2 × GAP = 0.32`) fall under it, which is that rule expressed as a number rather than as a
  special case.
* **Everything else in v5 is built**, including the modifier vocabulary verbatim: `openleft`,
  `stops`/`resumes` as round caps, `future`, `norail`, `openend`'s mask fade, the second lane, and
  the past-week treatment.

### 7 · What remains unverifiable, and cross-session

* **"A completion still raises one toast with Undo" is NOT verified on the page.** It needs a probe
  that presses a live primary, and the standing rule is that such a probe acts only on a card the
  harness created. The wiring is byte-identical to the version verified two runs ago — same
  `useTaskCommit({ flash, rememberUndo: remember, confirmAsk, openFlow })`, same `useTodoToast`,
  same toast render, same `quickDone` handed to `FocusFlow` — and the workspace still opens from a
  your-move bar with the pane mounted (measured: Do 430 · Read 390 · Know 300, 45 conversation
  rows, no scrim, Escape returns). The recipe is unchanged: create a dated task on `/todo`, open it
  from the pinned row, press the primary, assert one toast carrying Undo, press Undo — **and do not
  navigate before pressing it**, because the toast *is* the undo.
* **The six unrendered edge cases above.**
* **The scrollbar**: 0px at every width; Chromium follows the macOS overlay setting and nothing
  overrides it. A classic-scrollbar question needs your own browser.
* **Single engine** (Chromium), and **reduced motion is emulated**, not a real device setting.
* **Cross-session.** `src/marketing/FoundingSignup.tsx` was another session's mid-edit for most of
  Phase 3 and made `tsc` red; my files typechecked clean throughout and nothing of theirs was
  staged. It was fixed by its own session before Phase 4. Two locks outside my territory were
  retargeted with their laws stated — the four-pages-share-a-column lock, which expressed itself as
  an exact `className` string and could not admit a page-scoping modifier beside it, and the
  one-derivation lock, which asserted a whole call on one line and went red over a reformat.

## Three faults worth carrying forward

**1 · The side walk was going the wrong way, and only a screenshot could tell.** Carrying the
current side backwards through every node made each earlier stretch equal to the one after it
unless the node itself flipped it — so a row with two sends in a week drew **"Your move" three
times running**. After you send a partial it is plainly *their* move. Nine acceptance cases were
green over it, because every piece was individually correct and the fault was in the sequence.
Forwards, each stretch is stated by the event that opened it.

**2 · A negative check is satisfied by an empty set, and this one was.** The break assertions —
no overlap, no hairline, no empty row — ran on the current week, which holds **0 nodes and 1
waypoint**. Every one passed having measured nothing. The case pages back to a week with 14 nodes
and carries a population floor: **56 nodes and 12 waypoints** measured across the four widths.

**3 · Two facts that cannot both be true are worth more than either.** 35 stretches in the heaviest
weight and not one expectation passed. That contradiction — surfaced by a census nobody asked for
— found that "since it became your move" was falling back to the **send date** whenever the
hand-change fell outside the visible week, which it usually does. `lastStatusChange` is the stamp
for when the current status began, and it was already there.

Two more the pictures found: every piece of a run restating the label, so one week's journey said
*"Your move · 3 days"* three times; and two events on one day drawn at identical coordinates, so
one of them simply disappeared with nothing saying it had.

## Still open — rule after testing

Built to the default in every case; none resolved here.

1. **Does a paused / on-hold state exist in the model at all?** Built: **no such state.** Nothing in
   `QueryStatus` expresses it, and a snooze pauses the writer's attention rather than the query.
2. **Does a withdrawn-by-you closure look different from a rejection?** Built: **no — a closure is a
   closure.** Both draw the same `×` node and stop the bar dead; `dir` still differs underneath
   (`WITHDRAWN` is `out`, `REJECTED` is `in`), so distinguishing them later is a paint change only.
3. **Waypoint captions on crowded rows.** Built: **always shown.** Not yet a problem on this data —
   the most any row carries is one. ⚠️ **Its sibling has already bitten**: two NODE captions on one
   day overlapped, because the nodes did. The nodes are spread now and their captions with them; if
   captions start colliding at three or four to a row, the same treatment is where to look.

One more, not on the list. **The row head's manuscript line renders only above one book.** Naming
the single obvious one is a line that says nothing on a row with 80px to spend — but it does mean
a one-book row never states which book, which is fine today and would not be if the head ever
loses its agency line.
