# Retired with Manuscripts v13 (the dashboard shelf) — swept by SELECTOR, not by filename

v13 (design-refs/manuscripts/manuscripts-v13.html) puts the filled page in ONE column under the
hero: the owed requests, the shelf (Comps · Materials · Packages), the Versions tiles and Recent
activity. The comps rail and its tray, the list-style Versions rows, and the Query letters,
Synopses, Other materials and Submission packages sections are gone from the filled page. The
v12 empty state is unchanged (F8) and keeps its own rail, tray and ghost sections.

Swept by the selectors the retired parts were reached through — `[data-msv12="rail"]`,
`.msv12-rail`, `[data-msv12="tray"]`, `[data-msv12="tray-art"]`, `[data-msv12="vrow"]`,
`[data-msv12="letters"]`, `[data-msv12="synopses"]`, `[data-msv12="other"]`,
`[data-msv12="packages"]`, `[data-msv12="pkg"]`, `[data-msv12="pro-lock"]`,
`[data-msv12="pkg-inuse"]`, `[data-msv12="mrow"]`, `[data-msv12="comp"]`,
`[data-msv12="rail-foot"]`, `.msv12-topline` — across `tests/`, `src/` and `scripts/`. The only
reader was `manuscriptsV12.measure.ts` itself; no census names the rail. The route sweep (every
suite that opens `/manuscripts`) found two that read anything page-specific: `headerFix` reads
`.msv12-wpg` (unchanged) and `pkgMat` P1 asserts `.msv12-pro` is absent (still true).

Recover any file from `110e4a80`, the last commit that contains all of it.

## The v12 suite, case by case

`tests/e2e/manuscriptsV12.measure.ts` is deleted; its locks that still hold now live in
`tests/e2e/manuscriptsV13.measure.ts` under their own names.

| v12 case | Disposition | Why |
|---|---|---|
| L1 hero-one-row | **rewritten** (L1) | the art/text/cover overlap holds; "cover right = rail right" became "cover right = the column's right", because the rail is gone and the hero spans the column. Runs at 1440 and 1280 (profile LIGHT; v12 ran 1024–1920) |
| L2 art-floats | **kept** (L2) | the hero is v12's (F5); the claim is unchanged |
| L3 one-edge | **folded into M5** | the version rows are tiles now; M5 asserts every tile's queried · requested · sent against the fixture, and the current tile's queried count would read one higher if the packageless query were folded in. The derivation half stays in `manuscriptSummary.test.ts` |
| L4 status-modal | **folded into M8** | the owed rows are kept (F6); M8 opens the drawer's "I've sent it" journey and asserts Escape writes nothing |
| L5 statusdot | **kept** (L5) | the population now includes the tile footers and the activity rows; the stand-in sweep also refuses the mock's `.ai` rings |
| L6 empty-examples | **kept** (L6) | the empty state is unchanged (F8); it runs on `ms13-empty@` now |
| L7 pro-gate | **retired** | the Packages card has no reachable Pro teaser — `PACKAGES_OPEN_TO_ALL` (packages v2 D7) — and the gate is the entitlement, unit-locked by `entitlements.test.ts` |
| L8 tray-art | **retired** | the filled page has no tray. The empty state's tray is v12's and unchanged (F8) |
| L9 honest-missing | **rewritten** (L9) | an unset series now reads "Standalone", muted, with no Add (v13 Phase 2). The "Not recorded" + Add path is measured on the account's second book, which records no setting and no version; both Add buttons open their dialogs |
| L10 sticky-rail | **retired** | no rail |
| L11 no-appraisal | **kept** (L11) | the new copy is in the sweep |
| geometry @ 1280 / 1920 | **replaced** | the "rail left = column right + 28" relation has no subject; "geometry vs mock" at 1440 and 1280 asserts the page column's containers sit where the mock draws them (x and width ±1) and prints the rest |
| mock reference render | **replaced** | read live by "geometry vs mock" and by M3 |

## Fixture

`tests/e2e/msv12Fixture.mjs` and `tests/e2e/seedManuscriptsV12.mjs` are deleted: their only reader
was the v12 suite. v13 seeds its own accounts (`ms13Fixture.mjs`, `seedManuscriptsV13.mjs`). The
`msv12-pro@` and `msv12-empty@` accounts still hold their data on dev; nothing reads them.

## Components (retired in 110e4a80)

| Subject | Disposition |
|---|---|
| `Msv12Rail.tsx` (`CompsRail`) | deleted — the shelf's Comps card replaces it |
| `VersionsSection`, `MaterialsSections`, `OtherSection`, `PackagesSection`, `CountCluster`, `SectionH`, `PkgCardModel` (`Msv12Sections.tsx`) | deleted — the shelf, the tiles and Recent activity replace them; `OwedList` and `fmtDay` survive |
| `msv12Materials.ts` (`applyMaterialDraft`) | deleted — the page no longer creates materials; the Materials card links to Submission packages, which owns that flow |
| `.msv12-topline`, `.msv12-link`, the Other / lock / counts / rail-foot rules | deleted with the components; the class audit (selectors against emitted tokens) finds nothing selected that no component emits |
