# Calendar — Run C: mount the board as Query Centre's Calendar view

**Phase 1 landed and proved. Phases 2–4 remain.** No deploys.

---

## False premises, at the top

### 1. ⚠️ "Row count equals the filtered query count" cannot hold, and must not

Phase 1's assertion list asks for it. The row model that makes **Phase 3 possible** forbids it.

Phase 3 requires that the same wait renders identically on both boards, *including row height*. A
row's height is `--row-h × --lanes`, so the lane COUNT has to agree — and To-do's model is **a row
per agent, a lane per manuscript**. One row per query would make every cross-page height comparison
a coincidence.

So the adapter groups by agent, and the honest conservation claim replaces the stated one:

> every query that draws something appears in **exactly one lane** — nothing dropped, nothing doubled

which is locked, along with the lane total (`rows.reduce(lanes) === 3` for three drawing queries
across two agents).

### 2. ⚠️ The gate is 106, not 109 — and the difference is a bug I fixed in Run B

Run B reported 109 passing. That number included **my own capture file**, which was then named
`calDomCapture.measure.ts` and so matched the `cal*.measure.ts` glob. Run B renamed it out
(`boardDomCapture.measure.ts`), so this run's total is back to 145 cases: **106 passed / 39
failed**. 106 is the original baseline's 105 plus `calScheme62 (3)`, which was only ever a sign-in
flake.

**Nothing regressed between the two numbers.** Same 39 reds, name for name.

### 3. `before` was NOT re-taken, because it is write-once and it did not need to be

The brief says to capture `SA_DOM_TAG=before` first. That reference already exists and is
committed, and the guard refuses to overwrite it. Instead a fresh `c-before` was taken and diffed
against it: **identical at all three widths, HTML and geometry.** So the reference still describes
`main`, including the six `dash:` commits that landed since (one of which touches
`src/components/todo/taskTicket.css` — the grid view's ticket, not the board, now measured rather
than assumed).

---

## Phase 1 — the Queries adapter · DONE

`src/lib/queryTimelineRows.ts`. From the page's own filtered queries, its agents and its activities:
build one `LaneInput` per (agent, manuscript), call `laneBars`, return `{ rows, barsByRow }`.

### It computes no geometry, and that is locked as a source claim

A bar's start, end, state, marks and provenance are decided in `laneBars` and nowhere else. The
lock forbids `getTime(`, `setDate(`, `Date.parse`, `* 86400`, `/ 86400` and `86400000` in the
adapter (comments stripped first — the header explains the ban and names what it bans, which a raw
scan would read as the offence), and requires `laneBars(` to be present. **Provenance passes through
untouched**: `NamedEndSource` stays three-valued with the separate `window` fact beside it, because
that is what `laneBars` returns and the adapter never opens it.

### ⚠️ The lane-winner rule was EXTRACTED rather than restated

To-do's law — *"one query speaks for a lane, and a live one always outranks a finished one"* — had
one implementation inside `todoTimeline`. Copying it into the adapter would have given two boards
two answers to one question, and a disagreement there changes a **lane count**, which changes a row's
HEIGHT: the two pages would not differ in detail, they would be visibly different objects.

`laneWinner(held, candidate)` now lives in `journeyBars` and **both callers read it**. To-do's own
block was replaced by a call to it — a pure refactor, and the DOM proof below is what says so.

### ⚠️ Carried behaviour worth Nick knowing: a closed query with no recorded close draws NOTHING

Measured directly against `laneBars`: the same query returns **one segment** as `Queried` and
**zero** as `Rejected`. A terminal bar needs a close EVENT to end on; with none there is no end, and
the board draws nothing rather than inventing one.

This is the board's existing law and it reaches Query Centre unchanged. It matters more here,
because the Queries list shows closed queries and a reader may expect them on the calendar. **It is
carried, not introduced, and this run may not change it** — the two boards must agree. Locked as
its own case so it cannot be "fixed" by accident.

