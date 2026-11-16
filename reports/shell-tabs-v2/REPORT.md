# Shell tabs v2 — report

Branch `shell-tabs-v2`, cut from the line dev serves: `dev/…-wsh11-onf1-co1` @ `ba5242436` (served as `index-BEFE4y63.js` at the start).
Worktree `/Users/nickphysick/ScriptAlly-st2`. Ref `design-refs/shell-tabs-v2.html`, sha256 `977258ed…e4e3` (found in `~/Downloads`, copied in, hash matched).

## False premises

1. **"The rail is #242c3c and the bar is #1d2432."** Neither is a token. The bar has no fill of its own: it is transparent over `.ws-main`, which paints `--ink-shell` (#1b2433). The rail is a gradient, `--ink-shell-lift` (#232d3f) → `--ink-shell-lift-2` (#1d2637) at 260px → `--ink-shell` at 520px ("lit from above", sidebar rail v1). The ref's two hexes are screenshot samples of those.
2. **"A lighter hairline down the rail's right edge that runs up through the bar."** It is `box-shadow: inset -1px 0 0` cream at 4% on `.ws-panel`. The panel is a full-height column beside the bar, so the line runs the whole height, through the bar's band. **The pinned sidebar has none**: `.ws-panel.sr-wide:not(.sr-float) { box-shadow: none }` (sidebarRail.css). The prompt's "in the collapsed rail and the pinned sidebar" is half a no-op.
3. **"The tab and a 12px strip under the bar are #f1eee9 and the page is #f5f5f3."** The tab and the lip already read one token (`--ink-tab`), and on 19 of 23 routes the page under them is that same colour. The second tone exists on four routes, where the page paints a ground of its own that the shell never reads: Letters (`.qlp`, literal #f5f5f3), Packages (`.pk39-wpg > .wpg-scroll`, a gradient from literal #fbf9f5), and the Dashboard and Goals (`.dash-mode .ws-wbody:has(.d58.d2)`, a gradient from literal #fbf9f5). Measured pixels are in Step 0.4.
4. **"A place with one page" needs building.** It does not: the Dashboard and Settings already render one current tab (`stripBase`'s `__page` entry in WorkspaceShell). C1 is a lock on existing behaviour.
5. **"The sheet's corner … matching the top-right."** The top-right is 12px, not 14 (the ref's own `.sheettop` says `14px 12px`). The prompt keeps the top-right unchanged, so the build follows the prompt.
6. **"Bar height (66px)."** The bar is 64px. Unchanged either way.
7. **"Focus is a 2px pale-blue ring."** The prompt overrides this with the shell's existing focus colour, `--ink-terra`, and the build uses that.
8. **"Bold the current tab" (B2's mutation) moves nothing.** Special Elite has no bold, and Chrome's synthetic bold keeps the advance widths, so a bold-only current tab moves no tab (measured: red `[]`). The mutation adds the old current tab's 22px sides as well.
9. **"Selecting each tab changes no tab's x" cannot be read from the tab alone.** On Versions and Manuscripts the bar carries the guide pill (≈232px), which moves the search field 228px left. At 1280, before the fold, that turned Manuscript to its icon. B2 at 1280 holds only because of Phase 3.
10. **"The sheet's content fades in over 180ms" needs building.** It does not: `.stage-page-on` (AppShell, `pageIn` in index.css) already fades every page in over 180ms ease-out, with no motion under `prefers-reduced-motion`. It also rises 4px, which the prompt does not ask for (an item below).
11. **Where the shell lives.** The rail, the tab strip and the navy headers are on the dev line, 1215 commits ahead of `main`. This work is built on the dev line as a short-lived branch (the prompt's instruction), not on `main` (CLAUDE.md's rule). It cannot land on `main` before the dev line does.

## Step 0 · Recon

Measured on the emulators at 1512 × 900 (`tests/e2e/st2Recon.measure.ts`, `st2Probe.measure.ts`, `st2Probe2.measure.ts`; reads only). One thing appears on every desktop shot: this line renders the BETA strip at the top of the desktop app (41.8px), though inkShell.css says it retires there. That is out of scope and reported only.

**1 · The base.** `ba5242436` (Merge card-offers-v1-merge onto …-wsh11-onf1). The bar is `WorkspaceShell` → `<header class="ws-pagebar">` → `TabStrip` (FolderTab.tsx, shell nav v3). The places are `shellV2Nav.SHELL_SECTIONS`, and the tabs are `workspaceNav`'s section children. CSS: `inkShell.css` (bar, tab, rail ground) over `workspaceShell.css`, plus `sidebarRail.css` (rail/pinned) and `sheetLip.css`.

**2 · The tab today.** The component is `TabStrip` (FolderTab.tsx:300). The fillet is one SVG path, right always and mirrored on the left when not first. The siblings are `.ws-fttab:not(.is-cur)`. The lip is `SheetLip`, a sticky first child of the scroller.

| | background | font | height | radius | left |
|---|---|---|---|---|---|
| current (`.ws-fttab.is-cur`) | `--ink-tab` | Special Elite 19px | 41 | 12 | sheet left + 0 |
| sibling (`.ws-fttab`) | cream 14% | 16px | 34 | 10 | after a 10px lane + 6 gap |
| fillet (`.ws-ftfl`) | `--ink-tab` | — | 12 × 13 | — | — |
| lip (`[data-sheet-lip]`) | `--ink-tab` | — | 12 | — | sheet full width |

**3 · The two inks.** Rail: `linear-gradient(#232d3f 0, #1d2637 260px, #1b2433 520px)`, with no fill colour, read from `--ink-shell-lift` / `--ink-shell-lift-2` / `--ink-shell`. Bar: transparent over `.ws-main`, which is `--ink-shell` #1b2433. They differ because the rail carries a separate pair of lift tokens drawn as a gradient. The line on the rail's edge is item 2 of the false premises, running the panel's full height.

**4 · The two page tones** (pixel 4px under the bar, which is the lip, against 16px under it, which is the page):

| route | tab / lip token → value | page at +16 | ground's source |
|---|---|---|---|
| `/queries` | `--ink-tab` = `--ws-page` retoned by qcv156 → 246,243,238 | 246,243,238 | `.wpg-scroll` (reads the same) |
| Letters | `--ws-page` → 242,238,232 | **245,245,242** | `.qlp` literal #f5f5f3 |
| Dashboard | `--ws-page` → 242,238,232 | **249,247,243** | `.ws-wbody` gradient from literal #fbf9f5 |
| Settings (`/account` + its 5 sections) | `--ws-page` → 242,238,232 | 242,238,232 | `.ws-window` |
| Packages | 242,238,232 | **250,248,244** | `.pk39-wpg > .wpg-scroll` gradient from #fbf9f5 |
| Goals | 242,238,232 | **249,247,243** | as the Dashboard |
| the other 13 routes | 242,238,232 | same | `.ws-window` / `.wpg-scroll` |

**5 · Every mount of the tab.**
- `WorkspaceShell` → `TabStrip`: every workspace place (Dashboard, Querying, To-do, Agents, Materials/Shelf), off-nav pages (Goals, Import), and Settings, Plans and Help (one `__page` tab). The rail and the pinned sidebar change only the bar's left edge (80 vs 248).
- `SetupFrame` → `FolderTab` (the v1 folder tab, not `TabStrip`): onboarding (`Onboarding.tsx`, one tab with a group label) and the account screens (`Auth.tsx`, the current tab plus one recessed tab for the other mode). Also `OnbLab` (dev only). On phones (<768) SetupFrame's tabs are styled by `onboarding.css` alone.

**6 · Places with one page.** One current tab: `Dashboard` (143 wide), `Settings` (129). See false premise 4.

**7 · Marks on tabs.** One: the PRO tag (`.ws-ftpro`) after a locked page's name, on Letters, Packages, Comps, Versions and Discover when the account lacks the entitlement. The harness account holds them, so no tag rendered in recon. There are no counts and no locks on tabs (the To-do count is on the rail).

**8 · Narrow windows.** Search is a fixed 168px at every width, and the tabs give way, with full names going to icons and then to "+N". On the rail at 1280 and 1100 every tab is named. Pinned at 1100: Querying's Analytics and Materials' Versions and Manuscript go icon-only (37 wide). Search never folds.

**9 · Existing locks this prompt may change.**
- Unit: `headerSheet.test.ts:44–52` (`.ws-ftab` / `.ws-ftfl` read `--ink-tab`), `tabStrip.test.tsx` (strip markup, fillet counts), `folderTab.test.ts` (FolderTab's fit), `railTokens.test.ts`, `inkShell.test.ts`, `accountScreens.test.tsx`.
- e2e: `inkShell.measure.ts` INK2/INK3 (window radius `0 12 12 12`, tab paper), INK4 (fillet golden), INK7 (search 168 at one x); `shellNavV3.measure.ts` (risen-tab metrics, lanes, fit); `sidebarRail.measure.ts` (the rail ground); `qcV137.measure.ts` (the lip); `onbV5*.measure.ts`, `publicPhonePolish.measure.ts` (SetupFrame's tab).

**Stop gates:** the ref is present with the right hash. The tab is drawn by two components (`TabStrip`, `FolderTab`), and SetupFrame can take `TabStrip` without touching a do-not-touch file. The bar's ink is `--ink-shell`, which `marketingTokens.test.ts:130` pairs with `--mk-ink-shell`. None fired.

**Baseline** (functions deps linked so the harness can sign in): tsc 0 errors · build clean · Vitest 3 failed / 12612 passed across 2 failed files (`emuGuard.test.ts`, `firestoreTarget.test.ts`), both source scans of older scripts (`tests/e2e/cb21Emu.sh`, 25 `.mjs` seeds), all predating this branch.
## Phase 1 · One ink, and the corner — `4f615409a`

Files: `src/components/shell/inkShell.css` (rail ground, sheet radius), `src/components/shell/sidebarRail.css` (logo lift), `src/index.css` (the two lift tokens deleted), `tests/e2e/inkShell.measure.ts` (INK2's radius 0 → 14), `tests/e2e/shellTabsV2.measure.ts` (new), the Step 0 probes, the ref and `design-refs/.refhashes.json`.

| Lock | red before (the mutation, same run) | green after |
|---|---|---|
| A1 one ink | rail bg transparent + gradient #232d3f→…; inset cream-4% shadow; rail top pixel 35,45,63; right edge 43,51,68 | rail `rgb(27,36,51)` = `.ws-main` = `--ink-shell`; no image, no shadow, no border; three pixels ink |
| A2 corner | radius 0px; pixel 3px in reads the sheet (246,243,238 / 242,238,232) | 14px; pixel ink; top-right still 12 |
| A3 logo | rail: centre 77.8 vs search 73.8 (4.0 low) | rail and pinned ±0 |

Rail and pinned, 1512 × 900 and 1280 × 800, on `/queries` and Letters. Pinned A3 cannot go red: the pinned logo was 1.0px low, inside A3's own ±1, so restoring it is not a red there (asserted clean, recorded).

## Phase 2 · The tabs — `ae4fb2a26`

Files: `FolderTab.tsx` (`TabStrip`: one shape, two 10px SVG curves, no lanes, gap 2), `inkShell.css` (the strip's rules; the desktop `FolderTab` rules deleted; the per-route `--ink-tab`), `index.css` (`--ws-ground-cool`, `--ink-white-rgb`), `queryLetters.css` (reads `--ws-ground-cool`, value unchanged), `sheetLip.css` (clear at rest), `SetupFrame.tsx` and `onboarding.css` (`TabStrip` from 768px up; its own left fillet gone), and `qcv140.css` / `contactV19.css` / `contactV24.css` (the full-screen navy tab sets `--ink-tab` rather than the old fillet's geometry). Tests: ST2-B*, plus the re-pointed INK1/INK2/INK5/INK4(skip), onbV5 F3/A1, qcV137 E1, `headerSheet`, `tabStrip`, `accountScreens`.

| Lock | red before (mutation, same run) | green after |
|---|---|---|
| B1 metrics | current tab at 19px | every tab 40 × 17px; first tab sheet + 24 (±1) |
| B2 no shift | current tab bold + 22px sides: every tab right of it moves 4.0 and the current widens 4.0 | no tab moves or resizes > 0.5 across Letters → Manuscript and Query Centre → Analytics (1512; 1280 after Phase 3) |
| B3 quiet | siblings on cream 14%: 2 (Querying) and 4 (Materials) seen | every resting tab alpha 0; population 2 and 4 |
| B4 one fill | lip at `--ws-page`: Letters 242,238,232 vs tab 245,245,243; Dashboard 242,238,232 vs 251,249,245 | tab = the page 4px under the bar on `/queries`, Letters, Dashboard, Settings; and on all 23 routes (sweep, 1512 rail) |
| B5 curves | left curve removed: corner reads ink 27,36,51 | both feet read the sheet's fill, ink 8px up; Comps current (3rd of 5) |

All at 1512 × 900 and 1280 × 800, rail and pinned (B2 rail).

## Phase 3 · One-page places and narrow windows — `043f5e638`

Files: `FolderTab.tsx` (`planWithFold`, `onFold`), `WorkspaceShell.tsx` (folded state on `.ws-sfield[data-fold]`), `inkShell.css` (the 38px fold), `searchFold.test.ts`, ST2-C*.

| Lock | red before | green after |
|---|---|---|
| C1 single | strip hidden: 0 tabs | Dashboard, Settings, Plans: one tab, current (rail + pinned, 1512 + 1280) |
| C2 narrow (1100, rail) | fold removed: Manuscript ends 9.7px short of the field (< the fit's 24) on Letters, Packages, Comps | six pages whole, clear by ≥ 24; Querying needs no fold |

- Search folds first. Before Phase 3 it never folded; at 1100 Materials now folds and keeps every name, and Querying keeps the open field.
- The page fade already existed (false premise 10), so nothing changed there.

## Every mount, now

- **Workspace bar**, every place, rail and pinned: the new strip (shots: `shots/after/rail_*.png`, `pinned_queries.png`; before: `shots/before/`).
- **Settings / Plans / Help / Dashboard**: one current tab (C1).
- **SetupFrame, account screens** (`frame_account-signup.png`): the current tab ("Create account") then "Sign in" as a resting word. The order is the one `FolderTab` drew, current first.
- **SetupFrame, onboarding** (`frame_setup-step.png`): one tab naming the step. **The "GETTING SET UP" group label is gone on the desktop** (an item below).
- **Phones (< 768)**: unchanged. SetupFrame keeps `FolderTab` there, and the workspace bar is hidden.

## The older suites (shellNavV3, inkShell, sidebarRail, qcV137, onbV5)

These were run on the Phase 2 tree and on the base `ba5242436` in a disposable worktree, with nothing edited during either run. Base: 22 failed / 45 passed. Phase 2: 23 / 44.
- **Red only with this change:** INK2 and onbV5 F3. Both are re-pointed and green.
- **Green only with this change:** INK1.
- **Red on both, for causes already on the base:** INK5 ("sidebar should be collapsed"), INK7 (search x differs on the guide-pill routes), INK8, INK10–INK14, INK16–INK19 (most are the manuscript switcher's strict-mode violation, two `.ws-ms-btn`), onbV5 A1/A3/K1/K2/E1 (A1: the offer headline is now "The hunt begins."), qcV137 E1, sidebarRail SR1.3/SR2.4, and INK4 (now skipped).
- Where one of these asserted the old tab (INK5's flush edge, A1's selectors, E1's lip colour), the assertion is re-pointed. The older failure still stands ahead of it.

## Gates

At each commit: tsc 0 errors, `vite build` clean, Vitest no worse than the baseline (the same 3 failures in `emuGuard` / `firestoreTarget`). The full Vitest suite ran for Phase 2, and the touched specs for Phases 1 and 3.

## For Nick to rule on

1. **Versions at 1100 wide:** with the guide pill in the bar, the folded search still leaves too little room, and Manuscript drops to its icon (the old order of retreat). Manuscripts, with the same pill, fits. Pinned at 1100, Materials cannot keep five names at any search width (the sheet is 852 wide). Options: let it be, or hide the pill's label at narrow widths.
2. **The onboarding tab's group label** ("Getting set up" / "Your account") is no longer drawn on the desktop. The one-shape tab has no place for it. Phones keep it.
3. **The page fade's 4px rise:** the existing entry animation rises 4px as it fades. The ref fades only. Unchanged here.
4. **INK4's golden** is skipped, not deleted. Delete `design-refs/shell/ink-folder-tab-golden-3x.png` and the test once v2 is accepted.
5. **The BETA strip** shows above the desktop app on this line, though inkShell.css retires it on the desktop. Out of scope, but every shot carries it.
6. **Tab order on the account screens** stays current-first, so the two swap places when you switch mode, as before. A fixed order ("Sign in", "Create account") would match "the row never moves".

## Dev deploy

The first deploy attempt stopped at the guard. Mid-session, dev moved from `index-BEFE4y63.js` to `index-266HX-Fg.js`, which is Manuscript spine v1 (`manuscript-spine-v1` @ `119c5b735`, deployed 13:34Z by another session).

This work is stacked on that branch as `dev/msp1-st2` @ `ea5eb11c9` (pushed). The merge had one conflict, `design-refs/.refhashes.json`: the spine's file was taken and this ref re-enrolled.

On the merged tree before deploying: all 15 ST2 locks green, tsc 0, the shell, onboarding and marketing unit specs 2034/2034.

Built from a clean checkout of the pushed tip and deployed to `scriptally-dev` hosting. **Dev serves `index-C5jv0Em7.js`**, the hash matching the build. No prod deploy.

An earlier stack, `dev/…-onf1-co1-st2`, was pushed before dev moved. It is superseded and nothing serves it.
