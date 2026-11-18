# Query Centre v157 — the slate ladder, the foil offer, centred boxes and gone quiet

18 Nov 2026 · branch `query-centre-v157` · ref `design-refs/query-centre-v157.html` (sha256 `66b33994…7d85ff5`, matched)

## False premises

1. **"Cut from the branch dev currently serves" moved under the pack.** At Step 0 dev served `index-sl2zR2So.js` from `dev/smv31-vv6-cp32-lqmf1-cb15` @ b9226fc5e, and `query-centre-v157` is cut from that. While v157 was being built, To-do v57 deployed `dev/smv31-vv6-cp32-lqmf1-cb15-td57` @ ea1af66b8 (`index-Duin1_a3.js`), cut from the same commit. Per CLAUDE.md the deploy is a new branch merging v157 into that served one (see Dev).
2. **"Every lock is proved red before its fix" against CLAUDE.md's "red-before proofs only for logic locks".** I read the pack as the more specific rule and did both: the before-build reading (QC157-1/2/3, until the bundle guard stopped the run once Phase 1 began), and the pack's own mutation for every lock, all eleven in one build.
3. **The fixture grid's quiet cards are hidden at rest.** Gone quiet (and Closed) is a folded row, as built. Every measurement opens each fold ("Show all →"), the page's own control. With every fold open the grid holds all 88 harness queries.
4. **A quiet card with no reply date exists.** `cv25-q-03` and `cv25-q-04` are with agents who state no reply window. They are quiet by the undated 84-day rule, so their box has no line, as the pack says ("If neither date exists, no line"). QC157-9 allows that, but only on cards that were not nudged.
5. **"Waiting card" (QC157-6).** No Queried card in the fixture is still inside its reply window. The live ones are past it ("over", nudge due). QC157-6 reads "waiting" from the Next box's own state (`wait` or `over`), independent of the quiet mark. This is what the "every Queried card quiet" mutation removes.

## Base

`dev/smv31-vv6-cp32-lqmf1-cb15` @ `b9226fc5e`, which is Corkboard v15 on the Log a query materials-fork line, served then as `index-sl2zR2So.js`.

Commits on `query-centre-v157`: 1215aa864 (P1), 6e5d6319b (P2), df8554fd9 (P3), d5bb03d64 (P4), a0e75bbc2 (P5), then the Phase 6 sweep and this report.

## Baseline (before any edit)

- **tsc:** clean. The worktree needed `functions/node_modules` linked; until then, 7 TS2307 errors in `functions/` only. 8 GB heap, as always on this tree.
- **build:** clean.
- **Vitest:** 2 reds, both in `src/test/firestoreTarget.test.ts` (dev-line e2e scripts that build a Firebase app without fsTarget). The first full run also showed 4 functions/ files failing to resolve (cured by the link) and load flakes in queryClock, aiRefusal and siteMode (green in isolation).
- **After:** tsc clean, build clean. Vitest 12,757 passed, with the same 2 `firestoreTarget` reds and nothing new.

## Step 0 findings

**Step 0.2.** The grid card is still `QcCard154.tsx`, styled by qcv154, qcv1541, qcv156 and qcv1561, with words from lib/qc153 and lib/qc154. Status marks v3/v3.1 are in the base: `Track153` draws each step with `StatusDot`, and R&R has its own mark.

**Step 0.3, consumers and what kept the old colours:**

| Consumer | Drawn on the QC grid? | v157 |
|---|---|---|
| `slipTone`: QcCard154 `data-tone` | yes | stage names |
| `slipTone`: QcSlip153 `data-tone` (the log-a-query check-stage preview) | no | **kept**, now `legacyTone153` |
| `slipTone`: Queries.tsx Birds-eye `barKind` (`data-sk`, which no CSS reads) | no (Birds-eye) | **kept**, `legacyTone153` |
| `slipTone` / `SLIP_TONE_FILL`: `sectionSwatch` (group headings) | yes | stage bands |
| `SLIP_TONE_FILL`: lib/qc1531 `RING_BUCKETS` (the stage ring) | no | **kept**, with its own copy `RING_FILL` (`LEGACY_TONE_FILL_153`) |
| `ACTION_SWATCH` (sectionSwatch only) | yes | new values |
| `tabAccent`: MatTab1533 on the grid card | yes | `tabAccent157` passed in as `accent` |
| `tabAccent`: MatTab1533 on the slip preview | no | **kept** |
| CSS `[data-tone]` on `.qc154-card` (qcv154) | yes | rewritten to the five stages |
| CSS `[data-tone]` on `.qc153-slip` (qcv153) | no | untouched |

