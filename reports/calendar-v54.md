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


---

## PHASES 1–8 — WHAT LANDED

| § | What landed |
|---|---|
| 1 | The board opens on **Month**; today is the lane's centre at every range and width (0.00–0.01px). ⚠️ **The ref half is HELD** — `timeline-v54.html` was not supplied. |
| 2 | The past wash is **deleted**; today is a drawn 1.5px `#e6c3b4` rule at `z-index: 60`; the rail takes its own stacking context. |
| 3 | A card is the **current wait**; earlier status changes are a **lead-in**; the mask moved to a `.tl-frame` sibling so it can never reach the words; the text sits at **one inset**. |
| 4 | **Clip and open** replaces v40's ladder — the words are kept and the card opens to what they need. The detail drops only where there is nowhere to open to. |
| 5 | The **overdue tint** (flat, hard-edged, spanning the lateness), the **copy** that names it, and the **stir**. |
| 6 | A fifth view for **Tasks**, four **Group** modes, and a memo that had never listed `tab`. |
| 7 | A task is a **point**, not a pill; **ghosts** are a named date past the card's end. |
| 8 | Accepted at six widths × three ranges: 384 cards, worst 1, **zero** marks on cards, **two** insets. |

## FLAGS FOR NICK

**1. Deploy outcome.** See the first line of the run's closing note — recorded at
the foot of this file once the deploy ran.

**2. Which element carried the fade mask before this run, and how many rows it was
blanking.** `.tl-p` — the CARD, which is the element containing the text. Three
rules (`.fadeR`, `.fadeL`, `.fadeL.fadeR`). Measured at 1440 with
`--card-fade: 38px`: **22 of 23 cards masked** (14 `fadeL`, 21 `fadeR`), and
**14 of 23 rows had text inside a dissolving zone** — 26px of ink on thirteen of
them, 4px on the fourteenth, the longest affected line 537px. Worse than the two
rows the brief remembered. The mask is on `.tl-frame` now; the content is a
sibling, unmasked, at opacity 1, asserted over the whole board.

**3. Cards per relationship row, and text-inset variance, before and after.**
Cards per relationship: **1 before and 1 after** — v40 had already settled that.
Text insets: **12 distinct values before** (15, 46, 101, 118, 119, 145, 172, 190,
216, 224, 376, and one card with none), **2 after** across 384 cards at six
widths × three ranges: `flat:13` and `fadeL:42`, and nothing else.

**4. How many cards enter `tight` per range, and the widest one that opens.**
At 1440: Month 10 · 3 months 13 · 6 months 20. Across the whole sweep 266 of 384.
The widest opened card measured **406px** (`agent-seed-agent-11::0`), opening from
942 to 1348 in a lane ending at 1381 — start unmoved, 31–32px of slack between
its last word and its right edge, which is the right margin plus the fade.

**5. The tint — measured span per owed row, and the three samples.** 6 tinted
cards at 1440, 16 untinted. Every tint's right edge is its card's today edge
within 1.5px, and every left edge is the **due date's own x** — computed from a
separately published `dueAt` that no clamp touches — or the card's own left where
lateness began before the window. Three 1×1 screenshots across
`agent-seed-cal-passed865::0` at x 612 / 777 / 941 (the 34px fade excluded at each
end, sampled on a line below the words): **byte-identical**. The hard edge is
confirmed on `agent-seed-agent-4::0` — the pixel at 820 differs from the pixel at
826 either side of a tint starting at 823.

**6. Every lateness string before and after, and the agency confirmation.**

*Before* — eleven forms, and **none of them said "overdue"**: `Closed on {date}`,
`{since} · no reply date given`, `Nudged · remind {date}`, `Quiet for {n} days`,
`{since} · nudge due`, `{since} · reply expected {date}`, `Offer received ·
answer by {date}`, `{asked} {n} days ago`, `{asked} · send by {date}`, plus
`timelineCopy`'s row sentences `Out with {who} — reply expected by {date}` and
`Offer on the table — an answer was due {when}`.

*After* — three derived forms, `{span}` coarsening at 21 and 84 days:
`{prefix} · overdue since {date} · {span}` · `{prefix} · no date promised · owed
{span}` · `{prefix} · reply expected {date} · none yet`.

