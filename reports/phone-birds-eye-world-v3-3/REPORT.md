# Phone Birds-eye world v3.3: gone quiet stays hatched and sorts last; the level chip stays visible when open

Branch `phone-birds-eye-world-v3-3`, cut from `origin/phone-birds-eye-world-v3-2` (9d148cb67). One commit, not merged. Below 768px only.

The commit hash, the dev build it was merged on top of, and the served bundle are in the session's final message. They exist only after this commit.

## Gates

| Gate | Baseline (before any edit) | Final |
|---|---|---|
| tsc (8 GB heap) | exit 0 | exit 0 |
| `npm run build` | exit 0 (built in 1.88s) | exit 0 (built in 1.73s) |
| `npm run build:dev` | exit 0 | exit 0 |
| Vitest | Test Files 973 passed, 1 skipped (974) · Tests 13816 passed, 4 skipped (13820) | Test Files 973 passed, 1 skipped (974) · Tests 13817 passed, 4 skipped (13821). One more: the new gone-quiet test |

## 1. Gone quiet stays hatched

- **The quiet stretch is now hatched.** From the gone-quiet point to today it is the same 135° hatching as the stretch after the reply date. It keeps its top and bottom edge lines, under a mask from full to 8% at today (`QUIET_FADE`). There is no solid fill after the "!".
- **The colour key's "Fading out: gone quiet" swatch** is the same hatched fade.
- **Replay** draws through the same function, so it follows the same rule.
- **The recap's mini bars** draw only stages and the time ahead; they never drew the past or quiet tails. So there is nothing solid after an "!" there either.
- **Two things found along the way, both fixed:**
  - **A missing "!".** A query that went quiet before its last stage started (a stage reached long after the reply date) had a quiet tail and no "!" at all. The tail now carries the "!" (`BwSeg.mark`).
  - **A seam.** The hatched stretch and the quiet stretch are two elements. Each started its stripes at its own left edge, so a faint seam showed where they met. The stripes are now phased to the screen's x (`hatchAt`), so the two continue one pattern.

## 2. Gone quiet goes last in Needs action

- **Order:** in Needs action (and under the With you and Needs chasing pills), gone-quiet queries go last. Each part keeps v3.2's order, the most of its window used first.
- **What counts as gone quiet** (`isGoneQuiet`): open and more than the setting's days past its date. That is exactly where the bar's faded tail starts.
  - This includes a with-you query that far past its send-by date, because its tail fades the same way.
  - Point for Nick: if only queries with the agent should count, the rule and the drawing should change together.
- **On the harness** (4 weeks): 40 of the 61 in Needs action have gone quiet. With you and chasing queries still within the setting come first (21).

## 3. The level chip stays when open

- **Open:** the three levels open above the chip in the same card, and the chip stays at the bottom. It still names the current level, its chevron turns down, and it has `aria-expanded="true"`.
- **Closing:** tapping the chip again closes it. Picking a level, or touching the map, also closes it, as in v3.2.

## Locks (tests/e2e/phoneBirdsWorld.measure.ts), measured at 390 × 784

The green pass reads 97 locks readings and 5 empty-state readings, 0 red, on the final build.

### BW-37: no solid stretch between a gone-quiet bar's "!" and today

How it measures:
- At Months, it finds a gone-quiet bar with its "!", a quiet stretch at least 120px long, and today all on screen.
- It hides gridlines, names, the hawk and the edge fades, which aren't what's measured.
- It screenshots the bar from the "!" to today and reads every pixel column in a canvas.

What it holds:
- **No solid column.** A column is solid if it has no stripe in it (luminance range under 6) and is still coloured (more than 12 off white).
- **The fade reaches 10% or less at today.** A line is fitted to the quiet stretch's second half and read at today's x, then compared with the full hatching where the quiet stretch starts.
- **Green:** 462 columns, 0 solid. The fade reads 8.5% at today (the mask is 8%).

### BW-38: every gone-quiet row sits below every other row in Needs action

- Gone quiet is read from each row's date against the setting the world publishes (`data-quietdays`).
- It is not read from the drawn bars, because a tail that went quiet a day ago is too thin to draw at the fitted view.

### BW-39: open, the chip is in the DOM, visible and uncovered, `aria-expanded="true"`, directly below the three levels

- The gap between the chip and the levels is 0 to 1.5px, and its chevron is turned.
- Tapping it again sets `aria-expanded="false"` and the levels go.

### BW-34: updated

The order is checked within the not-quiet part and within the gone-quiet part.

### Also updated

- **BW-35:** open now shows the three levels plus the chip.
- **The `level()` helper** opens the switch only when it is closed.
- **BW-23** scrolls until a bar fits on screen, because the new order moves the long bars.

### Red first

Natural red: the new locks against the unchanged v3.2 build, from a scratch checkout with this test file copied in.

| Lock | v3.2 result |
|---|---|
| BW-37 | 534 columns, 292 solid |
| BW-38 | a gone-quiet row first (index 0) |
| BW-39 | no chip when open, ×3 |
| BW-35 (updated) | red |
| BW-34 | passed on v3.2 (its order within each part was already right) |

That BW-38 run read gone quiet from the drawn bars; the date reading came after it.

Deliberate breakage on the v3.3 build:

| Lock | Breakage | Own reds | Elsewhere |
|---|---|---|---|
| BW-37 | the quiet stretch back to a solid fill | 2 (462 of 462 columns solid; the fade 100%) | 0 |
| BW-38 | a gone-quiet row moved to the top | 1 | 0 |
| BW-39 | the chip hidden while open | 3 | 1 (BW-35, which also counts the chip) |
| BW-34 | two rows swapped | 1 | 1 (BW-31, whose save hadn't reached the emulator in time in that run; it passes in every green run) |

### Unit tests

- `birdsWorld.test.ts`: the marks on the tails, gone quiet in both courts, the order with and without the setting.
- `drawWorld.test.ts`: the quiet bar is hatched and masked with its edges and no solid fill, and the stripe phase rule.
- The smoke test: the chip renders outside the open branch, with `aria-expanded` following the state.

## Shots (390 × 784)

`shots/index.html` puts before (v3.2) beside after (v3.3) for two views:
- **Months, with gone-quiet rows:** solid fades become hatched fades, and the quiet rows drop below.
- **The switch open:** the chip stays, chevron down.

## For Nick's ruling

1. **Gone quiet includes with-you queries** far past their send-by date (section 2).
2. **Two navy blocks show when the switch is open:** the current level in the list and the chip under it. Say if the list's current level should be marked differently.
