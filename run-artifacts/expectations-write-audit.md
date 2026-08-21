# Are the expectations answers written? — no, and it is worse than "they go nowhere"

Verified by tracing the chain, not by reading the last report. **21 Aug, on `891e4b5c`.**

## The three states the pane is in

1. **It COMPELS both answers.** `paneGate.ts:122` — `case "send": return ["unit", "when", "expect",
   "remind"]`. The primary will not commit without them.
2. **It PROMISES them in writing.** `ToDoPage.tsx:1180` builds `reply expected ~{date}` and
   `nudge {date}` into the will-record strip, which is the app's own sentence about what pressing
   the button will record.
3. **It writes NEITHER.**

That third point is the one that matters. "The answers go nowhere" would be a gap. A form that
*requires* an answer and then *states in writing* that it has been recorded is confidently wrong,
which for a record-keeping app is the worst available failure.

## Exactly where the chain breaks

| Link | State |
|---|---|
| pane collects `expect` / `remind` | ✅ built (steer round Phase 3/4) |
| `setFlowPrefill` (`ToDoPage.tsx:3363`) | ❌ carries `sentDate` + `materials` only |
| `FocusFlowProps.prefill` (`FocusFlow.tsx:136`) | ❌ `{ sentDate?, method?, materials? }` — no field for either |
| `markSentWriteArgs` (`todoWalk.ts:200`) | ❌ returns `{queryId, targetStatus, sentDate, isResubmit}` |
| `recordMaterialsSent` (`db.tsx:2093`) | ✅ **accepts** `writerExpectedDate` + `nudgeDate`, and writes them at `db.tsx:2129` |
| Firestore rules | ✅ both fields already in the query update allowlist — **no rules deploy** |

So the destination has been ready the whole time. The two links the pane round named are still the
two links, and nothing else is missing on the write side.

**The only surfaces writing `writerExpectedDate` today are the Query Centre** (`Queries.tsx:3879`
via `MarkSentPopover`) **and `EditQueryDrawer`.** Mark a send from the To-do pane and neither field
lands; mark the same send from the Query Centre and both do. Two doors onto one act, one of which
records less than it says it did.

## Two things to check at recon, not assumed here

- **The board read may be reading a superseded field.** `replyTask` is handed `q.responseDeadline`
  (`db.tsx:777`), and there is a live migration that copies `responseDeadline` → `writerExpectedDate`
  and **deletes** the old one (`db.tsx:1001`). If that migration is the direction of travel, the
  board read is already looking at a field being removed — which would matter for the reminder
  surfacing whether or not the pane writes it.
- **`writerExpectedDate` is not on the `Query` type** in `types.ts` (only `responseDeadline`, line
  461). It is declared ad hoc in `expectedDate.ts`, `saveQueryEdits.ts` and `db.tsx`. Worth one
  look before building on it.

## Recommendation

Ship the fix as its own round, exactly as scoped: the two links, plus the board read at
`db.tsx:774`, with a past-date fixture proving a reminder actually surfaces as a task.

**Until then the honest interim is one line**: drop the expectation clause from the will-record
strip. The questions can stay required — asking is defensible, and the answers will land shortly —
but the app should not state that it recorded something it did not. That change is smaller than the
fix and can go tonight if wanted.
