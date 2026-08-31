# Calendar v39 — cards, ghosts, and real controls

## Baseline at `8e6e6b19` — RED, and the reds are MINE

**tsc:** one error, `tests/e2e/mastheadMatrix.measure.ts:329` — the masthead session's file, proved
by reading, not this pack's.
**Production build:** clean.
**Vitest: 3 files, 4 tests FAILED**, 7371 passed, 3 skipped.

All four are v37's, shipped by me last night, and the cause is mechanical rather than a matter of
judgement: **my final gate ran `npx vitest run --reporter=dot 2>&1 | tail -3`, and `tail -3` cut off
the very line carrying the pass/fail count.** The output I read was `Start at 02:48:52` and
`Duration 19.51s`. This file's own standing rule says a gate's output is read in full or grepped
and never by `tail` alone; I wrote a gate that could only ever show me the timing.

| failing case | what it says | owner |
|---|---|---|
| `calendarStyleReach` ×2 | `tl-ablbl` has no unconditional rule — I gave it one only inside `@media (max-width: 1122px)` | v37 Phase 9 |
| `calendarTokens` | `.tl-t2 { margin-top: 2px }` is a vertical literal in the bar path | v37 Phase 6 vs v37 Phase 2 — **I added the rule and the lock that forbids it in the same run** |
| `todoPageSmoke` | the populated board no longer contains `Your tasks` | v37 Phase 3 — ONE LIST does not render the pinned group heading |

Two of the three are resolved by this rebuild rather than by a patch: the action column is deleted
in Phase 6 (taking `tl-ablbl`), and the two-line text stack is replaced by the card's single line in
Phase 2 (taking `.tl-t2`). The smoke is a real question about what a flat list should say, and is
answered in Phase 6. **All four are cleared before this run ends, or reported unfixed** — a baseline
I caused is not a baseline I get to inherit.

Level with `main` and `origin/main`; 88 untracked files, none under `src/` or `tests/`; no other
session holding uncommitted `src/`.

The ref (`~/Downloads/timeline-v39.html`, 35,859 bytes) was checked against the pack before
anything was read: **every pinned hex and every pinned dimension appears in it**, and it contains
no `#7c3a2a`, `#632e22`, `#6b3023`, `#000000` or `black`. Pack and ref agree.

---

## Phase 0 — recon

### 1. The fill — every site Phase 3 must clear

| file | sites |
|---|---|
| `journeyBars.ts` | `NEAR_AT`, `fillEndAt`, `fillFor`, plus `Segment.goal`/`todayAt`/`trueFrom`/`historical` read only by them |
| `journeyBars.test.ts` | 27 |
| `TodoCalendarPage.tsx` | `fillWidth`, the `near` derivation, `data-fill`, the `.tl-fl` element, the `Piece` props |
| `todoCalendar.css` | `.tl-fl` + 8 per-family fill/near rules + the hatch + `--tl-bar-bd`'s reason |
| `barTokens.test.ts` | 11 |
| `calLook.measure.ts` | 12 |
| `calContrast.measure.ts` | 1 |

**⚠️ `TaskPane.tsx` also imports a `fillWidth`, from `lib/paneFill`.** Different function, different
feature, out of territory — a sweep on the identifier alone would take it.

### 2. The renderer, and what it takes to become a card

`Piece` is already a positioned box with a class list, `data-*` for the locks, a click/keyboard
role, an absolutely-positioned fill child and a two-line text stack. Becoming a card is: drop the
fill child, replace the stack with pill + line(headline · separator · detail), and change the
tokens. **The geometry survives** — `barLeft`/`barWidth` in `cqw`, `--lane` placement, the marker
clearance — so this is a change of contents, not of mechanism.

### 3. The state vocabulary — the invented words, named

`QueryStatus` is: Queried · Partial Requested · Partial Sent · Full Requested · Full Sent ·
Revise & Resubmit · Offer · Rejected · Withdrawn · No Response.

What the board actually draws today, from `journeyBars`' label branches and the page's tooltip:

| drawn | status | verdict |
|---|---|---|
| `With you` / `Waiting to hear` | — | **invented** (`TodoCalendarPage.tsx`, the tooltip head) |
| `Quiet` / `Quiet for N days` / `N days quiet` | — | **invented** |
| `Offer received` | `Offer` | **invented variant** |
| `Revise and resubmit` | `Revise & Resubmit` | **invented variant** (ampersand dropped) |
| `Full req` / `Partial req` / `R&R` / `Offer` | — | **invented abbreviations** (the short forms) |
| `Closed` / `Closed on {date}` | — | **invented** — there is no `Closed` status; the three closed statuses are Rejected, Withdrawn, No Response |
| `Nudge due` | — | a **deed**, permitted |
| `Send the partial` / `Send the full` / `Send the revision` / `Answer them` | — | **deeds** in `timelineCopy` |

**⚠️ TWO DEEDS DO NOT MATCH THE BRIEF'S NAMED SET.** The brief names *Send the partial, Send the
full, Answer the offer, Nudge due*. The app says **`Answer them`**, and it has a fifth deed the
brief does not name — **`Send the revision`**, which Revise & Resubmit needs. Flagged in Phase 2.

### 4. The action column and `RIGHT NOW`

The column is `.tl-c-ac` (token `--tl-ac-w`), rendering `.tl-abtn` from `actionFor(r)`; `RIGHT NOW`
is `onlyAsks`, a `useState` filter over the one derivation, with its own empty copy in `sparse`.
Both are self-contained: no route, no persistence, no second derivation.

### 5. **The lane clips today, and Phase 4 needs it not to**

`.tl-c-tl { overflow: hidden; container-type: inline-size }`. The container must STAY — `pct()`
resolves in `cqw` and the ticks, cards and chips all read it — and `container-type: inline-size`
applies `contain: layout style inline-size`, which does not clip. Only `contain: paint` would.

### 6. `barFit`

`fitLines(barWidth, line1Width, line2Width) → "both" | "one" | "bare"`, pure, with `FIT_PAD_LONG`
26. Phase 5 replaces the bare/short mechanic with measured scrolling; the pure decision and its
unit lock go with it.

### Red gate

None of the six implicates derivation beneath the view layer. The closest is the pill vocabulary,
which changes which *already-derived* status string the view prints — not what any of it means.
