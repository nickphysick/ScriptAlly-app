# Phase 0 — recon

**Session** `completion-paths` · base `8b2353ad` · read-only · **red gate clear** (nothing modified
in the three owned files; neither site restructured since Pack 2 — the last three commits touching
`FocusFlow.tsx` are a copy fix, a reminder field and a send-form write, none near either site).

## 1 · The two sites, in full

### `:1289` — `noteSheet`'s commit

```
const text = noteText ?? c.title;
const dirty = text.trim() !== c.title && text.trim().length > 0;
const saveText = dirty && c.userTaskId ? { text: text.trim() } : {};
…
onCommit: () => {
  if (c.userTaskId) {
    updateUserTask(c.userTaskId, { done: true, completedAt: new Date().toISOString(), ...saveText });
    onToast(`Done — “${c.title}”`, { label: "Undo", fn: async () => { await updateUserTask(c.userTaskId!, { done: false }); onToast("Restored"); } });
  }
  advance();
}
```

**Writes:** `done`, `completedAt`, and `text` **when the note was edited**. Reached from `:1955`,
`if (j === "note") return noteSheet(it.card)`.

**⚠️ AND THE SPLIT'S FIRST WRITE ALREADY EXISTS IN THIS COMPONENT.** `extraFoot` — the "Keep it"
button, ten lines below — is exactly a text-only save:

```
onClick={() => { if (dirty && c.userTaskId) updateUserTask(c.userTaskId, { text: text.trim() }); advance(); }}
```

So Phase 3 is not inventing a write. It is calling the one this sheet already makes, then the
completion primitive — which is what makes the split a re-composition rather than a new behaviour.

### `:1318` — `sweepDone`'s user-task arm

```
if (c.userTaskId) {
  await updateUserTask(c.userTaskId, { done: true, completedAt: nowIso });
  onToast(`Done — “${c.title}”`, { label: "Undo", fn: async () => { await updateUserTask(c.userTaskId!, { done: false }); onToast("Restored"); } });
  advanceAfterReceipt(`${c.title} — struck through on Today.`);
  return;
}
```

**Writes:** `done`, `completedAt` — exactly `quickDone`'s fields. Reached from `:1418` (the `d`
key) and `:1495` (the sweep's own button). **This is the weekly review's arm.**

## 2 · `quickDone`, and what threading it costs

`quickDone: (c: BoardCard) => Promise<void>` — `useTaskCommit`'s, needing nothing at the call site.
`ToDoPage` already destructures it (`:515`). **`TodoCalendarPage` takes only `commit` (`:581`)** and
must add it. `FocusFlowProps` gains one required prop; both mounts pass it. That is the whole seam.

## 3 · The partial undo — confirmed

`:1289`'s Undo is `updateUserTask(c.userTaskId!, { done: false })`. **It restores `done` and nothing
else.** Edit the note and cross it off, then press Undo: the task un-crosses and **the edited text
stays**, with no way back to the original from that toast. The reading in the ruling is right, and
it is a defect rather than a design — one write made two changes and the inverse undoes one.

## 4 · What else the two entrances differ in

| | `:1289` | `:1318` | `quickDone` |
|---|---|---|---|
| toast copy | ``Done — “{title}”`` | same | same |
| toast host | `onToast` prop | `onToast` prop | `flash` |
| after | `advance()` | `advanceAfterReceipt(line)` — 900ms inline receipt, then advance | nothing |
| **session REDO** | **no** | **no** | **`rememberUndo(c.key, fn)`** |
| **write failure** | **unhandled** | **unhandled** | **caught → "Couldn't mark that done — try again?"** |
| dock cursor | untouched | untouched | untouched |

**The toast host is the same object in practice** — both mounts pass `onToast={flash}`, the same
`useTodoToast` instance the committer gets. So routing changes nothing about where the toast appears.

**Two things routing ADDS, and both are gains:** the session's REDO can offer "Undo handled" on a
card it stamped, which these entrances never registered; and a denied or dropped write surfaces a
Try-again toast instead of an unhandled rejection.

**The queue mechanics stay put.** `advance()` and `advanceAfterReceipt()` are `FocusFlow`'s own
sequencing, not part of the completion, and must be called after `quickDone` exactly as they are now.

## 5 · `prefill` — nothing passes it, and what it feeds

Confirmed: the only references are `FocusFlow`'s own declaration (`:142`), destructure (`:152`) and
six derived values (`:190–198`). **No mount passes it** — `flowPrefill` went with the receipt in
Pack 2. Everything else the grep finds is unrelated (`Queries.tsx`, `createSteps`, `responseDraft`,
`SmartImportReview`) or a comment about the retired path.

What it feeds, and what removal means for each:

| value | uses | on removal |
|---|---|---|
| `mats` | 8 | initialiser falls to `{}` — the same value it has today, since nothing prefills |
| `sentDate` | 13 | falls to `todayISO()` — today's value |
| `method` | 15 | falls to `"Email"` — today's value |
| `expectedFromPane` | 3 | always `undefined` today; the three spreads become no-ops and go |
| `noteFromPane` | 3 | same |
| `nudgeFromPane` | 3 | same |

**So removal is behaviour-neutral by construction:** each initialiser already resolves to its
fallback on every render, because the prop is never supplied. `mats`, `sentDate` and `method` are
live state and stay — only their prefill terms go.
