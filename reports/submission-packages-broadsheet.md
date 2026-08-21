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
