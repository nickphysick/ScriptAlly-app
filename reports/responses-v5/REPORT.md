# Responses v5 — run report (28 Oct 2026)

Ref: `design-refs/responses-v5/responses-v5.html` (sha256 `292bf87f…c1e9`, matches its `SHA256SUMS`). Branch
`responses-v5`, ten commits, pushed, **not merged**. On dev from `dev/…-pk39-db116-cl256-rsp5`.

## 1. False premises found in the prompt

1. **The ref was not in `design-refs/`.** It arrived as `~/Downloads/responses-v5-pack.zip`; the extracted
   `responses-v5.html` matched the stated hash and was copied in and enrolled in `.refhashes.json`.
2. **The shared pieces 4a, 4b and 4d are not on `main`**, and 4c does not exist as a shared piece anywhere:
   - 4a, the title card, is `shared/PageHeaderCard` (lifted from Versions v1 for QC v149/v150);
   - 4b is `shared/GlanceCards` (QC v150.1's stat cards, lifted by Contact list v25);
   - 4c, the navy list bar, the sticky headings and the cream group heading, has page-local copies only (v138's, already copied by Responses v2);
   - 4d, the packages showcase, is internal to `Pk38Results`.

   All of them live on unmerged branches that the dev chain contains. **On your ruling the branch was cut from the dev chain `…-pk39-db116`, not from `main`.** It can merge to `main` only after QC v150, packages v38–v40 and Versions v1 do.
3. **"Versions v2.2" is not in the dev chain** (branch `versions-v2` is unmerged everywhere). The title card used is the one QC v150 uses, `PageHeaderCard`, whose header comment says it came from Versions v2.2's `.hb`.
4. **"Gone quiet" is not "gone past the reply time the agent gives".** D6 requires the Query Centre's own set, `whereItStands === "quiet"`. That set begins at the end of the nudge window: 28 days past the reply date, or 84 days in the stage when there is no date.
   - On the reference's own data the app reads **0** where the mock reads **2**: the mock counts anyone past their stated time.
   - The ref's copy is kept. The timing line's "{m} have gone past the reply time the agent gives" counts only gone-quiet queries that *have* a reply date, because the sentence is untrue of the undated ones.
5. **Phase 3's "keep v2's ordering" contradicts the ref and the prompt's own summary** ("Your-move cards come first, then newest"). The ref won: your move first, then the newest answer. v2 sorted by soonest due date.
6. **v2 ran a revise-and-resubmit card's action as `resp`.** The ref's label is "Record the resubmission", and the Query Centre's own door for an owed revision is `sent` (`cardDoors`), so the card now runs `sent`.
7. **The ref's share card says "No agent names are ever shown."** The existing builder, which must stay unchanged, has a switch that shows them. That one sentence is left out.
8. **The ref says every no-reply closed "as their guidelines say".** The app says so only where the agent's record has `noResponseMeansNo`.
9. **The ref's "One mark for each no since {month}" is the date of the first no.** v2's `tallySince` used the first query date (May where the ref says July). The ref's rule is used.
10. **The ref's Filters and Full screen buttons do nothing in the mock.** Rather than render dead buttons, Filters filters by "Got as far as" and by "What they said" (note or none), and Full screen lays the sheet over the window (Escape leaves it). **These two behaviours are mine, not the ref's — please check them.**
11. **The ref's drawer dims the page.** The prompt keeps v2's container (query panel v2's `SidePanel`), which dims only while a journey runs. The container won.

## 2. What survived from v2 before this run (Step 0.5)

All of it was on `main` (merged with the consolidation). My note saying v2 was branch-only was stale.

- **Header:** a centred light header ("{n} answers from agents", eyebrow, byline), plus one card with the answer counts and the Reply rate ring.
- **Carousel:** on a paper band, with dots and a "+ Record a request" tile.
- **The nos:** the blush banner; the tally (`gatePaths`); the list in a white sheet under a navy row, with a pin and its hysteresis, month bands, and sort by date / wait / agent.
- **Share:** the image builder (`RspShare`).
- **Panel:** `SidePanel` holding a stand card, a feedback card, an index card and a Timeline tab.
- **Empty states:** the empty page, and a separate zero-nos panel.

## 3. Phases

Baseline on the dev-chain tip: tsc **0** · build clean · Vitest **10,617 passed**, 1 failed test and 3 failed files, all under `functions/` and all pre-existing. Every commit below matched that (tsc 0, clean build, the same three failures).

| Phase | Commit | What changed | Vitest passed |
|---|---|---|---|
| 1 data | `75500670` | `firstAnswer`, `medianDays`, `typicalWait`, `waitBrackets`, `speedByKind`, `passDepth`, `hasNote`/`noteSplit`/`noteItems`, `goneQuiet`/`nextExpected` (QC's own), `pageCounts`; 8 tests | 10,625 |
| 2 header | `2e0c8990` | shared title card + shared GlanceCards + the sentence; v2 header, card and ring retired | 10,625 |
| 3 carousel | `12ca2c1b` | the ref's card; order your move → newest; R&R runs `sent` | 10,625 |
| 4 insights | `51a68ba7` | navy band, three-up showcase, warming-up cards | 10,625 |
| 5 timing | `a004fa75` | four bars, sentence above, waiting line below, names on hover/focus | 10,625 |
| 6 words | `456e05c8` | paper band, three filters with counts, quote cards open the panel | 10,625 |
| 7 wall | `7c94b07b` | banner, tally, six-column list, Filters, Full screen, share card → existing builder | 10,625 |
| 8 panel | `1554db23` | the ref's drawer inside v2's container; v2 panel words and their two tests retired | 10,623 |
| 9 empty | `afdf0c0f` | While you wait + three Example rows | 10,623 |
| 10 locks | `c1c46b2e` | e2e locks, smokes, two fixes the locks found, retirements, CLAUDE.md | 10,626 |

Two bugs that only the locks found, both fixed in Phase 10:
- **A2:** section links landed 146px down instead of 20, because the wall's pin sets the scroller's scroll-padding and `scrollIntoView` adds it.
- **L1:** the page scrolled sideways by about 1,700px, because the hairlines on "In their words" were positioned pseudo-elements reaching 100vmax out.

## 4. Locks

The ledgers are in `ledger/`, the final green run is `final-run.log` (16 passed, 165 readings), and the mutation runs are in `mutation-proofs.txt`.

| Lock | Claim | Named mutation (`RS5_MUTATE`) | Red result |
|---|---|---|---|
| A1 | title card = ref ±2 (w, h, padding, radius, type sizes, button, hawk) | padding 18/22 | h 279 vs ref 311 |
| A2 | glance counts sum to sent; = the ref's; clicks land at 20px and set the wall | Still waiting +1 | 13 vs sent 34 |
| B1 | every your-move card before every other | carousel row-reverse | order reversed |
| C1 | band figures = the ref's (full and early) | reply share +1 | 54% vs 53% |
| C2 | warming up at 3, not at 5 or 22 | warm cards hidden | 0 drawn, want 3 |
| D1 | segments sum to bars; bars to answered; totals = ref | a segment removed | 1 vs 9 |
| E1 | note chips = visible cards; all = pass + req | first card hidden | 5 vs 6 |
| F1 | exactly six headings and cells; no package text or class | a PACKAGE heading | 7 headings |
| F2 | months newest first; Queried/Took sorts | list reversed | months oldest first |
| G1 | panel from a card, offer, quote, row; footer matches state | label rewritten | wrong footer |
| H1 | empty page; populated arrives live, no reload | forced reload | 1 load, marker gone |
| P1 | pin at 12, headings under, month under stack, 2 flips (was rs2 C3) | pinwrap not sticky | bar −500 |
| G2 | acting dims; Esc restores; a no lands live with Undo (was D2) | scrim hidden | alpha 0 |
| S1 | share builder: names off, none drawn, local save (was E1) | names switched on | starts on |
| L1 | no sideways overflow at 5 widths (was L1) | share card 2400px | 2604 vs 1664 |

Three mutations needed correcting before they proved anything, which is the finding behind each:
- **The first proof loop matched no test** (`-g "^A1 "`), so every "red" was "No tests found". The loop now requires the lock's own ledger line.
- **E1:** removing a node React owns crashed the page before the lock could read it. Replaced by a CSS mutation.
- **H1:** the page briefly draws the populated skeleton while loading, even for an empty book, so the reload fired early. The mutation now arms only after the empty page has been seen.

Retired: `tests/e2e/RETIRED-responses-v5.md`, one line per v2 lock. Four were re-pointed rather than deleted.

## 5. Lift candidates (page-local copies)

- The showcase anatomy (`Rsp5Insights.tsx`), from `Pk38Results`' internal top three.
- The navy list bar, headings and cream month heading (`RspNos.tsx`, `.rsp5-lbar` / `.rsp5-lhead` / `.rsp5-lgrp`), from the Query Centre. v2's copy of v138's white sheet stays in `responses.css` only because the share builder still uses it.
- The dashed art placeholder (`.rsp5-art`).

## 6. Not matched to the ref

Screenshots are in `shots/`, each set against the ref's `design-refs/responses-v5/screens/`.

- **Gone quiet: 0 where the mock says 2** (§1.4). `top-1512.png` vs `01-top-1512.png`; `timing-*.png` vs `05-*`; `empty-*.png` vs `11-*`.
- **Order of notes:** In their words and the showcase's notes card show the newest note first; the mock shows its data order. `words-*` vs `06-*`; `band-*` vs `03-*`.
- **The panel** has query panel v2's geometry and does not dim the page while browsing (§1.11). `panel-1512.png` vs `09-answer-drawer-1512.png`.
- **App chrome around the page** (the beta strip, this branch's sidebar) is not the ref's; D9 kept it out of scope.

At 1280 every section was captured (`*-1280.png`) against the ref's `*-1280.png`. Apart from the above, they match the ref's figures and layout.

## 7. Dev

Dev had moved to `…-db116-cl256` (Contact list v25.6) since the base I branched from. So the dev branch is that chain plus this one:

- **Branch:** `dev/db71-plad-db71f-cl25-lm2-cl251-lm3-db77-lm4-cl252-pk40-cl253-db93-cl254-cl255-db105-pk38-pk39-db116-cl256-rsp5`, merge `0e760daf`.
- **The merged tree's gates:** tsc 0, build clean, Vitest 10,637 passed, with the same three pre-existing failures.
- **Hosting only.** https://scriptally-dev.web.app serves `index-CStVDiFt.js`, which was `index-C8Z6nkdu.js` before the deploy. A2 and F1 pass against dev itself.

Seen but not mine to fix: Dashboard v105's "how" dialog sits at opacity 0 with `role="dialog"` in the middle of every route.

## 8. Worktrees

Both are removed: `../ScriptAlly-rsp5`, and the deploy worktree `../ScriptAlly-rsp5dep`. Everything is committed and pushed on `responses-v5` and on the dev branch.
