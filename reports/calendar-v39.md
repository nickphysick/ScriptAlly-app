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

---

## What shipped, and what did not

**Deployed to dev**, verified by bundle hash. **Vitest 437 files / 7344 passed / 0 failed** — the
first fully green unit run on this territory since v37. **20 measured cases green.**

| phase | outcome |
|---|---|
| colour law | 9 burgundy sites removed; grep lock fails the build on burgundy or black |
| 1 · the ref | v39 in, v37 out, one commit; 13 guarded |
| 2 · the card | 348 cards; 10 pill words, all the app's own |
| 3 · delete the fill | 7 files; every site listed below |
| 4 · one fade | mask on the card; lane unclipped |
| 5 · marquee | cycle built in JS, locked against ping-pong |
| 6 · views & display | **UNBUILT** |
| 7 · ghosts | **UNBUILT** |
| 8 · verify + deploy | done for what is built |

### Phases 6 and 7 — reported unbuilt, not shipped unverified

Neither was started. The run went into the card and into four faults of my own that had to be
measured out of it (below), and stopping with two phases untouched is the honest end rather than
half-building controls and ghosts at speed.

**What is left standing that Phase 6 was to remove:** the action column (`.tl-c-ac`, `.tl-abtn`,
`actionFor`) and the `RIGHT NOW` mode (`onlyAsks`) are still live, along with the range slider.
`ONE LIST / GROUPED` already exists from v37 and is the shape the Display popover was to absorb.
**Nothing was half-removed** — the board is coherent as it stands.

### 2. Every invented state word, and its replacement

| was | is |
|---|---|
| `With you` / `Waiting to hear` | the pill: a `QueryStatus`, or the deed |
| `Quiet` / `Quiet for N days` | `No Response`, or the status that actually holds |
| `Offer received` | `Offer` |
| `Revise and resubmit` | `Revise & Resubmit` |
| `Closed` / `Closed on {date}` | `Rejected` · `Withdrawn` · `No Response` — three endings, three words |
| `Full req` · `Partial req` · `R&R` | `Full Requested` · `Partial Requested` · `Revise & Resubmit` |

Ten distinct pill words measured on the board, every one a `QueryStatus` label or a named deed.

**⚠️ Two wordings flagged, not decided.** The brief names *Answer the offer*; the app's own row note
says *Answer them*. And Revise & Resubmit needs a fifth deed the brief does not name — it takes
*Send the revision* rather than silently reusing *Send the full*, which is a different thing to send.

### 3. Everything deleted with the fill

`journeyBars.ts` (`fillFor`, `fillEndAt`, `NEAR_AT`) · `journeyBars.test.ts` (9 blocks) ·
`TodoCalendarPage.tsx` (`fillWidth`, the `near` derivation, `data-fill`, the `.tl-fl` element, two
props off `Piece`) · `todoCalendar.css` (`.tl-fl` ×2, 9 family fill/near rules, the quiet hatch, 9
fill/near tokens, and later the whole orphaned `.tl-t1`/`.tl-t2`/`.tl-txt` family with its 6 text
tokens) · `barTokens.test.ts` (4) · `calLook.measure.ts` (6) · `calContrast.measure.ts`.

**`TaskPane.tsx` imports a different `fillWidth` from `lib/paneFill`** — same identifier, different
feature, out of territory, untouched.

### 4. The faded edges

Not measured as pixels. The mask is asserted structurally (declared on the card, one two-stop mask
where both ends are cut) and the lane is asserted unclipped, but the **pixel sweep across the three
card colours was not built** — reported unbuilt rather than claimed.

### 5. Marquee

Cards overflowing, by range at 1440: not tabulated. The mechanism is measured (`fits` is set from
`scrollWidth` vs `clientWidth`; the cycle is unit-locked) but the **per-range census was not built**.

### 6. The long-silence threshold

Not chosen — Phase 7 is unbuilt.

### 7. Values needed but not pinned

- **The hollow card.** The ref draws `quietc` and `closedc` and nothing between. It takes the one
  thing they share — no shadow — and nothing else. Flagged.
- **`--tl-burgundy` renamed to `--tl-nearblack`**, not repointed: a colour law enforced through a
  token called burgundy is one keystroke from being undone by somebody restoring what the name
  promises.

### The four faults of my own, each found by measuring

1. **The card was a ROW.** The ref's `align-self: flex-start` only means anything in a column.
   Measured: a 156px card whose line resolved to **2px** against a 168px track.
2. **`.tl-dt` and `.tl-sep` were already taken.** `.tl-dt` is the rail's *absolutely positioned*
   date label; declared later, it took the card's detail out of flow and dropped it on the
   headline — at x 728, in the rail's coordinate space, on a card starting at 791.
3. **The track's children default to `flex-shrink: 1`**, so they compressed while their `nowrap`
   text spilled and overprinted.
4. **Padding on a `border-box` card is a floor, not an inset.** `padding-left: 46px` floored every
   faded card at 60px; one the dates sized at 46 rendered at **59** and ran **8.6px** into its
   marker. Settled by authorship — identical inline `style` strings rendering 46px at HEAD and 59
   after. Clearance is back to HEAD's own figures (7.4 / 3.8 / 2.9px at 1280) over more pairs.

### The contrast finding

