# Rules budget v1: an update to a full query is allowed again

Branch `rules-budget-v1`, cut from `controls-entry-v1` 4ab6ea7cf. It is not merged, nothing was deployed to hosting, and prod is untouched.

| Commit | What it does |
|---|---|
| 4e6938e6b | Phase 1: a query update checks only the keys it changes |
| e726bb108 | Phase 2: proof that nothing got looser |
| (this commit) | Phase 3: proof of the fix, the counts, this report, the combined prod diff |

**Dev rules are deployed** from a new dev-line branch, `dev/…-laqdoor-fw11-cj1-rb1` (161398655).
- That file is a three-way merge of the rules dev already ran with this branch's query rule; see "Dev deploy" below.
- Release `cloud.firestore` on the `(default)` database moved from ruleset 5294dad5 (feed-wording's, 20:34:09Z) to **72eb5661 at 21:58:31Z**, 24 Nov 2026.

## False premises first

1. **"The emulator denies it, real Firestore may count differently." Real dev Firestore denies it too, from the same field.** Before this change, on dev:
   - creating a query with every field was denied;
   - building one up a field at a time was denied at the 17th optional field (`rrNotes`), exactly where the emulator stops.
   - Ledger: [live-before.json](ledger/live-before.json).
   - Any real query with about 17 optional fields could not be updated: no reminder, no status change, no undo. The app's own partial-request reply step writes 29 keys, so it took a query over that line by itself. It was denied even on a small query (see 6).
2. **"65 optional fields." There are 66.** The clause pattern used by close-out 4's measure (and first by this branch) missed `agentRecheckOn`, the last clause, which ends in `;`.
   - In this branch's first draft that left `agentRecheckOn` unchecked on update.
   - It was caught before commit by a cross-check in the generator. The test now counts the clauses two ways: the pattern, and every `data.get(` in the function.
3. **"The baseline is flaky because of the limit." Only partly.** All three baseline runs failed (7, 5 and 8 failures, a different set each time). Two causes:
   - The limit: 17–21 limit messages per run.
   - Test isolation: `agentReply.rules.test.ts` and `queryActions.rules.test.ts` shared the emulator project `demo-scriptally-qa`. The two files run in parallel, so each one's `clearFirestore` wiped the other's seeds (13–19 "Property … is undefined" errors per run).
   - Phase 2 gives `agentReply` its own project.
4. **"Create validates every field, as now," and that is fine. It is not fine for a full query: create is over the limit too.**
   - Creating a query with all 66 optional fields is denied, before and after this branch, in the emulator and on real dev.
   - The brief keeps create as it is, so it is unchanged here. It goes to its own prompt.
   - Today it bites only a create that carries most fields at once. None of the app's creates do (`addQuery` mints new ids).
5. **"A field that is not changing was valid when it was written." Not guaranteed.** A query written by an older, looser rule, or by the admin SDK with rules off, can hold a value today's `isValidQuery` would refuse.
   - Before this branch, such a query could not be updated at all.
   - Now it can be, as long as the update leaves that field alone.
   - This is the baked decision, and it is the one thing the new rule allows that the old one denied. Every changed field is held exactly as tightly as before.
6. **The app's widest writes are wider than the limit allowed, at any query size.** Every query-document writer in `src/` was traced (read only).
   - The widest single update is the reply step of `planOfResponse` for a partial request: 29 keys (16 response details, recomputeQuery's 10, and 3 request keys).
   - The old rule denied it even on a small query, because the result holds 29+ fields. The emulator confirms this ("SMALL var-old: widest alone DENIED").
   - Next widest: deleting every timeline entry (28 cleared) and a response or close (26).
   - Three writes put a whole query back (`restoreSnapshot`, `restoreAgentSnapshot`, `refusedMarks`).
7. **⚠️ One write the app sends is still denied: the reply step and the send step, as two updates to the same query in one batch** (`planOfResponse` → `commitMany`, about 34 keys between them).
   - It is denied before and after this branch, on a small query and a full one, so it is not a regression.
   - Making it pass would need either cheaper rules than measured here or the app to split the batch, and app code is out of scope. **STOP item; see "Still denied".**
8. **The test slot kills queued jobs.** When a job takes the slot, its sweep treats every process matching `firebase emulators:exec` as a leftover. That includes another session's `emu-guard` that is still waiting in the queue (`scripts/hooks/slot-core.mjs` `leftovers()`).
   - Four of my queued runs died this way (exit 143).
   - I waited for a free slot before each run instead. I didn't fix it here; it is out of scope.

## Step 0: recon

1. **Reproduced in the emulator** with [the measure](../../tests/rules/queryExprCount.test.ts) (`SA_EXPR_COUNT=1`).
   - An update to a query with all optional fields present: denied, "maximum of 1000 expressions" @ the update rule.
   - The smallest number of present optional fields that fails: **17 in rule order (`rrNotes`), 18 reversed (`basedOnPackageEdition`)**. It is deterministic, and nothing is allowed again above it.
   - Ledger: [before/expr-count.json](ledger/before/expr-count.json).
2. **Real dev Firestore**, using a test query the probe creates and deletes ([rulesBudgetLive.mjs](../../tests/e2e/rulesBudgetLive.mjs)): **denied**.
   - The full create is denied.
   - Built up one field per update, it is denied at **17 (`rrNotes`)**, the same as the emulator.
   - The test query was deleted and its absence confirmed.
3. **Where the cost is.** From close-out 4's `expr-count.json`, re-measured here:
   - `isValidQuery` is 1,531 of 1,603 coverage units on the smallest update: **95.5%**.
   - The update allowlist is 23.
   - Heaviest lines:
     - the required-field `&&` chain (L465): 141;
     - `materialsRequestedQuantity` (four type tests): 38;
     - `materialsWanted`: 32;
     - the 12-way `status` chain: 26;
     - every other optional clause: about 24 each, **present or not**.
   - Variant runs added later (below) show that, once the cost follows the keys, **the per-field checks are all of it**. Dropping the allowlist changes nothing. Dropping the field checks removes the limit entirely.
4. **Every rule that calls `isValidQuery`:** two, both on `users/{uid}/queries/{queryId}`.
   - `allow create` (L1107): still calls it, unchanged.
   - `allow update` (L1115): no longer calls it.
   - No feed rule calls it, so the feed rules are untouched.

## Phase 1: what changed in the rule

- **Create:** `isValidQuery` runs whole, unchanged.
- **Update:** the allowlist `incoming().diff(existing()).affectedKeys().hasOnly([...])` is unchanged, character for character. After it, `isValidQueryUpdate(incoming(), incoming().diff(existing()), userId)` runs:
  - **An optional key is checked only when the update writes it**: added, or given a new value, `null` included.
    - Removing an optional key was always allowed (`get(f, null) == null`), so a removal needs no check.
    - A removal was also the dearest check: the value test errors before the null test lets it through.
  - **A required key is checked whenever it is affected**, so removing one is still denied.
  - Each check is `isValidQuery`'s own, with the value tested first and the null test second: `(<check> || data.get(f, null) == null)`.
    - A present valid value never pays for the `get`.
    - For a null or deleted value, the outcome is the same as before.
  - **The heaviest clauses, as their own functions:**
    - `isValidQueryStatus` and `isValidQuerySendMethod` are one `in` over exactly the values `isValidQuery` chains with `==` (a test asserts the lists are equal);
    - `isValidQueryMaterialsQuantity` drops `is int || is float`, since `is number` already covers them;
    - `isValidQueryMaterialsWanted` is unchanged.
  - **Nine groups, each gated on `changed.hasAny(<its keys>)`**, so an update pays only for the groups it touches:
    - recomputeQuery's ten;
    - a response's details;
    - what was asked for;
    - the reminder;
    - the writer's expected date;
    - what was sent;
    - the offer marks;
    - the query's own edits;
    - the rest.
  - The groups follow the app's own writes, so a wide write wastes few gates. Fixed-size groups of 9 held 24–25 changed keys; these hold the app's 29-key write.

How the shape was found, every step measured by threshold in the emulator (the largest number of changed keys an update can make):

| Version | Changed keys that fit | 29-key reply step |
|---|---|---|
| Old rule | 0 on a query past ~17 fields | denied |
| Gated per key | 18 | — |
| + one diff, fixed groups of 9 | 24 | — |
| + value first | 33 | denied (28 of its keys fit) |
| + `in` enums | 34–36 | denied |
| + groups that follow the app's writes | 28–30 in rule order | **allowed** |
| + removals skipped (final) | 28 in rule order; every app write allowed | **allowed** |

Two ideas changed nothing: a cheaper presence test (`'x' in data`, or the removed-keys set), and binding `data` once with `let`. The full-row "every field changed" rewrite (60 keys) is still denied. The app never sends it: its widest is 29.

## Phase 2: nothing got looser

[queryUpdateBudget.test.ts](../../tests/rules/queryUpdateBudget.test.ts): 298 cases.

Every case runs against **"before"**, the old update rule rebuilt from the file by two substitutions that must each match exactly once, and **"after"**, the file as it is, each in its own emulator project.

On a small query, both rule sets give the same answer for every write:
- **66 optional fields:** a valid value is allowed (the control), and 2–4 invalid values each are denied (wrong type, and just past each bound: size, range, enum, list length).
- **The 5 required fields an update may change:** invalid values and removal are denied.
- **Removing or nulling every optional field** is allowed, before and after, and on the fullest query after.
- **Outside the allowlist** (`id`, `userId`, an unknown key, a nested-map key): denied, alone and beside a valid change.
- **Create:** any invalid field, a missing required field, or another writer's `userId` is denied; required fields only is allowed.

On the fullest query, after only (before denies every update to it):
- every invalid value is still denied;
- the reminder update is allowed, and before denied it (asserted);
- the app's widest writes are allowed;
- the undo that puts the query back whole is allowed.

Text locks:
- every changed key meets `isValidQuery`'s own check;
- every group's `hasAny` list equals the keys gated inside it, covering all 73;
- required keys are gated on any change, optional keys on a write;
- the clause count is 66, counted two ways.

The populations are asserted non-empty: 66 fields, each with at least 2 invalid values; 5 required fields; at least 2 groups.

## Phase 3: the fix, proved

- **The Step 0 write.** The update to a query with every optional field present:
  - Emulator: allowed (it was denied).
  - Real dev, after the deploy: **allowed** ([live-after.json](ledger/live-after.json)).
    - All 66 optional fields were added one per update with no denial (before: denied at 17).
    - The reminder update on the full query: allowed.
    - The 29-key reply step on the full query: allowed.
    - The test query was deleted.
- **The rules suite: three runs after the change, identical.** Baseline and after, side by side:

| Run | Baseline (before) | After |
|---|---|---|
| 1 | 7 failed / 266 passed / 9 skipped | **0 failed / 572 passed / 12 skipped** |
| 2 | 5 failed / 268 passed / 11 skipped | **0 failed / 572 passed / 12 skipped** |
| 3 | 8 failed / 265 passed / 11 skipped | **0 failed / 572 passed / 12 skipped** |

  The failures differed each baseline run, all in `agentReply` and `queryActions`.

- **The counts, after** ([after/expr-count.json](ledger/after/expr-count.json)):

| Update | Fields on the query | Changed keys | Before | After |
|---|---|---|---|---|
| The reminder (Step 0's write) | 73 (full) | 2 | denied | allowed |
| One field (`rrNotes`) | 73 | 1 | denied | allowed |
| recomputeQuery's patch | 73 | 10 | denied | allowed |
| **Worst the app sends alone: `planOfResponse` reply step, partial request** | 73 | **29** | denied, even on a small query | **allowed** (emulator and real dev) |
| Deleting every timeline entry | 73 | 28 cleared | denied | allowed |
| The undo that puts the query back whole | 73 | 29 | denied | allowed |
| Reply and send steps in one batch | any | about 34 | denied | **still denied** |
| Every optional field changed at once (no app write does this) | 73 | 60 | denied | denied |

  - **Headroom:** in rule order, an update may change up to 28 keys spread across the groups. The threshold no longer depends on how many fields the query holds.
  - **Coverage units** (the emulator's per-expression counts): 1,603 → 1,807 for a two-key update, 1,811 for recomputeQuery's patch. They are not the limit's unit: they rose while the limit stopped being hit, and they barely move with the number of keys changed. So the threshold above is the real measure.
- **Emulator denial messages.** A denial in this suite prints "maximum of 1000" followed by "false" for the same rule. A one-line rule denying one wrong-typed value also prints two passes (an evaluation error, then "false"). So it is the emulator's two-pass report, not the limit deciding. The value check decides: the matching valid write is allowed.
- **Gates (final tree):**
  - tsc: 0 errors.
  - Build: clean.
  - Vitest: 951 files, 13,492 tests passed, 4 skipped (baseline: the same).
  - The 34 Vitest source tests that read `firestore.rules`: 525 passed.
- **Earlier red, now fixed.** One full run on an intermediate draft was red: `src/lib/packageLinkRule.test.ts` reads the allowlist literal from the match block, and that draft had moved it into a function. I reverted my edit to that `src` test and kept the allowlist in place, which is also the smaller diff.

## Still denied (own prompt)

1. **The reply and send steps of `planOfResponse` in one `commitMany` batch.**
   - Both updates go to the same query document, about 34 keys between them.
   - Denied before and after, on a small query and a full one.
   - Fixing it needs one of:
     - the app to split the batch (or merge the two patches so a key is written once): **app code, so STOP here, as the brief says**;
     - a rule with roughly twice the headroom, which no shape measured here reaches.
2. **Creating a query with every field** (create is unchanged by the brief).

## Dev deploy

Dev was not running this branch's base:
- A live probe showed a feed row with `subjectName` was accepted: feed-wording's additions, deployed 20:34Z from `8a26b1f3e` ("one rules file for dev").
- The newest dev line, `…-fw11-cj1`, has that same rules blob.

Deploying this branch's file alone would have removed feed wording's 28 lines, so instead:
- `firestore.rules` = a three-way merge with no conflicts: base controls-entry-v1 4ab6ea7cf, ours rules-budget-v1 e726bb108, theirs the dev file.
  - Against what dev ran: +130 / −2, the two lines of the update rule.
  - Against this branch: exactly feed wording's 28 lines, nothing removed.
- It is committed with the Phase 2 test on `dev/…-laqdoor-fw11-cj1-rb1` (161398655), pushed, and deployed from a `git archive` of the pushed tip.
- Checks: before the deploy, `grep` for the new functions and for `subjectName`. After it, the release `updateTime` under `--debug`, then `rulesProbe.mjs`.
  - No query or nested-activity line moved.
  - The lines that read oddly are pre-existing and outside this change: the heal step with the app's id (an `isValidId` denial on an activity) and two package refusals that are accepted (the package rules, which neither side touched).
- **Hosting:** not deployed.

## Prod rules

[rules-prod.diff](rules-prod.diff) covers controls-entry-v1 and this branch together (`git diff f3659638d rules-budget-v1 -- firestore.rules`, +151 / −7). It **replaces** `reports/controls-entry-v1/rules-prod.diff`, which is removed in this commit.
- ⚠️ As before, prod's `release/live-1` rules are about 210 lines behind the dev line. This goes on top of the rest of the dev line's rules work.
- ⚠️ Feed wording's own rules lines are on feed-wording's branch, not in this diff.
- Prod rules are Nick's.

## Files

- `firestore.rules`: Phase 1.
- `tests/rules/queryUpdateBudget.test.ts`: Phase 2. `tests/rules/agentReply.rules.test.ts`: its own project.
- `tests/rules/queryExprCount.test.ts` (skipped unless `SA_EXPR_COUNT=1`):
  - new cases: create fullest, every field changed, recomputeQuery's patch, one field, the changed-keys threshold;
  - the per-area breakdown follows the new functions;
  - `SA_EXPR_LEDGER` picks the ledger folder;
  - the clause pattern now reads all 66.
- `tests/e2e/rulesBudgetLive.mjs`: the real-dev probe (`ALLOW_LIVE_FIRESTORE=1`, dev only, creates and deletes one test query).
- `ledger/`: before and after counts, live before and after.
- The raw run logs (2.3 MB) are kept out of the public repo, in `~/ScriptAlly-backups/rules-budget-v1-logs/`.
