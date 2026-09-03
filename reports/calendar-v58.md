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
