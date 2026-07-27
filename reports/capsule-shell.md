# Capsule shell — run report

**Branch:** `claude-il` · **Date:** 27 Jul 2026
**Ref:** `design-refs/scriptally-capsule-shell.html` (Nick's supplied file, copied in with Phase 1).
**Supersession note:** the pack retires `shell-followup-prompt.md` — but that pack had **already run in full** this morning (`12aaad1…6f895d5`, dev-deployed on request) before this one arrived. That worked in our favour: its interim-chrome retirement and dashboard revert ARE this pack's Phases 4 and 5, already landed; its flat canvas was simply retokened here. Nothing needed reverting.

## Commits + gates

Every commit passed tsc `--noEmit`, `vite build` and the full Vitest suite (`set -o pipefail`).

| Phase | SHA | Suite |
|---|---|---|
| 1 — capsule tokens + design ref | `1ccebb5` | 1621/1621 |
| 2 — rail/panel/plane as capsules | `1660ec9` | 1621/1621 |
| 3 — brand mark, accordion, desk strip, upgrade row | `8596669` | 1620/1620 |
| 4 — interim chrome | **already landed** as `84063a8` (follow-up P3) — verified intact, no commit | — |
| 5 — dashboard body | **already landed** as `4bf3342` (follow-up P2) — verified intact, no commit | — |

**Not deployed** — dev still runs `6f895d5` (pre-capsule). Say the word.

## The brand asset

`public/scriptally-title-v2.png` (2400×750 PNG — the one live wordmark; census in
`reports/shell-followup.md` stands) via the height-locked `ScriptAllyLogo`, **centred at 30px**
in the panel head — inside the 28–34 target, so the ~40px allowance went unused; judge optical
size in the browser. `alt="ScriptAlly"` rides inside the component. No SVG exists; 2400px is
amply 2× at this height.

## What each phase changed

- **P1:** `--shell-*` repointed in both homes (duplication stands, flagged): new `--shell-ground`
  #e7e0d5; ONE capsule surface #fdfbf8 across rail/side/topbar/canvas; interior fill #f2ede7
  (`--shell-panel` folded into the fill family — the To-do board container + Capp diary follow
  it); radius/gap/shadow as tokens; `--shell-side-edge` deleted. **The canvas-lightness lock is
  replaced** by the capsule depth law: ground darker than capsule, the four chrome surfaces
  locked equal, the fill between. `design-refs/app-shell.md` rewritten, mockup-derived.
- **P2:** the AppShell root is the grained ground (canonical `PAGE_GRAIN` inline) with 14px
  padding/gaps at ≥768px; the three capsules wear the shared surface, 20px radius and the float
  (`.sv2-cap`, class + media query). Rail: light, 70px, burgundy plane glyph, 42px icon-only
  ribs with `title` tooltips, pink active / cream hover — captions and the tab tongue retired.
  Panel loses its burgundy edge. The plane clips its corners; the stage scrolls inside it. Top
  bar 58px; save-state chip and `NavSearch` (new additive "capsule" variant) go cream-fill,
  borderless; other NavSearch variants byte-identical. Below md: unchanged.
- **P3:** the panel per the baked anatomy — centred brand; the ACCORDION (Dashboard flat;
  Querying/Agents/Shelf, one open, route-following, 44px indent, no hairline, counts mono; the
  active law survives: pink fills only, never burgundy); spacer; the bare manuscript row (the
  switcher popover now opens UPWARD from its low seat — judgement, flagged); two cream task
  pills (Urgent/House via `taskPills` — the ledger + quiet note superseded, Notes left the
  sidebar summary); the four-tile action strip on the existing captures (pink/sage/tan/tan —
  blue reserved for Pro) + mono caption; the Upgrade row ("Upgrade to Pro" supersedes option A;
  slate hover; hidden for Pro); the user block (avatar/name/plan only). The flat shell's tuck
  control, ⌘\ chord and `sa.shellSideTucked` key retired (collapse = open question, not built).

## Retired / unused wiring noted

- `weekOfQuerying` left the panel — **the derivation stays in `lib/dashboardStats.ts`** (the
  dashboard greeting still consumes it), as the pack instructs.
- **Task settings reachability gap:** the user block's Task-settings button left with the flat
  anatomy, and no capsule seat carries it. The sheet + its `sa:open-task-settings` listener
  still live in the To-do page, but nothing visible dispatches it. The mockup shows "Task
  settings" as a To-do page-header action — which is your open To-do-header call. Flagged, not
  freelanced.
- Off-nav: **Import** left the accordion (baked); it keeps a breadcrumb (`CRUMB_EXTRAS`) and its
  Queries-empty-state entry.
- Orphaned keys/files for a future sweep: `sa.shellSideTucked`, the `railTokens.test.ts` locks
  over the drawer-era `--rail-*` theme tokens (tokens still in index.css, consumer deleted).

## Interim chrome + one-of-each (Phases 4/5 verification)

`TodoShell`, `CrumbStrip`, `ChromeSlab`, `NavDrawer`, `DashTopBar`, `AgentsTopBar` and the
F12Page family remain deleted (nothing regressed). Page-body survivors stand: the To-do chip
bench + blue Pro sticker, Comps'/Packages' manuscript selector rows. **Every workspace route
renders exactly one rail, one panel, one top bar and one page header — except `/todo`, whose
header is still the focused-session hero (your open call).** The dashboard body below the
greeting header remains the pre-rollout layout (chip, four CTAs, minis, focus mechanics); no
page paints its own ground (the two `#FCFAF7` grep hits are in-page card fills on the legacy
`?view=landing` page and a Help-centre FAQ inset — content, not grounds).

## Needs a browser check

1. **Capsule scroll behaviour** — the stage scrollbar inside the plane's 20px radius; overscroll
   at the rounded corners; every route's internal panes (Queries, agent list) under the new clip.
2. **The accordion transition** (max-height 0→160px) — feel, and the route-sync when navigating
   via the rail vs the panel.
3. **Panel bottom-half spacing at short viewports** — the inner column now scrolls
   (`overflow-y` on `.sv2-side-inner`); check the upgrade row + user block don't crowd.
4. The centred wordmark at 30px — optical size against the mockup's intent (bump toward 40px if
   it reads small).
5. The manuscript popover opening upward; the pills' zero states; the tan tiles reading as a
   pair; the pink active fills against the shared capsule surface.
6. The ground grain at 3% — the canonical PAGE_GRAIN (slope .04) stands in for the mockup's
   .03 rect; swap if it reads heavy.
7. Mobile (<md): ground padding/radius stand down; slim bar + BottomTabBar unchanged.
