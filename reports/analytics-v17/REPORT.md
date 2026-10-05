# Analytics v17 — the whole page, desktop and phone, in the v126 dress

Branch `analytics-v17` in the worktree `../ScriptAlly-analytics-v17`. It was cut from `origin/main` at `3d6bac97` on 5 Oct. **Nothing is merged and nothing is deployed.** Ref: `design-refs/analytics-v17.html` and its 19 PNGs, all enrolled with matching SHA256.

**Merge note.** `origin/main` has since gained one commit, `6c8c7791` (Contact list v13 3/8). I checked the overlap: it shares no file with this branch, so the merge should be clean. That commit adds `ESC_LEVEL.page`. The section tab's menu handles Escape with its own handler (capture, stopPropagation) rather than the escape stack, and could move onto `ESC_LEVEL.page` once both are on main.

## False premises

1. **"v2a and v13 were never run."** Both were run to completion, merged to `main` and deployed to dev:
   - v2a was merged first.
   - v13 was merged as `2ae7d18a`, and dev served it as bundle `index-CiQY6Jl3.js`.

   This pack retires v13's page; the files are listed under *What retired*.
2. **"`analytics-v13.html` is missing its chart styling."**
   - True of the file: it never declared `.fig`, `.fh`, `.key`, `.two`, `.chap.white`, `.n` or `.nm`, and v13's report already said so.
   - But the file had been enrolled in `design-refs/.refhashes.json`. Phase 0 deleted it, as this pack instructs, and retired its manifest entry **by hand**; the build's ref checker would otherwise refuse to build.
3. **AN17-3's oracle.** The lock table says AN17-3 checks the Query Centre against `design-refs/qc-v126/ref-01-top@2x.png` at 1512. That PNG is the v126 *mock*, which differs from the live Query Centre in ways v126 accepted. Comparing against it would test v126's own fidelity, not this pack's "unchanged".
   - What I did instead: Phase 0 captured the live Query Centre's band boxes at 1512 from the **unchanged build** into `reports/analytics-v17/qc-band-baseline.json` (band, title, disc, both buttons).
   - AN17-3 compares the live page against that capture (±1).
4. **"Lift the band into a shared component."** No lift was needed. v126 had already built the band as `PageHeader band`, a shared prop (`c2fe9dfd`).
   - What this pack adds is an opt-in modifier, `bandFixed` (class `ph--bandfix`): 337px, centred contents, no notes row, and the phone layout.
   - Every new rule names `.ph--bandfix`, so the Query Centre, which does not pass it, cannot move.

## §0 — recon

### 1. What is on main (at `3d6bac97`)
- v126 has landed:
  - Phase 1 (greige tokens): **`81410909`**
  - Phase 2 (the band, as the shared `PageHeader band` prop): **`c2fe9dfd`**
  - Phase 5 (`AppFooter`): **`b7b37f73`**
- Since then, only Contact list v13 1/8 (`965b13e3`, `src/components/shell/LIVING_HEADERS.md`) and 2b/8 have touched `src/components/shell/`. Nothing since v126 had touched the Analytics route or the tokens.
- **STOP gates:** all hashes are present and match; v126 Phase 1 and Phase 5 are on main; there is a live active-manuscript source. None tripped.

### 2. The Analytics page before this pack (v13)
- **Route and mount:** `/queries/analytics` → `QueryAnalytics.tsx`, mounted by `App.tsx` inside a `StagePage`.
- **v13's mounts:**
  - `A13Frame.tsx`: the feature container, dot nav and scroll reveal.
  - `A13Figures.tsx`: seven figure components.
  - `A13Empty.tsx`.
  - `a13.css`: the only analytics-only stylesheet.
- **Helpers:**
  - `lib/analyticsModel.ts`: `analyticsModel` with v13's `buildV13` block.
  - `lib/analytics.ts`: `buildRows`, i.e. "reached", the same derivation the Manuscripts page reads.
  - `lib/analyticsExample.ts`: the empty page's invented campaign, run through the real model.
