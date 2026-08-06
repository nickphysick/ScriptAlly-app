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

---

## PHASE 2 — The smokes

**One shared harness: `src/test/pageSmoke.tsx`.** `renderToStaticMarkup` + `MemoryRouter` + a
mocked db hook, plus the three stubs a page render needs under this repo's node environment. Each
test file declares its own `vi.mock` lines (the factory is hoisted, so it cannot close over
anything) and points them at the harness's factories.

Three things the harness had to solve, each of which had already caused a quiet failure:

| Problem | Why it bites | Fix |
|---|---|---|
| `lib/firebase` calls `initializeApp` + `getAuth` **at module load** | merely *importing* a page that touches Firestore threw `auth/invalid-api-key` before any component ran | `firebaseMock()` stubs the four names it exports |
| `localStorage` does not exist in a node env | several pages read a persisted preference **during render** | in-memory implementation, installed as a module side effect (runs before any render) |
| the seed's statuses must come from their **enums** | the first draft used `status: "Query Sent"` — not a `QueryStatus` value. The page rendered perfectly while counting the query into **no bucket at all**: the empty path tested twice, reported as coverage of the populated one | every seed field reads `QueryStatus` / `ManuscriptStatus` / `SubmissionStatus` / `SubmissionMethod` |

### ⚠️ The big pages are smoked TWICE — empty and populated

An empty page and a populated page are frequently **not the same component**. Dashboard, Queries,
the Agent list and the manuscript plates each branch to a first-run state when there is nothing to
show. Smoking only that leaves every derivation on the page — the standing/turn/door axes, the
stat row, the In-the-field roster — never executed, while the suite reports the page as covered.

`renderPageSeeded()` supplies one manuscript, one agent and one query. It resets its flag in a
`finally`: a leaked `seeded = true` would silently turn a later file's empty-state smoke into a
populated one, and **both would still pass**.

Two pages needed more than a seeded db. Comparable titles and the Package Workshop scope
themselves through `localStorage["scriptally_active_manuscript_id"]`, **not a prop**, so seeding
the records alone left them on their "no manuscript yet" branch — a smoke that passed while
testing the empty path. `setActiveManuscript()` points them at the seed; `afterEach` clears it.

### The files

| File | Covers |
|---|---|
| `src/test/pageSmoke.tsx` | the harness (not a test) |
| `src/test/pageStructure.test.ts` | the structural TDZ case, all 22 page components |
| `components/dashboardPageSmoke.test.tsx` | `/dashboard` (empty + populated) |
| `components/queriesPageSmoke.test.tsx` | `/queries` (empty + populated), `/queries/analytics` |
| `components/agentsPageSmoke.test.tsx` | `/agents` (empty + populated), `/agents/discover` |
| `components/materialsPageSmoke.test.tsx` | `/manuscripts`, `/manuscripts/comps`, `/manuscripts/packages`, `/import` |
| `components/settingsPageSmoke.test.tsx` | `/account`, `/plans`, `/help` |
| `components/authPageSmoke.test.tsx` | `Auth` (both modes), `Onboarding` |
| `marketing/marketingPageSmoke.test.tsx` | `/`, `/pricing`, `MarketingShell` (logged out + signed in) |
| `components/todo/todoPageSmoke.test.tsx` | the four To-do routes (extended with the two placeholders) |
| `src/test/devSurfaceSmoke.test.tsx` | the DEV labs + the five exemptions, asserted |

Three surfaces get **both** of their branches, because half a component is not coverage of it:
`MarketingShell` renders logged-out *and* signed-in (a signed-in user is never redirected off
`/`), and `Auth` renders create-account *and* sign-in.

The five un-importable dev harnesses have their reason **asserted**, not dropped:
`devSurfaceSmoke.test.tsx` fails the day one of them gains an `export`, telling whoever did it to
give it a real smoke and delete the exemption.

---

## PHASE 3 — Prove one

> *A tripwire nobody has seen trip is a guess.*

### ⚠️ The first attempt at this proof was too weak, and finding out why was the pack's real result

The obvious way to reproduce the bug is a direct call in the JSX:

```tsx
description={shelfBlurb()}          // in the returned JSX
...
const shelfBlurb = () => "…";       // declared below the return
```

That fails the smoke — **but `tsc` also rejects it**, with `TS2448: Block-scoped variable
'shelfBlurb' used before its declaration`. A guard proven against a shape the typechecker already
catches has proven nothing about the shape that actually ships.

So the pre-fix file was read rather than assumed. **The real geometry** (`ToDoPage.tsx` at
`c0698c4^`):

