# Log a query · Unknown reply time v1 — the writer's Unknown beats the agent's weeks

Nick's ruling (24 Nov): Log a query's Unknown should match Record a response v2.1.1. When the writer picks Unknown for
the reply time, the card shows "No date yet", even for an agent whose card states a reply time.

Branch `log-a-query-unknown-v1`, cut from the line dev served (`dev/…-rar21-aa2-rar211` @ fb4409d8e, `index-DRi4YNaV.js`,
which carries add-agent v2, agent card v2.2.1 and Record a response v2.1.1). One commit. Dev only.

## False premises and findings (read first)

1. **Log a query disagreed with itself.** With Unknown picked for Harriet (card: 8 weeks), the Nudge step said "No reply
   date, so choose when to be reminded below." while the review's card beneath said "Reply expected by 19 Jan 2027", with
   a window bar. The save wrote nothing for Unknown, so the card fell back to the agent's 8 weeks.
2. **Log a query's Unknown keeps its reminder.** Unlike Record a response (whose Unknown clears the nudge), Log a query
   counts a reminder from the send (8 weeks by default) when the reply time is Unknown. So the card reads "Reply expected
   by · No date yet · Nudge on 19 Jan 2027": no date, no bar, and the reminder the writer kept. That is the card's own
   no-date drawing, unchanged.
3. **Eight of Log a query's v2.1 and v2.2 tests fail on the dev line before this change.** V21-1…V21-4 and V22-0, V22-2,
   V22-4, V22-5 time out waiting for the header's "Log a query" button. With their fixture (seedLaq21: four agents already
   queried), add-agent v2's "Quick actions" header offers "Record a response" and "Add an agent" instead. V21-2 was rerun
   on the base with this fix set aside and failed the same way. Add-agent v2 updated laqV2 (V2-2 deleted) but not these two
   specs. That is the add-agent session's to fix, or yours to rule on; nothing here touches the header.

## What changed

- `lib/queryActions/logStages` `replyPlan`: the plan carries `replyUnknown` (the slider's Unknown, `wk == null`). Only the
  desktop journey sets it; the phone's quick log and the old drawer journey never do, so they are unchanged.
- `lib/queryActions/logSave` `logPayload`: with `replyUnknown` and no date, the record stamps `writerExpectedSetAt` with no
  `writerExpectedDate`: the writer's statement that no reply date is known (`writerExpectedUnknownWrite`, the same as
  Record a response v2.1.1). `resolveExpectedDate` already lets that beat the agent's weeks. The review's card is built
  from this same record (`previewOf`), so the review, the logged screen and the saved query agree.
- Unchanged: the agent's weeks kept (no stamp, the agent's window); a moved date (the writer's date and its stamp); an
  agent with no weeks still shows no date (now stamped as well).

## Locks, red before green

| Lock | Red on the base | Green |
|---|---|---|
| unit `src/lib/queryActions/logUnknown.test.ts` K1–K5 | K1 (no `replyUnknown`, no stamp), K2 (the review's row had a date), K5 (no stamp); K3 and K4 guard the unchanged paths and passed throughout | 5/5 |
| e2e `tests/e2e/laqUnknown.measure.ts` U1–U4 | U1 review card "Reply expected by 19 Jan 2027" with a bar; U2 the same on the logged screen (`ledger/U-red-base.json`) | 7/7: "Reply expected by · No date yet · Nudge on 19 Jan 2027", no bar, on both; the control (8 weeks kept) still shows 19 Jan with its bar; Undo leaves nothing (`ledger/U-green.json`) |

On the fixed tree: Log a query's V2-1 and V2-3…V2-10 green (V2-2 was deleted by add-agent v2), V22-3 green; Record a
response P1 30/30, P2 32/32, P3 4/4, P4 5/5 (`ledger/rar-P4-after.json`). V21 and V22's other tests are red as above
(finding 3).

## Gates

| | Baseline | Final |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `vite build` | clean | clean |
| Vitest | 943 files, 13,410 passed, 0 failed | 944 files, 13,415 passed, 0 failed (+K1–K5) |

## Deploy

Merged into the dev line as `dev/…-aa2-rar211-laqunk` and deployed to https://scriptally-dev.web.app. The bundle's name is
not in this commit: the dev build embeds the commit's short SHA, so it can't be known before the commit exists. It is
given in the session's reply and the project memory.
