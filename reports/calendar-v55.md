# Calendar v55 — make the board match the ref, in one pass

**Territory:** `TodoCalendarPage.tsx`, `todoTimeline.ts`, `todoCalendar.css`, the bar/segment
module, `timelineGroups.ts`, `timelineCopy.ts`, the calendar-local modules, the calendar
measurement files, `design-refs/timeline-v55.html`, this report.
**View layer only.** `recomputeQuery`, `resolveExpectedDate`, `recordDays`, `waitingFrom`, the
dedupe, `useTaskPaneSession` and `quickDone` are consumed and unaltered.

---

## FLAG 1 — THE REF: WHICH FILE, WHICH HASH, AND WHETHER IT IS REALLY v55

**This flag is first because everything below depends on it, and because the run stopped once
already over it.**

| | |
|---|---|
| File | `design-refs/timeline-v55.html` |
| Size | 26,166 bytes |
| SHA-256 | `6e4a047bd20525868f93369bc462e2214c91f972b4dddbda56ec08391edd4fff` |
| Version string in the file | `v55` — the only one present |
| Guarded by | `design-refs/.refhashes.json`, checked on every `build:dev` / `build:prod` |

**Phase 0 stopped the run rather than proceeding**, because no v55 ref existed and the pack's own
stop condition forbids falling back to an older one or building from the pack text alone. The
eight hypotheses were measured anyway, since measurement needs no ref. You then supplied the file.

**⚠️ AND HERE IS THE THING TO KNOW ABOUT IT.** The file you supplied is **byte-identical to
`timeline-v54-ref.html` apart from the version string**. So it is not a new design — it is the
document the v54 run never had. That explains why so much of this pass was *correcting v54's
guesses against a ref that existed*, rather than building anything new: the pill above the
headline, the two-row content, the `Math.max` width, the `.bodyclip` insets and the 18px tight
mask are all in that file and all were reconstructed differently by v54 working without it.

`design-refs/timeline-v40.html` was deleted in §1 and retired from the hash manifest.

---

## FLAG 2 — THE EIGHT PHASE 0 HYPOTHESES, EACH FOUNDED OR NOT, WITH THE MEASUREMENT

| # | Hypothesis | Verdict | The measurement |
|---|---|---|---|
| H1 | Every card carries a right fade whether or not it runs past the window | **FOUNDED** | 22 of 22 cards carried `fadeR`. The predicate read `!!f.live \|\| cardBounds(f).end > f.days`, and `cardBounds().end` is the **clipped** end, so it can never exceed `days` — the second term was dead and `live` decided everything |
| H2 | Vale's card is zero-width | **FOUNDED, and not the cause I expected** | Not an end-resolution bug. Her last status change **is** her close, so the current wait has zero duration. Fixed per your correction: a terminal relationship's card spans the wait that **ended** — previous status change → closing event |
| H3 | The pill and the headline start at different x | **FOUNDED** | 9 distinct x-values across the board. Now exactly two, and both are structural: `flat: 13` and `fadeL: 42` |
| H4 | A passed date is phrased as future | **FOUNDED** | The `offer` branch returned before the lateness copy could see it, so an offer whose answer-by date had passed read as still to come |
| H5 | The tight clip is on the wrong element | **FOUNDED** | It sat on `.tl-line`; with the content now two rows, that softens the headline and leaves the pill above it hard-cut. The ref puts it on the clip wrapper |
| H6 | A task appears twice | **UNFOUNDED as stated — v54 built this deliberately** | Your correction stands: the rule is one element **per date the task occupies**. An unrolled task is one mark; a rolled task is a dashed ghost at its original date and a live mark at its current one, because those are two facts. Locked as "one, plus one per roll" |
| H7 | Closed reads 0 while Vale carries a close event | **UNFOUNDED — and see FLAG 8** | Vale carries a close **ghost**, not a close event. Closed is Rejected or Withdrawn only, per your correction |
| H8 | The rail and Marsh are wrong | **UNFOUNDED** | Left alone on your instruction. Measured clean and untouched |

Two probes I wrote in Phase 0 were **self-defeating and were rewritten before they were believed**:
"rows with a pill and no card" can never match, because the pill lives *inside* the card; and
"which visible cards are zero-width" filters its own answer out first.

---

## FLAG 3 — THE FADE AUDIT

Before: **22 of 22** cards faded on the right, regardless of their dates.

After, over **69 cards** (23 relationships × three ranges), all four shapes present and every one
following the card's own dates:

| Shape | Meaning |
|---|---|
| `--` | Begins and ends inside the window — no fade |
| `-R` | Runs past the right edge — right fade only |
| `L-` | Began before the window opened — left fade only |
| `LR` | Cut at both ends — 24 cards |

`fadeBad 0` at all 18 width × range combinations: no card's fade classes disagree with its
published `data-truefrom` / `data-namedend` / `data-days`.

