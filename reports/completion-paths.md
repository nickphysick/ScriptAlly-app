# Pack 2 — one completion primitive, and the dead overlay

**Session** `completion-paths` · `dad7202d` → `d746fbb1` · **NOT DEPLOYED** · source committed

## 1 · Deployed or not

**Not deployed.** No condition-4 blocker this time — but **Phase 1 is unfinished and stopped on the
pack's own condition**, so half the change is a decision away and a deploy would ship a half-applied
law. My shipping source is committed; nothing of mine is left in the tree.

## 2 · Did the two inline sites differ from `quickDone` in what they write?

**One did, and it is the pack's stop condition.**

**`FocusFlow.tsx:1289` — DIFFERS. Phase 1 stopped here.**

```
const saveText = dirty && c.userTaskId ? { text: text.trim() } : {};          // :1260
updateUserTask(c.userTaskId, { done: true, completedAt: …, ...saveText });    // :1289
```

`quickDone` writes `{ done: true, completedAt }` and has no notion of an edited body. This sheet
lets the writer **edit the note and cross it off in one write**. That is a different act, not a
different route to the same one — two behaviours, which is exactly what the pack said to stop on.

**Worth knowing before ruling:** its undo restores `{ done: false }` only. The edited text is *not*
reverted, so that entrance's Undo is already partial.

The options, none of which I picked:

1. **Save then complete** — an ordinary `updateUserTask({ text })`, then `quickDone`. Two writes,
   each canonical for its job; loses atomicity, so a failure between them leaves text saved and the
   task not done.
2. **Give `quickDone` extra fields** — how the overlay sink got there, and Phase 2 has just spent a
   commit removing exactly that shape.
3. **Leave it, documented as a distinct act** — "save and cross off", not a second completion path.

**`FocusFlow.tsx:1318` (`sweepDone`) — writes exactly `quickDone`'s fields.** It differs only in
what follows (`onToast` + `advanceAfterReceipt` versus `doneToast`). Routable — but routing it needs
`quickDone` threaded into `FocusFlow` as a prop from both hosts, and that seam is better designed
once, for both sites, after the ruling above. Left with site 1.

## 3 · Final count of inline completions in `FocusFlow.tsx`

**Two** — `grep -c 'updateUserTask(c.userTaskId, { done: true'` → `2`. Unchanged, because Phase 1
stopped before touching either.

## 4 · What was removed, and what was kept

**Removed:** the `Overlay` type · the `overlays` state and both writers · `overlayCards` and its two
renderers · `TaskOverlaySink` and the host member · the three sink shims · every `setOverlay` and
`clearOverlay` call in both files · the **"Edit details"** closure, which was handed to `setOverlay`
and nowhere else · `flowPrefill` and the `prefill={…}` pass · and the orphans that existed only to
build a receipt (`lane`, `text`, `gkey`, the `cardLane` import, and the committer's `today`,
`receiptLine`, `materialOptsForTask` and its `openFlowCards` shim).

**Kept, each checked for another caller first:**

- **`openFlowCards` on the page** — the `offer`/`fix` hand-off still calls it.
- **`FocusFlow`'s `prefill` prop** — removing it means rewriting that component's internals.
  ⚠️ **Nothing passes it any more**, since `flowPrefill`'s only value-writer was the receipt's edit.
  A prop with no caller is the same trap one layer along; reported rather than swept.

## 5 · Locks retargeted

- **`todoActions.test.ts`** — the snooze-routing case dropped its `cardLane(c)` assertion. The law
  is that both branches route through `snoozeVia`; `cardLane` computed the receipt's lane and was
  never part of that claim.
- **`todoTour.test.ts`** — gained a `KNOWN_STALE` entry (below).

### ⚠️ The finding: the dead overlay was propping up a dead tour stop

*"Every card works the same."* targets `.tdb-tile, .tdb-gcard, .tdb-lrow`. **None has been rendered
since the board became a grouped list** — the stop stayed green only because `.tdb-tile` was still
*written* by `overlayCards`, a renderer with no caller.

**A source census cannot tell a class the app RENDERS from one a dead function WRITES.** That is
worth more than the instance, and it is the general form of the trap Nick's ruling described.

Left standing and named rather than retired, because retiring is a product decision: the copy
describes hover actions and batches expanding in place, so aiming that sentence at a list row would
make the tour state something the app does not do. `KNOWN_STALE` says it *"may only ever shrink"* —
the entry explains why this is a **census correction, not growth**: the count of dead stops was
already three and is now honest.

## 6 · What remains unverifiable

- **Whether Undo reverts** — the standing harness gap.
- **The weekly review was not walked**, so site 2's routing is unexercised end-to-end (it was not
  changed).

## 7 · Cross-session

- **Pack 1 closed a Pack C gap for free.** With fixtures restored, the jump assertion that had no
  gated card now runs: `pressing a gated primary — "Log as sent3 to answer"`,
  `targetInThisWindow: true`.
- Another session held uncommitted source throughout (`src/components/shell/workspacePageGrid.*`),
  including during Pack 1, which asked for an exclusive tree.
