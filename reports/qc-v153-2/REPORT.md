# Query Centre v153.2 — report

Open stage ring, the quiet setting in words, a tighter gap above the list, the slip header back on two lines, and
the Next box's second line. Reference: `design-refs/query-centre-v153-2.html` (sha256 `07400175…7d404fa8f5`,
verified, enrolled in `.refhashes.json`).

## False premises found in Step 0

1. **The Next box's second line was never built, so it was not "missing on dev".** v153's `NextFact` had no line
   field and no version of `QcSlip153` rendered one (checked across every commit to both files). It is not a
   v153.1 regression and not a data gap: it is a v153 omission. The fix adds it rather than restoring it.
2. **The quiet control was a gear, not a sun.** Same control, same pop-over; noted only because the prompt calls it
   "the sun/cog".

Everything else in the prompt held, including the gap: measured from the bottom of the header's content to the slim
bar it was 44px against the ref's 30.

## Base and commits

`query-centre-v153-2` is cut from `query-centre-v153-1` at **`97642525a`** (v153.1 has not landed on `main`).

| phase | commit | what landed |
| --- | --- | --- |
| 1 | `6deb7e4cc` | The open ring: no card, bar or art; the in-play number in a soft middle disc; the legend heading with its navy rule; the empty state. |
| 2 | `7635f8dbc` | "Gone quiet after N weeks" as one text button opening the same pop-over; the header's foot 4px. |
| 3 | `5e7fefadb` | The status word beside the track; `nextLine` and the Next box's second line. |
| 4 | `65f975547` | `tests/e2e/qc1532.measure.ts`. |

## Step 0 — what the page showed

- **Ring card:** white fill, 1px `#e3d5c9` border, shadow, a navy bar ("Where they are", "70 still in play · 88 sent"),
  the post-pile image with its fade mask over a cream disc, and the legend.
- **Beside Record a response:** a 46px gear button ("Query Centre settings") opening "When does a query go quiet?".
- **The gap:** 26px from the header's box to the slim bar, 44px from its content (header padding 18px). The ref:
  26px and 30px (padding 4px).
- **The slip header:** 80.6px for an Offer slip, the status word on its own line above the track.
- **Tom Ellery's Next box:** "No date yet", nothing under it.

## Gates against baseline

| gate | baseline (`97642525a`) | after phase 4 | dev line after the merge |
| --- | --- | --- | --- |
| `tsc` | 0 errors | 0 errors | 0 errors |
| build | clean | clean | clean |
| Vitest | 3 failed · 11,490 passed · 3 skipped | 3 failed · 11,499 passed · 3 skipped | 3 failed · 11,520 passed · 3 skipped |

The three failures are the same in every run and were red on the base: `emuGuard` (1) and `firestoreTarget` (2).

**Unit tests, each written red first:** the ring's middle is sent less passed or closed (also proved by a
mutation showing the total instead), the empty state, and no card bar or pile; the quiet control's words with the
live weeks, as one button that triggers the pop-over; the Next second line on an Offer, a Partial requested, a Full
requested asked today, both agent's-turn lines, and none when closed.

## Measured, against the ref

All on the dev line's build, at 1440 and 1920 (34 readings, all green; v153's 198 and v153.1's 61 still green):

| | ours | ref |
| --- | --- | --- |
| header content to the slim bar | **30.0px** (was 44) | 30px |
| header box to the slim bar | 26px | 26px |
| slip header, Tom Ellery (Offer) | **64.3px** (was 80.6) | 66.9px |
| status word | beside the track, to its right | beside the track, to its right |
| ring middle | 70 = 88 sent − 18 passed or closed | 22 = 26 − 4 (its sample data) |

## Screenshots

In `reports/qc-v153-2/`, ours beside the ref's: `header-1440/1920.png` with `ref-header-1440/1920.png`;
`ring-hover-1440/1920.png` with `ref-ring-hover-1440/1920.png`; `slip-tom-1440/1920.png` with
`ref-slip-tom-1440/1920.png`; `quiet-open-1440/1920.png` (the ref's quiet phrase opens nothing, so there is no ref
pair). `recon-before.json` and `recon-after.json` are the raw readings.

## Where the build departs from the reference, and why

1. **The slip header is 64.3px, not 66.9.** The name and agency lines are v153.1's type, which sits 2.6px shorter
   than the ref's; the prompt keeps them as built.
2. **The status word keeps v153.1's style.** The ref adds a small "step N of 4" line under it; the prompt asked
   only for the word's position, so that line is not built.
3. **The Next values are the app's** ("No date yet", "35 days late"); the ref's sample shows "Send pages" and "in 19
   days". The prompt keeps the wording; only the second line is new.
4. **Gone quiet adds no second line.** The ref has no example; the value already says "N days quiet", and an invented
   line ("worth closing?") would be advice the page does not give anywhere else.
5. **The in-play number has a screen-reader sentence** in the legend heading (", 70 still in play"), because the ring
   drawing is hidden from assistive technology.
6. **The quiet phrase wraps under the buttons** where the title column is narrow (on the v153.1 base at 1920); on the
   dev line's wider column it sits inline, as in the ref. Nothing wraps mid-label.

## `qc-post-pile.webp`

**Deleted** (`public/images/qc/qc-post-pile.webp`): nothing else referenced it. Its cream disc colour `RING_DISC`
went with it.

## Deferred, named

- The quiet setting's white-on-navy rules in `qcv151.css` (`.qc152-setbtn`) still apply underneath and are
  overridden; that sheet is on the do-not-touch list.
- `tests/e2e/qc1521.measure.ts`'s quiet-gear step clicks `[data-qc152='quiet-setting'] button`, which is now the words
  button and still opens the pop-over; its other steps were already stale from v153.
- The page tab's small "QUERIES" label is out of scope, as stated.

## Dev

Dev served `dev/qc153-tl1-ww2-qc1531` at `7ca84d1da` (`index-8DLF1C1v.js`, confirmed by a clean build). The deploy
line is `dev/qc153-tl1-ww2-qc1531-qc1532`: that commit with `query-centre-v153-2` merged in, no conflicts. The local
`dev/qc153-tl1-ww2-undo1` is still not on dev and is not included.

https://scriptally-dev.web.app/queries
