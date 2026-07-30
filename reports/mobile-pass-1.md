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

Commits: P0 `16440ae` · P1 `affa962` · P2 `e5dd4d2` · P3 `afee561` · P4 `7b86c29` · P6 `8921c83` · P7 rides this file's final commit. Gates (tsc + `vite build` + full Vitest, `set -o pipefail`) green at every commit; suite 2131 → 2163 (+32 mobile locks; 3 existing locks evolved with the pass, intent preserved).

### Phase 1 — mobile chrome kit (`affa962`)

- **`MobileSheet`** (`shell/MobileSheet.tsx` + `mobileShell.css`): scrim + capsule-bordered sheet off `--shell-cap-radius`, grabber, safe-area foot, `lockStageScroll()` + body lock, Escape (capture, stopped — never reaches page draft-discard handlers) + scrim-tap dismiss, pure-CSS entry (none under reduced motion), portalled to body (tokens are `:root`-scoped, so they resolve there). z-1000 — the `.sa-overlay` modal stratum.
- **Tab bar** rebuilt as the floating capsule: inset 12/14+safe-area, capsule border/radius/shadow tokens, `--shell-side` fill, four tabs (**Home** · Queries · Agents · Scripts) with mono micro-labels; active = **ground-fill pill + ink** (nav active law — the old pink/burgundy inline styling is gone, and the component now carries no colour of its own). Route-driven; off-tab routes (To-do, Setup family) light nothing; hidden on pushed details via the `hidden` prop.
- **One bar, both breakpoints**: `ShellTopBar` gained its `<md` variant in place — dashboard keeps the wordmark (same node, same id — the brand-once law and its id-uniqueness lock hold), working pages reduce the crumb to the page name (CSS hides the section spans, restyles the `<b>` to Playfair 17), search becomes a 34px icon opener, the avatar opens the you-menu. A registered `MobileDetailSpec` swaps the bar to `‹ back/title` or `Cancel · title · Done`; every mobile element is `display:none` at md+, so desktop never sees them. The slim `Nav` is retired from the mount (file kept).
- **`mobileChrome.tsx`**: `useIsMobile()` (the one JS breakpoint read, 767.98px, node-safe) + `MobileChromeContext` — pages register pushed-detail specs per route key, so a mounted-but-inactive StagePage slot can never hide another route's tab bar.
- **You-menu sheet**: user block (avatar/name/email + `planLine` as plain slate text, Upgrade → `/plans`; no Pro card) over To-do · Submission packages · Import your queries · Account settings · Help · Sign out.
- **Arrangement**: below md the bar sits on the ground (safe-area top padding), `.sv2-pgwrap` becomes the one full-bleed content capsule (squared foot, foot fade squared with it), stage clearance derives from the bar (`sv2-stagepad`, replacing `pb-[76px]`), and the root's `100vh` moved to the class so `<md` gets `100dvh` (vh fallback). The locked `.sv2-app` padding/gap rule is byte-identical.

### Phase 2 — dashboard reflow (`e5dd4d2`)

Stacked to the ref's order below md: kicker + greeting (left-aligned, 27px) → **desk line** → two-up stats → pipeline → To-do doorway → recent activity → Pro upsell. Panel interiors untouched.

- **`deskNotice` recovered** into `lib/shellSidebar.ts` (from `6d64b75`) with a new surface — exactly the tombstone's condition. Hot = blush `#faf0ea` + `--pink-b` line + burgundy roundel; calm = a hairline row with no fill. Tallies come from `sidebarBoardTiles` (the To-do board's own recipe), so the line agrees with `/todo`, its doorway target. The five deskNotice locks returned with it.
- The attention chip hides below md (the desk line replaces it — its focus-slot target was already `display:none` under 1100, an existing dead toggle); the CTA row and the fortnight carousel stand down per the ref's stack (`section.dc` — WhatsLive's `div.dc` root is untouched). Deliberate omissions, both flagged below.
- **To-do doorway**: three lane tallies in the live board's own vocabulary (Urgent · Housekeeping · Notes to self — the ref's "Needs a send" is stand-in copy; the doorway must agree with its destination), in the dashboard band language.
- **Timeline re-homed**: `TimelineDrawer` gained an `<md` in-flow variant (same feed children, drawer head vocabulary, no tab/pin/fixed). Desktop drawer path byte-identical, capsule-gap inset lock included.
- WhatsLive's inline `2fr 1fr` pair stacks via `!important` (inline grid); its coverflow auto-advance keeps no touch-pause (tiles are tappable) — flagged.

