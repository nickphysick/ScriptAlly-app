# Ink shell v1 — Step 0 (6 Oct)

Taken before any edit, in a worktree at `main`'s tip (`46573d0a`), because the primary checkout carried
another session's uncommitted report PNGs and run artefacts.

## False premises found in Step 0

1. **The pack is a zip.** `~/Downloads/ink-shell-pack/` does not exist; `~/Downloads/ink-shell-pack.zip`
   does. Its three files hash exactly as the brief states (verified, then enrolled in `.refhashes.json`).
2. **The fillet path is not "verbatim from the reference".** The ref draws `M0 0V12H12A12 12 0 0 1 0 0Z`
   in a 12-unit viewBox stretched to 13px; the brief's path is `M0 0V12H13V12A12 12 0 0 1 1 0Z` in a
   true 13×12 box. The brief's is used; INK4's golden is the arbiter.
3. **"The" drawers, floating tabs and toasts are many more than the brief names.** 11 right-hand drawers
   (brief: 4), 10 corner-anchored floats (6 of them pinned to the viewport with literal px), 9 toast sites
   in five different positions.
4. **Settings mode puts a second nav on the sidebar** (`SettingsRail`), written in dark ink (`--sp-ink`)
   on a light panel. On ink it would be unreadable, so it comes along as shell chrome.
5. **The beta strip renders on phones too.** Retiring it only at ≥768px is the one way INK19 holds.
6. **`theme-color` is already set** (`#e7e0d5`) for every tier including marketing. The shell sets the
   meta to ink while it is mounted at ≥768px and restores it on unmount, so marketing and phone chrome
   are unchanged.
7. **The e2e suites already contradict each other** about the bar (shellV3 L2 "no edge at rest" vs Q2/PH6
   "hairline at rest"; pageHeaderV1 "shadow on scroll" vs Q3; shellV3 L6 search 40×40 vs dashTopRow 36).

## 1 · Level and baselines

- `git rev-list --left-right --count HEAD...origin/main` → `0 0`. Contact list v13 7/8 (`a7790c8c`) and
  8/8 (`46573d0a`) are on `main`. ✓
- tsc: clean. `build:dev`: clean (no error or warning lines). Vitest: **528 files / 8,355 tests green**
  (one suite needed `functions/node_modules` symlinked into the worktree — a worktree artefact).

## 2 · Census of the surfaces this pass moves or restyles

| Surface | Where | Today |
|---|---|---|
| Bar | `WorkspaceShell.tsx` `.ws-pagebar` | toggle · `.ws-bvr` · page name/crumb (`.ws-pname`) · spacer · `BarSwitcher` · search icon · Back to app · Give feedback (`.ws-fb`) · Help (`.ws-helpwrap`). 64px, page ground, `::after` hairline. |
| `BarSwitcher` | `BarSwitcher.tsx` | tile in the bar, menu absolute under it (340 wide, right-anchored). M key, shelved group, "Now showing" toast, `STAGE_REPLAY_EVENT`. |
| `SidebarCapture` | `SidebarCapture.tsx`, mounted in the sidebar pin | split button; `invokeCapture("query")` main; menu rows Record a response · Add an agent · Add a manuscript (`runCaptureRow`). Collapsed: 40×36 tile + portalled flyout. |
| Help | `.ws-helpwrap` | `/help`, or a two-item menu (Help centre · Show the page guide) on a page with a guide. `AppShell`'s `.ashell-help-menu` is dead UI (nothing opens it). |
| `FeedbackDock` | mounted in `AppShell`; state `feedbackOpen` there | opened by the bar's `.ws-fb` and by `BetaStrip`'s report link. |
| `BetaStrip` | `AppShell` frame, above `.sv2-app` | Beta pill, the lead sentence, "tell us when you find one" (opens feedback), dismiss (sessionStorage). The known-issues link exists but is unwired. |
| Foot fade | `AppShell` `footFade` → `.sv2-fade` (shellV2.css) | sticky 56px gradient at the scroller's foot when content continues. |
| Page-grid hems | `WorkspacePageGrid` `.wpg-hem--bot` | a bottom hem on non-fill pages. |
| Drawers | see table below | all `position: fixed; top/right/bottom: 0`, no radius. |
| Floating tabs | Birds-eye tab, `FloatingTab`, A17 tab, contacts page guide measure `.ws-window` (+24); dock chip, parked chip, default page guide, feedback dock are viewport-fixed | z 30–72 |
| Toasts | `ToastProvider` (bottom-centre of viewport, z 300); query undo bar (bottom-LEFT, z 90); To-do toast (bottom-left on desktop, z 9100); Calendar receipt (absolute in page); EditQuery success (bottom-right); Dashboard undo (bottom-right) + post-it (centre); To-do v2 active-filters pill; Smart import pill (onboarding, out of the workspace) | |
| Rail tips | `DeskTooltip variant="rail"` from `railTipFor` | cream card |
| Collapse hook | `useSidebarCollapsed.ts`, key `scriptally:sidebar-collapsed`, 248 ↔ 68, `[` / ⌘\ via the registry | |