**Every detail line on the board reads 4.13:1.** `#8a7a6c` on white — the palette's `muted`, pinned
by the pack and drawn by the ref — at α1.00, so unlike v37's shortfalls there is no opacity to
raise. The ink is too light and darkening it changes a pinned value. It is **one pair, not four**:
every family reports the same number because a card is monochrome now, which is the colour law
working and the reason it matters. Headlines clear at 17.5–18.3; all three drawn pills at 4.66–14.59.

---

# Part two — the ground, the wash, the fades

## The gate, first

The new standing rule came out of v37's `tail -3`. The gate is now a script that **captures the
full output to a file, searches the whole of it for the summary line, and treats the ABSENCE of
that line as a failure** — then echoes the line it found together with the number of lines it read,
so the figure that decided the verdict is the figure a reader sees. Baseline at `b89ecce7`:

```
  tsc   : mastheadMatrix.measure.ts(329,46) TS2339          [exit 2, 1 lines read]
  vitest: Tests  7344 passed | 3 skipped (7347)             [exit 0, 72 lines read]
  build : ✓ built in 6.49s                                  [exit 0, 188 lines read]
```

The one tsc error is the masthead session's, proved by reading. Measured on dev after checking its
served bundle hash equals a local build of `b89ecce7`, so "the deployed board" is this commit.

## Phase 0 — the four faults

### 1. The ground differs — **FOUNDED**, and there are THREE surfaces, not two

| point | painted |
|---|---|
| masthead, clear of its text | `rgb(254, 252, 250)` |
| empty lane, right of today | `rgb(247, 240, 230)` |

Walking the ancestry from the lane upward, three elements paint:

| element | background |
|---|---|
| `.tl-tbl.tl-one` — the ONE LIST wrapper | **`rgb(247, 240, 230)`** |
| `.tl-board` | **`rgb(250, 247, 242)`** = `#faf7f2` |
| `.ws-work` / `.ws-window` — the shell's panel | `rgb(254, 252, 250)` |

Exactly the suspected mechanism: the board paints a surface of its own, and so does the list
wrapper — two survivors, stacked, so the lane's ground is neither the board's nor the panel's.

**⚠️ AND THE PINNED VALUE BELONGS TO SOMEBODY ELSE.** The pack pins the ground as `#faf7f2`. The
panel is `.ws-window`, shell chrome, and it paints `#fefcfa`. Deleting the calendar's two surfaces
leaves one ground — **the panel's `#fefcfa`, not the ref's `#faf7f2`** — and repainting the panel
would mean editing shell chrome this pack is fenced out of. Flagged: the *one ground* rule is
buildable here; the *particular value* is not.

### 2. The wash spans the whole lane — **UNFOUNDED. Nothing changed**

| measured | |
|---|---|
| wash element width | 159.5px |
| lane left | 743 |
| wash right edge | **903** |
| today's painted x | **903** |
| delta | **0px** |

`--tl-past-w` is `calc(22.5 / 90 * 100cqw)` and the gradient runs `transparent → rgba(58,28,20,.055)`
in that order. The wash already stops at today, at every range, and its dark end is already at
today rather than at the lane's edge.

The screenshot impression was real and its cause is fault 1: the lane sits on a *different, darker
ground* than the panel, so the whole lane reads as washed. The brief anticipated the two could be
confused; it is the ground that is at fault, and the wash is correct.

### 3. Fade classes on the wrong edges — **FOUNDED**

32 cards: **fadeL on 23, fadeR on 20**, and many carry both. `seed-pkgq-2` is an `out` card in the
middle of the window carrying `fadeL fadeR`; `seed-query-12` is **19px wide with a 38px fade**, so
the mask is wider than the card and the whole thing is a gradient.

**⚠️ THE AUDIT THE BRIEF ASKS FOR CANNOT BE BUILT FROM THE DOM AS IT STANDS.** The predicates are
about the card's TRUE start and end; the only coordinates the DOM carries are the CLIPPED ones —
every leading piece reports `from: 0`, which is where a clipped card starts, not where its stretch
began. `openLeft`/`openRight` live on the Segment and reach the page only as class names, so
asking "does the class match the predicate" currently means asking the class about itself.

Phase 3 must publish the true start and end as data before the table can be honest. Recorded here
as the reason the Phase 0 table is partial rather than as a table with a column I inferred.

### 4. Empty cards — **FOUNDED. 8 of 32**

| qid | width | classes |
|---|---|---|
| `thin-q-chase` | 50 | `quiet fadeR` |
| `seed-query-5` | 50 | `quiet fadeR` |
| `seed-query-6` | 50 | `quiet fadeR` |
| `seed-query-11` | 29 | `req hollow fadeR` |
| `seed-pkgq-4` | 22 | `req hollow fadeR` |
| `seed-query-12` | 19 | `decide fadeL` |
| `thin-q-remind` | 68 | `out fadeL` |
| `seed-cal-bang-q` | 97 | `out fadeL` |

Every one has **no pill and no text**, and the cause is mine from part one: the pill is rendered
*inside* the `{sg.label && (…)}` conditional, so a segment with an empty label renders a card with
nothing in it at all. The pill does not depend on the label and should never have been inside it.

### Red gate

None of the four lies beneath the view layer. Fault 1 is two stylesheet rules, fault 3 is a
predicate and the data the page publishes about itself, fault 4 is one JSX conditional, and fault 2
does not exist.
