# Query Centre v96.1 — run report

Six items from the dev screenshot. **Three were real and are fixed; three did not reproduce on dev**
and nothing was changed for them. The reference stayed the oracle throughout.

**Nothing is deployed.** Dev is still serving `f687d687` (v96), which is what the "before" column
below was measured against — a real deployment rather than a rebuilt approximation.

---

## §0 — what I found, item by item

### 1 · The rows — REAL, and the cause was not the frame

Dev's row already had the reference's radius (12px), its exact shadow
(`0 1px 2px rgba(28,19,15,.05), 0 10px 24px -18px rgba(28,19,15,.22)`), `overflow: hidden`, white
fill and the 6px status edge. **There was no hairline frame to delete** — `.qcv-list` measured
`border: 0px`, radius 0, background transparent.

What was missing was the air: **gap 0 against the reference's 10**. The 10px lived as a `gap` on the
rows' container, and v96 §2 gave every grouping a band — so that container's children became
SECTIONS, and the gap went on separating sections while the rows inside each one butted together.
The fix is the reference's own mechanism: `margin-bottom: 10px` on the card.

⚠️ **The unit lock was green throughout.** It asserted `.qcv-rows` declares `gap: 10px`, which was
true. It asserted the declaration where the claim was the distance.

### 2 · The band — REAL, and I changed what it meant

Dev read `All queries 83`. You are right that this says the same thing as the title one line above
it, and right that "the app's vocabulary" was licence to change the wording and not the claim. The
band is the your-move group's head: **`Your move 13 · OFFERS, REQUESTS AND NUDGES`**, its rows
directly beneath it, the rest following with no band. The count is `tileCourt` — the desk's own first
section — so the two cannot state different numbers for the same set. With Group set to anything
else, the usual bands apply and this is simply the first of them.

### 3 · The guide — REAL, and worse than it looked

At **1512 × 1040 it was already bottom-right and clear of the desk**; at **860 it jumped to
`bottom: 285px` and sat on the desk's third section** — measured, `overDesk: true`. The lift I wrote
to keep it off the rail's header produced the exact fault §4b's "never covers" was about, at every
height short enough to trigger it. The viewport I checked the rule at was the one it was harmless in.

The effect is gone rather than corrected: the card is fixed to the viewport, 28/28, and measures
nothing. At a height too short for both, the card wins and the rail scrolls under it.

### 4 · The rail — REAL, and my reasoning was backwards

Restored to three. Your argument is the one I should have made: the header counts three, so a body of
two contradicts it — and **"a calm pipeline gets a header with no body" is exactly backwards, because
a calm pipeline is all watch-and-wait**. v96's note had the fact right and drew the wrong conclusion
from it. The reference renders two because its sample has no rows in the third, not because its model
has two outcomes: its own `groupOf` answers `over / up / watch`.

### 5 · The desk's foot dates — DID NOT REPRODUCE

All three sections carry discs **and** a date, at 1512 and at 1280:

```
RL IK MR EV +8   next due Sun 4 Oct
RV RL TQ MK +28  next reply expected 4 Oct
JW IR TE EH +6   last closed 9 Sep
```

So nothing was broken. But the instruction underneath it was: the clause used to be **dropped whole**
when a court had no date, with a note in the code arguing that a label with nothing to label is worse
than nothing. That is overruled — the words render with an em dash now, because three sections with
three shapes makes the one with least to say look like the one that failed to load.

⚠️ **The em dash is drawn and not spoken.** `CourtWhen.date` is `string | null` and the renderer
supplies the dash; the accessible name omits the clause when there is no date, because "next due em
dash" is not something to say out loud.

### 6 · "Nudge 2½ years over" — DID NOT REPRODUCE

Every Coming-up line on the page was read (36 of them). The nudges are
`Nudge in 10 weeks`, `Nudge in 2 weeks`, `Nudge in 13 days`, `Nudge 3 weeks over` (×2),
`Nudge 4 weeks over`, `Nudge 6 weeks over`, `Nudge 8 weeks over` — **nothing in years**, and nothing
for an Eleanor Whitfield, who is the reference's fixture rather than dev's. Dev's long-silent rows
read `Consider closing`, including both Elinor Hale rows at 2½ years.

