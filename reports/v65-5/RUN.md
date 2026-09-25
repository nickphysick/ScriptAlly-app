# Query Centre v65.5 — two faults on dev at `bcf0626b`

Both were against the design, both passed their locks, and both locks were wrong in the same way:
they asserted that a thing *happened* without asserting *where*, or *what stayed as it was*.

---

## Fault 1 — the expanded view did not open on today

### The scroll log, which is the answer

Every write to the calendar body's `scrollLeft` from open to settled, against the **deployed dev
build**, at 1440×900, with the font requests held back 1.2s:

| open path | writes | t (ms) | wrote | landed | clientWidth | scrollWidth | today at |
|---|---|---|---|---|---|---|---|
| `?view=calendar` | 1 | 1856 | 9412 | 9412 | 1082 | 12153 | 58.1% |
| rail's ⤢ (click) | **2** | 6775 | **3028** | 3028 | 1082 | 12153 | **907%** |
| | | 6791 | 9412 | 9412 | 1082 | 12153 | 58.1% |

**The first write on the click path is the fault.** 3,028 against a correct 9,412 — the view opening
about two years in the past. It is corrected 16ms later, and *only* because the reveal's
`clip-path` `transitionend` clears the placement flag and the width is re-read.

### Why it happened

The scroller's `clientWidth` is read before the card's own layout has clipped it, so the first read
returns **the whole track** — about 12,050 — instead of the ~1,082 the scroller really has.
`scrollForToday` then answers 3,028, the write lands, and the success check cannot refuse it,
because 3,028 is a real, reachable position on a 12,153px track.

**On any open where `transitionend` does not arrive — a card already open, an interrupted
transition, reduced motion, a slow first paint — nothing corrects it.** That is the shape of Nick's
account: the numbers all agree with each other, two years out.

Of the four causes the brief listed, this is the fourth: *the value clamped because it was written
while the track was narrower than its final width* — except it is the mirror image. The track was
not narrower; the **box** was measured as wider, which produces a smaller, plausible answer rather
than a clamped one. The other three were checked and are not it: no re-render restores a saved
scroll (the only writes are the ones above), the write goes to the element that scrolls (it lands),
and `pxd` is local state that starts at its default and is only changed by the reader.

### The fix

1. **A width wider than the window is refused.** The scroller is inside the window, so it can never
   be wider than it. That is a fact about the layout rather than a tuned threshold, and it is the
   one check that tells a real narrow box from the content's width without knowing what either
   should be. **This removes the bad write at source** — the view no longer has to be rescued.
2. **The zoom joins the key and the deps.** The track is the extent times `pxd`, so a zoom moves
   where 58% of it falls exactly as an extent change does, and `pxd` was in neither. The
   requirement is now all three: *until the reader's first move, every change to the extent, the
   zoom or the body's width re-applies today at 56–58%*; after it, `touched` refuses every one.
3. **The width is re-read on `document.fonts.ready`.** A late face changes the tray's height and the
   title's width, and neither is a resize of the scroller, so the observer never hears about it.

### The lock, and why the old one could not see this

The old lock read the position **once, after everything had settled** — which cannot distinguish a
view that was placed correctly from one that was corrected. Removing the width guard left it green.

It now records **every** write and requires each one to put today at 56–58%, because the reader has
touched nothing and so every one of them is the app's own placement. Re-run with the guard removed
it fails with the finding in the message: `wrote=3028 … today at 907%`. It also asserts no
placement was computed against a width wider than the window, and re-reads the position two seconds
later with nothing touched in between.

### The fixture, and what it showed

`qcReviewAid` gained two dev-only knobs — `__SA_QC_OLDEST` (re-date the oldest live send) and
`__SA_QC_BATCH2` (hold the oldest third back, so the rows arrive in two batches). They fabricate
**input**, like the two knobs already there, and are stripped from production.

**The two-batch case did not reproduce anything the single-batch case did not.** The harness
account's extent is already ~1,100 days — wider than Nick's ~900 — so the widening the brief
expected from a second batch was not the variable. The variable was the open **path**: the rail's ⤢
places once against a bad width, and `?view=calendar` does not.

---

## Fault 2 — a bar click left the view

### It was not D4

D4 routed nothing. The behaviour was a **deliberate deviation recorded in a comment** in an earlier
pass, at the calendar's `onOpen`:

> *"this app already has exactly one house for an open query on this page, and a second one would be
> two surfaces free to disagree about the same query — the fault the docked card replaced the drawer
> to end. Recorded as a deviation."*

**The reasoning was right about the card and wrong about the route.** There is still exactly one
card; what changed is that it can be drawn in one of two homes. A reader who clicks a bar to look at
a query is no longer thrown out of the view they were reading it in.

### One composition, two homes

The card's three tab bodies, the CTA engine's answer, the notes thread and the Correction UI are
~250 lines built once from the page's active query. A second set for the calendar would have been a
second composition of the same query — the exact fault the docked card was introduced to end.

So the calendar re-points **which** query is described (`beCard`, which never touches `?q`) and the
page decides **where** the card is drawn (`qcOpenCardNode`, one element, rendered by the rail *or*
the calendar and never both). The rail's docked card is for clicks on the page — the ledger and the
fanned cards — exactly as the design says.

- 420px, centred on the calendar body, over `rgba(28, 19, 15, 0.42)`.
- The view underneath is untouched: scroll, zoom, filters, grouping and Find.
- **Two backdrops, one rung each.** The view's closes the view; the card's closes the card. A single
  backdrop would have to work out which of the two things above it the reader meant, and the answer
  is always the nearer one.
- **Escape cascades from the one handler** that already owns it: popover, then card, then calendar.
  Two `document` listeners would be resolved by mount order rather than by what is on screen.

### The lock, and the general rule it came from

The old §D4 lock asserted a bar and a name each *opened* the query — and both did, by closing the
calendar and docking the query in the rail. **Every assertion was true and the behaviour was the
opposite of the design.**

The new one asserts where it opens and what stays: the card is visible *and* the calendar is still
open, the horizontal and vertical scroll are unchanged (measured after deliberately scrolling the
view somewhere of its own, so "unchanged" is not a claim about zero), the rows are unchanged, the
rail has not docked anything, and `?q` has not moved. Then one Escape closes the card and leaves the
calendar; a second closes the calendar.

Proved red three ways — routing the click to the rail, closing the sheet on open, and one Escape
closing both. One probe fault of my own on the way: the centred card is the *same component* as the
rail's, so it carries the same `open` probe and the "rail untouched" count read 0 → 1 by
construction — it would have failed on a page where the rail was perfectly untouched.

---

## The Next-action thresholds

One line of small print under the Group popover's "Next action", reading the two constants from
`qcCalView` rather than restating them, so the words cannot drift from the classifier:

> Nudge due: past the expected date · Consider closing: 4+ weeks past, or 12 weeks with no date

---

## Gates

**⚠️ ONE RED IS ANOTHER SESSION'S AND IS NOT MINE.** `src/marketing/marketingTokens.test.ts` fails
because `src/components/agents/contact/contactV11.css` — **untracked, and not a file this pass
touched** — names one of the two font families that sweep forbids. `git status` shows that file and
`AgentList.tsx` dirty from another session working in the same checkout. Established by reading, not
by moving anything.

Everything else: tsc clean, production build clean, **8,417 passed** with that one failure.
