# Manuscripts v28.1: button labels and the logline quote

Branch `manuscripts-v28-1` (worktree `../ScriptAlly-ms281`), cut from **a361e487**, the tip of
`dev/css1-pv3-ms27-ms28`, which dev served as `index-Boa5GRP3.js` (Manuscripts v28). One commit for the change, one
for the locks and this report.

## False premises

1. **"Remove the no-wrap span" as A3's mutation can't turn A3 red.** The closing mark sits right against the last word,
   with no space. Browsers never break a line before a closing quotation mark (Unicode line-breaking rule LB19), so the
   mark stays with its word with or without the span. Both lines also use `text-wrap: pretty`, which avoids a
   near-empty last line. The prompt's mutation was run and stayed green at both widths.
   - **The span is kept, as asked, as a third guard.** To show the lock catches a mark that wraps alone, I made the
     mark breakable (a space before it, `inline-block`) and turned off both `nowrap` and `pretty`. A3 went red at both
     widths: at some width the mark fell 26px, one line below the last word. The same breakable mark with only the
     span left in place stayed green, so the span alone holds it.
2. **"The mark's top within 4px of the last line's top."** The closing mark is a 40px glyph beside 17px text (44px
   beside 21px in the book view). Its glyph top sits 4.75px below its line's top on the page and 8px in the book view.
   The opening mark sits exactly the same way on the first line, measured beside it.
   - A3 reads the brief's claim as "the closing mark sits on the last line exactly as the opening mark sits on the
     first" (within 1px), and also requires it to be within 8px of the last line's top.
   - Measured: page 4.75 against 4.75; book view 8 against 8, and 7.625 against 8 at one width.
3. **"Search its Help Centre article."** The Help Centre has no Manuscripts article. `helpArticles.ts` doesn't mention
   the page, and no help copy names these buttons.
4. **The guide's copy** (items, step cards, notes) never named "Edit details", "Full details" or "Read it all". The step
   cards say "press Save details", which stays as the brief says.
5. **"Delete the logline" for the empty state isn't possible.** The rules require `logline` as a string, and the drawer
   writes `""` when it's cleared. The A3 fixture empties it the same way.

## Base

`dev/css1-pv3-ms27-ms28` at **a361e487**, served as `index-Boa5GRP3.js`; it carries Manuscripts v28.

Baseline gates: `tsc` clean; production build with no CSS warnings; Vitest 643 files pass, with three `functions/`
files red (they need `functions/node_modules`). The gates after the change are the same.

## Every string changed

| Where | Before | After |
|---|---|---|
| Page header, primary button | Edit details | **Edit** (accessible name "Edit the book's details") |
| Page header, secondary button | Full details | **View summary** (accessible name "View the book's summary") |
| Logline strip | Read it all (a link) | *(removed)* |
| Book view, footer button | Edit details | **Edit** |
| Logline, page and book view | *(nothing after the last word)* | a rust **”** bound to the last word |

**Left as they were:**
- The drawer's **Save details** button, and the step cards' "press Save details".
- The details card's accessible name, "See the book's full details". It isn't one of the header's buttons.
- The drawer's accessible name, "Edit details: {title}". It names the drawer, not a button.
- Two strings that can't render: `Msv21Parts`' `BookCard` has no caller, and `ManuscriptActions` / `ManuscriptHeroCard`
  belong to retired pages.
- **Comment updated:** `MsEditDrawer.tsx`'s header note listing the drawer's entries.

## Locks (MSV281)

`tests/e2e/manuscriptsV281.measure.ts`, at 1512 × 900 and 1280 × 800. All three pass at both widths.

| Lock | Green reading | Natural red (dev, v28) | Named mutation → red |
|---|---|---|---|
| A1 labels | "Edit", "View summary", both accessible names; Edit opens the drawer (fixed, right edge 8px from the viewport, left 864 / 632); View summary opens the book view; its footer reads "Edit"; no old label on the page or in the book view | labels differ at both widths | "Full details" restored → labels differ at both widths |
| A2 no link | strip holds 0 controls; the line's right edge equals the strip's inner right (1440 = 1440; 1208 = 1208) | 1 control at both widths | "Read it all" restored → 1 control at both widths |
| A3 quote | ” at the end of long (3 lines) and short (1 line), page and book view; colour `rgb(162, 69, 42)` and font 40px Special Elite, the same as the opening mark; across 223–505 widths the mark never leaves the last word's line (worst 0.75px); empty: no mark, "Add one" kept, and none in the book view | no ” at both widths | no mark → red; mark in the text's colour → red; breakable mark with `nowrap` and `pretty` removed → 26px fall, red. **The prompt's mutation stays green** (false premise 1). |

The proofs are in `mutation-proofs.jsonl` and `natural-reds.json`.

**A1's first version passed while the drawer was still sliding in** (right edge at −656, which is "≤ 12"). It now waits
for the slide to finish and requires the edge to be on screen.

**A1's first red was a click timeout.** The lock tried to click "View summary" before checking the label. It now checks
the labels first, so the red names the wrong label.

**A3 writes the ms21-filled book's logline** (long, short, empty) and restores it through `tests/e2e/ms28Fixture.mjs`,
which now also handles `logline`. After every run the logline was back as it was.

### L1

All green on this build: MSV281 7 passed, MSV28 23, MSV27 23.

**Changed deliberately:**
- MSV27-B1 opens the book from View summary and the card only (`read-all` is gone).
- MSV28-A1's title says "Edit".
- `msv27Smoke` asserts the new labels and accessible names, and a strip with no control ending in the bound mark.
- A new unit test, `v28/quotedLine.test.tsx`, checks the split and that the copy is unchanged.

## Shots

In `shots/`, on the harness account: `01-book-container-{1512,1280}@2x.png` and `02-open-book-{1512,1280}@2x.png`.

## Integration and deploy

- Dev still served `index-Boa5GRP3.js` from `dev/css1-pv3-ms27-ms28` at a361e487, this branch's base. So the
  integration branch **`dev/css1-pv3-ms27-ms28-ms281`** is a fast-forward to **c9b16255**, the commit the gates and
  locks ran on.
- Built from a clean checkout of c9b16255. The served hash was re-checked in the same command, then deployed (hosting
  only, `--project scriptally-dev`). **Dev now serves `index-BmbaNVwq.js`.**
- MSV281 against the deployed site: all green at both widths, with the logline restored afterwards.
- Not merged to `main`. Prod untouched. No rules or functions changed.
