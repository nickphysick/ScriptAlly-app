# Phase 0 — recon

Contract present: **yes**, copied to `design-refs/todo-pane-contract.html`
(md5 `ec08f5cf5c65c5e1d1851f10be5074e0`, 383 lines).

## ⚠️ The finding that reshapes the brief

**`PaneJourney` and `PaneRecordSweep` are dead code — zero imports, zero JSX mounts.** They were
props of `TodoDock`, which the pane port retired; they went dark with it and nothing has rendered
them since. **They are `SampleSpecPicker`'s only two callers**, so the picker is unreachable too:
styled, unit-tested, and rendered by nothing.

That changes three phases:

- **Phase 3** says *"reuse `SampleSpecPicker` in a new `mode="sent"`"*. The component exists but has
  no live caller — "reuse" here means **re-mounting a dead component into the ported pane**, not
  extending a live one. The picker itself is in good shape (see recon 3), so this is a mounting job
  plus a new mode, not a rebuild — but it is a bigger piece than the wording implies.
- **Phase 3** also says the bulk table's per-row editor "also becomes `mode="sent"`". That editor is
  `PaneRecordSweep`, which is dead.
- **Phase 6** says *"The table itself is as shipped; only its chrome changes."* The table is not
  shipped — it is `PaneRecordSweep`, unmounted. Changing its chrome would change nothing on screen.

**Nothing here is broken by it** — the live pane renders a simpler chip list — but the phases must
be read as *restore and extend*, not *adjust*.

## 1 · Nudge-reminder footing — Phase 4 is NOT gated off

| field | written by | read by | in the To-do derivation? |
|---|---|---|---|
| `responseDeadline` | `db.tsx`, `computeAgentDeadlineWrites`, `saveQueryEdits`, `logNudge`, import | 29 files incl. `expectedDate.ts`, `dashboardStats` | **YES — `todoBoard.ts` reads it 6×** |
| `nudgeDate` | `logNudge` | `queryAmbient`, `QueryTimeline`, `fortnightEvents`, `todoWalk` | **no** |
| `sendReminderDate` | `recordResponse`, `responseDraft`, `TimelineComposer` | `RecordResponse*` surfaces | **no** |

No cloud function touches any of the three.

**So:** the *expectation* half of Phase 4 has full footing — rules, writers, and a To-do read path
already. The *reminder* half has rules and writers but **nothing on the To-do list reads it**, which
is precisely the brief's "a field whose only missing piece is the To-do derivation reading it —
build that read". Phase 4 proceeds; the reminder needs a board read building.

## 2 · Dismissal — already keyed to the cause

⚠️ **`dismissedTasks` is the LEGACY mechanism.** The live one is `TaskFlag`, and
`buildTaskFlagFromDismissed` exists to migrate the old records forward. Writing through
`dismissedTasks` today would write to the retired store.

`flagKeyForTask(taskType, relatedRecordId)` keys a flag to **taskType + query** — the *cause*, not
the query. **So the contract's promise "a fresh task appears if the situation changes" is already
true**: dismissing `nudge_overdue` cannot suppress a later `offer_received` on the same query.
**Phase 7's re-keying work is not needed** — only the dialog, the filter entry, and the write
through `TaskFlag`.

## 3 · The stepper already exists, with the brief's own increments

`SampleSpecPicker` (`src/components/materials/`) already carries the stepper (`.ssp-step`,
`stepAmount`, arrow-key support) and reads `UNIT_CFG` from `lib/agentMaterials`:

| unit | step | min |
|---|---|---|
| Chapters | **1** | 1 |
| Pages | **5** | 1 |
| Words | **500** | 500 |

Exactly what Phase 3 specifies. Nothing to build — only to mount, and to add a `mode`. It has no
`mode` prop today; it has `join="and" | "or"`.

## 4 · `card.title` in the pane — one read

`src/lib/taskPaneJourney.tsx:120` — `deed: isNote ? c.title : deedNode(c)`. The note branch is
correct and stays (a note's title *is* the writer's words). The non-note branch already goes through
`deedNode`, which wraps `bandDeed` → `rowDeed`. **So the band already reads `rowDeed` for a close
card**, and Phase 2's "retire the pane's `card.title` reads" is already satisfied except for notes,
where it should not be.

## 5 · The calendar route exists

`/todo/calendar`, registered in `todoRoutes.ts:41` and mounted in `App.tsx:698` as
`TodoCalendarPage`. **The Phase 1 button has a real destination.**

## 6 · `AnchoredPanel` takes any element

`anchor: HTMLElement` — it places against a rect and needs nothing else. **The snooze panel can
anchor to a button in the pane's action bar unchanged.**

## Other premises checked

- *"The pane band reads `card.title` (a close card's title is a sentence)"* — see recon 4: it reads
  `rowDeed` for non-notes already.
- The contract's three journeys are Send a partial · Consider closing · Bulk fill-in.
