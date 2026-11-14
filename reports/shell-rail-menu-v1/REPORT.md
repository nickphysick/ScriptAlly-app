# Shell rail menu v1 — a place's pages on hover (14 Nov 2026)

Branch `shell-rail-menu-v1`, cut from `dev/clh2-nwv1-clh21-ql21-nw11-snv3` (09901d3b0), the line dev was serving
(`index-Bh4UTjIK.js`, checked with curl before the cut). Ref: `design-refs/shell-rail-menu-v1.html`, SHA256
`b431cd06e5bbbfd88f8321e7e2744fe8fcbc24b4314da20b2f686c5cac997053` (matched).

## False premises

- **None of the brief's premises about the code were false.** Shell nav v3 is on the line: the rail draws one row per
  section, `railTargetFor` / `railSectionFor` are in `src/lib/workspaceNav.ts`, and `RailMore.tsx` is gone (deleted at
  0a8b28526).
- Two things about the harness were not true of a fresh worktree:
  - **The baseline's reds were the worktree, not the code.** It had no `functions/node_modules`, so tsc reported 7
    `TS2307` errors in `functions/src`, and 9 Vitest files under `functions/` (plus `queryClock` and `aiRefusal`, which
    import from there) failed to load. The e2e login (`tests/emulator-seed/authUser.mjs`) needs `firebase-admin` from
    `functions/`, so I symlinked the primary's `functions/node_modules` (and its `.env.local`, for the harness password)
    before the first browser run. The final gates ran with that symlink, so they are *better* than the baseline for a
    reason that has nothing to do with this pack.
  - **`scripts/worktree-claim.mjs` is not on this line** (it is on main), so there was no claim to take.
- `npx tsc --noEmit` ran out of memory at Node's default 2 GB heap (exit 134). Every tsc run here used
  `NODE_OPTIONS=--max-old-space-size=4096`.

## Gates — baseline vs final

| | Baseline (before any edit) | Final |
|---|---|---|
| tsc | `EXIT 2`: 7 `error TS2307` lines, all `functions/src/*` (no `functions/node_modules`) | `tsc exit 0`, 0 errors |
| build (`npx vite build`) | `✓ built in 1.75s`, `EXIT 0`, no error/warning lines | `✓ built in 1.76s`, exit 0, no error/warning lines |
| vitest | `Test Files  12 failed \| 844 passed \| 1 skipped (857)` / `Tests  4 failed \| 12277 passed \| 4 skipped (12285)` | `Test Files  2 failed \| 855 passed \| 1 skipped (858)` / `Tests  3 failed \| 12449 passed \| 4 skipped (12456)` |

Baseline's 4 failed tests: `emuGuard.test.ts` (1) and `firestoreTarget.test.ts` (2), which are source scans of this
line, and `smartImportCore.test.ts` (1), which needs the functions SDK. Final's 3 failed tests are exactly those three source scans (`emuGuard`, `firestoreTarget` ×2); `smartImportCore` and the `functions/` files now load. `railMenu.test.ts` adds 1 file and 4 tests; the rest of the rise in the totals is the `functions/` files loading.

## Commits

- **cedccbed9 — "Shell rail menu v1 — a section's pages on hover"**
  `design-refs/shell-rail-menu-v1.html`, `src/components/shell/RailMenu.tsx` (new), `src/components/shell/railMenu.css`
  (new), `src/components/shell/railMenu.test.ts` (new), `src/components/shell/SidebarRail.tsx`,
  `src/components/shell/navProMarks.test.tsx`, `tests/e2e/shellRailMenu.measure.ts` (new).
- **The commit after it — "Shell rail menu v1 — decisions doc and report"**
  `docs/decisions/shell-nav-header.md`, `reports/shell-rail-menu-v1/REPORT.md`, `reports/shell-rail-menu-v1/shots/*.png`.

## What was built

