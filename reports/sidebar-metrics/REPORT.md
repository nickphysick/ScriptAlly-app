# The sidebar: the split "Log a query" button, tuned metrics, ruled eyebrows, the gear in the foot

Ref: `design-refs/shell/sidebar-metrics-states.html` (SHA256 `196c96a5…bcabe4`), enrolled in `.refhashes.json` and verified (102 refs guarded). No deploy.

## False or partly false premises

1. **"Tasks has four rows."** It has three: To-do list, Calendar and Noteboard (`TODO_ROUTES`). Materials has three, as the brief says. Nothing was added or removed either way.
2. **"The bar's own locks assert `+ New` stays out of the bar."** One of them is wider than that. `workspaceShell.test.tsx` forbids the string `invokeCapture` anywhere in `WorkspaceShell.tsx`, as a proxy for "the bar has no create control". So the capture button lives in its own file, `SidebarCapture.tsx`. The lock stays green and untouched. SB1 makes the real claim (no capture control in the bar) on the rendered bar. The lock's proxy is noted in the new file's header.
3. **"Add a manuscript, including its gate."** The switcher footer applies no gate when the menu opens. It calls `onNavigate("manuscripts", "Add a manuscript")`, which opens the add form. The Free-tier limit is checked inside that form when you submit. The new menu row makes the identical call.

Everything else held. No ✗.

## Step 0

1. **Level with `main`:** the primary tree was 62 behind. I fast-forwarded with `merge --ff-only` after checking that the 22 dirty files (all `reports/**` PNGs and `run-artifacts/`, from 20 Sep) overlapped none of the incoming paths. They are still dirty and untouched. The quiet bar, switcher v2 and `lib/shortcuts.ts` are all on `main`. Baselines: tsc 0, `build:dev` clean, Vitest 507 files / 8,195 passed.
2. **Capture contracts:** `RAIL_CAPTURES` plus `invokeCapture` reach Log a query (`queries`/"Log a query" → `/queries`, whose seed opens the drawer's log journey), Record a response (opens the query drawer) and Add an agent (the focus form, or `/agents`' own add card). All go through `AppShell`'s `onNavigate` bridge, which `WorkspaceShell` already received.
   - **Consumers of `RAIL_CAPTURES[*].label`: only `railNav.test.ts`.** `TopNavShell`, `SearchPalette`, `OneScreenActions` and `ShellSidebar` call `invokeCapture` and never render the label.
   - **No live "+ Query" or "+ Agent" copy renders.** The strings survive only as the labels in `railNav.ts` (unrendered) and in one comment in `searchPalette.ts`.
