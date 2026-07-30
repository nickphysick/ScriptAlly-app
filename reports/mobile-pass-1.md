# Mobile Pass 1 — chrome + core surfaces at <768px

Run date: 30 Jul 2026. Ref: `design-refs/mobile-concept-v1.html` (normative for structure/arrangement; illustrative for colour — every colour in the build reads live tokens). Breakpoint law: `md` (768px) is the single mobile/desktop divider; ≥`md` is pixel-identical to the pre-pass state.

---

## Phase 0 — Recon

### Tree + streams — NO RED GATE

- Tree **clean** at `797277b` (= `origin/main`). No PaintMode block exists in `App.tsx` any more — the caveat in the brief is moot; nothing to avoid staging.
- One other worktree exists (`../ScriptAlly-il`, branch `claude-il`, same commit) — no live WIP in this checkout's scoped files.
- **Shell stream: LANDED.** The bar-and-panel packs are on `main` (`1c16f64` brand-appears-once, `7f3f383` foot fade, plus the canonical/palette/panel-foot packs behind them). The outer-gap token is live at 14px — note it is named `--shell-cap-gap` in this repo (`src/index.css:88`); the packs' `--shell-gap` is the same token, one owner (`.sv2-app { padding/gap }`, `shellV2.css:13`). Red-gate condition not met.
- Concept file present in Downloads (44,009 bytes, 555 lines) → committed as `design-refs/mobile-concept-v1.html` with the normative/illustrative header.

### P1 mobile nav autopsy (commit `785be06`, 25 Jun)

What P1 built: `BottomTabBar.tsx` (fixed, full-width, `#fdfaf5`, pink active pill + burgundy ink), the `Nav.tsx` slim bar variant (wordmark · search icon · bell · you-menu), `NavSearch variant="mobile"`, `viewport-fit=cover`, `pb-[76px] md:pb-0` stage clearance, Queries `md:ml-[262px]`.

What survives under the capsule shell (all verified live):

- `BottomTabBar` still mounts (`shell/AppShell.tsx:409`) and functions — route-driven active via `routeKey`, Queries tab passes `"Query database"`. Styling is the **old pre-capsule language** (full-bleed bar, pink pill, burgundy ink — now contradicting the nav active law *and* the capsule idiom).
- The slim `Nav` still mounts inside the content capsule (`shell/AppShell.tsx:330-332`, `md:hidden`). Its search icon opens the command palette (the P1 inline NavSearch row is retired with NavSearch itself). Bell + `TasksDropdown` and the you-menu dropdown still function.
- `viewport-fit=cover` intact (`index.html:5`). Stage clearance `pb-[76px] md:pb-0` intact (`shell/AppShell.tsx:345`).
- The Queries `md:ml-[262px]` offset is **gone** (that layout died with the sidebar-shell era) — nothing to migrate.

What the capsule shell broke or left dead:

- `Nav`'s scrolled-divider listens to `window.scrollY` (`Nav.tsx:241-245`) — the window never scrolls now (the stage does), so the divider logic is dead.
- The slim bar renders *inside* the content capsule but styles itself as the old kraft page bar — visually orphaned from the capsule idiom.
- `BottomTabBar` sits at the browser edge while desktop chrome floats as inset capsules — the exact "fixed furniture measures from the browser edge" mismatch the shell laws warn about.
- Nothing was deleted outright → **no red gate**; degraded-but-functional, as expected.

### Chrome tokens (the build's palette — `src/index.css:52-116`)

