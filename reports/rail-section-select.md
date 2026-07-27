# Rail selects a section — run report

**Branch:** `claude-il` · **Date:** 27 Jul 2026 · Follows `reports/rail-flyouts-headers.md`.
Behaviour-only, as instructed — the sole visual change is the removed expand control.

## Commits + gates

Both commits passed tsc `--noEmit`, `vite build` and the full Vitest suite (`set -o pipefail`).

| Phase | SHA | Suite |
|---|---|---|
| 1 — rail selects a section | `166cd84` | 1627/1627 |
| 2 — dedicated expand control removed | `a1b9cb1` | 1627/1627 |

**Not deployed** — dev runs the pre-pack build (`aefcaad`).

## How single- vs multi-destination was derived

Purely from the nav config, no hardcoded list: `railClickPlan(ribKey, pathname, collapsed)` in
`shellV2Nav.ts` counts `SHELL_SECTIONS` pages — Querying (3), Agents (2), Shelf (2) derive as
multi-destination and BROWSE; Dashboard derives as single and navigates. The whole behaviour
table is locked as pure tests (no DOM simulation needed), including "clicking the section you
are already in still browses" and "no plan ever collapses / no collapsed click no-ops".

**The one flag — Setup.** The pack's table lists Setup among the section icons, but **the
accordion has no Setup section**: the config models Setup as one configured path (`/account`),
with its multiple destinations living only in the flyout. Restructuring the config (adding a
Setup accordion section — also a visual change this pack forbids) was exactly the red-gated
move, so Setup derives as the config states: **single-destination, navigates to /account**
(and expands-when-already-there, symmetrically with Dashboard). If you want Setup to browse,
say the word and the accordion gains a Setup section (Account · Task settings · Help) — a
small config + panel change.

## Auto-collapse is not triggered by section clicks — confirmed

Auto-collapse observes the pathname; browse clicks never navigate, so it cannot fire. Choosing
a page from the browsed panel navigates and the existing collapse-on-navigate closes it — the
browse lifecycle needs no extra collapse of its own.

## The mechanics

- **The browse channel:** AppShell holds `{sec, n}` (n bumps so repeat clicks re-fire) and the
  sidebar steers `openSec` from it. The rail highlight is untouched — pathname-derived only, so
  browsing Agents from the Dashboard leaves Dashboard lit while the accordion moves.
- **Abandon-a-browse:** Escape closes the expanded panel *however* it was opened
  (`defaultPrevented` respected; no focus trap exists to fight). A pointer-down into page
  content — outside both the panel and the rail (rail clicks are section switches, not
  abandonment) — collapses only rail-initiated browses. **Any collapse snaps the accordion back
  to the current page's section** via one sidebar effect, so the panel can never drift from the
  user's location.
- ⌘\ still toggles both ways; the manual toggle ends any live browse.

## The judgement call — discoverability without the expand control

Built as specified. My honest read: **borderline but defensible.** The collapsed rail now has
no persistent expand affordance — a user discovers expansion by hovering (the flyout footer's
"Expand sidebar · ⌘\", now load-bearing) or by clicking a section icon, which produces the
expanded panel as a side effect of browsing — and that second path is the redeeming feature:
the natural exploratory click teaches the mechanism. The risk case is the user who wants the
panel open *without* changing their browsing context on Dashboard-with-flyouts-unhovered; they
have ⌘\ only. If real use shows people hunting, the one-line remedy: add "Expand sidebar" to
the rail's Dashboard/brand tooltip, or restore a slim affordance at the rail foot.

## Needs a browser check

1. **Expand-without-navigating feel** — section click from collapsed: the panel slides open
   with the right section open and no route change; repeat clicks on other sections switch
   cleanly while expanded.
2. **Abandon-and-snap-back** — expand via rail, click into page content: the panel closes and
   the accordion is back on the current page's section next time it opens; same after Escape.
3. **Escape interplay with overlays** — a modal that closes on Escape without preventDefault
   will also collapse an expanded panel behind it (accepted edge; check it doesn't surprise).
4. **On-Dashboard Dashboard click** — expands with the Dashboard row lit and no section open.
5. The flyout footer as the expansion advert — confirm it reads, since it now carries the job.
