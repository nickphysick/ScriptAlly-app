# Query Centre v126 — §0 recon (5 Oct)

Worktree `/tmp/sa-qc126`, branch `qc-v126` off `origin/main` at `b6fa05ae`, level (0 behind).

## Red gates — none tripped

- Every reference and asset hash matches (12 enrolled + the two existing files, `be-hawk-head.png`
  `0da09ac0…`, `queryhawk-logo.png` `b34903c1…`).
- `openQueryDrawer` and its `dock` option exist (`src/lib/queryActions/drawerStore.ts`).
- The plate header is on main: `QcCentre` passes `plate` + `artFigure` (lines 154–159).

## Baselines (before any edit)

- tsc: 0 errors · `vite build`: clean (no error/warning lines) · Vitest: **516 files, 8,322 passed · 3
  skipped**. One file (`functions/src/email.test.ts`) first failed on a missing `functions/node_modules`
  in the new worktree — an environment artefact, linked and re-run green; not a tree fault.

## False premises found so far

1. **The page ground is not `#f5f1eb` today.** The shell's page is `--ws-page` = `#f7f4ee` (`rgb(247,244,238)`),
   redeclared `#f4f0ea` on the dashboard and on `ground-mode` routes (the Query Centre). `#f5f1eb` is
   mostly CREAM INK on anthracite (60+ uses); its ground uses are a handful of page-scoped variables.
   The sidebar IS `#e7e3dc` (`--shell-side`).
2. **The top bar already paints the page colour** (`.ws-pagebar { background: var(--ws-page) }`, quiet
   bar, 28 Sep) **and already carries the 1px rule** (`--shell-rule` = `rgba(28,19,15,.10)`, on at rest
   since 4 Oct). Phase 1 only moves the token.
3. **`--ws-ground` cannot move.** `marketingTokens.test.ts` locks `--mk-hero-ground` to equal it, and
   `src/marketing/**` is out of bounds. Its one app reader is `.ws-app`'s background; Phase 1 repoints
   `.ws-app` at `--ws-page` instead and leaves `--ws-ground` (and the marketing copy) as they are.
4. **The urgency groups have no "no date" group.** `attentionGroup` is overdue · upcoming · watch, and an
   undated query lands in "watch" (or "upcoming" when it is with you). The FACT is derived
   (`expectedMs === null`); the drawer's fourth group is built from it, without changing `attentionGroup`.
5. **The centred card already acts through `openQueryDrawer` with `dock`** (Query actions v1). What does
   NOT yet go through it on this page: the list tray's primary (`onAct` → opens the card) and the
   expanded view's nudge chip (`setBeNudge`, the old nudge flow). Phase 7 rewires those two.
6. **Empty state v8.1 has not landed** ("Let's log your first query" is nowhere in `src/`). Per the run
   order it should run first; this pack does not touch `QcEmpty` or its CSS, so they do not collide. Its
   pack (with the `empty-state-list-sample@2x.png` the earlier v8 run stopped for) is inside
   `qc-v126-pack.zip` under `empty-state-v8-1/`.

## §0.1 — main since `ca664bd`

Two commits, Agent card v1 1/7 and 2/7 (`c87c866f`, `b6fa05ae`); neither touches `src/components/queries/`
or `src/components/shell/`. v96.1 (`3a420a1`) is an ancestor.

## §0.2 — the shell's colours

| Surface | Declared | Value today |
|---|---|---|
| page (`.ws-main`) | `index.css` `--ws-page-rgb` | 247,244,238 |
| page on dashboard + ground-mode | `workspaceShell.css:1301` | 244,240,234 |
| QC window | `qcvPage.css:422` `--ws-window` | #f4f0ea |
| behind the shell (`.ws-app`) | `workspaceShell.css:573` `--ws-ground` | #f7f4ee |
| sidebar | `index.css:347` `--shell-side` (+ `designTokens.ts` `shellSide`) | #e7e3dc |
| top bar | `.ws-pagebar` → `var(--ws-page)` | = page |