| Token | Value | Mobile use |
|---|---|---|
| `--shell-ground` | `#e7e0d5` | screen ground; tab active pill (nav active law) |
| `--shell-side` | `#f8f4ee` | tab-bar capsule fill (the ref's `--panel`) |
| `--shell-canvas` | `#fdfbf8` | content capsule + sheet surface |
| `--shell-inset` | `#efe8df` | interior fills (count pills etc.) |
| `--shell-cap-border` | `1px solid #d8ccbc` | capsule + sheet + tab-bar border |
| `--shell-cap-radius` | `18px` | capsule/sheet/tab-bar radius family |
| `--shell-cap-shadow` | layered triple | floating capsule shadow |
| `--shell-cap-gap` | `14px` | (desktop outer gap; mobile uses the ref's tighter insets) |
| `--shell-head-h` | `58px` | desktop bar height (mobile bar is its own height + safe area) |
| `--shell-ink` / `-ink-soft` / `-muted` / `-quiet` | `#2e2723`/`#6a615a`/`#9c8878`/`#b3a598` | chrome ink scale |
| `--burg` / `--pink` / `--pink-b` / `--pink-h` | `#7c3a2a`/`#f5e2da`/`#e8c8bc`/`#efd5ca` | Form 11 primary family |
| `--slate` | `#6A89A7` | plan-line "Upgrade" |

The mockup's `:root` literally restates the locked capsule values (`--ground:#e7e0d5`, `--panel:#f8f4ee`, `--content:#fdfbf8`, `--cap-border:#d8ccbc`) — the build still *reads the tokens*, never the mockup hexes. The Queries hub's own theme is `.t-f12` (`index.css` — `--ink:#1e1a16`, `--paper`, `--oat`…): the mobile command bar's espresso is `var(--ink)` from that sheet, not the mockup's `#311e19`.

### Surface inventory

**Shared host.** App root: `height:100vh; overflow:hidden` inline (`shell/AppShell.tsx:319`) — the one hard viewport clamp (iOS URL-bar hazard). Stage `#app-stage-scroll` is the only scroll container; per-route scroll memory lives on it. Desktop rail/panel/topbar are already class + `@media (min-width:768px)` gated (`shellV2.css:12,21,176,557`) — below md only the slim bar + old tab bar render. `StagePage` slots: dashboard `flow`; queries/todo/agents `fill`+`clip` (viewport-locked, internal scroll). A stale `MOBILE_RECON.md` at repo root describes a dashboard that no longer exists — void, superseded by this report.

**Dashboard** (`Dashboard.tsx`, 2248 lines). Order: `FocusGreeting` (date kicker · 66px greeting · attention chip · 4-CTA row · 380px focus side-track) → `.sa-stats` 4× `StatCardFull` → `DiaryCarousel` + `WhatsLivePanel` → `TimelineDrawer`-wrapped inline activity feed → Pro upsell `MountCard`. Notables for the reflow:
- The **focus side-track (incl. the To-do `OverToYou` panel) is `display:none` below 1100px** (`dashboardV37.css:436-440`) — the attention chip currently still renders there and toggles an invisible slot: an existing sub-1100 bug this pass resolves at <md by replacing the chip with the desk line.
- `deskNotice` was removed with the panel's desk line (tombstone `lib/shellSidebar.ts:40-43`, recoverable at `6d64b75`); `sidebarBoardTiles` (urgent/housekeeping/notes, the To-do board's own selectors) survives live. The mobile desk line re-adds the derivation **with** a surface, exactly as the tombstone requires.
- Breakpoints on the surface: 1100 (stats 2-up, side-track hidden), 860/640 (DiaryCarousel), JS `window.innerWidth>=1180` (TimelineDrawer stage push), a dead `isMobileLayout` state (`Dashboard.tsx:679-683`, never read).
- `vh`: root `min-h-screen pb-16` (`Dashboard.tsx:1518`), skeleton `100vh`.
- Fixed: timeline pull tab + drawer (`dashboardV37.css:377,392`), tasks slide-over (`fixed inset-0`, already full-width mobile), two toasts.
- Hover-only: `StatTooltip`/`StatHoverPanel` (chart data-points; also on keyboard focus), panel-card action rows (already tap-fallback'd via `isTouch`, `Dashboard.tsx:315-345`), `WhatsLivePanel` coverflow hover-pause (no touch path).

**Queries hub** (`Queries.tsx`, 3662 lines, single file). `.t-f12 .f12-root` → injected theme `<style>` (~130 lines) → dead "OLD LEFT PANEL" (~320 lines, `display:none`) → `PageHeader` `.f12-hd2` → **top command bar `.f12-ctl`** (56px, ~8 quiet selection-scoped actions; the pane-foot bar of the CLAUDE.md era is retired — `Queries.tsx:3445-3455`) → `.f12-chips` applied filters → `.f12-body` (max-width `--maxw` 1520) = `.f12-list` (fixed `--listw` 334px; head with search + portalled Filter/Sort `PillTrig` popovers via `useFixedMenu`; rows; foot) + `.f12-detail` (inline reading pane: hero band with the **`getPrimaryAction` hero button** — MarkSentPopover anchors it via `markSentTriggerRef`, `Queries.tsx:3121` — then a hard-coded `1fr 1fr 1fr` grid: Tracking / What you sent / Notes, `Queries.tsx:3137`).
- Selection: `selectedQueryId` (`:263`), row click `:3018`, auto-selects first when the selection leaves the list (`:1519-1521`) — so a selection nearly always exists: the mobile list/detail switch needs its own presentation state, not the selection.
- Create mode: inline (LogQueryFocusForm deleted, locked by `queryCreateMode.test.ts`); `createDraft` + `qh-focus` scrim + draft row pinned in the list + `QueryCreatePane` takes the detail pane (its own `1fr 1fr 1fr` grid, `QueryCreatePane.tsx:148`).
- Record-response: **three** components. `RecordResponseScreen` (app-level + dashboard hosts; `EmailOverlay`/`.sa-overlay` fixed modal, z-1000, self-contained via `useScriptAllyDb`, props `{isOpen,onClose,onNavigate?,onSuccessToast?}`); hub-local `RecordResponseModal` (`Queries.tsx:3464`) and `RecordResponseFocusForm` (`:3509`).
- Breakpoints: only 980 (create-hero wrap) + 1100 (create-bar requirement line) — **no width breakpoint on the body/list/ctl/detail at all**.
- Fixed: `.qh-scrim`, close-menu scrim, hub toast `fixed bottom-[24px] left-[24px] z-[1100]` (collides with any bottom bar), every popover (`useFixedMenu` re-syncs on scroll/resize only — no `visualViewport` listener).
- Hover-only: **`.qp-noteacts` (note edit/delete) is unreachable without a mouse** (`Queries.tsx:3086-3087`, no focus fallback) — the worst offender; timeline `.tl-more` and icon tooltips have `:focus-visible` fallbacks; `BarMilestone` is already touch-wired (the precedent).

**Agent list** (`agents/AgentList.tsx` 854 + `AgentCard`/`AgentEditor`/`AgentToolbar`, `agentList.css`). `.aglist` (own scroll) → `.agl-page`/`.agl-inner` (cap `--sa-col-max` 1240, gutter `--sa-col-gut` 60) → `PageHeader` + Add agent → `AgentToolbar` (search · Filters · Group · Sort; panels inline `.agl-pop`, mousedown-outside + **capture-phase Escape with `stopImmediatePropagation`**) → applied tags → card grid.
- Grid: `repeat(3,1fr)`; **1100 → 2-up; 700 → 1-up; page padding at 900/640** — four uncoordinated breakpoints; the ≤767 ones migrate to md this pass, 900/1100 are desktop-side and stay.
- Flip: `.agl-scene` (perspective) > `.agl-rotor` (400px → 580px flipped, `rotateY(180deg)`, **must never gain `overflow`**) > two faces; editor injected into the back face. State: `flippedId` + buffered `draft` (`agentDraft.ts`); Done validates→diffs→one `updateAgent` (`AgentList.tsx:411+`); Escape cascade at `:575-600`. A 580px fixed-height rotor cannot host a scrolling editor on a phone — the mobile editor must render *outside* the rotor.
- Hover-only: editor avatar camera reveal (`agentList.css:542-546`, no touch path), star tooltip; the edit pencil is a real always-visible button (good).
- No fixed/sticky; no `vh`.

**To-do** (`todo/ToDoPage.tsx`, 2024 lines) — see "Phase 5 parked" below.

### To-do state → PHASE 5 PARKED

The brief's Phase 5 targets deck-v1 anatomy: identity strip with a Today chip, reels under heads, card play buttons, an ink-outline "Focused session" button. On `main` today:

- **Reels are retired** (`todo.css:349` — "reels retired"; lanes are typographic sections, `Lane`/`SectionHead`, 2px rule with a coloured stub).
- **The play button is not rendered and four regression locks assert its absence** (`todoWorkbench.test.ts:577,683,1002,1188`; `ToDoPage.tsx:141` documents the deliberate absence).
- **"Focused session" is dormant** — `renderHero` (its only host) is never called; an explicit red-gate comment sits at `ToDoPage.tsx:1179-1184`.
- **Today is a floating bottom-right corner pop-up** (`.tdb-tdpop`, fixed, 290px, max-height 33vh), not an identity-strip chip.
- The FocusFlow sheet already has its own ≤760px full-screen takeover, with a comment naming the condition: "no board mobile pass exists yet — Nick's width-only condition" (`todo.css:1073-1081`).

Phase 5's spec and the live page have diverged on every anchor point; adapting the current board would be new design work (and would fight the locks), not adaptation. Per the brief's own escape hatch, **Phase 5 is skipped**. Current mobile state of `/todo`: the board renders desktop geometry into a 390px viewport (1360px column with 40px gutters, 272px-min card grid ≈ one column, the Today corner overlapping content, card verb rows hover/focus-only — the primary per-card actions are unreachable by tap). Recorded as the follow-up "to-do mobile pass" with the FocusFlow comment as its anchor.

### Sheet candidates (Phase 1's chassis must host all three)

1. **Record-response flow** — `RecordResponseScreen` is self-contained (own data via `useScriptAllyDb`, `isOpen/onClose` seam) and hosted twice (App-level + dashboard). Chassis-only swap: at <md the same inner content presents in `MobileSheet` instead of `EmailOverlay`. It never locks the stage today (a gap the sheet closes).
2. **You-menu** — the P1 dropdown in `Nav.tsx` (user block + rows) is the remnant; rebuilt as sheet rows in Phase 1 (routes all exist).
3. **Today's list** — parked with Phase 5; the chassis takes arbitrary children, so nothing blocks a later to-do pass adopting it.

### Test/verification constraints

Vitest is `environment: 'node'` — no jsdom, no layout assertion. Component specs render via `renderToStaticMarkup` + string assertions; the dominant idiom is `readFileSync` source/CSS locks (`shellV2Tokens.test.ts` pins `.sv2-app { padding: var(--shell-cap-gap); gap: var(--shell-cap-gap); }` verbatim; `agentLayout.test.ts` pins `--sa-col-gut: 60px`/`--sa-col-max: 1240px` token lines; `todoWorkbench.test.ts` bans patterns in AppShell). All mobile CSS is additive inside `@media (max-width: 767.98px)` blocks so locked top-level rules stay byte-identical. Layout itself (flex min-height chains, dvh, safe areas, sheet behaviour) is browser-only — listed in the phone-walk checklist instead.

---

## Phase outcomes

*(filled per phase; sections below are written as each phase lands)*

### Phase 1 — mobile chrome kit
*(pending)*

### Phase 2 — dashboard reflow
*(pending)*

### Phase 3 — agents
*(pending)*

### Phase 4 — queries
*(pending)*

### Phase 5 — to-do
Parked (see recon).

### Phase 6 — app-feel layer
*(pending)*

---

## Follow-ups found outside scope

- **To-do mobile pass** (parked Phase 5) — board geometry, Today corner, verb-row touch path; anchor comment at `todo.css:1073`.
- `Queries.tsx` dead "OLD LEFT PANEL" (~320 lines, `:2311-2629`) still ships.
- `Dashboard.tsx:679-683` dead `isMobileLayout` state (never read).
- `useFixedMenu` has no `visualViewport` listener — anchored popovers strand when the on-screen keyboard opens.
- `TasksDropdown`/`useTaskAlerts` lose their last live mount when the slim bar retires (CLAUDE.md says they await a product decision — left intact).
- Tabler icons CDN pinned to `@latest` (render-blocking, unpinned) in `index.html`.
- `public/.DS_Store` files ship to `dist/`.
- Stale `MOBILE_RECON.md` at repo root (describes a retired dashboard).
- Desktop-side breakpoints left as-is by the law (not mobile/desktop dividers): agents 900/1100, dashboard 1100, diary 860, hub 980/1100.
- `StatCards.tsx` / `HeroCard.tsx` orphaned imports in `Dashboard.tsx`.
