# Phone app v2, Part 7 — the menu pages: Responses and the Wall of no, Manuscript, Analytics, Streaks & goals

Branch `phone-app-v2` (worktree `/Users/nickphysick/ScriptAlly-pa2`). Ref: `design-refs/phone-app-v2/` — screens 32–38; `respv.js` (`PAGES.responses` at RSQ B · WALL B), `msv.js` (`PAGES.manuscript` and `coverHtml` at MSH B · MSL B · MSP A · COV B), `anv.js` (`PAGES.analytics` at ANT B · ANC B), `restv.js` (`PAGES.goals` at GLV B). The hashes were re-verified (69 OK). Not merged, not on prod.

## False premises

1. **"Analytics: the band's figure is '{p}% heard back' … Analytics' own."** The desktop Analytics page states no "% heard back"; its header counts queries and replies. The app's one "% heard back" is the Query Centre's: `bandFigures(rows).heardPct` (`lib/qc140`), asked for more or passed, over every row. The band uses that.
   - ⚠️ Its denominator is every query, including Withdrawn and Signed. Responses' "Heard back from {n} of {m}" (`pageCounts`) leaves those out of `m`. So the two pages can disagree by a point or two: 60% on Analytics, "31 of 51" on Responses. Not done, item 1.
2. **"The All time / Last 90 days switch … styled as Home's switch and remembered the same way."** The desktop's switch (`A17Frame` `Glance`) is not remembered: it resets on every visit. Home's switch is a different range set (1M · 3M · All) with its own key.
   - The phone's switch has its own per-device key, `sa.phoneAnalytics`, written the way Home writes `sa.phoneHero`.
   - "Last 90 days" is the Analytics glance's own window, (now − 90 days, now] by send date. The windowed figures are the same functions over the queries sent in that window.
