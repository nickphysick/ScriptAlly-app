# Comparable titles v27.1 — report

Branch `comps-v27-1`, cut from `comps-v27` at `80532d2a`. Not merged.

| Part | Commit |
|---|---|
| Locks W1, W2, X1 and their red-first readings | `ebe9ed1c` |
| A · the library in the column | `63037772` |
| B · one centred close button | `d4349ad7` |

The consolidated lock run was made at **`d4349ad77903e4b249505951d157294688fed2f8`**. The dev build is recorded in `INTEGRATION.md`, on the dev branch only.

## 1. False premises

1. **The glyphs were already SVGs, not text.** All five close buttons drew the same 12px SVG ✕. The off-centre was the button, not the character: see §2.
2. **Four of the five were off-centre, not all five.** The pop-up's ✕ (built in v27) was already centred. It was 12px in a 36px button where this prompt asks for 14, so it changed too.
3. **In the column, the 280 search and the Books and Film and TV chips never appear.** The prompt keeps v25's widths "measured against the list's width", hidden below 1300. The widest the column gets is 1256 (at a 1920 window), so in normal view the search is 220 or 170 and those two chips are always hidden. They appear in full screen only.
4. **W2's "compact grid at both sizes" was already true at 1512 and 1280.** The wide grid was tied to the shell's wide sheet, which neither size reaches. It was wrong at 1920 in normal view, so W2 also reads 1920 and that is its red-first reading.
5. **The close button is not shared outside comps**, so the fix reaches nothing else (§2.3).

## 2. §0 findings

**2.1 The break-out.** `.cv-lib` set its own width from the shell's measured sheet width (`--cv-w: min(1600px, sheet − 48px)`) and centred itself on the column with a negative-going calc margin. The heading is inside that box, so it broke out with the list. Locks that read the library's width or edges: CV25 D1, D2 and F1. No AD or V27 lock reads them.

**2.2 The close buttons.** Five, all in `comps25/`: the comp drawer and the add drawer (one button, `CompDrawer`), the picker, the Scout drawer and the pop-up. They shared an icon (`CloseIcon`) and four shared a class (`.cv-x`); the pop-up had its own (`.cv-hwx`). There was no shared button.

**Why it was off-centre.** `.cv-x` gave the button a size and colours but no layout. Tailwind's preflight makes every svg a block and gives buttons no padding, so the 12px glyph sat at the button's left edge. Measured before the fix, glyph centre against button centre:

| Button | 1512 × 900 | 1280 × 800 |
|---|---|---|
| Comp drawer | 11.00 left, 0.00 down | 11.00 left, 0.00 down |
| Add drawer | 11.00 left, 0.00 down | 11.00 left, 0.00 down |
| Picker | 11.00 left, 0.00 down | 11.00 left, 0.00 down |
| Scout drawer | 11.00 left, 0.00 down | 11.00 left, 0.00 down |
| Pop-up | 0.00, 0.00 (centred; glyph 12 in 36) | the same |

**2.3 Outside comps.** Nothing outside `comps25/` used `CloseIcon` or `.cv-x`. Other pages have their own close buttons, most of them a text "✕" or "×" (the agent card, Housekeeping, the Query Centre's modal and open card, the query drawer, the page guide, the feedback dock). They were not touched.

## 3. What was built

- **A.** `.cv-lib` takes the column. The break-out moved to `.cv-page.is-full .cv-lib`, unchanged in size. The wide row grid is a container query on the list (from 1416px, which is 1440 of sheet) inside full screen. The bar's thresholds are 1300 and 1100 of list width.
- **B.** `CloseButton` in `comps25/marks.tsx` replaces the five hand-written buttons. The button is a grid with no padding and no line box; the glyph is an SVG of two round-capped lines at 1.75, 12 × 12 in 34 and 14 × 14 in 36, in `currentColor`. Sizes, colours, hover and focus are each button's own, as before. All five are named "Close".

## 4. New locks: red and green

**Consolidated green run:** every new, V27, AD and CV25 lock in one pass on a dev bundle built from the clean tree: **39 passed; new 60 readings, V27 106, AD 161, CV25 196, all green** (`run-consolidated.txt`). Gates at the same commit: typecheck clean (app and functions), both builds clean, Vitest 571 files, 8,629 passed, 3 skipped (the baseline's figures).

| Lock | Red first (unchanged build) | Mutation | Red under it | Green |
|---|---|---|---|---|
| W1 column | list 272.0–1480.0 against panel 296.4–1455.6 (1280: 272–1248 against 289–1231) | Restore the break-out in normal view | the same readings | list, heading, panel and strip all 296.4–1455.6 (1280: 289–1231); heading 16 above; full screen 12 and 12 from the sheet; back in the column after |
| W2 grid | at 1920: `446 446 284 284 at a list 1600 wide` | Keep the wide grid in the column | `226 226 284 284` at 1512, `117 117 284 284` at 1280 | compact at 1280, 1512 and 1920; bar one row, no overflow, no overlap at 1024, 1280, 1512; full screen wide only from 1440 of sheet |
| X1 centred | four buttons `off by -11.00 across`; the pop-up's glyph 12 where 14 is asked | Swap the SVG back for a text "✕" | `svg false · text "✕" · glyph 12.2 × 22.0` on all five | each: one button named "Close"; an SVG 12 × 12 in 34 (14 × 14 in 36); `off by 0.00 across, 0.00 down` |

## 5. The re-runs

- **CV25:** 12 locks, 196 readings, green. Rewritten: **D1** (the heading's edges are the list's, and the list's are the panel's), **D2** (widths by list width at 1300 and 1100; it now opens full screen at 1920 to reach the 280 search), **F1** (the list does not break out before full screen, and is back where it was after). D1 and D2 were proved red again under their mutations (heading inset 24; search 313 where 220). The other nine read as on v27.
- **AD:** 9 locks, 161 readings, green, reading for reading as on v27.
- **V27:** 10 locks, 106 readings, green, reading for reading as on v27.

## 6. To check

- **At 1280 the rows are tight in the column.** The list is 942 wide, so a long title is cut ("The Tidewater Li…") and two letter chips stack. That is the compact grid the prompt asks for at that width; see `shots/library-1280.png`.
- **The Scout tab sits over the last column of the first rows** at 1280, as it did before; the list is now narrower, so it covers more of "Next move".

## 7. Not done, and not verified

- The phone layout was not looked at. Below 768px the library already took the column.
- No close button outside comps was changed or measured.

## 8. Shots

In `reports/comps-v27-1/shots/`, at 1512 and 1280:

- the library: `library-*.png` (normal view), `library-full-screen-*.png`;
- the five close buttons, each with 30px around it: `close-comp-drawer-*`, `close-add-drawer-*`, `close-picker-*`, `close-scout-*`, `close-pop-up-*`.