| line | what |
|---|---|
| 933 | the component's `return (` — its JSX calls `renderPageHeader()` |
| 1119 | `function renderPageHeader()` — **hoisted**, so calling it from above is legal |
| 1135 | …reads `boardSubtitle` |
| 1594 | `const boardSubtitle = (() => { … })()` |

Execution never reaches 1594 before returning at 933, so the const is in the temporal dead zone
when the helper runs. **And `tsc` cannot see it**: TS2448 fires only when the reference shares a
scope with the declaration, and inside a nested function TypeScript treats it as legal, because it
cannot know that function is called during render.

**Two consequences, both acted on:**

1. The structural check was rebuilt to follow the **render's call graph** — from the returned JSX,
   transitively through every helper it reaches. Neither earlier version could have caught the real
   bug: the original searched the region *above* the return (which cannot contain the reference,
   because the helper is below it); the first correction searched the returned JSX (right region
   for a direct call, but the JSX names `renderPageHeader`, not `boardSubtitle`). Proof on the real
   file: `["boardSubtitle"]` at `c0698c4^`, `[]` on the fixed one.
2. The proof below uses the real, `tsc`-invisible shape.

### The proof — `AllManuscripts.tsx`, the real shape, uncommitted

```tsx
        description={shelfBlurb()}        // the JSX calls a hoisted function…
...
  );

  function shelfBlurb() {
    return shelfCopy;                     // …which reads a const…
  }

  const shelfCopy = "Every manuscript on your shelf, and what each one is out doing.";
};                                        // …declared below the return.
```

**The gates that would have shipped it:**

```
$ npx tsc --noEmit
tsc exit=0

$ npm run build
✓ built in 5.12s
```

**The tripwires:**

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/components/materialsPageSmoke.test.tsx > /manuscripts renders > renders without throwing on an empty shelf
AssertionError: expected [Function] to not throw an error but 'ReferenceError: Cannot access \'shelf…' was thrown

- Expected:
undefined

+ Received:
"ReferenceError: Cannot access 'shelfCopy' before initialization"

 ❯ src/components/materialsPageSmoke.test.tsx:28:58
     27|   it("renders without throwing on an empty shelf", () => {
     28|     expect(() => renderPage(page(), "/manuscripts")).not.toThrow();
       |                                                          ^

 FAIL  …> …and produces its own chrome, so it is not an empty shell that merely did not crash
 FAIL  …> …and the manuscript reaches the plate
ReferenceError: Cannot access 'shelfCopy' before initialization
 ❯ shelfBlurb src/components/AllManuscripts.tsx:502:5
    501|   function shelfBlurb() {
    502|     return shelfCopy;
       |     ^
 ❯ AllManuscripts src/components/AllManuscripts.tsx:153:22
```

and the structural check, independently:

```
 × components/AllManuscripts.tsx declares nothing below its return that the JSX above it touches
   → declared below the return but read by the render — this throws on every render:
     expected [ 'shelfCopy' ] to deeply equal []
```

Reverted; both green again. **Two independent guards, one fault, and `tsc` + the production build
sail past it — which is exactly how the original shipped.**

---

## Result

| | before | after |
|---|---|---|
| test files | 163 | **172** (+9) |
| tests | 2676 passed \| 2 skipped | **2770 passed \| 2 skipped** (+94) |

Gates at close: `tsc --noEmit` 0 · production build clean · full Vitest green. Tree clean.
Tests only — **no deploy needed**, nothing in `src/` outside the test tree was changed.

### Left uncovered, with reasons

1. **The five `App.tsx`-private dev harnesses** — `ImportingLoaderDevHarness`,
   `ScatterLoaderDevHarness`, `DrawerLab`, `ReadingPaneLab`, `ShellLab`. Not exported, so not
   importable. Their payloads are smoked; the exemption is asserted and self-expiring.
2. **The boot splash** in `App.tsx` — inline JSX, no logic, nothing to trip.
3. **`AppContent`'s branch order itself** — which shell renders for which route. The branches are
   locked by `routeTiers.test.ts` and `shellForRoute`; rendering `App` whole would need the
   Firebase provider stack and would be an integration test, not a smoke.
4. **Effects.** Static rendering does not run them, deliberately — TDZ, undefined reads and bad
   destructures all live on the pure render path, and an effect-running harness needs jsdom, which
   this repo does not have (a tooling decision across 172 test files, flagged before and still open).

### Standing follow-ups this pack produced

- **`/queries/analytics` is unreachable** (see Phase 1). Flagged, not fixed — product call.
- **Export the five dev harnesses** if their labs are worth guarding; the assertion will tell you.
