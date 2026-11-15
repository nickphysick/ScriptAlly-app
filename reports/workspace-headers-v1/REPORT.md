# Workspace headers v1 — report

Branch `workspace-headers-v1`, cut from the served dev line `dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align`
(tip `04c4fd8d7`). Worktree `../ScriptAlly-wsh1`.

## Pages skipped

**None.** All seven pages have the navy header and the collapsing bar, each in its own commit.

## False premises

1. **Submission packages v43 was not on the served line when this was cut** (dev served `index-Dw4R5Vgb.js`, Query letters
   v2.4 align). The work went on from that line, and H2 covers the Query Centre, Contact list, To-do and Query letters.
   By the finish, dev served the v43 line (`…-ql24-align-pk43`, `index-BMKczFFq.js`), so the dev merge is cut from that.
   There, the merged tree's H2 holds the four pages above, but **v43's header and bar are not in `before.json`**, so H2
   does not cover them. (pk43's own locks ran green at the merge, apart from P5, which was re-pointed; see Finish.)
2. **"The Manuscripts title wraps to at most two lines" cannot hold at the Query Centre's measurements.** At 1280 the
   title column beside the right block is a few hundred pixels wide. A 60-character title at 54px (its size never
   shrinks) takes **10 lines** there (H8: `{len: 60, lines: 10, size: "54px", clipped: false}`). It never clips, and the
   header grows to fit. Two lines would need a smaller face or no right block, and the prompt rules out both.
3. **H5's prescribed mutation (`.wsnh` out of qcv156 §3) cannot turn H5 red.** The wrapper carries `.qc151.qc153` as
   the prompt specifies, and §3's lists already name it. H5b (the bar reverted on these pages) is the break that
   proves H5. Its readings: at rest not hidden, height 68.8, off its sticky line.
4. **The Query Centre's bar ground is its own page colour.** qcv156 §5 retones `--ws-page` to `rgb(246, 243, 238)` on
   the Query Centre only. These pages keep the default `rgb(242, 238, 232)`, like the Contact list's and To-do's bars.
   H5 holds the ground to the default.
5. **"No sideways overflow at 820/1024 on any page" fails on two bodies**, and neither failure is in the header (H8
   names what overflows):
   - Comps: the shelf's view switch `div.cp30-vw` is 192px past the sheet at 1024 and 396px at 820. The base run had
     the same 192/396 before any change.
   - Versions at 820: the tree `div.tr-col` is 141px past. The base run measured another book with no tree (8px); on
     Harbour of Glass the tree is in view.

   Bodies stay as built.

## Step 0 — recon (written before Phase 1)

### 1. The served dev bundle and its branch

- `https://scriptally-dev.web.app/` serves **`assets/index-Dw4R5Vgb.js`**.
- The newest dev branch is `origin/dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align` (Query letters v2.4,
  "the header aligned"). Building that tip with `npm run build:dev` in this worktree produced **`index-Dw4R5Vgb.js`**, the
  served hash exactly, so that branch is the served line.
- **Submission packages v43 (`…-pk43`) is NOT on that line.** `submission-packages-v43` (`14ae27662`) is not an ancestor of
  the served tip; it lives in another session's worktree (`../ScriptAlly-pk43`, uncommitted edits in progress). This
  work carries on from what dev serves, so H2 covers the Query Centre, Contact list, To-do and Query letters only.

### 2. Premises

| | Premise | Finding |
|---|---|---|
| a | The navy header is `shell/OpenHeader` inside a wrapper carrying `qc151 qc153`, dressed by `qcv1534` §2–3 and `qcv156` §1; Query letters (`.qlp-hdw`) and To-do v56 (`WsHeader56`) reuse it without editing it. | **Holds, with one nuance.** Query letters wraps `OpenHeader` in `div.qc151.qc153.qlp-hdw` (QueryLettersPage.tsx:297). To-do v56's wrapper is `div.qc151.tws56-hdw` — **no `qc153`** — and reaches the rules because `qcv156` §1 and `qcv1534` §2–3 name `.tws56-hdw` in their `:is()` lists. Neither edits `OpenHeader`. |
| b | The collapsed bar is `shell/SlimBar` + `shell/slimReveal`, its look in `qcv156.css` §3 behind `:is(…)` lists of page roots. | **Holds.** §3's lists are `:is(.qc151.qc153, .cl27, .tws56) > .qc156-slim` (child combinator: the bar must be a direct child of the listed root) and `:is(.qc151, .cl27, .tws56) .qc156-*`. Query letters mounts no bar. |
| c | Query letters v2.4 put 48px under its header and gave it the header shadow. | **Holds.** queryLetters.css:57: `.qlp .qc151.qc153 > .qc1531-hd.qlp-hd.qlp-hd { margin-bottom: 48px; box-shadow: 0 22px 36px -26px rgba(28, 19, 15, .55); }`, with `min-height: 227px` and the two-column grid at :46. Its drawing is now a real image; the 190 × 142 `ArtSlot` placeholder recipe is commit `e4386a7ba` (queryLetters.css then :44–51), which Phase 1 follows. |

### 3–4. The Query Centre's header and bar, and the built headers

Measured on the rendered page — the served line built for the emulator (`npm run e2e:emu`, the same source as dev; the
harness account), not on scriptally-dev itself: CLAUDE.md keeps measurements off the dev database, and the build is
the served hash's source. Readings: `before.json` (H2's oracle), written by `WSH_RECON=1` in
`tests/e2e/wsHeaders.measure.ts`.

