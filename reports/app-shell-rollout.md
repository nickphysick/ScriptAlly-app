# App Shell & Page Header Rollout — run report

**Branch:** `claude-il` (worktree `/Users/nickphysick/ScriptAlly-il`) · **Date:** 27 Jul 2026
**Reference:** `design-refs/scriptally-shell-v2.html` — the SUPPLIED mockup (found in `~/Downloads`, saved 27 Jul 09:52, copied into `design-refs/` in Phase 1). The design ref `design-refs/app-shell.md` is written against it, **not** spec-derived.

## Commits + gates

Every commit passed tsc `--noEmit`, `vite build` and the full Vitest suite (`set -o pipefail`).

| Step | SHA | Suite |
|---|---|---|
| Base merge (see below) | `5d02ab0` | 1635/1635 |
| Phase 1 — surface + spacing tokens | `f8093fb` | 1638 |
| Phase 2 — rail captions, tab tongue, masthead | `ff97a64` | 1646 |
| Phase 3 — sidebar nav, switcher, ledger, actions | `22b43cc` | 1655 |
| Phase 4 — PageHeader (full/compact/greeting) | `2c67bea` | 1661 |
| Phase 5 — adopt PageHeader on content pages | `d2661e0` | 1661 |
| Phase 6 — Queries Hub compact header + panes | `f38168d` | 1661 |
| Phase 7 — dashboard greeting header | `2a260f0` | 1661 |
| Smoke render (auth-gate mitigation, additive) | `ba988bd` | 1665 |
| Phase 8 — **SKIPPED** (see below) | — | — |

## Step 0 — what recon found (and the base merge)

