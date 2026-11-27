# Phone Birds-eye world v3.2: fewer groups, a level switch that collapses, the first-load cut-off

Branch `phone-birds-eye-world-v3-2`, cut from `origin/phone-birds-eye-world-v3-1` (27e521440). Main had not moved past it: `origin/main` 7f70f99f7 is already contained, so there was no merge. One commit, not merged. Below 768px only.

The commit hash, the dev build it was merged on top of, and the served bundle are in the session's final message. They exist only after this commit.

## Gates (baseline recorded before any edit)

| Gate | Baseline | Final |
|---|---|---|
| tsc (8 GB heap) | exit 0 | exit 0 |
| `npm run build` | exit 0 (built in 1.72s) | exit 0 (built in 1.80s) |
| `npm run build:dev` | exit 0 | exit 0 |
| Vitest | Test Files 973 passed, 1 skipped (974) · Tests 13816 passed, 4 skipped (13820) | Test Files 973 passed, 1 skipped (974) · Tests 13816 passed, 4 skipped (13820) |

The new unit checks sit inside existing tests, so the count is unchanged.

## 1. The groups

- **The new groups** (`lib/birdsWorld.ts`), in order, are Needs action, Within their window, No reply date yet and Closed.
  - These names are the groups' ids and their fold keys.
  - A heading follows the pill (`groupLabel`): Needs action reads "With you" under With you and "Needs chasing" under Needs chasing.
- **Needs action** holds every chasing query and every with-you query (undated ones included), in one order.
  - The order is the largest share of the window used first. That is `kk`, the same measure v3 split Nearly there from Plenty of time by (at 0.75).
  - **Within their window** uses the same sort.
- **The pills and their counts are unchanged.**
- **Folds:** saved folds are filtered to the four ids when read, and the store is rewritten (`keepFolds`). "Nearly there", "Plenty of time", "Needs chasing" and "With you" are dropped, so none of them carries over to Needs action.
- **The fitted scale's height sum** (`allH`) uses the new groups.
- **On the harness:** Needs action 61 (16 with you + 45 chasing), Within their window 3, No reply date yet 6, Closed 18.

## 2. The level switch

- **At rest:** one chip (`data-bw="level-chip"`) naming the level, with an upward chevron. It's white on navy, 40px tall, in v3's card (radius 16px, `--ps-sh-raised`). It has `aria-expanded="false"` and `aria-label="Zoom level: …"`.
- **Tapping it:** the three levels open in the white card, Weeks on top, as a `role="group"` of buttons with `aria-pressed`. The card scales in from the bottom right over 160ms (none with reduced motion), with an 8ms buzz.
- **Folding it:**
  - Picking a level snaps there and folds.
  - Tapping the current level folds without a change.
  - A touch on the world (tap, pan, pinch, wheel) folds it without a level change. A tap that only folds it opens nothing.
- **The chip follows the level.** A double tap or a pinch updates its text and label in the paint, without a React render.
- **The open state has no separate chip.** The card of three replaces the chip, so `aria-expanded` is only ever seen as false. Say if the chip should stay visible below the open card.

## 3. The first-load cut-off

- **Cause: the level switch was placed from a JS measurement.**
  - `--bw-cb`, the bottom of the switch, the "1 of 3" bar and the toast, was set in `build()` as `dockHeight() + 24`.
  - `dockHeight()` read `window.innerHeight − dock.getBoundingClientRect().top`. That read takes the dock's slide transform into account (it tucks with `translateY(100%)` and animates 0.25s), and uses the layout viewport before the address bar settles.
  - It was read on the world's first layout, and again only when the world's own box resized (its ResizeObserver). Nothing listened to `visualViewport`.
  - So a first read taken while the dock or the address bar was still settling stayed until a refresh.
- **Not reproduced on desktop Chromium.** I tried two cases against the unchanged v3.1 build, and v3.1 kept its switch 24px above the dock in both:
  - the 784 → 700 shrink within 300ms;
  - the dock held tucked until 300ms after the world first lays out.

  Here any later rebuild (the query snapshot landing) re-read the dock. The cause above is therefore the mechanism in the code, matched to Nick's "a refresh fixes it", not a reproduction.
- **Fix:**
  - `--bw-cb` is now CSS on `.bw`: `calc(73px + 12px + env(safe-area-inset-bottom, 0px))`. 73px is the dock (`.pa4-tb`): a 1px rule, 8px, a 48px tab and 16px. Landscape, which has no dock: `calc(24px + env(…))`.
  - No JS sets it.
  - Measured: the switch's bottom sits 12px above the dock's top at 784 and at 700.