### Phase 3 — agents (`afee561`)

- **Breakpoint law**: the hand-rolled 700px (grid → 1fr) and 640px (padding/h1/search) breakpoints migrated to md; desktop-side 900/1100 stay. `agentLayout.test.ts`'s pinned pixel moved with the law.
- **The flip stands down below md** (baked decision 6): `flipped` and the card's `editor` face are `!isMobile`-gated; opening a card renders the **same editor element** (one `editorFor` builder — same draft buffer, same handlers, one `updateAgent(diff)` on Done) as a full-screen **in-flow push** that replaces the list inside `.aglist` (the page's own scroller). The rotor's locked physics never enter the mobile block.
- The shell bar carries **Cancel · Edit/New agent · Done** via the seam; Done is the editor's own commit; Cancel is the silent discard (the page's Escape grammar — the in-card ✕ keeps the ask-if-dirty path). **Back preserves scroll**: `.aglist`'s scrollTop is saved on push and restored on return.
- **Toolbar popovers → sheet**: the same Filters/Group/Sort panel children present in `MobileSheet` below md, wrapped in an `.aglist.agl-inpop` scope carrier (every option row is root-scoped); the anchored popover's outside-click/align machinery stands down there (the sheet owns dismissal; Escape still never reaches the draft-discard handler).
- Touch rule: the avatar's hover-only change-photo veil is always visible below md.

### Phase 4 — queries (`7b86c29`)

