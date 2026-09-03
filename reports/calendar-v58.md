# Calendar v58 — ghosts, then order, then the ref violations

**Ref:** `design-refs/timeline-v58.html` · 38,379 bytes ·
sha256 `128f1d3fed0fbecd8fe2944344ba2f761d946ba0d74f9300eba232fcf64f1218` · enrolled in
`.refhashes.json`, so `check-design-refs` fails the build if it moves.

**Verified it is genuinely v58 before adopting it** — title reads *"ScriptAlly — Calendar v58 ·
design of record"*, and it differs from v55. That check is not ceremony: the file supplied as the
v55 ref turned out to be byte-identical to v54 apart from its version string, and a whole pass was
spent correcting guesses against a document nobody had read.

---

## PHASE STATUS — the honest table

| # | Phase | Status |
|---|---|---|
| 1 | Ordering + counts | **built · verified · locked** |
| 2 | Action caps + terminal marks | **built · verified · locked** |
| 3 | Cards, chips, facts, hover tips, glide-on-hover | **UNBUILT** |
| 4 | Journeys (track + nodes) + overdue wobble | **UNBUILT** |
| 5 | Window + weekly scroll + today travel-and-hide | **UNBUILT** |
| 6 | Tasks incl. rolled ghost | **UNBUILT** (the double-render defect is already fixed — see below) |
| 7 | Header (ruler) + field + row chassis | **UNBUILT** |
| 8 | Tests | locks (a)(b)(c) written with their phases; (d) already exists and passes; (e)(f)(g) belong to unbuilt phases |

**Phases 3–7 are not started.** The pack put the droppable work first and that is what I built; I am
reporting the rest as unbuilt rather than claiming partial credit. What they involve is a genuine
re-cut of the board's visual language — no agent column (`--agent-w: 0`), the name and facts moving
*inside* the card, chips, the ruler header, `--row-h: 66` / `--bar-h: 44` — not a set of tweaks.

---

## PHASE 1 — ORDERING + COUNTS · built, verified, locked

**Measured before anything changed: one owed row, then SEVEN agency silences, then the rest of the
owed work scattered beneath them** — on a board whose first claim is that the top is what needs you.

Two causes, both a tier that was not being expressed:

- **A named end was ordering a row whether or not it had passed.** A date that has gone is not a
  plan; it is a silence with a date on it. It stays the key where the row is the *writer's* — an
  overdue deed should lead, and the further past the higher — and sinks where nothing is being
  asked of them.
- **Closed was sorting by its key.** The builder sinks a closed row below every live one before any
  key is read; the page's one-list re-sort discarded that. ⚠️ And sinking on the row's `closed`
  **flag** was not enough — that means every query is terminal *by status*, while the board's closed
  rule is wider (an agency stating silence means no, window passed, closes a query still marked
  `Queried`). It sinks on the **group**, which is what the Closed tab is built from.

**Order at load, measured:** 5 overdue deeds (most overdue first) + 2 tasks by date · 11 dated waits
and reminders by date · 4 long silences · 1 closed, last.
**Counts:** 7 + 13 + 2 + 1 = **23** rows on All.

⚠️ **Two rows that look misplaced are correct.** Agents 1 and 2 draw a `quiet` card yet sort among
the dated waits, because each holds a *second* query with a future reply date. The row has something
dated; the card you happen to be looking at does not. Measured, not assumed.

**Locks:** tier ordering (all three tiers proved non-empty first), owed-leads-waiting (both
populations proved), counts sum. **Proved red twice** — restoring the passed-date key reddens two
cases *including its population guard*; sinking on the flag reddens the tier check.

`calOrder56`'s monotonic-key case is retired into `calOrder58`: it pinned the shape of the old
ordering rather than the rule, and went red on a board that had just been made correct. Its other
two cases are untouched.

---

## PHASE 2 — ACTION CAPS + TERMINAL MARKS · built, verified, locked

A card ending on a dated future moment inside the window now carries a **mark on its end edge** and
a **cap centred on that date** naming the deed: **6 at Month, 9 at three months, 10 at six**.
Perfectly paired at every range — no cap without a mark, no mark without a cap, never two of either
on one relationship — because both come from **one test**, not two conditions free to drift.