**The threshold, as asked.** `replyTask` (`lib/taskPrecedence.ts`) decides nudge / close / none:

* nothing at all until **`NUDGE_GRACE_DAYS` = 14** past the reply deadline;
* a stated `noResponseMeansNo` → close immediately, never nudge;
* otherwise nudge, **unless** the nudge has been ignored for another full window
  (`now ≥ lastNudgeSentDate + responseTimeWeeks × 7 days`) **or** the hard ceiling is hit —
  **`closeAfterDays(w) = max(2 × w × 7, 90)`, measured from the ORIGINAL SEND**;
* a reply since the window expired ends the case for closing but not for nudging.

So an 8-week window closes at 112 days, a 4-week window at 90. A 2½-year silence is far past every
route, which is why dev says `Consider closing`. If you have a screenshot showing otherwise I would
like the row — it would mean a card is reaching the row that the derivation would not raise.

### 7 · The checks

**Materials.** Every treatment on the page is a sand chip or `Add`; **no row draws the four icons**,
because no query on this account has `sentHow === "individual"` — found in v95's mutation run and
unchanged. Fenella is the reference's fixture. The icons branch is covered by the unit suite only,
and the report has said so since v96 §0.6.

**The tray.** Confirmed on the page: a row with nothing to do shows `Edit · Close`; a row with
something to do shows the action first — `Log the send · Edit · Close`, `Decide on offer · Edit ·
Close`. QC12 asserts both shapes over every row and prints the tally.

---

## Before and after

Measured, not described. "Before" is dev as deployed (`f687d687`); "after" is this build.

| | before | after |
|---|---|---|
| gap between cards | **0** | **10** |
| the band | `All queries 83` | `Your move 13 · OFFERS, REQUESTS AND NUDGES` |
| rail groups | Overdue 31 · Upcoming 18 | Overdue 31 · Upcoming 18 · **Watch and wait 20** |
| rail header counts | 31 · 18 · 20 | 31 · 18 · 20 — now equal to the body |
| guide at 1040 | `bottom: 28px`, clear | unchanged |
| **guide at 860** | **`bottom: 285px`, over the desk** | **`bottom: 28px`, clear** |
| desk feet | three dates | three dates, and the clause now survives their absence |

`shots/before-1512x1040.png`, `shots/before-1512x860.png`, `shots/after-1512x1040.png`,
`shots/after-1512x860.png` — the guide is in every one.

---

## The five locks, each proved red first

Retargeted into the existing cases rather than added beside them.

| Lock | Where | The mutation | What it said |
|---|---|---|---|
| **QC-rows** | QC6 | take the card's `margin-bottom` away | `the cards are 0,0,0,0,0 apart` |
| **QC-band** | QC11 | title the list instead of heading the group | `the ungrouped band is not the your-move group's head` |
| **QC-guide** | QC13 | lift it off the foot again | `860: the card moved off the window's foot` |
| **QC-rail-groups** | QC9 | drop Watch and wait | `the rail does not draw the three attention groups in order` |
| **QC-desk-foot** | QC1 | drop the date clause | `a foot states no date clause at all: "RL IK MR EV +8"` |

⚠️ **QC10 needed one more allowance, and the reason is the clock.** The rail header's counts line went
`195.141px → 196.172px` between two runs on the same code, because a query crossed a threshold and
`17 upcoming` became `18`. Its TEXT was already excused as data; its WIDTH is the same fact wearing a
number. Height, vertical offset, type, colour and every other property stay exact.

## Gates

| | before | after |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `vite build` | clean, 0 flagged | clean, 0 flagged |
| Vitest | 8,227 passed · 3 skipped / 511 | **8,227 passed · 3 skipped / 511** |
| The locks | 14 passed | **14 passed** |

⚠️ **`strictNullChecks` is off here, so tsc let `when: null` through and it crashed at runtime** when
`CourtWhen` stopped being nullable. The unit suite caught it; the typechecker could not.