3. **Add a manuscript:** as premise 3 above. It can be invoked from the shell; it is the same bridge.
4. **Keyboard:** `n` is `compAdd`, "Add a comparable title", in Comparable titles scope. No global binding is added.
5. **Token:** `--shell-control-bg` (#ffffff), which the bar's white controls (the switcher tile and its menu) already read. It is declared once at `:root` and no theme overrides it, so it is the raised light surface in all three themes, and it is portal-safe. Row wash: `--shell-menu-on`, the switcher menu's own.
6. **Tests touched:**
   - the no-`+ New` locks: `workspaceShell.test.tsx` ("the bar has no `+ New`") and `mastheadFormat.test.tsx` (`.ws-nbtn` rule grep). Both still green.
   - `.ws-uacct`: `workspaceShell.test`, `sidebarCollapse.test`, `signOut.test`, `shellV2Smoke.test`, and the e2e `signOut` and `shellV3Mock`.
   - eyebrow and row metrics: `workspaceShell.test`, `sidebarCollapse.test` (the label budget), and the e2e `shellV3Mock` and `shellV3Lib`.
   - `railNav.test`.
   - the ACCOUNT section: `workspaceNav.test` ×4, `todoWorkspace.test`, `workspaceTasksNav.test`, `barPageName.test`.

## What changed

- **`SidebarCapture.tsx`:** the split button and its menu. Main segment: quill plus "Log a query" via `invokeCapture("query")`. Chevron: 32px, `aria-haspopup="menu"`. Menu rows: Record a response, a hairline, Add an agent, Add a manuscript. Keyboard: Enter, Space and ↓ open with focus on the first row; arrows wrap; Home and End work; Escape returns focus to the chevron; Tab closes without trapping; a pointerdown outside closes. No keycaps.
  - **Collapsed:** a 40×36 tile. Its flyout is **portalled to `document.body`**, fixed 8px right of the tile, 228px wide, with Log a query as the first row. The rail tip "Log a query" stands down while the flyout is open.
- **Metrics:** rows are a fixed `height: 32px` with `padding: 0 10px` (the comment is updated); the nav gap is 2px. Eyebrows are ruled by the label's own `::after` (flex-grown, `var(--shell-rule)`), with margins of 20 above and 6 below.
  - Dashboard now carries a **WORKSPACE** eyebrow. This reverses "the first group gets no heading", and the comment records why.
  - Button → first eyebrow = **22px**, made of the pin's 12px gap plus a 10px `margin-top` on the first label.
- **Motion:**
  - hover wash: 120ms in, 160ms out; icon opacity .75 → .95.
  - rows pressed: .62 wash, instant. Button pressed: 70ms, translateY(.5px), drop shadow off. Ring on hover: .22.
  - open: 1.5px ink ring. Chevron: 200ms house ease.
  - menu: in 170ms (opacity 150); out 120ms as a fade only, because the closed transform waits out the fade.
  - the active row has `transition: none`.
  - **Reduced motion is 0s** for every element this pass touches: a higher-specificity rule placed *before* the shell's blanket rule, which a lock requires to stay last in the file. The flyout has its own copy, because it lives outside `.ws-app`.
  - **Retired: the count chip's 2px hover nudge.** The motion table says "nothing moves on hover".
- **Foot:** `.ws-pfrow` is a horizontal row holding `.ws-uacct` and a sibling **`.ws-gear`** (30px circle, `aria-label="Settings"`, routes to `/account`). The hairline moved to the row so it runs over the gear. The gear is removed when collapsed. The user row still opens the account menu.
- **IA:** the ACCOUNT section is removed from `workspaceNav.ts`; P5's comments are replaced with the reversal and its reason. `barPageName` gains an `isAccountPath` branch, so the bar still names the settings pages `Account / Settings`, as before.

## Locks: red before, then green

Unit locks are in `src/components/shell/sidebarCapture.test.tsx`; the rendered measure is `tests/e2e/sidebarCapture.measure.ts`, 102 checks per width, floor 70, with ledgers in this folder.

- **On unmodified `main`:** the unit file fails to load (no `SidebarCapture`). The SB5 foot test and the Tasks-nav label test are red. The rendered measure is red **by name** at both widths: 8 checks, 5 failed, all SB1 ("no `.ws-capb`/`.ws-capr`"). Its first version hung on the absent element instead, so it now stops and writes its ledger.
- **Mutations, each run in a disposable worktree (`../ScriptAlly-sbm`) and restored from a path-derived backup:**

| Lock | Mutation | Result |
|---|---|---|
| SB1 | mount the capture button in the bar | 2 unit reds |
| SB2 | add a literal `navigate("queries", "Record a response")` row | "no new path" red |
| SB3 | rows back to `padding: 6px 10px` | 11 rendered reds per width (rows 33.02px) |
| SB4 | drop the `::after` hairline | unit red (the rendered half reads the same `::after`) |
| SB5 | put the ACCOUNT section back | 5 unit reds |
| SB6 | remove the focus return | 3 rendered reds per width |
| SB7 | render the flyout inside the panel | "flyout portalled" red at both widths |
| SB8 | delete the reduced-motion rule | 8 rendered reds per width |
| SB9 | bind `n` and add a registry entry | 2 SB9 reds, plus the registry's own S7 |

- **The SB8 run also caught a vacuous row.** The flyout's reduced-motion check stayed green under the mutation, because it was read after a screenshot style tag that forces `transition: none`. I moved it before the tag and re-proved it: red at both widths, with durations 0.15s/0.17s.
- **Final:** the measure is 102/102 at 1280 and 1440. The other rendered shell suites are green: `shellV3.measure` (15/15), `signOut`, and `shellV3Mock`.
  - **One `shellV3Mock` entry was added to its explained list:** `user.w` is 36px narrower, because the gear now sits beside the user row.
- **Gates:** tsc 0, production build clean (grep clean), Vitest 508 files / 8,205 passed, exit 0.

## Screenshots (this folder, 1280 and 1440)

`*-expanded-rest`, `*-row-hover`, `*-menu-open`, `*-foot-gear`, `*-collapsed-rest`, `*-flyout-open`.

## Deferred, with a proposed owner

- **A global key for the menu:** `n` collides with Comparable titles' add, and no other key was decided. The registry can carry it once a key is chosen. *Owner: Nick (choice of key), then a one-entry pass.*
- **The bar names Dashboard alone while the sidebar heads it WORKSPACE.** The bar's derivation follows the sidebar's headings, and the bar was out of scope, so it is left as it was and noted at `barPageName`. *Owner: Nick: keep it, or show `Workspace / Dashboard`.*
- **The `RAIL_CAPTURES` labels ("+ Query", "+ Agent", "+ Record a response") render nowhere** but are still asserted by `railNav.test`. *Owner: a small cleanup pass, to retire the labels or rename them to the sentences this button uses.*
- **The pressed wash `rgba(255,255,255,.62)` is a literal**, as the ref draws it. Bold and Editorial map the hover to their own tokens but have no pressed token. *Owner: the next theme pass.*