### Tests — 7, green

Conservation of queries across lanes · the shared lane-winner rule · row identity through
`agentPrimary`/`agentSecondary` · the closed-with-no-close law · a row with nothing in the window is
not drawn · a query with no agent still gets a row rather than vanishing · the no-geometry source
claim.

**Two of the brief's assertions are not yet covered** and land with Phase 2, because both need a
drawing closed query and an override, which need activity fixtures: *"a query with an expected-reply
override reports the override's source, not `window`"* and *"a closed query's bar end equals its
close date"*.

## Proof so far

| check | result |
|---|---|
| To-do DOM + geometry vs the write-once `before`, after the `laneWinner` extraction | **identical**, 1280/1440/1920 |
| `cal*.measure.ts` | **106 passed / 39 failed** — zero newly red, zero newly green, 0 sign-in flakes |
| tsc | clean |
| production build | read, no diagnostics |
| unit suite | 7,698 passed across 465 files |

⚠️ A transient `Errors 1 error` line (with zero failed tests) appeared twice, both times while a
Playwright lock run was competing for CPU. It does not reproduce on an unloaded machine — three
clean runs since, the last `exit 0`. Recorded rather than claimed never to have happened.

---

## What remains

**Phase 2 — mount.** The Calendar view renders `TimelineBoard` with these rows, on the page
parchment with no well, under the same toolbar. Wiring: filter/search narrow, sort orders, group
sections, row click opens the drawer at Tracking. The placeholder goes.

⚠️ **The well's own comment states a law this run must change.** It reads: *"Grid, List, Board and
the Calendar placeholder are all inside it, so switching view changes what is IN the well and never
whether there is one."* The placement rule says the well is Grid and List only. The comment has to
be rewritten, not left standing.

⚠️ **AND THE RULE COVERS THE BOARD VIEW TOO, which this run was not asked to redesign.** *"Board and
Calendar render on the page parchment with no recessed well"* — the Board currently renders inside
the well (`.qcc-boardwrap`). Phase 2's assertions name Calendar only. Implementing the rule as
written changes a shipped view's ground; **flagged for Nick rather than done quietly**, and the
screenshots will show it either way.

**Phase 3 — prove both boards**, including the cross-page geometry comparison for one shared wait.

**Phase 4 — walk Run A's 40 numbered behaviours** and carry the five To-do follow-ups forward.


---

# Phase 3 — both boards proved

## ⚠️ The assertion this whole sequence existed for: the same wait, drawn the same way

`tests/e2e/qcCalendarParity.measure.ts`. It joins the two boards on `data-qid` and compares, for
**every query that draws on both**:

- the bar ENGINE's own outputs — `state`, `holder`, `namedend`, `from`, `truefrom`, `trueto` —
  which must be **identical**, not merely close. If those agree the boards did not just land in the
  same place, they made the same decision.
- the bar's start and end, its row's height, and every mark on the row.

**Result: 23 queries draw on both boards, all 23 shared, and all 23 agree.**

### It failed first, and the failure was my instrument rather than the boards

Thirteen bars reported a START disagreement — **every one of them exactly 1.435px, and every one
carrying `fadeL`**. The numbers gave it away: `0.007426 × 808 = 6.000` and `0.005650 × 1062 =
6.000`. Both boards were insetting the bar by **the same six real pixels**; a left-faded bar carries
`left: 6px` so its dissolve has somewhere to happen.

**A bar's left edge is two terms in two different units** — `pct(from)`, a FRACTION of the lane,
plus a fixed pixel decoration. To-do's lane is 808px (it carries a 232px sidebar) and Query Centre's
is 1062px, so comparing the SUM as a fraction called two identical renders different. The check now
compares the day term as a fraction and the decoration in pixels, each in its own units.

Worth stating plainly because the shape recurs: **the first red was a false one, and taking it at
face value would have meant "stop and report a disagreement" about two boards that agree exactly.**
The tell was that all thirteen differed by the identical amount — a real divergence does not
produce one number.