- **The worktree was 214 commits behind main and 6 ahead** (the unmerged agent-list phases 1–6). The rollout map needs both sides (To-do/queries-v3 are main-only; the Contact list is agent-list-only), so with Nick's go-ahead main was merged into `claude-il` (`5d02ab0`; pre-merge tip `650e4b0`). Two conflicts, both unions: `Agents.tsx` (the agent-list wrapper supersedes the old F12 page wholesale — main's confirm-destroy wiring there died with the page it wired; the `cascade.ts`/`db.tsx`/`ConfirmDestroy` substance auto-merged intact) and `types.ts` (both sides' new optional Agent fields kept). **Consequence to know:** the agents page currently has NO agent-delete UI (the agent-list rebuild never built one; the guarded `deleteAgent` path is intact in `db.tsx`) — a product gap that pre-dates this pack, now visible.
- `main` can fast-forward onto `claude-il` whenever you want this to land.
- `fix/onboarding-trap` does **not** exist on the remote. `PaintMode` exists on neither branch (the rule-3 hazard is moot). The third worktree (`ScriptAlly-main`, on `queries-hub-v3`) is a stale checkout of an already-merged branch.
- **Red gates:** none tripped. Tree clean; no foreign WIP in shell files; and the `HubHeaderBar` gate could not trip because…

## HubHeaderBar inventory

**It was dead code.** The component rendered a `.qhbar` strip (Playfair title · optional `titleAfter` adornment · optional mono subtitle · one right slot) and had **zero render sites** — its two commented "users" (`SubmissionPackages`, `ComparableTitlesPage`) actually mounted `ChromeSlab`. The "two inline qhbar copies in `Queries.tsx`" were already gone (removed by the F12 rebuild). So:

- **Phase 6 deleted `HubHeaderBar.tsx`** (the locked-component retirement the pack sanctions) and corrected the two stale comments.
- **The `.t-capp .qhbar::after` Cappuccino inset frame was removed with its sole carrier, not re-scoped.** It had no live render site, so nothing visual changes; the flourish decorated a *card* bar, and the new compact header is an open header with a rule — no coherent home. If the hub ever regainss a Capp card masthead, reintroduce it scoped to that container (a note now sits at the old rule's site in `index.css`).
- Where its old *jobs* ended up: page title → `PageHeader`; the subtitle/pulse lines → dropped (see below); right-slot tools → header actions or relocated rows per page.

## What each page's header dropped / moved

| Page | Kept (max 2) | Dropped / relocated |
|---|---|---|
| Queries Hub | Export · **Log query** | **Import data** button dropped (sidebar Shelf › Import covers it). The contextual primary moved from the control bar to the **record header** (same derivation, composer-shortcut behaviour and Mark-sent anchor ref); the remaining verb row (View tasks / Edit / Nudge / Mark closed / links / ⋯ PDF / Delete) **stays in the control bar** — folding it into the record ⋯ was judged too much live popover wiring for this pass. The pane's plane ornament yielded its seat. The status pill now carries the real `StatusDot`. |
| Your manuscripts | **Add manuscript** | The "N manuscripts · M in submission" pulse line (no meta slot under the header law). |
| Package Workshop | none (description adopted from the mockup) | The title's **Pro pill** and the package-count pulse; the **manuscript selector** kept its function in a right-aligned row just below the rule (see follow-ups). |
| Help centre | none — deliberately zero-action | The "Knowledge Resource" eyebrow pill; the centred treatment (now the standard left-aligned header). **Browser-check whether the zero-action header reads right.** |
| Contact list (compact) | **Add new agent** (now the Form 11 primary — the dark pill retired per the no-dark-CTA law) | Its own crumb line (the v2 top bar draws crumbs) and the sub line "Everyone you're querying, watching, or saving for later." (compact omits descriptions). Claimed under Phase 5 because the rollout map assigns it Compact and no phase named it. |
| Dashboard (greeting) | Record a response · **Send query** | **Add agent / Add manuscript** — now covered by the sidebar's 2×2 action tiles. The centred hero treatment retired; chip + minis + the locked focus-slot mechanics untouched. `DashTopBar` retired (date → kicker, search + ⌘K → the v2 top bar, settings/account → sidebar); its file is now render-free — flag for the dead-code sweep with `Nav`'s desktop paths. |
| **To-do — SKIPPED** | — | The page's "header" is the **focused-session apparatus** (title crossfade to "In focus", ritual lines, the v9 progress row, the Begin CTA) from the just-landed session/panel-final work. A static header would break live choreography — the same collision grounds as Phase 8's skip clause. Needs your eyes before anyone touches it. |
| "Agents dashboard" / "Task settings" | — | **No such pages exist.** Task settings is a modal sheet off /todo (the sidebar's Task-settings button opens it via a new `sa:open-task-settings` window event — the tour-replay pattern). Reported as no-ops. |

## The masthead week number

**A real source existed:** `weekOfQuerying(queries, now)` (`lib/dashboardStats.ts`) — the account-level ISO-week derivation the dashboard greeting already renders (earliest `dateSent` anchor, "week one" floor, spelled ≤ twelve). The masthead kicker reuses it verbatim (CSS uppercases); it was **not** left empty and **not** wired to anything manuscript-scoped.

## Token duplication

As directed, the `--shell-*` custom properties live in `index.css` `:root` **and** as JS twins (`shell*`) in `designTokens.ts` — the same flagged duplication as the pink trio. `shellV2Tokens.test.ts` locks both homes to the baked values so they cannot drift. Two supersedes noted inline: the pack's table **wins over the mockup** on the rail hex (`#2e2622`, not the mockup's `#2b2622`); four chrome inks + one recessed fill (`--shell-ink/-soft/-muted/-inset`) are mockup-derived additions (the pack's table covers surfaces only).

## Phase 8 — skipped, per the pack's own clause

The premise ("filter chips move out of the global sidebar") doesn't match the tree: since panel-final P2 (26 Jul) the facet chips are the **chip bench in the TodoShell panel's context zone**, and the shell's collapse tier depends on the panel carrying them ("the filters ride the overlay for free"). `reports/todo-retoken.md` exists; the To-do surface is under active product review. Collision → skip → report, exactly as instructed.

## Needs a browser check (jsdom can't verify)

1. The Queries `.panes` height chain + the list/detail internal scroll after the header swap.
2. The sidebar's flexible spacer (Pro + user block pinned to the panel floor) and the tuck slide (width 288→0, ⌘\, rail-click untuck).
3. The tab tongue's -8px bleed meeting the sidebar edge.
4. Help centre's zero-action header.
5. The dashboard greeting left-aligned above the (unchanged) focus-slot split; the second rule (`sa-greet-div`) under the minis — retire it if it reads doubled.
6. Package Workshop's manuscript-selector row spacing under the header rule.
7. Interim double-chrome on pages not yet migrated: `CrumbStrip` still renders inside `contentVariant` slots (manuscripts/comps/packages/import/discover) under the v2 top bar's crumb — see follow-ups.
8. Reduced-motion + mobile (<md): the v2 chrome hides by class+media query; the slim bar + BottomTabBar should be byte-identical.

**Auth gate:** the chrome only renders signed-in, which the preview harness can't do — hence the static smoke render (`shellV2Smoke.test.tsx`) covering the render paths. Judge the pixels on dev.

## Deviations from the pack (all deliberate, none silent)

- **Action-tile keyboard hints omitted, not faked** — ⌘L/⌘R/⌘⇧A/⌘⇧M don't exist in the app and ⌘L is browser-owned. Define real bindings first.
- **Save-state chip is presentational** ("All changes saved") — no pending-writes source exists; wiring it honestly is a follow-up.
- The mockup's **Focus mode** and **command-palette overlay** appear in no phase — not built.
- The queries **verb row** stayed in the control bar (above), and the **Capp qhbar frame** was retired rather than re-scoped (above).
- Sidebar body text stays the app's Source Sans Pro, not the mockup's Inter (the long-standing app-wide decision).

## Follow-ups (not started, in rough order)

1. **Live-wire the sidebar manuscript switcher**: it persists `scriptally_active_manuscript_id`, but mounted pages read the key at mount — add a `sa:active-manuscript` event (or storage listener) so Packages/Comps react live, then retire their per-page selectors.
2. **Retire `CrumbStrip`** from the `contentVariant` slots (and `NavDrawer` + its triggers on desktop) once every page is under the v2 header — ends the interim double-chrome.
3. Dead-code sweep: `DashTopBar.tsx`, `F12Page`/`F12Account` (no consumers on /queries; TodoShell still uses `F12Account`), `AgentsTopBar`, old `SidebarShell` labs, `.agl-head/.agl-crumb/.agl-sub` css.
4. The To-do decision (Phase 5 skip + Phase 8 skip): how the session hero and the spine panel live inside the v2 shell.
5. CLAUDE.md's shell sections pre-date even the F12 era — a consolidation pass would save future sessions the archaeology this run needed.
6. Pro-line copy: option A is live; the mockup's B–F alternatives are in the ref if you want to swap.
