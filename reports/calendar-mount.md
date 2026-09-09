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
