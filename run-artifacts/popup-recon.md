# Phase 0 — recon: what the pane's primaries actually do

Read-only. No commit. Baseline `25f5d460`, 0 behind `main`.

**Pre-existing red at baseline, not mine:** `src/components/shell/workspacePageGrid.test.tsx`
("the reclaim padding is deleted"). Last touched by `a2a7dd2b` / `8a9660e0` / `fd5040c8` — the
masthead/pinned-chrome session. tsc 0 errors; 6,134 passing, 1 failing. Untouched by this round.

## The headline

**The direct-write layer already exists, is correct, and has no caller.**

`commitFromPane(card, v)` — "The one entrance — it routes to the bucket's own write, each of which
is the EXISTING one" — dispatches to seven committers. **Its only reference in the whole repo is its
own definition** (`ToDoPage.tsx:2924`). Five of the seven are reachable only through it and are
therefore dead as well.

It went dead when `PaneJourney.tsx` was deleted in the pane round: the component was the caller, the
committers lived in the page, and only the component was removed. This is the row/reel-cluster fault
CLAUDE.md describes — a cluster that is written, typechecked, unit-covered and unreachable.

So Phase 1 is **wiring, not authoring**. The functions the brief asks me to call are already here.

## 1 · Every pane primary → what it mounts

`onPrimary={() => dockPrimary(paneCard)}` (`ToDoPage.tsx:2047`) is the single entry for all seven
journeys. It gates, then:

| journey | direct write today | then | takeover mounted |
|---|---|---|---|
| send full | `commitSendMaterials` → `commitMaterialsFromPane` (materials only) | `openFlowCards` | **FocusFlow** `sendSheet` |
| send partial | same | `openFlowCards` | **FocusFlow** `sendSheet` |
| close | none | `openFlowCards` | **FocusFlow** `staleSheet` — the "Stale query" dialog in the screenshot |
| nudge / chase | none | `openFlowCards` | **FocusFlow** `chaseSheet` |
| fill-in single | none | `openFlowCards` | **FocusFlow** `materialsSheet` |
| fill-in bulk | none | `openFlowCards` | **FocusFlow** (group item) |
| note | none | `openFlowCards` | **FocusFlow** `noteSheet` |

`openFlowCards` → `setFlow({items})` → `{flow && <FocusFlow …/>}` at `ToDoPage.tsx:2146`.

**The send path already half-writes.** `commitSendMaterials` records `materialsWanted` *before*
opening the takeover, which then records the send. Two writes, two surfaces, one act.

**The Stale Query dialog is not a component.** It is `staleSheet(c)` inside `FocusFlow.tsx:968`.
Nothing to delete; there is a branch to stop reaching.

## 2 · The commit function per journey — what Phase 1 calls

All of these are in `ToDoPage.tsx` already, and each calls the same writer FocusFlow calls:

| journey | committer | underlying write |
|---|---|---|
| send | `commitSendFromPane` | `recordMaterialsSent(markSentWriteArgs(quickSendPayload(…)))` |
| chase | `commitChaseFromPane` | `logNudge(...nudgeWriteArgs(quickNudgePayload(…)))` |
| close | `commitCloseFromPane` | `updateQueryStatus(q.id, CLOSE_REASONS[…].status, note)` |
| fill-in single | `commitMaterialsFromPane` | `updateQuery({ materialsWanted })` — **already reachable** |
| note | `quickDone` | `updateUserTask({ done, completedAt })` — **already reachable** |
| offer | `commitOfferFromPane` | `recordOfferDecision` |
| agent gaps | `commitFixFromPane` | `updateAgent` + `resolveTaskFlag` |

FocusFlow's own equivalents are `stagedHandlers` (`FocusFlow.tsx:308`) + `applyStaged`, and
`sweepDone` (`:1295`) for the immediate path. **Same six writers, reached three ways.** Nothing needs
extracting: the page's copies are not duplicates of the writers, they are additional *callers* of
them, which is what the brief asks for.

## 3 · Who else mounts these takeovers

