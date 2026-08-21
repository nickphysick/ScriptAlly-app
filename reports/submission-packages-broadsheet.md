# Submission packages — broadsheet layout + deletion guards

Design authority: `design-refs/submission-packages-broadsheet.html` (layout) and
`design-refs/submission-packages-flow.html` (modal flows, unchanged by this build).
Report is append-only, one section per phase.

---

## Phase 0 — Recon

### The ref — in Downloads again, for the fourth time

Not in `design-refs/`; present at `~/Downloads/submission-packages-broadsheet.html` (30,608 bytes,
21 Aug 09:29). Copied in byte-identical and committed here. **Gate not tripped.** Its `<script>` is
the behavioural spec — read in full, including all four delete paths and their verbatim copy.

### Precondition — satisfied

All seven ecosystem-flow commits are on `main`: `685d48e0` (recon) · `85bbbe51` (model) ·
`d6c53362` (material modal) · `0e011b96` (gate + builder) · `1575185f` (stage + tiles) ·
`9958859d` (tracking) · `9c6c7450` (acceptance + deploy).

### Baseline

| Gate | Baseline |
|---|---|
| `tsc --noEmit` | **exit 0**, clean |
| `vitest run` | **1 file / 1 test failed** — `src/components/todo/taskPanePort.test.tsx` (the to-do stream's) — 357 files / 6086 tests passing |
| `git diff --name-only HEAD` | **2 paths**, both other streams': `run-artifacts/finish-round.txt`, `tests/e2e/matrix.measure.ts` |

---

## R1b — the header boundary, and it resolved itself

**The parallel header session has already landed §1–§4 of "masthead measure"** — `PageHeader.tsx`,
`pageHeader.css`, `WorkspacePageGrid.tsx`, `workspacePageGrid.css` and their tests. I am **0 behind
`origin/main`**, so this build sits on top of their work, and none of their files are dirty or
staged.

**Their rework changes the answer in my favour.** The masthead is no longer a pinned chrome row: it
is **the first thing inside the scroller**, supplied through a `masthead: React.ReactNode` prop, and
the grid reserves no height for it. Their own note: *"IT IS NOT A ROW OF THIS GRID ANY MORE… it
leaves with the content because it IS content."*

| File | Owner | Role |
|---|---|---|
| `shell/WorkspacePageGrid.tsx` + `.css` | **theirs — off-limits** | supplies the `masthead` and `toolbar` slots |
| `shell/PageHeader.tsx` + `pageHeader.css` | **theirs — off-limits** | the node currently passed as `masthead` |
| `SubmissionPackages.tsx` | mine | chooses *what node* to pass |
| `packages/*.tsx`, `packages/*.css` | mine | the hero itself |

**How the hero is built entirely locally, in one line:** a new page-local `PackagesHero` component is
passed as the existing `masthead` node instead of `PageHeader` — the grid's public API takes a
`ReactNode`, so no shared file is edited, forked, or varianted. **No red gate.**

### ⚠️ F6 is already fixed — by them, not me

Measured on the current page: **masthead `x 342 · w 980`, control row `x 342 · w 980`, body the
same.** The 210px mismatch F6 recorded is gone, because the plate row that carried
`--header-inset` died with the chrome rows. I have touched nothing to achieve that and will not
compensate for it in either direction — the hero is built inside whatever width the shell gives.

### ⚠️ F-E is live already, and it is a real collision of intent

Their new masthead contract is explicit: **"THE MASTHEAD — identity only: mark, title, description.
No actions."** Their control row is *"where every button that used to sit in a masthead now lives"*,
and they have already moved this page's `New package` and manuscript selector into it.

The broadsheet ref's hero carries **its own actions row and its own stat line** (D2). Those are the
same two things their control row now owns, so building the ref faithfully and keeping their control
row would state both twice.

**I am building the ref, because that is what this prompt commissions and the hero's actions row is
explicitly assigned to me — and flagging the divergence rather than pre-empting the ruling.** See
F-E at the close for the two options stated plainly.

---

## R1 — current structure

`SubmissionPackages.tsx` (host: data, modals, persistence) → `PackagesOverview.tsx` (rail + stage).
The rail holds **Materials** and **Packages** panels; the stage holds tiles + the tracking dashboard.
Scroll children today: `wpg-mini` · `wpg-mast` · `wpg-tools` · `pkgw-body`.

**Nothing outside this page depends on the rail** — `.pkgo-rail` and its `.pkgo-*` classes are
declared in `packagesOverview.css` and rendered only by `PackagesOverview`. Removing it is local.

## R2 — modal entry points that must survive

| # | Today | Rehomed to (per ref) |
|---|---|---|
| 1 | rail Materials `+ ADD` | **per-type `+ ADD`** in each of the three material columns |
| 2 | rail Materials ghost | **per-type ghost** at the foot of each column |
| 3 | material row click → edit | **sheet click → edit** |
| 4 | control-row `New package` | hero's actions row |
| 5 | rail Packages `+ NEW` / ghost | ghost package card |
| 6 | tile click → edit package | package card click → edit |

## R3 — the type enum is stable

`ComponentType` = `Query Letter · Synopsis · Sample Pages · Full Manuscript`; the three the builder
surfaces are `BUILDER_TYPES` (Full Manuscript excluded by standing law). The ref's
`letter | synopsis | sample` maps one-to-one onto those three, and `TYPE_META` already supplies both
singular and **plural** labels (`Covering letters` / `Synopses` / `Sample pages`) — which is exactly
what the three column headings need. No new enum.

## R4 — deletion: one primitive exists, one does not, and the rules guard needs care

| | State |
|---|---|
| `deleteVersion(id)` | **exists**, and already refuses when a package references it — via an `alert()`, functional but undesigned, and it names no package |
| `deletePackage(id)` | **does not exist** — Phase 3 adds it |
| Rules, versions | `allow get, delete: if isOwner(userId) && isValidId(versionId)` |
| Rules, packages | `allow get, delete: if isOwner(userId) && isValidId(packageId)` |

So **delete is currently permitted by rules on both collections, with no referential check at all.**

**⚠️ And the guard D9 asks for at rules level may not be expressible.** Both predicates require
scanning a collection — *"is this version referenced by ANY package"* and *"has this package been
sent with ANY query"* — and Firestore security rules have **no query capability**: only `get()`,
`exists()` and `getAfter()` on a **known document path**. This repo has never used a cross-document
read in rules (`grep` for `get(/databases` → **0**), so there is no local precedent either.

Phase 3 will attempt it and report the result honestly rather than claim a guard it cannot deliver.
If it proves inexpressible, the real fix is a callable function performing the delete server-side
with rules denying client deletes — which rides the same Blaze/functions gate `suggestComps` is
already parked behind. **A denormalised reference counter is not the answer**: D9 forbids stored
counters precisely because they drift, and a guard that drifts is worse than one that is honest
about its scope.

## R5 — the ledger's data is reachable, and **no wall is breached**

`Activity` carries `queryId`, `manuscriptId`, `activityType`, `description`, `date`,
`resultingStatus` — but **no `agentId`**. The agent name therefore needs a join:

```
Activity.queryId → Query.agentId → Agent.name
```

`agents` comes from `useScriptAllyDb()` — the shared **data layer**, not a Query Centre component —
exactly as `queries` and `packages` already do. So the adapter takes `agents` as one more plain
array and imports nothing new. **F-D's answer is: reachable, no breach, agent names ship.**

Package attribution comes from `Query.packageId`, which the adapter already reads.

## RED GATES — all clear

| Condition | Status |
|---|---|
| Ref missing from both locations | **No** — `~/Downloads`, copied in |
| Flow build absent from `main` | **No** — all seven commits present |
| Required edit lands in a do-not-touch file | **No** — the hero uses the grid's existing `masthead` prop; no shared header file is edited |
| Another session has the same files staged | **No** — index clean; the header session's files are committed, not in flight |

---

## Phase 1 — RED GATE

**The broadsheet hero is built, measured, and NOT mounted.** The blocker is a lock in a shared
header file this run is forbidden to touch.

### What is built and working

`PackagesHero.tsx`, `IllustrationSlot.tsx` (+ `WaxSeal`) and `packagesBroadsheet.css` are complete
and were **measured rendering correctly on the real page** before being stood down:

| Reading | Measured |
|---|---|
| hero width | **980px at x 342** — exactly the body's, so the F6 mismatch does not recur |
| top border | **5px `rgb(154, 168, 150)`** |
| columns | `534.5px · 445.5px` — the ref's `1.2fr / 1fr` |
| title | `Submission packages`, Playfair, line-height 49.4px |
| wax seal | present, **51 × 51** |
| stat line | **`4 materials · 2 packages · 8 sent`** — derived |
| problem statement | Caveat, verbatim |
| hero illustration slot | **190 × 118**, brief verbatim |
| actions | **exactly one filled control** — `＋ New package`, `rgb(245,226,218)` |
| shared `PageHeader` present | false |

Screenshot: `reports/pkg-broadsheet/p1-hero-1440.png`. It is the ref.

### ⚠️ Why it is not mounted

`src/components/shell/workspacePageGrid.test.tsx` — the parallel masthead session's file — carries:

```
it("⚠️ THE CENSUS — every page that renders a masthead renders it through the grid", …)
   ⚠️ THE PREDICATE IS `variant="workspace"` … Discover, Submission packages and Analytics
   were absent while all three still rendered the header. Anything that renders a masthead
   is on this list.
```

It reads `SubmissionPackages.tsx` and asserts it contains `variant="workspace"`. **A page-local
masthead turns that lock red**, and the failure message is explicit: *"Submission packages stopped
rendering a masthead"*.

Mounting the hero therefore requires editing a shared page-header/shell file — which the concurrency
section forbids without qualification: *"If the ref's hero cannot be built without touching a shared
header file, RED GATE. Stop and report which file and why. Do not negotiate around it."*

**File:** `src/components/shell/workspacePageGrid.test.tsx` (the census lock, ~line 881).
**Why:** it enumerates this page by name and requires the shared component.

### The other thing the grid enforces — worth knowing either way

`WorkspacePageGrid` now **throws in development** when its `masthead` element exposes no `title`
prop: the folded mini bar reads the page's identity off the masthead rather than being handed it
twice. The error text says *"pass a `PageHeader` with `variant="workspace"`, `mark` and `title`"*,
but the **check is narrower** — `masthead.props.title` alone (§3 dropped the mark). A page-local
masthead can honour it simply by exposing a `title` prop, which `PackagesHero` does and renders its
`<h1>` from, so the bar and the hero are one string. **That part is not the blocker** — the census
lock is.

### What was done instead

* The page is **restored to the shared `PageHeader` masthead and the control row**, byte-for-byte as
  the masthead session left it. Both their locks are green, and the full suite is back to baseline.
* The hero components stay on disk, **unmounted**, with a comment at the call site naming the lock,
  the ruling needed, and the exact three-step re-mount.
* `materialColumns` / `packagesUsing` / `usageLine` — Phase 2's derivations — are landed and
  unit-locked (**9 new cases**), because they are page data and no header file has an opinion about
  them.

### Gates

| Gate | Baseline | Now |
|---|---|---|
| `tsc --noEmit` | exit 0 | **exit 0** |
| `vite build` | — | **exit 0**, no diagnostics |
| `vitest run` | 1 file / 1 test (`todo/taskPanePort`) | **1 file / 1 test — the same one**, 357 passed / 6099 |
| shared header files touched | — | **none** |

**⚠️ A separate observation for the record:** partway through this phase the dev server stopped
compiling — `todo/TaskPaneBody.tsx`, the to-do stream's file, held a syntax error mid-edit, which
takes Vite down and with it every measurement. It cleared on its own; nothing was fixed or staged.
The server needed a restart afterwards, because Vite caches the failure and keeps serving it after
the file is repaired.

---

## Phases 2–5 — not started, and why

Every remaining phase renders inside the page the hero heads. Building the materials band, the
package cards, the ledger and the footnote **on top of a masthead that may be reverted** would mean
laying out four bands against a header whose existence is undecided — and the deletion work (Phase 3)
carries its own unresolved question below. The honest stopping point is here, with one decision
outstanding rather than four phases built on a guess.

**Phase 3 has a second finding worth having before it starts.** D9 requires the two blocked deletes
to be refused **at rules level**, and both predicates are collection scans — *"is this version in
ANY package"*, *"has this package been sent with ANY query"*. Firestore rules have no query
capability: only `get()` / `exists()` / `getAfter()` on a known path. So the guard as specified is
**not expressible in rules**, and the real options are a callable function (which rides the Blaze
gate `suggestComps` is already parked behind) or a denormalised counter (which D9 forbids, rightly,
because it drifts). That wants a decision too.

---

## Flags for Nick

| | Flag | Needs |
|---|---|---|
| **F-E** | **The blocker, and it is a genuine collision.** The masthead session has standardised page headers app-wide and locked it with a census naming this page. The broadsheet commissions a deliberately bespoke hero — wax seal, two-column split, blush panel, its own actions and stat line. **Both cannot hold.** Either this page conforms (and the broadsheet hero is dropped or reduced to fit `PageHeader`), or it becomes a declared exception as the flagship Pro surface and the census gains an entry for it. **Your ruling — I have not pre-empted it in either direction, and the hero is one commit away either way.** |
| **F-A** | The wax seal as the app-wide PRO marker. Built and scoped to this page only. It would replace `.pkgw-propill` here and the equivalent Pro pill on `/plans`, Packages and the Manuscripts card. Not adopted anywhere else — that is a separate decision, and F-E should probably settle first. |
| **F-G (new)** | **The rules-level delete guard may not be expressible.** See above. Callable function, or accept a code-level guard and say so. |
| **F-B** | What the removed rail did that no band covers — **cannot be answered yet**; the rail is still mounted because the bands that replace it are not built. |
| **F-C** | "Take it out of those packages first" — whether the popover needs an edit shortcut. Unchanged: deliberately not built, one action per popover. |
| **F-D** | **Answered: agent names ARE reachable**, no wall breached. `Activity` has no `agentId`, so the ledger joins `Activity.queryId → Query.agentId → Agent.name`, and `agents` comes from `useScriptAllyDb()` — the shared data layer, not a Query Centre component. |
