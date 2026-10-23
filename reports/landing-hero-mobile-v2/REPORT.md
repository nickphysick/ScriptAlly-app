# Landing hero on phones, v2: the card tells the whole story — run report

23 Oct 2026. Ref: `design-refs/landing-hero-mobile-v2.html` (SHA256 `11624927…d603`, verified). It was in `~/Downloads`; I copied it in and enrolled it in the hash manifest. Phones only (≤760px). The desktop `play()` is byte-identical: the phone story is its own `playPhone()`.

## False premises, and what survived from mobile v1

**Survived on `main`** (cf14fd80), all of it:
- the phone header and live places counter;
- the sticky navy stage and the pile;
- the "dealt from the side" entrance and the hawk fly-past;
- the docked nudge form;
- the drawer and its scroll behaviour;
- the end-of-story grow with the FoundingSignup mount;
- Watch again;
- locks HM1–HM8.

**Where the brief and the ref disagree, or the ref couldn't be copied as is:**
1. **The stage.** The ref also restyles `.stage` (a new gradient and `overflow: hidden`). The brief says the stage is unchanged from v1, so those two rules are not ported.
2. **The v2 ref is cumulative.** v2's first 300 lines are v1's byte for byte, and v2 appends ~260 lines of CSS in which `.lcq-p`, `.lcd`, `.lcd-chart` and others are restated. Every value I used is the last declaration of its property. Measured against the rendered ref, the card, the list, the heading, all five rows and the disc are identical to 0.1px.
3. **The ref's agent-pick slide has the flicker S2 complains about.** The ref works out the card's scale as the card's rect width divided by its layout width. The card is turned 0.8°, so that ratio comes out about 2% high, and the hand-over jumps **3.6px**. I measured this by putting the ref's own method into the app; HM9 then goes red.
   - Here the slide is worked from offsets in the card's own frame, and the hand-over measures **0px**.
   - The ref also draws the list's discs as a background image with a larger head than the card's disc. Here each list row uses the card's own disc markup.
4. **v2's grown scale.** v2's roomier manuscript block makes the card 8px taller.
   - On the v2 ref, the fixed .86 grown scale leaves the last panel **3.8px under** the grown drawer at 390.
   - Your earlier ruling (the last panel stays above the drawer) is why the grown scale is derived. On this card it comes out at **0.847** at 390 (panel 2.2px clear) and **.86** exactly at 430.
   - HM8 now holds that rule, rather than v1's ".86 at 390".
5. **"It may wrap to two lines."** At 390 the pill "Task created · Make sure the partial showcases my protagonist's voice" wraps to three lines, in the ref exactly as here: the title on line 1, the detail over lines 2–3. It stays 14px inside the edges.
6. **"Pill shows Queried 300ms after Log query is pressed."** The ref stamps the pill in from the press's end + 300ms over 340ms. HM10 therefore reads the band at +300ms ("With the agent") and the pill once its stamp has landed (+700ms).
7. **Not ported:** the dead helpers the brief names (ghost, rise, notify, sentPop, bubbleGhost, chartGhost, noteTask, drift, tag, the `#lq` form) and the unused night sky.

## Gates (no worse than baseline)

| | baseline (cf14fd80) | final (eade19fb) |
|---|---|---|
| `npx tsc --noEmit` | exit 0 | exit 0 |
| `npx vite build` | exit 0, no `error` / `[WARNING]` lines | exit 0, no `error` / `[WARNING]` lines |
| `npx vitest run` | `Test Files  3 failed \| 636 passed (639)` · `Tests  1 failed \| 9861 passed \| 3 skipped (9865)` | `Test Files  3 failed \| 636 passed (639)` · `Tests  1 failed \| 9862 passed \| 3 skipped (9866)` |

The three failing files are all under `functions/`, because the worktree has no `functions/node_modules`. They're the same before and after; the extra passing test is the new copy lock.

## Commits (on `main`, pushed)

| hash | message | files |
|---|---|---|
| `f3a0749f` | Phone hero — the card opens on the dashboard and logs the query on the card | `src/marketing/HeroCard.tsx`, `heroCard.css`, `landingCopy.ts`, `design-refs/landing-hero-mobile-v2.html`, `design-refs/.refhashes.json` |
| `4e4a0268` | Phone hero — query form with the sample control, and Query sent as an event | `src/marketing/HeroCard.tsx`, `heroCard.css` |
| `6200449d` | Phone hero — status pills, push-and-highlight, and logging the partial request | `src/marketing/HeroCard.tsx`, `heroCard.css`, `FoundingNavPill.tsx` |
| `eade19fb` | Phone hero v2 — locks | `tests/e2e/landingHeroMobile.measure.ts`, `src/marketing/landingCopy.test.ts`, `reports/landing-hero-mobile-v2/mutation-proofs.txt` |

## Screenshots against the ref (390 × 844)