**The fix that mattered** was comparing the **unclipped** `namedEnd` rather than `cardBounds().end`.
An intermediate version used the clipped end and left six cards whose ends ran 1.5–52.5 days past
the window carrying no right fade — correct-looking code, silently wrong.

---

## FLAG 4 — CARDS MISSING OR ZERO-WIDTH

**One:** Rosalind Vale (`thin-ag-close`). Zero-width because her last status change is her close,
so the *current* wait has no duration. She now renders, spanning the wait that ended.

Every closed relationship now shows how long its final wait actually ran, rather than a
close-to-close card of zero length. No other card measured below the visible threshold at any
width or range.

---

## FLAG 5 — PASSED DATES CORRECTED

**One branch, one card kind.** `case "offer"` in the bar-copy derivation returned its own string
before the lateness copy could be reached, so an offer whose answer-by date had passed was phrased
as though it were still to come. It now reaches the derived form and reads
`Offer received · overdue`, with the long form carrying the date and the count of days.

Locked by a sweep over every card's rendered words: **no card states a passed date in a future
tense**, at three ranges.

**⚠️ The lock that proves it had to be repaired first.** `\b(answer by` never matched anything: the
content is a flex column, so `textContent` concatenates across the rows with no separator
("…receivedanswer by 28 Aug") and there is no word boundary to find. It had been passing over the
exact string it forbids. Found by proving it red.

---

## FLAG 6 — PILL AND HEADLINE INSET, BEFORE AND AFTER

| | Distinct x-values |
|---|---|
| Before | **9** |
| After | **2** — `flat: 13`, `fadeL: 42` |

Both survivors are structural rather than incidental: 13px is the ref's `.bodyclip` left inset, and
42px is `.card.fadeL .bodyclip`'s, which exists so words do not start inside the left dissolve.
Confirmed identical at all six widths and three ranges.

---

## FLAG 7 — THE ONE REAL FAULT THIS PASS FOUND, WHICH NO PHASE ASKED FOR

**The card width asked for more space than the content needs, on every card.**

`needed()` was `inset + pill + gap + track + margin` — what the content costs when the pill sits
**beside** the headline. That was v54's layout. §5 stacked them into a column, and the sum went on
adding a pill's width to every card.

| | Before | After |
|---|---|---|
| Cards marked tight | 22 of 23 at several widths | **12 of 69** |
| Detail dropped | yes | **0** |
| Worst over-open measured | **142px past its own words** | — |

The ref computes `Math.max(pill.scrollWidth, line.scrollWidth)` and always did.

The consequence was not cosmetic: cards whose words **fitted** were being clipped, and the detail
was being dropped to make room for space nothing occupies.

---

## FLAG 8 — WHERE I FOLLOWED YOUR RULE RATHER THAN YOUR CONCLUSION

Your H7 correction gave both a rule and a conclusion, and **measurement says they disagree**:

> "Closed is Rejected or Withdrawn only. No Response is not closed — you can still nudge it or
> close it, which is exactly why it carries the close ghost. **That makes Vale belong in Closed**…"

Vale (`thin-ag-close`) is a **`Queried`** query, 400 days past a stated 6-week window, with
`noResponseMeansNo: true`. She is neither Rejected nor Withdrawn. What she carries is the close
**ghost** — which your own sentence names as the reason a row is *not* closed.

**I implemented the rule** (`isBoardClosed = REJECTED || WITHDRAWN`) and left Vale under With
agents, because the rule is reasoned and the conclusion rests on a premise about her data that the
fixture contradicts. **If you meant the conclusion, the rule needs restating** — and it would mean
a row you can still act on sitting under Closed.

`TERMINAL_STATUSES` (which includes No Response) was deliberately left alone: it is read by the
agent list and agent context, and narrowing it there would change two pages outside this territory.

---

## FLAG 9 — WHAT IS UNPROVEN, VACUOUS, OR UNVERIFIABLE

- **The Closed tab is unexercised.** The harness account holds **zero** Rejected or Withdrawn
  queries, so "Closed contains exactly the closed rows" is satisfied over an empty set. The
  reconciliation is honest (0 = 0) and proves nothing about the tab's contents. **Seeding one
  rejection would make this a real check** — flagged rather than done, because it writes to the
  shared account.
- **`calAccept40.measure.ts` had been red since v54 §4** and nobody knew, because nothing ran it.
  Its last claim was that every card carries a `data-tier` — the v40 ladder, which v54 replaced
  with clip-and-open, leaving one `delete seg.dataset.tier` behind. Retired, with every live claim
  confirmed present in `calAccept55` at six widths rather than three.
- **Single-engine.** Every measurement is Chromium. The scrollbar remains the known blind spot;
  measured 0px throughout.

---

## FLAG 10 — CROSS-SESSION: TWO REDS THAT ARE NOT MINE

Provenance established **by reading, never by moving** — no stash, no checkout, no restore.

