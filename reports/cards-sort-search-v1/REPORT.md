# Cards, sort and search v1 — Query Centre v142.1, Sort in the Cards view, the recessed-well search

Branch `cards-sort-search-v1` (worktree `~/ScriptAlly-css1`). Not merged to main. The two mocks and sixteen screens are
in `design-refs/cards-sort-search-v1/`; every SHA256 matched the pack's table before anything was built (they came from
`~/Downloads/cards-sort-search-v1.zip`), and all eighteen are enrolled in `.refhashes.json`.

## 1. False premises and deviations

1. **The Query Centre's sortable headings are not the pack's five.** The code has six: Agent, First queried, Where it
   stands, What you sent, Next move and Due. "What you sent" and "Next move" are missing from the pack's table, and
   "Last changed" is not a heading (no sort key existed for it). The chip offers Due date first (the default), then the
   headings in their own order, then Last changed (§4).
2. **"Last changed" needed a sort key, not just a menu item.** It is new: `changed`, sorting by the date the query
   reached the stage it stands at, or else its last activity (the same date the jump row's "CHANGED" months already
   used). It has no heading, so while it is chosen the List view shows no active heading.
3. **The Contact list's headings are named "Agent" and "Replies".** The chip uses the pack's words ("Surname", "Reply
   time"); the keys are the headings' own, so the chip and the headings stay one sort.
4. **L3's "padding equal" can only hold vertically.** The two ledgers place their glyph on their own rows' disc column:
   the Contact list's rows start 78px in, the Query Centre's 40px. Equal left padding would put one glyph off its
   discs. L3 compares the background, the top and bottom padding, the height and both fonts. The hairlines are gone.
5. **The chip squeezed the full-screen jump row to nothing.** With the chip on the cream toolbar, every glyph folded
   into "+N more" at 1280, and only one showed at 1512. QC142 L6 found it. The toolbar's own give-way steps (Group by
   drops "Grouped by", Find narrows to 210) key on its whole width, which in full screen includes the 196px inset past
   the hawk, so they never fired. In full-screen Cards at a window of 1,600px or less those two steps are now taken, and
   three glyphs show at both widths, as in v142. The chip's own "Sorted by" fold measures the toolbar's content box for
   the same reason.
6. **The Contact list's toolbar clipped "Filters" in Cards.** Its give-way pass only knew how to tighten the letters. It
   gains a level 3 that folds the chip's "Sorted by".
7. **The Contact list's jump row hides every name but the current one.** Months have no mark, so a month showing only
   its count would be unreadable. Months now name themselves at every fit level.
8. **The mocks' Sort chip drives the headings by clicking them.** Here the chip writes the page's one sort state
   directly (`onSort`), as the pack asks.
9. **The mocks' shells are 8px wider than dev's**, as the pack says. Only the look of the chip, its menu and the well
   was ported.

## 2. Base

`bf766a32`, the tip of `dev/…-cl20-about1-qc142`. It is what dev served (`index-cV8aKfVq.js`, reproduced byte for byte
by a local build). Baseline gates: tsc 0, build 0, Vitest 638 files / 9,393 passed / 3 skipped (exit 0). The v142
locks were green on it.

## 3. Per part

| Part | Commit | What changed |
|---|---|---|
| A1 | `ef0490e4` | Three cards a row from a 1,100px list card (`CARDS_THREE_FROM`): three at 1512 with the sidebar open (list card 1,208px) and in full screen, two at 1280. Also enrols the refs. |
| A2 | `b7f39da3` | "Export {v} queries" in the filter strip's header, right of the count; "Export all {N} queries" with nothing filtered; the applied row keeps its copy. One handler (`exportQcList`). |
| A3 | `9df3297c` | No hairlines on the Query Centre's List group heading (the Contact list's has none). |
| A4 | `ce1577c2` | Keys: the list keys walk the cards in reading order (j/k, the arrows once a card has the ring, Enter, L). Loading: in Cards the placeholder is three or two placeholder cards (`QcCardsSkeleton`), with no row placeholders. |
| B (Query Centre) | `28a5799d` | The shared Sort chip and menu (`shell/SortChip` + `sortChip.css`), in the Cards view only, just before Group by, in Group by's own box. A new `changed` sort key for Last changed. |
| B (Contact list) | `b078138b` | The same chip, before Group by. A level 3 in the toolbar's give-way pass. The jump row follows the sort: ungrouped and sorted by Date added, it shows months in both views. |
| C | `b21bad53` | The recessed well, one shared sheet (`shell/findWell.css`), on both Find fields. |
| Fixes | `7d9c3896` | Room for the jump row in full-screen Cards; the chip's fold measures the toolbar's content box; the well's height and radius apply only on the navy toolbar. |
| Locks | (the last commit) | CSS1 L1–L9, the re-points, the shots and this report. |