**Hard-coded neutral grounds** (to route through the tokens): `oneScreen.css --dash-page`,
`queryCard.css --qcard-page`, `framedCard.css --fc-page`, `msv12.css --msv12-page`, `livingExhibit.css`
fade (`rgba(245,241,235,…)`), the To-do sheets' `--ground:#f7f4ee` (`taskList`, `taskPane`, `todoFrame`),
`Onboarding.tsx` overlay `rgba(247,244,238,.72)`, `designTokens.ts onbGround`.
**Not grounds, unchanged:** every `#f5f1eb` used as text/ink on anthracite (`--sp-cream` and ~60 literal
uses across qcv*, contactV11, oneScreen, queryDrawer, beAccent), keycap/hover surfaces
(`shortcutsSheet --sks-cap-bg`, `qcvPage .qcv-menu [aria-checked]`, `qcvModal` close disc), the To-do
calendar's task tint, the StatusDot demo swatch.
**Out of bounds, unchanged:** `queryDrawer.css --qad-page` (queryActions internals), `agentCard.css
--ac-hover` (Agent card v1, mid-flight), `src/marketing/**`.

## §0.3 — the map

| Region | Today | Fate |
|---|---|---|
| plate | `PageHeader plate` via `QcCentre` | **retired on QC** (plate path kept for others) → new band |
| desk | `QcCourts` | **kept**, re-pointed at the carousel |
| fan | `QcFan`, `qcFan.css`, `lib/qcFan`, `lib/qcFanModel` | **retired** (carousel replaces it) |
| list head | `QcSentence` (Find · Filter · Group · Sort) | **restyled**, re-housed in the open banner |
| rows | `QcList` (v96 rows + tray) | **kept**, inside the blush workspace |
| rail | `QcRail`, `QcBirdsEye` (rail dress) | **retired** |
| expanded view | `QcExpanded`, `QcTimeline`, `QcCalControls`, `QcMenu` | **restyled** into the half-screen drawer (engine kept) |
| open query | `QcQueryModal` + `QcOpenCard` | **kept** (the one centred card) |
| page guide | `PageGuide page="queries"` | **kept** (step text naming the rail needs updating) |
| hover tray | inside `QcList` | **kept**, actions rewired to the drawer |
| action drawer | `openQueryDrawer` → `QueryDrawer` (App.tsx) | **called**, not changed |
| undo | `UndoBar` (`UNDO_MS` 8000) | **called**, not changed |
| query card | `dashboard/QueryCard` + `QueryCardLive` | **kept**, gains the landing dress for the carousel |
| footer | `MarketingFooter` + `lib/companyInfo` (`FOOTER_TAGLINE`, `SUPPORT_EMAIL`) + `marketingMarks` (`StatusGlyph`, `STATUS_GLYPH_COUNT`, `PaperPlane`) + `brandArt` (`BRAND_MARK`) | **new** `AppFooter` reusing them |

## §0.4 — the derivations

| Fact | Where |
|---|---|
| court (with you / agent / closed) | `qcSummary` `tileCourt`, `courtTiles`, `rowsForTile`, `courtFilter` |
| your move (incl. agent stages past expected) | `qcSummary` `isWithYou` + `pastExpected`; the list's own groups `qcCalView.listGroups`/`URGENCY_GROUPS` |
| next-move verb | `qcComingUp` `comingUp`/`COMING_VERB`, `qcSummary` `primaryActionLabel`, `lib/queryActions/entry` `cardDoors`/`rowDoors` |
| urgency groups | `qcBirdsEye` `attentionGroup` (3 groups — see premise 4) |
| stage name | `qcSummary` `STAGE_NAME`, `stageOrder` |
| last moved | `QcRow.lastMs` (`buildQcRows`) |
| bar dates, previous stage | `qcStages` `stageHistory` (spans), `qcTimeline` `tlRow` |

## §0.5 — deep links and keys

`?q=` opens the centred card; `?view=calendar|cal` opens the Birds-eye view (`readBirdsEyeOpen`).
Nothing on the route binds **b** or **t**. ←/→ are bound only inside `.qcv-stage` (stepping the open
query, skipped on the calendar's scroller). Escape: the stage (closes an open query), `QcFan`, `QcMenu`,
`QcExpanded` (one cascade handler), `QcQueryModal`.

## §0.6 — the drawer

`DrawerMode` = log · resp · sent · nudge · close · offer · edit; `DRAWER_LIVE` true for all seven; `dock`
is a field of every request. Presets: `closeWhy` ("noreply" | "withdraw" | "gone"), `nudgeTab`, `step`.