**Confirmed: no agency-held row can produce "overdue".** Measured over 64 cards
at three ranges — 13 writer-owed, 12 saying the word, **none** of them
agent-held. Proved red by renaming the agency line to use it. ⚠️ And that proof
found the third form was DEAD CODE where I first put it: `barState` sends any
agent-held stretch whose expectation has passed to `quiet` before `theirs` can
see it, so it could never render. It lives in `quiet` now, and `ghost` is split
back out so a 242-day silence still states how long.

**7. Tab counts before and after, and what was double-counted.**
Before: `All —` · `Needs me 9` · `With agents 14` · `Closed 0` against 23 rows.
After: `All —` · `Needs me 7` · `With agents 14` · `Tasks 2` · `Closed 0` = 23.
**The two task rows were inside `Needs me`.** Adding the tab without moving them
would have given 9 + 14 + 2 + 0 = 25 against 23.

**8. Values needed but not pinned; locks proved vacuous.**

*Not pinned, and taken from the prose:* nothing. The BAKED DECISIONS block
covered every value the phases needed. Two existing tokens disagreed with it and
were repinned (`--tl-text-inset` 14→13, `--card-fade-inset` 46→42), along with
`--card-fade` 38→34, `--mk` 22→16 and `--row-h` 62→64.

*Locks proved vacuous by their own red proofs — eight:*
- the wash sweep checked only `background-image`, so a wash reinstated as a flat
  COLOUR passed;
- "no mark sits on a card" passed when the card was restored to the window's
  edge, because then every mark is filtered out and the board renders none;
- the inset set was asserted against itself (filtered by what was measured);
- "it opens to what its content needs" compared the opened width against `--exp`,
  the property that set it;
- "its start does not move" permitted any leftward slide;
- "the detail drops only where there is nowhere to open to" was satisfied by
  nothing dropping;
- the tint's left edge was compared against `lateFrom`, the number that placed it;
- a four-way partition was satisfied by an EMPTY fifth view.

**9. Unverifiable remainder; cross-session observations.**

*Reported unbuilt, each with its reason:*
- **The v54 design ref.** Not supplied. `timeline-v40.html` is held rather than
  deleted — deleting it would leave the territory with no ref at all, and
  authoring a `timeline-v54` myself would put a fabricated artefact under the name
  decisions get signed off from.
- **The Manuscript SCOPE row.** Grouping BY manuscript is a Group mode; scoping
  TO one is a filter the board does not have. The old "All books / By book" row
  was the grouping control mislabelled, and is deleted rather than left as a
  second control for one choice.
- **The ghost's `close` offer at 180 days of `No Response`.** It needs a control
  on a surface this pass does not touch, and the brief frames it as availability
  rather than advice — a copy and placement decision I would be inventing.
- **"Clear of any OPENED card's extent."** An opened card's width is set on
  hover, so the claim needs a hover held while a ring elsewhere in the row is
  measured, and no row on this fixture has both a tight card and a ghost.

*Unreachable on the harness fixture, driven and reported rather than claimed:*
- **An uncut card.** A card is `fadeR` whenever its relationship is still running
  and every relationship on the account is (`Closed` reads 0) — 64 of 64 cut at
  every range. The state is driven and the paint read back.
- **The detail drop.** Narrowest lane 434px, widest content ~406px. Driven by
  narrowing the lane through an injected stylesheet: 13 of 21 cards drop, none
  keeps a painted detail, none loses its pill or headline.
- **A ghost at Month.** Its one named date falls outside a 31-day window, which
  is the second of the three conditions working.

*Cross-session:*
- ⚠️ **`calLook.measure.ts` was 13/13 green before v40 and 7-failed after it, and
  v40 was mine.** The file was not in v40's gate list. Measured at `7afeddff` in
  a throwaway worktree before believing it. Three of the seven assert the cut
  model v40 replaced; the other four are consequences nobody looked at. **They
  are still red** — this run's territory named the file, and its seven cases
  describe a board several rebuilds old. Retiring or rebuilding them is a pass of
  its own, and doing it unattended alongside eight phases would have been the
  worse call.
- **The vitest runner exits 1 on a `[vitest-worker]: Timeout calling
  "onTaskUpdate"`** that names no test and reproduces across runs. 438 files and
  7351 tests pass. Recorded at the top of this report so a later exit 1 is not
  read as a regression.
- **`breaks` in `journeyBars.ts` is still dead** — nothing has read it since v40
  deleted `cutPieces`. Left alone: it is outside this pack's phases.