**Shared:**
- **The chip and its menu:** `src/components/shell/SortChip.tsx` (`SortChipButton`, `SortChipMenu`) and `sortChip.css`. The chip owns no state. Each page passes its own sort, its fields (`lib/cardsSort`) and the class of its own chip box, so the chip matches that toolbar's Group by in both positions.
- **The well:** `src/components/shell/findWell.css`. A field takes it with `fw-well`, plus `data-full` on the cream toolbar.

## 4. The sort fields as found

| Page | The column headings (code) | The chip's fields | Compared with the pack |
|---|---|---|---|
| Query Centre | Agent · First queried · Where it stands · What you sent · Next move · Due | **Due date** · Agent · First queried · Where it stands · What you sent · Next move · Last changed | The pack lists five, in a different order, and omits What you sent and Next move. Last changed is not a heading; it is new (`changed`), and no heading is active while it is chosen. |
| Contact list | Agent (surname) · Date added · Replies · Query status | **Surname** · Date added · Reply time · Query status | The same four, in the same order. The chip uses the pack's words where the headings say "Agent" and "Replies". |

**The order switch's words**, each mapped to the direction it sets. The first press on a heading, and choosing a field
in the chip, both give the first direction listed:

| Field | First direction | Second direction |
|---|---|---|
| Due date | Soonest first | Latest first |
| First queried | Oldest first | Newest first (the switch draws Newest first on the left) |
| Last changed | Oldest first | Newest first (drawn Newest first on the left) |
| Agent, What you sent, Next move, Surname | A to Z | Z to A |
| Where it stands | Earliest first | Furthest on (drawn Furthest on on the left) |
| Date added | Newest first | Oldest first |
| Reply time | Fastest first | Slowest first |
| Query status | Furthest on | Earliest first |

## 5. Locks

Ledgers are in `reports/cards-sort-search-v1/ledger/` (`base-`, `mut-`, plain = green). The base readings come from a
local build of `bf766a32` (`index-cV8aKfVq.js`, dev's own) on the same port.

| Lock | Base (red) | Under its break (red) | Green |
|---|---|---|---|
| L1 columns | 6/8 (two at 1512) | 6/8 (src: back to 1,240) | 8/8 |
| L2 export | 2/6 (no export in the strip) | 2/6 (hidden when unfiltered) | 10/10 |
| L3 headings | 10/12 (the hairlines) | 10/12 (the hairlines back) | 12/12 |
| L4 keys | 2/8 (j does nothing in Cards) | 2/8 (j bound to rows only) | 8/8 |
| L5 skeleton | 6/8 (row placeholders in Cards) | 6/8 (src: always rows) | 8/8 |
| L6 one sort | 46/72 (no chip) | 46/72 (src: the chip holds its own state) | 72/72 |
| L7 chip placement | 8/16 (no chip) | 8/16 (src: shown in List too) | 16/16 |
| L8 jump row | 8/12 (letters only) | 8/12 (src: never months) | 12/12 |
| L9 well | 12/20 (white Find) | 16/20 (white at rest) | 20/20 |

- **The source breaks:** L1, L5, L6, L7 and L8 cannot be made from outside the app. Each was an edit made in this
  worktree from a path-derived backup, rebuilt, measured and undone; `src` was clean after.
- **Population first:** every lock asserts its population before anything else.
- **L6 covers more than the brief asked.** It runs every field in both directions through the chip, checks the List
  heading and its arrow each time, and requires the same id order in both views. It then runs three headings the
  other way, from the List heading to the chip.

**L10, the older suites:**
- **Green as they were:** QC142, QC141, QC1411, HR1 (HR1-8's reference recaptured against the base build), CL20,
  CL19.2, and QC1401 (A1 re-pointed and A2 restored, per A2).
- **Green after re-points:** QC140, CL19 and CL19.1.

| Suite · case | What |
|---|---|
| QC1401 A1 | Re-pointed to the strip header's export button. The applied row's copy no longer carries `data-qc140="filter-export"`. |
| QC1401 A2 | Restored: "Export all {N} queries" with no filters, and disabled at 0. |
| QC140 B1 | Re-pointed: "no ring on the controls" now exempts Find, whose inset ring is the well; Group by and Filters still have none. |
| CL19 P1 | Re-pointed: Find's colour and radius differ between the two positions by design (the well, and the cream toolbar's white field). |
| CL19.1 F1 | Re-pointed: unpinned, Find is the recessed well; pinned, it is white with the well's inset 16% outline. The other controls are unchanged. |

## 6. Screenshots

`reports/cards-sort-search-v1/shots/`, at 1280 and 1512, matching the refs:

- `qc-01-list`
- `qc-02-cards`
- `qc-03-sort-menu`
- `qc-04-search-typed`
- `qc-05-full-screen-cards`
- `cl-06-sort-menu`
- `cl-07-cards-by-date-added`
- `cl-08-list-same-sort`

## 7. Integration and dev

(filled below)