| reading | Query Centre @1440 | @1717 |
|---|---|---|
| header left / right | 112 / 1400 | 112 / 1677 |
| header height | 227.12 | 227.12 |
| radius / ground | 20px / `rgb(42, 58, 82)` | same |
| title left / size | 408 (112 + 268 + 28) / 54px | same |
| button height | 46 | 46 |
| bar at 600px scrolled | shown; 60 tall at the sheet's top + 12; title 24px; button 40, `rgb(42, 58, 82)`; ground from the sheet's left edge to its right | same |
| bar at rest | not shown, `inert`, `aria-hidden` | same |

The Contact list, To-do and Query letters headers measure the same box (112 / 1400 or 1677, 227.11–227.16, 20px, navy,
title at 408, 54px). Differences recorded as they are: the To-do bar sits at the sheet's top + 0 (its own sheet), Query
letters has no bar and its header carries v2.4's 48px and softer shadow, and **the Query Centre retones its own page
colour** (qcv156 §5: its bar's ground is `rgb(246, 243, 238)`), while the Contact list and To-do bars sit on the default
page colour `rgb(242, 238, 232)`. The seven pages do not retone the page colour (that is the Query Centre's page, not
its header), so H5 holds their ground to the default — the Contact list's and To-do's — and reports the difference.

### 5. The seven pages

Every page is rendered by `StagePage` → `WorkspacePageGrid masthead={null}` → `div.wpg-scroll` (the page scroller, which
`slimReveal` and `SlimBar` read with `closest(".wpg-scroll")`), and its root is the scroller's direct child, so it takes
the shared column rule `.wpg-scroll > *` (workspacePageGrid.css:489–548: `max-width: var(--work-max)` 1660,
`padding-inline: var(--work-gutter)` 32, `margin-inline: auto`). The Query Centre's own root is the same column, so the
navy header placed as the root's first child sits on the Query Centre header's edges by construction. The
`StagePage` layouts differ (`fill`, `fillColumn`, `clip`), but in every case the scroller is `.wpg-scroll` inside the
page grid, so `slimReveal` reads it as it does on To-do.

**Responses** (`/queries/responses`)
- Route: App.tsx:726 (`StagePage name="responses" layout="fill" clip`) → `ResponsesRoute` (phone/pages/PageRoutes.tsx:29;
  `ResponsesPhone` on a phone) → `responses/ResponsesPage.tsx`. Root `div.rsp-page` (the column) → `div.rsp.rsp5[data-rsp="page"]`.
- Header today: `Rsp5TitleCard` (responses/Rsp5Head.tsx) via `shared/PageHeaderCard` — `section.phc.rsp5-card[data-rsp5="title-card"]`.
  Also rendered by `RspEmpty` for the empty state.
- Figures: "heard back from" = `pageCounts(items, rows).replies` (lib/responses.ts:414, `more + passed`; the glance line
  `[data-rsp5="glance-line"]`); asked for more = `.more` (same); waiting on you = `items.filter(i => i.yourMove).length`
  (ResponsesPage.tsx:70, the glance card's "your move"). "Agents who want to read on" = `[data-rsp5-sec="more"]`,
  reached by `goSection("more")` (a computed scroll on `.wpg-scroll`). All exist.
- Column: header and first section (`[data-rsp5="glance-wrap"]`) both on `.rsp-page`'s content box.
- States: loading → title card with disabled buttons and skeleton glance; empty (`answered === 0`) → `RspEmpty` with its
  own title card ("Nothing back from agents on…", "Open the Query Centre"); early (<5 answers) changes only body bands.
- Locks reading it: tests/e2e/rs5.measure.ts A1 (title card vs ref), A2 (glance clicks land 20px under the scroller top),
  G2 (`[data-rsp5="record"]`); pageWidth.measure.ts:33; src/test/pageWidth.test.ts:66 (`rsp-page` root rule);
  workspaceWidth.measure.ts; hr1.measure.ts:66 (stale v2 selectors, already matching nothing). responsesPageSmoke.test.tsx
  reads body strings only.

**Analytics** (`/queries/analytics`)
- Route: App.tsx:718 (`layout="fill" clip`) → `AnalyticsRoute` (PageRoutes.tsx:36) → `QueryAnalytics.tsx`. Root
  `div.a17-page[data-a17="page"]` (the column), inside `div.qa-wrap` → `.qa-wpg`.
- Header today: `A21Header` (analytics/A21Header.tsx) — `header.a21-lh.phf[data-a21="header"]` with `A21Card` (the
  four-row legend `[data-a21="counts"]` and the ring `[data-a21="ring-panel"]`). Desktop only; the phone width (≤760)
  mounts v17's `PageHeader` band instead.
- Figures: `headTitle(model.sent, v24.tally.all)`; ring `ringOf(v24.keeping)` → `{inside, dated, pct}` (lib/analyticsV24.ts:402).
- Column: **the header breaks out of the column** (a21.css:20–24, `width: var(--hero-w)` centred on the sheet); the first
  body section (`.a21-desk`, the three stat cards) is on the column.
- States: loading → header with blank figures; no manuscript → no header, a blank paragraph; empty (no queries) →
  `A21Empty` with its own navy panel and h1 "Every reply, counted" and two buttons.
- Locks: analyticsPageSmoke.test.tsx (light header, eyebrow, the shadow image); analyticsV21/V24/V17.measure.ts (card,
  rows, ring probes); hr1.measure.ts:65,80–81; hr1Shots; hp2Lib.ts:30; plateRoutes; headerV3; pageWidth.measure.ts:34;
  workspaceWidth.measure.ts (a KNOWN exemption for this header's breakout).

**Discover** (`/agents/discover`)
- Route: App.tsx:743 (`layout="fillColumn"`) inside `<MaterialsLock page="scout">` → `DiscoverRoute` → `discover1/DiscoverPage.tsx`.
  Root `div.dv1-page[data-dv1="page"][data-face]`.
- **Two faces.** `DISCOVER_LIVE` is `false` (lib/discoverShared.ts:28), so production shows the **coming-soon** face
  (`DvEmptyHeader`, a navy panel with its own lede paragraph, wrapping the steps and the catalogue). The live face
  (dev aid `__SA_DV_STATE`) has `DvHeader` — `header.dv1-hd.phf[data-dv1="header"]` with `DvSummaryCard` (three-row
  legend + "Picks reviewed" ring) and the "How the Scout finds agents" link.
- Figures: `scoutTally` (lib/scout.ts:212) → `decided`, `total`, `pct`; title from `s.queue.length` via `considerWords`.
- Column: the live header breaks out (discover1.css:68–71, `--hero-w`); the body sections are on the column.
- States: loading (blank title, disabled buttons), none ("Nothing to consider yet"), done ("You're up to date").
- Pro gate: `MaterialsLock page="scout"` — on Free the page renders inert under the lock card. **The harness account is
  Free**, so the locks measure Discover under its lock, as built.
- Locks: discoverCopy.test.tsx (reads DvHeader.tsx as copy); agentsPageSmoke.test.tsx; workspacePageGrid.test.tsx (chain
  locks on `.dv1-page`); discoverV1.measure.ts B1/B2/C4/C5/D1/E2/AE; dv1Lib.ts; hr1/hr1Shots; pageWidth; many matrix
  specs by grid class.

**Comparable titles** (`/manuscripts/comps`)
- Route: App.tsx:755 (`layout="fill"`) inside `<MaterialsLock page="comps">` → `manuscripts/ComparableTitlesPage.tsx`.
  Root `div.cpv-page.cp30[data-cp="page"]`.
- Header today: `CompsTop30` (comps30/CompsTop30.tsx) — `section.cp30-top[data-cp="top"]`, with a lead paragraph, a disc
  image and `HighlightBlock` (`[data-cp="hl"]`).
- Figures: count = `comps.length` (the shelf's `[data-cp="shelf-count"]` counts `rows.length`, the same list); leader =
  `highlightOf(rows)` (lib/compsShelf.ts:180) → `{title, pct, asked, queries, key}` once a comp has ≥5 queries.
  **Today's "ring" is a disc image with a % badge**, not an SVG ring; the figure (`pct`) exists.
- Column: header and first section share the column (no side margins).
- States: loading (skeleton line, invisible buttons, bare disc), nobook, empty ("+ Add your first comp", "What makes a
  good comp?"), listed + soon/none early blocks.
- Pro gate: `MaterialsLock page="comps"` — Free renders it read-only and inert (the harness).
- Locks: materialsPageSmoke.test.tsx:182–187; compsShelf.test.ts (leadLine/highlightOf, lib only); cp30.measure.ts H1–H3;
  cp30Lib/cp30Mutate/cp30Shots; compsV26/V25 (click `[data-cp="add"]`/`"pick"`); pageWidth.

**Versions** (`/manuscripts/versions`)
- Route: App.tsx:776 (shared manuscripts slot, `layout="fill"`) → `versions/VersionsV2Page.tsx`. Root `div.vv2[data-vv2="page"]` → `div.ms25`.
- Header today: `shared/PageHeaderCard` with `classPrefix="hb"` — `section.phc.hb[data-vv2="title"]` ("Versions" + Pro tag,
  a paragraph, two buttons, the Archivist image). `PageHeaderCard` is shared (Query Centre v149, Contact list v24,
  Responses), so it stays.
- Figures: live count `m.live.length` (V2List's heading `#vCnt`, "<n> versions saved"); in use `m.inUse`
  (lib/versionsV2.ts:99); queries sent `m.facts.get(id).n`; last day `msDay(f.lastMs)` (V2List:83). All exist.
- Column: the header is inset 24px more each side (`.vv2 .hb { margin: 24px 24px 0 }`); the banner `.wb` is flush; the list
  panel `#secTiles` is inset 24px (`margin: 28px 24px 0`).
- States: loading (same card), locked (Free: primary disabled, lock card, body inert and blurred — the harness), fresh
  (no versions), pre.
- Locks: versionsPageSmoke.test.tsx:54–63 (title card, its paragraph, "3 versions saved"); versionsV2.measure.ts S01
  (#vCnt, #hbT type), T1 (card), T2 (#msRH in the list), T6 (guide target); qc149L0/qc149 (lock the shared card against
  Versions' — not the header this page will have); pageWidth.measure.ts:37; workspaceWidth.

**Manuscripts** (`/manuscripts`)
- Route: App.tsx:784 → `ManuscriptRoute` (PageRoutes.tsx:33; `ManuscriptPhone` on a phone) → `manuscripts/v12/ManuscriptPage.tsx`.
  Root `div.msv12-root.ms21(.ms27.ms28-fill)[data-msv12="page"]`, a flex column when filled.
- Header today: `V27Hero` inside `BookContainer` (v27/Msv27Parts.tsx) — `header.ms27-mh[data-ms27="header"]` inside the
  white book card `section.ms27-bkx[data-ms27="book"]`, with the facts card button `[data-ms27="card"]` on the right and
  the logline strip under it. `V27Hero` is also imported by the unrouted `v27/VersionsPage.tsx`, so it stays.
- Figures: `ms.title`; author = `currentUser.name` (there is no author field on a manuscript); `cardRows(ms, since)`
  (lib/manuscriptV27.ts:55) → genre, age, status, since; words `wordsText(wordsOf(ms))`. All exist.
- Column: the book card spans the column.
- States: loading → an empty root (no header); no book → `MsOpenHeader` ("Let's add your book" / "Add your book again",
  a sub line, "+ Add your manuscript").
- Locks: msv27Smoke.test.tsx (eyebrow, the exact h1, byline), msv28Smoke (`.ms27-bkp` children), msv21Smoke (the empty
  header); manuscriptsV27/V28/V281.measure.ts and their shot specs; pageWidth; workspaceWidth; many matrix specs.

**Corkboard** (`/todo/corkboard`)
- Route: App.tsx:751 (`layout="fillColumn" clip`) → `NoteboardRoute` → `todo/TodoNoteboardPage.tsx`. Root
  `div.nb-group.cb2-page[data-cb2="page"]`.
- Header today: `CbHeader` (todo/corkboard/CbHeader.tsx) — `header.cb2-hd` → `div.cb2-panel[data-cb2="panel"]`: "Corkboard",
  the sentence, + New note, Add a task, the art ring, then At a glance or Pick a colour.
- Figures: `board.length` (TodoNoteboardPage.tsx:508); swatches `NOTE_PAPERS` → `onNew(colour)`.
- **The route renders on a phone too** (there is no phone redirect for `/todo/corkboard`, and corkboard.css has ≤767px
  rules), so the phone keeps `CbHeader`; the navy header is mounted at 768px and up.
- States: loading (`count=null`), empty (no Add a task; "Pick a colour to start"), few notes (Pick a colour instead of
  At a glance).
- Locks: corkboardV2Page.test.tsx; noteboardChrome.test.tsx (one `<CbHeader`, the `count=` literal); tasksLayout.test.tsx;
  artSlots.test.tsx (`corkboard-header` registered, unmounted); pageWidth.test.ts (`.cb2-page`); corkboardV2.measure.ts
  CB2 (panel vs the Contact list's old panel); cb2Lib/cb2Mutate/corkboardV2Shots; pageWidth.measure.ts:41.

## Baseline vs final

Baseline (the served line, before any edit):

- `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit` — exit 0, 0 errors. (The default heap ran out of memory; the
  first try also had 7 TS2307 errors in `functions/` because the worktree had no `functions/node_modules`; linking the
  primary's cleared them.)
- `npm run build:dev` — exit 0; `✓ 4037 modules transformed.`, `✓ built in 18.67s`; no error or warning lines; bundle
  `index-Dw4R5Vgb.js` (= served).
- `npx vitest run` — exit 1:
  - ` Test Files  2 failed | 867 passed | 1 skipped (870)`
  - `      Tests  3 failed | 12543 passed | 4 skipped (12550)`
  - the three reds are pre-existing guard scanners on the dev line: emuGuard.test.ts (`tests/e2e/cb21Emu.sh` starts an
    emulator without the guard) and firestoreTarget.test.ts ×2 (28 `tests/e2e/cl25*Data.mjs`-style files).

Final (the branch tip `848d14490`):

- `tsc --noEmit` — exit 0, 0 errors.
- `npm run build:dev` — exit 0. Output: `✓ 4039 modules transformed.`, `✓ built in 12.22s`,
  `✓ build target OK: bundle targets scriptally-dev (dev); gen-lang-client-0801391782 absent.` No error or warning
  lines.
- `npx vitest run` — exit 1, no worse than baseline (the same three guard-scanner reds):
  - ` Test Files  2 failed | 868 passed | 1 skipped (871)`
  - `      Tests  3 failed | 12553 passed | 4 skipped (12560)`

## Commits

| phase | commit | files |
|---|---|---|
| 1 · the shared navy header | `a511cf0b6` | design-refs/.refhashes.json; design-refs/workspace-headers-v1/ (html + 28 PNGs + SHA256SUMS); src/components/shell/WorkspaceNavyHeader.tsx, wsnh.css, workspaceNavyHeader.test.tsx; queries/centre/qcv156.css, qcv156.test.ts; agents/contact/contactQcLayout.test.tsx; todo/ws/wsHeader56.test.tsx, wsSlim56.test.tsx; todo/ArtSlot.tsx, artSlots.test.tsx; tests/e2e/wsHeaders.measure.ts; reports/workspace-headers-v1/REPORT.md, before.json, readings/red-first.json |
| 2 · Responses | `67473a82d` | responses/ResponsesPage.tsx, Rsp5Head.tsx, RspEmpty.tsx, responses5.css; tests/e2e/rs5.measure.ts |
| 3 · Analytics | `f7e49c6df` | QueryAnalytics.tsx; analytics/A21Header.tsx, A21Empty.tsx, a21.css, analyticsPageSmoke.test.tsx; tests/e2e/analyticsV17/V21/V24.measure.ts, hp2Lib.ts, hr1.measure.ts, hr1Shots.measure.ts |
| 4 · Discover | `2f2e42778` | agents/discover1/DvHeader.tsx, DiscoverPage.tsx, discover1.css; tests/e2e/discoverV1.measure.ts, dv1Lib.ts |
| 5 · Comparable titles | `a42f7df7a` | manuscripts/comps30/CompsTop30.tsx, CompsShelf30.tsx, comps30.css; manuscripts/ComparableTitlesPage.tsx; materialsPageSmoke.test.tsx; tests/e2e/cp30.measure.ts, cp30Lib.ts, cp30Mutate.mjs, cp30Shots.measure.ts |
| 6 · Versions | `49c1dd037` | versions/VersionsV2Page.tsx, V2List.tsx, versionsV2.app.css, versionsPageSmoke.test.tsx; tests/e2e/versionsV2.measure.ts, qc149.measure.ts, qc149L0.measure.ts |
| 7 · Manuscripts | `1fc98305d` | manuscripts/v27/Msv27Parts.tsx, msv27.css, msv27Smoke.test.tsx; manuscripts/v12/ManuscriptPage.tsx, Msv21Parts.tsx, msv21Smoke.test.tsx; tests/e2e/manuscriptsV21/V27/V281.measure.ts |
| 8 · Corkboard | `634d7e84f` | todo/corkboard/CbHeader.tsx, corkboard.css; todo/TodoNoteboardPage.tsx, corkboardV2Page.test.tsx, artSlots.test.tsx, noteboardChrome.test.tsx, todoPageSmoke.test.tsx; tests/e2e/corkboardV2.measure.ts, corkboardV2Shots.measure.ts, cb2Mutate.mjs, pageWidth.measure.ts |

## Per page

The drawing, on every page: **one file — `src/components/todo/ArtSlot.tsx`** — give the page's brief (`<page>-header`;
the Corkboard's `corkboard-header`) its `src`. The box (190 × 142) is the shared header's and nothing else moves.

| page | old header | deleted? | goes | stays / notes |
|---|---|---|---|---|
| Responses | `Rsp5TitleCard` (via shared `PageHeaderCard`) | **yes** (+ `RSP5_HAWK`, the `.rsp5-card` rules); `PageHeaderCard` stays (shared) | the card's paragraph | glance cards and See them land 20 clear of the bar |
| Analytics | `A21Header` + `A21Card` + `InsideRing`, and `A21Empty`'s navy panel | **yes** (+ the light header's and panel's rules, `AN_EYEBROW`, `AN_SHADOW`, `AN_EMPTY_ART`); `headTitle`, `usePhone` stay | the four-row legend; the eyebrow and shadow; the empty panel's paragraph and drawing | phone width keeps v17's band |
| Discover | `DvHeader` + `DvSummaryCard` + `ReviewRing` (live face) | **yes** (+ rules); `DvEmptyHeader` stays — the coming-soon face | the three-row legend; the eyebrow and PRO tag on the live face | coming-soon face unchanged |
| Comparable titles | `CompsTop30`'s card (disc, lead, highlight blocks) | **replaced in place** (same export, new body) + rules, `COMPS_HEADER_ART` | the paragraph; the early "Too soon" / "Nothing sent" blocks | "How comp tracking works" now on the shelf's heading row; "Compare your letters" kept beside Open |
| Versions | `PageHeaderCard classPrefix="hb"` | `.vv2 .hb` rule deleted; `PageHeaderCard` stays (shared) | the Pro tag and paragraph (the navy header has no slot for either); "<n> versions saved" → "Your versions" | |
| Manuscripts | `V27Hero` in `BookContainer`; `MsOpenHeader` (no book) | `MsOpenHeader` **yes**; `V27Hero` **kept** — the unrouted `v27/VersionsPage.tsx` imports it | the eyebrow; the details-card button (its facts are the right block); the empty state's sub line | the logline strip and everything under it |
| Corkboard | `CbHeader` | **kept for the phone** (the route renders below 768px; no phone redirect); desktop mounts `CbNavyHeader` | on the desktop: the title "Corkboard", the sentence's to-do half, the art ring, At a glance | find bar, tags, Corkboard/Piles, notes |

## H10 — tests from Step 0's lists

Unit tests (src/):
- RE-POINTED: qcv156.test.ts (§1 selector + `.wsnh`), contactQcLayout.test.tsx, wsHeader56.test.tsx, wsSlim56.test.tsx
  (the lists also name `.wsnh`); artSlots.test.tsx (census + the Corkboard's slot through the shared header);
  analyticsPageSmoke.test.tsx ("v21 §A" → the navy header: headline, buttons, ring, no legend); materialsPageSmoke.test.tsx
  (the comps header, its count, no lead, How on the shelf); versionsPageSmoke.test.tsx (the header, "Your versions");
  msv27Smoke.test.tsx (the header case); msv21Smoke.test.tsx (the empty header); corkboardV2Page.test.tsx (desktop
  header; the glance / pick / ring / empty-sentence cases moved to a phone render); noteboardChrome.test.tsx (the count
  is the headline); todoPageSmoke.test.tsx (the empty board's headline).
- KEPT: responsesPageSmoke, discoverCopy, agentsPageSmoke, workspacePageGrid, pageWidth.test, pageStructure,
  tasksLayout, compsShelf.test, lib tests.

e2e (tests/e2e/), each with a `RE-POINTED` / `RETIRED (…) Successor: wsHeaders …` comment in the file:

| file | test | verdict |
|---|---|---|
| rs5 | A1 title card | RETIRED — the title card vs the v5 ref; successor H1/H3–H9 "responses" |
| rs5 | A2 glance | RE-POINTED — sections land at 92 (20 under the 12 + 60 bar), not 20 |
| analyticsV17 | AN17-16 thin sample | RE-POINTED — `card-n` dropped from the figure set |
| analyticsV21 | AN21-A1 header, AN21-A2 card | RETIRED — v21's light header and its legend; successor H1/H6/H7 "analytics" |
| analyticsV24 | AN24-A3 ring | RE-POINTED to the header's ring (the "press scrolls to S4" half retired: the ring is not a button) |
| analyticsV24 | AN24-I1 empty, AN24-R1 replies | RE-POINTED (I1's Archivist half retired, successor H9) |
| hp2Lib | LIGHT_HEADER_SEL | RE-POINTED to `[data-wsnh-page="analytics"]` (feeds headerV3, headerPanelV2) |
| hr1 | HR1-1…7 | RETIRED — the v1.1 hero is no longer on any page it lists; successor H1/H3/H4 |
| hr1Shots | analytics, discover entries | RETIRED (commented out) |
| discoverV1 | B1 ×2, B1 loading ×2 | RETIRED — the light header vs its mock; successor H1/H7 "discover" |
| discoverV1 | C5 passed list | RETIRED — its opener was the legend row. **Coverage gap**: the passed modal and Bring back have no rendered lock until a done-view fixture exists |
| discoverV1 | B2, C2, E2 | RE-POINTED to the header's ring, sub-line and title figure |
| dv1Lib | readiness, B2 break | RE-POINTED (`[data-dv1="picks"]`; the wsnh ring) — B1 break retired |
| cp30 | H1 card edges, H3 lead | RETIRED — successor H3 / H6 "comps" |
| cp30 | H2, H2-early, L2, E1 | RE-POINTED (ring-pct; "too soon" is no right block) |
| cp30Lib / cp30Mutate / cp30Shots | readiness / H2 breaks / scroll target | RE-POINTED (H1, H3 breaks retired) |
| versionsV2 | S01, T1, T6 | RE-POINTED (count from the headline; 54px face; the header's words and buttons; the guide's target) |
| qc149 | L1 | RETIRED — held the Query Centre's v149 card to Versions' card, which is gone |
| qc149L0 | QC149-L0 ×2 | RETIRED — same reason |
| manuscriptsV27 | A2 header; B1's card opener; CSS_MUT a2/a3 | RETIRED — successor H1/H3/H7 "manuscripts" |
| manuscriptsV27 | A3 card | RE-POINTED to the header's right block |
| manuscriptsV281 | A1 | RE-POINTED to the header's Edit / View summary |
| manuscriptsV21 | readiness, E1, E2 | RE-POINTED (the sub-line halves retired, successor H9) |
| corkboardV2 | CB2 header | RETIRED — the old panel held to the Contact list's; successor H1/H6/H7 "corkboard" |
| corkboardV2 | CB3 glance filter | RE-POINTED — runs on the phone (390), where the glance rows still are |
| corkboardV2 | CB11 empty | RE-POINTED — "No notes yet", one + New note, no add-task |
| corkboardV2Shots | board shots / linked-filter shot 08 | RE-POINTED / RETIRED (no glance rows on the desktop) |
| cb2Mutate | CB2 break | RETIRED (skipped with a log line) |
| pageWidth.measure | the corkboard row | RE-POINTED `.cb2-hd` → `.cb2 .wsnh` |
| cb2Lib, manuscriptsV28, ms27/28/281Shots, qc135Lib, workspaceWidth, plateRoutes, headerV3 | — | KEPT (no removed probe; workspaceWidth reads `[data-page-title]` / `[data-own-header]`, which the header carries) |

The new ledger floors in re-pointed specs (AN24-A3 8, CB3 3, MSV27 63, CP30 > 60) were set by hand and have not been
run here: those specs are not this prompt's locks and were not run (one heavy job at a time; see below).

## Locks — red, green and red under the break

Runs, all `npm run e2e:emu -- tests/e2e/wsHeaders.measure.ts --project=measure --workers=1`, at 1440 × 900 and 1717 × 1000:
- **red first**: the served line, unchanged (`WSH_RECON=1`; readings/red-first.json).
- **green**: three runs on the branch (two fixes in between).
- **red again**: `WSH_MUTATE=all` (every lock applies its own break) and `WSH_MUTATE=H5b`.
- **the merged dev line**: the same suite, which gave the same result as the branch.

| lock | red first (served line) | green (branch tip and merged line) | under its break |
|---|---|---|---|
| H1 header = the Query Centre's | red on all 7 (no shared header) | **green on all 7 at 1717 and on 6 at 1440**. Analytics @1440: height 250.6 vs 227.1, because "14 queries, 10 replies" wraps beside the ring (585px column). | red on all 7 ×2 (radius, height) |
| H2 the built headers and bars = before.json | (wrote before.json) | **green** @1440 and @1717, on the branch and on the merged line | red (header bg on all four) |
| H3 first section on the header's edges | red on all 7 | **green on all 7** | red on all 7 ×2 |
| H4 48 under the header | red on all 7 | **green on all 7** | red on all 7 ×2 |
| H5 the bar | red on all 7 (no bar) | **green on all 7**: 60 tall at top 12, title 24px, button 40 navy, ground edge to edge; at rest hidden, inert, aria-hidden. A measurement-only spacer was added where a page has under 620px to scroll. | `all`: not red (false premise 3); **H5b: red** (Responses, Corkboard ×2) |
| H6 headline and its figure | red on all 7 | **green** (Responses 10 = the glance line, Comps 7 = the shelf, Versions 3 = the rows, Corkboard 8 = the notes on the board; each population non-zero) | red (off by one) on the 4 with a body figure |
| H7 one h1; old header and dropped pieces gone | red on all 7 | **green on all 7** | — (no break prescribed) |
| H8 overflow / title fits / long title | red on Responses, Comps, Versions, Manuscripts; green on Analytics, Discover, Corkboard | **green on 4** (Responses, Analytics, Discover, Corkboard). Red: Comps 1024/820 and Versions 820 (bodies, false premise 5); Manuscripts' 60-character title (false premise 2) | — |
| H9 empty state | red on 5 reachable pages | **green on 5** (Responses, Analytics, Comps, Versions, Corkboard); Discover and Manuscripts skipped (no empty state on the harness account) | — |
| H10 | see "H10" above | | |

## Where a built page differs from the ref, and why

- **Measurements are the built Query Centre's**: the 268 art column, 54px Special Elite, 46px buttons, 20px radius and
  227 height. The ref's are 240–300 columns, a 24px radius and 45px buttons; the prompt names the built header as the
  oracle.
- **The right column is `auto`, at most 440** (the ref's `.cb`), not the Query Centre's 400–560 "this week" track. With
  that track, the buttons wrapped and the headlines ran under it (fix `8caf65ffe`).
- **Headlines wrap at the same size** rather than overflow. Only Analytics at 1440 actually wraps.
- **Drawings are `ArtSlot` placeholders**, where the ref shows cut-outs.
- **Responses**: the lead word is singular at 1 ("agent"). The glance cards and See them land 20px clear of the bar.
- **Analytics**: the ring is no longer a button. Before, it scrolled to "Do agents reply when they say they will?".
  - Day one: "No queries yet" (the old panel's "Every reply, counted" is a slogan, not the empty wording) with that
    state's two buttons.
  - No book: "No manuscript yet".
- **Discover**:
  - The coming-soon face, which is what production shows today, keeps its navy panel, because its lede is not a
    listed "Goes".
  - With nothing to consider there is no right block, so "How the Scout finds agents" is not in the header in that
    state.
  - The "Not for you" legend row was the header's door to the passed list. The picks' "look again" still opens it, and
    no rendered lock covers it now.
- **Comparable titles**: "Compare your letters" stays beside Open; the ref draws Open alone, and the link was not a
  listed "Goes".
  - No book: "No manuscript yet". Empty: "No comps yet".
- **Versions**: the Pro tag and the paragraph went with the card, because the navy header has no slot for either.
  - Versions' generated sheet resets every element with `all: revert`; the shared header is now exempt from that, in
    the generator and in the sheet (fix `80480966a`).
- **Manuscripts**: the eyebrow and the details-card button went (its facts are the right block). Status in the facts
  line is lower-cased after the age ("Adult · querying since 1 Mar 2026"), as the ref writes it. The no-book state's
  sub line is no longer drawn.
- **Corkboard**:
  - On the desktop the At a glance rows (linked / dated / pinned filters) are not drawn, because the ref's right block
    is Pick a colour. They are not a listed "Goes", so **this needs Nick's ruling**.
  - The phone keeps the whole old panel.
  - The day-one header has no swatches (the prompt's no-right-block rule); the body's empty state and + New note stay.

## Finish

- Branch `workspace-headers-v1` pushed (tip `848d14490`, plus this report's commit).
- Dev, read immediately before the merge: it served **`index-BMKczFFq.js`**. That is the Submission packages v43 line,
  `dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align-pk43` (its report names the hash), so the dev line had
  moved on since Step 0.
- New branch **`dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align-pk43-wsh1`**, cut from that line. The merge
  is `7bd0bd743`.
  - Conflicts: `qcv156.css` §3 (both branches added a class to the same lists; both kept, as `.pk43, .wsnh`),
    `wsSlim56.test.tsx` and `.refhashes.json`, all resolved by keeping both sides.
  - Re-pointed at the merge: `pk43.test.ts` P5 and the shared header's sheet test, which now allow `.pk43` beside
    `.wsnh`.
  - The merged tree: tsc 0; every spec under shell, queries/centre, todo, agents/contact, packages and the seven pages
    green (167 files); the lock suite gave the same result as the branch (H2 green).
- Deployed **once** to dev from a clean checkout of the pushed tip (in the scratchpad):
  `npm run build:dev && firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`.
  - Before: `index-BMKczFFq.js`. Built: `index-B4FacP2i.js`. **Served after: `index-B4FacP2i.js`.**
- Not merged to main. Prod is untouched.

## Screenshots (dev, after the deploy) beside the ref

Shot on scriptally-dev with the harness account (read-only) by `tests/e2e/wsHeadersShots.measure.ts`. Manuscripts and the
Corkboard have under 600px to scroll on that account, so their "600px" shots show the page at its foot, with the
header still in view and the bar not yet shown. The bar on those pages is proved by H5 (with its measurement spacer).

The Query Centre's header, before (`index-BMKczFFq.js`) and after (`index-B4FacP2i.js`). The two PNGs are
byte-identical at both sizes:

| | before | after |
|---|---|---|
| 1440 | ![](shots/before/queries-header-1440.png) | ![](shots/dev/queries-header-1440.png) |
| 1717 | ![](shots/before/queries-header-1717.png) | ![](shots/dev/queries-header-1717.png) |

| page | dev at rest | dev at 600px | ref at rest | ref collapsed |
|---|---|---|---|---|
| responses @1440 | ![](shots/dev/responses-rest-1440.png) | ![](shots/dev/responses-collapsed-1440.png) | ![](../../design-refs/workspace-headers-v1/responses-rest-1440.png) | ![](../../design-refs/workspace-headers-v1/responses-collapsed-1440.png) |
| responses @1717 | ![](shots/dev/responses-rest-1717.png) | ![](shots/dev/responses-collapsed-1717.png) | ![](../../design-refs/workspace-headers-v1/responses-rest-1717.png) | ![](../../design-refs/workspace-headers-v1/responses-collapsed-1717.png) |
| analytics @1440 | ![](shots/dev/analytics-rest-1440.png) | ![](shots/dev/analytics-collapsed-1440.png) | ![](../../design-refs/workspace-headers-v1/analytics-rest-1440.png) | ![](../../design-refs/workspace-headers-v1/analytics-collapsed-1440.png) |
| analytics @1717 | ![](shots/dev/analytics-rest-1717.png) | ![](shots/dev/analytics-collapsed-1717.png) | ![](../../design-refs/workspace-headers-v1/analytics-rest-1717.png) | ![](../../design-refs/workspace-headers-v1/analytics-collapsed-1717.png) |
| discover @1440 | ![](shots/dev/discover-rest-1440.png) | ![](shots/dev/discover-collapsed-1440.png) | ![](../../design-refs/workspace-headers-v1/discover-rest-1440.png) | ![](../../design-refs/workspace-headers-v1/discover-collapsed-1440.png) |
| discover @1717 | ![](shots/dev/discover-rest-1717.png) | ![](shots/dev/discover-collapsed-1717.png) | ![](../../design-refs/workspace-headers-v1/discover-rest-1717.png) | ![](../../design-refs/workspace-headers-v1/discover-collapsed-1717.png) |
| comps @1440 | ![](shots/dev/comps-rest-1440.png) | ![](shots/dev/comps-collapsed-1440.png) | ![](../../design-refs/workspace-headers-v1/comps-rest-1440.png) | ![](../../design-refs/workspace-headers-v1/comps-collapsed-1440.png) |
| comps @1717 | ![](shots/dev/comps-rest-1717.png) | ![](shots/dev/comps-collapsed-1717.png) | ![](../../design-refs/workspace-headers-v1/comps-rest-1717.png) | ![](../../design-refs/workspace-headers-v1/comps-collapsed-1717.png) |
| versions @1440 | ![](shots/dev/versions-rest-1440.png) | ![](shots/dev/versions-collapsed-1440.png) | ![](../../design-refs/workspace-headers-v1/versions-rest-1440.png) | ![](../../design-refs/workspace-headers-v1/versions-collapsed-1440.png) |
| versions @1717 | ![](shots/dev/versions-rest-1717.png) | ![](shots/dev/versions-collapsed-1717.png) | ![](../../design-refs/workspace-headers-v1/versions-rest-1717.png) | ![](../../design-refs/workspace-headers-v1/versions-collapsed-1717.png) |
| manuscripts @1440 | ![](shots/dev/manuscripts-rest-1440.png) | ![](shots/dev/manuscripts-collapsed-1440.png) | ![](../../design-refs/workspace-headers-v1/manuscripts-rest-1440.png) | ![](../../design-refs/workspace-headers-v1/manuscripts-collapsed-1440.png) |
| manuscripts @1717 | ![](shots/dev/manuscripts-rest-1717.png) | ![](shots/dev/manuscripts-collapsed-1717.png) | ![](../../design-refs/workspace-headers-v1/manuscripts-rest-1717.png) | ![](../../design-refs/workspace-headers-v1/manuscripts-collapsed-1717.png) |
| corkboard @1440 | ![](shots/dev/corkboard-rest-1440.png) | ![](shots/dev/corkboard-collapsed-1440.png) | ![](../../design-refs/workspace-headers-v1/corkboard-rest-1440.png) | ![](../../design-refs/workspace-headers-v1/corkboard-collapsed-1440.png) |
| corkboard @1717 | ![](shots/dev/corkboard-rest-1717.png) | ![](shots/dev/corkboard-collapsed-1717.png) | ![](../../design-refs/workspace-headers-v1/corkboard-rest-1717.png) | ![](../../design-refs/workspace-headers-v1/corkboard-collapsed-1717.png) |
