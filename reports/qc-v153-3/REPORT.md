# Query Centre v153.3 — paperclip materials tab, arrow badge fix, chips filter, ruled group headings

Reference: `design-refs/query-centre-v153-3.html` (sha256 `c08a0766…5bc5`, verified). Read at 1920px from the
rendered page; the chip rail and the ruled headings are the ref's hidden `data-rl="chips"` / `data-gh="ruled"`
styles, which the prompt describes, so the side-by-sides render the ref with those switched on.

## False premises and Step 0 findings

1. **There was no query or Query Centre section in Settings.** Settings has seven rail sections (Profile, Sign-in &
   security, Plan & billing, Notifications, Preferences, Tasks, Your data). The setting went into **Preferences**, as a
   small card headed **Queries**, rather than an eighth rail section: one control does not earn a route, and a route
   has to be added to four path tables (`accountRoutes.ts` lists them).
2. **How the value is stored (unchanged):** one leaf, `todoPrefs.queries.quietWeeks` (choices 2 · 3 · 4 · 6 · 8,
   default 4), read by `quietWeeksOf`. Settings writes it through the new one-leaf `quietWeeksPaths(w)`.
3. **Material dates:** a partial and a full each carry both dates (`partialRequestedDate` / `partialSentDate`,
   `fullRequestedDate` / `fullSentDate`). **A revision carries neither**, so an R&R's ask and a resubmission's send are
   dated by the day the stage began, as is an ask whose request date is missing. An undated send reads "Sent later"; an
   undated ask reads "Asked" (the prompt names no wording for that case). Pieces sent with the query have no date of
   their own; they sit under "With the query".
4. **The badge fault's cause:** v153.1's `.qc151.qc153 .qc153-nd--cur svg { 20px }` also matched the badge's own svg,
   so a 20px glyph box sat in the 19px disc, 3.5px off centre. Not a size set on the badge itself.
5. **The slip's inner frame clips** (`framedSlip.css`, `overflow: hidden`), so a pop-up inside it could never pass the
   slip's edge. On the Query Centre's slips it no longer clips; the tinted header carries the frame's top corners.

## Commits (branch `query-centre-v153-3`, from `query-centre-v153-2` at `a7e03e6cc`)

| Phase | Commit |
|---|---|
| 1 · quiet window to Settings | `2503da3b0` |
| 2 · arrow badge | `acc14384b` |
| 3 · paperclip tab | `050cea64a` |
| 4 · chips rail | `8f16919ac` |
| 5 · ruled headings | `bb8e957df` |
| 6 · the Settings check, screens, older checks re-pointed | `91e01cd16` |
| report | (this commit) |

## Gates against baseline

| Gate | Baseline (`a7e03e6cc`) | After |
|---|---|---|
| tsc | 0 errors | 0 errors |
| production build | clean | clean (no errors or warnings in the full log) |
| Vitest | 3 failed, 11,499 passed, 3 skipped | 3 failed (the same three), 11,511 passed, 3 skipped |

