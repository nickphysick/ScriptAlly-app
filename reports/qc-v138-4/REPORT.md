# Query Centre v138.4: the peek timeline as one positioned track with two label lanes

**Where this ran:** case 1, "v138.3 is on dev". Branch `query-centre-v138-4`, cut from `dev/…-qc1382-qc1383` at **`162e7f4a`**, the branch dev served (`index--dbyiy4q.js`). The baseline build of that tip was byte-identical to what dev serves. All three reference SHA-256 values match, and the html is enrolled.

## False premises, deviations and decisions (read first)

1. **The five-stop cap is gone, which conflicts with the reference.** v138.3 said the cap stays, but the acceptance case for Tom Ellery has six stops (Query sent, Partial requested, Partial sent, Offer, Was due, Today). The oracle has no cap either; it folds labels instead. QC138 F2 asserted the cap and has been edited.
2. **Today is always its own stop, as in the reference.** v138's rule that "an event on today's day takes Today's place" is gone; same-day *events* still merge. QC138 F2's same-day check has been edited to count event stops.
3. **Axis ticks sit on the markers' own scale, not the reference's linear one.** The oracle places month ticks linearly over the whole span, so once the 30px minimum has squeezed a gap, the ticks drift off the markers' dates. Here a date is interpolated between the two stops either side of it, so "Aug" is under August even after the push.
4. **Labels are measured with canvas `measureText` on the real faces (as the prompt asks); the oracle estimates axis-label widths.** The family names come from the `--sp-type` / `--font-mono` tokens at run time. The marketing lock allows exactly one owner of the "Special Elite" name outside the marketing sheet, and that owner is `--sp-type`.
5. **Durations count whole days, so Sophie Dunn's current stretch reads "2 weeks" where the reference reads "3 weeks".** That stretch is 21 Sep to 8 Oct, 17 days. The oracle counts fractional days (17.5 / 7 rounds to 3); this build uses v138's whole-day wording (17 / 7 rounds to 2). The prompt says durations take v138's wording.
6. **A label line is 1.15, not the reference's 1.25.** A lane is 42px either side of the track. A three-line label (name, date and a note, such as Sophie's "+1 SAME DAY" or Tom's "+1 EARLIER") at 1.25 is about 47px and ran past the drawer's foot (measured to 127). C1 caught it.
7. **The stretch from the latest event to "Was due" is drawn as past (grey).** The prompt's table doesn't cover it. The reference draws it grey, so does this build.
8. **Centred labels are clamped inside the timeline,** so one near an edge shifts rather than being cut off. A label that gains "+n earlier" after placement widens in place.
9. **Two older locks were edited although they weren't on the edit list:**
   - QC138.2 B1 now reads the timeline's own box, because markers sit 14px inside it at their true dates.
   - QC138 F2 loses its stop cap and counts event stops for the same-day check.
10. **At 1100 (the stacked drawer) there is 10px of air above the timeline.** An upper-lane label came within about 2px of "Open the full timeline".
11. **The parts split differently from the prompt's A–D:**
    - A carries the whole engine: positions, bars, axis, and the lane placement the labels need.
    - B adds the colours.
    - C locks the lanes with unit tests and fixes how a label fits its lane.
    - D sets the typewriter faces.
12. **D's commit message shows "72%%" where it means "72%"** (a `printf` escape on my side). Left on the record rather than amended.

## Commits

| Part | Commits |
|---|---|
| A | `e47727cf` |
| B | `3c7bd4f4` |
| C | `8052d27c`, `b7ec08fd`, `60e6197c` |
| D | `a2875ae6` |
| E | this commit |

## Locks (`tests/e2e/qcV1384.measure.ts`, 1512 and 1280 with the shell; C1 also 1100 and 1024)

The five acceptance cases (`tests/e2e/qc1384Cases.ts`) are forced through the dev-only peek lab against 8 Oct 2026. Each lock was green on the branch and red on its named mutation (`mutation-proofs.json`):

| Lock | Green | Red (mutation) |
|---|---|---|
| A1 | In every case with no forced spacing, the gaps keep the date ratio within 3%. Sophie's Today sits at 17/42 of the way from Partial sent to Reply due. | Markers in a flex row: ratios 0.567, 0.835, 1.473. |
| A2 | Every case 120 ±1, at both widths. | Labels add rows: 117.4, 92.3, 122.6. |
| B1 | No past bar is rust or hatched; past glyphs `rgb(93, 104, 120)`; the latest `rgb(28, 19, 15)`. | Rust past bars and ink past glyphs: both caught. |
| C1 | At four widths: no label's ink overlaps another's, leaves the timeline or straddles the track, and none is cut off. Tom shows "+1 earlier", Sophie "+1 same day". | One lane only: Query sent × Was due, Was due × TODAY, Offer × TODAY. |
| D1 | Names in Special Elite at 13.5 (TODAY 12). | Serif restored: Source Serif 4 at 12.5. |

**L1:** QC138.4 5 passed · QC138.3 D–F 3 passed · QC138.2 3 passed · QC138.1 6 passed · QC138 16 passed.

**Retired, each with a note:** QC138.3 A1, B1 and C1; QC138.1 D2's tick-key check.

**Gates:** tsc clean; both builds clean; Vitest 8794 passed, and the only red is the known `functions/src/email.test.ts`.

## Shots (`shots/`)

The five acceptance cases at 1512, 1280 and 1100 (`cases-*.png`). At 1100 the drawer is stacked (v138.2).

## For Nick: real queries where a date label fell back to its title

**None.** The census opened 144 peeks across the 73 real rows on dev at 1512 and 1280, and no date had to fall back to a `title`, either as a name-only label or on an unlabelled marker. The two weren't counted because their peek didn't open in time. (`title-census.json`)

## Integration and dev

(appended at deploy)
