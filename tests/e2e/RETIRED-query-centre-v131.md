# Retired by Query Centre v131

Each case below is skipped with `retiredV131(why, by)` (`tests/e2e/inkRetired.ts`). A skip is not a pass. The report counts these cases.
v131 is desktop only (≥768px). None of these cases measured the phone, so the phone loses no coverage.

| Case | What it measured | Measured now by |
|---|---|---|
| `qcV126` QC126-4 · rhythm | band → desk → carousel → list banner, 40px each | QC1 (22 / 44 / 44) |
| `qcV126` QC126-8 · workspace | the blush workspace, the perched hawk, anthracite group bands, 10px row gap | QC9, QC10, QC11 |
| `qcV126` QC126-9 · sticky | the slim sticky controls bar | QC11 (group header + label row stick) |
| `qcV126` QC126-10 · full width | rows spanning the blush workspace's inner width | QC9, QC10 |
| `qcV96` QC1 | the v96 desk's halves, feet at one y however lines wrap | QC3 |

## Re-pointed, not retired (the claim still holds; the selector or the mechanism moved)

| Case | Change |
|---|---|
| `qcV126` QC126-11 · footer | "after the workspace" accepts the list's own wrapper (`listwrap`), and `≥` (v131's footer sits flush on it) |
| `qcV96` QC6 · tray | the Coming-up line counts as hidden when its `visibility` is hidden; v131 hides the chip instead of fading it. The floating-card treatment (10px gaps, radius 12, shadow) is asserted only where v96 rows render; on v131 the rows touch (QC9, QC10) |
| `qcV96` QC4 | scrolls the list's section header on screen before opening Group (the header no longer sticks, and a menu scrolled to closes) |
| `qcV96` run floor | the expected set of readings drops QC1 (retired); the floor goes from 7 to 6 |
| `inkFixups` HC4 | the compact hero's text wrapper is `display: contents`, so the title and intro are measured in its place. The disc must sit right of the pills, and the text starts 44px inside the card (v131 §1) |
| `livingHeadersV3` LH4 (band) | on `/queries` only the title and intro share the left x; the compact hero's pills are a column to their right (QC2) |
| `livingHeadersV3` LH1 | `/queries` skips the h1/intro vertical-movement check for a one-line intro, because the compact hero centres its stack. The header's height check stays |

## Red before v131, untouched (same files, run on the pre-v131 build `bd64166e`)

contentGeometry (a null rect), mastheadMatrix §3.3 (`/queries` header 395 vs 294 before, 338 after), plateHeader PH1–PH4 ×2 + PH5 (no capture), qcMatch (6 red), QC126-2, pageHeaderV2 §4.5 (switcher click timeout).