**Drawers:** Birds-eye `.bvd` (z 61, dim 60) · query action `.qad-drawer` (71, scrim 70) · `HalfDrawer`
`.hdr` (61/60) · To-do `SlideOver` `.slo` (9001/9000) · `QueryPanel` `.qpn` (70/60) · Correction desk
(81, beside the panel at `right: 592px`) · package material `.ppv-drawer` (85/84) · Noteboard examples
`.nb-drawer` (45/44) · Calendar record `.tl-dw` (48, no scrim) · EditQuery `Form11Drawer` (inline,
centred, 1001) · Dashboard `TimelineDrawer` (dead — no mount).

## 3 · Themes

No theme class has a `.t-* .ws-*` rule. Five shell tokens vary by theme — `--shell-side`, `--shell-rule`,
`--shell-active-bg`, `--shell-active-fg`, `--shell-hover-bg` (Bold/Editorial override; Cappuccino takes
`:root`). The ink shell reads none of them, so it is identical in all three themes.

**Pages DO read shell tokens for their own content** — `--ws-window` (manuscripts, containers, QC grid),
`--ws-page`/`--ws-page-rgb` (msv12, contact, five To-do sheets, QC carousel), `--ws-frame-top`
(dashboard), `--sp-anthracite` (comps, packages, a17, contact, QC timeline), `--shell-active-bg/-fg`
(settings rail, comps, packages). **Not a ✗:** the ink shell defines new tokens (`--ink-*`) and re-values
none of these, so no page changes.

## 4 · Locks and docs

**Unit — amended by this pass:** `workspaceShell.test.tsx` (bar order/breadcrumb/pname cases, the active
row, the switcher's anchor), `betaChrome.test.tsx` (the bar's feedback control, the strip's mount),
`sidebarCapture.test.tsx` (SB1: the capture lives in the bar now), `shellV2Tokens.test.ts` (the foot fade),
`deletionBanner.test.tsx` (the strip's slot), `oneScreenSkeleton.test.tsx` (the nav row's loading
controls), `tasksKeys.test.tsx` / `todoFinishing.test.ts` (the To-do toast's position).

**E2e — retired with a reason in `tests/e2e/RETIRED-ink-shell-v1.md`:** quietBar Q1–Q9 + shots, shellV3
L2/L3/L5/L6/L8/L10, shellV3Mock (bar/active row), pageHeaderV1 §1, pageHeaderV2 §1, plateHeader PH6,
livingHeadersV3 LH5, dashTopRow (v34 controls), qcV126 QC126-1 bar rule, analyticsV17 AN17-1 bar rule,
pkgMat/compsMat bar crumb, switcherV2 S1–S3 (geometry; behaviour stays), sidebarCapture e2e SB1/SB3/SB6/
SB7, queryActions §A (right 0), qcV126 QC126-12/13, contactV13 CL13-9 (24 → 20) / CL13-10, agentCardV1
dock chip, analyticsV17 AN17-15 (24 → 20).

**Docs:** `CLAUDE.md`'s quiet-bar section and its 4 Oct "hairline always on" ruling are amended rather
than deleted.

## 5 · The palette

`usePalette` returns `openPalette()`; the bar's search button already calls it on click and ⌘K is bound
inside the hook. The new field reuses it. ✓