- `useRailMenu` (in `RailMenu.tsx`) owns the rail's one menu. `rowProps(section)` goes on each rail row and adds
  nothing for a one-page section. The menu's rows are `railMenuPages(section)`, which is the section's own `children`
  (no second list).
- **`SidebarRail` is now a thin wrapper that holds the hook and renders the hook-free `SidebarRailView`.**
  `navProMarks.test.tsx` calls the rail as a plain function (SNV3-R4/R5), and a hook would throw there, so those three
  calls now go to `SidebarRailView` with `NO_RAIL_MENU`. The assertions are unchanged.
- The menu is disabled when `expanded || settingsMode`, the same condition More used.

## Carried over from the retired More panel (RailMore.tsx / railMore.css at 0a8b28526^)

- **Carried over:**
  - the 120ms / 220ms hover timing and the clear-then-schedule timer;
  - the capture-phase outside `pointerdown`;
  - `useEscapeLayer(open, …, ESC_LEVEL.page)` with focus back to the opener;
  - the placement maths (rail's right + gap, row's top − lift, clamped to 8px inside the window), now with the ref's
    8 / 8;
  - the portal to `document.body`, with focus moving to the current row (or the first) on a keyboard open;
  - the menu-key handler (Up/Down/Home/End wrap, Tab closes);
  - the ground `#1f2a3b`, 14px radius and the three-layer shadow;
  - z 72, and the `.rmenu`-scoped rules that hand inheritance back from brand.tsx;
  - the reduced-motion rule.
- **Left behind:**
  - **hold-on-click**: a rail row's click navigates now, so nothing holds the menu open;
  - Enter/Space/ArrowDown opening it from the button: the brief gives the rail row ArrowRight, and Enter/Space still
    navigate;
  - group headings, row icons, the foot line and the section Pro tag;
  - the button's label swap and its `wsr-moreopen` state;
  - `max-height` / `overflow-y: auto`. That last one was dropped on purpose: see SRM-E3.
- **Added beyond More:**
  - switching rows while open skips the delay;
  - ArrowLeft returns to the row;
  - Tab focuses the row first, so the browser's Tab moves on from the rail rather than from the end of `<body>`;
  - a `::before` bridge sized to the gap between the row's right edge and the menu (`--rm-bridge`);
  - a `min-width: 768px` guard in JS;
  - the entrance animation runs only on `.is-in`, so leaving is instant (unmount).

## Locks and their red-before proofs

The browser locks were proved red with a **mutant build**: `scratchpad/mutate.py` applies one mutation per lock to
`RailMenu.tsx` / `railMenu.css`, and the suite then ran once against that build through `npm run e2e:emu`. The source
was restored from a byte-for-byte backup (`diff -q` clean) afterwards. Each red below was read for its own reason.

| Lock | What it asserts | Mutation | Red-before reading |
|---|---|---|---|
| SRM-U1 (`railMenu.test.ts`) | Queries, Agents, Materials, Tasks: rows = the section's page labels in nav order | `railMenuPages` returns the pages reversed | `× SRM-U1` |
| SRM-U2 | Dashboard yields no menu | M4: `kids.length > 0` | `× SRM-U2` |
| SRM-U3 | 120 / 220 / 8 / 8 | M1: gap 4, lift 14 | `× SRM-U3` |
| SRM-U4 | the ref's `.rmenu` / `.rm-row` / `.cur` values, the 160ms ease-out, no `overflow` on `.rmenu`, the bridge, every selector scoped to `.rmenu` | M3: the bridge `display: none` | `× SRM-U4` |
| SRM-E1 (1512×982) | hovering Queries: menu left = rail right + 8, top = row top − 8, 224 wide, inside the window; `aria-haspopup="menu"`, `aria-expanded="true"`, `aria-label="Queries pages"`; Responses goes to /queries/responses and the menu is gone | M1 | menu at left 84, top 236.75 against row 250.75: `geoProblems` returned 2 problems |
| SRM-E2 | on Responses, exactly one row is current, and it is Responses | M2: current = section's `def` | current was `["Query Centre"]` |
| SRM-E3 | pointer stepped in 4px moves from the row's centre into the menu, **250ms per step** (longer than the close), never closed | M3 | closed at x = 76…112 |
| SRM-E4 | hovering Dashboard 500ms opens nothing, and the row has no `aria-haspopup` | M4 | `Expected: 0, Received: 1` |
| SRM-E5 | pinned: hovering where Queries is opens nothing; a `pointerover` sent straight to the (covered, inert) rail row opens nothing | `disabled: false` in SidebarRail (separate run, `-g SRM-E5`) | `Expected: 0, Received: 1` at the direct-event line |
| SRM-E6 | Queries, ArrowRight (focus on "Query Centre"), ArrowDown, Enter → /queries/responses, menu gone; ArrowRight then Escape → closed and focus on the Queries row | M6: ArrowRight does nothing | `Expected: 1, Received: 0` |
| SRM-E7 | `hover: none` context (1180×820, touch): a pointer over Queries for 500ms opens nothing; a tap goes to /queries with no menu | M7: the `canHover()` guard removed | `Expected: 0, Received: 1` |