- **The other overlays:**
  - The "1 of 3" bar and the toast read `--bw-cb`, so they are fixed by the same change.
  - The empty-state card's middle was `(top + vpH − 96) / 2`, with `vpH` read from the world's box in render (784 by fallback on the first render). It is now `calc((top px + 100% − 96px) / 2)` in CSS.
  - The hawk's banner and tips, the pull pill and the scrub label are placed from the header's top, not the bottom.
  - The recap card is centred in CSS.
  - The long-press menu is placed from the touch point.
- **Re-measuring:** the world rebuilds on `window` resize and `visualViewport` resize as well as its ResizeObserver. The room under the last row now reads the dock's `offsetHeight`, which ignores its transform.

## Locks (tests/e2e/phoneBirdsWorld.measure.ts), measured at 390 × 784

The green pass reads 90 locks readings and 5 empty-state readings, 0 red. A full green pass ran before the commit.

### Natural red: the new locks against the unchanged v3.1 build

The checkout was taken at origin/phone-birds-eye-world-v3-1, with only this test file copied in.

- **BW-32:** headings read Needs chasing · Nearly there · Plenty of time · With you · No reply date yet · Closed. Red ×2.
- **BW-34:** no Needs action group, so 0 rows. Red ×2.
- **BW-35:** three buttons at rest, no chip. Red ×3.
- **BW-36:** the switch sat 24px above the dock, not 12px. Red ×2. The cut-off itself was not reproduced; see section 3.
- **BW-33:** green on v3.1. v3 already headed the With you and Needs chasing pills that way, so its proof is the deliberate breakage below.

### Deliberate breakage on the v3.2 build: each turns its own lock red

| Lock | Holds | Breakage | Own reds |
|---|---|---|---|
| BW-32 | Under All, exactly Needs action / Within their window / No reply date yet / Closed (those present); never Nearly there or Plenty of time | the second heading renamed "Nearly there" | 2 |
| BW-33 | Under With you, one group headed "With you"; under Needs chasing, "Needs chasing"; the pills add up | the pill's heading renamed "Needs action" | 2 |
| BW-34 | Needs action holds every with-you (16) and chasing (45) query, most of the window used first, the two kinds mixed | two rows' places swapped | 1 |
| BW-35 | One button at rest; tapped, three; a pick snaps and folds; a tap on the world folds with no level change and opens nothing | the chip hidden | 4 |
| BW-36 | At 784, after a shrink to 700 within 300ms, and with the dock still sliding in: inside the viewport, above the dock, 12px clear | the switch put 8px from the bottom (under the dock) | 4 |

Under the BW-35 and BW-36 breakages the switch can't be used, so the locks that zoom by it also turn red (17 and 20 others). That is expected.

### Existing locks updated

- **The `level()` helper** opens the chip first.
- **BW-22** opens the switch before reading its three levels.
- **BW-20 and the shots** fold by the group id (`data-g`).
- **BW-14** holds the hawk's drift still and reads inside the middle half of its box. With four groups no heading crosses the hawk on the fitted view, so it pans one under the hawk at Months.
- **BW-7** scrolls until rows where a current stage meets its tail are on screen.
- **BW-26** polls the emulator for the saved date, because the page moves the row from its local cache before the write lands.
- **Unit tests:**
  - `birdsWorld.test.ts`: the groups and their order, mixed with-you / chasing, the pill labels, `keepFolds`, `allH` at 4 groups.
  - `drawWorld.test.ts`: `data-g` and the headings.
  - The smoke test: the chip at rest.

## Shots (390 × 784)

`shots/index.html` puts before (v3.1) beside after (v3.2) for: All fitted, the With you pill, Weeks with the switch at rest, and the switch open.

## For Nick's ruling

1. **Needs action leads with very old chasing queries.** By share of the window used, a query 300 days past a 6-week window outranks a with-you request from last week. At Weeks, the first rows on screen are those old chases, faded out to the left. Should with-you queries lead, or old chases be capped?
2. **The open switch replaces the chip** rather than sitting above it (see section 2).
3. **The cut-off fix is CSS-pinned and measured on Chromium.** A check on a real iPhone (first open of Birds-eye, no refresh) would confirm it.
