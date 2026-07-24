# To-do — the hardback spine (rail + panel navigation)

The sidebar's final architecture: a full-height ink rail carrying the app's categories, a
parchment panel carrying the active category's pages + the current page's context, and the
breadcrumb bar joining the panel as one cream page inside the dark spine. Supersedes the
single-column sidebar from the workspace-shell + polish packs. Ref: `todo-fix54.html` →
`design-refs/spine-shell.html` (the hardback-spine board only — the ivory board is the rejected
alternative, not built).

## Commits

| Phase | SHA | Suite |
|---|---|---|
| the ref (fenced, first board normative) | `448d962` | — |
| P1 — the ink rail (+ the spine structure) | `999cf73` | 1526 |
| P2 — the parchment panel (context + polish) | `8dba268` | 1526 |
| P3 — the bar joins the page (the cream L) | `4cba92f` | 1527 |
| P4 — session + width tiers | `f4c53d6` | 1527 |
| P5 — the sweep + this report | `<this commit>` | 1527 |

Gates green per commit (`tsc` + production build + full Vitest, pipefail); explicit-path
staging. The shell's own suite is `todoSpineShell.test.ts` (the old `todoWorkspaceShell.test.ts`
is retired).

## Phase 0 — recon findings

- **Sidebar component:** the single-column `TodoShell` (`.tsh-nav`, 212px) with drawer-grammar
  tokens — rebuilt wholesale into the spine.
- **Brand relocation (centring P2B):** the mark `/scriptally-logo-new.png` + the `ScriptAllyLogo`
  wordmark both sat in one `.tsh-brand` button — relocated: mark → rail head, wordmark → panel
  head.
- **Session nav mounts:** `EXIT_LEFT = ".tsh-nav"` via `.tsh-clearing` — retargeted to
  `.spine-panel` / `.spine-clearing` (the rail persists).
- **HubHeaderBar approach:** not in the To-do path — the shell draws its own `.tsh-bcbar`; the
  "wrapper approach" is the shell painting its own bar tokens. HubHeaderBar untouched by
  construction.

## What shipped

- **P1 — the ink rail.** 54px, full height, owning the top-left corner (renders first, beside
  everything incl. the bar). Ink `#2a1a13` / rule `#1d100c`; the real logo mark at its head, then
  the categories as icon buttons (Dashboard · Querying · Agents · Manuscripts) with Settings at
  the foot. Each routes to its category's default page (Querying → Queries Hub) and reflects the
  current route; each has a tooltip, `aria-label` and `aria-current`. **Active = the ink-native
  `#4a3226` square** with the icon in cream `#f3e7da` — the rail's equivalent of the
  parchment-highlight law (there is no parchment there). Never burgundy.
- **P2 — the parchment panel.** 196px, `#f5f0e8` / rule `#e0d6c6`. The wordmark at its head; a
  mono category label + the pages (icon + label + count: Queries Hub → live queries, To-do →
  board total); then the context zone — a ruled mono label (`TO-DO · FILTERS`) + the migrated
  filter rows, sitting flush on the panel's own metrics and warm tokens with every reactive
  behaviour intact (counts, zero-dimming, struck totals, the query chip). Active law = the warm
  `#e6ddcf` fill, fill only. Foot: Task settings + Help centre.
- **P3 — the bar joins.** The bar wears the panel's *own* `--spine-pan` fill and `--spine-pbd`
  rule (the same tokens, so the corner has no seam and a retone moves both), spanning only the
  content region right of the panel — panel + bar as one cream L. HubHeaderBar untouched
  (asserted: the page never mounts it; its source carries none of this pack's identifiers).
- **P4 — session + tiers.** In a session the panel leaves the flow (absolute against the now
  position-relative root) so the content region reclaims its 196px — the v9 curtains + centred
  column recompute against the region right of the *rail* — then the panel slides off left; the
  rail persists as chrome; on exit the panel returns to its flex slot. Below `--tsh-collapse`
  (1100px) the panel collapses to a rail-triggered overlay: tapping the active rail category
  opens it over a scrim (`aria-expanded`), the others still route; dismiss on scrim outside-click
  or Escape; the To-do filters ride the overlay, so they stay reachable. No hamburger.
- **P5 — the sweep.** The `.tsh-nav` single-column sidebar CSS, its drawer-grammar tokens, and
  the collapsed filter-drawer (`.tdb-fdrawer`/`-fdpanel`/`-fdscrim`/`.tdb-fbox`/`.tdb-rsech`) are
  extinct (grep-locked). `themes.md` gains "The hardback spine (settled)". The tour retargets: a
  new **category-rail step** (`.spine-rail`) leads, and the filters step points at the
  panel (`.tdb-fpill`, the dead `.tsh-filtericon` dropped) — seven stops.

## In-browser script (dev)

1. **The ink spine, full-height** on the left, the real logo mark at its head; the categories as
   icons with Querying lit (the ink square), Settings at the foot.
2. **The cream L**: the parchment panel + the breadcrumb bar read as one continuous cream page
   inside the dark spine, no seam at their corner.
3. **Category switching** — hover the rail icons (tooltips); the active one is the ink square.
   (Clicking Agents/Manuscripts routes away; Querying holds the To-do context.)
4. **The panel** carries the wordmark, Querying's pages (Queries Hub · To-do with counts), then
   `TO-DO · FILTERS` and the filter rows — which **react** (click a filter, watch the counts,
   the struck totals, the query chip).
5. **A session**: Begin — the panel slides off left while the **rail holds**, the content
   region widens to the rail edge, the curtains close over it; Back — the panel returns.
6. **Narrow window** (< 1100px): the panel collapses; tap the Querying rail icon to open it as an
   overlay over a scrim; the filters are inside; click the scrim or press Escape to dismiss. The
   rail never leaves; no hamburger.

## Deviations (flagged)

- **"category icons (TypeGlyph)" → lucide.** TypeGlyph is locked to the three material
  `ComponentType`s and can't render category icons; as in the polish pack, the rail uses
  `lucide-react` (LayoutGrid · Send · Users · Book · Settings). No locked component edited.
- **The panel foot is Task settings + Help centre; the account stays in the bar.** The pack's
  Phase 2 names "the user block" in the panel foot and Phase 3 keeps "breadcrumb + user" in the
  bar; the normative ref (first board) shows the account solely in the bar and Help in the panel
  foot. To avoid double-mounting the avatar — and because dropping Task settings would break the
  settings-sheet entry (a halt condition) — the panel foot keeps the existing Task settings +
  Help utilities and the account stays in the bar.
- **The atomic build.** Rail + panel + bar are one inseparable 3-column component, so the
  structure landed in P1; P2–P4 deepened each zone (context flush-fit, the L continuity lock, the
  session panel-reclaim + the overlay trigger) as real slices. Each commit is green.
- jsdom mounts nothing: geometry, tokens, routing and the tiers are source/rule-text locks; the
  pixels are the in-browser script.

## Close

**The shell is architecturally final.** The queue: dev deploy → prod sequencing pass →
Correction UI.
