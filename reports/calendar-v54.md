# Calendar v54 — the wait, the lead-in, the overdue tint

## PHASE 0 — RECON (read-only)

Worktree assertion: primary tree only, `main`, clean, level with `origin/main`
at `4a65fccc`. Three other worktrees exist (`analytics`, `pkgband`, `ptr`) and
none holds `src/` of this territory. Bundle rebuilt before every measurement.

### Baselines, recorded before anything changed

| Gate | Result |
|---|---|
| vitest | **7341 passed · 3 skipped · 0 failed · 438 files** — but **exit 1**, from a runner-level `[vitest-worker]: Timeout calling "onTaskUpdate"` that names no test and reproduces across two runs. Not a red test; recorded so a later exit 1 is not read as mine. |
| calendar measured (14 files) | **30 passed · 7 failed**, every failure in `calLook.measure.ts`. |

### ⚠️ THE SEVEN REDS ARE v40's, AND THEY ARE MINE

`calLook.measure.ts` runs **13/13 green at `7afeddff`** (the commit before v40)
and 7-failed at `4a65fccc`. Measured in a throwaway worktree on its own preview
server before believing it. **v40 broke all seven and I did not see it, because
`calLook.measure.ts` was not in v40's gate list** — thirteen files were, and that
was not one of them. Three of the seven assert the cut model v40 deliberately
replaced, so they were always going to need retargeting; the other four are
consequences nobody looked at.

| # | Case | Why it fails now |
|---|---|---|
| 1 | `RIGHT NOW is a filter of the one board` | drives a control v40 retired — click times out |
| 2 | `every asking row names what is owed` | `TypeError: reading 'length'` of undefined |
| 3 | `the surface is the pinned one` | `getBoundingClientRect` of null |
| 4 | `the rail is the page's own` | the rail's own column labels |
| 5 | `every part of a row is about a query that row draws` | no asking deed had a live bar |
| 6 | `markers stay clear of every bar on their line` | 17 pairs at −11 to −22px — **marks RIDE on cards since v40**, which is the design |
| 7 | `row height and bar height are independent` | marker sizes `[22]`, expecting the old size |

They are inside v54's territory and this run fixes or retires them, each stated.

### 1. What determines a card's start and end today

- **Start**: nothing. The piece is `{ from: 0, to: barStop }` — every card starts
  at the window's left edge (`journeyBars.ts:968`). v40 made a card the whole
  relationship, so it opens wherever the window does.
- **End**: `barStop = closeIdx >= 0 ? stopAt : liveStop`, and `liveStop` is
  `max(todayAt, goalAt, lastEventAt)` clamped to the window.
- **"The last status change" is already available and needs no new read.**
  `query.lastStatusChange` is read twice in `journeyBars.ts` today — as
  `sinceYmd`'s stamped fallback (`:840`) and inside `closedYmd` (`:1132`), with a
  comment recording that falling back to the send date was measurably wrong.
  Phase 3's `waitFrom` is that field. **No derivation beneath the view layer is
  implicated. Red gate not raised.**
- ⚠️ **NAMING COLLISION, AND IT WOULD PICK THE WRONG FIELD.** The brief lists
  `waitingFrom` among the consumed-never-altered symbols. `waitingFrom` exists —
  in `todoTimeline.ts` — but it is a **row sort key**: the earliest `sentMs`
  across the row's queries (`:940`), i.e. when the relationship went out. It is
  not when the current wait began. Phase 3 must read `lastStatusChange`, not
  this.

### 2. Every place text is positioned relative to a mark or a segment

Five, and Phase 3 makes all of them mark-independent:

1. `contentLeft` — `max(inset, pct(lastMarkAt − sg.from) + mk/2 + 14px)`
   (`TodoCalendarPage.tsx:239`)
2. the `--content-left` inline custom property (`:260`)
3. `.tl-p > * { margin-left: var(--content-left, …) }` (`todoCalendar.css:613`)
4. `--pill-left`, computed in the fit pass from `markLefts(seg)` (`:691–708`)
5. `.tl-p[data-tier="pill"] > *` and its `.fadeL` variant (`css:668–669`)

plus `lastMarkAt` threaded into `Piece` as a prop (`:206`, `:1538`).

**Measured consequence — the "before" for flag 3: the board renders text at
TWELVE distinct insets** — `15, 46, 101, 118, 119, 145, 172, 190, 216, 224, 376`
(and one card with none). Phase 3's single-inset assertion fails on this on
sight, which is the point of writing it as one assertion across all rows.

Cards per relationship row is already **1** (v40), 23 cards over 23
relationships.

