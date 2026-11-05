# Sidebar rail v1 — report

Branch `sidebar-rail-v1`, cut from `main` at `7e0e9aeec`. Three code commits plus this report:
`0e43500ce` (Phase 1) · `d3c5df395` (Phase 2) · `150e1be7b` (Phase 3) · the report and screenshots (Phase 4).
**Not merged. Not pushed. Not deployed to dev — see "The dev deploy stopped" below.**

## False premises

1. **The refs were not in the repo.** Both were in `~/Downloads` with exactly the prompt's sha256
   (`c3c94297…` and `7e686cb0…`). Copied into `design-refs/shell/` and enrolled on the ref watchlist.
2. **The ⌘K palette has no nav grouping.** It is one flat "Pages" list, and it had no Responses or
   Analytics and called Submission packages "Packages". Its nav pages are now built from the workspace
   nav, in its order, with its names.
3. **The phone bar's title does not come from `mobileChrome.tsx`.** It is `ShellTopBar` (ShellV2.tsx)
   reading `shellCrumbForPath` in `shellV2Nav.ts`. That function now reads the workspace nav first.
4. **Nobody has a "founding" entitlement, and Discover has no entitlement at all.** To keep "nobody sees
   a Pro tag today" true, `discoverUnlocked` was added beside `packagesUnlocked`, open to all
   (`DISCOVER_OPEN_TO_ALL`). It gates nothing; it only decides whether the tag is drawn.
5. **⚠️ The branch dev serves has a different nav from `main`.** This is the one that matters; see below.

## The dev deploy stopped

Dev serves `index-B4t-KZ6J.js`, built from
`dev/qc1511-db2-title-sip-qc1512-cl26-sip11-tl1-pk41-cl262-db21-sip12-pk41w-qc152-fn121` (rebuilt
and matched). Merging this branch onto it conflicts in 12 files, because that line carries other packs
that changed the nav model:

