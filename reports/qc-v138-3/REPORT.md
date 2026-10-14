# Query Centre v138.3: the peek as bars, the open row, and the group art

**Where this ran:** case 1, "v138.2 is on dev". Branch `query-centre-v138-3`, cut from `dev/…-qc1381-qc1382` at **`fb6ce96c`**, the branch dev served (`index-IhaXnpGa.js`). The baseline build of that tip was byte-identical to what dev serves. All ten reference SHA-256 values match, and the html is enrolled in `.refhashes.json`.

## False premises, deviations and decisions (read first)

1. **The talon does not break out of the band's top edge with the given numbers.** At 46px wide the art is 64px tall. With `bottom: −14px` on a 56px band, its top sits 6px inside the band, and it overhangs the band's bottom by 14px instead. The hourglass (54 wide, about 55 tall, bottom −12) also overhangs only the bottom. I built the prompt's values and measured the result. If "breaks out of the top" is the intent, the bottom offset needs to be about −22 or less.
2. **Your-move markers draw the dashed ring with the prompt's values, which differ from v138 A as built.** The prompt says the ring is "from v138 A" at r 18.2, stroke 1.7, dash 2.6 3.1. The header's ring is r 18.6, stroke 1.5, dash 2.6 3.2. The prompt's values win in the peek; the header is unchanged. `StageGlyph` gained a `ring` prop for this.
3. **Your-move events are Partial requested, Full requested, R&R and Offer.** Signed counts under the Offer glyph, but it isn't the writer's move, so it doesn't get the dashed ring. The ring is decided per event (`YOUR_MOVE_STATUSES`), not per glyph.
4. **"The pinned row" exception has nothing to apply to.** The pinned header row draws the stage glyphs, not the band icons. A band that sticks under it keeps its art, as the reference's `screens/01` shows. Only compact density brings back the small icons. F1 asserts that no art appears inside the pinned row.
5. **"The most-stretched gap" still means the widest gap** (v138.1's reading, kept), now with 8px spacing. The oracle takes the largest px-per-day, which picks "week" off any gap held at the 64px minimum.
6. **The axis's "tick where a year/month starts" is the first tick whose date falls in a new year or month.** The oracle tests for January or a date of 7 or less, which never fires for quarter or year rulers. Months are labelled under week and month rulers only, as in the oracle.
7. **A same-day stop shows the stage the day ended at, and a nudge doesn't change it.** The first build let "Full sent · Nudged" take the nudge's null stage and draw no glyph; the census caught it. Fixed in `da98f440`.
8. **QC138.2 B1 was edited, though it wasn't on the edit list.** It asserted the dashed rule that Part D makes solid, and is now noted as such.
9. **The two source PNGs (2.3MB) ship in `dist`,** because the prompt puts them in `public/images/query-centre/`. Only the WebPs (about 6KB each) are referenced. Moving the PNGs out of `public/` would keep them as the source without shipping them.
10. **At 1280 the offer row's tray pill truncates ("Record your ans…").** That is Part E working as specified: the edit and close buttons are already icon-only, so the pill is what gives, and the tray stays clear of What you sent.

## Where the tray overlap came from on dev

v138's commit `2eae136d` gave the Next move text (`.qc138-nxm`) a `transition: opacity`, but no rule ever set its opacity. On hover only the Due figure faded, so the tray, which has no background, sat over live text. Part E fades both, gives the tray the row's current ground (`--qc138-pkbg`: Lift's white, a picked row's oat, the open row's wash), and caps it at its own cell.

## Commits

| Part | Commit | |
|---|---|---|
| A | `50c38f4f` | Bars at true scale (floor 0.35, 64px minimum), colour by whose turn, labels with no pill, 8px tick spacing. Each event's stage comes from the panel's own row (`status`). |
| B | `9a97cf97`, `da98f440` | Stage glyphs (dashed ring on your-move events), a navy ring for future dates, a rust dot for Was due, a rust tick for Today with "{d} over". Same-day stops keep the stage the day ended at. |
| C | `779fb344` | The dated axis (`axisLabels`); the key is removed. |
| D | `92aec8e6` | Outline + wash; the rule is solid. |
| E | `6e873cca` | The tray: text fades, the tray takes the row's ground, and it is capped at its cell. |
| F | `5433fdb6` | The talon and the hourglass, WebP at 2×. |
| G | this commit | Locks, edits, report, CLAUDE.md. |

## Locks (`tests/e2e/qcV1383.measure.ts`, 1512 × 900 and 1280 × 800, with the shell)

Every lock was green on the branch and red on its named mutation (`mutation-proofs.json`):

| Lock | Green | Red (mutation) |
|---|---|---|
| A1 | No cards; bars 10px tall; widths follow days across the free pairs; Partial requested `rgb(176, 96, 62)`, Partial sent `rgb(61, 80, 112)`, overdue hatched. | Equal widths: 99.3% off over 12 pairs. |
| B1 | pr, fs, of, ps, q and cl glyphs from status; dashed only on Partial requested and Offer; Today 3px with "2 weeks over"; no overdue label. | Every event a navy dot: no glyph. |
| C1 | No key; "Aug" under Clara's first gap; labels at least 34px apart and at least 52px from the gap's start. | Key restored: present. |
| D1 | Overdue `rgb(253, 248, 245)` with `rgba(162, 69, 42, 0.5)`; waiting `rgb(249, 250, 252)` with `rgba(45, 58, 80, 0.45)`; solid rule. | v138.2's tint restored: `rgb(252, 243, 238)`, no outline, dashed. |
| E1 | On eight rows at each width, Next move opacity 0 and the tray's left edge right of What you sent. | Text left visible: opacity 1. |
| F1 | Talon 46 and hourglass 54 (WebP), no white circle, both animated; none in the pinned row or compact; none animated under reduced motion. | Pencil kept: no art. |

**L1:** QC138.3 6 passed, QC138.2 3 passed, QC138.1 6 passed, QC138 16 passed.

**Edited, each with a note:**
- **QC138.1 D1:** markers, not cards. Today is a rust tick and Was due a rust dot.
- **QC138.1 D2:** the proportion check moved to A1; the overlap checks apply to markers; the overdue bar has no label; "no tick key".
- **QC138.2 A1:** retired, replaced by D1 here.
- **QC138.2 B1:** the rule is solid (see 8 above).

**Gates:** tsc clean; both builds clean; Vitest 8791 passed, and the only red is the known `functions/src/email.test.ts`.

## Shots (`shots/`)

- `01-bands`, `02-open-overdue` and `04-open-waiting` at 1512 and 1280, beside `screens/01`, `02` and `04`.
- `03-lab-cases` at both widths: screens/03's four rows, plus a Full sent, through the peek lab.
- `05-open-closed` and `06-open-offer` at both widths.

## For Nick: events that couldn't be mapped to a glyph

One, out of all 73 rows (`glyph-census.json`):
- **"Nudged — no reply"** on `rj-nudge` (Tamsin Probewell). A nudge isn't a status, so it draws the plain navy marker. The id suggests a fixture; real accounts will show the same marker for every nudge and every holding reply.

## Integration and dev

(appended at deploy)
