# Pack C Phase 0 — recon

**Session** `tasks-workflow` · base `12fa1525` · read-only · **red gate clear** (nothing modified in
the territory, HEAD is exactly the recon's base, `quickDone` and the committer are byte-identical
since `12fa1525`).

## 1. `quickDone`'s four reaches — all decoration, so the optional-sink shape holds

| reach | sites | verdict |
|---|---|---|
| `setOverlay` | 1167, 1177, 1192, 1215 | **decoration** |
| `clearOverlay` | 1168, 1178, 1193 (undo closures) · 1211 (`edit`) | **decoration** |
| `setFlowPrefill` | 1212 | **decoration, transitively** |
| `openFlowCards` | 1213 | **decoration, transitively** |

**`setOverlay` is always after the write, never before it.** Every one of the four sites follows a
completed write, and every one carries `{ kind: "receipt", … }`. The note arm:

> `await updateUserTask(c.userTaskId, { done: true, completedAt: nowIso });`
> …
> `setOverlay(c.key, { kind: "receipt", lane: "nt", title: "Note done", … });`

Nothing downstream of a `setOverlay` call performs or completes a write. The `via === "none"` guard,
the `try/catch` around the user-task write, the `!r.success` nudge check and the duplicate-send
`confirmAsk` all sit **above** it.

**`clearOverlay` is the inverse and appears only inside undo closures** —
`doneToast(c, async () => { await undo(); clearOverlay(c.key); flash("Restored"); })`. The write is
`undo()`; the clear is tidying the receipt the sink drew. With no sink there is nothing to tidy.

**⚠️ `setFlowPrefill` and `openFlowCards` are reachable ONLY through the overlay, and this is the
finding of Phase 0.** Both live inside `edit` (1207–1214), and `edit` is handed to exactly one
place — `setOverlay(…, { …, edit })` at 1215. It is passed nowhere else and called nowhere else. So
with no sink, `edit` is constructed and never reachable: not a dead control, because nothing renders
it.

**Consequence, stated plainly:** on the calendar a quick mark-sent will have no *"Edit details"*
affordance, because that affordance is drawn on the card overlay. Undo is unaffected — it rides the
toast, which is Nick's ruling and holds.

**No reach is load-bearing. The pack's assumption is confirmed.**

One implementation note the shape depends on: the undo closures call `clearOverlay` unconditionally,
so the sink must be optional in **both** directions. A missing sink must skip the clear, not throw
inside an undo.

## 2. The committer — re-verified against the current tree

Unchanged from the recon: **14 symbols, ~292 lines.** `clearOverlay`, `commitChaseFromPane`,
`commitCloseFromPane`, `commitFixFromPane`, `commitFromPane`, `commitMaterialsFromPane`,
`commitOfferFromPane`, `commitRecordSweep`, `commitSendFromPane`, `doneToast`, `openFlowCards`,
`quickDone`, `setOverlay`, `writeQueryMaterials`.

Every arm's only callers remain `commitFromPane` and its own retry closure.

## 3. What the calendar must supply, and which arms it can produce

**It can produce all of them.** The calendar builds its cards from `assembleBoardColumns` — the same
derivation `/todo` uses (`TodoCalendarPage.tsx:556`) — so every card kind, and therefore every arm,
can reach the pane there. There is no subset to carve out.

Per arm the calendar must supply only what `/todo` supplies: the db writers (context), `flash`
(it has `useTodoToast` already) and `onNavigate` (it has it). The overlay sink is the one thing it
does not supply, deliberately.

## 4. `commit` is NOT the only missing callback — a correction to my own recon

The recon listed `onSnooze` / `onDismiss` as *"its own surfaces"*. **The calendar has neither.**
`snooze` appears there only as a display family (`items.filter((i) => i.family === "snoozed")`) and
`dismiss` only as the toast's own dismiss; the page states that it shows no dismissed cards at all,
because a dismissed task has no action date to sit on.

**This needs no new surface, and building one would be the invention the pack forbids.** `TaskPane`
already renders those verbs only when the callback is present — `{d.onSnooze && …}` — and the
journey type says so in as many words: *"the action bar's verbs — see `TaskPaneJourney` for why
absence is not the same as disabled"*. So the calendar passes neither, and the pane shows neither.

And the absence is principled rather than a gap: **the calendar's snooze is drag.** Moving a task to
another day is what the drag-to-reschedule built in the previous pack already does, on the surface
where days are the subject. A dial offering "in 3 days" beside a grid of actual days would be a
second way to say one thing.

`jumpToSection` is written per mount by design — that is what Phase 1 of Pack B built `idPrefix` for.

**So: `commit` is the missing one to build; `onSnooze` and `onDismiss` become optional on
`TaskPaneHost` and are deliberately absent on the calendar; the remaining four are as the recon
found.**