| | `main` (this pack's base, and the prompt) | the dev branch |
|---|---|---|
| Calendar | a To-do page | **retired** (`2d6b796bf`) |
| Submission packages | `/manuscripts/packages`, under Materials | **`/queries/packages`, under Queries**, short label "Packages" |
| Versions | inside Manuscripts | **its own page** `/manuscripts/versions`, Pro |
| The Materials section | Manuscripts · Comps · Packages | renamed **"Your book"**: Manuscripts · Versions · Comps |
| Query Centre's sidebar label | Query Centre | **"Queries"** (25 Oct ruling) |
| Dashboard | Workspace heading | no heading (25 Oct) — same as rail v1 |

The approved rail (5 Nov) puts Calendar under Tasks and Submission packages alone under Materials, which
contradicts three of your 25 Oct rulings that are live on dev. Resolving the merge means choosing
between them, so I aborted it, deleted the attempted branch, and left dev exactly as it was (still
`index-B4t-KZ6J.js`). **Nothing was deployed.**

Two ways forward, your call:
- Rebase the rail onto the dev line's nav (Packages under Queries, Versions, no Calendar, "Your book"),
  re-deriving the rail's sections from it; or
- Keep the rail's section list and decide what happens to Versions and `/queries/packages`.

## Phase 1 — the nav model (`0e43500ce`)

**Changed:** `lib/workspaceNav.ts` (six sections in the new order; Manuscript + Materials split;
Analytics third; section icons; `pro` marks; `RAIL_SHORT_LABELS`, `railPageLabel`,
`SETTINGS_RAIL_LABELS`, `workspacePageForPath`), `lib/workspaceShell.ts` (the two optional fields),
`AppShell.tsx` (`manuscript` icon), `shellV2Nav.ts` (phone crumb reads the nav), `lib/searchPalette.ts`
(nav pages from the nav), six unit locks retargeted, plus new locks for the split, the short labels and
the Pro pages.

**Gates:** tsc clean · build clean · Vitest no worse than baseline (baseline: 10,270 passed, 4 failing
files, all under `functions/`).

**e2e (emulators):**
- SR1.1 the folder tab on `/manuscripts` shows `["Comparable titles"]`; on `/manuscripts/packages`, `[]`.
- SR1.2 the palette finds Responses, Analytics, Submission packages and Comparable titles by name.
- SR1.3 the phone bar on `/queries` reads "Query Centre".

**Red-before:** the six unit locks were red against the old model before being retargeted (they
encoded "Queries Hub", "Packages" and the five-section order). The e2e cases were not separately broken.

**Help Centre wording:** no article names the old sidebar grouping. The one structural hit is the Help
area `{ id: "materials", name: "Materials", heading: "Manuscripts and packages" }`
(`content/help/model.ts:26`). Left alone, as structural.

## Phase 2 — the rail (`d3c5df395`)

**Changed:** new `SidebarRail.tsx` + `sidebarRail.css` (the ref's values, its always-on modifiers
flattened in); `lib/railMemory.ts` (last page per section), `lib/railTile.ts` (the initials tile),
`lib/railReviewAid.ts` (dev-only `__SA_RAIL_COUNT`, gated at the call site); `WorkspaceShell.tsx`
(both layers mounted, the hidden one `inert`; `--shell-side-w` published only on change);
`BarSwitcher.tsx` (a `rail` placement; its shortcut ignores an inert copy); `feedbackStore.ts` (the
anchor skips inert layers); `AccountMenu.tsx` (ink placement from the rail's foot too);
`entitlements.ts` (`discoverUnlocked`); the old `.sb-collapsed` rules deleted from three sheets.

**Gates:** tsc clean · build clean · Vitest 10,325 passed, 0 failed.

**e2e at 1512×982, beta strip showing:**

| Case | Measured |
|---|---|
| SR2.1 rail width | 80px on all six routes |
| SR2.1 labels | every section, card and foot label one line, inside its row, not cut (60+ labels across six routes; "Query Centre" fits) |
| SR2.2 nav scroll | 982: 698/698, no scroll · 900: 620/620, no scroll · 760: 494/480, scrolls; head top 57.75, foot bottom 748 of 760 |
| SR2.3 last page | Agents → Discover → Tasks → Agents lands on `/agents/discover`; the card marks Discover |
| SR2.4 off-nav, settings | `/help` lights nothing; `/account/profile` shows Back, Profile, Security, Plan, Alerts, Settings, Tasks, Your data with Profile current; Back returns to `/dashboard` |
| SR2.5 count | 128 reads "99+" |
| SR2.6 touch | at 1180×820, `(hover: none)` true; expand control opacity 1, 34×26 |

**Red-before:** each case has a named in-page break (`SR_MUTATE`); all six went red. SR2.1's label half
was proved alone (at 15px, "Query Centre sits inside its row" fails), because its width check had
masked it on the first run.

## Phase 3 — RAIL · FLOAT · PINNED (`150e1be7b`)

**Changed:** new `useSidebarState.ts` (state, migration, narrow rule, `[`/⌘\); `WorkspaceShell.tsx`
(the motion, close rules, focus rules, the full sidebar's pin and close buttons, Dashboard with no
heading, rows that put a floating sidebar away); `sidebarRail.css` (the full layer's restyle, the float
shadow, the settings-mode fix); `shortcuts.ts` (the binding's new home); five unit locks retargeted,
new unit locks for the state derivation and migration.

**Gates:** tsc clean · build clean · Vitest 10,331 passed, 0 failed.

**e2e on `/queries`, every animation frame sampled:**

| Case | Measured |
|---|---|
| SR3.1 RAIL→FLOAT | 9 intermediate widths (124.5 … 247); the page's left edge `[80]` in every frame |
| SR3.2 FLOAT→PINNED | laid-out left `[80, 248]` (one re-layout); then 11–12 frames of transform (−168 → 0); ends at 248. 3/3 on repeat |
| SR3.3 PINNED→RAIL | 6–7 frames of width animation; the left edge `[80]` throughout; ends 80/80 |
| SR3.4 FLOAT closes | on a page pick, a page click, Escape and ⌘K; a click inside the manuscript menu keeps it |
| SR3.5 PINNED | ignores Escape; survives navigation and a reload (248px, `--shell-side-w: 248px`) |
| SR3.6 narrow | 1024×800 with pinned stored: rail; FLOAT opens; pin disabled, titled "Pinning needs a wider window"; 1512: pinned again |
| SR3.7 migration | collapsed `"0"` → pinned; `"1"` → rail; nothing → rail |
| SR3.8 keyboard | `[` opens FLOAT with focus on "Query Centre"; Escape returns focus to the expand control; `[` typed into the palette stays in the field |
| SR3.9 reduced motion | each state change's first changed frame is its final width |
| SR3.10 fonts | 78 labels; faces Source Serif 4, JetBrains Mono, Inter, Special Elite, Playfair; none in Source Sans |

**Red-before (frame and font locks):**
- Margin transition removed → SR3.1 fails on the left edge (`80, −88, −79.8, 77.3`); SR3.3 fails on the left edge (`239.1, 130.5`). Both proved with the left-edge assertion first.
- Glide transition removed → SR3.2: 0 glide frames.
- Label fonts set to inherit → SR3.10 lists every rail label in Source Sans 3.
- Full layer forced visible in settings → SR2.4's new hidden-layer check fails.

**Found and fixed by measuring, not reading:**
- Labels in Source Sans: the rail avatar (my own `.wsr button { font: inherit }` outranked it) and four labels in the settings plan strip. Now the serif inside the sidebar.
- On `/account/*`, an older `.set-mode .ws-pin { opacity: 1 }` rule showed the full layer through the rail (visible only in a screenshot; SR2.4 had checked only the rail's rows). Fixed, and SR2.4 now checks the hidden layer on every route it visits.

## Things to know

- **The one re-layout on `/queries` takes ~180–200ms.** FLOAT → PINNED holds the page at −168 by transform during it, so nothing jumps, but the glide starts that late.
- **SR3.2 failed once in a full run** (5 glide frames, with a 100ms gap in the samples) while another session's e2e run loaded the machine. It passed 3/3 on repeat.
- **At 982px tall the full sidebar's nav scrolls:** Corkboard sits behind the feedback card. The split added a heading. The card folds below 920px as before.
- **The BETA chip is gone from the full sidebar's header row** (the spec says so). The beta strip above the window is unaffected.
- **Measurement-only patch:** another session held the emulator ports, so my runs patched the ports (8186/9196/9296/4506/4322) for the run only and restored them afterwards. Nothing committed.
- **This worktree symlinks `functions/node_modules`** (the harness needs `firebase-admin`). That is also why the four `functions/` test files pass here when they failed at baseline.

## Deferred — and who owns it

- **The dev deploy and the IA reconciliation above — Nick.**
- **23 older e2e suites** select the old sidebar (`sb-toggle`, `.ws-ni`, the expanded default) and were not run: contactV16, contactV17, corkboardV1, drawerMotion, helpSystemV1Shots, helpCentreV1, helpSystemV1, inkShots, inkShell, msShots, onbV5, pageHeaderV1, qcChassis, qcV126, rs2, settingsMode, shellMenus, shellV3Mock, shellV3, signOut, sidebarCapture (+ inkLib, shellV3Lib). Most will now meet the rail by default. Whoever lands the rail retargets or retires them; I can do it once the IA question is settled.
- **The palette's "Account" page entry** still says Account while the bar names the page Settings. Not touched.
- **`useSidebarCollapsed.ts`** survives only for `isEditableTarget`, `SIDEBAR_COLLAPSED_KEY` (migration) and its tests; its hook is mounted nowhere. Retire it in a cleanup pass.
- **Worktrees:** there were 7 besides the primary when this started. Offer to clean up the clean ones stands.

## Screenshots (deviceScaleFactor 2)

`reports/sidebar-rail-v1/`: `1-rail-queries.png` · `2-agents-card-discover.png` · `3-float-queries.png` ·
`4-pinned-queries.png` · `5-settings-rail.png` · `6-float-1024.png` · `7-touch-header.png` (clip) ·
`8-rail-760-tall.png`.

## Reproduce

```
SR_SHOTS=<dir> npm run e2e:emu -- tests/e2e/sidebarRail.measure.ts --project=measure
SR_MUTATE=all npm run e2e:emu -- tests/e2e/sidebarRail.measure.ts --project=measure -g SR2
```
