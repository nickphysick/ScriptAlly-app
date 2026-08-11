# ScriptAlly App Audit — 4 August 2026

Read-only recon for MVP triage. Facts and status only; no recommendations. Claims not verified by running or tracing are tagged `[inferred]`.

**⚠️ The audit ran against a MOVING TREE.** A second session was actively committing in this same checkout throughout the audit (see §0.1). Where it matters, measurements are pinned to explicit commits. Prod baseline used throughout: `3166a60` (2026-06-12, "Merge pull request #2 — feat/derived-query-status"), as specified by the brief.

---

## 0. Repo state (Step 0 verbatim results)

### 0.1 The audit window — a live concurrent session

| Time (BST) | Event |
|---|---|
| ~21:18 | Audit start. HEAD = `717feaf`. Dirty: `ToDoPage.tsx`, `todo.css`, `todoBoard.ts` (+149/−79). |
| 21:19:22 | Audit's `npx vitest run` executed against that dirty state (10.32s). |
| 21:22:23 | **Commit `07f3fcf` landed mid-audit** — `feat(todo): tightening P2 — the ledger as a real column grid (system A)` — committing exactly the WIP the audit had just diffed (5 files: ToDoPage.tsx, todo.css, todoBoard.ts, todoWorkbench.test.ts, + new todoTightening.test.ts; +289/−135). Not this audit's doing: every audit command was read-only. |
| ~21:26 | Fresh dirt observed on top of `07f3fcf` (ToDoPage.tsx unstaged +40/−55; todo.css staged). |
| 21:32:18 | Close snapshot. HEAD still `07f3fcf`. Dirty: `ToDoPage.tsx`, `todo.css`, `todoCardBands.test.ts`, `todoShellPolish.test.ts` — the other session is mid-flight on a further pass. |
| ~21:37 | Post-close check while filing this report: **`d4cb515` ("tightening P3 — the card, on the same system") landed**; dirty set now six files plus the other session's own untracked `reports/todo-tightening.md`. Delta figures in §5 stay pinned to `3166a60..07f3fcf` (1,134); at `d4cb515` the count is 1,135. |

Consequences: (a) the brief's "byte-identical at end of session" attestation can only cover this audit's own writes — which are exactly one file, this report, untracked; (b) delta figures are pinned to `3166a60..07f3fcf`; (c) Step-0 gate results describe the 21:19 state. The CLAUDE.md working discipline ("one active session per working tree") is being violated by the *combination* of sessions, recorded here as a fact.

### 0.2 `git status --porcelain` (audit start, ~21:18)

```
 M src/components/todo/ToDoPage.tsx
 M src/components/todo/todo.css
 M src/lib/todoBoard.ts
```