- **The cap's word comes from the end's own `source`.** `namedEndFor` already tags the date it chose
  as `window`, `sendBy` or `reminder`, so the cap names the deed belonging to the date it stands on.
- ⚠️ **The mark is a child of the card; the cap is a child of the lane** — deliberately opposite.
  The mark is about the *edge*, so it must move with the card. The cap is about the *date*; the two
  coincide today and part the moment a card is clipped.
- ⚠️ **The cap clamps inside its lane** (the ref's `placeText`) — which I had not built until a lock
  caught it hanging half its width outside at the Month range. It reads `offsetLeft`, never a rect:
  the cap carries `translateX(-50%)`, and a rect is the *transformed* box, so measuring that and
  writing `left` applies the shift twice.

**The ghost ring is retired, not supplemented.** Emission, fields, glyph table and kind map all
gone; `calGhost56` is emptied to one case asserting the swap, with a note mapping each of its four
old claims to where v58 states it. ⚠️ That case also asserts the replacement **arrived** — "the ring
is gone" is satisfied by a board drawing nothing, which is what a botched swap looks like. Measured:
**0 rings, 25 caps, 25 marks.**

**And the glyph gap closes with it.** Two moves — send-the-full and resubmit — had no glyph in the
ref and rendered nothing. A cap carries a *word*, so every move can be named and there is nothing to
invent.

⚠️ **One cap kind is unexercised and I am not claiming it.** `window` (19) and `reminder` (6) are
proved; **`sendBy` renders nowhere on this fixture** — the one row carrying a future send-by also
carries a close event in its history, and a card past a closure correctly draws neither. The census
is printed so the monoculture is visible rather than hidden behind a green.

**Proved red three times:** a cap allowed outside the window; a mark on every card; the clamp
disabled.

---

## THE KNOWN DEPLOYED DEFECTS

| Defect | State |
|---|---|
| Ghosts (superseded by caps) | **eliminated this pass** — ring retired, caps and marks in its place |
| Wrong load ordering | **eliminated this pass** |
| Dashed borders on open No Response rows | already eliminated (v56 §3); `calFrame56` locks it and passes |
| The container box around the board | already eliminated (v56 §3) — `.tl-tbl`'s border, radius and clip |
| Tint without a passed due date | already eliminated (v56 §4) |
| Overdue measured from the wrong end | already eliminated (v56 §4) — span is `today − dueYmd` |
| Cards ending on passed dates while open | measured **unfounded** (v56 §4): 33 such cards, every one ends at today's line |
| Tasks rendering twice | already eliminated — one element per date, plus one per roll |
| The Needs-me count | already eliminated (v56 §4) — pill and group now share one test for "due" |

Phase 6 (tasks) is unbuilt as a *v58 re-cut*; the double-render defect it names is already gone.

---

## FLAGS

### 1 · The ref and the pack disagree about the overdue accent bar

The ref emits `class="row owes"` on every overdue row and styles it:

```
.row.owes::after { content:''; position:absolute; left:0; top:9px; bottom:9px;
                   width:3px; border-radius:2px; background:#c98e8a; z-index:4 }
```

The pack says, of overdue: *"No fills, patterns, or accent bars for overdue in this version."*

Both cannot ship. **I followed the pack and left the bar unbuilt** — its sentence is explicitly
scoped to this version and reads as a decision taken after the mockup, while an unused CSS rule is
the ordinary residue of one. **That is a choice I made**, against the pack's own "the ref wins on
anything visual" tiebreak, and it is one rule to reverse.

### 2 · A row whose journey holds a close event while its query is open

`agent-seed-agent-8` carries a future send-by *and* a close event in its activity history. The bar
pass stops dead at a closure, so the card draws neither cap nor mark — correct, and the reason the
`sendBy` cap kind is unexercised. Whether that fixture state is intended I have not judged.

### 3 · Cross-session

- **`src/lib/datePickerHub.test.tsx`** — red since the clock passed 11 August. Renders the picker
  with no value, so it opens on the *current* month against an 11 August floor. Not mine; will
  redden every month.
- **`tests/e2e/mastheadMatrix.measure.ts`** — `tsc` TS2339 on `CARVES.titleSize`, a carve-out the
  masthead session removed. Not mine.
- **`src/test/pageStructure.test.ts`** — appeared red in a full run and is **green alone (26
  passed)**. It times out under load; another session was running Playwright (`tests/e2e/headerFix`)
  on this machine throughout. Imports nothing in this territory; `Queries.tsx` was last touched by
  the masthead session. A contention artefact, not a regression — recorded because a timeout and a
  failure look identical in a run summary.

### 4 · Unverifiable here

- Single-engine: every measurement is Chromium.
- The `sendBy` cap branch (above).
- Phases 3–7 are unbuilt, so none of locks (e), (f) or (g) exists yet.

---

## GATES

| Gate | Baseline (recorded first) | After |
|---|---|---|
| `tsc --noEmit` | 1 error (`mastheadMatrix`) | 1 error (same, not mine) |
| `vite build` (whole output read) | clean | clean |
| `vitest`, machine quiet | 7359 passed · 1 failed (`datePickerHub`) | **7358 passed · 2 failed** — `datePickerHub` plus the `pageStructure` timeout above, green in isolation |

---

## DEPLOY AND PUSH

```
firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev
```

| | |
|---|---|
| Bundle | `index-Bpmzns_T.js` |
| Verified | served hash **matches** the local build |
| Pushed | see below |

---

## ⚠️ THE FULL CALENDAR SWEEP IS UNREADABLE THIS RUN, AND HERE IS THE EVIDENCE

**Another session was running Playwright (`tests/e2e/headerFix`) on this machine throughout.**
Two of its shells were still waiting when I checked at the end.

| Run | Normal | This run |
|---|---|---|
| Full `cal*.measure.ts` sweep (62 cases) | ~9 min | **2.7 hours** — 49 passed, 13 failed |
| My four phase files (10 cases) | ~60 s | **16.6 min** — 9 passed, 1 failed |

Every failure in both runs is a **timeout or a page that never loaded** — `page.goto`,
`page.evaluate`, `page.waitForTimeout`, `element(s) not found` — not one is an assertion about the
board. `src/test/pageStructure.test.ts` behaved the same way: red in a full vitest run, **green
alone, 26 passed**.

**A timeout and a failure look identical in a run summary**, which is precisely why I am reporting
the numbers and the cause rather than either claiming a green or reporting thirteen regressions.

**What IS verified** — each run repeatedly, in isolation, while the machine was quiet:

| File | Result |
|---|---|
| `calOrder58` (3 cases) | 4 passed |
| `calCaps58` (3 cases) | 4 passed |
| `calGhost56` (retirement) | 2 passed |
| `calOrder56` (2 surviving cases) | passed |

plus six mutation proofs, each reddening the lock written for it and restored after.

**The remedy is the measurement worktree** this repo already records for exactly this: a detached
worktree with its own `vite preview` port, so the two sessions stop fighting over one bundle and one
server. I did not build one here — it is the right first move for whoever picks up Phases 3–7, and
the sweep should be re-read there before anything else is concluded from it.

---
---

# v58b — the completion pack

**Ref unchanged and re-confirmed at Phase 0:** `design-refs/timeline-v58.html`, sha256 `128f1d3f…`,
title *"ScriptAlly — Calendar v58 · design of record"*, hash-guarded.

**Phase 0.5 — the measurement worktree was built and every gate ran there.** `/tmp/sa-v58`, its own
`vite preview` on port 4460. The contention is gone: **20s for a lock that took 16.6 minutes** in the
previous run.

## Phase status

| # | Phase | Status |
|---|---|---|
| 1 | **The re-cut** | **built · verified** — with two named gaps below |
| 2 | Re-seat ordering + counts, caps + marks | **verified on the new chassis**; the imperative-tier lock is **unbuilt** |
| 3 | Tasks | the **duplicate-label defect is fixed**; the full re-cut of the task point is **unbuilt** |
| 4 | Journeys (track + nodes) | **UNBUILT** |
| 5 | Tests + housekeeping | locks re-seated as each phase broke them; the stale `cal*` reds are **not** swept |

## Phase 1 — what landed

- **The agent column is gone** — `--agent-w: 0`, `--tl-nm-w: 0`, and the rail's own cell removed. That
  cell was the last thing holding the column open: the rows had already lost theirs, so the lane sat
  **293px in from the board's edge with nothing beside it**. Lane now 283→1381 of an 1100px board.
- **The identity rides the card** — dot, name, role-worded fact, status chip, in the ref's
  `.body > .bwrap > dot + .gstack + .chip`. The frame stays an **empty sibling** carrying the
  background, border, radius and fade masks, because a mask may never touch an element holding text.
- **66px rows over 44px bars**, from the ref's own tokens. ⚠️ I first declared *parallel* tokens and a
  flat row height, which silently collapsed every two-lane row onto one line — `.tl-rrow` already
  computes `calc(var(--row-h) * var(--lanes, 1))`.
- **Five chips**, closed outranking the rest.
- **The overdue tint is removed entirely.** Lateness is said twice instead, both outside the face: the
  card wobbles (the ref's keyframes, copied, every frame restating the literal base transform) and the
  row carries a strip. **Measured: 69 cards, 15 overdue, 15 strips, 0 tints.**
- ⚠️ **The row strip stands.** The previous run flagged `.row.owes::after` as a ref/pack conflict and
  left it unbuilt. Resolved per this pack: the ref wins, and "no accent bars" scopes the card *face*.
- **One card treatment.** `hollow` and `ghost` lost their transparent frames — our own invention,
  which on the re-cut read as a card that had failed to render.
- **Glide on hover** by a transition on the inner glider alone; **hover tip** carries the full record.

### Two gaps inside Phase 1, named

1. **The fixed three-month window and the weekly ‹ WEEK / TODAY / WEEK › shift are unbuilt.** The board
   still offers Month / 3 months / 6 months and shifts by its existing control. Today sits at 50% and
   the today line/cap travel and hide correctly, but the *fixed* window and whole-week stepping are not
   done.
2. **A control was lost.** The agent name was a button opening the relationship's workspace with
   nothing selected — the only route to a query with **no card** raised against it. The card is still
   clickable, so a relationship *with* a card is reachable; one with none is not. Flagged at the code
   rather than replaced with a control the ref does not draw.

## Phase 3 — the "garbled label" was not a data bug

The board read `Reread the O'Rourk|ages before Thursday`. **Both strings are correct and neither is
garbled**: a rolled task draws a ghost at its original date and a live mark at its current one, and we
rendered the words on **both**, so two copies of one sentence overlapped. The ref draws the ghost as a
**box alone**. ⚠️ A search for a bad character mapping would have found nothing wrong, indefinitely.
Measured after: 4 task elements — 2 worded, 2 box-only.

## ⚠️ Three locks went red on a correct board — all three on their population guards

That is the guards working. The tint case had **no tinted cards left** (its subject was deleted by
design); two others read `.tl-pill` and `.tl-content`, selectors the re-cut moved. Without those
guards all three would have gone **vacuously green over an empty set**. The tint case is rewritten to
assert what v58 claims: every overdue card wobbles, no card that is not overdue does, every owed row
carries the strip, and no tint paints anywhere.

⚠️ And asserting a *running* animation needed the harness's motion suppression lifted first —
otherwise the question has already been answered "no" by the harness.

## Deploy

`firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev` — bundle
**`index-mbYBgAI-.js`**, served hash verified against the local build.

---
---

# v58c — the fidelity pack

Ref re-confirmed at Phase 0 (title + hash). **Phase 0.5: measurement worktree again**, `/tmp/sa-v58c`
on port 4470 — every gate ran there.

## Every hypothesis, measured before anything changed

| # | Hypothesis | Verdict | Measurement |
|---|---|---|---|
| 1.1 | Imperative chips on dates still ahead | **FOUNDED** | 2 rows — "Send the partial" with a send-by 41 days out, "Nudge due" 81 days out. `pillText` returned the deed whenever the writer held the move, late or not |
| 1.2 | Owed rows extend past today with a ring | **FOUNDED** | `liveStop` took the named end even when the writer was late. ⚠️ And `owed` did not include an **arrived reminder** — a date the writer owes as surely as a passed send-by |
| 2 | Caps flush at the lane's left edge | **FOUNDED, and the mechanism was mine** | Six caps at x 23–37 of a 1100px lane. The clamp read `left = capleft ?? ""` and only **then** recorded `capleft` — clearing the position on the first pass and storing the empty string as "the original" |
| 2b | *(a second cap fault underneath)* | **FOUNDED** | With the clamp fixed the caps were still **362.6px off — a constant thirty days, on every one**. The cap computed `pct(sg.to)`; the card is drawn at `--l` wide `--w`. Same date, two routes |
| 3a | Board and rail have no field | **FOUNDED** | `rgba(0,0,0,0)` on both — row text read through the header on scroll with `z-index: 70` and `isolation: isolate` **both correct**. ⚠️ Stacking decides what is drawn on top; it says nothing about what can be seen through |
| 3b | Today cap is black | **FOUNDED** | `--tl-nearblack` (#1c130f) — the one near-black fill on this surface, against Law 1 outright. Now the ref's pink trio |
| 3c | Rose rule down the whole left edge | **UNFOUNDED** | Strip count **equals** overdue-row count exactly (6 = 6) and no rose left border exists in the board. It reads continuous because v58 sorts all overdue work to the top, so the strips abut. **Nothing changed** |
| 3d | Rows ~95px | **UNFOUNDED** | Measured **66**, and 132 where a row draws two lanes — the two-lane calc, correct. **Nothing changed** |
| 3e | No month names in the rail | **FOUNDED** | 0 month labels. **Not fixed — see unbuilt** |

## ⚠️ The cap lock had to be strengthened twice, and both weaknesses were mine

- Written as *"the caps are not all in one place"* it **passed over the broken board**: pinned to the
  edge they still had two distinct centres, because their widths differ. **A distinctness check is
  not a placement check.**
- Rewritten as *"the cap's centre equals its card's end"*, it compared against the wrong piece — a
  card can be several pieces and they share one `data-rel`, so the first match is a true reading of
  the wrong subject.

Both fixed, both proved red by restoring the fault.

## Built and verified

Phases 1, 2 and 3-of-the-surface. **15 locks green** across `calSemantics58`, `calOrder58`,
`calCaps58` and `calFaults56`, in the worktree.

## Unbuilt — named, not skipped

| Phase | Status |
|---|---|
| 3 · month names in the rail | **unbuilt** — measured absent (0 labels), not added |
| 4 · fixed 3-month window, week stepping, removing the range control | **unbuilt** |
| 5 · journeys (track + nodes for all rows with history) | **unbuilt** |
| 6 · the lost control + edge tags for out-of-window relationships | **unbuilt** |
| 7 · re-proving the whole `cal*` sweep, retiring the stale reds | **unbuilt** |

**Noted, not a bug:** the two "Priya Raman" rows are two real queries on the account.

## Deploy

Bundle **`index-BTcPRhoD.js`**, served hash verified against the local build.

---
---

# v58d — the completion pack

Ref re-confirmed (title + hash). Measurement worktree `/tmp/sa-v58d` on port 4480 — the full
32-file sweep ran in **7.2 minutes**, so every reading below is real rather than a timeout.

## Phase 1 — the last semantic · **built, verified, locked**

Six rows read "Queried" or "Full Sent" in the sand chip — the tone was already right, the word was
still the status. They now read **No Response**, decided by the board's **own** silence rule
(`barState`'s `quiet`/`ghost`); the chip re-derives no threshold.

⚠️ It uses `QueryStatus.NO_RESPONSE`, the app's own word, not a hand-typed "No response" — the
latter is a second spelling of one status and would have failed `calCard`'s vocabulary lock for
exactly the right reason.

## Phase 2 — re-measured with the instruments the pack named

| Hypothesis | Instrument | Verdict |
|---|---|---|
| Row pitch ~97px | `offsetTop` delta between consecutive single-lane rows | **UNFOUNDED** — **one** distinct pitch, **66px**, matching the ref's token. No wrapper margin, no padding, no spacer. Nothing changed |
| Rose rule down the left edge | `elementFromPoint(laneLeft + 1, rowCentre)` on non-owed rows + a sweep of every container's `border-left` | **UNFOUNDED** — no container draws a rose rule; the strip is a pseudo-element on owed rows only |
| Board/rail field, card frame | computed `background-color`, `border`, `border-radius`, `box-shadow` vs the ref | **FOUNDED for the frame** — **five** distinct border colours across 23 cards (`out`, `req`, `decide`, `remind`, `quiet` each tinted it). The ref draws **one** card. Now `#e2d4be` at radius 10, with the three variants the ref names: owed, quiet, closed. (Board and rail fields were already fixed in v58c) |
| Month names in the rail | count of month labels | **FOUNDED — 0 labels — and NOT BUILT.** Reported unbuilt |

⚠️ **My earlier probe of the rose rule had four subjects, two of them below the fold** — half its
answer was about nothing. The lock now proves its rows are on screen first.
⚠️ **And the sweep had to be narrowed**: written as "anything rose in the board" it flagged the
**owed card's border**, which is the ref's own colour — a true reading, an accusation about the
wrong subject.

## Phase 3 — the window · **built, verified, locked**

Ninety days (the ref's own `N = 90`), today at its centre, stepped by exactly seven. Measured: span
**90**, first rail date **31 Jul → 24 Jul** on one step, and Today returns it. The Month/3mo/6mo
picker is **removed**, not left showing one option.

⚠️ `setRangeTo` survives as a **no-op that throws on an out-of-range index**. A dozen cases sweep
`RANGE_LABELS`; with one entry those loops run once, which is correct. Clamping is how four earlier
packs drove indices 3 and 4 against a three-stop control and measured the same board twice while
reporting five.

### ⚠️ Today sits half a day off centre, and the reason is a convention

This board places a day at its **midpoint**; the ref places it at its **boundary**. That cancelled
while the spans were odd (31/91/181) and does not at ninety. Measured **both** ways:
`(days − 1) / 2` → **49.44%**, `days / 2` → **50.56%**. Half a day either side, **6.1px** on an
1100px lane, with no third value available.

**The span stays ninety** — the ref and the pack both say ninety; ninety-one would centre exactly
under our convention, and choosing it means changing the thing they specify to suit the thing they
do not. The **tolerance is stated at the lock as one half-day of lane, computed from the lane's own
width**, so it tightens by itself and the arithmetic is checkable. Moving the board off midpoint
days is the real fix and touches every card end and every mark.

## The sweep — 41 passed, 29 failed, and what the 29 are

Run clean in the worktree, so these are **real**, not timeouts. They are overwhelmingly **stale
cases describing the pre-re-cut board**: locks reading the agent column ("row heads measured",
"rows carrying a status", "selected controls found"), the three-range control (`setRangeTo(2)`
throwing by design), and the removed tint ("nothing says overdue"). One is a crash —
`getComputedStyle` on a null, a lock dereferencing an element the re-cut deleted.

**Retiring or rebuilding them is Phase 6 and is UNBUILT.** I am reporting the number and the cause
rather than a green.

## Unbuilt

| Phase | Status |
|---|---|
| 2 · month names in the rail | **unbuilt** (measured absent) |
| 4 · journeys — track + nodes for all rows with history | **unbuilt** |
| 5 · restored navigation + edge tags | **unbuilt** |
| 6 · retiring/rebuilding the 29 stale cases | **unbuilt** |

**Noted, not a bug:** the two "Priya Raman" rows are two real queries on the account.

## Deploy

Bundle **`index-BpQYFT7j.js`**, served hash verified.
