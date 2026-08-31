# Calendar v40 — one card per relationship

**Branch** `main`, direct. **Commits** `b1317557` → `1095b1fe` (9).
**Deployed to dev**: see the foot of this report.

## The change in one sentence

A relationship is one card. It runs from the first send to today (if still
running) or to its named end; every status change along the way is a mark riding
on the card, and the text starts after the last mark. Fragments became impossible
by construction — there is nothing left to fragment.

## What the phases did

| § | What landed |
|---|---|
| 0 | Recon; the ref swapped, v39 retired with it |
| 1–2 | The action column deleted; today at the middle of the lane (0.0px, nine readings) |
| 3 | **One card per relationship.** `cutPieces`, `GAP`, `MIN_SEG`, `abutL/abutR` and `--tl-gap-mk` deleted. Marks at 22px, one ring, three glyph inks |
| 4 | The content ladder — full · headline · pill · stub — decided by the room **after the marks** |
| 5 | The row head's `StatusDot` at 18px; both kinds of mark take one box |
| 6 | Four views as tabs; one `Display` popover; the range slider retired; the marquee retired with it |
| 7 | Ghosts — a silence past 180 days stops being drawn as live work |
| 8 | Accepted at six widths × three ranges; the colour law's territory closed |

## The measured result

18 combinations, every one asserted visited. 23 cards / 23 relationships / worst
1 everywhere; 0 marks off their card; 0 content over a mark; 0 content outside a
card; today 0.0px from the lane's middle; no page overflow.

Ladder across the sweep: **full 147 · headline 46 · pill 221**.

## What the model lost, and why each thing had to go

Everything below existed only because a run was CUT. A replacement that is added
leaves the original reachable; only one that is swapped retires it.

- **`cutPieces`** and its six cases — a pure function with no path to a rendered
  root. Replaced by the composed claim it could not satisfy: *two hand-changing
  records still draw ONE card.*
- **`GAP` and `MIN_SEG`** — a clearance either side of an interruption, and the
  width below which the leftover was not worth drawing. The last thing the
  clearance did was paint every terminal mark 2px outside its own card.
- **`abutL`/`abutR`, `--tl-gap-mk`** — "does this piece touch a marker" is a
  question only a cut model can ask.
- **The marquee** — see the flag below.
- **`barFit.ts`** — superseded by the ladder, imported by nothing.
- **`.tl-seg2`, `TimelineRangeSlider`** — no subject and no caller respectively.

## Faults found by measuring rather than by reading

1. **The card took the side of the stretch before its START.** Identical to its
   end for a piece inside one stretch; for one card spanning every stretch a
   relationship has been through, that is the FIRST side rather than the current
   one — a card opened as a query and now holding a full request would have
   painted itself as still waiting, tone, pill and deed all from a stretch that
   ended months ago.
2. **Words under a 22px disc**, on the first one-card render.
3. **The fade inset taken as a ceiling.** A relationship that began before the
   window and changed status inside it has both a dissolving left edge and a mark
   to clear; content pinned at 623 with marks at 682 and 903.
4. **The pill's inset assumed rather than measured** — 13 in the pass, 46 in the
   sheet, disagreeing by 33px on a clipped card.
5. **The tier measured under the previous tier**, so pills clipped to nothing at
   the six-month board's right edge. The census changed substantially once it was
   honest: 6 months at 1440 went from 18 full / 5 pill to 4 / 16 / 3.
6. **`--tl-nearblack` declared on `.tl-board`** while the tools row renders
   outside it — the selected tab painted no fill and kept near-white ink on a
   near-white ground. Invisible, every rule correct, nothing to point at.
7. **`.tl-line` was `width: 100%` plus a left margin**, so its box ran past its
   own card by exactly the content offset.

## Findings about the checking, which cost more than the code

- **A `python3` replace with no assert is a no-op that reads exactly like a
  success.** Twice: the `tierFor` extraction never applied, so the module sat
  unit-tested with NO CALLER while the page kept its inline ternary; and the red
  proof aimed at that line mutated nothing and reported the lock green. Every
  mutation asserts its match count now.
- **The obvious red proof can be INERT.** At the `pill` rung `.tl-line` is
  `display: none`, so both `scrollWidth` and `clientWidth` report zero and the
  marquee guard's removal changed nothing. Only reddening the stylesheet's hide
  as well showed the guard doing its job.
- **A sweep that cannot say which subjects it visited is a sample wearing a
  census's clothes.** The headline rung fell from 40 to 9 between two runs with
  nothing changed, because a keyboard walk lost focus and every iteration re-read
  one board.
- **A driven state has to be the WHOLE state.** `data-noroom` and
  `data-tier="stub"` cannot coexist in the app; forcing a tier by hand left the
  attribute on and the stub's dot rendered `display: none`.
- **The subject of a comparison has to be typical.** The ghost case's "live" card
  was the first `out` one, which is hollow — already transparent and dashed.
- **`tail -4` hid eight failures.** The Playwright run printed `15 passed` and
  exited 1. The gate script reports the exit code beside the summary line, and
  every measured gate in this run went through it.
- **The territory of a law must grow with the territory.** Five modules were
  outside the colour law while the law read as covering the board.

## FLAGS FOR NICK

1. **THE MARQUEE IS RETIRED, AND THE BRIEF SAID "NARROWED".** Narrowing it to the
   `full` rung retires it: `full` is chosen precisely when the content fits, so
   `scrollWidth - clientWidth` cannot exceed zero there. Its own census proved it
   — 0 overflowing cards at every range. Unreachable by construction, not by
   fixture. `calendarMarquee.ts`, its 73-line spec, the hover listeners,
   `.tl-line`'s fade mask and the `fits` class all went. **Reversible**: recover
   from `a7380257`'s parent if you want sliding text back, but the ladder and the
   marquee are two answers to one question and keeping both is how they come to
   disagree.
2. **THE STUB RUNG AND THE GHOST STATE ARE BOTH UNREACHED ON THE HARNESS
   ACCOUNT.** Narrowest card 232px against a 60px threshold; longest silence 42
   days against 180. Both have their arithmetic locked in unit cases and their
   paint measured by applying the state to a real card. **Neither has been seen
   with real data**, and that is the one thing this run cannot give you.
3. **FOUR OLDER PACKS ARE RED AND WERE RED BEFORE v40** — `tlAccept`,
   `tlAccept7`, `tlPhase3`, `tlSettled`. Measured at `1904828b` in a throwaway
   worktree before believing it. They still listed five range stops (the 1-week
   and 2-week stops went in v35), so indices 3 and 4 had been clamping — two of
   five iterations silently measuring the six-month board twice. Their lists are
   spliced from the control now, and behind that they assert a board several
   rebuilds old: 0 bars, 0 columns, spines, density initials. **They want
   retiring or rebuilding; rebuilding four superseded packs unattended was not
   this run's call.**
4. **THE VIEWS PARTITION, WHICH PUTS SNOOZED WITH THE AGENTS.** A snooze is the
   writer deferring their own attention, not a change in whose move it is — but
   it is a judgement, and the alternative (a fifth tab, or rows in `All` only)
   is one line either way.
5. **THE 44px HEADER GAP IS STILL A VALUE, NOT HALF THE HEADER.** Recorded again
   because it is exactly the tidiness somebody later "restores".
