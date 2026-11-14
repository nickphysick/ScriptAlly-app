# Workspace headers v1 — report

Branch `workspace-headers-v1`, cut from the served dev line `dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align`
(tip `04c4fd8d7`). Worktree `../ScriptAlly-wsh1`.

## Pages skipped

_(filled at the end)_

## False premises

_(filled at the end)_

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

Final: _(filled at the end)_
