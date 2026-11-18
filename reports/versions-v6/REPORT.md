# Versions v6 — report (17–18 Nov 2026)

Branch `versions-v6` (pushed, tip after this report's commit), cut from `status-marks-v3 @ e08d528d5`. Dev serves
`dev/smv31-vv6` @ `247a370d4` = `status-marks-v3 @ b0f67efa2` (v3.1) + `versions-v6 @ 6236112f0`, bundle
**`index-BgE3I6c-.js`** (hash checked on the live site after the deploy). **Nothing went to `main` or prod.**

## FALSE PREMISES

1. **"Stage glyphs (`StageGlyph.tsx`)" on the query rows.** CLAUDE.md makes StatusDot the only thing that draws a
   query's status, StageGlyph's own header says the same, and SM3-8 (`statusMarksV3Sources.test.ts`) pins StageGlyph's
   importers to four unrendered files — a fifth importer turns it red. The rows draw **StatusDot in ink on the stage
   band colour**. O3 asserts the band per stage and that different stages draw differently.
2. **"The framed card (`containers/FramedCard.tsx`) and the Dashboard's card bands (navy, sand, stone)".** FramedCard
   is not the Dashboard's card: its frame is rust (`#7c3a2a`), it has no sand tone, and nothing in
   `src/components/dashboard` uses it (only the Query Centre's open card). The Dashboard's card is
   `dashboard/v2/Frame.tsx` (page-local, CSS scoped to `.d58.d2`). Built as a page-local copy with its values.
3. **"The founding writer band (the Dashboard's) … and its feedback button".** The Dashboard's founding band
   (`Dash2Founding`) is the founding-programme card; it has Like / Don't like / Idea pills, no "Tell us what you think".
   That button and the one-line strip are Submission packages' `Pk41Banner`. Built as Dash2Founding's shell (white rim,
   the −45° stripe) holding Pk41Banner's content; the button opens the FeedbackDock as Packages' does. Shown to
   founding writers only: its copy ("You have full access as a founding writer") is false for anyone else.
4. **"Shared stage tokens (queried, partial, full, offer, closed)".** None carry partial / full. The shared set
   (`f12.css` `--state-*`) is queried / agent / you / offer / closed. The ref's values are declared once as `--v6-stage-*`
   / `--v6-chart-*` in `v6/versionsV6.css` — re-point there.
5. **"See all {n} → goes to the Query Centre filtered to the version if that filter exists".** It doesn't (QC params:
   `q`, `status`, `ids`, `from`, `view`; `Qc138Filters` has no version). "See all" expands the list in place.
6. **"Free: keep v2's lock and copy as built".** Kept, as instructed — but its copy now promises things v6 does not
   have ("A league table. Every version side by side.", "One timeline of who saw what"). That copy asserts what the page
   no longer does; it needs a ruling (open item).
7. **"The header … collapses to the slim bar … as the Query Centre's".** The Versions page already used the shared
   `WorkspaceNavyHeader` (same OpenHeader + SlimBar as the QC's). Extended, not rebuilt: title "Versions", the one-line
   map as its `right`, the bar's aside "In use {name}". Its 48px bottom margin is set to 16 on this page only.
8. **The 1-based numbers in the ref.** The ref numbers Original "1". The app numbers Original as the book mark and
   versions from 1 (v2's `Num`, the form, the picker); the page keeps the app's numbering so every surface agrees.

## Step 0, item by item

1. **Base:** dev served `index-B40IUGVQ.js` = `status-marks-v3 @ e08d528d5`. Red gate passed: it holds
   `VersionsV2Page.tsx` and `lib/versionsV2.ts` with `versionsModel`, `versionFacts`, `rated`, `leagueOrder`,
   `treeModel`, `MIN_SENT_FOR_RATE` (5). Refs: all 8 hashes matched the brief; enrolled (`22d2707e9`).
2. **What the page rendered:** the shared navy header ("{n} versions", in-use figure on the right) → PageAlertBanner
   (no-version queries) → V2List (tinted panel, search, sort, icon actions, Archived disclosure) → V2Tree (on-page
   family tree band) → V2Tracking (navy band, carousel, league) or V2Warming (fewer than two ready) → V2Empty (no
   versions); overlays: VersionDrawer, VersionForm, Picker, ArchiveConfirm, Explainer; PageChecklist; the Free lock.
   Locks: `tests/e2e/versionsV2.measure.ts` (VER2, S01–S29, W1–W4, T1–T6, on live dev via `ver2Fixture.mjs`),
   `wsHeaders.measure.ts` ("versions" row), `qc149L0.measure.ts` (already all `test.skip`), `versionsPageSmoke`.
3. **Shared parts:** navy header + slim bar `shell/WorkspaceNavyHeader.tsx:63` (shared; extended through props);
   toast with Undo `toast/ToastProvider.tsx:24,81` (shared; used). Page-local elsewhere, copied beside this page
   (lift candidates): card `dashboard/v2/Frame.tsx:12` + `dash2Frame.css:9`; founding `dashboard/v2/Dash2Founding.tsx:70`
   (shell) + `packages/v41/Pk41Banner.tsx:21` (content); notice `dashboard/fv2/ReminderAsk.tsx:16` + `fv2.css:108`;
   switch `dashboard/v2/Dash2Active.tsx:131` + `dash2Active.css:63`; pills `dashboard/v2/dash2.css:41` (`.d2-pill`,
   `--pri`), `dash2Frame.css:39` (`.d2-open`); link `fv2.css:120` (`.fv2-askset`); stamp — none shared (`qc153-stamp`,
   `laq-thump`, `fv1-stamp` are each page-local); the ref's own `stamp` keyframe is ported as `v6-stamp`.
4. **Stage colours:** no shared partial/full tokens → the page-local block (FALSE PREMISE 4).
5. **Derivations:** `versionFacts` gives `n` (sent), `replied`, `more` (asked for more), `full` (asked for the full,
   from `reachedFull`), `offers`, `avgReply`, `qs`/`all`. No new derivation written.
6. **Archived / picker:** v2 showed archived versions in an "Archived · n" disclosure under the list (Insights,
   Bring back); delete was the bin on an unsent version. The picker (`Picker`, assign / change modes) opens from the
   banner's "Assign versions". v6 keeps the disclosure (Open, Bring back) as a quiet line under the list's foot and the
   picker as built; delete is no longer reachable (open item).
7. **Baselines** (clean checkout of `e08d528d5`): tsc 0 errors (2 GB default heap OOMs; run with 8 GB); `vite build`
   and `vite build --mode development` both exit 0; Vitest **Test Files 2 failed | 880 passed | 1 skipped (883) ·
   Tests 3 failed | 12672 passed | 4 skipped (12679)** — `emuGuard.test.ts` (cb21Emu.sh) and `firestoreTarget.test.ts`
   ×2 (25 live-Firestore scripts), all pre-existing.

## Per phase

| Commit | What |
|---|---|
| `22d2707e9` | Step 0: refs enrolled |
| `743b0f132` | `lib/versionsV6.ts` + 17 tests: `funnelGeometry` (ref `fsvg` style 2), `compareOrder` / `leaderFor`, `listOrder`, `stageBandOf` |
| `057a4a19d` | **Phases 1–4 as one commit** (every phase rewrites `VersionsV2Page.tsx`): header + map dialog, band, notice, list + open version + queries, comparison, day one, Free; v2 surfaces deleted; smoke re-pointed |
| `6236112f0` | Phase 5: VV6 locks + `vv6Emu.mjs`, VER2 retired, wsHeaders re-pointed, `docs/decisions/versions.md` |

Files: `src/components/versions/{VersionsV2Page.tsx, V2Overlays.tsx (VersionForm `bare`, ModalShell kind "map"),
V2Tree.tsx (`bare`), versionsV2.app.css, versionsPageSmoke.test.tsx}`, `src/components/versions/v6/{V6Parts, V6List,
V6Open, V6Compare}.tsx + versionsV6.css`, `src/lib/versionsV6{,.test}.ts`, `tests/e2e/{versionsV6.measure.ts,
vv6Emu.mjs, wsHeaders.measure.ts, RETIRED-versions-v6.md}`, `docs/decisions/versions.md`.

## Locks — `tests/e2e/versionsV6.measure.ts`, emulator, 1512 × 900 and 1280 × 800

Green: **12 passed**, every ledger green at both widths (ledger/*.json). First green run found a real bug: **X1 at
1280** — the founding line (nowrap) widened its grid track, scroller 1278 vs 1192; fixed with `minmax(0, 1fr)`.
Red: each break applied in the page by `VV6_MUTATE` (nothing in src/ changed; ledger/mut-*.json). Readings at 1512
(1280 identical in kind):

| Lock | Green | Break | Red reading |
|---|---|---|---|
| H1 | 5/5 | header +12 top margin | top: QC 38.0 · Versions 50.0 |
| H2 | 3/3 | slim bar never shown | past the header: shown = false |
| H3 | 9/9 | the tree cloned onto the page | no tree on the page — 5 nodes |
| L1 | 4/4 | open on the newest | selected `vv6-ms-bv-4`; open card "Dual timeline" |
| L2 | 5/5 | Firestore Write channel blocked | stored in use stays `vv6-ms-bv-2`; no toast (the list tag still moves: the local cache is optimistic — the stored read is the lock) |
| O1 | 29/29 | "33%" at 3 sent | early Prologue cut asked for more — 33% vs 1 |
| O2 | 30/30 | all pieces full height | piece 0 ∝ count — 120.0 vs 114.0 (×15) |
| O3 | 19/19 | one glyph and band for all | Queried → `v6-qi--closed`; stages draw alike |
| C1 | 7/7 | cards sorted by name | rate order bv-2,bv-0,bv-1,bv-3 vs bv-2,bv-1,bv-0,bv-3 (first break sorted by whole text, which starts with the rank — it kept the order and C1 stayed green; corrected, re-run red) |
| C2 | 8/8 | no fixed head height | funnel tops 580.5, 557.7, 557.7, 573.3 |
| C3 | 8/8 | rank the unranked; drop the panel | Dual timeline: 0 dashed squares (want 5); not-yet panel missing |
| S1 | 5/5 | every gap 40 | header→band 40, band→notice 40, desk→comparison 40 |
| X1 | 5/5 | cards 300 wide, open card 1400 | scroller 1804 vs 1424; "open" past the edge |

Expected values come from `vv6Emu.mjs facts` (its own arithmetic over the raw documents), each population asserted
non-zero first. O1 deviation: the brief says "equal `versionFacts` read in the same evaluate"; `versionFacts` is not
reachable from the page, so the fixture's independent figures stand in (as VER2 did).

## Gates — baseline vs final (clean tip `6236112f0`)

| | Baseline (`e08d528d5`) | Final |
|---|---|---|
| tsc | 0 errors | 0 errors |
| vite build | exit 0 | exit 0 |
| vite build --mode development | exit 0 | exit 0 |
| Vitest | Test Files 2 failed \| 880 passed \| 1 skipped (883) · Tests 3 failed \| 12672 passed \| 4 skipped (12679) | Test Files 2 failed \| 881 passed \| 1 skipped (884) · Tests 3 failed \| 12689 passed \| 4 skipped (12696) |

The same three failing cases, diffed. Merged `dev/smv31-vv6`: tsc 0; Versions + status-marks specs 7 files / 90 tests
green.

## Screenshots (`shots/`, beside the ref's `design-refs/versions-v6/screens/`)

everyday `everyday-1512.png` / `everyday-full-1512.png` (ref 01-everyday-1512) · `everyday-1280.png` (ref
01-everyday-1280) · just started `just-started-1512.png` (ref 02) · day one `day-one-1512.png` (ref 03) · map dialog
`map-1512.png` (ref 04) · new version `new-version-1512.png` (ref 05) · archive `archive-1512.png` (ref 06) · Free
`free-1512.png` · plus `compare-same-*`, `in-use-stamp-*`, `map-1280`, `just-started-1280`.

## Retired, by name

Components: V2List, V2Tracking, V2Warming, V2Empty; VersionDrawer, its Funnel, the page's DrawerShell, ArchiveConfirm
(V2Overlays); their hand-written CSS. Locks: VER2 (`versionsV2.measure.ts`, every case — table in
`tests/e2e/RETIRED-versions-v6.md`), `ver2Lib.ts`, `ver2Fixture.mjs`, `ver2Shots.measure.ts`, `ver2Probe.measure.ts`,
`qc149L0.measure.ts`. Re-pointed: `versionsPageSmoke.test.tsx`; `wsHeaders.measure.ts` "versions" row (not re-run).
`lib/versionsV2`'s now-unused helpers (`carouselOrder` — still used by Responses — `leadingId`, `trackingState`,
`warm*`) are left: that file is additive-only in this pack.

## Open items (owner)

- **The How it works film** — not built (no play button that does nothing). Nick: the showcase film.
- **The two illustrations** (header art, compare band) — placeholders, swappable by file. Nick: art.
- **Offer as a fourth funnel piece** — Offer/Signed sit on the full band for now. Nick: ruling.
- **Archived versions' design**, and **delete of an unsent version** (no longer reachable from the page). Nick: ruling.
- **Free lock copy** promises a league table and a timeline (FALSE PREMISE 6). Nick: copy ruling.
- **v2's form and tree carry rust/terra** (the form's step numbers, the tree's in-use path) — not forked per the brief;
  conflicts with "no rust" on this page. Next Versions pack.
- **The sort has no lock**; the guide's re-pointed targets and the form / picker are not re-measured. Next pack.
- **`wsHeaders.measure.ts`** "versions" row re-pointed but not re-run. Next run of that suite.
- **Lift candidates** (see Step 0.3) and the `--v6-stage-*` block → shared tokens. Design system pass.
- **Phone** — untouched. Phone pack.