(At close, 21:32: ` M ToDoPage.tsx · M todo.css · M todoCardBands.test.ts · M todoShellPolish.test.ts` — different files, other session's WIP.)

The brief expected dirt in `index.css`, `firestore.rules`, `App.tsx` — **none of those three was dirty at any point in the window**. All three are clean at HEAD.

### 0.3 `git log --oneline -15` (audit start; HEAD `717feaf`)

```
717feaf feat(todo): tightening P1 — the hero on one line + the control strip
ef7d37c fix(queries): the workspace ground goes white — by removing the override, not adding one
657bfc8 feat(shell): a compact PageHeader for workspace pages, mounted on Queries
d5ce492 mobile: run report finalised (P7)
8921c83 mobile: app-feel — manifest, scroll containment, the 16px input floor (P6)
7b86c29 mobile: queries — list to pushed detail, espresso command bar, sheeted response flow (P4)
afee561 mobile: agents — single column, editor push replaces the flip (P3)
e5dd4d2 mobile: dashboard reflow — desk line, stacked panels, in-flow timeline (P2)
affa962 mobile: chrome kit — sheet chassis, floating tab bar, one bar both breakpoints (P1)
16440ae mobile: concept ref + Phase 0 recon (no red gate; to-do parked)
797277b search: drop the orphaned NavSearch placeholder rule
259cf4e docs: search palette run report
404921f search: contextual actions on matched agents
7cb4619 search: grouped results across agents, queries, pages and actions
ac2ee5f search: command palette with keyboard navigation
```

`origin/main` = `797277b` — the local main is 12 commits ahead of origin at audit start (14 by close), unpushed.

### 0.4 `git branch -a`

```
+ claude-il
* main
  queries-hub-v3
  queries-hub-v4
  queries-hub-v5
  remotes/origin/HEAD -> origin/main
  remotes/origin/backup/rules-tests-2026-06-21
  remotes/origin/main
```

- **`fix/onboarding-trap`: NOT PRESENT** — neither local nor remote.
- `claude-il` is checked out in another worktree (`+` marker). Three stale local `queries-hub-v*` branches remain. Reflog shows a `queries-mast` branch was fast-forward-merged at `ef7d37c` and no longer exists.

### 0.5 `git diff --stat` (audit start, unstaged; nothing staged)

```
 src/components/todo/ToDoPage.tsx | 104 ++++++++++++++++++++++++++-------------
 src/components/todo/todo.css     |  83 +++++++++++++++++--------------
 src/lib/todoBoard.ts             |  41 +++++++++++----
 3 files changed, 149 insertions(+), 79 deletions(-)
```

**What the dirt was** (read in full; it became commit `07f3fcf` at 21:22): the to-do "tightening P2" — the ledger rows rebuilt from flex cards into a fixed-track CSS grid (`dot · task · kind · status · action`, new `--lg-*` tokens), the `ledgerDot` roundel replaced by a small tinted dot, a reserved hover-reveal action lane, a mono column header, and `BoardCard` gaining a `kind` facet field (with `due` becoming tabular status figures via new `auditMs`/`requestedFigures` helpers in todoBoard.ts).

### 0.6 `npx tsc --noEmit`

**PASS — exit 0, zero errors** (output empty). The known `agentsPage.ts` red the brief anticipated is **not present**.

### 0.7 `npx vite build`

**PASS — exit 0** ("✓ built in 14.65s"). Warning emitted verbatim by the build:

```
(!) Some chunks are larger than 500 kB after minification.
dist/assets/index-CAv_fdqo.js   3,845.33 kB │ gzip: 1,049.92 kB
dist/assets/index-C_WjhjbV.css    884.18 kB │ gzip:   169.06 kB
```

### 0.8 `npx vitest run` (21:19:22, against the dirty tree)

**FAIL — exit 1.**

```
Test Files  1 failed | 136 passed (137)
     Tests  5 failed | 2169 passed | 2 skipped (2176)
```

All 5 failures in `src/components/todo/todoWorkbench.test.ts`:

1. `detail P3 — ledger Notes parity + the clock snooze › the clock snooze: the plain outline clock leads the label in BOTH views from the ONE constant; moon + chevron dead` (:292)
2. `doc pass P4 — LEDGER v2 › the WASHED SECTIONS are retired (todo rebuild P1) — no tinted container; rows are cards on the bare capsule` (:799)
3. `doc pass P4 — LEDGER v2 › the actions: 32px press 'Action now' + ghosts, vertically centred; Action now OPENS (both kinds), never completes` (:827)
4. `doc pass P4 — LEDGER v2 › quick-complete = the LEADING checkbox: the roundel ticks on row hover/focus and completes; offers + batches exempt` (:847)
5. `Deck v2 P4 — the sheet · the exact-fit board · the rename › THE RENAME, repo-wide: zero matches of the old family phrase in src (Agent waiting everywhere)` (:1064)

**Cause: the uncommitted WIP.** These are source-string artefact tests reading `ToDoPage.tsx`/`todoBoard.ts` from disk; every failing assertion targets a string the dirty diff removed or renamed (verified directly: e.g. `due: "AGENT WAITING"` exists on the diff's minus side / at then-HEAD, and is renamed to a `kind` lane in the WIP). The mid-audit commit `07f3fcf` updated `todoWorkbench.test.ts` (+94/−94) alongside the source. Suite state at `07f3fcf` itself: not re-run (tree stayed dirty with the next pass's WIP throughout) — `[inferred]` green there, per the repo's gates-before-commit discipline.

2 skipped tests, both deliberate `it.skip` marked "SUPERSEDED (top-bar rebuild)": `todoWorkbench.test.ts:114` and `:1201`.

### 0.9 Firestore rules compile check

**Not checked locally.** A local check exists — `npm run test:rules` (`firebase emulators:exec --only firestore --project demo-scriptally-test …`) — but it requires the Firestore emulator's Java runtime, which is absent on this machine (verified: `java -version` → "Unable to locate a Java Runtime"). The other candidate, `npm run deploy:rules:dryrun`, is a `firebase deploy` invocation against the prod project — not run (read-only mandate; prod `firebase deploy` barred by project policy). CI (`.github/workflows/ci.yml`) does run `test:rules` with Java 21 on every push `[inferred: CI results not fetched]`.

---

## 1. Route & surface map

Router: `react-router-dom` BrowserRouter; all branching in `AppContent()` (src/App.tsx, 770 lines). Branch **order is the auth model** — everything before the `!currentUser` guard (App.tsx:528) renders logged-out. Tier source: `src/marketing/routeTiers.ts` (`MARKETING_PATHS`, `WORKSPACE_PATHS`; **the focus tier is retired — `FOCUS_PATHS` no longer exists**).

### 1a. Pathname routes

| Route | Page component | Purpose | Auth-gated? | Dev-only? |
|---|---|---|---|---|
| `/` | `Landing` (marketing/Landing.tsx) in `MarketingShell` | Public landing; signed-in users are never auto-redirected off it | No | No |
| `/pricing` | `Pricing` in `MarketingShell` | Public pricing page | No | No |
| *(any non-marketing path, logged out)* | `Auth` (signup default; `#/login`/`#/signin` → login mode) | Front door; deep-link URL preserved until sign-in | — | No |
| *(signed-in, `onboardingComplete === false` or fresh-signup flag)* | `Onboarding` | Branched first-run flow (A/B/C), outside any shell | Yes | No |
| `/dashboard` | `Dashboard` | Home desk | Yes | No |
| `/queries` | `Queries` (F12 workspace; `?q=<id>` deep-selects; inline create via seed) | Query hub: list + reading pane | Yes | No |
| `/queries?view=landing` | `QueriesLanding` | **Orphaned** legacy landing — no call site navigates here (App.tsx:317 case unreferenced); hand-typed URL only | Yes | No |
| `/todo` | `ToDoPage` | To-do desk (Urgent / Housekeeping / Notes to self) | Yes | No |
| `/agents` | `Agents` → `AgentList` | Agent contact list (card grid + flip editor, F12 shell) | Yes | No |
| `/agents/discover` | `DiscoverNewAgents` | Pro agent discovery | Yes | No |
| `/manuscripts` | `AllManuscripts` | Manuscript shelf (plates + reveal) | Yes | No |
| `/manuscripts/comps` | `ComparableTitlesPage` | Comparable titles + Scout | Yes | No |
| `/manuscripts/packages` | `SubmissionPackages` | Package Workshop + Analytics (Pro) | Yes | No |
| `/import` | `ImportCsv` | CSV migration wizard + data tools | Yes | No |
| `/account` | `AccountSettings` (in `div.sv2-focuscol`) | Account settings — **in the capsule shell; FocusShell is deleted** | Yes | No |
| `/plans` | `PlansPage` (in `div.sv2-focuscol`) | Plan cards + compare matrix (distinct page from `/pricing`) | Yes | No |
| `/help` | `HelpCentre` (in `div.sv2-focuscol`) | Help centre | Yes | No |
| `/email-import-dev` | `EmailImportDevPage` | TEMP email-import preview page | Yes | **No code gate** — it is a normal `WORKSPACE_PATHS` entry (routeTiers.ts:21); reachable by URL in a prod build by any signed-in user; only the comment calls it temporary (App.tsx:660) |
| *(unknown path)* | `<Navigate to="/dashboard" replace>` | Fallback (after auth guard, so logged-out deep links keep their URL) | Yes | No |

### 1b. Hash routes

Pre-auth transport (live in prod): `#/login`, `#/signin` (sign-in), `#/signup` (create account) — honoured on marketing routes and at the logged-out front door.

Dev labs — all evaluated before auth, all `import.meta.env.DEV`-gated **except one**:

| Hash | Component | DEV-gated? |
|---|---|---|
| `#/status-dots` (App.tsx:413) | `StatusDotDemo` | Yes |
| `#/notes-scan` (App.tsx:420) | `NotesStoreScan` | **NO — deliberately** (comment :416-419: numbers must come from a production build; reads only the signed-in user's own docs, rules-enforced). Reachable in prod builds. |
| `#/plans` (:426) | `PlansPage` signed-out preview | Yes |
| `#/import-review-dupes` (:430) / `#/import-review` (:433) | `SmartImportReview` over fixtures | Yes |
| `#/import-loader` (:437) | `ImportingLoader` harness | Yes |
| `#/scatter-loader` (:441) | `ScatterSettleLoader` harness | Yes |
| `#/reconcile-card` (:445) | `ReconcileCardDevPreview` | Yes |
| `#/notes-lab` (:449) | `NotesLab` | Yes |
| `#/diary-lab` (:453) | `DiaryLab` | Yes |
| `#/drawer-lab` (:457) | `DrawerLab` → EditAgentDrawer/EditQueryDrawer over mocks | Yes |
| `#/reading-pane-lab` (:461) | `ReadingPaneLab` → QueryTimeline | Yes |
| `#/shell-lab` (:466) | `ShellLab` → retired `SidebarShell` + `QueriesRail` | Yes |
| `#/pkg-lab` (:470) | `PkgLab` — Package Workshop over stubs | Yes |

**PaintMode: does not exist.** Zero occurrences in `src/`; `git log -S PaintMode -- src/App.tsx` is empty — it was never in App.tsx's committed history. The brief's "uncommitted PaintMode tool in App.tsx" matches nothing at HEAD. The DEV-only floating palette that *does* exist in App.tsx is **BrandStudio** (`import.meta.env.DEV`-gated FAB + modal, App.tsx:719-747), which is committed, plus the DEV-gated `BackgroundLab` inside AppShell (shell/AppShell.tsx:480).

### 1c. App-level overlays / interceptions (`handleNavigate`, App.tsx:385-407)

| Intercepted subPage | Behaviour | Component |
|---|---|---|
| `"Log a query"` / `"Send a query"` | **Now NAVIGATES** (the popup is retired): sets `createQuerySeed {agentId, manuscriptId}` and routes to `/queries`, which opens inline create mode (`QueryCreatePane`, Queries.tsx:3136) | — |
| `"Add an agent"` | Overlay, no navigation | `AddAgentFocusForm` (App.tsx:678) |
| `"Record a response"` | Overlay, no navigation (rail capture host; Dashboard keeps its own independent instance) | `RecordResponseScreen` (App.tsx:692) |
| `"Add a manuscript"` / `"Add a Manuscript"` | Overlay, no navigation | `AddManuscriptFocusForm` (App.tsx:684) |

Edit drawers are app-level context hosts wrapping the shell: `EditQueryHost` (App.tsx:580) and `EditAgentHost` (:581) mount `EditQueryDrawer`/`EditAgentDrawer` via `useOpenEditQuery`/`useOpenEditAgent` — no route change.

### 1d. Shells

| Surface | Shell |
|---|---|
| All workspace routes (13) | `AppShell` (src/components/shell/AppShell.tsx) — the capsule shell, composing `ShellRail`/`ShellSide`/`ShellTopBar` (ShellV2.tsx), `ShellSidebarBody`/`ShellScope` (ShellSidebar.tsx), `SearchPalette` (⌘K), `MobileSheet`, `BottomTabBar`. Pages render in `StagePage` slots; `/dashboard`, `/queries`, `/todo`, `/agents` stay mounted across navigation; `/account`,`/plans`,`/help`,`/import`,`/email-import-dev` mount on demand. |
| `/`, `/pricing` | `MarketingShell` (src/marketing/) |
| Auth, Onboarding, boot splash, dev labs | None (full-bleed) — except `#/shell-lab`, which renders the retired `SidebarShell` |
| `/todo` | Same `AppShell`; `todoShell.css` is a stylesheet imported by ToDoPage, **not** a shell component |

**`FocusShell` and `TodoShell` do not exist as components at HEAD.** `/account`/`/plans`/`/help` get the old 860px focus measure via `div.sv2-focuscol` only.

### 1e. routeTiers cross-check

`MARKETING_PATHS` and `WORKSPACE_PATHS` (13 entries) match App.tsx's rendered branches one-for-one; no extras either side. Drift found (documentation/coverage, not behaviour): stale "focus chrome" comments in App.tsx:39-40 and :342-343; `routeTiers.test.ts:25-28` omits `/manuscripts/comps` from its workspace-tier loop; `pathFor("queries","Landing")` has no caller; `Landing.tsx:56` footer links `onNavigate("help")` → a workspace route, so a logged-out visitor lands on the Auth signup screen rather than Help `[inferred from branch order]`.

### 1f. Pages → major child components (one level deep)

- **Dashboard** — `DashboardSkeleton`; guided empty state (welcome/task/ghost cards); `FocusGreeting`; `StatCardFull` row (`useStatDefs`); `OverToYou`; `DiaryCarousel`; `WhatsLivePanel`; mobile to-do doorway; `TimelineDrawer` (StatusDot + StoryTag events); `MountCard` Pro upsell; `TaskPanelCard` rows; own `RecordResponseScreen`; `RecordResponseModal`; `NudgeModal`.
- **Queries** — `PageHeader`; F12 control bar (status/manuscript filters + sort); `TasksPopover`; `MarkSentPopover`; list pane (search + rows w/ StatusDot); `QueryCreatePane` (inline create); agent header hero; `QueryTimeline` + `TimelineComposer` (Tracking); "What you sent" card; Notes/journal card; `EdgeFadeScroll` regions; mobile command bar + `MobileSheet`; `RecordResponseModal`/`RecordResponseFocusForm`; `NudgeModal`.
- **QueriesLanding** *(orphaned)* — undo toast; hero + builder bar; 4 navigation cards; recent-queries strip; querying-health summary; tip; manuscripts overview.
- **Agent list** (`Agents` → `AgentList`) — `PageHeader`; `AgentToolbar` (search/filter/sort/group); `AgentAppliedTags`; `AgentCard` grid; `AgentEditor` (flip); mobile editor push; save notice band.
- **Discover** — `PageHeader` (Pro pill + manuscript selector); vetting strip; 3 `AnimationSlot` Lottie reels; "what a match looks like"; controls row (open-only / hide-held / UK-IE); match result cards.
- **Manuscripts** — `PageHeader`; plate row heads (accordion + Send-query); `Reveal`/`PlateReveal` band panels; lifecycle actions (`ConfirmDestroy`); edit modal.
- **Comparable titles** — `PageHeader` (pulse); `CompsMsSelect`; comps section (`CompSuggestion`, `QueryLineText`); `CompForm`/`FormShell`/`BrandDropdown`; `ScoutPanel`/`ScoutResultCard`/`ScoutPhase`; `HowItWorks`.
- **Submission packages** — `PageHeader` (Pro pill + New package); `PackageTabs`; `WorkshopTab`; `AnalyticsTab`; `Tour`.
- **Import** — `PageHeader`; subtab switcher; dedupe panel; reset-and-seed panel; wizard progress; step 1 chooser/drop zone; step 2 mapping/preview; step 3 run + scoreboard + summary; data grid.
- **ToDoPage** — `PageHeader`; hero head (crossfade + Begin pill); control strip (filter chips, search, cards/rows toggle); `Lane` ×3; ledger view (`renderLedger`, mid-rebuild); note/task composer (+ `BrandDatePicker`); desk states; Today corner card; `AssistantBand` + `AssistantModal`; `TaskSettingsSheet`; `TodoTour`; `FocusFlow`; `FocusedSession`/`HeroSession`.
- **Account** — `PageHeader`; `Rail` in `MountCard`; 7 `SectionCard`s (Profile / Sign-in & security / Plan & billing / Notifications / Preferences / Your data / Danger zone) with `InertRow`/`InertToggle`/`ComingSoonPill` stubs; `DeleteAccountModal`.
- **Plans** — `PageHeader`; `PlanCard` ×2; `FounderCard`; `CompareCard` matrix; `MountPanel` wrappers.
- **Help** — `PageHeader`; search bar; category grid; FAQ accordion; side panel (Quick Guide, status glossary, contact card).
- **EmailImportDevPage** — `PasteEmailButton`; `EntryButtonView` ×2 (unlocked/locked); `EmailImportReview` ×2 (samples).
- **Landing** — `Hero`; `FeatureRows`; `CtaBand`; `.mk-foot` footer.
- **Pricing** — header; demo upgrade toast; Free "Sandbox" card (limit bars); Pro card; account-limits notice.
- **Auth** — form pane (email/password, Google, reset, `Banner`s, `QuillMark`); `LoginDashboardPreview` feature panel.
- **Onboarding** — `ScreenTransition`; `CreamUnderstood`; `WelcomeStageScreen`; `BranchA` (manual); `BranchB` (Smart Import); `Screen5Agents`; `Screen6Complete`; `ProgressDots`; shared modal chrome.

---

## 2. Feature inventory (status table)

Statuses per the brief's definition: **LIVE** = present at prod `3166a60`; anything after is not live. Where a feature exists on prod in an older form and was rebuilt on main, the rebuild is the row's status and the note says what prod shows. See §6 for the prod-baseline caveat.

| Feature | Status | Key files | Blocked by / depends on | Notes |
|---|---|---|---|---|
| Query pipeline + **derived status state machine** | LIVE | src/lib/queryDerivation.ts, recomputeQuery.ts, recordResponse.ts | — | `3166a60` *is* the derived-query-status merge. Extended heavily since (provisional dates, monotonic event time). |
| Contextual CTA engine + **Mark-sent popover** | LIVE | src/lib/queryPrimaryAction.ts (was inline in Queries.tsx at prod), src/components/MarkSentPopover.tsx | — | Both files exist at prod; engine since extracted to lib and shared by To-do/agents axes. |
| Record-response single path | LIVE | src/lib/recordResponse.ts | — | At prod; since reworked (undo, offer decisions, requeryPreference). |
| **Queries Hub F12 workspace** (list+reading pane, inline create, command bar, journal) | BUILT-UNDEPLOYED | src/components/Queries.tsx (3,785 lines), shell/F12Shell.tsx, reading-pane/QueryTimeline.tsx | Prod deploy decision; firestore.rules lockstep (§4.29) | Prod shows the 3166a60-era Queries page. Log-a-Query popup retired → inline `QueryCreatePane` seeded from anywhere. |
| **To-do board** (/todo: lanes, ledger, Today list, rituals, tour, task settings) | BUILT-UNDEPLOYED | src/components/todo/ToDoPage.tsx, src/lib/todoBoard.ts, todoWrite.ts | **Prod `firestore:rules` deploy** — the rules file's own comment marks the `tasks` block "EDITED, NOT DEPLOYED" (firestore.rules:606-608) | Under active rebuild during this audit (tightening P1/P2 landed mid-window; P3 in flight). |
| UserTask store + task flags (stance/snooze/committed) | BUILT-UNDEPLOYED | src/lib/db.tsx (:2158-2189, :2338-2354), firestore.rules:609-633 | Same rules lockstep | `dismissedTasks` retained read-only as legacy + migration (db.tsx:2359). |
| **Submission Package Workshop** (workshop + analytics tabs, tour, Pro gate) | BUILT-UNDEPLOYED | src/components/SubmissionPackages.tsx, components/packages/* (12 files) | Prod deploy decision | Whole `packages/` dir is post-prod. `#/pkg-lab` is its DEV review surface. |
| **Onboarding rebuild** (welcome + branches A/B/C) | BUILT-UNDEPLOYED | src/components/Onboarding.tsx, components/onboarding/* (13 files) | Prod deploy decision | Prod runs the old Onboarding.tsx. Branch B hosts Smart Import. |
| **Smart Import** (spreadsheet → AI extraction → review → commit → loader) | BUILT-UNDEPLOYED (client) | components/onboarding/SmartImportReview.tsx, ScatterSettleLoader.tsx, src/lib/smartImportCommit.ts, functions/src/smartImport.ts | Client unreachable until a hosting deploy; server entitlement gate live in code (Free = 1 lifetime, Pro = monthly) | `smartImportMap` function deployed to prod+dev `[inferred — per project notes; not verifiable from repo]`. A/B advisory-vs-blocking review gate listed as an open product decision in CLAUDE.md. |
| **Email import** (paste email → Pro-gated extraction → proposal review) | PARTIAL | components/emailImport/*, functions/src/emailImport.ts | Entry point still parked on `/email-import-dev` (App.tsx:660: relocation to Record-a-response pending); Pro gate | Function deployed prod+dev `[inferred — per project notes]`. UI reachable only via the dev route (which *is* in WORKSPACE_PATHS). |
| **Agent list** (card grid + flip editor, buffered drafts, 3-axis filters) | BUILT-UNDEPLOYED | components/agents/AgentList.tsx + agents/* (13 files), src/lib/agentList.ts, agentDraft.ts | Prod deploy decision | Prod shows the 3166a60-era Agents page; at HEAD `Agents.tsx` is a 2-line wrapper over AgentList. |
| **Discover new agents** (community pool, match reels) | BUILT-UNDEPLOYED | components/DiscoverNewAgents.tsx, src/lib/discoverAgents.ts, seedCommunityAgents.ts | `communityAgents` seeding is admin-only (hard-coded UID) | An older `Discover.tsx` existed at prod; rebuilt since. Derives from the global `communityAgents` collection. |
| **Manuscripts v2** (frontispiece plates + reveal) | BUILT-UNDEPLOYED | components/AllManuscripts.tsx, manuscripts/* | Prod deploy decision | File exists at prod in old form; plates/reveal are post-prod. |
| Comparable titles page + **Scout (suggestComps)** | PARTIAL | manuscripts/ComparableTitlesPage.tsx, src/lib/suggestComps.ts, functions/src/suggestComps.ts | **Function built, NOT deployed** (in-code header, `ad04e4a`); ANTHROPIC_API_KEY rotation unverified (CLAUDE.md loose end) `[inferred]` | Client fails to a quiet "unavailable" state; Pro-gated both sides. |
| **Pro assisted fill** (agent data via server web search) | PARTIAL | src/lib/assistFill.ts (`ASSIST_LIVE` flag), functions/src/assistAgentData.ts | Function **not in the compiled bundle** (functions/lib/index.js omits it — verified) and header says NOT DEPLOYED, pending key rotation | Server-side Anthropic web-search tool use; Pro-gated; client flag-gated. |
| `deleteManuscript` / `deleteAgent` / `deleteQuery` cascades + guarded confirms | BUILT-UNDEPLOYED | src/lib/db.tsx (:1150-1230, :1490-1560), cascade.ts | Prod deploy decision | Zero occurrences of `deleteManuscript` at 3166a60 (verified). |
| **Fortnight in Focus** | LIVE | (prod-era Dashboard.tsx — 12 references at 3166a60, verified) | — | **Retired at HEAD** — replaced by `DiaryCarousel` ("What's in the diary?"). Shipping HEAD removes it. |
| Dashboard rebuild (v37: stat cards + hover panels, OverToYou, timeline drawer, diary carousel, What's-live) | BUILT-UNDEPLOYED | components/Dashboard.tsx, dashboard/* | Prod deploy decision | Prod shows the old dashboard (with Fortnight). |
| **Nudge flow + draft generator** | BUILT-UNDEPLOYED | components/NudgeModal.tsx, src/lib/logNudge.ts, nudgeDraft.ts, forms/CheckBackSlider.tsx | Prod deploy decision | Copyable follow-up draft (clipboard) — the app never sends email. Isolated write path (NUDGE_SENT non-status activity). |
| **Theme system** (Cappuccino / Bold / Editorial) | BUILT-UNDEPLOYED | src/index.css (`.t-capp/.t-bold/.t-edn`), AppShell theme prop, AccountSettings.tsx:781 | Prod deploy decision | Zero theme classes at 3166a60 (verified). Persisted in `User.queriesTheme`. |
| **Notes / notes-and-tasks** (desk notes, dated tasks, composer, surfacing) | BUILT-UNDEPLOYED | components/notes/*, src/lib/db.tsx (:2070-2129), firestore.rules:597-604 | Prod rules lockstep for newer fields `[inferred — per project notes: dev rules deployed 29 Jul, prod pending]` | `#/notes-scan` (non-DEV-gated) is its convergence diagnostic. |
| **Marketing landing + route tiers** | BUILT-UNDEPLOYED | src/marketing/* (15 files) | Prod deploy decision; `scriptally.ink` DNS repoint is a separate console decision (CLAUDE.md) | Public `/` + `/pricing` with cancellable hero demo. |
| **Holding page + waitlist** | LIVE (separate site) `[inferred]` | holding/*, functions/src/waitlist.ts, firebase.holding.json | — | Deployed to the prod project's default hosting site per project notes; the `waitlist` function (public, unauthenticated, no App Check — flagged in its own header) serves `/api/waitlist`. Not verifiable from repo alone. |
| **Auth rebuild** (split-screen, Google, reset) | BUILT-UNDEPLOYED | components/Auth.tsx | Prod deploy decision | Prod has the 3166a60-era Auth. |
| **Search command palette** (⌘K, grouped results, contextual actions) | BUILT-UNDEPLOYED | shell/SearchPalette.tsx | Prod deploy decision | Replaced the nav typeahead. |
| **Capsule shell + rail + mobile pack** | BUILT-UNDEPLOYED | shell/* (37 files), BottomTabBar.tsx | Prod deploy decision | The entire chrome lineage (rail → AppShell → capsule → v2 bar/panel → mobile sheet chassis) is post-prod. |
| **Edit Agent / Edit Query drawers** (Form11 shell, atomic diffs) | BUILT-UNDEPLOYED | EditAgentDrawer.tsx, EditQueryDrawer.tsx, saveAgentEdits.ts, saveQueryEdits.ts, computeAgentDeadlineWrites.ts | Prod deploy decision | Retired QuerySlideInPanel + inline editors. |
| Genre taxonomy + personal genres + promotion queue | BUILT-UNDEPLOYED | src/lib/genres.ts, db.tsx:2093-2097, firestore.rules:673-682 | Prod rules lockstep | Writes to global `genreSuggestions` (admin-read). |
| Location / territory model (ISO countries, flags, homeCountry) | BUILT-UNDEPLOYED | src/lib/territory.ts, flag-icons | Prod rules lockstep for `homeCountry`/`country`/`city` `[inferred — rules deployed 5 Jul per notes]` | Seeded silently at signup; no settings editor writer found for homeCountry. |
| Account settings / Plans / Help pages | BUILT-UNDEPLOYED | AccountSettings.tsx, PlansPage.tsx, HelpCentre.tsx | Prod deploy decision | Account page carries deliberate `InertRow`/`ComingSoonPill` stubs (notifications, some prefs). PlansPage CTA is a no-op (`// TODO: wire plan selection later`). |
| CSV import (wizard) + data tools | LIVE | components/ImportCsv.tsx | — | At prod; since reworked (wizard, dedupe, reset-and-seed panels). |
| CI on push (typecheck, unit+rules tests, build, npm audit, gitleaks) | LIVE (repo infra) | .github/workflows/ci.yml | — | Post-prod addition but runs on origin pushes today; not a user-facing surface. |
| **QueriesLanding** | STUB/DEAD | components/QueriesLanding.tsx | — | Mounted only behind `/queries?view=landing`; no in-app navigation reaches it. |
| Legacy top-bar shell (`components/AppShell.tsx` + `Nav.tsx`) | STUB/DEAD | those two files | — | Zero importers (verified); superseded by shell/AppShell.tsx. |
| Retired sidebar chrome (`SidebarShell`, `SidebarNav`, `QueriesRail`) | STUB/DEAD (dev-lab-only) | shell/SidebarShell.tsx etc. | — | Reachable only via `#/shell-lab` (DEV). `ShellChrome.tsx`, `TopStrip.tsx`, `QueriesRailContext.tsx` have zero consumers at all. |
| Vestigial global activity store (`users/{uid}/activity`) | STUB/DEAD | Dashboard.tsx:573-588 (reader), firestore.rules:580-584 | — | Zero writers anywhere; the listener's state (`timelineItems`) is never rendered. See §3.2 Store C. |
| Agent `pinned` field | STUB/DEAD | types.ts:250, firestore.rules:530 | — | In the rules allowlist; **no UI writer exists in src** (verified — the only `pinned:` writes are localStorage prefs) `[inferred: not yet wired]`. |
| Manuscript notes subcollection ("jottings feed") | STUB/DEAD | firestore.rules:494-498; db.tsx:1176 (cascade delete only) | — | Rules + data intact; no writer, no reader UI. CLAUDE.md records its UI was removed pending "a future home". |
| `Query.rejectedDate` / `rejectionDetails` | STUB/DEAD | types.ts:345-346 | — | Declared, never written `[inferred]`. |

Cloud Functions status is in §3.4.

---

## 3. Data layer map

Firebase init: src/lib/firebase.ts (named DB via `VITE_FIREBASE_DATABASE_ID`, else default). **Prod config pins the client and rules deploys to database `ai-studio-ae82196c-…`** (.env.production:12, firebase.json:7); dev pins `(default)` (.env.development:14, firebase.dev.json:3).

### 3.1 Collections (client + functions)

| Path | Read by | Written by |
|---|---|---|
| `test/connection` | db.tsx:90 boot probe | — (rules allow unauthenticated read, firestore.rules:11) |
| `users/{uid}` | db.tsx:407 bootstrap, :433 onSnapshot; all four AI functions (plan gate) | db.tsx:423/:426 (create), :1042 `upgradeToPro`, :1054 `downgradeToFree`, :2318 `updateUserProfile` |
| `users/{uid}/private/entitlement` | db.tsx:447 onSnapshot; functions smartImport.ts:101 | **Admin SDK only** (smartImport.ts:124); client writes denied (rules:641-644) |
| `users/{uid}/manuscripts/{id}` | db.tsx:454 | seed :316; addManuscript :1087; updateManuscript :1121; setActivePackage :1145; setManuscriptShelved :1213; deletes :1186/:2589/:2660 |
| `…/manuscripts/{id}/notes/{id}` | db.tsx:1176 (cascade collect only) | **none** — writer-less (rules exist at :494) `[inferred: dead/legacy]` |
| `users/{uid}/versions/{id}` | db.tsx:465 | seed :320; add :1230; update :1244; delete :1258; cascades |
| `users/{uid}/packages/{id}` | db.tsx:474 | seed :324; add :1285; update :1299; retire :1308 (no hard delete); cascades |
| `users/{uid}/agents/{id}` | db.tsx:483; functions emailImport.ts:96 | seed :328; add :1347; update :1380; setAside :1568; saveAgentEdits.ts:207; recordResponse.ts:354/:393 (requeryPreference + undo); deletes :1518/:2598/:2660 |
| `…/agents/{id}/notes/{id}` | AgentList.tsx:369 onSnapshot; db.tsx:1508 cascade | AgentList.tsx:513/:542/:545/:551 — all inside the Done commit |
| `users/{uid}/queries/{id}` | db.tsx:494; Queries.tsx:653/:710; migrateDerivedStatus.ts:81; functions emailImport.ts:104 | addQuery :1643; recordMaterialsSent :1903; auto-close :1958; updateQuery :2201; nudge reconcile :2254; cleanDuplicates :2617; **recomputeQuery.ts:81**; recordResponse.ts:313/:389; saveQueryEdits.ts:171; smartImportCommit.ts:176; computeAgentDeadlineWrites.ts:50 (committed via saveAgentEdits.ts:208); deletes :1556 + cascades |
| `…/queries/{id}/activity/{id}` | see §3.2 Store A | see §3.2 Store A |
| `users/{uid}/activities/{id}` | see §3.2 Store B | see §3.2 Store B |
| `users/{uid}/activity/{id}` | see §3.2 Store C | **nobody** |
| `users/{uid}/journalEntries/{id}` | db.tsx:538 | seed :340; add :2028; delete :2037; update :2046 |
| `users/{uid}/notes/{id}` (desk notes / Notes-to-self) | db.tsx:547; NotesStoreScan.tsx:50 | add :2070; update :2117; delete :2129 |
| `users/{uid}/tasks/{id}` (UserTask) | db.tsx:558; NotesStoreScan.tsx:51 | add :2158; update :2180; delete :2189 |
| `users/{uid}/dismissedTasks/{id}` | db.tsx:567; migrate :2359 | **no writer left** (absorbed by taskFlags); wipe only |
| `users/{uid}/taskFlags/{id}` | db.tsx:576 | upsertTaskFlag :2347 (→ snooze :2352, resolve :2354, dismissTask :2411, logNudge :2448); migrate :2361; cascades |
| `communityAgents/{id}` (global) | db.tsx:618; seedCommunityAgents.ts:611 | seed :617 (**admin-UID-gated**); DiscoverNewAgents.tsx:228 (`contributedByCount: increment(1)` — the only client write rules permit) |
| `genreSuggestions/{uid}__{key}` (global) | — (admin-read only) | db.tsx:2097 addPersonalGenre |
| `waitlist/{sha256(email)}` + `counters/waitlist` | functions waitlist.ts (transaction) | functions waitlist.ts:89/:96/:99 — Admin SDK; client fully denied |

No `collectionGroup` queries exist. No `discoverAgents` or `submissionPackages` collections — Discover derives from `communityAgents`; packages live at `users/{uid}/packages`. Only transaction: waitlist. `writeBatch` sites: db.tsx:1156; saveAgentEdits.ts:206; saveQueryEdits.ts:101; emailImportCommit.ts:188/:216.

### 3.2 The three activity stores

**Store A — `users/{uid}/queries/{queryId}/activity` (AUTHORITATIVE).** The only store derivation reads. Writers (none of which is recomputeQuery — it only *reads* this store and writes the query doc):

1. `recordQueryResponse` (recordResponse.ts:314; deleted on undo :390)
2. backfill heal effect (db.tsx:927)
3. `addQuery` advanced-status seed (db.tsx:1655)
4. `updateQueryStatus` (db.tsx:1836)
5. `recordMaterialsSent` (db.tsx:1911)
6. `logNudge` — non-status "Nudge sent" (db.tsx:2432)
7. `recordOfferDecision` (db.tsx:2470)
8. `editActivity` (db.tsx:2292)
9. `commitQueryEdits` (saveQueryEdits.ts:106/:144/:150)
10. `commitSmartImport` (smartImportCommit.ts:187 delete, :191 set)
11. `commitEmailImport` (emailImportCommit.ts:173/:192)

Additional deleters: undoQueryStatus (db.tsx:1992), deleteActivity twin (db.tsx:2240), cascades (:1186/:1518/:1557), migration heal-stamp (migrateDerivedStatus.ts:116), RecordResponseFocusForm pre-clears (:338/:350), and the one-shot `runTimelineCleanup` (Queries.tsx:702-744 — deletes non-enum-type and same-type-duplicate docs; plus the hardcoded retrospective insert, §4.21).

**Store B — `users/{uid}/activities` (GLOBAL FEED PROJECTION).** Read by the Dashboard timeline and the task engine. Writers: seed (db.tsx:336), `addActivity` (db.tsx:2218 — the shared primitive used by add/update/delete manuscript/agent, backfill, logNudge, recordOfferDecision), addQuery (:1648), updateQueryStatus (:1830), recordMaterialsSent (:1921), dismissTask nudge branch (:2398 — an independent NUDGE_SENT row with no Store-A twin), recordQueryResponse secondary (recordResponse.ts:332), commitQueryEdits twins (saveQueryEdits.ts:115/:177/:180), commitEmailImport (emailImportCommit.ts:221), commitSmartImport (smartImportCommit.ts:229/:233). recomputeQuery neither reads nor writes it.

**Store C — `users/{uid}/activity` (LEGACY, VESTIGIAL).** **Zero writers** anywhere in src/ or functions/. One reader: Dashboard.tsx:573-588 — a live `onSnapshot(…, orderBy createdAt desc, limit 20)` into `timelineItems`, which is **never rendered** (`mergedActivities` at Dashboard.tsx:1095-1106 deliberately excludes it; recordResponse.ts:16/:325 documents the write-side removal). Net effect: a wasted listener + 20-doc read per Dashboard mount. Rules still permit writes (firestore.rules:580-584).

### 3.3 Derived vs stored

**Query** — derived by `recomputeQuery` (writes exactly 7 fields in one updateDoc, recomputeQuery.ts:81-89; reads ONLY Store A): `status`, `partialRequestedDate`, `partialSentDate`, `fullRequestedDate`, `fullSentDate` (each `deleteField()` when provisional/absent), `revisionRound`, `hasAgentResponded`. 15 call sites (recordResponse ×2, saveQueryEdits, smartImportCommit, emailImportCommit, migrateDerivedStatus, db.tsx backfill/:1664/:1679/:1846/:1922/:2010/:2244/:2300/:2478). Exception: `addQuery` also sets the *initial* `status` in its create payload (db.tsx:1596), and `status` remains in the rules update allowlist (firestore.rules:552).

Stored directly on Query: `dateSent` (addQuery :1597; saveQueryEdits :157; smartImportCommit :176 deleteField for undated), `responseReceivedAt` (recordResponse :241, undo :369, auto-close db.tsx:1959 — **`updateQueryStatus` never stamps it**, flagged in-code at db.tsx:1934-1937), `lastStatusChange` (recordResponse :240, undo, auto-close), `responseDeadline` (addQuery :1588; recordMaterialsSent :1881; saveQueryEdits :165; agent-edit fan-out computeAgentDeadlineWrites.ts:50), `nudgeDate`/`lastNudgeSentDate` (logNudge.ts:116 via db.tsx:2444; recordMaterialsSent :1882; reconciled on activity delete :2255-2256), `materialsWanted` (create; saveQueryEdits :161; inline pill edit Queries.tsx:1226), `packageId` (create; saveQueryEdits :167; mutually exclusive with materials via packageMetrics.ts:339), the whole response-detail block (recordResponse.ts:244-263, reverted :370-385), and identity/edit fields via saveQueryEdits.ts:160-169.

**User** (all through `updateUserProfile` → updateDoc): `journeyStage` + `queryingStage` (Onboarding.tsx:990-1004, :1109), `plan` (create FREE; upgrade/downgrade db.tsx:1042/:1054; read server-side as the Pro gate by all four AI functions), `homeCountry` (seeded at create via `homeCountrySeed()` db.tsx:421 — key omitted when unresolvable; **no settings editor writes it**), `queriesTheme` (AccountSettings.tsx:781), `hasSeenTour` (SubmissionPackages.tsx:116), `tourSeenAt` (ToDoPage.tsx:657), `onboardingComplete` (create false; App.tsx:540; Onboarding :1110), `mutedTaskRules` (TaskSettingsSheet.tsx:53-58; ToDoPage several), `personalGenres` (db.tsx:2093). `smartImportFreeUsed`/`smartImportLastUsedMonth` live in the server-only `private/entitlement` subdoc.

**Agent**: `notePreview` — stored display cache, single writer = the AgentList Done commit (AgentList.tsx:581, computed by agentNotes.ts:121 gated on a real `loaded` flag); `pinnedNoteId` (AgentList.tsx:572); `pinned` — **no writer** (§2); `submissionStatus` stored (updateAgent/commitAgentEdits/addAgent; UNKNOWN reads as open at lifecycle.ts:22); `setAside` (db.tsx:1568); `country`/`city` stored (saveAgentEdits.ts:109-114; territory derivation is read-time only); `lastCheckedDate` — two policies: addAgent stamps now (:1334), `updateAgent` **stamps on every update** (:1382), while `commitAgentEdits` deliberately never touches it (saveAgentEdits.ts:175-178); `responseTimeWeeks` (null ⇒ deleteField, saveAgentEdits :160); `noResponseMeansNo`/`mswlNotes`/`materialsWanted` (hkSave.ts:48-50 + editors); `fieldSources` provenance (hkSave.ts:53); `requeryPreference` (recordResponse.ts:354/:393); `importedNeedsReview` (both import commits); `starRating` (validated 1-5, absent = unrated).

**Other**: `Manuscript.statusChangedDate` auto-stamped (db.tsx:1119); `shelved` overlay (:1213); `activePackageId` single-writer (:1145); `SubmissionPackage.status` Active/Retired (:1280/:1308); TaskFlag fields full-overwrite setDoc (:2338-2347); UserTask `done/completedAt/committedDate/surfaceOffset` (:2180, committedDate null ⇒ deleteField :2178); `Activity.dateProvisional` import flag (suppresses derived stage dates, recomputeQuery.ts:79; cleared on user-supplied date, saveQueryEdits.ts:140); `CommunityAgent.contributedByCount` increment-only (client + rules-enforced +1); the To-do task list itself is **derived, never stored** (db.tsx:635-820, suppression via taskFlags :808-817).

### 3.4 Cloud Functions (all `europe-west2`, Node 20, `@anthropic-ai/sdk ^0.39`)

| Function | Type | Gating | Secrets | Model / params | Deployed? |
|---|---|---|---|---|---|
| `smartImportMap` (smartImport.ts:78) | onCall, 90s/512MiB | auth; entitlement: Free = 1 lifetime, Pro = 1/UTC-month (users/{uid}/private/entitlement, Admin-SDK consume) | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6`, max 12000 tok, temp 0 | Prod + dev `[inferred — project notes; deploy scripts target it by name]` |
| `extractFromEmail` (emailImport.ts:47) | onCall, 60s/512MiB | auth + Pro | same | `claude-sonnet-4-6`, 1500 tok, temp 0 | Prod + dev `[inferred — project notes, verified via functions:list 5 Jul per notes]` |
| `suggestComps` (suggestComps.ts:42) | onCall, 60s/512MiB | auth + Pro | same | `claude-sonnet-4-6`, 1200 tok, temp 0.7 | **Not deployed** — in-code "BUILT, NOT DEPLOYED" `[inferred for the remote state]` |
| `assistAgentData` (assistAgentData.ts:36) | onCall, 120s/512MiB | auth + Pro | same | `claude-sonnet-4-6`, 1500 tok, temp 0.2, **server web-search tool** (`web_search_20250305`, ≤12 uses) | **Not deployed** — header says so, and it is absent from the compiled `functions/lib/index.js` (verified) |
| `waitlist` (waitlist.ts:46) | **onRequest** (public HTTP), 30s/256MiB | **none** — unauthenticated; no App Check (absence flagged in its own header :22-23) | none | none | Live behind the holding site's `/api/waitlist` rewrite `[inferred]` |

functions/ imports nothing from src/ (verified; `rootDir: "src"` makes it structurally impossible); cross-boundary constants are duplicated with sync comments (e.g. `PRO_PLAN = "Pro"`).

### 3.5 Firestore config + rules

**Configs:** `firebase.json` → site `scriptally-app`, rules wired, DB pinned `ai-studio-ae82196c-…`, functions predeploy build; `firebase.dev.json` → site `scriptally-dev`, rules wired, DB `(default)`, **no functions block**; `firebase.holding.json` → `holding/` public + `/api/waitlist` rewrite, no firestore block; `firebase.app.json` (extra) → site `scriptally-app`, hosting only. `.firebaserc`: default = prod = `gen-lang-client-0801391782`; dev = `scriptally-dev`. `deploy:dev`'s functions step runs without `--config`, so it reads `firebase.json` `[inferred]`. `scripts/assert-build-target.mjs` hard-fails a build whose bundle contains the wrong project ID. **No `firestore.indexes.json` exists in the repo** — composite indexes are not managed in-repo `[inferred: console-managed]`.

**firestore.rules (691 lines, clean at HEAD):** default-deny catch-all; then per-collection owner-scoped blocks with create/update validators and `affectedKeys().hasOnly([...])` update allowlists — summarised: `users` (13-key allowlist), `manuscripts` (13 keys + notes subcoll), `versions` (7), `packages` (5), `agents` (26 keys + notes subcoll with text-only updates), `queries` (**37-key allowlist**, 10-value status enum + nested `activity`), `activities` (5 keys, 12-value activityType enum, `resultingStatus` restricted to the 10 statuses), top-level `activity` (legacy, still writable), `journalEntries`, `notes` (closed 9-key shape, colour enum), `tasks` (closed 14-key shape; **`committedDate` present in the create shape but absent from the update allowlist**), `dismissedTasks`, `taskFlags` (closed shape, no isValidId on the path), `private/*` (client write: false), `communityAgents` (read signed-in; create/delete admin-only via hard-coded UID `r8kbaKbmguNfaoJTb9wH4BetJab2`; update = `contributedByCount` exactly +1), `genreSuggestions` (create own, admin read), `waitlist`/`counters` (client denied), `test/connection` (public read).

**"Uncommitted rules dirt": none.** `firestore.rules` was clean at HEAD throughout the audit window — the brief's expectation is stale. The deployed-vs-repo skew is instead recorded *inside* the file: the `tasks` block is annotated "EDITED, NOT DEPLOYED" (firestore.rules:606-608). 44 commits touched the rules since prod baseline (§5.3).

**Rules tests:** tests/rules/firestore.rules.test.ts (1046 lines) via `@firebase/rules-unit-testing` + emulator, wired into CI. Covers users (incl. the private/entitlement lockout), manuscripts, versions, packages, agents, queries + nested activity, activities (incl. resultingStatus enum), legacy activity, journalEntries, dismissedTasks, communityAgents (admin + counter hardening), waitlist/counters. **No suites for `notes`, `tasks`, `taskFlags`, `genreSuggestions`** `[inferred from absence]`.

---

## 4. Health & debt register

1. **tsc: clean** — 0 errors at the audited tree state. The brief's expected `agentsPage.ts` red is not present.
2. **Vitest red at the audited (dirty) state** — 5 failures, all `src/components/todo/todoWorkbench.test.ts` (names in §0.8), all assertions on source strings the uncommitted tightening-P2 diff had renamed; the same strings exist at the then-HEAD (verified for the `AGENT WAITING` case). The mid-audit commit `07f3fcf` updated the test file alongside the source.
3. **Two skipped tests** (deliberate, labelled SUPERSEDED): todoWorkbench.test.ts:114, :1201.
4. **TODO comments (all TODO; zero FIXME/HACK/XXX in src, functions, scripts, tests):**
   - src/components/PlansPage.tsx:7 — `* placeholders (// TODO: wire later). Reuses the shared MountPanel clipping card, the dashboard`
   - src/components/PlansPage.tsx:145 — `onClick={() => { /* TODO: wire plan selection later — presentational only for now */ }}`
   - src/components/todo/ToDoPage.tsx:525 — `// TODO(pro-assistant): replace canned theatre with real single-task free run ("Try one free")`
   - src/components/reading-pane/QueryTimeline.tsx:196 — `// TODO(per-send-materials): the activity log records no per-event materials, so Partial/Full sent`
   - src/lib/smartImportReviewModel.ts:365 — `// TODO: extend to one-absent — an agency-less agent could also match a PRESENT-agency agent by name;`
   - src/lib/db.tsx:1934 — `// TODO (future unification pass): the three close paths — this auto-close, manual` (companion fact: `updateQueryStatus` never stamps `responseReceivedAt`)
   - (4 further hits in todo/assistantPromo.test.ts:8/:81/:115/:119 are assertions that *lock* the ToDoPage TODO, not debt of their own; 1 hit in design-refs/todo-v4.html:11 is mockup prose.)
