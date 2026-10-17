# Analytics v24.1 — "Replies due", and a request is a reply

Branch `analytics-v24-1` (worktree `../ScriptAlly-analytics-v24-1`), from the branch dev served when the pack began,
`dev/main-cl18-todo51-cl181-qc1385-an21-cl182-qc1386-db60-cl183-an24` at **`c6505699`** (`index-DYhkEY1Y.js`). Not
merged to `main`. Ref: `design-refs/analytics-v24-1/` (7 files, every hash as the prompt gives it, enrolled).

## False premises

1. **I could not open Bethany Carter's account.** The only credentials in this environment are the harness account's,
   and signing in as anyone else is not something I do. Part B is reproduced with a fixture built the same way (27
   queries; imported requests with no log rungs; three dated replies of 1, 868 and 875 days), which shows the same
   figures: **3 replies beside 9 asked to read more, and a typical of 124 wks with a 1-day quickest and a 125-wk
   longest.** That last pattern matching hers to the week is strong evidence of what is in her data (below), but it
   is inference, not a reading of her account.
2. **"Being read 9" beside "10 asked to read more" is not a contradiction.** "Being read" (`standing`) is where queries
   stand today; "asked to read more" (`outcomes`) is whether the agent ever asked, so it also counts a request that later
   ended in a pass or an offer. 10 ≥ 9 is expected. The real contradiction was "3 replies" against both.
3. **The prompt's sample split (past 9, soon 1, later 3) is the mock's**, not a fixture this repo holds. The unit tests
   assert the derivation on this repo's sample (past 9, soon 2, later 2) and on the prompt's thin case exactly (35 and 49
   days → "5 wks", 0 past, 2 later).
4. **The stamp at 1512.** The mock shows "next 14 Oct" at 1512, but at a 1512 window the app is in its compact sheet,
   and the prompt says the stamp is hidden in compact "as v24's card 3 stamp was". It shows from the full sheet (1920
   here: "next 27 Oct").

## Part B — the cause