3. **"Streaks & goals … the goal ring in the band" (rulebook).** The ref itself (`PAGES.goals`) puts the ring in the first white card under a plain band, and so does the app.
4. **"The cover … an 'Add your cover' affordance only where the app can store one."** Nothing writes `coverUrl`: it is not in the manuscript-update rules allowlist, and no upload path exists. So there is no affordance. The drawn cover always shows unless a `coverUrl` is already on the record.
5. **"The streak's weekly history is computed … If the app keeps no goal history …"** The app does keep one: `queryingGoals` is append-only, so `resolveGoal(entries, pastDate)` gives the target that was in force any past week. The streak reads it.
   - A week is met when its sends reach the WEEKLY target in force then.
   - Where no weekly target is in force (the harness account's goal is monthly), one query meets the week. That is the dashboard's own streak rule (`achievementPill`).
   - Nothing new is stored.
6. **"Medians, never averages, as on the desktop."** The desktop's Analytics uses medians, but the packages page's `Fig.days` is a mean. The phone shows no package reply days, so no mean appears on the phone.
7. **"The Requests … 'Now: {next step}'."** The ref's line repeats the status ("Now: Full requested"). The brief asks for the next step, and the app has one: the desktop Responses card's `cardAct` ("Now: Mark full sent", "Now: Record a response").

## What Step 0 found

- **Below 768px all four menu routes rendered the desktop page, squeezed.** `PageRoutes.tsx` chooses by width for `/queries/responses`, `/manuscripts`, `/queries/analytics` and the new `/goals`, as `TodoRoute` does.
- **Responses' model is the desktop page's, call for call:**
  - `buildQcRows` → `respItems` → `pageCounts` / `carouselOrder`;
  - `listNos` at the page's own default (newest no first);
  - `typicalWait` for the median reply.
  - Placement is `placeOf`'s, so Queried, Withdrawn and Signed are on neither the Requests nor the wall.
- **The Manuscript page READS the desktop libraries only:**
  - `scopedManuscript`, `whereItsBeen`, `queryingSince`, `cardGenre`, `currentBookVersion`, `materialsOf`, `letterInUse`;
  - the packages page's `figOf(packageSplit, creditedTo)`, `labelStatus` and `rankByMore`;
  - `materialSplit(...).sent` for "Used in N queries".
  - `usePk26Model` was not used: mounting it runs a one-off migration write.
- **The weekly goal is `deriveGoalProgress`, and its sheet is the existing `GoalTargetSheet`.** Its one write (`appendGoalEntry` → `updateUserProfile`) is the dashboard's.
- **The ranks are the founding card's own:** `useFoundingStats`, `TIERS`, `cardTier` and `nextStep`. Every signed-in writer is a founding writer; the app has no flag for it.
- **There was no `/goals` route.** It is registered in `WORKSPACE_PATHS`, the shell map (`shellForRoute`, whose lock caught the omission) and the page-name table. On a computer it goes to the dashboard.

## Gates

| Gate | Before Part 7 (`5572ebce`) | After |
|---|---|---|
| tsc root / functions | 0 / 0 | 0 / 0 |
| build:dev (grepped) | clean | clean |
| Vitest | 693 files · 10748 passed · 3 skipped | `Test Files 695 passed (695)` · `Tests 10761 passed \| 3 skipped (10764)` |

## Commits

| Commit | What |
|---|---|
| `4a17e4eb` | 7A Responses and the Wall of no |
| `0d3ba86a` | 7B the Manuscript page |
| `16418e8e` | 7C Analytics |
| `c08bc3e1` | 7D Streaks & goals (`/goals`, `lib/milestones`, the smoke tests) |
| (this commit) | 7E locks, shots, pairs, this report, and four fixes the locks found (below) |

## ⚠️ Faults found on the way, each fixed before its commit (or in 7E)

1. **The request scroller sized the whole shell: 4,660px wide at 390.** The shell's flex ancestors have `min-width: auto`, so the cards' total width was the page's min-content. Fixed with `contain: inline-size` on the scroller.
2. **The page headings in cards rendered Playfair.** `brand.tsx` forces every `h2`; the face rule carries `!important`, as Home's does.
3. **Badge dates without a year read out of order** (First query 18 Apr against 10 out 14 Mar — 2024 and 2025). A date not in this year now carries its year.
4. **In 7E, the cover's ink text read as "on navy" to the colour sweep.** Its blush was a gradient image only. It now has a matching `background-color`, so the ground the text sits on is a real blush.

## Locks — PA2-7 (`tests/e2e/phoneAppV2Pages.measure.ts`)

Every expected figure is computed in the test by the SAME library calls over the account's own records. The claim is that each page wires the right inputs to the right function, which a mutation of either breaks.

| Lock | Claim | Mutation | Red reading |
|---|---|---|---|
| P1 | "Heard back from {n} of {m}" is `pageCounts`'; the wall is exactly the passes and no replies, newest first; tilts are stable | `p1-withdrawn` (place Withdrawn on the wall) | `31 of 52 vs 31 of 51`; `["Withdrawn"]` on the wall |
| P2 | each package's heading and status are `figOf`/`labelStatus`'s; ranked only once 4 have answered | `p2-rank-early` | `"100% asked for more" vs "Too early"` |
| P3 | the headline (`heardPct`), the stage counts (`analyticsModel`) and the median wait (the glance's) for both ranges; the range survives a reload; fourteen weeks | `p3-average` (a mean for the wait) | `median wait 0 days vs 14 days` |
| P4 | each milestone earned and dated by the writer's own first event; seven week dots, the last this week, none after today; the streak is `weekStreak`'s | `p4-future-week`, `p4-latest-first` | `…,2026-11-02 vs 2026-10-26`; `at 1790808948964 vs 1783594029371` |
| P5 | the Materials and Comparable titles tiles land on `#materials` / `#comps`; the Streaks & goals tile opens `/goals` | `p5-no-hash` | `top 722`, `top 1325, not visible` |
| P6 | no file that existed when the part began, under `components/manuscripts/` or named `Manuscript*`/`AllManuscripts`, changed | touch `ManuscriptPage.tsx` (restored from a path-derived backup) | `src/components/manuscripts/v12/ManuscriptPage.tsx` |
| P7 | the colour laws (white on the band, ink on blush) and no image twice, all four pages | CSS `ink-figure` | `text on navy is not white: b.pa-num "31"` |
| P8 | the desktop untouched: PA2-1 S9 over `/queries/responses`, `/queries/analytics`, `/manuscripts` at 1512 and 1280 (0 px, DOM-identical); and a computer sent from `/goals` to the dashboard | `p8-phone-on-desk`, `p8-goals-desktop` | `head 650671 px vs base-to-base 0 px`; `…/goals` |

**How the locks were made to hold:**
- **P5 first measured `#comps` at 325px from the top on a correct page.** The page ends below the section, so it cannot reach the top. The claim now accepts the scroller's end, with the section on screen. With the scroll removed it is red at both sections.
- **P6 first flagged `ManuscriptPhone.tsx`**, a new file whose name the brief prescribed. The rule protects files that existed; P6 reads `--diff-filter=MDR`.
- **P6 needs no page.** It runs `--no-deps` so the setup's bundle check cannot refuse it while a file is touched on purpose. An earlier attempt "failed" for exactly that reason, and was not counted as a red.
- **P8's first mutation (`desk-bar`) changed nothing on these routes**, because a menu page draws no tab bar. The proof is a route wrapper that shows the phone page on a computer.
- **S6 (Part 1) held the Streaks & goals tile disabled "waiting for Part 7".** This part is that wait ending: the claim is now "present and live".
- **The menu lock in `mobileShell.test.tsx` held the packages route on the menu.** The Materials tile now opens the Manuscript page's materials, which show the packages; the lock follows.

**Final green on this build:** PA2-7 `7 passed` (both sizes, P6 and P8, with setup) · PA2-6 `5` · PA2-5 `5` · PA2-4 `4` (wrote and undid) · PA2-3 `3` · PA2-2 `3` · PA2-1 `10 passed, 2 skipped` · QM1 `1 passed, 10 skipped` · DM1 `3 passed, 5 skipped`. The account matched its list afterwards (the one listed difference, `queries/seed-pkgq-1`, is key order only). Regression ledgers are in `ledger/regress/`. After the last fix (the scrollers' `scroll-padding-inline`), PA2-7's Responses and Manuscript case and the pairs were re-run green.

## Where the app overrode the ref

| Item | Ref | App |
|---|---|---|
| Responses' "Heard back" | a white card under the band | in the band, as the brief asks |
| request card court colours | tinted text per court | ink on every fill (the colour law) |
| the banner | its own words | the desktop's `RspBanner` words |
| Manuscript band | no page title; an edit ring | the page band's title "Manuscripts"; no edit ring (editing stays on a computer) |
| package cards | "2 requests from 11" | the same shape, plus `labelStatus` ("Too early" until 4 have answered) |
| letter rows | "· current" | "· in use" (`letterInUse`: the letter on the most recent send) |
| sample rows | no usage | none: `materialSplit` has no sample kind |
| Analytics stage 2 | "Partial" | "Request": the count is any request to read more |
| records | Busiest week, Longest wait | the app's records: first request, quickest reply, first offer, busiest, run, full read — whichever exist |
| streak | eight dots | seven, as the brief asks |
| ranks' sentence | a gift promise | the founding card's own `nextStep` sentence |

## Pairs

`pairs/` holds 32–38 beside the ref at 390 × 844 and 360 × 780.

## Dev

- **Before:** dev served `index-ir44D8o3.js`, the Part 6 integration `6f1bb838`.
- **Integration branch:** `dev/pk391-qm1-pk392-calx-pk392b-td7-fv1-pk393-pa2-2-td12-ppp1-pa2-7`, at `dc20fc30` = `6f1bb838` + `phone-app-v2` at `77de94f4`. No conflicts; CLAUDE.md auto-merged.
- **Gates there:** tsc 0 / 0 · build clean · Vitest `Test Files 697 passed (697)` · `Tests 10772 passed | 3 skipped (10775)`.
- **Locks there:** PA2-7 `7 passed` · PA2-6 `5` · PA2-4 `4` (wrote and undid) · PA2-3 `3` · PA2-2 `3`. The account matched its list afterwards.
- **After:** built from a clean checkout of that branch; dev serves `index-BZP8LJfl.js`.

## Not done, and why — for Nick

1. **Two "heard back" denominators** (false premise 1). Analytics' 60% counts Withdrawn and Signed; Responses' "of 51" does not. Choosing one is a ruling.
2. **`/goals` on a computer goes to the dashboard** until a desktop page is designed.
3. **The packages page is no longer one tap from the phone menu.** The Materials tile opens the Manuscript page's materials, as the brief asks; the packages page remains reachable by its address.
4. **Editing materials and building packages stay on a computer.** Every read view says "Edit on a computer."
5. **No cover upload.** `coverUrl` is not writable by the rules and no upload path exists.
6. **The weekly-goal sheet is the dashboard's `GoalTargetSheet` modal,** unstyled for the phone; a phone sheet is Part 8's.
7. **The Versions Pro strip says "Included for founding writers during the beta."** That is the ref's sentence; nothing in the app gates versions today, so it is a claim the product must keep.

## Worktree

Kept for Part 8.
