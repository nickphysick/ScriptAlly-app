# Shell follow-up — run report

**Branch:** `claude-il` · **Date:** 27 Jul 2026 · Follows `reports/app-shell-rollout.md` (`f8093fb → 2a260f0`).
**Refs:** `design-refs/scriptally-shell-v2.html` + `design-refs/scriptally-page-background.html` (scheme 1 "Raised light" — copied in from Nick's supplied file with Phase 1).

## Commits + gates

Every commit passed tsc `--noEmit`, `vite build` and the full Vitest suite (`set -o pipefail`).

| Phase | SHA | Suite |
|---|---|---|
| 1 — canvas scheme, bespoke backgrounds removed | `12aaad1` | 1666/1666 |
| 2 — dashboard body revert | `4bf3342` | 1666/1666 |
| 3 — interim chrome retired | `84063a8` | 1617/1617 (era-locks retired with their subjects) |
| 4 — brand mark in the masthead | `0915810` | 1617/1617 |

**Not deployed** — dev (scriptally-dev) still runs the pre-follow-up build (`d618326`); say the word for a fresh dev deploy.

## Phase 0 recon outcomes

- **Brand asset (red gate NOT tripped):** the masthead replaces a *wordmark*, and exactly one live wordmark exists — **`public/scriptally-title-v2.png`** (2400×750 PNG) rendered by the canonical height-locked `ScriptAllyLogo` component. Chosen; no SVG exists, and 2400px is amply 2× at the 22px render height. Flags, not candidates: the two icon *marks* are inconsistently sourced (`scriptally-logo-new.png` 500² in the old chrome vs `scriptally-logo-v2.png` 750² in mobile Nav/onboarding — unify some day), five orphan brand PNGs sit in `public/` with zero references (`scriptally-title.png`, `scriptally title for holding page.png`, `corkboard splash.png`, `desk frame.png`, `Sent queries final.png`), and marketing renders a CSS monogram + text, no image at all.
- **Dashboard revert (gate NOT tripped):** P7's below-the-rule delta was cleanly separable (the four-CTA row, two pruned props/icons, a `textAlign` override) — reverted without touching the header.
- **Bespoke backgrounds found:** dashboard `var(--desk)` (the named taupe violation), the `contentVariant` slots' desk paint, Queries' `--oat` root, Package Workshop's desk root, `.msv1`'s desk, the agent list's white `.aglist`, Import's hardcoded `bg-[#FCFAF7]`.

## Phase 1 — the canvas

The canvas is painted **once, on the stage** (`var(--shell-canvas)` #faf6f2); every ground above was removed — pages inherit, none sets its own. New `--shell-panel` #f5efe8 (+ JS twin) for in-page grouping surfaces; **the depth law is lock-tested by relative luminance: card > canvas > panel > sidebar** (`shellV2Tokens.test.ts`). The tokens `--oat` / `--agl-paper` / `--desk` survive for in-page elements that read them. Nav active state: unchanged value (#faf6f2 fill + line ring) — still reads against the sidebar; on the browser list. Comps' in-page `--ct-desk` bands were left (in-page surfaces, migrate opportunistically) — flagged.

## Phase 2 — dashboard

Below the greeting header's rule everything is pre-rollout again: centred body, attention chip, the **four CTAs** (the header's two actions coexist until you pick which two survive — your open call), minis, the locked focus-slot mechanics. `DashTopBar` stays retired. The diary block's **Cappuccino** panel surface adopts `var(--shell-panel)` (Bold Pastille + Editorial untouched, per the do-not-change rule).

## Phase 3 — interim chrome (the priority)

| Layer | Disposition |
|---|---|
| **TodoShell** (the second shell on /todo) | **Deleted** — rail/wordmark/section nav/crumb bar/collapse tier all provided by the v2 shell. `todoShell.css` survives **trimmed** as the token + style home for the two survivors; the page root keeps the `spine-root` class as the token carrier. |
| **CrumbStrip** (the old header bar with the second hamburger + logo) | **Deleted** — removed from the `contentVariant` slots (manuscripts, comparable titles, import, discover, packages); the v2 top bar draws the one breadcrumb. |
| **ChromeSlab** | **Deleted** — Comps, Discover and Import migrated to the standard `PageHeader` (full). Their pulse/meta lines dropped (no meta slot under the header law): Comps' `{age} {genre} · N comps · M in your query`, Discover's `Ranked matches · N agents · Last checked …`, Import's `CSV MIGRATION DESK`. |
| **NavDrawer** | **Deleted** — its last trigger left with CrumbStrip (DashTopBar's died in P7; the mobile bars never used it). Provider/state removed from AppShell. |
| Dead dependents | **Deleted:** `DashTopBar.tsx`, `AgentsTopBar.tsx`, and F12Shell's `F12Page` / `Icirc` / `F12Primary` / `F12Account` exports (IconTrig/popovers/menu/chips stay — Queries + the timeline consume them). |

**Controls left in the page body (no home in the shell, per the pack):**
- The To-do **chip bench** — one mount, seated above the board (`.tdb-benchseat`), grammar and single-facet selection model unchanged.
- The **blue Pro sticker** — beside the bench, still opening the assistant preview (richer than the sidebar's plain Pro line, so both exist — a copy/UX call for you).
- **Comps' manuscript selector** — in a row below its header rule (the Packages precedent; both retire when the sidebar switcher is live-wired).

**One-of-each verification:** every workspace route now renders exactly one rail, one sidebar, one top bar and one page header — **except `/todo`**, whose "header" remains the focused-session hero (your open call, deliberately untouched). Focus-tier routes (/account, /plans, /help) run FocusShell by design, outside the workspace chrome.

**Era-locks:** `todoSpineShell.test.ts`, `crumbStrip.test.ts`, `mastheadHub.test.ts` deleted with their subjects; workbench/polish/panel-final/task-settings/assistant-promo locks retargeted to the relocated truth (the bench/sticker locks survive nearly verbatim). Suite settles at 1617.

## Phase 4 — brand mark

`ShellV2`'s masthead renders `<ScriptAllyLogo heightPx={22} />` in place of the Playfair text — height-constrained, aspect preserved, `alt="ScriptAlly"` inside the component, no restyling. Ink rule + mono kicker untouched.

## Browser checks (jsdom can't verify)

1. The single canvas across every route — especially the dashboard (taupe gone), Queries (oat gone), agents (white gone), manuscripts/comps/packages/import (desk gone) — and that no seam shows where `CrumbStrip` used to sit.
2. The To-do page rebuilt around the v2 shell: the bench + sticker seat above the board (placement is a judgement call — move them if they read wrong), the board container's new panel tone, the focused session entering/exiting without the old panel slide, and the page scroller (`.tdb-wrap`) behaving inside the new root.
3. The dashboard: four CTAs back under the header's two actions (the duplication is interim), the diary on the panel tone, the focus-slot split unchanged.
4. The masthead wordmark at 22px — crispness and optical alignment with the tuck control.
5. Comps/Discover/Import under their new PageHeaders; Comps' selector row spacing.
6. Mobile (<md): unchanged by design — slim bar + BottomTabBar; confirm nothing regressed with NavDrawer gone.

## Loose ends / follow-ups

- Comment rot: `App.tsx:612/628` still narrate the F12Page/CrumbStrip era (comment-only; App.tsx deliberately untouched this pack).
- Dead CSS awaiting a sweep: f12.css's `f12-hdwrap/hdtools/icirc/primary/f12-who/av2/nm2`, the inert `--hub-mast-*` tokens, `.agl-head/.agl-crumb/.agl-sub`.
- The five orphan brand PNGs + the two-mark drift (above).
- Still open, yours: the To-do header, Agents' eight actions, the dashboard's four CTAs, the manuscript switcher wiring, ff-forwarding `main`.