1. **`src/lib/datePickerHub.test.tsx`** — went red when the clock rolled to **1 September**. It
   renders the picker with no value, so it opens on the **current month** against an 11 August
   floor; with every visible day after the floor, no `sa-dp-day off` cell exists. Tree-clean,
   imports nothing in this territory (`grep -c` = 0). **A date-dependent fixture, not a
   regression** — it will go red again every time the clock passes its floor.
2. **`tests/e2e/mastheadMatrix.measure.ts`** — `tsc` error TS2339: reads `CARVES.titleSize`, a
   carve-out the masthead session removed. Committed by that session (`169f9882`), tree-clean,
   imports nothing here. **A reader left behind by a deletion**, mid-flight in their territory.

Neither was touched.

---

## FLAG 11 — THE CALENDAR HAS A SHELF OF RED LOCKS NOBODY RUNS, AND ONE OF THEM WAS BEING HIDDEN BY THE FADE BUG

Before deploying I ran **every** `tests/e2e/cal*.measure.ts` rather than the set I exercise each
phase. 28 files, 52 cases: **44 passed, 8 failed**. I then ran the six failing files **at the
pre-v55 base** in a throwaway worktree, to date them rather than assert them:

| | At the pre-v55 base | At v55 |
|---|---|---|
| Failures in those six files | **7** | **8** |

**Seven are pre-existing** and every one has a subject an earlier round deleted:

| File | The claim | Its subject |
|---|---|---|
| `calLadder` (×3) | "every rung is reached", "the marquee is the full rung's alone", "the stub paints a disc" | The v40 **ladder**, which removed words as space ran out — replaced by clip-and-open in v54 §4 |
| `calViews` | "the four views are a strip, and their counts add up" | Superseded by `calViews54` |
| `calProbe`, `calShot`, `calendarWidth` | `locator.click` timeout | Each clicks a control the page no longer offers |

**I have NOT retired those seven.** `calAccept40` was retired because `calAccept55` demonstrably
carries every one of its claims; these need the same claim-by-claim comparison against their `54`
siblings, and doing that properly is a pass of its own rather than something to do while deploying.
Left red and reported — but a shelf of permanently-red locks is exactly what a real failure hides
behind, and this is the second time in one day that has cost something.

### The eighth is the interesting one, and it is FIXED

`calCard`'s "a card is not 9px round" **passed at the base and fails at v55** — and it is not a
regression. It is the lock working for the first time.

- It reads the radius off **`.tl-p`**. v54 moved the border, the shadow and the corner onto
  **`.tl-frame`**, so the card itself reports `0px`. Same relocation that had `calText` reading a
  shadow off the wrong element.
- It only checks cards where `!faded`. **While the fade predicate was broken, every card carried
  `fadeR`** — so that filter was empty and the assertion passed over **nothing**, for as long as
  the bug existed. Fixing the fade produced uncut cards, and the stale reader was exposed instantly.

So the fade bug was **concealing** a broken lock. The radius itself was never wrong: it is `9px`,
on `.tl-frame`, and always was.

Fixed by reading the value where it lives and **counting the population across the whole sweep** —
not per combination, because at 1280/Month every one of the 23 relationships genuinely runs past
the visible month, and a per-combination floor fails on a correct board. Proved red by pointing the
read back at the card.

**⚠️ AND RUNNING THE FULL GLOB HAS A SIDE EFFECT.** `calShot39.measure.ts` **overwrote**
`reports/calendar-v39/board-1440.png` with a picture of the v55 board — a stale artefact wearing a
current filename, from a measurement that writes without restoring. I put the committed image back
with a targeted `git show HEAD:path > path`, never a checkout, which would reach past my own file
in a shared tree.

---

## GATES

| Gate | Result |
|---|---|
| `tsc --noEmit` | 1 error — `mastheadMatrix.measure.ts`, not mine (FLAG 10) |
| `vite build` (whole output read) | clean; only the expected chunk-size note |
| `vitest` | **7358 passed**, 1 failed — `datePickerHub`, not mine (FLAG 10) |
| Calendar measurement set | see below |

Baseline before the run: 7351 passed / 0 failed. This pass **adds 7 tests and no failures**.

---

## COMMITS

```
a3ac99ea  §0  STOPPED: no v55 ref exists, and the eight hypotheses measured anyway
50bd1c62  §1  one timeline ref, guarded by hash
cd46f200  §2–3 fades follow the dates, and a closed wait has an honest length
64f5e2ce  §4  an offer's answer-by date is the writer's own, and never reads as future once passed
975049f4  §5  the pill and the headline stack, so both begin at one inset
6eb05ada  §6  Closed is Rejected or Withdrawn, and a task draws one mark per date it occupies
7f98b75f  §7  calLook and calGround are retired, and the one law worth keeping is carried forward
f882164f  §8  the pill sits above the headline, so the width is the wider of the two, not their sum
0e987907  §8  follow-up — a lock red since v54 §4, found because nothing ran it
```