Other `data-tone` rules (qcv151 group headers, qcvList138, Responses, Contact list, To-do) key on unrelated tone words and were not touched.

**Step 0.4, how a quiet row is identified.** The page stamps rows (`stampRows`). A quiet row has `stateOf(r) === "quiet"`. An unstamped row falls back to `whereItStands(r, nowMs) === "quiet"`, the same fallback `rowAct` uses. `lib/qc154 isQuietCard` is exactly that pair, so no new derivation. The last nudge is `nudgeMsOf` (`lastNudgeSentDate`, else a past `nudgeDate`, ignored if before the latest send; the page stamps the same test as `nudged`). The reply date is `expectedMs`.

**Step 0.5.** `baseline.json` holds 88 cards at each size: every outer box, band height, fact box and track node. Before shots: `shots/before-{1512,1280}-group-*.png`.

None of the three STOP conditions applied.

## What changed (one commit per phase)

- **P1:** `src/lib/stageColours.ts`, the one table. `slipTone` now returns the five stage names, and closed is `closed`. The card's `--tone` is the band. The swatches and the grid paperclip accent follow the stage. Closed's paperclip accent keeps Queried's sand accent, because the pack names four accents and a closed card's was sand before.
- **P2:** the foil on `offer` (Offer and Signed). It moves once to 85% on hover or focus-visible. Reduced motion has no transition.
- **P3:** the track is ink on every band, with unreached and skipped steps at .42. Links are ink, .3 when not reached, and dotted into a skipped step. `--tink` is gone. Closed cards keep v153 grey. The glyph in a non-current step is 23px (19px narrow).
- **P4:** the boxes are centred top to bottom. A hot box is white with a 1.5px navy inset. The dot is gone.
- **P5:** gone quiet. `data-quiet` marks the card, and the band fades. The badge holds three white dots on navy. The link after the current step is dotted. There are three z's (on the card, outside the clipping inner card). The box reads "Gone quiet · Nudge or close", with the line "nudged {date}" or "since {date}". The chip is named "Nudge or close" and opens the card (`chipPress`). `rowAct` is unchanged.

## Locks: red and green

Source locks (Vitest) were each proved red by the pack's mutation, then green:
- **stageColours.test.ts:** red when closed returns sand.
- **qcv157.test.ts:** P2 red with the foil on full. P3 red when `--tink` is restored. P4 red with the dot and with flex-start.
- **qcQuiet157.test.tsx:** red under four mutations: every Queried card quiet, the reply date for both lines, `onAct` close, and keeping the arrow.

Measurement locks are in `tests/e2e/qc157.measure.ts`, on the emulator harness at 1512 × 982 and 1280 × 800, every fold open. All eleven mutations were applied in one build, then removed. Readings are in `ledger/` (green `after-*`, red `mutation/` and `mutation/run.txt`):

| Lock | Red (mutation) | Green |
|---|---|---|
| QC157-1 bands | Rejected `rgb(239, 230, 214)` (sand), and Full stages foiled | 14/14 per size; Rejected `rgb(236, 234, 230)` |
| QC157-2 foil | Full Sent has the 112° gradient | Offer 260% 100%, x 30% → 85% on hover; Full Sent `none` |
| QC157-3 track | Partial reached/current `rgb(95, 67, 61)` | reached/current `rgb(28, 19, 15)`, fut/skip `rgba(28, 19, 15, 0.42)` on every stage |
| QC157-4 centred | worst 32.97px (10.00 / 24.78) | 176 boxes, worst 1.00px (the 10/11 padding) |
| QC157-5 needs you | hot value `::after` content `""` | hot boxes white with `rgb(42, 58, 82) 0px 0px 0px 1.5px inset`, no `::after`; others `rgb(251, 249, 245)`, no outline |
| QC157-6 quiet band | gradients on Full, and no waiting Queried card left | 43 quiet cards with a gradient ending white 82%; waiting `seed-query-2` flat |
| QC157-7 quiet step | badges 0 circles / 1 path | navy, 3 circles, 0 paths; link after current dotted |
| QC157-8 z's | z cut by `qc154-card (hidden)` | 3 z's on quiet cards only, aria-hidden; rest 0; after 600ms .7/.85/1, no transform, Special Elite navy 12/15/19px, none clipped |
| QC157-9 quiet words | nudged cards read "since 16 Oct / 1 Dec / 9 Dec" | Gone quiet · Nudge or close, no bar; `seed-cal-bang-q` "nudged 25 Sep", `thin-q-remind` "nudged 18 Sep", `seed-cal-soon-q` "nudged 12 Oct"; others "since …" or none |
| QC157-10 quiet chip | mode `close`; the composer opened | named "Nudge or close", mode open; one click opens the card, no composer or drawer |
| QC157-11 nothing moved | track nodes 1.00px up | 88 vs 88 cards, worst 0.00px |