5. **Dead orphan cluster — legacy top-bar shell:** src/components/AppShell.tsx (26.9 KB) + src/components/Nav.tsx. Zero importers (verified); superseded by shell/AppShell.tsx.
6. **Dead orphans — retired sidebar chrome:** shell/ShellChrome.tsx (3 exports, zero consumers), shell/TopStrip.tsx, shell/QueriesRailContext.tsx (imported only by dead TopStrip).
7. **Dev-lab-only survivors:** shell/SidebarShell.tsx, shell/SidebarNav.tsx, shell/QueriesRail.tsx — reachable only via `#/shell-lab` (DEV).
8. **Vestigial activity store live cost:** Dashboard.tsx:573-588 subscribes to writer-less `users/{uid}/activity` (limit 20) into `timelineItems`, which nothing renders (excluded at :1095-1106). Rules still allow writes to the dead store (firestore.rules:580-584).
9. **`users/{uid}/dismissedTasks`:** writer-less legacy store — still listened to (db.tsx:567) and migrated from (:2359); deleted only by wipe.
10. **`users/{uid}/manuscripts/{id}/notes`:** rules exist (firestore.rules:494), zero writers/readers except cascade delete — the homeless "jottings feed" data path.
11. **`Agent.pinned`:** in types (types.ts:250) and the rules allowlist (firestore.rules:530) with no UI writer `[inferred: unwired]`.
12. **`Query.rejectedDate`/`rejectionDetails`:** declared (types.ts:345-346), never written `[inferred: dead fields]`.
13. **qhbar: verified absent as live code.** No CSS rule or render site anywhere — the brief's "inline qhbar copies in Queries.tsx" and "dead `.t-capp .qhbar::after` selector" both no longer exist. Remaining occurrences are tombstone comments (index.css:766-767, agentsV2.css:11/:653, SubmissionPackages.tsx:7, PackageWorkshop.tsx:7/:12) and a negative lock (topCrumb.test.ts:102).
14. **`#/pkg-lab`:** DEV-gated (App.tsx:470) and tree-shaken from prod builds per reports; PkgLab.tsx:10 carries its own removal note ("remove when the workshop ships"). Several run reports flag it "must be removed before any prod deploy".
15. **`#/notes-scan` is reachable in prod builds by design** (App.tsx:416-421, deliberately not DEV-gated, marked TEMP/DELETE-with-component). Read-only, rules-scoped to the signed-in user.
16. **`/email-import-dev` is a plain workspace route** (routeTiers.ts:21) — no DEV gate; any signed-in user on a prod build can reach it by URL. Only its nav entry is absent.
17. **Burgundy drift confirmed, both values as expected:** src/index.css:27 `--burg-d: #632e22` (defined, referenced **nowhere** — the CSS side is dead) vs src/lib/designTokens.ts:62 `deepBurgundy = "#6b3023"` (live via notes/NoteEditor.tsx:210 and notes/NoteComposeCalendar.tsx:54). `#632e22` also appears hardcoded in Queries.tsx:1038 (`primaryHover`) and :2273 (a compiled hover class). Primary `#7c3a2a` agrees across both sources; index.css:23-24 self-flags the JS/CSS duplication as a consolidation follow-up.
18. **camelCase status literals (the only ones in the repo):** Queries.tsx:878-886 `getToastTitle` compares against `"partialRequested"`, `"fullRequested"`, `"reviseAndResubmit"`, `"noResponse"` — none is produced anywhere (the responseType union is `"queried"|"partial"|"full"|"rr"|"offer"|"rejected"|"close"`, recordResponse.ts:38), so the branches are unreachable rather than misfiring. Separately, Queries.tsx:1889-1913 `mapActivityToEvent` builds a parallel sentence-case status vocabulary ("Partial sent" etc.) by substring-matching activity prose, internally consistent but a second vocabulary beside the enum. `QueryStatus` enum usage is otherwise exact app-wide, including functions/ (emailImportCore.ts validates against the 10 exact strings).
19. **Tabler icons:** zero `.ti` class usage anywhere in src (TypeGlyph is hand-rolled SVG, not Tabler) — but index.html:13 still loads the Tabler webfont CSS from jsDelivr with no consumer (a render-blocking external request in every build).
20. **Dead imports:** Dashboard.tsx:55 `HeroCard` and :69 `StatCards` are imported and never rendered.
21. **Hardcoded personal-data repair code in a shipped component:** Queries.tsx:702-784 `runTimelineCleanup` — a `localStorage('timelineCleanupV3')`-guarded one-shot that (a) deletes every Store-A activity doc whose `type` is not a QueryStatus enum value, (b) deletes same-type duplicates keeping the newest, and (c) inserts a retrospective `PARTIAL_REQUESTED` activity for a query hardcoded to agent `'Murphy Wurph'` / manuscript `"Bethus' Beautiful Peonies"`. Runs once per browser for every user on Queries mount.
22. **Bundle size:** single main chunk 3,845 kB (gzip 1,050 kB) + 884 kB CSS; Vite's own >500 kB warning fires on every build (§0.7).
23. **routeTiers.test.ts:25-28** exercises `/manuscripts` and `/manuscripts/packages` but not `/manuscripts/comps` — the set contains it, the lock doesn't cover it.
24. **Landing footer → `/help`:** for a logged-out visitor this resolves to the Auth signup screen, not Help (Landing.tsx:56 + App.tsx branch order) `[inferred]`.
25. **Orphaned page:** QueriesLanding behind `/queries?view=landing` — `pathFor("queries","Landing")` (App.tsx:317) has no caller.
26. **Stale comments referencing deleted chrome:** ChromeSlab/CrumbStrip prose survives in App.tsx:602/:620, Queries.tsx:2204, F12Shell.tsx:6, shell/AppShell.tsx:7/:85/:342, SubmissionPackages.tsx:7/:18, ComparableTitlesPage.tsx:11/:566, ImportCsv.tsx:659; App.tsx:39-40/:342 still describes the retired focus tier; AccountSettings.tsx:879 + PlansPage.tsx:340 reference the deleted FocusShell.
27. **Rules-vs-prod skew is recorded in-repo:** firestore.rules:606-608 marks the `tasks` block "EDITED, NOT DEPLOYED"; 44 rules commits since the prod baseline. Also `types.ts:38/:44/:51` comments still call `personalGenres`/`hasSeenTour`/`tourSeenAt` "parked" although they are in the committed rules allowlist (stale comment).
28. **Rules-shape wrinkle:** `tasks` update allowlist omits `committedDate` although the create shape includes it (firestore.rules:609-616) — recorded as found; whether any client update writes it was not traced.
29. **What a prod deploy from HEAD would entail today:** `npm run build`/`build:prod` and tsc are green, and `assert-build-target` guards the project ID — nothing hard-breaks the artefact. But `firebase deploy --only hosting` from HEAD would put a client in front of users that writes to `tasks`, `taskFlags`, `notes` (new fields), `genreSuggestions`, and reads `communityAgents` under whatever rules are actually deployed to prod (last full prod rules deploy 5 Jul per project notes `[inferred — remote state not readable from the repo]`); every write outside the deployed allowlists would be silently denied. The repo's own mechanism for this is the paired `deploy:rules` script. Additional standing flags: the ANTHROPIC_API_KEY rotation is recorded as unverified (CLAUDE.md); `suggestComps`/`assistAgentData` remain undeployed (their client paths are flag-gated or fail quiet); `#/notes-scan` and `/email-import-dev` ship reachable (items 15-16); prod deploys are Nick's only, per CLAUDE.md.
30. **Hard-coded admin UID** in firestore.rules:47-49 (`isAdmin()`), required to stay in sync with `src/lib/seedCommunityAgents.ts` by comment.
31. **`/test/connection` allows unauthenticated reads** (firestore.rules:11-13) — a boot-probe design choice, recorded as found.
32. **Committed `.env.development`/`.env.production`** carry the Firebase web config (public-by-design values; CI runs gitleaks) — recorded as found.
33. **Four firebase configs** including the redundant-looking `firebase.app.json` (same site as firebase.json, hosting-only, referenced by no script) `[inferred: leftover]`.
34. **Concurrent-session hazard:** two sessions sharing this checkout during the audit (§0.1) — itself a violation of the repo's own one-session-per-tree rule.

