# Capsule shell fixes — run report

**Branch:** `claude-il` · **Date:** 27 Jul 2026 · Follows `reports/capsule-shell.md`.
Spec-derived amendments (Nick's 27 Jul browser review) — the mockup predates them;
`design-refs/app-shell.md` carries the deltas at its head and was updated as each landed.

## Commits + gates

Every commit passed tsc `--noEmit`, `vite build` and the full Vitest suite (`set -o pipefail`).

| Phase | SHA | Suite |
|---|---|---|
| 1 — nav active state = ground token | `ddff879` | 1620/1620 |
| 2 — collapsible panel, persistent | `6eeef75` | 1621/1621 |
| 3 — desk group 26px rhythm | `aa93086` | 1621/1621 |
| 4 — save-state chip removed | `09e3d80` | 1621/1621 |
| 5 — FocusShell retired | `c1870e9` | 1621/1621 |

**Not deployed** — dev runs the pre-fixes capsule build (`b58a9fe`).

## The FocusShell inventory and where each route landed

| Route | Page | Old chrome beyond the shell | Landed |
|---|---|---|---|
| `/account` | `AccountSettings` | FocusShell bar (wordmark, crumb, back link, avatar) + its own h1/sub | Capsule shell · `.sv2-focuscol` (the 860px measure kept) · **PageHeader full** "Account settings" with its sub as the description; the internal tab rail + forms moved unchanged |
| `/plans` | `PlansPage` | FocusShell bar + its own centred italic hero + mono strapline + **a bespoke `pageGround` + fixed grain overlay** | Capsule shell · `.sv2-focuscol` · **PageHeader full** "Choose your plan"; the hero + strapline dropped (not restyled) and the bespoke ground/grain removed per the capsule law; plan cards unchanged |
| `/help` | `HelpCentre` | FocusShell bar only (the page already used PageHeader) | Capsule shell · `.sv2-focuscol` — re-homed as-is |

**Red gate: none tripped.** `PlansPage` declares itself "visual layer only: no billing, no
Stripe, no entitlement"; Account's "Manage billing" is a coming-soon stub. No mid-checkout or
mid-payment route exists. `FocusShell.tsx` is **deleted** (with `focusCrumb`); the tier model
is now marketing | workspace, locked in `routeTiers.test.ts`. The shell census: **capsule
(signed-in) · marketing (logged-out) · onboarding (outside, untouched)**.

## The five deltas, as landed

1. **Nav active = ground** (`#e7e0d5`) across the rail ribs, the flat Dashboard row and the
   accordion children — ink text, burgundy icon, radii unchanged; hover stays the interior
   fill. Pink is retired from nav states; the Step-0 census confirmed the only other
   `var(--pink)` consumers are the PageHeader primary button and the Log-query action tile —
   content accents, untouched.
2. **Panel collapse** — the rail IS the collapsed state (the deferred rail question, resolved;
   no flyouts). Tuck toggle (two-pane glyph) top-right of the panel on the brand mark; the same
   glyph appears in the rail beneath the brand glyph while collapsed. `⌘\` toggles —
   registered at SHELL level, not beside the top bar's ⌘K, because that registration stands
   down on /todo and the chord must work everywhere (deliberate, reported deviation from the
   pack's letter). Persistence: `localStorage["sa.shellSideTucked"]` — the `sa.` UI-pref
   convention, deliberately REUSING the flat shell's orphaned key. The hide is a CSS
   width/opacity/margin transition on the container's `sv2-collapsed` class (no JS timers); the
   negative margin swallows the capsule gap so the content plane widens by 288 + 14px.
   Identical on every routed page, including the three migrated ones. Structural locks in the
   smoke test.
3. **Desk group rhythm** — 26px between manuscript row → pills → action strip → upgrade row;
   caption 9px and user-block 14px + hairline unchanged; the flexible spacer still separates
   nav from desk and gives way first.
4. **Top bar** — crumb left, search right, nothing else. The chip was placeholder chrome with
   no save-state source, so nothing but chrome left.
5. **One shell** — above.

## Also in this pack

- The rail's **Setup rib now lights** on /account, /plans and /help (`SHELL_SETUP_PATHS`), and
  those routes carry Setup crumbs via the restructured `CRUMB_EXTRAS` (rail-neutral; Import
  keeps its Shelf light). The help FAB hides on /help itself.
- Tier crossings no longer unmount anything — only the marketing boundary remains; workspace
  page-local state now survives visits to Account/Plans/Help (previously reset by design).

## Needs a browser check

1. **Active-vs-hover tone distinction** — ground `#e7e0d5` active beside interior-fill
   `#f2ede7` hover are adjacent tones; report if they don't read distinct (the pack anticipates
   this may need a nudge).
2. **The collapse transition** — the slide, the content capsule's widening reflow (panes,
   Queries desk, agent grid), the rail toggle appearing/disappearing, ⌘\ from every route, and
   the persisted state on reload.
3. **Desk-group spacing at short viewports** (~720px) — nothing should clip; the spacer gives
   way first, then the panel's inner column scrolls.
4. **Each migrated page's first render in the capsule**: Account (header + tab rail in the
   860 column), Plans (on the capsule surface now — the kraft glow ground is gone; check the
   MountPanel cards still read raised), Help (unchanged internals, new home).
5. The Setup rib light + Setup crumbs on the three routes; the FAB's absence on /help.
