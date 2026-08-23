# Pack A2 — finish the lift: `figureFor` derives sleep

**Session:** `tasks-workflow` · 23 Aug 2026, overnight.
Basis: `reports/tasks-workflow-packB.md` (Phase 0), Pack A.

> # ⛔ NOT DEPLOYED — condition 4 of the standing rule.
>
> **Everything else passed.** `tsc` **0** (baseline 0), my territory's suites green and **none
> retargeted**, whole tree **1 file red against a baseline of 2** — no worse — and `npm run
> build:dev` exit 0 with the target guard naming `scriptally-dev`.
>
> **What failed:** another session holds **uncommitted source that ships**:
>
> ```
>  M src/components/shell/WorkspacePageGrid.tsx
>  M src/components/shell/workspacePageGrid.css
> ```
>
> Every workspace page imports that grid, so it would have been baked into the bundle. It is also
> the cause of the tree's one red (`workspacePageGrid.test.tsx`), which was **already red at HEAD
> before I touched anything**. The work is committed, measured and ready: `npm run build:dev &&
> firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev` once they have
> committed.

---

## Phase 0 — the recon, and the answer to item 3

### 1. `snoozedCards`' predicate, and every input

```ts
return flagCards(input, (f) => flagSleeps(f, input.nowMs) && !flagDismissed(f),
  (f) => ({ due: f.snoozedUntil ? backOnLabel(f.snoozedUntil) : "ASLEEP", mark: SLEEP_MARK }));
```

…with `flagCards` adding `f.taskType !== "offer_received"`. Its inputs are
`{ flags, queries, agents, manuscripts?, userTasks?, nowMs }` — **six, all data. None reaches
`pendingSaveId` or any other page state.**

### 2. Every caller of `figureFor`