The three failures are the standing baseline (`emuGuard` 1, `firestoreTarget` 2), unrelated. Both runs also print
one "unhandled error", `[vitest-worker]: Timeout calling "onTaskUpdate"`: the reporter's RPC timing out under load
(several sessions' runs on the machine), not a test failure. On the merged dev line: tsc 0, Vitest the same three
failures with 11,532 passed, build clean.

Browser checks: all 28 of `qc153`, `qc1531`, `qc1532` and `qc1533` pass on a local dev build; the 13 of `qc1533` pass
again on the deployed dev site.

## Measurements (rendered page, `tests/e2e/qc1533.measure.ts`, 1440 and 1920)

**Arrow badge (B1, 35 badges per width)**

| | Ref | v153.2 (dev) | v153.3 |
|---|---|---|---|
| disc | 19 × 19 | 19 × 19 | 19 × 19 |
| glyph | 13 × 13 | 20 × 20 | 13 × 13 |
| glyph off centre | 0 | 3.50, 3.50 | 0.00, 0.00 |
| overhang right / up | 5 / 5 | 5 / 5 | 5.00 / 5.00 |
| stroke | 2.2 | 2.2 | 2 (the prompt's figure) |

**Paperclip tab (T1, 27 tabs per width)**: centre against the seal's centre **0.00px** on every tab (target 0 ± 1);
gap to the longer of name and agency **16.0px** on every tab; 34 tall. Pop-ups opened near the top, the middle and the
foot of the viewport: none clipped, none painted over (every sampled point owned by the pop-up), the foot one opening
upwards (38px below). Enter and Space open it, Escape closes it, a click on it opens no card. Hover keeps the fill and
the ink exactly (no darkening), lifts the tab 1px against its slip, icon stroke 1.8, number stroke .25.

**Rail (P1)**: one card, no padding, radius 16, the ref's shadow, no inner line; four drawn chevrons; tiles in their
stage colours; a pill click puts the bar's count at the pill's (23 of 88), one on at a time, a second click clears.

**Headings (G1)**: every heading's parts centred within 0.01px; chip 26 × 24, radius 7, in the group colour.

**Settings (S1)**: the card, label, muted italic helper and five choices; a change is stored and read back after a
reload (and the account's value put back); the header's action row is the two buttons.

## Screens

- Page top: `page-top-1440.png`, `page-top-1920.png` · ref `ref-page-top-1440.png`, `ref-page-top-1920.png`
- Pop-ups: `pop-top-*.png`, `pop-mid-*.png`, `pop-bottom-*.png` (bottom opens upwards)
- Rail with a pill on: `rail-pill-on-*.png` · ref `ref-rail-1920.png`
- Group heading: `heading-*.png` · ref `ref-heading-1920.png`
- Badge at 4×: `badge-4x-*.png` · ref `ref-badge-4x-*.png`
- Settings: `settings-1440.png`
- Ledgers: `ledger/*.json`; raw readings `badges-*.json`, `tabs-*.json`, `headings-*.json`

## Where the build departs from the ref

- **Badge stroke 2, not 2.2.** The prompt says 2; the ref's paths are 2.2. Prompt wins.
- **Pop-up left edge 0, not −8px.** The prompt says left-aligned to the tab; the ref offsets it 8px left.
- **Chip names are the app's** ("Covering letter", "First 50 pages", "Full manuscript"), not the ref's sample
  ("Letter", "50 pages", "Full ms"): they come from the existing materials display map.
- **The pills keep radio semantics** (`role="radio"`, `aria-checked`), as the rows had: one on at a time.
- **A package with no recorded pieces** still gets a tab, counted as 1, its pop-up showing the package under With the
  query. The prompt's "no tab when a query has no material data" read as: a package is material data.
- **The Settings control is the page's own select**, as its other select rows are, not a segmented control.

## Deferred, named

- `qc152-set*` rules for the retired header pop-over remain in `qcv151.css`, which this pass may not touch; nothing
  renders them now.
- `tests/e2e/qc152.measure.ts` L1 now sets the window through Settings (`tests/e2e/quietSetting.ts`), but that suite
  reads v151's row selectors (`[data-qc151='row']`) and was not re-run here.
- The earlier checks that asserted the retired pieces now assert their absence: qc1531 H1 and S2, qc1532 Q1.

## Dev

Live at https://scriptally-dev.web.app/queries (bundle `index-DiysKTqV.js`), from the local branch
`dev/qc153-tl1-ww2-qc1531-qc1532-qc1533` (`4b267828e`): the line dev already served (`index-B6biPmmz.js`, v153.2)
with this branch merged in. Nothing is pushed or merged to `main`. Settings: https://scriptally-dev.web.app/account/preferences.

⚠️ The local `dev/qc153-tl1-ww2-undo1` (Undo and bulk close) still lacks v153.1, v153.2 and v153.3; deploying it as it
is would take all three off dev.
