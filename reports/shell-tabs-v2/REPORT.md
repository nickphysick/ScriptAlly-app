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
8. **Where the shell lives.** The rail, the tab strip and the navy headers are on the dev line, 1215 commits ahead of `main`. This work is built on the dev line as a short-lived branch (the prompt's instruction), not on `main` (CLAUDE.md's rule). It cannot land on `main` before the dev line does.

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