Fixture proof: the harness holds 3 nudged queries (`seed-cal-bang-q`, `seed-cal-soon-q`, `thin-q-remind`), and all three are quiet on the grid. 43 quiet cards in all, the other 40 not nudged.

Ledger caveat: the QC157-5, -7 and -9 mutation ledgers were not rewritten in the mutation run, because an earlier ledger in the same test threw first. Their reds are in `mutation/run.txt`, and the stale files were deleted. The spec now writes every ledger in a shared test.

### The older card specs, rerun on the v157 build

- **Rewritten to the stage bands:** qc154 M1, qc1541 N2 Partial, qc156 Queried band. qc154 M2 counts the new `quiet` state; that fix landed after this run, which read it red.
- **Still red, and not v157's:**
  - qc154 M2 "overdue" text, red because the v156.1 chip adds "→Nudge" to the box's text.
  - qc154 M3 hover: the v154 navy overlay was retired by v156.1.
  - qc154 M5 goal chart: replaced by v156.
  - qc156 V3 headline and line: replaced by v156.1's streak.
  - qc156 V4: the Contact list's slim row, which Contact list v1.1 changed.
  - qc1541 N2 "Queried band is white": reversed by v156.

  None of these touch a file v157 changed.

## Screenshots

- **Before and after grid**, per group: `shots/before-{1512,1280}-group-*.png`, `shots/after-{1512,1280}-group-*.png`.
- **Ours, one card per stage, plus quiet at rest and hovered:** `shots/crop-ours-{queried,partial,full,offer,closed,quiet,quiet-hover}.png`.
- **The reference's cards:** `shots/crop-ref-{queried,partial-requested,partial-sent,full-requested,offer,quiet,quiet-hover}.png`. The reference draws no closed card in its grid, so there is no closed reference crop.
- `shots/after-offer-hover-1512.png`, `shots/after-quiet-hover-1512.png`, `shots/after-quiet-chip-click-1512.png`.

## Stage colours on a grid card from outside stageColours.ts

- **qcv154.css** restates the five bands as `--tone` (CSS cannot import TS). `stageColours.test.ts` asserts each one equals the table.
- **qcv157.css** restates the Offer band `#8ea7c6` inside the foil shorthand (a gradient layer needs its colour in the same declaration). `qcv157.test.ts` asserts it equals the table.
- **The quiet band** reads `var(--tone)`, so no restatement.
- **The paperclip accents** (`TAB_ACCENT_157` in lib/qc1533) are the pack's accent pairs, deeper shades and not table values.
- **Gone quiet's group swatch** `#f4efe6` is not a stage colour (unchanged, per the pack).

## Dev

- https://scriptally-dev.web.app serves **`index-YTBrCozr.js`**. I checked it after the deploy against the build's own `dist/index.html`.
- The build is from `dev/smv31-vv6-cp32-lqmf1-cb15-td57-qc157` @ `e8224054e`: the line dev was serving when I deployed (`…-cb15-td57` @ ea1af66b8, `index-Duin1_a3.js`, To-do v57.1 on Corkboard v15) plus `query-centre-v157`.
- The merge was clean. On the merged tree tsc is clean and 1,073 Query Centre and To-do unit tests pass.
- Built in a clean scratchpad checkout of the pushed tip. Hosting only, `--project scriptally-dev`. Prod and `main` are untouched.

## Not done / follow-ups

- `docs/decisions/query-centre.md` was created on the dev line. main has its own file, so merge the v157 section into it by hand.
- Everything listed as kept moves in the next pack: the ring, Birds-eye, the slip preview and the other pages.
