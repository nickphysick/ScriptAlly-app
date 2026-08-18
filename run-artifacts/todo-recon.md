# Step 0 — recon gate

Read-only. Baseline suite: **319 files, 5612 passed, 2 skipped, 0 failed** (`run-artifacts/baseline-tests.txt`, exit 0).

---

## ⚠️ HEADLINE: the brief is written against a page that no longer exists

The brief anticipates a flat board of rows with a 118×34 split button, no task pane, and an inline
sample selector in `AddAgentFocusForm`. **Four of its six structural premises are false.** The page
was rebuilt at least twice since (the rail+workspace split, then the journeys pack, 15–16 Aug).

| # | Brief assumes | Actual | Consequence |
|---|---|---|---|
| 1 | Flat board, no pane | **Rail 520px + workspace, two cards on a ground** (`todoSplit.css`) | Phase 2/3 chassis largely built |
| 2 | 118×34 split button per row | **Split button retired**; four revealed icons (`.tdg-ic`, 30×30) | Open item #1 is moot |
| 3 | No journeys in a pane | **Six journeys render in-pane** (`PaneJourney.tsx`, `paneJourney.ts`) | Phase 3 mostly built |
| 4 | `materialsForm` state, no shared shape | **`agentMaterials.ts` already owns the shape** (`MaterialRow`, `SampleUnit`, `UNIT_CFG`) | Phase 1's type work is done |
| 5 | Sample selector inline in `AddAgentFocusForm` | It is **not** there; three *other* surfaces duplicate the picker UI | Phase 1 must be re-aimed |
| 6 | No materials bucket | Correct — **no query-materials bucket exists** | Phase 4/5 are the real work |

**Adaptation (per §1's instruction to extend rather than rebuild):** Phases 2 and 3 are substantially
already delivered; re-running them as written would be a rebuild of working, locked code. The genuinely
absent work is **Phase 4 and Phase 5** — the missing-materials task — with **Phase 1 re-aimed** at the
duplication that actually exists.

---

## 1. The page as it stands

- **Renders:** `src/components/todo/ToDoPage.tsx` (187,993 bytes), mounted at `src/App.tsx:675`.
- **Routes:** `src/lib/todoRoutes.ts` — three pages (`list` `/todo`, `calendar`, `noteboard`); Today retired 9 Aug.
- **CSS:** many files, layered. `todoSplit.css` (the two panes), `todoGroups.css` (rows), `todo.css`
  (159,718 bytes), `tasksLayout.css`, `todoDock.css`, `paneJourney.css`, `paneSweep.css`.
- **Layout:** **already list-plus-pane.** `todoSplit.css:1` — *"the page stops being a list and becomes
  a directory beside a work surface"*. Rail `--tdw-rail-w: 520px` (not the ref's 408 — widened for
  seven lanes), workspace `minmax(0, 1fr)`.
- **Task pane:** yes. `TodoDock.tsx` mounts inside `.tdw-work`; `PaneJourney` renders the journey
  **inside the card body** (`PaneJourney.tsx:433`), with `PaneJourneyFoot` pinned as a sibling.
  It was formerly a full-viewport takeover from `FocusFlow` — moved in-pane deliberately, partly
  because the takeover `inert`-sealed itself.

## 2. Row actions

**The 118×34 split button does not exist.** Retired by the icon-cluster pack
(`todoGroups.css:476`, ref `design-refs/todo-iconcluster-v2.html`), which explicitly deleted its
3px dead seam, arm-before-press hover pair, 34px caret minimum and filled/outlined weights —
*"four guards around ONE problem"*.

- **Now:** four `RowIcon` buttons (`TaskList.tsx:184`), 30×30, `opacity: 0` at rest, revealed on
  hover/focus. Dim icons refuse in the handler rather than `disabled`, so the explaining tooltip
  stays reachable.
- **Menu:** `src/lib/todoMenu.ts` — `cardMenu(card, column)` / `noteMenu()` / `placeMenu()`.
  Full `MenuItemId` union: `action`, `today`, `snooze-1`, `snooze-7`, `unsnooze`, `dismiss-week`,
  `dismiss-never`, `dismiss-rule`, `undo-done`, `open-query`, `view-agent`, `edit-task`,
  `delete-task`, `give-date`, `tags`. (`est-*` removed 15 Aug with the weight ladder.)
- `.tbd-menu2` / `.tbd-mi` remain live (do-not-touch list) — portalled, z-index 80.

## 3. Task derivation, and the materials bucket

- **Derivation:** `src/lib/todoBoard.ts` (`assembleBoard`, `derivedCopy`, `dedupeAgentCards`,
  `agentCardKey`) → `src/lib/todoColumns.ts` (`boardColumns`, sweeps) → `todoBuckets.ts`,
  `todoGroups.ts`, `todoFamily.ts`. Streams: `do` (urgent) / `hk` (housekeeping) / `nt` (notes).
- **Housekeeping rules** (`todoHousekeeping.ts:46`, `HK_RULES`): `no_response_close`,
  `dq_responseTime`, `dq_materials`, `dq_mswl`.
- **⚠️ `dq_materials` is NOT the brief's bucket.** It fires on
  `agentDataQualityNeeds` → `hasNoMaterials(a.materialsWanted)` — an **agent** with no stated
  *requirements* ("16 agents are missing a materials list"). The brief's Phase 4 is a **query**
  whose *send* recorded no materials. Different subject, different field, different fix.