Positions are compared as a fraction of the lane rather than in raw pixels, and that is not a
weakening: the two pages give the board different widths, so a raw pixel comparison could only ever
fail and would be measuring the page's chrome rather than the board's derivation. The tolerance is
stated in pixels **of the narrower lane**, so "within half a pixel" means what it says on the
tighter of the two.

## To-do, unchanged

| | |
|---|---|
| `.tl` HTML + geometry vs the write-once `before` | **identical** at 1280 / 1440 / 1920, after every one of this run's six extractions |
| the winbar's own `outerHTML` | **identical** (603 bytes, byte-for-byte, before and after the swap) |
| `cal*.measure.ts` | **106 passed / 39 failed** — the same 39 name for name, nothing newly red, no sign-in flakes |

⚠️ The winbar had to be captured SEPARATELY: it sits outside `.tl`, so the board capture would have
passed a clean diff over any change to it. **A capture scoped to a subtree proves nothing about its
siblings** — anything moved from outside the capture needs its own before/after. That hole was open
until it was noticed, and closing it is the general rule worth keeping.

*(A later capture shows one extra `style=""` on the search input — a Playwright artefact from a run
that had interacted with the page, not a product change; the clean probe is 603 = 603.)*

## Screenshots — `reports/calendar-mount-shots/`

`calendar-loaded`, `calendar-grouped`, `calendar-filtered` and `todo-board` at 1280, 1440 and 1920.
Grouped by Status draws **10 dividers** at every width; ungrouped draws **0**; the page's own search
narrows the board **21 rows → 0** on a term that matches nothing.

⚠️ **The Calendar holds no view on grouping, and that is deliberate.** `VIEW_DEFAULTS.calendar` sets
a SORT and no group — *"a date surface: it orders by when things were sent and holds no view on
grouping"* — so it inherits whatever the last view left. Arriving from Grid it is ungrouped. I first
read that as a wiring gap and it is not; the grouped shot sets `Status` explicitly rather than
assuming a default the table does not claim.

---

# Phase 4 — the inventory walked

Run A's inventory, item by item. **Nothing is `lost`.**

### A · Geometry and scale — all CARRIED
A1 one 90-day window · A2 today at the centre (`todayAtOf`) · A3 the week pager (`WEEK_STEP`, shared)
· A4 `cqw` against `--tl-days` · A5 lane index as data · A6 row height is density, bar height is not
· A7 two densities · A8 `--row-h × --lanes` · A9 stage gates in days · A10 the 55px non-sticky rail
· A11 the unconditional month tier · A12 one scrolling region · A13 the isolation and z ladder.
All rendered from the same `TimelineBoard`; A2/A4/A5/A8 asserted directly by the parity check.

### B · Marks and bars — all CARRIED
B1–B14. The parity check asserts B1 (the card spans its own dates), B7 (open edges — it is the
`fadeL` inset that produced the false red), and every mark's position. B2/B3 (marker kind and the
four faces) come from `journeyBars` unchanged. B9/B10 (three-source provenance, one `namedEndFor`)
pass through the adapter untouched and are asserted identical as `namedend`.

### C · State — all CARRIED
C1 ten bar states · C2 holder from `side` · C3 family never from age · C4 the two silences ·
C5 weight tiers · C6 `overdueSpan` · C7 `Nudged {date}`, never a count · C8 the pill vocabulary.
`state` and `holder` are asserted identical across the boards for all 23 shared waits.

### D · Rows, sections, tabs, sorting
| | |
|---|---|
| D1 five tabs | **To-do-only** — Query Centre has its own five filter tiles |
| D2 four group modes | **ADAPTED** — Query Centre groups by its own `gridGroup` (`turn`/`status`/`agency`/`month`), read through `queryCardFacts` |
| D3 four sort keys | **ADAPTED** — the page's own Sort orders `sortedList`, which the board draws |
| D4 six sections | **To-do-only** — they are To-do's urgency tiers |
| D5 facets | **To-do-only** |
| D6 a group is a divider | **CARRIED** — 10 dividers measured |
| D7 nothing divides the rows | **CARRIED** |
| D8 tasks are bars | **To-do-only** — there are no tasks here |