- **What survived:** the route; the file `QueryAnalytics.tsx` (its path is read by `workspacePageGrid.test.tsx` and `pageStructure.test.ts`); `analyticsModel` and v13's prose helpers; `analytics.ts`; `analyticsExample.ts`.
- **What retired:** listed under *What retired*.

### 3. The header band
- Already shared, as `PageHeader band` (`c2fe9dfd`). See false premise 4.

### 4. Manuscript scope
- **Where it is stored:** `localStorage["scriptally_active_manuscript_id"]`, written by the bar's `BarSwitcher`, which then re-opens the route.
- **How it is resolved:** through `resolveScopedManuscript` (`lib/shellSidebar`).
- **There is no subscription.** A switch re-renders the page by changing the route's `location.key`. So the page reads the key on every render and keys its derivation on `useLocation().key` (the CLAUDE.md law). AN17-18 proves it end to end.

### 5. The derivations
Each figure is now derived in `buildV17`, from the scoped queries, their activity, the agents and the clock. Most of it is reused rather than new:

| Figure | Where it comes from |
|---|---|
| **Furthest stage reached** | `analytics.buildRows` (reached partial / full / offer, closed or not) |
| **Sent date, weekday, week** | `dateSent`; Monday-based weeks |
| **First agent response** | The first post-send rung on the query's own activity log, with the document's dated fields first (the Query Centre's authority rule) |
| **Stated response time** | `Agent.responseTimeWeeks` (whole weeks, absent when unstated) |
| **Stage gaps** | The document's dated pipeline fields; a query missing an intermediate date is **skipped**, never estimated |
| **Weeks to an ending** | The terminal rung's date against `dateSent`, by outcome |
| **Records** | Ties go to the earliest; a full read still under way counts to today |
| **Running totals and lanes** | Sent, requested and ended dates; status today |

- **New derivations:** the 90-day windows, which are `(now − 90d, now]` and `(now − 180d, now − 90d]`.
- **Nothing the reference shows needed a fact the app does not have**, so no figure was dropped.
- **Two segments were ADDED** to the share bars that the ref's data omits:
  - "passed on the letter" in *What happened to the N*;
  - "requested, not sent yet" in *What happened to the requests*.

  Without them each bar would not sum to its total, and AN17-9 asserts that it does.

### 6. The seed (the harness account, unchanged)
- **The active manuscript:** "Harbour of Glass", with **8** queries.
- **The reply chart:** "2 of 6 agents state a response time", so the chart draws **one** row: the only replied query whose agent states a window. The figure's note says so, as the pack asks when stated windows are largely absent.
- **The busiest week:** a three-way tie at 2 queries. The **earliest** (March) is rust; the other two are anthracite.
- **AN17-18:** switches to another manuscript with queries and back, restoring the original id.

### 7. Existing tests that touch Analytics
**Unit tests:**
- `analyticsModel.test.ts`: v13 cases removed, 11 v17 cases added, each proved red by a mutation.
- `analyticsPageSmoke.test.tsx`: rewritten for v17. It also asserts that the review aid is unreachable from a production build.
- `pageStructure.test.ts` and `workspacePageGrid.test.tsx`: still find their subject.

**e2e suites:**
- `analyticsV13.measure.ts`: **retired**; its subject is gone.
- `livingHeadersV3`: Analytics was already out of its census. The comment now says so for v17.
- `quietBar` Q8 and `pageHeaderV2` §4.4: read the route as a full header, so `/queries/analytics` went into `BAND_ROUTES`.
  - Before: Q8 failed at 1280/1440 ("text 378.3 card 1018.6").
  - After: all three census suites, **32/32 green**.
- About twenty older measurement suites also name the route. They predate this rebuild and were not re-run; they are presumed vacuous until each is re-proved:
  - `routeShots`, `mastheadMatrix`, `gapAudit`, `stripAudit`, `chromeGround`, `contentGeometry`, `phRollout`, `compactHeader`, `surfaceCensus`, `barBinding`, `headerFix` and others.
  - Several were red on main before this pack (CLAUDE.md lists them).

### 8. The phone
- No phone layout exists for the workspace pages; another session owns it.
- Under `src/components/shell/`, only `workspaceShell.css` and `betaChrome.css` switch, at 767px (the slim bar).
- v17's phone layout is **page-scoped**, at ≤760px:
  - every figure has its own phone drawing (`.a17-m`), never a scaled SVG;
  - the band's ≤760 rules live under `.ph--bandfix`.
- No shell or nav file is touched.

## Commits

| # | Commit | What |
|---|---|---|
| 0 | `705860a1` | The ref and its 19 PNGs enrolled; the v13 ref retired; AN17-1…18 written and red; `REDFIRST.md`; the Query Centre baseline |
| 1 | `4a3e186e` | `buildV17` and its 11 unit locks |
| 2 | `b427ff2a` | The scaffold: `bandFixed`, nine banners over frames, the section tab, the skeleton, `AppFooter`; the Birds-eye tab gated on `routeActive`; v13 retired; the band register |
| 3 | `3aeb0d29` | The at-a-glance strip and the funnel |
| 4 | `a0fa0c99` | The training log, the share bars, the empty page's examples |
| 5 | `6c4df5fe` | The reply window; wait times (stage gaps and endings) |
| 6 | `0e8e69b6` | Records; the running totals with the scrub |
| 7 | `c3c30d84` | Lanes; the caveats on the blush workspace |
| 8 | `b791cd94` | The phone |
| 9 | *(this)* | Locks retuned on the built page; mutation proofs; screenshots; this report; CLAUDE.md |

- **Gates:**
  - Baseline: tsc 0, build clean, Vitest 524 files and **8,307 passed / 3 skipped**.
  - Phases 2–8: each cut from the finished tree and gated separately (tsc 0, `vite build` with no error or warning lines, Vitest **8,309 passed / 3 skipped**).
  - The net +2 is the Phase 1 tests less the retired v13 cases.

## Each lock: red first, then green

*Red first:* against the unchanged build (`3d6bac97`), from `REDFIRST.md`. *Green:* the committed build, all seven widths, from the ledgers in `reports/analytics-v17/ledger/`. A ledger row is one reading at one width.

| Lock | Red first (readings / red; first failing) | Green (readings / failed; a sample) |
|---|---|---|
| AN17-1 | 32 / 16; AN17-1 the v17 page is on the route @1280: `false`; AN17-1 page ground @1280: `null` | 36 / 0; main ground @1280: `rgb(243, 242, 240)` |
| AN17-2 | 8 / 8; AN17-2 the band exists @1280: `null`; no horizontal overflow of the scroller @1280: `found false over NaN` | 41 / 0; anthracite @1280: `rgb(42, 58, 82)` |
| AN17-3 | 8 / 0; **green on the unchanged build — proved by mutation (Phase 9)** | 8 / 0; a baseline exists @1512: `reports/analytics-v17/qc-band-baseline.json` |
| AN17-4 | 12 / 12; AN17-4 band and strip found @1280: `false false`; AN17-4 nine sections @1280: `undefined` | 52 / 0; band and strip found @1280: `true true` |
| AN17-5 | 10 / 10; AN17-5 five cells @1280: `0`; no horizontal overflow of the scroller @1280: `found false over NaN` | 90 / 0; five cells @1280: `5` |
| AN17-6 | 8 / 8; AN17-6 nine sections @1280: `undefined`; no horizontal overflow of the scroller @1280: `found false over NaN` | 125 / 0; nine sections @1280: `9` |
| AN17-7 | 20 / 20; AN17-7 four bars @1280: `0`; AN17-7 the top bar's population is non-zero @1280: `undefined` | 40 / 0; four bars @1280: `4` |
| AN17-8 | 32 / 28; AN17-8 the page has dated queries @1280: `undefined`; AN17-8 one dot per dated query @1280: `0 dots, undefined dated` | 32 / 0; the page has dated queries @1280: `8` |
| AN17-9 | 8 / 8; AN17-9 two share bars @1280: `0`; no horizontal overflow of the scroller @1280: `found false over NaN` | 32 / 0; two share bars @1280: `2` |
| AN17-10 | 28 / 16; AN17-10 rows exist @1280: `0`; AN17-10 one row per replied query with a stated window @1280: `0 rows, population undefined` | 28 / 0; rows exist @1280: `1` |
| AN17-11 | 16 / 16; AN17-11 six records @1280: ``; AN17-11 first-request renders StatusDot (and nothing else) @1280: `undefined StatusDot, undefined svg` | 40 / 0; six records @1280: `quickest,first-request,first-offer,busiest,run,full-read` |
| AN17-12 | 2 / 2; AN17-12 the chart is on screen @1512: `null`; AN17-12 the readout starts at Today @1512: `null` | 12 / 0; the chart is on screen @1512: `{"l":327.375,"t":399.359375,"w":1105.25,"h":276.3125}` |
| AN17-13 | 24 / 24; AN17-13 lanes present @1280: `0`; AN17-13 one line per dated query @1280: `0 lanes, undefined dated, population undefined` | 24 / 0; lanes present @1280: `8` |
| AN17-14 | 24 / 24; AN17-14 the workspace is blush @1280: `undefined`; AN17-14 radius 22 @1280: `undefined` | 32 / 0; the workspace is blush @1280: `rgb(244, 224, 212)` |
| AN17-15 | 47 / 42; AN17-15 the tab exists @1280: `null`; AN17-15 fixed @1280: `null` | 49 / 0; the tab exists @1280: `{"l":877.265625,"t":718,"r":1256,"b":776}` |
| AN17-16 | 2 / 2; AN17-16 the page is cut to one query @1512: `undefined`; AN17-16 figures were found @1512: `undefined` | 49 / 0; the page is cut to one query @1512: `1` |
| AN17-17 | 3 / 3; AN17-17 the page renders @390: `false`; AN17-17 the page renders @414: `false` | 36 / 0; funnel rows @390: `4` |
| AN17-18 | 4 / 3; AN17-18 the page reads a manuscript @1512: `{"ms":null,"sent":-1,"strip":null,"funnel":null}`; AN17-18 switched to another manuscript with queries @1512: `null` | 6 / 0; the page reads a manuscript @1512: `{"ms":"msv12-ms","sent":8,"strip":"8","funnel":"8,3,2,0"}` |

**732 readings across the 18 locks, all passing on the committed build.**

## Each lock's mutation

Each mutation was applied alone in the measurement worktree. The tree was rebuilt (`build:dev`), only that lock was run, and the file was restored from a path-derived backup with its SHA256 checked. Raw records: `mutation-proofs.jsonl`.

| Lock | Mutation | Red? | First failing reading | Restored |
|---|---|---|---|---|
| AN17-1 | paint the page cream | **red** | AN17-1 the page ground is greige (pixel) · 1280 — 245,241,235 | yes |
| AN17-2 | restore the 450px band | **red** | AN17-2 337px tall at 1512 (±2) · 1512 — 450 | yes |
| AN17-3 | change the shared band's padding | **red** | AN17-3 337px tall · 1512 — 349.4375 | yes |
| AN17-4 | set one gap to 48 | **red** | AN17-4 section 2 frame → section 3 40 (±1) · 1280 — 48.0 | yes |
| AN17-5 | colour a comparison line green | **red** | AN17-5 cell 1 has no green or red · 1280 — rgb(46, 139, 61) | yes |
| AN17-6 | paint the banner | **red** | AN17-6 §0 the banner has no background · 1280 — rgb(247, 239, 227) none | yes |
| AN17-7 | make the bars equal width | **red** | AN17-7 bar 2 is to scale (3) · 1280 — w 629.1 expected 235.9 | yes |
| AN17-8 | colour every weekly bar rust | **red** | AN17-8 exactly one rust weekly bar · 1280 — 5 | yes |
| AN17-9 | use anthracite for asked for more | **red** | AN17-9 bar 1 segments take status fills · 1280 — requested:rgb(42, 58, 82) queried:rgb(247, 239, 227) closed:rgb(228, 225, 219) closed:rgb(228, 225, 219) | yes |
| AN17-10 | draw leaders on every row | **red** | AN17-10 no on-time reply has one · 1280 — 1 of 1 on-time rows carry a leader | yes |
| AN17-11 | recreate the ring glyph inline | **red** | AN17-11 first-request renders StatusDot (and nothing else) · 1280 — 0 StatusDot, 1 svg | yes |
| AN17-12 | remove the move handler | **red** | AN17-12 moving to 60% changes the date from Today · 1512 — Today | yes |
| AN17-13 | paint the lanes anthracite | **red** | AN17-13 each line in a status fill · 1280 — rgb(42, 58, 82) | yes |
| AN17-14 | put the caveats in a white frame | **red** | AN17-14 the workspace is blush · 1280 — rgb(255, 255, 255) | yes |
| AN17-15 | anchor the tab to the viewport | **red** | AN17-15 the tab follows the window, not the viewport (±1) · 1512 — -36.0 / -16.0 | yes |
| AN17-16 | render the median wait as 0 days | **red** | AN17-16 gv is not 0 / 0% / a bare dash (last 90 days) · 1512 — "0days" | yes |
| AN17-17 | scale the desktop SVGs down instead | **red** | AN17-17 funnel rows · 390 — 0 | yes |
| AN17-18 | read a fixed manuscript id | **red** | AN17-18 switched to another manuscript with queries · 1512 — null | yes |

### Two locks were green under their mutations on the first pass, and both were the locks' fault
- **AN17-15 (the tab).** The mutation pins the tab 24px from the *viewport*.
  - The lock still read 24.0 / 24.0, because `.ws-window` is flush with the viewport at its right and bottom: "24 from the window" and "24 from the viewport" are the same numbers.
  - The lock now pulls the window in from both edges (`margin-right: 60px; margin-bottom: 40px`, injected and then removed). It asserts that precondition first, then that the tab follows the window.
  - Under the mutation it now reads −36.0 / −16.0.
- **AN17-16 (the thin sample).** Two faults, both in the probe:
  - The mutation only touches the *Last 90 days* state of the median-wait cell, because the one query kept has a reply all-time and none in the last 90 days. The lock read only the all-time state; it now reads both.
  - It compared `textContent`, which glues a value to its unit. The mutated cell rendered `0days`, which no `0 days` pattern matches. The lock now uses `innerText` (falling back to `textContent` for SVG `<text>`), and its zero pattern allows a flush unit.
  - Under the mutation it now reads `"0days"`.
- Both re-ran green on the clean build before their mutations re-ran.

## Locks retuned once the page existed
Phase 0 wrote the locks against a page that did not exist yet. Seven needed correcting once it rendered. Every correction made the lock's probe read its subject; none moved a threshold to pass.
- **AN17-1:** a precondition scroll before sampling the ground pixel.
- **AN17-7:** the drawn floor is the reference's 28 units of 850, scaled to the top bar's width. A bar whose count would draw below the floor is held to the floor (±1); every other bar is held to ±2% of scale. "Proportional (±2%)" alone cannot hold for a None bar drawn at the floor.
- **AN17-11:** StatusDot's signature is `span[role=img] > svg[viewBox="0 0 24 24"][stroke-width="2"]`, per `src/test/statusDotSignature.ts`. The lock's first guess named a class the component does not emit.
- **AN17-14:** the footer-rule check compares column profiles rather than one pixel.
- **AN17-15 and AN17-16:** see the mutation section above.

## What retired
- **`src/components/analytics/`:**
  - `A13Frame.tsx` (FeatureContainer, DotNav, the scroll reveal)
  - `A13Figures.tsx` (the seven v13 figures)
  - `A13Empty.tsx`
  - `a13.css`
- **`src/lib/analyticsModel.ts`:** the `v13` block, i.e. `buildV13` and its types. The prose helpers stay.
- **`src/lib/analyticsModel.test.ts`:** v13's cases.
- **`tests/e2e/`:** `analyticsV13.measure.ts`. Its subject, the feature container, no longer renders.
- **`design-refs/`:** `analytics-v13.html` and its manifest entry.
- **The Birds-eye tab and its B shortcut on this route:** both were portalled to `<body>`, so they drew on every page. Now gated by `QcBirdsDrawer`'s `routeActive`. The drawer stays mounted, so its state survives.

## Colours and tokens

| Reference value | What the page reads | Token |
|---|---|---|
| Chart rust `#b4553f` | **`--o-ms` (#8a4a3c)**, the app's rust (the footer's column heads) | Ref value has none |
| Window blue `#4a5d78` | `--sp-anthracite` at .78 | Ref value has none |
| "Ended" grey `#8a8378` | The ink at .5 | Ref value has none |
| Blush workspace `#f4e0d4` | A literal | None; the Query Centre's own workspace uses the same literal |
| Greige, anthracite, status fills | Existing tokens | Yes |

## The reply chart, and the stated windows
- On the harness account, **2 of the 6 agents** behind "Harbour of Glass" state a response time (`responseTimeWeeks`).
- So the reply window draws **one row**: the one replied query whose agent states a window.
- The figure's note reads "2 of 6 agents state a response time", and the strip's median-wait cell states its population.
- The chart is honest and thin. It will fill as writers record their agents' stated windows. Nothing is guessed from a house default.

## Screenshots
- **Where:** `reports/analytics-v17/shots/`, 81 PNGs taken @2×: `{width}-{state}@2x.png`.
- **Widths:** desktop 1280, 1440, 1512 and 1920; phone 390, 414 and 760.
- **States:**
  - Desktop: one per reference PNG (01 top through 11 section menu) plus the footer.
  - Phone: the same minus the section menu (the tab is absent at ≤760px).
- **The reference pair:** 1512 and 390 compare with `design-refs/analytics-v17/ref-*` and `phone-*` respectively.
- **What differs from the reference, by design:**
  - The app's beta strip sits above the bar.
  - The disc is empty until the art arrives.
  - The data is the harness account's 8 queries rather than the mock's 27.
  - Small samples read as words ("3 of 8", "None") rather than percentages and zeros.
  - The phone keeps the app's own bottom bar; the reference draws a phone section bar, which belongs to the phone-shell session.
- **An earlier set was retaken.** It waited 350ms after each scroll, which photographed the 0.7s scroll reveal mid-fade. The shots now wait 1100ms.

## Not done, and why
- **The three-theme desktop screenshots:** not taken.
  - The theme is a field on the shared harness account's user document (`queriesTheme`), so switching it is a write to a shared fixture.
  - This page reads the greige/anthracite tokens, which are not themed. I did not verify that a theme change leaves them identical.
  - If you want them, it is one `AN17_SHOTS=1` run per theme after setting the field by hand.
- **The older measurement suites that name the route** (§0.7): not re-run.
- **The census runs' by-products:**
  - `reports/living-headers-v3/headline-widths-1280.json` is tracked; the census re-run rewrote it, and it is committed with Phase 9 as that run's record.
  - The thirty untracked `reports/app-shell-v3/ledger-*.json` files the same suites write are left uncommitted in the worktree, as every earlier run of those suites left them.
