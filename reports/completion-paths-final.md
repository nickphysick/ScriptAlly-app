# One completion primitive — finished

**Session** `completion-paths` · `750c984f` → `6f238bc9` · six commits

## 2 · Did the split produce a flicker, a race, or two toasts?

**None of the three.** One receipt, measured on both surfaces at all three widths — the text save is
silent exactly as "Keep it" is silent, and `quickDone` raises the only toast.

Counting it honestly took two attempts, which is worth recording: `[class*=toast]` matched a toast's
own children *and* `.sa-toasts`, the app-level host container, so a single receipt first counted as
three. The question is how many receipts appeared, not how many nodes carry the word.

Order is text-then-completion. The reverse would leave a completed task carrying its old words if
the second write failed — the worse half to lose.

## 3 · Does Undo now restore the completion and leave the edit?

**`done` reverts — proved end-to-end, and this is the harness's first.** Every prior pack could show
a toast carried an Undo control and stopped there. `completionUndo.measure.ts` drives the completion
and presses Undo; `undoProbeRead.mjs` reads the record back through the client SDK:

```
task task-l13vs9s14
  text        : "Undo probe 1787661978493"
  done        : false
  completedAt : "2026-08-25T12:46:24.283Z"
```

**The edit-survives-undo half is unassertable**, because the sheet that edits is unreachable (below).
What is proved is that the completion's inverse reverts the completion on the path a writer can
reach; the edit is a separate write by construction, so nothing undoes it.

### ⚠️ And the first end-to-end assertion immediately found a defect in the inverse

**`completedAt` survives the undo.** `quickDone`'s user-task undo writes `{ done: false }` and
nothing else. Every consumer guards on `done` — `clearedToday`, `todoCalendar` — **except one**:

```
export function briefingCleared(userTasks: UserTask[], win: ReviewWeek): number {
  return userTasks.filter((t) => {
    const t0 = t.completedAt ? Date.parse(t.completedAt) : NaN;
    return !Number.isNaN(t0) && t0 >= win.startMs && t0 < win.endMs;
  }).length;
}
```

So a task completed and then undone still counts as *cleared* in the weekly review's figures. **Not
fixed, deliberately:** the repair is either a wider write on the shared primitive's inverse — which
four entrances reach — or a guard in `briefingCleared`, and choosing is a decision, not an
implementation. Currently unreachable anyway, because the review banner is unmounted.

## 4 · What else the two entrances differed in

Toast copy identical. Toast host identical in practice — both mounts pass `onToast={flash}`, the same
`useTodoToast` instance the committer gets. `:1318` follows with `advanceAfterReceipt` (a 900ms
inline receipt), `:1289` with plain `advance`; both are `FocusFlow`'s queue mechanics and stayed put.
Neither touches the dock cursor.

**Routing added two things, both gains:** the session REDO's `rememberUndo`, which neither entrance
ever registered, and the `try/catch` that turns a denied write into a Try-again toast instead of an
unhandled rejection.

**And it forced one change worth naming:** `quickDone` now reports whether it wrote. It *catches* a
denied write, so a caller that advanced afterwards would carry the writer past a task that was never
completed. Both routed sites gate their advance on the answer, and `commitFromPane`'s note arm stops
assuming `true`.

## 5 · What went with `prefill`, and what stayed

**Went:** the prop, its doc and destructure, and the three pane-only values (`expectedFromPane`,
`noteFromPane`, `nudgeFromPane`) with the six spreads reading them.

**Stayed:** `mats`, `sentDate`, `method` — live per-item scratch state. Only their prefill *terms*
went, so they read `{}`, `todayISO()` and `"Email"`: the exact values they already resolved to on
every render, because nothing supplied the prop. The six spreads were `...(undefined ? {…} : {})`
before and are absent now. **Behaviour-neutral by construction, not by intention.**

## ⚠️ 6 · What remains unverifiable — and it is most of the pack's premise

**Both sites are unreachable from the UI.** Traced in both directions, then measured:

- `noteSheet` (`:1289`) — `paneCommits("note")` is **true**, so a note never hands off to
  `FocusFlow`; `openFlowCards`' only callers are the `offer`/`fix` hosts. Measured: a dated task's
  primary completes in the **pane**, zero `FocusFlow` sheets.
- `sweepDone` (`:1318`) — both call sites are gated on `sweep`, and **nothing in `src/` sets
  `mode: "sweep"`**. The only mode ever set is `"weeklyReview"`, by `openSundayReview`, whose only
  caller is a button inside `renderHero` — and `renderHero` has no caller. Its own comment says the
  hero is *"dormant, awaiting a new entry point"* and the banner *"UNMOUNTED, NOT DELETED"*.
  Measured at three widths: no `.tdb-revlink`, no `.tdb-brief`, no `.tdb-herohead`.

**So the partial-undo defect the pack was written to close is real in code and unreachable in
practice**, and the weekly-review walk could not be done. The changes are kept because they are
correct and they take inline completions to zero; they are recorded as unverified, not claimed.

Inline completions in `FocusFlow.tsx`: **zero**, counted with comments stripped — the remaining
textual matches are this pack's own prose describing what was removed.

## ⚠️ And I spent a fixture proving it

The calendar probe found a row, computed its centre and clicked — but the pip click that precedes it
changes the selected day, the panel re-renders, and a different row can occupy those coordinates.
It did: a run pressed the primary on **"Nudge Imogen Farr"** and logged a nudge against a seeded
query. **Coordinates are a promise about a past layout; the deed is a fact about the present one.**
The probe now reads the pane's deed and refuses to press unless it is our own task — the precondition
Pack C's probe had and I failed to carry across.

Restored by re-running `seed.mjs` (which works now, per Pack 1): the query's `nudgeDate` and
`lastNudgeSentDate` are cleared. **One NUDGE_SENT activity remains in the feed** — the seeder
rewrites documents, not activities. Reported rather than hand-deleted.

## 7 · Cross-session

- **The tree did not stay clean for most of the run.** Another session held uncommitted source in
  `src/marketing/` and `Queries.tsx` throughout Phases 1–4: `tsc` was red there, the full-suite total
  fluctuated between runs (6683 → 6659), and one owned-scope failure appeared and vanished between
  identical runs. **It was clean by Phase 5**, which is why a deploy was possible at all.
- My gate throughout was the owned scope — `src/components/todo` plus the todo/calendar/pane libs —
  which held at 59 files, 0 failures.
