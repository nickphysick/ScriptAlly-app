# Chrome revision — Queries Hub + Contact List (2026-07-13)

A revision pass on the overnight build (see `reports/overnight-nav-hub-agents.md`); new file
rather than appending — the overnight report documents a different run and stays as its record.
Refs: `design-refs/queries-hub-v18.html` + `agents-contact-list-v7.html` (v14/v3 deleted in the
same commit that added them).

## Flags (read first)

- **Nothing incomplete** — all eight phases landed, gates green throughout (final: tsc clean,
  production build OK, **791 Vitest**).
- **`--pink-btn` / `--pink-btn-h` were missing**, as expected — added to `.t-f12`
  (`#f6cfc9` / `#f0bfb8`). The mockups' own omission had silently rendered their primary
  button transparent (an undefined `var()` does not error).
- **No other unresolved `var(--…)`:** a scripted audit of every custom property referenced by
  `f12.css`, `F12Shell.tsx` and the two pages' f12 markup (39 tokens) confirmed each resolves
  in `index.css`.
- **"Import data" found the existing importer** — wired to the Smart Import page
  (`onNavigate("import")`) on both pages. No second importer built.
- **A portal utility half-existed:** `useFixedMenu` (anchored `position:fixed`) is the
  codebase's mechanism — reused for positioning, combined with `createPortal(document.body)`
  per the spec. One wrinkle handled: the portal leaves the `.t-f12` scope, so the portal
  wrapper carries `t-f12` itself or every token would resolve to nothing.
- **"Idle" replaced outside the two pages:**
  - `src/lib/agentsPage.ts` — `agentsPulse` string → `· N not queried` (+ its locks).
  - `src/components/dashboard/StatCards.tsx` — the agents stat card pill (`{n} not queried`)
    and the idle-agent hover popup (chip `Not queried`; title fallback → `Independent`).
  - `src/components/dashboard/DashboardStatsRow.tsx` + `src/lib/dashboardStats.ts` — the
    agent-glyph hover now reads **`NO ACTIVE QUERIES`**, deliberately NOT "not queried":
    that derivation is most-advanced-ACTIVE-status, so a closed-only agent would be
    mislabelled "not queried". The word "idle" is gone either way.
  - `src/marketing/DashboardDemo.tsx` — the landing hero replica's `2 idle` → `2 not queried`
    (×2; no copy lock touches these).
  - Internal identifiers (`idleCount`, `idle_first`, state-machine `"idle"` phases) are not
    user-facing and were left alone.
- **Data bug (report only, not fixed in code):** at least one agent record has an all-caps
  name (`PRIYA RAMAN`) rendering shoutily in the list. Fix the record, not the renderer.
- **`#/pkg-lab` must still be removed before any prod deploy.**

## Phase log

| Phase | Commit | Files |
|---|---|---|
| 1 — refs + tokens + type bump | `4c0345e` | refs (v18/v7 in, v14/v3 out), index.css, f12.css, Queries.tsx, QueryTimeline.tsx |
| 2 — white top bar, account cluster | `c1dcae4` | index.css, f12.css, F12Shell.tsx, Queries.tsx, Agents.tsx |
| 3 — control bar rework | `bbb43a6` | Queries.tsx, Agents.tsx, f12.css |
| 4 — icon triggers + portalled popovers | `91d0698` | F12Shell.tsx, f12.css, Queries.tsx, Agents.tsx |
| 5 — list footers | `b304d52` | Queries.tsx, Agents.tsx, agentsHub.test.ts |
| 6 — drawer badges removed | `2defa9b` | NavDrawer.tsx |
| 7 — two-systems rule + vocabulary | `a5f0e7a` | Agents.tsx, f12.css, agentsPage(.test).ts, dashboardStats(.test).ts, DashboardStatsRow.tsx |
| 8 — sweep + this report | (this commit) | themes.md, StatCards.tsx, DashboardDemo.tsx, chrome-revision.md |

Every commit passed tsc + build + full Vitest (791) with explicit-path staging; the staged
file list is recorded in each phase's message.

## Phase notes

- **P1 type bump:** exactly the refs' override blocks — row names 14px, mono agency/dates/
  footers 9.5px, action buttons + popover rows 13px, list search 12.5px, journal body 13px,
  tracking titles 14px / subs 12px, materials 13.5px, wish-list strip 13px. Headings unchanged.
  Note: the new refs still carry the mockup sage `#d7ddd5→#d5dbd3`; the live-diary correction
  (`#dce0d9→#d0d6cc`) stands per the overnight standing decision.
- **P2:** header white (`--panel` + `--line` rule via the `.t-f12` crumb tokens — the strip
  component untouched); export/help/primary removed; right side = `F12Account` (pink initials
  avatar + full name → account, hover pill, focusable).
- **P3:** 56px bar. Left zone flush (padding-left 0): pink `Log a query`/`Add agent` + white
  `Import data`. Right zone inset 20px: verbs → `margin-left:auto` link group (Hub: Agent ·
  Manuscript stubs; Contact List: Website — opens the selected agent's site, disabled when
  none) → divider → PDF · Delete. View-tasks badge white/ink/hairline/`--sh-btn`. The
  triggers moved to the list head in the same commit (pill form, still functional) so filters
  never went unreachable between phases — the prompt's strict sequencing was softened to
  keep every commit fully working; flagged as the one deliberate deviation.
- **P4:** 36px `IconTrig` with value tooltips (`FILTER` / `SORT · LAST ACTIVITY` /
  `GROUP · NO GROUPS`), corner pink count on Filter, ink inversion while open. Popovers
  portalled + anchored (`useFixedMenu`); the pane's `overflow:hidden` clipping contract is
  untouched. Outside-click + Escape kept; first option focused on open.
- **P7:** rows carry real `StatusDot`s (≤3, live before closed, then `+N`); `NOT QUERIED`
  text only for never-queried; closed-door rows recede to muted grey (`title="Closed to
  queries"`) but stay clickable, selected returns to full contrast. Door toggle sage-open /
  pink-closed, redundant dot removed, wording always OPEN/CLOSED TO QUERIES. Filter copy:
  "Their door" / "Your history with them" (the history model widened to
  active / closed / never — closed = every query on file ended terminal). Sort → "Not queried
  first"; group → "Queried / not queried". No stars in rows (confirmed already true).
- **No new Firestore reads** anywhere in the pass (verified against the whole revision diff).
- **No composite-index risk:** every filter/sort/group is client-side derivation over data
  already in `DbProvider`.

## Follow-ups worth attention

- The ⌘K/global-search rehome (command palette) remains the standing follow-up from the
  overnight run; the list-head search is page-local.
- `DashTopBar` / `CrumbStrip` convergence (also carried over from the overnight run).
- The Hub's "Agent" / "Manuscript" link-group buttons remain disabled stubs pending the
  id-carrying nav bridge.
- `agentQueried` in `lib/agentsPage.ts` is now unused by the Contact List filter (the
  active/closed/never model derives inline); the lib export stays for other consumers.
