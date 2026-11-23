# Search standing B1 — an agent row speaks for the agent's standing query

23 Nov 2026 · branch `search-standing-b1`, cut from what dev served (`dev/…-mg1-pc3-laq22-qc168` @ `93fb01e24`, `index-CrH8OKjv.js`) · option B1 from `reports/search-recon-v1/REPORT.md` §4 · not merged to `main`.

## 0. False premises

- **None in the brief.** One note: B1 does not change what search says for Noah Bright on the default book. He still reads "Not queried" there, because his only query is on another manuscript. That is the parked other-book case, as the brief expected.

## 1. What changed

- **`src/lib/searchPalette.ts` (`buildCorpus`)**
  - *Before:* the first query loaded on the book in hand spoke for the agent.
  - *Now:* the agent's queries on that book go to `standingQuery`, the Contact list's rule: the furthest-along live query, else the latest close.
  - That one query drives the row's chip, its peek, and "Open the query" (its `queryId`).
  - The first-in-order loop is deleted.
- **`src/lib/contactList.ts`:** `standingQuery`'s parameter is now generic over the three fields it reads (`court`, `status`, `lastMs`). Its body and its three existing callers are unchanged. It is still one rule, stated once (not B2).
- **`src/lib/searchSources.ts`:** the row facts search already receives now carry `lastMs` (the Query Centre row's own), so standingQuery's "latest close" uses the real date.
  - `QueryRowFacts.lastMs` is added in `searchPalette.ts`.
  - The `searchSources.test.ts` fixture gains `lastMs: 0`.

## 2. Locks (`src/lib/searchPalette.test.ts`, "an agent row's query is the agent's standing query (B1)")

| Lock | Asserts | Red first against today's first-in-order loop |
|---|---|---|
| B1-1 | Rejected then Queried → the row, its peek and "Open the query" all name the Queried one (`q2`) | red: received Rejected / `q1` |
| B1-2 | Partial Sent and Full Sent → Full Sent, opening `q2` | red: received Partial Sent / `q1` |
| B1-3 | both pairs reversed give the same result, still `q2` | red: the order changed the answer |

All three were run on the base tree with only the test file added: **3 failed**. On the fix: **3 passed**.

## 3. Seed check — the recon's table, re-run on the fix

`bothPaths.ts` is the recon's script, pointed here; its output is `both-paths.json`.

| Shell's book | Search ≠ Contact list (class B), before | after | "Not queried" while the QC shows cards (class A, parked) |
|---|---|---|---|
| none stored → Murphy's Day Out | 0 | 0 | 34 (unchanged) |
| The Smoke Test | **7** | **0** | 24 (unchanged) |
| The Quiet Fixture | **1** | **0** | 44 (unchanged) |
| the other four books | 0 | 0 | unchanged |

Tom Ellery, Joan Whitfield and David Marsh on *The Smoke Test* no longer show "Rejected". They show their live query, and "Open the query" opens it. The script runs without the row facts (so `lastMs` is 0). That only matters when every query is closed, where none of the eight were.

## 4. Gates — no worse than baseline

| Gate | Baseline (`93fb01e24`) | After |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors (my first run flagged three type errors in this folder's `bothPaths.ts`, which `tsc` covers; fixed with casts) |
| `npm run build:dev` | — | clean (no error or warning lines) |
| Vitest, full | 13,318 passed, 0 failed | 13,317 passed, 1 failed: `calendarRetired.test.ts` L3, a 5 s timeout on its source scan under load, not an assertion. Alone: 7/7 passed |
| Touched files (searchPalette, searchSources, searchV1.locks, contactList, agentCard, searchFold) | — | 144/144 |

The baseline Vitest run began while the locks were being written, so it may have collected the new test file. Either way, it had 0 failures. No emulator or e2e run was needed: the change is in pure functions, and the locks cover it. **Not measured in a browser.**

## 5. Deploy

- Dev served `index-CrH8OKjv.js` (`…-pc3-laq22-qc168` @ `93fb01e24`), checked by the deploy's own `|| exit` guard.
- Deployed `b22c1bc7d` (also pushed as `dev/…-pc3-laq22-qc168-sb1`) from a clean detached checkout of the pushed tip.
- Built and served: **`index-k1Jk5tzr.js`**, matched.
- To back it out, redeploy `…-pc3-laq22-qc168` @ `93fb01e24`.

## 6. Not merged, not built

- `tests/e2e/searchRecon.measure.ts` stays on `search-recon-v1` only. It asserts "Not queried" for Noah on the default book, which is still expected under B1 alone.
- A1–A4 are not built.

## Parked

- Search and other books (A1 to A4): decide when multiple manuscripts are built → `reports/search-recon-v1/REPORT.md` §4.