---

## 5. Deploy delta (everything on main since `3166a60`, grouped by feature)

**Pinned range: `3166a60..07f3fcf` — 1,134 commits; 752 files changed, +161,905 / −19,066.** Add/modify/delete split: **700 added / 46 modified / 6 deleted**. Where it lands: src/components 29.3%, src/lib 24.2%, design-refs 20.0%, reports 11.9% (dirstat by files). `src/` grew from 51 files at prod to 433 at HEAD. Roughly a third of the volume is non-shipping reference material (design-refs/, reports/, design-reference/) `[inferred: not bundled]`.

**Framing fact for the MVP conversation: prod and HEAD are effectively different applications.** Only 46 of prod's files survive in modified form; every navigation surface (shell/), the to-do board, packages, manuscripts v2, marketing, the rebuilt onboarding, and the entire server tier (functions/ did not exist at prod) are net-new. Shipping HEAD is a relaunch, not an increment.

New-since-prod spot checks (all verified with `git cat-file`): shell/AppShell.tsx ✗at-prod, marketing/Landing.tsx ✗, todo/ToDoPage.tsx ✗, agents/AgentList.tsx ✗, components/manuscripts/* ✗ (0→4 files), components/packages/* ✗ (0→12), lib/todoBoard.ts ✗, onboarding/ScatterSettleLoader.tsx ✗, functions/ ✗ (0→21 files); recordResponse.ts ✓ existed at prod. Present at prod and rebuilt in place: Dashboard.tsx, Queries.tsx, Agents.tsx, Onboarding.tsx, AllManuscripts.tsx, Auth.tsx, ImportCsv.tsx, Discover.tsx (old form; now DiscoverNewAgents.tsx).

### 5.1 Workstream groups (chronological; counts overlap where a commit spans streams)

| # | Group | ~n | Range | What shipping HEAD adds vs prod |
|---|---|---|---|---|
| 1 | Env split + cloud-only collapse | 8 | `29680d6`→`15599c5` | Dev/prod Firebase projects via env; offline/demo modes and auto-registration removed; real password auth. |
| 2 | Onboarding rebuild (A/B/C branches) | 8 | `a1b39e5`→`3e1a17e` | Welcome + stage picker; branched flows; legacy screens deleted. |
| 3 | Add Agent form v3 | 3 | `62c529a`→`0c34533` | Single sectioned Form-11 layout, socials fields. |
| 4 | Smart Import (extraction, review, guided walk, loaders) | 76 | `d9586c8`→`3c16c48` | Spreadsheet → AI extraction with multi-stage review, duplicates stage, set-aside/undo walk, deterministic date parsing, scatter-settle loader. |
| 5 | StatusDot + theme tokens | 45 | `59d9ae6`→`804f578` | One canonical status glyph system; the token layer behind Cappuccino/Bold/Editorial/F12. |
| 6 | Dashboard build-out | 47 | `5d3173a`→`1603fc8` | Stat cards + hover panels, story timeline, diary carousel (supersedes Fortnight in Focus), What's-live, clean boot. |
| 7 | Lifecycle: shelve / set-aside / guarded cascade deletes | 9 | `cd6293d`→`2224ae9` | deleteManuscript/deleteAgent/deleteQuery with cascades and confirms; shelving. |
| 8 | Account settings + plans | 5 | `37c1faa`→`6d10554` | Real account screen; Free-vs-Pro plans page. |
| 9 | Security / rules hardening | 12 | `7486bc8`→`8bc3f64` | PII logging stopped; dev-gating; communityAgents admin lockdown; activity enum validation; user-task create-deny fix. |
| 10 | Tests, CI, deploy guards | 12 | `8af4f74`→`a825600` | Vitest suites; rules test harness (`b0a66d2`) + CI workflow; `assert-build-target` welding build mode to deploy target. |
| 11 | Type safety + error boundary | 3 | `59db56f`→`7dec7a7` | @types/react; top-level ErrorBoundary. |
| 12 | Holding page + waitlist | 26 | `e1a0c43`→`cd0640b` | Public coming-soon site + server-backed founding-writer signup (separate hosting site). |
| 13 | Brand assets v2→v3 | — | `9921b8b`→`028f322` | New wordmark/logo, favicon, tab title. |
| 14 | Email import (Pro) | 5 | `2eeaa4e`→`abf50bb` | Paste-an-email → extraction → reviewed proposal → persisted records. |
| 15 | Notes / post-it desk | 32 | `514737b`→`b4ec230` | Owner-scoped notes store, PostIts, dated notes as to-dos, full lifecycle. |
| 16 | Queries workspace rebuild(s) | 124 | `af0497f`→`ef7d37c` | The most-iterated surface: desk shell → masthead pane → F12 hub; inline creation replacing the popup; free-tier 10-query limit removed (`22e2876`). |
| 17 | Submission packages / Package Workshop | 93 | `f1d8a1b`→`6677428` | Packages data layer → tabs → composer → full two-window Workshop + analytics, Pro-gated. |
| 18 | Edit Agent drawer + Form11 shell | 17 | `8a6fa3a`→`9799491` | In-place agent editing, atomic diffs, deadline fan-out. |
| 19 | Edit Query drawer + shared form primitives | 7 | `a240b5d`→`a7173de` | Editable query drawer, correction fork, journal CRUD; retires QuerySlideInPanel. |
| 20 | Territory / location model | 7 | `3671c79`→`ad1a03a` | ISO countries + flags, homeCountry seed, CountryCombobox. |
| 21 | App shell, rail, chrome, navigation | 96 | `398eab1`→`657bfc8` | Rail → global AppShell + URL routing → capsule shell → v2 bar/panel → per-page header; mobile tab bar. |
| 22 | Agents / Contact list / Discover rebuilds | 67 | `eb525c2`→`6d40e2b` | Agents rebuilt twice (reading-pane hub, then card-flip AgentList); Discover as its own page; three-axis status model. |
| 23 | Manuscripts + comparable titles | 15 | `2b6b78e`→`dd81bdd` | CompTitle[] hard cut; plates page; comps sub-page; Scout panel (flag-gated). |
| 24 | Interactions stream (toasts, genres, composer, UserTask) | 49 | `62c5f2a`→`4e4355f` | Toast+undo system; genre taxonomy; inline response composer; canonical tasks store; structured materials; deleteQuery. |
| 25 | Tracking / grace / overdue / nudges | 29 | `a2fce7d`→`ed909ce` | Escalation state machine, progress geometry, nudge chips/events, expected-date override. |
| 26 | **To-do board (F12 → ledger grid)** | 243 | `4aa7803`→`07f3fcf` (HEAD) | The largest stream by volume: tasks store, lanes/cards, Today list + rollover, rituals, tours, assisted fill, workbench/ledger, notes-and-tasks unification, ~a dozen named redesign passes; still moving at audit close. |
| 27 | Marketing landing + route tiers | 5 | `f63fff8`→`cd0640b` | Public landing with the two-act demo; MarketingShell tiering. |
| 28 | Command-palette search | 6 | `f4a4f53`→`797277b` | ⌘K palette, grouped results, contextual actions. |
| 29 | Mobile pack | 7 | `16440ae`→`d5ce492` | Sheet chassis, floating tab bar, per-page mobile reflows, manifest, scroll containment. |
| 30 | Misc / chores / docs / design refs | ~137 | throughout | 151 design-refs + 90 reports + CLAUDE.md ground truth; strays that ship: favicon/title, `#/notes-scan` TEMP route (`38a8a8b`), DEV background lab (`f615b27`), dead-calendar removal (`e3543e9`); merges `5d02ab0`/`463a218`/`935891f`/`b895570` folding the claude-il branch in; WIP-park snapshot `06bb6ea`. |

### 5.2 Rules delta (44 commits on firestore.rules since prod)

Newest-first head of the list: `8bc3f64` (user-task CREATE deny bug fix), `7b55d23` (notes-and-tasks composer schema), `25b3a86`, `21fea7b`, `33f8d61`, `5693f74` (tasks store, retire Ledger), `73a3e84`, `7234b7b`, `2def065` (reconcile duplicate isValidUserTask from two streams), `3abc277` (UserTask.dueDate), `ca11d3e`, `a2cfa6d` (canonical tasks store + parked rules), `ac13b4f`, `6a50ae0` (taskFlags stance store), `70fa018` (personal genres + promotion queue), `44e500d`, `d3dbdf7` (Notes store), `4612e6f`, `dd81bdd`, `60fb9af` (location/territory). Earlier, security-relevant: `7486bc8` (missing validators, drop camelCase statuses), `057adf0`+`2071ccd` (communityAgents lockdown), `3b50b74` (resultingStatus enum), `1e00a97` (agent identity = name OR agency), `8f0c85f` (homeCountry), `514737b`/`98ee029` (notes), `baa3a0b` (editorial theme), `b0a66d2` (rules test harness + CI).

### 5.3 Server delta (functions/ — 15 commits, directory entirely new since prod)

`660ac26` (Branch B3 + Smart Import) → `d9586c8`/`c8a366b`/`7c20d20`/`0826170`/`475e22b`/`d4af58d`/`b119b72`/`9253b76`/`1d142a6` (smart-import extraction hardening) → `2eeaa4e` (extractFromEmail) → `e1a0c43` (waitlist) → `f5bd5ae` (server entitlement gate) → `ad04e4a` (suggestComps, build-only) → `b3885a8` (assistAgentData + housekeeping batch).

---

## 6. Open questions

1. **Where is prod, really?** The brief pins prod at `3166a60` (2026-06-12). Project notes (CLAUDE.md / memory) claim later prod activity: the AppShell rollout "live on prod" (~3 Jul), a Smart Import review build "deployed to prod hosting" from `fix/clean-dashboard-load` (a branch that no longer exists), `smartImportMap`/`extractFromEmail` deployed to prod functions, and a full prod rules deploy on 5 Jul. Deployed remote state is not readable from the repo, and no read-only check was run against Firebase. **If prod hosting actually tracks something later than `3166a60`, the LIVE/BUILT-UNDEPLOYED split in §2 and the delta in §5 shift accordingly.** All §2 statuses follow the brief's baseline as instructed.
2. **The brief appears drafted against an older repo state.** Five of its expectations match nothing at HEAD: the dirty files (index.css/firestore.rules/App.tsx — actual dirt was three todo files), the "uncommitted PaintMode tool in App.tsx" (never existed in App.tsx history), the `fix/onboarding-trap` remote branch (absent), the `agentsPage.ts` tsc red (tsc is clean), and the live `qhbar` copies/selector (retired; only tombstones remain).
3. **Which session was committing during the audit** (todo tightening P1→P2→P3) — not identifiable from git metadata; the end-of-audit tree cannot be attested byte-identical because it was being edited by that session throughout. This audit's writes: exactly this file, untracked.
4. **Actual deployed rules/functions inventory** (prod and dev) — needs `firebase` CLI reads that were not run (read-only mandate + prod-deploy policy). All deployment claims outside the repo are `[inferred]` from project notes.
5. **ANTHROPIC_API_KEY rotation** — CLAUDE.md records it as advised-but-unconfirmed; nothing in the repo can confirm it.
6. **Vitest suite state at `07f3fcf` and after** — the suite was only run against the 21:19 dirty snapshot (red 5, all dirt-induced); the tree never settled long enough in-window for a clean-HEAD run.
7. **Whether any client code updates `UserTask.committedDate`** post-create (it is absent from the tasks update allowlist, §4.28) — not traced to a conclusion.
8. **`firebase.app.json`'s purpose** — identical target to firebase.json, hosting-only, referenced by no script `[inferred: leftover]`, unconfirmed.
