# Record a response v2.1.1 — "No date yet" when the writer says Unknown

Rulings on v2.1: (1) keep "There's no reply date yet." and fix the card; (2) "The query is closed." stays; (3) the
card-over-journey position stays as built for now. Only (1) needed code.

Branch `record-a-response-v2-1-1`, cut from the line dev served at the start (`dev/…-rar2-acv221-rar21` @ 11c168069, bundle
`index-aKhG_Q-p.js`, which carries the agent card v2.2.1 work and v2.1). One commit. Dev only.

## False premises (read first)

1. **"Exactly as Log a query's card does for Unknown" is only true for an agent with no stated reply time.** Log a query's
   Unknown saves nothing either (`replyPlan`: "Unknown saves none"). Its card reads "No date yet" because the agent in its
   fixture has no `responseTimeWeeks`. For an agent with stated weeks, Log a query's card falls back to the agent's window
   too. This fix makes Record a response's Unknown win. **Log a query's own Unknown is unchanged** (its save still writes
   nothing, and it was out of scope), so a Log a query Unknown for an agent with stated weeks still shows the agent's date.
   That is a ruling to make if you want the two to agree.
2. **The data contract had no way to say "the writer chose Unknown".** `types.ts` and `firestore.rules` stay untouched, so
   I used an existing field honestly: `writerExpectedSetAt` ("when the writer stated their reply date") with no
   `writerExpectedDate` means the writer stated, at that time, that no date is known. Every other writer sets or clears the
   two fields together (grepped: `queryDraft`, `logSave`, `db.tsx` restore, `entryDelete`'s `WAIT_FIELDS`, Queries' undo),
   so only this save can produce that row. If you would rather have a named field (`writerExpectedUnknown`), it needs
   `types.ts`, a rules allowlist entry and a prod rules deploy.

## Why the card showed a date

**The card fell back. The save wrote no date.** The v2 save cleared `writerExpectedDate` and `writerExpectedSetAt` for
Unknown. The card's row (`lib/qcSummary` `expectedFor`) then asked `lib/expectedDate` `resolveExpectedDate` for a date.
With no writer statement and no reply statement, that falls to the floor: for Partial sent or Full sent, the house window
of 12 weeks from the send (v152's ruling); for Queried, the agent's stated weeks. 24 Nov + 12 weeks = 16 Feb 2027, the
date in v2.1's screen 06.

## The fix, at those two points

- **The save** (`lib/queryActions/respondStages` `planOfResponse`): "Yes, it's gone" with Unknown now writes
  `writerExpectedUnknownWrite(now)`, which stamps `writerExpectedSetAt` and clears the date. The nudge is cleared as
  before.
- **The resolver** (`lib/expectedDate` `resolveExpectedDate`): a writer stamp with no date is a statement of no date. It
  beats every fallback (the agency's window and the house window). Recency still holds: a reply the agent stated after it
  wins, and one stated before loses. **A writer's date, a reply's date, and the fallback when nothing was stated all derive
  exactly as before** (locks E2, E3).

Every surface that reads the resolver now agrees: the recorded screen's card, the Queries grid, and the query's own card.

## Locks, red before green

| Lock | Red on the unfixed tree | Green |
|---|---|---|
| unit `src/lib/expectedUnknown.test.ts` E1–E6 | E1 (Unknown lost to the window), E4's second half, E5 (Partial sent row had 16 Feb), E6 (the save stamped nothing); E2/E3 are the unchanged-behaviour guards and passed throughout | 6/6 |
| e2e `recordResponse21` P4: a partial recorded as sent with Unknown | 3 of 5: the card's box read "Reply expected by 16 Feb 2027" with a window bar, and the query's own card showed "Reply expected by 16 Feb 2027" (`ledger/P4-red-base.json`) | 5/5: "There's no reply date yet." over "Reply expected by · No date yet · No reminder set", no bar, no nudge line; the query's own card has no reply-date line (`ledger/P4-green.json`) |

## Gates

| | Baseline | Final |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `vite build` | clean | clean |
| Vitest | 941 files, 13,396 passed, 0 failed | 942 files, 13,402 passed, 0 failed (+E1–E6) |
| e2e, final tree | — | P1 30/30, P2 32/32, P3 4/4, P4 5/5; v2 V1 46/46, V2 16/16, V0 2/2, B 22/22 and 12/12 (`ledger/final/`) |

## Deploy

Dev moved during the work. Add an agent v2 deployed `dev/…-rar21-aa2` @ 57a574fc1, and building that tip gives
`index-DGzm90Vh.js`, the bundle dev was serving, so that is the line. It already contains everything above, including the
agent card work. This branch was merged into it as `dev/…-rar21-aa2-rar211` and deployed: **https://scriptally-dev.web.app,
bundle `index-B2Tm2l4_.js`**. That name was taken from a build of the same source before this commit and checked against
the served page after the deploy. Hosting only; no rules or functions.
