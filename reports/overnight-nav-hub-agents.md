# Overnight run — nav drawer + Queries Hub + Agents Contact List

**Run date:** 12–13 Jul 2026 (unattended). **HEAD at start:** `f474f4c`. **HEAD at close:** the Stage-5 commit (this report rides it).
**Every stage committed individually, every commit gated green** (`tsc` + production build + full Vitest, `set -o pipefail`), explicit-path staging throughout.

## ⚠️ Flags first

- **Nothing left incomplete.** All Stages 0–5 done. Two pairs of sub-stages were **merged into single commits** — 3a+3b and 4a+4b+4c — because the control bars and their popovers/list are one interlocked unit (splitting them would have left a filterless commit). Recorded, not hidden.
- **Agent task count: DERIVABLE — shipped with a live count.** `View tasks` on the Contact List counts the agent's own tasks plus tasks on their queries, from the `tasks` array already in `DbProvider` (`relatedRecordId` matching). No new reads anywhere in this run (audited: **zero** new `onSnapshot`/`getDocs`/`getDoc`/`collection(db…)` in the whole diff).
- **Location filter: SHIPPED, with a caveat.** There is **no `location` field** on the agent record — but `country` (ISO alpha-2, the deployed territory model) **is** the location field. The filter runs on `agent.country`, and its radio options are the **distinct countries actually on file** (via `territory.countryName`), not the mockup's hardcoded UK/US. If you consider `country` insufficient, say so and I'll pull the section.
- **Pages with no breadcrumb:** the **dashboard** (deliberate — `DashTopBar` owns that band; the menu button went there instead) and the guarded **`/email-import-dev`** route (dev-only, none invented). Focus tier (`/account` `/plans` `/help`) has no drawer/menu button by standing decision 3.
- **Fixed-position elements (Stage 1c): NONE needed fixing.** The rail was an in-flow flex sibling — no page carried width offsets. Audited: help FAB (fixed, z-30), BottomTabBar (fixed, z-40), timeline drawer/tab (fixed right, z-46/45), mobile Nav (sticky, z-50), DashTopBar (in-flow) — all beneath the drawer scrim (z-80) and all viewport/right-anchored. One note: the **toast containers (z-1100) deliberately float above the scrim** (transient notifications, not furniture).
- **Firestore composite indexes: none needed.** Every filter/sort/group on both pages is client-side over data already in memory.
- **Burgundy drift (report only, not fixed):** `--burg-d: #632e22` (index.css) vs `deepBurgundy = "#6b3023"` (designTokens.ts).
- **🚨 `#/pkg-lab` must be removed before any prod deploy** (left in place this run, per standing decision 8).
- **Prompt vs enum:** the run prompt listed `R&R` among the "exact enum strings" — the actual enum value is `"Revise & Resubmit"`. The **filter value uses the enum string**; "R&R" is the display label (matching the mockup). No camelCase anywhere.

## Per-stage

### Stage 0 — `f615b27` `chore(dev): background lab, DEV-gated`
Landed the parallel stream's Background Lab (BackgroundLab.tsx + model + test + the AppShell wiring; DEV-gated, tree-shaken from prod). Tree clean after. Gate: 791 tests.

### Stage 1 — nav drawer app-wide
- **1a `3f0470d`** — `NavDrawer.tsx` (new): scrim + slide-in panel at z-80/81, focus trap, Escape, scrim-click/nav-select close, focus restore, `aria-expanded`/`role="dialog"`/`aria-modal`, body scroll lock, reduced-motion end state. Contents from `railNav.ts` verbatim; labels always visible; **badges wired from existing data only** — awaiting-your-move via `queryBucket === "move"` (the queriesPulse logic), open tasks from the derived `tasks` array. Settings/Help + account block (five actions, popping upward inside the trap) pinned to the foot. Themed by the existing `--rail-*` tokens so it belongs to `.t-capp`/`.t-bold`/`.t-edn`. Rendered closed; rail untouched.
- **1b `3e2a5a2`** — CrumbStrip = menu button → mark + wordmark → mono-caps parent / **Playfair ~19px page name** (additive `title` field on the crumb table). DashTopBar gains the menu button leftmost. **Agents renamed Contact List** (crumb + nav item; locks updated).
- **1c `4c7b716`** — the rail deleted (~500 lines); content column reclaims the width with **zero offset fixes needed**. Removed with it: the rail's NavSearch mount + its ⌘K registration (global search is now dashboard + agents only — see follow-ups), the theme seg (the Settings radio writes the same field), pin/peek. `railPeek.ts` is now unused by app code (tests keep it green) — cleanup candidate.

### Stage 2 — `d689577` shared shell + tokens
Both design refs committed (their `:root`s are identical — one `.t-f12` serves both). `.t-f12` block in index.css **with the sage correction: the live diary band `#dce0d9→#d0d6cc` wins** over the mockups' `#d7ddd5→#d5dbd3`. `f12.css` (shared shell classes) + `F12Shell.tsx` (F12Page/Icirc/F12Primary/Trig/F12Popover/PopSection/PRow/Chip). The header tools are **overlaid on CrumbStrip** (composition — the component itself untouched, per standing decision 2). **Inter added to the font links** — the mockups' body font was never loaded; the app's existing `'Inter'` inline styles had silently been falling back to system sans.