Two things are worth knowing about these proofs:

- **SRM-E3 found a real defect before any mutation.** On the first green-path run it failed: the menu closed from
  x = 76 onwards. `.rmenu` had More's `overflow-y: auto`, which clips an absolutely positioned `::before`, so the bridge
  did not exist to the pointer. The fix drops the overflow (the longest menu is five rows, 204px), and SRM-U4 now
  asserts `.rmenu` has none.
- **SRM-E5's first mutant stayed green, honestly.** It removed the guard from `enterRow` and `show`, but the
  close-on-disabled effect still shut the menu at once, and a pinned sidebar covers and inerts the rail anyway. The
  second half of the lock, a pointer event sent straight to the rail row, is what makes it a lock on the menu's own
  guard and not on the cover. It went red with `disabled: false`.

Green run (good build): `9 passed (1.3m)` (setup, SRM-E1..E7, SRM-S).

## Screenshots beside the ref

All files are in `reports/shell-rail-menu-v1/shots/`: the `ref-frame*.png` files are the ref's frames rendered in
Chromium, and the `frame*-1512.png` files are the live page at 1512×982, cropped to the same 760×600 corner.

| Ref | Live |
|---|---|
| `ref-frame1.png` (Queries on Responses) | `frame1-queries-on-responses-1512.png` |
| `ref-frame2.png` (Materials on Comparable titles) | `frame2-materials-on-comps-1512.png` |
| `ref-frame3.png` (Agents on Contact list) | `frame3-agents-on-contact-list-1512.png` |
| (none) | `tasks-1280x720.png` (Tasks hovered on the Dashboard at 1280×720) |

Measured on the live page at 1512×982 (rail right edge 80 in every case):

| Frame | Row top | Menu left | Menu top |
|---|---|---|---|
| Queries | 250.75 | 88 | 242.75 |
| Materials | 366.75 | 88 | 358.75 |
| Agents | 308.75 | 88 | 300.75 |

Each menu is 224 wide. Rows, order and the current mark match the ref in every frame.

**Visible differences, all in the context layer the ref marks as not normative:**

- The live page has the beta strip, so the rail and its menus sit 42px lower than the ref's frames.
- The live rail draws its separator under Dashboard.
- The page bodies are real.
- **No Pro tag shows:** the harness account is entitled to Materials, and the ref draws the tag on one row "only to
  draw it". The `.rm-pro` values are locked by SRM-U4, not by a screenshot.

**At 1280×720 Tasks needed no shift:** the menu's bottom is at 491.75 of 720. The clamp is exercised only by a taller
menu low in a short window, which no section has at the sizes measured. Tasks has two pages (To-do list, Corkboard).

## Dev deploy

DEV_DEPLOY
