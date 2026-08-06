# The app-wide smoke pack

**6 August 2026.** Every routed page in the app gains the render test the two To-do pages earned —
closing the "green suite over a page that doesn't load" hole everywhere it still exists.

The hole, stated once: **this repo's tests read SOURCE.** `vitest.config.ts` is
`environment: 'node'`, there is no jsdom and no testing-library, so a component spec renders to a
string with `renderToStaticMarkup` or — far more often — greps the file. A source-string test
cannot see a runtime crash. On 6 August `ToDoPage.tsx` shipped a page that would not load (a
post-`return` `const` read by the JSX above it, sitting in the temporal dead zone) through a fully
green suite, in a file carrying a warning comment against exactly that mistake.

---

## PHASE 1 — Inventory

Every routed surface in the app. **Nothing is skipped silently**; the two entries that cannot be
smoked this way name why, and their reason is asserted in `devSurfaceSmoke.test.tsx` rather than
dropped.

### Workspace tier — `WORKSPACE_PATHS` (`src/marketing/routeTiers.ts`)

| Route | Component | Status |
|---|---|---|
| `/dashboard` | `Dashboard` | needs smoke |
| `/queries` | `Queries` | needs smoke |
| `/todo` | `todo/ToDoPage` | **has coverage** — `todoPageSmoke.test.tsx` |
| `/todo/today` | `todo/TodoTodayPage` | **has coverage** — `todoPageSmoke.test.tsx` |
| `/todo/calendar` | `todo/TodoPlaceholderPage page="calendar"` | needs smoke |
| `/todo/noteboard` | `todo/TodoPlaceholderPage page="noteboard"` | needs smoke |
| `/agents` | `Agents` → `agents/AgentList` | needs smoke |
| `/agents/discover` | `DiscoverNewAgents` | needs smoke |
| `/manuscripts` | `AllManuscripts` | needs smoke |
| `/manuscripts/comps` | `manuscripts/ComparableTitlesPage` | needs smoke |
| `/manuscripts/packages` | `SubmissionPackages` | needs smoke |
| `/import` | `ImportCsv` | needs smoke |
| `/account` | `AccountSettings` | needs smoke |
| `/plans` | `PlansPage` | needs smoke |
| `/help` | `HelpCentre` | needs smoke |

### Marketing tier

| Route | Component | Status |
|---|---|---|
| `/` | `marketing/Landing` (in `MarketingShell`) | needs smoke |
| `/pricing` | `Pricing` (in `MarketingShell`) | needs smoke |
| — | `marketing/MarketingShell` (the chrome itself) | needs smoke |

### Auth / onboarding surfaces

| Surface | Component | Status |
|---|---|---|
| logged-out front door (default) | `Auth initialMode="signup"` | needs smoke |
| `#/login` · `#/signin` | `Auth initialMode="login"` | needs smoke |
| un-onboarded user | `Onboarding` | needs smoke |
| boot splash | inline JSX in `App.tsx` | **cannot** — not a component; six lines of inline style with no logic, nothing to trip |

### Shell chrome

| Surface | Status |
|---|---|
| `shell/AppShell` + capsule shell | **has coverage** — `shellV2Smoke.test.tsx` (renders the shell, asserts its furniture) |

### Dev-only hash surfaces (`import.meta.env.DEV`-gated — never in a production build)

Covered anyway where the component is importable: a lab that crashes costs a dev their review
surface, and these are the surfaces design decisions get made on.

| Hash | Component | Status |
|---|---|---|
| `#/status-dots` | `StatusDotDemo` | needs smoke |
| `#/notes-scan` | `NotesStoreScan` | needs smoke |
| `#/plans` | `PlansPage` | covered by the `/plans` smoke (same component) |
| `#/import-review` · `#/import-review-dupes` | `onboarding/SmartImportReview` | needs smoke |
| `#/reconcile-card` | `onboarding/ReconcileCardDevPreview` | needs smoke |
| `#/notes-lab` | `notes/NotesLab` | needs smoke |
| `#/diary-lab` | `dashboard/DiaryLab` | needs smoke |
| `#/pkg-lab` | `packages/PkgLab` | needs smoke |
| `#/import-loader` | `ImportingLoaderDevHarness` | **cannot** — defined inline in `App.tsx`, not exported. Its payload `onboarding/ImportingLoader` is smoked instead. |
| `#/scatter-loader` | `ScatterLoaderDevHarness` | **cannot** — same reason. Payload `onboarding/ScatterSettleLoader` smoked instead. |
| `#/drawer-lab` | `DrawerLab` | **cannot** — same reason. Payloads `EditAgentDrawer` / `EditQueryDrawer` reachable via their own suites. |
| `#/reading-pane-lab` | `ReadingPaneLab` | **cannot** — same reason. Payload `reading-pane/QueryTimeline`. |
| `#/shell-lab` | `ShellLab` | **cannot** — same reason. Payload `shell/SidebarShell` smoked instead. |

The five "cannot"s are **one fault with one shape**: a dev harness written as a module-private
`const` inside `App.tsx`. Exporting them is a one-line change each, but it is a change to
`App.tsx` for the benefit of tests, so it is flagged here rather than taken — and their payload
components, which is where the code that can actually break lives, are smoked directly.

### ⚠️ One finding from the inventory: `/queries/analytics` is UNREACHABLE

`App.tsx` computes `queriesAnalytics = path === "/queries/analytics"` and renders `QueryAnalytics`
in its own `StagePage` — but `/queries/analytics` is **not in `WORKSPACE_PATHS`**, and the
unknown-path guard runs first:

```
if (!WORKSPACE_PATHS.has(path)) return <Navigate to="/dashboard" replace />;
```

So the route redirects to the dashboard before the slot is ever evaluated. Nothing in the nav
links to it (`shellV2Nav.ts`'s destinations were checked against `WORKSPACE_PATHS` — every other
one resolves), so no user meets a dead link; the page is simply unreachable code.

**Flagged, not fixed.** The one-line fix is adding the path to the set, but that publishes a page
whose whole content is "coming soon" — a product call, not a test-pack call. `QueryAnalytics` is
smoked regardless, so the day it is wired up it arrives with a tripwire already on it.