App left, ref right, each pair captured at the same point in its own story. The moment is found from each page's own scheduled animations, because the app starts a beat after the ref (its bundle has to load first). All are in `shots/`.

| moment | file |
|---|---|
| the dashboard, just before "Log a query" is pressed | `compare-p1-dash.png` |
| the agent list with Eleanor highlighted | `compare-p1-pick.png` |
| the slide and land, 120ms apart | `compare-p1-slide-440.png`, `-560`, `-680` |
| "Your manuscript" half typed | `compare-p1-typing.png` |
| the sample control on Chapters / Words / 15 Pages | `compare-p2-chapters.png`, `compare-p2-words.png`, `compare-p2-15pages.png` |
| the Query sent line with its chips | `compare-p2-sent.png` |
| the push-and-highlight at its peak on Query sent | `compare-p3-zoom-sent.png` |
| the response form on Chapters | `compare-p3-response.png` |
| each pill in turn | `compare-p3-pill1.png` … `compare-p3-pill6.png` |
| after Watch again (dashboard back, drawer still grown) | `app-p3-replay.png` |
| deployed dev: the dashboard, and the end | `dev-dashboard.png`, `dev-end.png` |

**Visible differences:**
- The logo (brand mark against the ref's placeholder disc).
- The list's discs (the card's own head, deliberately).
- Pill boxes match the ref within 0.3px; settled, every one is 14px off the right edge at 390 and 375.

## Locks

All live in `tests/e2e/landingHeroMobile.measure.ts`. The proofs are in `mutation-proofs.txt`; each break was applied by `HM_MUTATE` or as a source mutation, then restored.

**New:**
- **HM9, no flicker.**
  - Claim: from the tap to 400ms after the land, the agent row is never invisible. After the slide, the disc never moves more than 1px, and the name's size and drawn height never more than 0.5px, between 50ms samples. And the list's row lands exactly on the card's.
  - Red-before: the list name's size changed fails "the name's size never jumps"; the card's row hidden fails "the row is never invisible"; and the ref's own rect-based slide fails with a 3.6px jump at the list→card hand-over.
  - Note on the window: during the slide itself the row moves by design (about 12px per sample), so the 1px rule applies from the slide's end.
- **HM10, band.**
  - Claim: "Logging query…" with a hidden pill before the press; "With the agent" at +300ms; "Queried" once its stamp lands.
  - Red-before: the pill forced visible fails "the pill is hidden before the press".
- **HM11, pills.**
  - Claim: the six pills, in order (so Partial sent creates none), each settled at least 14px inside every edge, at 390 and 375.
  - Red-before: a pill pushed to 6px from the edge fails "r edge"; Partial sent given a pill fails "the six pills, in order".
- **HM12, zoom.**
  - Claim: the push-and-highlight runs on lines 0, 1 and 4 only.
  - Red-before: Partial sent added to the zoomed lines fails.
- **HM13, copy.**
  - Claim: "Your manuscript" on all five phone cards, the chip reads "15 pages", and "Lead future queries with the opening voice" is nowhere.
  - Red-before: the chip back to "10 pages" fails.
  - Plus a unit lock in `landingCopy.test.ts`: red when a copy constant carries the retired line.

**Rewritten:**
- **HM3:** the story now runs about 59s to the grow; its 60s waits raced it.
- **HM4:** the counter counts down from the cap and never rises. Red-before: counting up from 0.
- **HM6:** the static state with heads, "Your manuscript", 15 pages, and no overlays, pills or zooms. Red-before: initials put back.
- **HM7:** the fly-past delay is 650ms. Red-before: 1500ms.
- **HM8:** the rule (panel above the grown drawer, scale at most .86, exactly .86 at 430). Red-before: a fixed .86 fails at 390.

**Green:** `landingHeroMobile` + `landingHeroV3` + `landingColoursV2` pass on the final build: 30 passed, 3 skipped (the colours suite's capture and screenshot cases, which only run on request). `landingHeroMobile` also passes against deployed dev (13 passed).

## Dev

- Dev had moved twice during this work. It was serving `index-DIv_ZsAq.js` from `dev/ver1-nbab-pkglink-hm1-ver21` (another session's Versions v2.1). I confirmed that by building that branch, which reproduced the hash.
- I deployed `dev/ver1-nbab-pkglink-hm1-ver21-hm2` (1cc227b9): that branch with `main` merged in. The only conflict was `.refhashes.json`, resolved as the union of both lists. The branch is pushed. The served-hash check was in the deploy command.
- **Dev now serves `index-eXm3BypA.js`.**
- On a 390-wide window it opens on the dashboard and plays: Logging query… → With the agent / Queried → the Query logged pill → With you / Partial requested with its three pills → Partial sent (no pill) → the Reminder set pill → With you / Full requested → the "Send the full" pill → the drawer grows.
- Prod was not touched.