**`FocusFlow` has a second caller and must not be deleted:** `TodoCalendarPage.tsx:618` — the
Calendar's item sheet, "the same FocusFlow surface every other To-do entrance opens", locked by
`todoCalendar.test.ts` (three assertions requiring `<FocusFlow` in that page's source).

It is also the Sunday weekly review's engine (`ToDoPage.tsx:3699`, `mode:"weeklyReview"`) and the
sweep engine (`:2613`), both of which are entrances of their own, not the pane's.

**So Phase 2's deletions are limited to what only the pane reached.** Candidates are the *dead*
cluster, not the takeover.

## 4 · What the takeover does after committing — the duties the pane must take over

From `sweepDone` and each `commit.onCommit`:

1. **the write** — one call, listed above;
2. **a receipt toast carrying Undo** — `onToast(\`Done — "${c.title}"\`, { label: "Undo", fn })`.
   The page's own equivalent is `doneToast(c, fn)` (`:1445`), which also calls `rememberUndo(c.key, fn)`
   so the row's own undo affordance works. **The page's version is the richer one** — use it;
3. **task resolution** — nothing explicit for query journeys: the board is derived, so the write
   removes the card. The exceptions are `commitFixFromPane` (`resolveTaskFlag`, *after* the write
   lands) and the note (`done: true`);
4. **advance** — FocusFlow calls `advance()`, after a 900ms receipt pause in sweep mode.

**⚠️ Contradiction to record.** The dead layer's own header says the pane
*"DOES NOT ADVANCE TO THE NEXT TASK, deliberately and against what the takeover did"* — the writer
stays and watches the record change. **The brief asks for the opposite** ("the pane advances to the
next task"). The brief is the owner's instruction and wins; the comment goes with the change rather
than being left to contradict the code.

## 5 · The two stale affordances (brief §Phase 2)

| dialog choice | what it writes | pane equivalent |
|---|---|---|
| "Still waiting — ask me in a week" | `dismissTask(taskType, id, "fixed snooze", 7)` | **Snooze** — exists (`snoozeCard`, the ⏸ verb) |
| "Stop asking about this one" | `upsertTaskFlag(flagKeyForTask(…), { snoozedUntil: MUTED_UNTIL })` | **see below** |

**⚠️ False premise in the brief.** It calls the second one "the mute (`mutedTaskRules` / set-aside)".
It is **not** `mutedTaskRules`. That is `mute-rule`, a different staged kind that mutes a whole
housekeeping *rule* for the account. "Stop asking about this one" is `mute-item` — a per-item flag
with `snoozedUntil: MUTED_UNTIL`, i.e. **an unbounded snooze of this one card**.

That makes the pane's answer better than expected: `dismissCard` (`:2507`) writes
`upsertTaskFlag(key, { skippedAt: … })` against **the same flag key**. Both suppress this one card
and delete nothing; they differ in field and in reversibility wording, not in reach. **The writer
need is covered — the dialog holds no unreachable act**, so nothing has to be kept alive for it.
Whether `skippedAt` and `snoozedUntil: MUTED_UNTIL` should stay two fields is a question for the
queue, not for tonight.

## 6 · Two traps for Phase 1

**Two different `JourneyKind` unions are in scope in one file, sharing member names.**
`paneGate.JourneyKind` = `send|decide|chase|close|fix|bulk|note`, where `fix` means *materials
fill-in*. `paneJourney.JourneyKind` = `send|chase|close|offer|note|fix|materials`, where `fix` means
*agent data gaps* and `materials` is the fill-in. `dockPrimary` gates on the first; `commitFromPane`
dispatches on the second. **Routing the commit through the gate's union would send a materials
fill-in to the agent-gaps writer.** Phase 1 dispatches through `paneJourneyKind`, which is the union
the committers were written against.

**`ToDoPage`'s `flowPrefill` state type is narrower than what it holds** (`:332` —
`{sentDate, method, materials}`) while it is assigned `writerExpectedDate`, `note` and `nudgeDate`
and `FocusFlow`'s prop accepts all six. The extra keys survive at runtime because they arrive via
spread, which excess-property checking does not reach — so the write round's measurements were
honest. It is still a type asserting something false. It disappears with the prefill in Phase 1.

## What Phase 1 therefore is

Build the `SendBodyValues` → `JourneySendValues` adapter (the pane's form shape → the committers'
shape), call `commitFromPane`, take over the four duties, and stop calling `openFlowCards` from
`dockPrimary`. No new writer, no second path.
