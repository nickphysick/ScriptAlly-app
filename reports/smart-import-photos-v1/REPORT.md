# Smart Import from photos (ref v1) — report

4 November 2026. Ref: `design-refs/smart-import-photos-v1.html`, SHA-256 `b245e31a…171e621` (verified).

**Outcome: Phases 1–3 are built, locked and on dev. Phase 4 ran and hit a STOP condition: the `src` hit
rate is 18.1% against the 80% bar.** Names, agencies, statuses and dates read well (handwritten name
accuracy 93%, above its 85% bar). The model does not measure where each line sits; it lays out evenly
spaced bands at too large a pitch, so the cut-outs drift down the page. That is a prompt/model problem
for Nick and Claude, so it was reported, not tuned.

## False premises

1. **The ref was not in `design-refs/`.** It was in `~/Downloads` with the right hash; copied in and
   enrolled in the ref manifest.
2. **Premise (e) half-held.** The reading loader does run without a raw-row sample, but with no row
   total its foot bar sat on "Reading your first rows…" for the whole read. Photos now show
   "Reading your photos…" and "{n} rows read so far" on the shimmer, with no total and no countdown.
3. Premises (a)–(d) held: `smartImportMap` took `{ sheetText }`, gated before the model call and
   consumed only on a usable result; MODEL is `claude-sonnet-4-6` (vision-capable); dates are verbatim
   and parsed day-first with the year inferred silently; the review is the v9 answer deck with typed
   reason codes.
4. **The root `tsc` runs out of memory at Node's default heap on this machine.** Every gate here was run
   with `NODE_OPTIONS=--max-old-space-size=8192`. Not a code problem; worth knowing.
5. **The ref draws two things the brief rules out, and the brief won:** a "Year to confirm" card (the
   year stays inferred silently) and "she's easy to find later" (no he/she; the build says "they're").

## Gates: baseline vs final

Baseline at HEAD 3453bd26, run in a clean worktree (the first attempt overlapped my edits and was
discarded):

| Gate | Baseline | Final (61a6a757) |
|---|---|---|
| `tsc --noEmit` (8 GB heap) | exit 0, 0 errors | exit 0, 0 errors |
| `tsc -p functions/tsconfig.json` | exit 0, 0 errors | exit 0, 0 errors |
| functions build | exit 0 | exit 0 |
| `vite build` (grep error/WARNING) | exit 0, 0 matches | exit 0, 0 matches |
| `vitest run` | `Test Files 659 passed (659)` / `Tests 10085 passed \| 3 skipped (10088)` | `Test Files 668 passed (668)` / `Tests 10211 passed \| 3 skipped (10214)` |

functions/ has no runner of its own; its tests run in the root Vitest (its config includes
`functions/src` and `functions/eval`).

## Commits (on `main`, pushed)