- **A "materials not recorded" bucket does not exist.** Confirmed by grep across
  `todoBuckets.ts`, `todoColumns.ts`, `taskRow.ts` — the only `materials` hits are the two comments above.
- **Bulk machinery already exists and should be reused:** `sweepCardFor()` +
  `isSweepCard` / `cardWeight` / `columnWeight` (`todoColumns.ts:196+`) collapse a rule group into
  ONE card carrying its own n-of-m, with members removed from the flat lane set so nothing
  double-counts. That is Phase 5's shape, already built and locked.

## 4. The sample selector

**Not in `AddAgentFocusForm.tsx`, and the brief's stated behaviour is wrong in two of three particulars.**

`AddAgentFocusForm.tsx:39` has its own local `MaterialsState` (not `materialsForm`), an
eight-key object. Pages/Chapters/Words **are** independent booleans ✓. But:

```ts
const initialMaterials = (): MaterialsState => ({
  queryLetter: true,  authorBio: false,
  synopsis: { on: false, count: "" },
  pages:    { on: true,  count: "10" },
  chapters: { on: false, count: "3" },
  words:    { on: false, count: "" },
  fullManuscript: false, other: { on: false, text: "" },
});
```

- Counts are **pre-seeded in the initial state**, not seeded on select. Words seeds **nothing**
  (brief says 10000; the real per-unit default lives elsewhere and is **5000**).
- `toggleMat` (line 134) flips `on` **only** — it does **not** clear the count on deselect.
  The brief's "deselecting clears the count" is false here.

**The real model already exists** — `src/lib/agentMaterials.ts`:
- `SampleUnit = "Chapters" | "Pages" | "Words"`, `SAMPLE_UNITS`, `SAMPLE_PILL`
- `UNIT_CFG` — **Chapters {step 1, min 1, def 3}, Pages {5, 1, 10}, Words {500, 500, 5000}**
- `MaterialRow` (4 keys: `queryLetter` | `synopsis` | `sample` | `other`) — the brief's `MaterialSpec` by another name
- `materialRowsFromAgent` / `materialsWantedFromRows` / `snapToUnit` / `stepAmount` /
  `summaryFromRows` / `validateMaterials` / `formatAmount` / `parseAmount`
- Multi-unit is already modelled: one `sample` row is emitted **per selected unit** (decision 12).

**The genuine duplication is the UI, in three places** — none of them the form the brief names:
- `src/components/Queries.tsx:4840` (± / unit pills, `commitSample`)
- `src/components/agents/AgentEditor.tsx:474–510` (`patchRow`, ± , unit pills)
- `src/components/queries/QueryCreatePane.tsx` (via `queryDraft.materialRowsForDraft`)

**`join` does not exist.** `summaryFromRows` always joins `"  ·  "`. The `'or'` reading
(agent accepts either) has no implementation anywhere.

## 5. Shapes

| Thing | Type | Location |
|---|---|---|
| `Agent.materialsWanted` | `string[]` | `types.ts:308` — canonical encoder `agentMaterials.ts`; **the array is the delimiter** |
| Query send materials | `materialsWanted?: (string \| QueryMaterial)[]` | `types.ts:420` — **optional**; legacy plain strings, new structured |
| `QueryMaterial` | `{ material: string; type?: "pages"\|"words"\|"chapters"\|"other"; quantity?: number\|string }` | `types.ts` |
| `SubmissionPackage` | `{ packageName, queryLetterVersionId, synopsisVersionId, samplePagesVersionId, status, createdDate }` | `types.ts` |
| `ManuscriptVersion` | `{ componentType, versionName, contentType?, contentLink?, notes?, createdDate }` | `types.ts` |

**Is a sample stored structured or as a display string?** **Both, by design.** `QueryMaterial`
carries `type` + `quantity` structurally; legacy entries are plain strings. Every reader must route
through `formatQueryMaterial()`. `queryDraft.draftMaterialsToQuery(rows)` already converts
`MaterialRow[]` → `(string | QueryMaterial)[]` — **the write path Phase 4 needs already exists.**

**Good news for Phase 6 item 7:** `SubmissionPackage` stores its sample as a **`samplePagesVersionId`,
not free text**. The brief's "do not parse the string" contingency does not apply — the package
points at a structured version id.

## 6. Plan gating

`isProUser(user)` — `src/lib/suggestComps.ts:127`, `user?.plan === UserPlan.PRO`. A plain predicate,
no hook. Client-side gating is paired with a server-side check inside paid callables.

---

## What I intend to do with this

1. **Phase 1, re-aimed** — the type work is done; build the missing **component** (`SampleSpecPicker`)
   and the missing **`join` formatter**, adopt in `AgentEditor`. Do **not** rewrite
   `AddAgentFocusForm`'s state model: that is agent persistence, which §3 says stops the phase.
2. **Phases 2 and 3 — skip as already delivered**, with the specific deltas the brief wants
   (copy: "Sent previously", gendered possessives) picked up where they apply.
3. **Phases 4 and 5 — the real work.** Reuse `sweepCardFor` for bulk rather than inventing a
   parallel grouping.