### 3. Where the fade masks are, and how many rows they blank

**The mask is on `.tl-p` — the card itself, which is the element containing the
text.** Three rules, `todoCalendar.css:1183–1206`: `.tl-p.fadeR`, `.tl-p.fadeL`,
and `.tl-p.fadeL.fadeR` (one mask with two stops, because a second `mask-image`
replaces the first). The rule's own comment reasons about dissolving *the card* —
correct for the fill, and it takes the words with it.

Measured at 1440, `--card-fade: 38px`:

- **22 of 23 cards are masked** — 14 `fadeL`, 21 `fadeR`.
- **14 of 23 rows have text inside a dissolving zone**: 26px of ink on thirteen
  of them, 4px on `agent-thin-ag-remind`. Longest affected line 537px
  (`agent-seed-cal-soon`).

So it is worse than the two rows the brief remembers: **fourteen**.

### 4. The controls Phase 6 deletes

- **Action column — already gone** (v40 §1). Only a lock naming `.tl-c-ac`
  survives, asserting its absence.
- **Range slider — already gone** (v40 §6). Replaced by the `Display` popover's
  Range row; `TimelineRangeSlider.tsx` became `src/lib/timelineRanges.ts`.
- **`ONE LIST / GROUPED` — LIVE**, as a `Group` row inside the `Display` popover
  (`grouped` state, `TodoCalendarPage.tsx:1127`).
- **`RIGHT NOW` — LIVE as a derived reading only.** The segment is gone; the
  `Needs me` tab is the filter, and `onlyAsks = tab === "needs"` (`:1110`) still
  feeds the count line and the sparse copy.

### 5. Past wash and "past" drop-shadows

- **A past wash IS still drawn.** `.tl-c-tl::before`, width `--tl-past-w`, set
  per row to `pct(todayAt)` (`TodoCalendarPage.tsx:1508`), a gradient behind
  everything in the lane. Phase 2 deletes it.
- **No shadow means "past".** Card shadows are `--card-sh` (resting), a hover
  lift, and `--owed-sh`; `quiet`, `hollow` and `closedp` all set `box-shadow:
  none`. Nothing shades by pastness.

### 6. Every string that names lateness, and where it comes from

All from `labelFor` in `journeyBars.ts` unless noted. **Nothing on the board says
"overdue" today** — that has been the standing law, and Phase 5 amends it.

| Form | Source |
|---|---|
| `Closed on {date}` / `Closed` | `closedYmd` |
| `{since} · no reply date given` | `norail` |
| `Nudged · remind {date}` / `Remind {date}` | `nudgeYmd` |
| `Quiet for {n} days` / `{n} days quiet` / `Quiet` | `quietDays` |
| `{since} · nudge due` / `Nudge due` | nudge fallen due |
| `{since} · reply expected {date}` | agency's `expectedYmd` |
| `Offer received · answer by {date}` | offer |
| `{asked} {n} days ago` | writer-owed, the age of the ask |
| `{asked} · send by {date}` | writer-owed with a named date |
| `Out with {who} — reply expected by {date}` | `timelineCopy.ts:173` (row sentence) |
| `Offer on the table — an answer was due {when}` | `timelineCopy.ts:127` |

The two Phase 5 replaces are the last two `labelFor` rows (writer-owed) and the
agency `reply expected` row.

### Also found

- **`breaks` is dead.** `journeyBars.ts:917` builds a `Break[]` that nothing
  reads — left behind when v40 deleted `cutPieces`.
- **Two pinned values disagree with the brief**: `--tl-text-inset` is **14px**
  against the brief's 13, and `--card-fade-inset` is **46px** against 42. Both
  move in Phase 3.
- **⚠️ `design-refs/timeline-v54.html` WAS NOT SUPPLIED.** The only surviving ref
  is `timeline-v40.html`. Phase 1 is asked to commit v54 and delete every other
  `timeline-*.html`; deleting the one that exists while its replacement does not
  would leave the territory with no ref at all, and authoring a `timeline-v54`
  myself would put a fabricated artefact under the name decisions get signed off
  from. **Held, and flagged.** The BAKED DECISIONS block pins every value the
  phases need, so the run proceeds from the prose.
- **Tab counts before**: `All —` · `Needs me 9` · `With agents 14` · `Closed 0`,
  against 23 rendered rows. They sum (9+14+0 = 23). **Two of the nine are TASK
  rows**, which `tabOf(null, …)` files under `Needs me`. Phase 6 adds a `Tasks`
  tab, so unless `tabOf` stops filing them there the counts become 9+14+0+2 = 25
  against 23 — that is what would be double-counted.