| Hash | Message | Files |
|---|---|---|
| `c8125ff2` | Smart Import photos — phase 1: the callable reads pages | design-refs/.refhashes.json, design-refs/smart-import-photos-v1.html, functions/src/{assembleImport,smartImport,smartImportCore,smartImportPrompt}.ts, functions/src/smartImportPhotos.test.ts, src/lib/smartImportReviewModel.ts, src/types/smartImport.ts |
| `592641ba` | … phase 2: choosing and preparing the photos | .gitignore, package.json, package-lock.json (heic2any 0.0.4), src/components/import/{ImportFlow,ImportPage}.tsx, src/components/onboarding/{BranchB,CaptureFork,OnbLab,ScatterSettleLoader,PhotosScreen}.tsx, photoImport.css, src/lib/{captureFork,importEstimate,smartImport,photoImport,photoPrepare}.ts, tests (photoImport, photosScreen, captureFork, deadEnds), tests/e2e/onbV9.measure.ts, tests/e2e/smartImportPhotos/shotsPhotos.mjs, phase-2 screenshots |
| `98c65025` | … phase 3: your own writing on the review cards | src/components/import/ImportFlow.tsx, src/components/onboarding/{SmartImportReview,photoImport.css}, v9/{DeckQuestions,ReviewDeck,PhotoSnip}.tsx, src/lib/{photoImport,reviewGate,smartImportReviewModel}.ts, photoReview.test.tsx, reviewGate.test.ts, tests/e2e/smartImportPhotos/shotsReview.mjs, phase-3 screenshots |
| `61a6a757` | … phase 4: photo evaluation | functions/eval/{photoLists,photoScore}.ts, {photoRender,photoEval,photoBlurCalibrate,photoPayloadWorst}.mts, photoScore.test.ts, photos-real.example.json, photo-truth/*.json, reports eval-dry/, eval-live-1/, blur-calibration.json |

Dev integration branch `dev/qc1511-db2-title-sip` (pushed, **not** merged to main): the branch dev was
serving (`dev/qc1511-db2-title`, e1fb4f99, bundle `index-DnW-oOA9.js` — rebuilt and matched before
deploying) with main merged in (`3f8da853`, `2e310857`) and `bfa2b5d5` (resets the photos first in
`reset`, so the dev line's draft code and the photo lock agree). Its conflicts were all adjacent lines:
kept both sides; kept the dev line's `index.html` font link and MarketingShell import.

## Size limit, cap, payloads

- **Measured callable limit: 32 MiB.** Unauthenticated POSTs to the dev callable (refused by the
  function for want of auth, so nothing ran and nothing was spent): 32,505,853 bytes reached the
  function (HTTP 401); 33,554,429 bytes got the platform's HTTP 413. (`reports/…/` probe in the session.)
- **Client cap = server cap:** 20,000,000 base64 characters for all pages (≈60% of the limit, and under
  Anthropic's 32 MB request limit), 5,000,000 per page (under Anthropic's 5 MB image limit), 10 pages.
  Held equal by a lock.
- **Largest 10-page payloads:** the rendered fixtures, 2,070,700 characters; the worst case the
  preparation can make (ten 4032×3024 photos of pure noise, `photoPayloadWorst.mts`), 9,756,920 at
  quality 0.82. The lower-quality fallback is there but no real photo should need it.

## Screenshots

All in `reports/smart-import-photos-v1/`, made by `tests/e2e/smartImportPhotos/*.mjs` on a dev build:

- Fork: `fork-1440.png`, `fork-390.png`.
- Photos screen with three real-sized images (sharp notebook photo, blurred photo, spreadsheet
  screenshot): `photos-1440.png`, `photos-390.png`; the ref's `#photos` at the same sizes:
  `ref-photos-1440.png`, `ref-photos-390.png`. Readings in `phase2-readings.json` (pages resized to
  1176×1568 / 1568×980; only the blurred page flagged; 4 columns at 1440, 2 at 390; Alt+→ moves a page
  and keeps focus; Keep it clears the note; Remove renumbers).
- Deck, each new question at 1440: `deck-name-to-check-1440.png`, `deck-agency-to-check-1440.png`,
  `deck-crossed-out-1440.png`, `deck-mark-to-explain-1440.png`, and `deck-whole-page-1440.png`; the
  ref's `ref-agents-1440.png`, `ref-queries-1440.png`. Readings in `phase3-readings.json` (the
  crossed-out tick answered both crossed lines at once: 3 to answer → 1).

The cut-outs in these screenshots use the fixture's measured bands. The ref's cut-out is one line; the
build's band is the full page width plus 4% padding, as the brief specifies, so it shows the line and
part of its neighbours.

## Phase 4 figures

Two runs of 24 fixtures (12 lists × sharp/blurred), 80 pages, plus one 10-page timing read. Model
`claude-sonnet-4-6`. Full table: `eval-live-1/summary.md`; every read: `eval-live-1/results.json`.

| | name | agency | status | date | src hit |
|---|---|---|---|---|---|
| all | 96.7% | 99.8% | 98.0% | 97.1% | **18.1%** |
| handwritten, sharp | 99.0% | 99.0% | 99.0% | 100.0% | 18.5% |
| handwritten, blurred | 87.0% | 100.0% | 99.0% | 87.0% | 17.5% |
| printed | 100.0% | 100.0% | 96.9% | 100.0% | 13.9% |
| screenshots | 98.9% | 100.0% | 97.7% | 100.0% | 26.1% |

| code | precision | recall |
|---|---|---|
| crossed-out | 100% | 100% |
| mark-unclear | 100% | 68.8% |
| illegible-agency | 100% | 41.7% |
| no-date | 95.7% | 100% |

- **Time and cost:** 13.7 s and $0.021 a page on average (handwritten 12.9 s / $0.020, printed
  14.9 s / $0.023, screenshots 13.9 s / $0.020); total $1.68. Cost from usage × `pricing.ts` (Sonnet
  4.6 at $3/$15 per M — check against the pricing page).
- **Timeouts: no change.** The 10-page read (100 rows) took 116.3 s, first token at 16.2 s; the
  slowest single read was 42.5 s. The 300 s / 310 s / 315 s chain stands.
- **Blur threshold: 600.** Over the 40 rendered pages the 512px Laplacian variance was 5,325–9,846
  sharp and 85–232 blurred (`blur-calibration.json`). 600 is 2.6× the blurred maximum and 9× under the
  sharp minimum, leaning blurred-side because a real phone photo is softer than a render. It only ever
  nudges.
- **The STOP: src 18.1%.** On every fixture the bands are evenly spaced at ~0.06 of the page per line
  where the true pitch is ~0.04, so the first line or two land and each later one is further off (e.g.
  `hand-caveat-1p`: band 8 at 0.61–0.67 against a true centre of 0.468). The scorer was checked first
  (a perfect read scores 100%; the hit rule is "the line's centre is inside the band, on its page, and
  the band is under a quarter of the page"). This is the model estimating rather than measuring; it is
  the Phase 4 STOP. **Consequence for dev:** the cut-outs on review cards will often show a
  neighbouring line. Options for Nick and Claude: ask for a line index plus the page's line count
  instead of fractions, add a second pass that finds lines, or drop the cut-out for the quoted
  `lineRaw` until bands can be trusted.
- Also weak, not a STOP: `illegible-agency` recall 41.7% and `mark-unclear` 68.8% (it mostly read the
  blurred agency as a full one, and missed some ✗/!). Precision is 100% on both.
- Nick's own photos: none present, skipped. Put them in `functions/eval/fixtures/photos-real/<name>/`
  with a `truth.json` shaped like `functions/eval/photos-real.example.json`, then
  `npx tsx functions/eval/photoEval.mts --only 'real-*'`.
- **The key:** none was set locally, so the run read the dev function's own `ANTHROPIC_API_KEY` from
  Secret Manager (`firebase functions:secrets:access … --project scriptally-dev`) straight into the
  run's environment. It was never printed or written; a sweep of the committed reports and eval files
  for `sk-ant` finds nothing.

## Locks added, each proved red by mutation

Each mutation was applied, the suite run, and the file restored from a path-named backup.

**Phase 1** (`functions/src/smartImportPhotos.test.ts`, 23):
- Spreadsheet request byte-identical (SHA-256 of the body at HEAD) — red on one extra space in the prompt.
- Photo request: two cached blocks, the first the sheet's — red with the addendum folded into block 1.
- Pages in order with "Page N" — red with the labels removed.
- Malformed requests (both, neither, 11 pages, none, bad type, bad base64, wrong bytes, over the cap)
  refused with no Firestore read — red with a read placed before validation (9 cases) and with the
  magic-bytes check removed.
- Consumed only on a usable photo result — red with consume moved before the failure check.
- Out-of-range `src` dropped — red with the range check removed. Sheet reads keep no photo fields or
  codes — red twice (fields, codes).

**Phase 2** (`src/lib/photoImport.test.ts`, `photosScreen.test.tsx`, re-pointed `captureFork` W1 and
drop rule, `deadEnds` toStart): client caps equal the server's and sit ≥25% under 32 MiB (red: cap
30M); picker has no `capture` (red: added); metadata strip run and checked (red: removed); heic2any
only by dynamic import (red: static import); loader invents no total (red: photos branch off); mixed
drop takes the spreadsheet (red); blur note shown (red: hidden); Add a page off at 10 (red); photos
behind the client gate (red: gate off); Import page button (red: removed); fork button (red: removed);
a failed page not counted (red).

**Phase 3** (`photoReview.test.tsx`, re-pointed `reviewGate` family list): agent codes move to the agent
(red: not moved); Name to check is asked (red: ask removed); the tick answers every crossed line (red:
answers one); "I never sent it" drops the query, keeps the agent (red); cut-out with src (red); quote
without (red); nothing with neither; readings never written (red: strip removed); the commit writes no
photo field (red: query spread into addQuery); URLs revoked going back (red); 4% padding (red: 0);
tick on by default (red); lead drawn on the card (red); no he/she (red: "she's").

**Phase 4** (`functions/eval/photoScore.test.ts`): the band must hold the line's centre (red: any
overlap), a tick raises nothing (red), the quarter-page limit (red), a wrong name is counted (red).

## How Nick tests it on dev

- **Where:** https://scriptally-dev.web.app (serving `index-nfyNAAU3.js`). Signed in, go to **Import**
  (`/import`): the Smart import tile has **Use photos** beside "Import a spreadsheet". In set-up, it is
  the second button on the Smart import tile on "How shall we capture your existing agents &
  queries?". A drop of images on that tile works too.
- The function is deployed to dev (`smartImportMap`, europe-west2).
- **Resetting your Smart Import on dev between tries** (admin step, no UI): Firebase console →
  project `scriptally-dev` → Firestore (`(default)` database) → `users` → your uid → `private` →
  `entitlement`, and delete the document (or just the field `smartImportFreeUsed`, or on Pro
  `smartImportLastUsedMonth`). The client re-reads it on the next page load.

## Not done / open

- Prod: nothing deployed (functions, hosting or rules).
- The `src` STOP above; the cut-outs need a decision before this ships.
- The Import page tile's own text still says "QueryHawk reads the sheet…" (the brief didn't ask to
  change it).
- After "I never sent it", the row's Undo brings the query back with the question already settled.