**One**: `ToDoPage:973`, `const f = figureFor(paneCard)`, inside `paneFacts`. The page wrapper was
what supplied `snoozedKeys`, built at `:896` from `boardCols.snoozed`. *(`tasksViewport.test.tsx`
asserts that call site's text; it is unchanged, so the lock stayed green untouched.)*

### 3. What `pendingSaveId` actually does — **it never reaches the column**

```ts
const userTasks = input.hiddenUserTaskId
  ? input.userTasks.filter((t) => t.id !== input.hiddenUserTaskId)
  : input.userTasks;
const board = assembleBoard({ ...input, userTasks });          // ← FILTERED: the LANES
…
const cols = boardColumns({
  board, flags: input.taskFlags, queries: input.queries, agents: input.agents,
  manuscripts: input.manuscripts, userTasks: input.userTasks,  // ← UNFILTERED
  sweeps, today: input.today, nowMs: input.now,
});
```

> **⚠️ THE FILTERED ARRAY IS A LOCAL THAT ONLY `assembleBoard` SEES.** `boardColumns` — which builds
> `snoozed` — is handed `input.userTasks`, unfiltered. So `pendingSaveId` changes **neither what
> "asleep" means nor when it is known**: it does not participate in that column at all. The stop
> condition does not fire, and the equality holds **by construction** rather than by argument.

### 4. Every other consumer of `boardCols.snoozed`

`railGroups`/`railGroupsAll` (`:3482`, `:3520`), `snoozedCount` (`:3559`), the calendar's
`assembled.cols.snoozed`, `useTodoCounts`, and `todoGroups`' group/chip counts. **None would
diverge** — every one reads the same `cols.snoozed`, and the re-derivation calls the same function
with the same inputs.

---

## Phase 1 — the change, and the proof

`figureFor(c, db, flags, now)`; `snoozedKeys` is gone. Inside, the sleep test is
`boardEligible(snoozedCards({ flags, queries, agents, manuscripts, userTasks, nowMs }))` — the
**column's own call**.

> **⚠️ A CHEAPER TEST WAS AVAILABLE AND WAS REJECTED.** `boardColumns`' own `withReturn` shows a
> card→flag matcher (`flagMatchesTask`), so `figureFor` could have asked about one flag instead of
> building the column. That would be a **second expression of the rule**, and equality with the
> column would become a claim needing its own proof — the exact fault this extraction removes. The
> cost of calling the real thing is one pass over flags per call, and `figureFor` is called once
> per render.

> **⚠️ THE FLAGS ARE THEIR OWN ARGUMENT, NOT A SIXTH FIELD ON `TaskData`, and the reason is
> memoisation.** `TaskData` is memoised and `listRowInputs`' `useCallback` depends on it — Pack A
> found that callback's identity decides when `TaskList` re-renders. `listRowInputs` never reads
> flags, so folding them in would re-render the list on every flag change for a value it does not
> use.

### The equality, discharged

**Deterministically, in `src/lib/taskCardFactsSleep.test.ts`** — four assertions:

| | |
|---|---|
| the fixture is not vacuous | something **is** asleep |
| **the mid-save case** | `assembleBoardColumns({…, hiddenUserTaskId: "ut1"})`'s `cols.snoozed` is **identical, key for key, in order**, to the same call without it |
| the flag is not inert | the **same** `hiddenUserTaskId` demonstrably **shortens the lanes** |
| construction | the re-derivation's keys equal `cols.snoozed`'s keys on the same data |

> **⚠️ WHY DETERMINISTIC RATHER THAN A BROWSER RACE, stated because the pack asked for the
> mid-flight observation.** `pendingSaveId` is set only while an optimistic create is in flight. A
> UI race would observe **one** save and could not speak for the next; calling the derivation twice
> decides it for **every** save. That is the stronger discharge, not a substitute for a weaker one —
> and Phase 0 item 3 explains why it can never fail: the flag does not reach the column.

> **⚠️ THE NON-VACUITY CHECK EARNED ITS PLACE IMMEDIATELY.** It failed on my first fixture: dateless
> user cards are **notes** under the two-natures law and `boardEligible` filters notes from every
> column, so `hiddenUserTaskId` changed nothing anywhere and the invariance was proving only that
> its input was ignored. Dated, the fixture bites.

### On a rendered page

18 rows, figures **identical to Pack A's** (`open10 weeks`, `no date on record`), pane mounted with
its band, **console clean**.

> **⚠️ THE SLEEP BRANCH WAS NOT EXERCISED ON THE PAGE, and the test says so rather than passing.**
> This account holds no snoozed card, so an assertion over `backFigures` would have been satisfied
> by an empty set — the vacuous-check family. It logs the absence and names where the branch **is**
> proved. If anyone snoozes a card on the harness account, that line starts reporting a `BACK …`
> figure.

### TDZ audit

**Clean, and the change removed a risk rather than adding one** — the `const snoozedKeys` that a
hoisted `figureFor` read is gone. Remaining chain: `taskFlags` (destructured, `:297`) and
`taskData` (`:521`) both precede `figureFor`'s only call site (`:973`). **Nothing shadowing found**
(Pack A's `isoOf` remains the only instance).

---

## FLAGS FOR NICK

**1. Deployed —** no; condition 4, another session's shipping source uncommitted. See the top.

**2. What `pendingSaveId` does to `boardCols.snoozed` — nothing.** Quoted in Phase 0 item 3: the
filtered `userTasks` is a local only `assembleBoard` sees; `boardColumns` gets the unfiltered array.

**3. The equality proof —** held open **not** by racing a save but by calling the derivation twice,
with and without `hiddenUserTaskId`. Stated as the stronger discharge, with the structural reason it
can never fail.

**4. Other consumers that would diverge — none.** All five read the same `cols.snoozed`.

**5. TDZ — clean; one risk removed. Nothing shadowing.**

**6. The mid-run gate — did not fire.** Checked before Step 0, before Phase 1's gate and before the
commit; my territory held only my own two files throughout. *(Another session is live in
`src/components/shell/`, outside the fence — that is the deploy blocker, not a gate breach.)*

**7. Cross-session —** busy. Six commits from other sessions landed between Pack B and this pack
(`0fcbc1bf` back to `de5ba3c5`); my history is intact and an ancestor of HEAD. **The tree was
already 2 files red at HEAD before I began** — `workspacePageGrid.test.tsx` (that session's
uncommitted WIP) and `marketingLinks.test.tsx`, which recovered on its own during the run. A first
whole-tree run also timed out at 10 minutes under the contention; subsequent runs completed in
normal time.

**Two mis-hit replacements of my own, both caught before committing** and both the same shape as
Pack B's: a blanket `replace(old, new, 1)` matched an earlier identical block — once my own comment
prose, once the *first* of two tests ending in the same console-check lines, which put `r` where it
was not in scope. `tsc` caught the second; the first needed reading the diff. Anchors are unique now.