### Stage 3 — Queries Hub
- **3a+3b `7e1f031`** — F12 shell (oat root, header tools incl. the one filled `Log a new query`), the top control bar (two `--listw`-locked zones; quiet buttons: Record response · View tasks (count) · Edit · Nudge · **Mark closed** │ Agent · Manuscript │ PDF · Delete), pink filter chips, and **working popovers**: Filter (Whose turn from `queryBucket` — one source of truth; Manuscript; all-ten-status checkboxes with real `StatusDot`s + quick pills; Needs attention, both derived) and Sort (7 options, grouped, all real). The masthead + pulse line, hub-grammar filter bar, qdesk wrappers and foot control-row cards retired. Mark-sent/Close menus now open downward.
- **3c `e796e9c`** — the F12 list pane: search top, 56px rows (pink avatar/black initials, name, mono agency, StatusDot + date), blue selected + 3px ink inset, `SHOWING n OF m · EXPORT CSV · ↑↓ ⏎` footer, keyboard + `?q=` deep-link preserved. The dead grouped-list branches removed.
- **3d `91dc630`** — reading pane: **sage LEFT spine** (::before, radius-clipped, **no top rule**), pink 76px avatar, Playfair name, pink status pill, plane ornament; three cards with **sage gradient bands + 19px `#5a6e58` icons**; **journal empty = 1.5px dotted, transparent**. Contents untouched.

### Stage 4 — Agents → Contact List
- **4a+4b+4c `28a1de8`** — F12 shell (`AGENTS / Contact List`, `+ Add agent` filled; masthead + subtitle retired), control bar (FILTER/SORT/GROUP BY left; Send query · Edit profile · View tasks (count) │ PDF · Delete right — **PDF is a disabled stub: no agent-PDF handler exists**; Delete wires the existing guarded/deferred-delete flow), all three popovers **functional** (filter incl. the new Star-rating capability + the country-backed Location + derived Needs-attention; 7 sorts; group-by with sticky mono headers), the F12 list (open/closed dot + `1 QUERY`/`IDLE` counts, **no stars in rows**, `… · k IDLE` footer, **new client-side CSV export**). App slot split so **Discover keeps its capped column + crumb**.
- **4d `b2509bc`** — pane reskin: sage-spine hero (no top rule), mono-caps agency, burgundy stars, **sage-active Open/Closed pill** (scoped CSS override; the shared SegmentedToggle untouched), link pills kept; **wish-list empty = single-row dotted strip**; submission profile = three sage-band cards; **History/Notes = underline tabs**; slim meta footer `ADDED <date> · n QUERIES` + open/closed state.

### Stage 5 — sweep (this commit)
- **Gates (fresh):** `tsc` clean · production build ✓ · **Vitest 60 files / 791 tests, all green**.
- **Page walk (rail removal):** compile-level walk of every mount in App.tsx + a runtime smoke (dev server: marketing landing + auth screen boot with **zero console errors**; the workspace is auth-gated, which the headless harness can't cross — Nick's morning review covers the signed-in walk). Pages checked at source level: Dashboard, Queries Hub, To-do, Contact List, Discover, Manuscripts, Comparable Titles, Submission Packages, Import, Account/Plans/Help (focus tier — no drawer by design), marketing `/` + `/pricing`. The only other `<Rail>` in the codebase is AccountSettings' **local** section-nav component (unrelated). No page needed more than the flow reclaim.
- **Drawer a11y:** focus trap/Escape/scrim-close/restore verified by construction + unit-green; z-order audited against every fixed element (above). Runtime click-through is on the morning list (auth gate).
- **No new Firestore reads:** diff-audited — zero new read/listener calls.
- `design-refs/themes.md` updated with the `.t-f12` block + the corrected sage.

## Mockup-vs-prompt reconciliations (mockup won)
- "R&R" display label vs the `"Revise & Resubmit"` enum value (filter uses the enum).
- The Agents Location options come from real `agent.country` data rather than the mockup's UK/US pair.

## Deliberate deviations (recorded)
- **3a+3b and 4a+4b+4c merged** into single commits (interlocked units).
- **The ⋯ lifecycle menu (Set aside / Bring back) stays in the Contact List's meta footer** — the ref gives it no home and Delete alone would strand the set-aside flow.
- **Agent row pinning lost its surface** — pins lived on row hover + the rating-tier grouping, both retired by the mockup's clean rows. `agent.pinned` data is untouched; re-homing the pin is a follow-up.
- The Queries Hub's old **Up-next card** and **agent-band summary** died with the old list (not in the ref).

## Follow-ups worth attention
1. **`DashTopBar` / `CrumbStrip` convergence** (standing decision 3's noted follow-up) — two header components now share the menu-button pattern.
2. **Global search / ⌘K rehome** — with the rail gone, global smart-search exists only on the dashboard + the Contact List's local search; the long-parked ⌘K command palette is now the natural fix.
3. **Agent-record PDF** — the control-bar button is a disabled stub.
4. **Query delete** — the confirm dialog exists (previous run) but `deleteQuery` still has no data-layer handler.
5. **Pin re-home** (above) + **`railPeek.ts` cleanup** (unused module, tests keep it green).
6. **`#/pkg-lab` removal before prod** (again, deliberately loud).
7. The **legacy hidden panels** in Queries.tsx (display:none mobile filter region + `sortOption` shim) remain cleanup candidates.
