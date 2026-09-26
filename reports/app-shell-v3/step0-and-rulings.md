# App shell v3 — Step 0 findings and Nick's rulings (26 Sep)

Companion to `cc-prompt-app-shell-v3.md` (same folder, SHA256 `96c4c88d…a36509`, as supplied in the handoff pack).
Refs committed and hash-verified at `ab3ce108` in `design-refs/shell/`; the three text refs are enrolled in
`design-refs/.refhashes.json`.

Step 0 was run in a cloud session on `main` @ `ab3ce108`. It completed every item except **item 10 (harness)**:
the cloud container had no `SA_E2E_PASSWORD`, so the app could not be rendered signed in. The mock itself rendered with
all three web fonts loaded at 1280/1440/1920 (sidebar 248 × full height, top bar 64 at x 248, active nav item 220 × 33
at x 14, help button right edge 24 from the bar's right, `.group` at y 92).

**The work moved to a local session for that reason.** Everything below is what that session needs; line numbers are at
`ab3ce108` and may drift.

---

## Baseline (cloud, `ab3ce108`) — re-record before the first edit

- tsc: clean
- `npm run build:dev`: clean (no error / `[WARNING]` lines)
- Vitest: 497/498 files, 8,292 passed, 3 skipped. The one failure is `functions/src/email.test.ts`
  (`Cannot find package 'firebase-functions/params'`), because `functions/` deps were not installed. Environmental.
  Locally it may pass if `functions/node_modules` exists — record whatever you actually see.

---

## Nick's rulings on the Step 0 report (binding)

1. **`--ws-window` readers (accepted). Split the token.** Grounds and fades follow the page ground: `.wpg-dock`,
   `.wpg-hem--bot`, `.wpg-chrome` ×2, `.wpg-toolband`, `.wpg-bar`, `.tpl-hem`, `--tdg-ground`, `--clv-ground`, and the
   Query Centre's local override. Card and control surfaces move to a **new surface token that keeps today's exact
   computed colour**: `.qc-card`, `.sa-inline:focus`, `.ws-backapp:hover`, and the Manuscripts `bookProfile`, hero-card
   and promos cards. Prove no card surface changes colour with a before/after computed-colour check, and add it to L13's
   population.
2. **Settings semantics (accepted).** SettingsRail items are tabs, so L3 checks for exactly one `aria-selected="true"`
   there, with the same anthracite and cream colours. `aria-current="page"` stays the rule for the app nav.
3. **APP_MARK (accepted).** There is no existing position assertion to update. Add one to L8: the mark is horizontally
   centred in the sidebar (±1) when collapsed at 68px, and sits at the mock's position when expanded.
4. **The whisper (accepted).** It cannot report a failure, so item 3's STOP cannot fire. Remove it as Phase 4 says. L11
   stays as a guard on the paths that already report failures.
5. **Sidebar width.** 224px today, 248px is the target. Intended. Report which pages lose width and whether any of them
   now wraps or overflows at 1280.
6. **set-mode's leftover radius.** Covered by Phase 5: the window dissolves on every route, Settings included.
7. **Save-failure gaps are OUT OF SCOPE.** Don't fix them. Put the full list (below) in the final report under
   "Deferred"; it becomes its own prompt.
8. **Tests that pin the old look** (`workspaceShell.test`, `qcRail.test`, `qcV65.measure`, `accountSave.measure`,
   `settingsMode.measure`, `primitives.test`, `dashTopRow.measure`): update each in the phase that changes what it pins,
   and name every changed assertion in the report. `--sp-ctl` stays 50px, so `primitives.test` and `dashTopRow.measure`
   should need no change for that; if they do, say why.
9. **Literal colours.** List them all in the report. Tokenise only the ones a phase touches.

Also: **work directly on `main`** (Nick, 26 Sep; matches CLAUDE.md). Everything else in the prompt stands.

---

## False premises found in the prompt

1. Repointing `--ws-window` reaches card surfaces, not only fades (resolved by ruling 1).
2. L3's `aria-current` on SettingsRail — they are ARIA tabs using `aria-selected` (resolved by ruling 2).
3. `appArt.test` has no `APP_MARK` position assertion (resolved by ruling 3). It checks hash/size/transparency and the
   import only; the x16/y20 placement lives in a CSS comment at `.ws-brand`.
4. The whisper has no failure state (`SaveState` = `idle | saving | dirty`), so after a failed write it reads
   "All changes saved". Removing it can hide no failure (resolved by ruling 4).

---

## Step 0 findings

### 1 · Shell
`src/components/shell/WorkspaceShell.tsx` (+ `workspaceShell.css`), mounted by `AppShell.tsx`.
- `div.ws-app` (L427) carries `sb-shut`, `set-mode` (account paths), `dash-mode` (`/dashboard`), `ground-mode` (`/queries`).
- Sidebar: `div#ws-sidebar.ws-panel` (+`sb-collapsed`, `sb-ready`) > `div.ws-pin` > `button.ws-brand`
  (`img.ws-bmark` + `span.ws-bwm`), `div.ws-phead` (manuscript switcher `.ws-mspill` / `.ws-msopen` / `.ws-msnav` /
  `.ws-msdots`), `div.ws-pdiv`, `nav.ws-nav` (`div.ws-glabel`, `button.ws-ni[.on]` > `span.ws-ic`, `span.ws-lbl`,
  `CountChip span.sp-ct`), `div.ws-pfoot` (`.ws-uacct`, `.ws-av`, `.ws-utext`, `.ws-upgrow`). `SettingsRail`
  (`div.set-rail`) is a sibling of `.ws-pin`; set-mode fades `.ws-pin` out and the rail in.
- Main: `div.ws-main` > `header.ws-pagebar[data-probe=navrow]` > `div.ws-winwrap` > `div.ws-window` >
  `div.ws-wbody#{scrollId}.sv2-stagepad` > `div.ws-work[.ws-work--fit]`. `#app-stage-scroll` rides on `.ws-wbody` —
  stageScroll locks, per-route scroll memory and MobileSheet address it by id.
- Expanded sidebar width is `--shell-panelw: 224px` (`index.css` ~443); collapsed 72px
  (`.ws-panel.sb-collapsed, .sb-collapsed .ws-pin`, css ~1034).
- Routes: every signed-in workspace route renders inside the shell. Dashboard uses the `dash-mode` variant, Settings
  (`/account…`) the `set-mode` variant, `/queries` `ground-mode`. Marketing, focus routes (per `routeTiers.ts`),
  onboarding and dev labs do not.

### 2 · The inner card and its tokens
- `.ws-window` (css ~908): `--ws-window-radius: 16px; --ws-window-border: 1px; background: var(--ws-window);
  border: … var(--ws-edge); border-radius: …; box-shadow: 0 1px 2px rgba(58,28,20,.04), 0 8px 26px rgba(58,28,20,.07);
  overflow: hidden`. `::after` rim (~891). Transitions (~1178). ≤767px: frameless (~935).
- `.ws-main` (~703): `--ws-main-pad: 22px; padding: 0 var(--ws-main-pad) 20px; background: var(--ws-ground)`.
  (An earlier `.ws-main` rule at ~453 is overridden.)
- `.ws-work` (~510) paints `var(--ws-window)`.
- Dissolvers: `.dash-mode .ws-window` (~1313), `.ground-mode .ws-window` (~1336), `.set-mode .ws-window` (~1185 —
  border and shadow only, radius stays). Each has an `::after { opacity: 0 }` and a `.ws-work { background: transparent }`.
- Grounds: `--ws-ground: #f7f4ee`, `--ws-edge: #e9e2d7`, `--ws-window-rgb: 254, 252, 250`,
  `--ws-window: rgb(var(--ws-window-rgb))` (all `:root`, `index.css` ~169–187). Literal `#f4f0ea` at
  `workspaceShell.css` ~810 (`.dash-mode .ws-pagebar::before`), ~1312 (`.dash-mode .ws-main`), ~1335
  (`.ground-mode .ws-main`), and `queries/centre/qcvPage.css` ~342.
- No page draws its own outermost card inside the window on Contacts or Manuscripts.
- **All `--ws-window` / `--ws-window-rgb` readers:**
  - grounds/fades → page ground (ruling 1): `workspacePageGrid.css` 280 `.wpg-dock` (rgba .86), 325 `.wpg-hem--bot`,
    616 `.wpg-scroll > .wpg-chrome`, 670 `.wpg > .wpg-scroll > .wpg-chrome`, 733 `.wpg-toolband`, 891 `.wpg-bar`;
    `todo/tasksLayout.css` 206 `.tpl-hem`; `todo/todoGroups.css` 31 `--tdg-ground`;
    `agents/contact/contactV11.css` 37 `--clv-ground`; `queries/centre/qcvPage.css` 342 (local override
    `--ws-window: #f4f0ea; --ws-window-rgb: 244, 240, 234` on `.qc-wpg.qc-wpg--v11`); `workspaceShell.css` 510 `.ws-work`,
    922 `.ws-window`.
  - card/control surfaces → new surface token (ruling 1): `workspacePageGrid.css` 1099 `.qc-card`;
    `containers/containers.css` 176 `.sa-inline:focus`; `workspaceShell.css` 1263 `.ws-backapp:hover`;
    `manuscripts/bookProfile.css` 45, 79, 295, 609, 836; `manuscripts/manuscriptHeroCard.css` 14, 43;
    `manuscripts/manuscriptPromos.css` 20; `manuscripts/manuscriptAlsoRows.css` 20.
    (The Manuscripts files render only via `AllManuscripts`, which is unrouted — the live `/manuscripts` is
    `v12/ManuscriptPage`. Do not edit anything under `src/components/manuscripts/v12/`.)
  - other: `todo/todoSplit.css` 171–172 re-declares `--ws-window-rgb: 255,255,255` on `.tdw-rail` (a local white);
    `queries/queryCentreGrid.css` 70 `--qcc-well-bg` (component mounted nowhere).

### 3 · The save whisper
- `saveWhisper()` `src/lib/useSaveState.ts` 33–37; only app caller `WorkspaceShell.tsx` 821 (`save = useSaveState()` at 384).
  Test caller `saveSignal.test.ts` 102–112.
- `saveSignal.ts`: `inFlight` + `dirtyFields`; writes instrumented in `db.tsx` 71, 81–83, 87. Keep it all.
- `useDirtyField` — only caller `AccountSettings.tsx` 602; `dirtyFieldKeys()` read by `AccountSettings.tsx` 126–128 for the
  "… not saved yet" toast on section change. Independent of the whisper.
- No other component renders "All changes saved". "Unsaved changes" / "Saving…" elsewhere are local state
  (EditQueryDrawer 354, EditAgentDrawer 352, AddManuscriptFocusForm 775, many button labels).
- Failure surfacing per path: see **Deferred** below.

### 4 · Search and help
- Search: `SearchPill` (`primitives.tsx` 162–178, `button.sp-search`, `aria-keyshortcuts="Meta+K Control+K"`),
  `onOpen={openPalette}` from `usePalette` (AppShell ~289, 397). ⌘K is a window keydown listener in `usePalette.tsx` 62–78.
- Help: `HelpButton` (`primitives.tsx` ~191, `button.sp-help.sp-disc`, aria-label "Help centre") → `goPath("/help")`.
- Feedback: `button.ws-fbpill.sp-inkpill` → toggles `FeedbackDock` (AppShell 403, 555–560). Label hides ≤1100px.
- All can move to icon-only / outline without behaviour change.

### 5 · Collapse
- `useSidebarCollapsed.ts`: key `scriptally:sidebar-collapsed` ("1"/"0"), read synchronously; ⌘\ / Ctrl+\ / `[`; `sb-ready`
  after double rAF.
- Collapsed rows: no aria-label; the label span stays in the tree (opacity/max-width), tooltips via `railTipFor(…, collapsed)`
  → portalled `DeskTooltip variant="rail"`.
- `APP_MARK` (`lib/appArt.ts` 18): `.ws-brand` padding `20px 6px 14px`, `.ws-bmark` 40×40, `.ws-pin` pads 10px → x16.

### 6 · Themes
- No `.t-capp` / `.t-bold` / `.t-edn` rule sets any `--ws-*` or `--shell-*` token. Shell is theme-invariant.
- `--shell-side` (`index.css` 319, `#efe7db`) readers: `mobileShell.css` 197, 287; `shellV2.css` 211; tests
  `shellV2Tokens.test.ts` 42, `mobileShell.test.tsx` 50.
- Literal colours in `workspaceShell.css` include (non-exhaustive — list all in the report): `#241811`, `#544b44`,
  `#8a7a6c`, `#efeae1`, `#e2dacd`, `#b3a598`, `#ffffff`, `#1c130e`, `#d6cdbf`, `#d8c9b4`, `#f0d5c9`, `#ddb6a7`, `#6a5a50`,
  `#3a2b23`, `#8a7d6c`, `#f4f0ea`, `rgba(58,28,20,…)`, `rgba(242,237,231,.6)`; plus `#7c3a2a` in the toggle SVG's
  `.sb-fillcol` (`WorkspaceShell.tsx`) — burgundy in the shell, which the house rule forbids.

### 7 · Fonts
- Special Elite, Source Serif 4 and JetBrains Mono are all loaded.
- `brand.tsx` 266–271: `.font-serif, h1:not(.wsh-title), h2, h3, .font-serif-header { … !important }` (Playfair) and
  `.font-sans, p, span, div, button, input, select, textarea, label { … }` (Source Sans 3, not important).
- Nav label `span.ws-lbl` has no family of its own → renders Source Sans 3 via brand's `span` rule. Elements that name
  their own family: `.ws-glabel`, `.ws-sync`, `.ws-av`, `.sp-ct` (JetBrains Mono); `.ws-bwm` and crumb
  `.ws-sep/.ws-cur/.ws-seg` (`var(--font-serif)`); bar controls (`--sp-type`, Special Elite); `.set-railitem`
  (`var(--font-sans…)`).

### 8 · Nav inventory (`lib/workspaceNav.ts`)
Dashboard · QUERIES: Query Centre, Analytics · AGENTS: Contact list, Discover · MATERIALS: Manuscripts, Comparable titles,
Submission packages · TASKS: `TODO_ROUTES` (list carries the count badge, urgent) · ACCOUNT: Settings.
Icons: `WORKSPACE_ICONS` in `AppShell.tsx` 145–182. First group has no heading.

### 9 · Variants and their tokens
- Bar: `.ws-pagebar` (~715) `padding: 16px 6px 14px`, controls `--sp-ctl` 50 → ~80px tall. No explicit height.
- `--sp-ctl` (`primitives.css` 115, `:root`, 50px): read by `primitives.css` 128, 184, 203; `workspaceShell.css` 719, 870.
- `--ws-main-pad` (css 708): read at 709, 790, 798.
- `--dash-bar-h` (785; 0 at ≤767): read by css 787, 791; `dashboard/oneScreen.css` 114 (`.os-content` padding), 714.
- `--dash-page-pad` / `--dash-page-max` (1306; pad 14 at ≤640): read by css 800, 803; `oneScreen.css` 110, 114, 713.
- Dashboard: bar absolute over the scroller (788–807), transparent until `.is-solid` (808–815), big `SearchPill`,
  crumb / sync / vdiv hidden (1424), skeleton `:has(.os-skelpage…)` rules (1471–1505).
- Settings: `.set-mode .ws-pin` hidden, `.set-rail` shown; `.ws-appctl` (search) leaves, `.ws-backapp` "Back to app"
  arrives. SettingsRail active = `aria-selected` (`settingsRail.css` 114).

### Tests that pin the old look (from recon)
- `.ws-window`: `workspaceShell.test.tsx` 113–129, 258; `contentColumn.test.ts` 53; `tests/e2e/settingsMode.measure.ts`
  110–127; `oneScreenSkeleton.test.tsx` 531–532.
- `.ws-main`: `workspaceShell.test.tsx` 138, 259; `oneScreenSkeleton.test.tsx` 525–536; `oneScreenSmoke.test.tsx` 136–146.
- whisper / `.ws-vdiv`: `saveSignal.test.ts` 102–112; `workspaceShell.test.tsx` 301, 309–314; `qcRail.test.tsx` 162–173;
  `tests/e2e/accountSave.measure.ts` 29–66; `tests/e2e/qcV65.measure.ts` 407, 419–420.
- `--sp-ctl`: `primitives.test.tsx` 171, 176, 206; `tests/e2e/dashTopRow.measure.ts` 329–330, 479–486.
- collapse: `sidebarCollapse.test.tsx` (200–209 pins `--shell-panelw: 224px`); `tests/e2e/drawerMotion.measure.ts` ~255–272.
- brand: `shellV2Tokens.test.ts` 401, 416–417; `workspaceShell.test.tsx` 357.

### 10 · Harness — NOT DONE (the reason for the move)
Re-run locally before Phase 1: sign in as the fixture account, fonts loaded, 1280×800 / 1440×900 / 1920×1080.
If it cannot sign in, STOP and report. Do not fall back to source-only locks.

---

## Deferred — save-failure gaps (ruling 7: report, don't fix)

No global `unhandledrejection` / `window.onerror` handler exists; `ErrorBoundary.tsx` 30 catches render errors only.
Most `db.tsx` writers rethrow through `handleFirestoreError` (`firebase.ts` 66), so a caller without a catch fails silently.

**`addAgent` dead error branch:** `db.tsx` 2099–2101 calls `handleFirestoreError` (which throws) then
`return { success: false, … }`, which never runs — every caller checking `res.success`/`res.ok` gets an unhandled rejection.

**False success toasts (success shown whatever happens):**
- Theme radio — `AccountSettings.tsx` 1143 (`void updateUserProfile(…); savedReceipt("Theme")`)
- Send method pick — `Queries.tsx` 2788
- Detach package / write materials — `Queries.tsx` 2930, 2940
- Set expected date — `Queries.tsx` 3745, 8259
- TasksPopover complete — `TasksPopover.tsx` 71 ("Task done")

**Silent failures:**
- Queries: Keep tracking `Queries.tsx` 8237 · Remind in 2 weeks 8290 · mobile "more" status change 8528 · agent notes save
  3149 · agent email/website add 8639 · timeline correction commit 6175 (invoked 6256/6258) · quick-add agent 1067 →
  `AgentQuickAdd.tsx` 56–67 (via `addAgent`) · dashboard status transition `Dashboard.tsx` 604 (catch at 617 is
  `console.error` only) · TaskModal close-query `DashTaskCommit.tsx` 211 and `qd`/`cm` 244–246 (no try).
- Contacts: add agent `ContactAddCard.tsx` 96 → `AgentList.tsx` 560 (button stays disabled) · add note
  `ContactProfile.tsx` 356 → `AgentList.tsx` 505–522 (catch rethrows at 520) · undo save `AgentList.tsx` 810 → 384 ·
  Housekeeping inline weeks `ContactHousekeeping.tsx` 62 → `AgentList.tsx` 627 · Housekeeping CHECKED
  `ContactHousekeeping.tsx` 114/162 → `AgentList.tsx` 633 · Housekeeping remind `AgentList.tsx` 638.
- Manuscripts: v12 material modal save `ManuscriptPage.tsx` 392 (`void applyMaterialDraft(…).then(close)`) · comps edits
  `ComparableTitlesPage.tsx` 572 · InlineText commit → `AllManuscripts.tsx` 257–270 (unrouted today).
- Settings: DeletionBanner cancel `settings/DeletionBanner.tsx` 44–50 (try/finally only).
- To-do: `quickDone` close-query path `useTaskCommit.tsx` 130 (callers `ToDoPage.tsx` 2764, FocusFlow 1304/1344,
  DashTaskCommit) · `commitFromPane` materials / bulk sweep `useTaskCommit.tsx` 173 / 204 (host.commit IIFE
  `useTaskPaneSession.tsx` 967–993 has no catch) · Commit-to-Today toggle `ToDoPage.tsx` 1511 · TasksPopover add
  `TasksPopover.tsx` 66 · FocusFlow create N reminders `FocusFlow.tsx` 853 · FocusFlow note edit / Keep it 1303, 1312 ·
  FocusFlow review seeding 1857 · TagsSheet profile/task tags `TagsSheet.tsx` 49–64.

**Paths that DO surface failures (L11 guards these):** Respond desk / mark sent / nudge / close desks (`Queries.tsx`
821, 871, 901–1036 → toast) · RecordResponseModal / FocusForm / Screen (inline) · EditQueryDrawer (inline) · Contact v11
editor save (`AgentList.tsx` 491–495 → inline notice) · Msv12EditDetails 86–90, 188–192 (inline) · AccountSettings name,
country (inline), prefs / notifications / marketing / time zone / deletion (toast) · To-do composer add/edit
(`ToDoPage.tsx` 1740, 1765, inline) · `quickDone` user-task path, `commitFromPane` close/fix/send/chase/offer
(toast + pane "Couldn't record that") · Noteboard, Calendar drag, tags, un-done (`flash`).