### E · Interaction
| | |
|---|---|
| E1 bar click + keyboard | **ADAPTED** — opens the query drawer (`?q=…`) instead of To-do's card |
| E2 marker click | **CARRIED** |
| E3 nested control stops propagation | **CARRIED** |
| E4 hover is lift and reveal | **CARRIED** (CSS); the row-level reveal has nothing to reveal here |
| E5 the one door | **ADAPTED** — the drawer is Query Centre's one door |
| E6 Card C | **To-do-only** — portalled from that page; the drawer replaces it |
| E7 the drawer | **ADAPTED** — Query Centre's own drawer, at the query |
| E8 drag a task to a new day | **To-do-only** |
| E9 crosshair and `RIGHT NOW` | **CARRIED** — `crossAt` shared and wired |
| E10 actions on the board | **To-do-only** — `requestAction` is optional and unwired here |
| E11 no dissolve, no shadow | **CARRIED** |

### F · Data in
F1 activities already loaded, nothing new read · F2 exchange count over the whole query · F3 no
reply-stated window at this level · F4 the `todoCalendar` helpers — all **CARRIED** through
`laneBars`. F5 (`assembleBoardColumns`) and F6 (task writes) are **To-do-only**.

---

## ⚠️ OPEN DECISION FOR NICK — a closed query that vanishes on the calendar

**Not changed in this run. Inherited, locked, and needing a ruling.**

A terminal query with **no recorded close activity draws nothing**. Measured against `laneBars`: the
same query yields one segment as `Queried` and zero as `Rejected`. A terminal bar needs a close
EVENT to end on; with none there is no end, and the board draws nothing rather than inventing one.

Defensible on To-do, where closed relationships are mostly out of view. **On Query Centre, where
Closed is a visible state with its own filter tile, a query that exists everywhere else and vanishes
on the calendar will read as a bug.**

Two candidate fixes, both deliberately unbuilt:
1. **A zero-length terminal mark at the last known date** — the query appears, with an honest mark
   saying only that it ended, and no invented span.
2. **Excluding un-dated closed queries from the calendar's row set explicitly** rather than
   silently — the calendar states what it is not showing.

---

## Follow-ups for the To-do stream — none of them this run's work

1. **`TEXT_INSET = 14` and `MARK_W = 22`** — dead constants whose comments assert locks that do not
   exist, against tokens saying 13 and 16. Not carried into the shared module, not touched in To-do.
2. **`calBar63` (d7) and (d9)** — both unprovable for want of a **nudged query in the harness
   account's 90-day window**. (d9) reads as a size failure and is not: seven of its eight keys
   measured exactly on target and the eighth was absent.
3. **`calWindow58`** — presses `aria-label="Previous window"`, which the board does not have, and
   its `if (b) b.click()` fails open, so it reports a no-op about a control it never touched. **The
   pager works** — Phase 2 pressed the real `Back one week` and measured exactly seven days.
4. **`calScheme62` (2)** — a v62 claim that the rail is flush with its container's left, which the
   232px sidebar has since invalidated (`expected < 1.5, received 251`). Retarget or retire.
5. **The 39 reds are versioned suites older than the board** (v40–v64 against v65). A case whose
   first assertion fails is silent, so **an unknown number of assertions behind them have not
   executed**; the real coverage is 106 cases, not 145.
6. **`npx vitest run` can exit 1 with zero failed tests** — `[vitest-worker]: Timeout calling
   "onTaskUpdate"`, the reporter's RPC channel timing out under load. Now recorded in CLAUDE.md
   beside the build gate's own "a green exit code is not a clean build" note.
