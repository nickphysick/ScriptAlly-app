# To-do card thread v1: the card the To-do desk opens draws its own query's thread, live

A follow-up to Query card v160 (its report, §1.8 and §9.1), at Nick's go-ahead. Branch `todo-card-thread-v1`, cut from
`query-card-v160` @ 343976d1c, which dev served.

## The bug

`Queries.tsx` keeps one live listener on a query's `activity` subcollection. Every reader of the events
(`trackingEvents`) pairs them with `activeQuery`, the query the open card describes:
- the card's thread (`buildCardView`);
- the record view's rail;
- the step editor's diff;
- the nudge round;
- the move sheet.

The card's query is `cardQueryId = extPanel?.id ?? beCard ?? selectedQueryId`: the shared panel's query, else Birds-eye's,
else the Query Centre's selected row. The listener followed `selectedQueryId` only. So a card opened from another page
(the To-do desk opens the shared panel), or from Birds-eye, was drawn from another query's activity, or from none. The
result was a short thread ("You sent … your query" only), and a save's new step was never drawn, though it was written.

Measured on `query-card-v160` and on its base, 987e479ec, before this fix: every one of the three To-do tasks' cards
read showed one step where the Query Centre showed two to four.

## The fix

One change, in `src/components/Queries.tsx`. The listener is keyed on `cardQueryId` and declared after it; reading
`cardQueryId` above its declaration would be a TDZ crash, which tsc cannot see. A change of query empties the events
first, so no frame draws one query's log on another's card. With no panel and no Birds-eye card, `cardQueryId` is
`selectedQueryId`, so the Query Centre's own behaviour is unchanged.

## Locks

| Lock | Before (query-card-v160) | After |
|---|---|---|
| TCT-1: a card opened from the To-do desk draws the Query Centre's thread for that query (3 queries) | red: To-do 1 step against 3, 4 and 2 | green: identical on all three |
| TCT-2: a save from the To-do desk's card writes one step, draws it, the draft settles into the same element, and Undo restores the data and the thread (q152-rr) | red: written 4 → 5, drawn 1 → 1, the draft element dropped | green |
| `src/components/queries/tct1.test.ts`: one listener, keyed on `cardQueryId`, declared after it, emptied first | red on the unfixed file | green |

`queryCentreChassis.test.ts`'s "the timeline is fed from the activity feed" still holds: the events are still named
`events` from the snapshot.

All 13 v160 tests were run on the fix together with TCT-1/2. QC160-9 and -12 read red in that run: a leaving toast
was still at 0.73 opacity 466ms in, and a fold had frozen part-way. That run took 22 minutes against the usual 7,
because I had the full Vitest suite running at the same time. Run alone on the same build, both are green (3 passed);
every other v160 lock was green in the shared run.

## Gates

| Gate | Before (343976d1c) | After |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| Vitest | 12896 passed, 2 failed | 12899 passed, the same 2 failed |
| `vite build` and `--mode development` | clean | clean |

The 2 failures are the existing `firestoreTarget` ones.

## Dev

https://scriptally-dev.web.app serves `index-DH0PUdVK.js`, built from d9058017c on a clean checkout of the pushed tip.
Before this deploy dev served `index-BBv9y05U.js` (Query card v160).

## Not done

Birds-eye's card (`beCard`) gets the same fix through the same key, but no lock was written for it.