| Figure | Derivation | Reads |
|---|---|---|
| Header "{n} replies" (v24) | `model.replies` (`analyticsModel`) | `waits.length`: items whose `replyDays` is not null, i.e. DATED first replies |
| Card 2 "{asked} of {sent}" | `outcomes` → `requestRate` | status history: `reachedRequest` / `reachedOffer` |
| "Being read" | `standing` (`analyticsV21`) | today's status bucket |
| Typical / quickest / longest (v24 card 3) | `replyKeeping` | `replyDays`, from the log's first incoming rung, else the query document's stage dates (`partialRequestedDate`, `fullRequestedDate`, `offerDate`, the rejection's date) |

- **"3 replies" against "10 of 27":** the header counted dated replies; the requests come from status. On an imported
  account the requests carry no log rungs and often no stage dates, so they were requests but not replies.
- **"124 wks typical, 1 day quickest, 125 wks longest":** with three dated replies, two of them roughly 2.4 years after
  their sends. `replyDays` checked only that a reply was not BEFORE its send. The likeliest data cause is a send date
  stored in the wrong year (a 2024 for a 2026), but I cannot see the rows.

**The fix** (`7f91a881`, `replyTally` in `lib/analyticsV24`):
- **A request is a reply:** replies = asked to read more + said no to the letter, dated or not. The header, S4's and S7's
  kickers and S7's note read it.
- **Timing figures use dated replies only:** a gap of 0 to 730 days. A reply dated before its send or more than two years
  after it is a bad date: left out of the typical, S4's rows and the ring; counted in S4's new "{n} replies have no
  reply date and are left out"; listed here, never edited.
- The model carries each item's signed first-reply gap (`replyRawDays`) so a bad date can be told from no date.
- **Bethany Carter's figures after the fix (inferred from the fixture, not read):** the header would read "27 queries,
  {asked + passes by letter} replies", never fewer than the 10; the typical would drop the two 2.4-year gaps and rest on the
  1-day reply; S4 would say how many replies have no usable date.

**Bad dates found (not edited):**

| Account | Query | Sent | Reply dated | Gap |
|---|---|---|---|---|
| harness (`The Smoke Test`) | `seed-query-11` (Kwan & Hall) | 8 Jul 2026 | 28 Jun 2026 | −10 days |

Bethany Carter's rows could not be read; on the evidence above, expect two replies about 868 and 875 days after their
sends.

## Part A — "Replies due"

`repliesDue` (`ff6efa27`) reads `stillWaiting`'s own rows, so its past count is S5's by construction. A query with a
request, an offer or an ending is never due. The card: calendar icon; stamp "next {d Mon}" (full sheet only); the big
figure is the count due within two weeks, else the time until the next, else "–" / "nothing due"; rows "{past} past their
time" (rust) and "{later} due later", zeros as "0"; the strip with the past zone, today at 22% and a dot per open query at
22% + min(days, 56)/56 × 78%. It goes to S5. The typical reply time stays as S4's third reading, from dated replies.

## Calls I made

- **Dated = 0 to 730 days** (the prompt's "more than two years after" taken as 730 days).
- **A first reply from a log rung dated before the send** now stops there as a bad date rather than falling through to the
  document's stage dates (which would usually be the same rung, also before the send).
- **AN17-16 spares card 3's two chips**, which show a zero as "0" because the prompt says so (and B2 asserts it); every
  other figure keeps the thin-sample rule. Flagged for Nick, as it is the rule's only exception on the page.
- **A query due today** reads "due today" in its dot's title and counts as soon.

## Locks

Retired readings and rewrites: `tests/e2e/RETIRED-analytics-v24-1.md`. AN24-B1's card 3 is rewritten (`checkDue`, shared
with B2, anchored on S5's own past reading and its waiting rows); AN21-A1 reads the tally; B2, R1, R2 are new.

**Red first on the base `c6505699`** (`redfirst/`): B1 6 of 18 failed (no card 3, titles, no scroll to S5) · B2 4 of 4
(no card) · R1 2 of 15 ("24 vs 21+8" on the harness account; "2 vs 0+3" on the bad-date fixture) · R2 8 of 8 (the 850-day
reply in S4's rows "took longer by 115 wks", the typical 63 wks, no "no reply date" line).

**Named mutations at `9e715911`, each red** (`mutation-proofs.jsonl`): B1 count queries with a request as due → "13+1+23+1
vs 20" · B2 show "0" when nothing is soon → "0 vs 5 wks" · R1 count replies from reply dates only → "24 vs 21+8" · R2
include it (drop the two-year cap) → the 850-day row back in S4, typical 63 wks.

**Green, one consolidated run at `9e715911`** (`green-run-9e715911.txt`), AN17-16 re-run at `6406815e` after its
exemption: AN24 A3 14 · B1 38 · B2 54 · C1 42 · R1 15 · R2 8 · S1 36 · S2 32 · S3 22 · S4 12 · S5 14 · S6 20 · U1 10 · I1
17, none failed; AN21 A1 32 · A2 30 · L1 72, none failed; AN17-15 45 · 16 25 · 18 6, none failed; AN17-17's six disc
readings fail as on every base since header v3.

**L2 (headerPanelV2, headerV3, pageHeaderV2, base `c6505699` against v24.1):** 6 failed and 13 passed on each; no reading
red on v24.1 that is not red on the base (the base had eleven more, on /manuscripts/packages and /manuscripts/comps).

## Screenshots (`shots/`)

`top-1512`, `top-1280`, `card-full-{1512,1280}` (the harness account) beside the ref's `top-*` and `card-full-*`;
`card-thin-{1512,1280}` (two queries due in 35 and 49 days) beside `card-thin-*`; `card-nothing-due-{1512,1280}`.

## For Nick

- **Bethany Carter, corrected:** I could not sign in to read it (see false premise 1). On the fixture that reproduces her
  numbers, the header goes from "3 replies" to asked + passes by letter, and the 124-week typical goes away. Worth looking
  at her two oldest-looking replies: their send dates are probably in the wrong year.
- **The harness account's `repliesDue`:** 13 past · 1 due within two weeks (Curtis Vane, 27 Oct) · 5 later. Its header
  now reads "51 queries, 29 replies" (21 asked + 8 by letter; 24 dated, 5 without a usable date, one of them the bad date
  above).
- **Waiting queries with no stated time:** 1 of 20 on the harness account (counted, not drawn).
- **The "0" chips** on Replies due are the one place the page shows a bare zero; say if you want "None" there instead.

## Integration and dev

- **Dev moved during the pack.** It served `index-DYhkEY1Y.js` (`c6505699`) at the start and `index-BfyN6LLe.js` at the end,
  which is `origin/contact-list-v18-3-1` at `ab86ac14` (Contact list v18.3.1 on the v24 dev branch; confirmed by building
  it). The local `contact-list-v18-3-1` worktree is ahead at `8065c128` with uncommitted work: another session's, not
  touched and not deployed.
- **Integration branch:** `dev/main-cl18-todo51-cl181-qc1385-an21-cl182-qc1386-db60-cl183-an24-cl1831-an241` at
  `87cec57e` = `ab86ac14` + `analytics-v24-1`, a clean merge. Gates there: tsc clean, production build clean, 9010 unit
  tests passed. AN24 and AN21 green on its local build.
- **Dev now serves `index-D7Qn07nQ.js`**, deployed (hosting only) from a clean worktree at the pushed tip after re-checking
  the served hash. AN24-B1 green against the deployed site. Nothing merged to `main`; prod untouched; no rules or
  functions changed.
- **One clean-up scare, resolved:** the integration run's fixture restore was refused by Firebase ("Exceeded quota for
  verifying passwords") after a long run of sign-ins; it succeeded on the third retry a minute apart. No seeded
  manuscript, query, log entry or agent is left on the harness account.
