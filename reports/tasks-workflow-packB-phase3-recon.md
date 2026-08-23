# Pack B Phase 3 — recon, and the blocker

**Session** `tasks-workflow` · base `d9ec6461` · **nothing built, nothing committed**

## Phase 3 as scoped cannot be delivered, and the reason is a decision rather than a difficulty

Phase 3 is *"the calendar mounts the pane"*. The mount needs the seven host callbacks. Six of them
the calendar can supply today:

| callback | the calendar's answer |
|---|---|
| `jumpToSection` | its own pane's `idPrefix` — this is what Phase 1 built |
| `openFlow` | `setFlowCard(card)`, already there |
| `advance` | close the pane; the calendar has no dock cursor |
| `onSnooze` / `onDismiss` | its own surfaces |
| `openQuery` | `onNavigate("queries", id)`, already there |

**`commit` it cannot supply, and must not fake.** `commitFromPane` dispatches to eight arms whose
only callers are itself and their own retry closures — so the committer layer serves exactly one
consumer, which normally makes it a clean lift. A fixed-point sweep puts its transitive closure at
**14 page symbols, ~292 lines**. That size is not the problem.

**The problem is `quickDone`.** It is the completion primitive — `commitFromPane`'s `note` arm calls
it, and `CLAUDE.md` records why nothing may go round it: *"an inline completion is how the undo was
bypassed once already. One primitive, four entrances."* And `quickDone` reaches `setOverlay`,
`clearOverlay`, `setFlowPrefill` and `openFlowCards` — the To-do page's own overlay machinery.

Measured: `setOverlay(c.key, { kind: "receipt", … })` fires on **every** arm, the note arm included
(`ToDoPage.tsx:1167`). The overlay is a **card-keyed receipt drawn on a board card**. The calendar
has no board cards and no overlay concept.

## So the open question is Nick's, not mine

Sharing the committer means the calendar supplies overlay callbacks. Two answers, and they are not
equivalent:

1. **No-ops.** The undo toast still works, so this is not a dead control — but the receipt that
   appears on `/todo` silently does not appear on the calendar. Two surfaces, one write, different
   feedback: the divergence this pack exists to remove, in a quieter register.
2. **The calendar grows a receipt.** Correct, and a product decision about what a completion looks
   like on a calendar — which is not a refactor.

Building either without a ruling would be inventing the answer, which is the fault this file's own
`RemindChoice` entry describes: *a value produced to fill a hole in the model, rendered with the
same confidence as one a person supplied.*

## What Pack C would be

**One committer, both pages.** Move `commitFromPane`, its eight arms, `writeQueryMaterials`,
`doneToast` and `quickDone` into a `useTaskCommit(host)` whose host carries the overlay four
(`setOverlay`, `clearOverlay`, `setFlowPrefill`, `openFlow`). `commit` then leaves
`TaskPaneHost` entirely and both pages get the write from one place — which is Pack B's actual
goal, *one task workflow, everywhere*.

Its first job is the ruling above, because the host's shape depends on it.

## Also blocked behind it

Phase 4 (verify + conditional deploy). Deploys have been blocked by condition 4 four consecutive
times — another session's uncommitted shipping source is in the tree right now
(`src/components/Queries.tsx`, `src/components/packages/*`, `src/components/reading-pane/*`).

## What is done and committed

- **Phase 1** `1cb71409`-era — `idPrefix`, and `paneGate` re-pointed to a rendered page.
- **Phase 2** `438f5bf4` — the session moved; suite 6513 green.
- **Phase 2's rendered check** `18733bed` — two measurements, four readings green, three commits
  verified advancing to the pre-write successor.