- **List → pushed detail**: `mobileView` is presentation state (the hub auto-selects, so selection can't be the signal). Both panes stay mounted and **translate** inside the `.f12-body` pusher (`overflow:hidden` viewport; list parks at −24% under the detail) — scroll survives the push; reduced motion stills it. A row tap selects and pushes (the drafting click-away still resolves first); the shell bar's `‹ Queries` returns. The empty state opts out (`f12-body-empty`) and stacks its two panes.
- **The detail stacks** (hero → Tracking → What you sent → Notes): the pane scrolls as one document; the two hard-coded `1fr 1fr 1fr` grids (`qp-cols` in the pane, `qc-cols` in `QueryCreatePane`) go block below md, with foot clearance for the bar (the hub is a fill slot — the stage's clearance never reaches an internally-scrolling pane).
- **The espresso command bar** (concept frame 03): the hub's settled container (`.t-f12 --ink`, not the mockup's hex), floating in the tab bar's place, carrying the hero's **own** contextual CTA (`getPrimaryAction` — one derivation; soft-pink `.f12-btn-pri` per the button law; same composer-focus behaviour) + quiet Edit + ⋯. The **Mark-sent anchor** moves to the bar's primary below md (the hero button hides there, and a hidden anchor positions a popover at 0,0) and the popover opens **upward** via `useFixedMenu`'s additive placement — still exactly one live anchor per breakpoint.
- **The ⋯ sheet** re-homes the retired-below-md top control bar's actions with their same handlers: Nudge (writer-waiting only), the three close-as reasons **inline** (no anchored submenu to strand), Download as PDF, Delete. *View tasks stays desktop-only* (anchored `TasksPopover`; `/todo` carries tasks on mobile) — a flagged divergence.
- **Create mode below md** is a detail screen: the draft pushes the pane; the in-flow Save/Cancel bar survives (the requirement/error line restored over the 1100px hide; the Esc hint dropped); back runs the same dirty-guarded `closeCreate` as a click-away; the desktop spotlight scrim stands down. One noted quirk: cancelling via the bar's own Cancel (not back) returns to the previous selection's detail rather than the list — coherent, but recorded.
- **The guided response flow** (`RecordResponseScreen`, both hosts) presents in the `MobileSheet` chassis below md — one `body`, two chassis, flow untouched. The hub's own `RecordResponseFocusForm`/`RecordResponseModal` (Form 11 overlays) are left as overlays — usable at phone widths; sheeting them is a follow-up.
- Touch rule: the hover-only note actions (`qp-noteacts` — previously unreachable by tap) are always visible below md.
- The shared header column gutter (`--sa-col-gut`) tightens to 16px below md and the `PageHeader` compacts (26px title); the locked `:root` token line is untouched.

### Phase 5 — to-do
Parked (see recon). Nothing on `/todo` was changed.

### Phase 6 — app-feel layer (`8921c83`)

Manifest (standalone; theme `#e7e0d5` = ground token, background `#fdfbf8` = canvas token; 192/512 icons downscaled from the 750px square brand mark — transparent ground kept, a padded/maskable set flagged below) + theme-color meta; `<md` overscroll containment + momentum on every internal scroller the pass touched; `-webkit-tap-highlight-color: transparent` (touch-only artefact, deliberately unscoped); the ≥16px input floor below md (`!important` — the floor must beat each surface's own sizes); the dashboard root's `min-h-screen` gains a dvh override below md.

### Browser verification (bounded by the auth gate)

Dev server booted clean; the signed-out surface renders correctly at 390×844 with **zero console errors**, and `/manifest.webmanifest` serves. The signed-in shell is auth-gated and I don't hold credentials, so everything inside it is **statically verified only** (gates + locks) — the phone walk below is the real acceptance pass.

---

## jsdom-unverifiable layout — check on device

The suite is `environment: 'node'`: every layout claim below is asserted only as source/CSS text and needs eyes on a phone. The load-bearing ones: the `<md` capsule arrangement (bar on ground, capsule under it, squared foot, foot fade); the tab-bar/sheet safe-area insets on a notched phone; the `.f12-body` pusher (both panes translated, heights from the flex chain); the detail pane's block-stacked cards + command-bar clearance; the agents editor push height (`60dvh` floor) and its in-flow scroll; the sheet's `100dvh - 48px` cap with tall content (the Filters panel); `100dvh` behaviour as the iOS URL bar collapses; the two-up stat cards at 390px (min-height 224 interiors); the mark-sent popover opening upward from the bar; reduced-motion variants of all of it.

## Deliberate divergences from the concept (flagged, not drifted)

- The tab-bar/sheet radius comes from `--shell-cap-radius` (18px), not the mockup's 22 — one chrome family, per the sheet's own spec line.
- The doorway lanes read Urgent · Housekeeping · Notes to self (the live board's vocabulary), not the mockup's "Needs a send".
- The dashboard mobile bar keeps the brand ARTWORK (`ScriptAllyLogo`, the bar's own convention), not the mockup's styled text.
- The manuscript scope chip has no mobile home (the concept's bar has no seat for it) — scope-dependent figures render without a visible scope control below md.
- Stat cards keep their full interiors (charts + focus/hover panels — keyboard-accessible), not the mockup's bare number tiles: "panel interiors keep their components and logic" wins over the ref's simplification.
- "View tasks" (query-scoped) is desktop-only below md (anchored popover); the CTA row and fortnight carousel hide below md per the ref's stack.

## Ten-item phone walk (Nick)

1. **Safe areas** — on a notched phone: the top bar clears the status bar; the tab bar and every sheet clear the home indicator; nothing hides behind either.
2. **Tab clearance** — scroll each tab's page to the very bottom: the last content clears the floating tab bar (stage pages) AND the queries detail's last card clears the command bar (internal scroller — separate clearance).
3. **Sheet dismiss** — you-menu, agents Filters, queries ⋯, record-response: each opens as a bottom sheet; scrim-tap and drag-free close work; the page behind never scrolls while one is open; a tall Filters panel scrolls inside the sheet.
4. **Back preserves scroll** — queries: scroll deep into the list, open a query, ‹ back — the list is where you left it. Agents: same through the editor push.
5. **Input zoom** — focus the queries search, the journal composer, an editor field: iOS must NOT zoom (16px floor), and anchored popovers near the keyboard are worth a look (known `visualViewport` gap).
6. **Editor Done path** — open an agent, edit across tabs, Done in the TOP BAR: one save, the save choreography plays in the restored list, the notice appears. Cancel = silent discard; the in-card ✕ still asks when dirty.
7. **Response flow** — from the queries detail: the bar's primary → composer chips → record an outcome end-to-end; Mark sent opens UPWARD from the bar's primary. (Note: the PICK-a-query guided screen has no mobile door — see the flagged gap below — so on a phone recording is query-scoped from the detail, which is the concept's own frame-04 model.)
8. **You-menu routes** — all six rows land where they say; the plan line is plain slate text; Sign out works.
9. **Overdue colouring + desk line** — with an urgent task: the desk line is the blush card with the burgundy count and opens /todo; with nothing urgent: the quiet hairline row. The doorway counts match the /todo lanes.
10. **Add to home screen** — install; standalone launch (no browser chrome), the ground-tone status bar, the brand icon; app boots to /dashboard.

**A flagged gap for Nick's call:** with the CTA row hidden below md (the ref's stack) and the panel captures desktop-only, `RecordResponseScreen` — the pick-a-query guided flow, now sheet-chassised — currently has **no mobile entry point**. The concept's mobile model records per-query from the detail (frame 04), which works end-to-end; if the context-free flow deserves a phone door, the cheapest is a "Record a response" row in the you-menu (one line — the app-level interception already exists). Deliberately not added: concept frame 07's you-menu doesn't list it, and inventing a row is a product call.

## Follow-ups found outside scope

- **To-do mobile pass** (parked Phase 5) — board geometry, Today corner, verb-row touch path; anchor comment at `todo.css:1073`. The you-menu + desk line already route there, so its mobile state is now REACHABLE and worth prioritising.
- Sheet-host the hub's `RecordResponseFocusForm`/`RecordResponseModal` (Form 11 overlays — usable, but the sheet is the settled mobile chassis).
- A padded/maskable icon set (the 192/512 icons keep the mark's transparent ground).
- `useFixedMenu` has no `visualViewport` listener — anchored popovers strand when the on-screen keyboard opens.
- The hub toast (`Queries.tsx` `fixed bottom-[24px] left-[24px] z-[1100]`) overlaps the tab bar / command bar at `<md`.
- `TasksDropdown`/`useTaskAlerts` lost their last live mount with the slim bar's retirement (kept intact per the standing product-decision note).
- `Queries.tsx` dead "OLD LEFT PANEL" (~320 lines) still ships; `Dashboard.tsx` dead `isMobileLayout` state; `StatCards.tsx`/`HeroCard.tsx` orphaned imports.
- WhatsLive's coverflow auto-advance has no touch pause (tiles are tappable; hover-pause is mouse-only).
- Tabler icons CDN pinned to `@latest` (render-blocking, unpinned) in `index.html`; `public/.DS_Store` files ship to `dist/`.
- Stale `MOBILE_RECON.md` at repo root (describes a retired dashboard).
- Desktop-side breakpoints left as-is by the law (not mobile/desktop dividers): agents 900/1100, dashboard 1100, diary 860, hub 980/1100.
- `DashboardSkeleton` still reads `100vh` (transient loading state); the non-touched `100vh` sites from recon (`Form11Drawer`, auth.css, marketing, labs) keep their values.
