# Retired and re-pointed by Discover v1 (18 Oct)

Discover v1 replaced `/agents/discover` (`DiscoverNewAgents.tsx`, `agents/discover.css`, grid class `dv-wpg`, the shared
`PageHeader` panel) with a page-local set under `components/agents/discover1/` (grid class `dv1-wpg`, its own two-state
header, `data-own-header`). The sweep was scoped by **selector** (`dv-wpg`, `.dv-*`, `/agents/discover` in route tables),
not by filename.

## How the older suites were classified

All 26 suites that pass through `/agents/discover` were run against this branch's build and against the pre-pack base
(`origin/main` at `30439920`), test by test, on local previews:

| | this branch | base |
|---|---|---|
| failed | 68 | 65 |
| passed | 56 | 59 |
| skipped | 25 | 25 |

**65 reds are red on the base too** — masthead-era suites (`barBinding`, `chromeGround`, `compactHeader`, `contentGeometry`,
`engagement`, `gapAudit`, `headerFix`, `illoRules`, `inkShell` INK19/INK4, `mastheadMatrix`, `matrix`, `pageHeaderV1`,
`pageHeaderV2` §4.5/§4.6, `shellV2` B1–B3/L1, `slimBar`, `stickyRow`, `stripAudit`, `surfaceCensus`, `toolbarIsContent`,
`washEdges`, `headerPanelV2` P1/P7). They are not this pack's and are not touched beyond the route-table re-points below.

**Three were this pack's** (P6, the floor's share of it, J1), and each was answered rather than retired:

| Suite · case | What it said | Answer |
|---|---|---|
| `headerPanelV2` P6 (no jump) | Discover's header box grew 4px at 1280 between first seen and settled | **A real fault**: the book's title arrives after first paint in Special Elite, whose ascent grew the lede's line box. Fixed by drawing the title span from first paint as a transparent placeholder (a `line-height: 1` fix was tried and rejected: it moved the panel's text 2.5px off the mock at 1512). |
| `headerPanelV2` P1/P7 on Discover | "no [data-hpanel] on screen" for `/agents/discover` | **Re-pointed**: Discover left `hp2Lib.WORKSPACE` — its header is page-local and never the shared panel. It contributed 26 of the base run's 351 readings. The dead 1280 overflow exemption for the old page went with it. P6 for Discover is now Discover's own lock (`B1 · the coming-soon panel does not move when the books arrive`). |
| `headerPanelV2` floor | 251–271 readings against a floor of 320 | **Not this pack's, and recorded rather than touched.** The floor sums the ledger files on disk. P1 is red on the base too and writes a different number of rows run to run (152 and 172 here); the base run's floor passed only because P1 timed out before writing and the floor summed the ledgers committed to the repo (they still name `/todo/noteboard`, a route that no longer exists). |
| `qcV138` J1 (discs) | "/agents/discover has discs — 0" | **Re-pointed**: the coming-soon face (the prod gate) draws no initials by design; J1 now opens Discover's live face through the dev review aid, where the picks are. And the picks' discs were changed to `AgentDisc` (standing `none`) to obey J1's law — the mock's navy-for-strong discs were stray circles to it. 12/12. |

## Re-pointed (not retired)

- The grid class `dv-wpg` → `dv1-wpg` in the route tables of `barBinding`, `chromeGround`, `compactHeader`,
  `contentGeometry`, `headerFix`, `illoRules`, `slimBar`, `toolbarIsContent`, `washEdges`; `surfaceCensus`'s root.
- `headerV3` — `/agents/discover` left the TITLE pages; its header is page-local.
- `plateRoutes.OWN_HEADER_ROUTES` and `optedOut` (`OPTED_OUT`, `OPTED_OUT_ROUTES`) gain Discover.
- `qcV138` J1 — as above.
- Unit: `workspacePageGrid.test.tsx` (Discover moves to the opted-out set, 7 → 8; its CSS census reads `discover1.css`),
  `agentsPageSmoke.test.tsx` (the new page, both faces), `pageStructure.test.ts`, `planComparison` (comments),
  `sidebarCapture` SB9 (every `n` binding is page-scoped, not exactly one page).

## Retired

- `workspacePageGrid.test.tsx`'s ".dv-hero pads its own top" line — `.dv-hero` is deleted with the feature page; replaced by
  "the root states no padding".
- Nothing else: no e2e case was deleted.
