# Tier 1 — data correctness · run report (4 Aug 2026)

Five defects from `reports/app-audit.md` (4 Aug), worked directly on `main`, one commit per phase, gates green per commit. UK spelling. No deploys of any kind; the run ends with a push to `origin/main` because CI is the only executor of the Phase 5 rules suites.

## Step 0 — baseline and recon

**Baseline.** Start commit `4586c98` (`feat(todo): tightening P4`) on `main`. Tree clean apart from the untracked `reports/app-audit.md` — this brief's own evidence file, deliberately untracked by the audit's instructions; no tracked dirt, no live concurrent session (the to-do stream that was committing during the 4 Aug audit had finished and gone quiet). Gates on clean HEAD, the clean-tree baseline the audit never obtained:

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | exit 0, zero errors |
| `npx vite build` | exit 0 (the standing >500 kB chunk warning only) |
| `npx vitest run` | **exit 0 — 137 files, 2187 passed \| 2 skipped** |

The audit's red vitest (5 failures) is thereby confirmed as entirely WIP-induced: at the committed tree the suite is green.

**Recon 0.4 — `responseReceivedAt`.** Writers (3): `recordResponse.ts:241` (stamped on *every* recording, including reversion-to-Queried — which stamped a response date onto an un-response, itself bogus data), the undo revert `recordResponse.ts:369`, and the auto-close `db.tsx:1959`. Rules: in the queries update allowlist (`firestore.rules:554`); the validator accepts timestamp **or string** (`firestore.rules:296`), so a derived ISO write is valid. Readers, all coercion-helper + fallback-chain (none type-fragile, none absence-fragile): `Dashboard.tsx:835/849/864/883/901/918`, `Queries.tsx:1431`, `dashboard/WhatsLivePanel.tsx:74`, `dashboard/fortnightEvents.ts:239`, `dashboardStats.ts:149` (checks `lastStatusChange` first), `manuscriptPage.ts:92`, backfill heal `db.tsx:883/914`; plus the type at `types.ts:367` and one test asserting the stamp (`recordResponse.test.ts:97`, flipped in Phase 2). **Safety call: no consumer made the baked decision unsafe.** Two consequences accepted with eyes open: (a) semantics move from "latest recording" to "first agent action" — Dashboard's current-status event rows check this field before `lastStatusChange`, so a multi-stage query's event can date at its first response; (b) `NO_RESPONSE` auto-closes stop carrying a response date (they are not responses) — the fortnight close event falls back to `lastStatusChange`, which the auto-close still stamps. The decisive enabler: the user-editable `dateReceived` already drives the activity's `createdAt` (`recordResponse.ts:282-283`), so derivation preserves user-chosen dates.

**Recon 0.5 — `committedDate` post-create updates: YES.** `db.tsx:2171-2185` `updateUserTask` patches it (`null` → `deleteField()`); callers `ToDoPage.tsx:666` (`toggleToday` on stored tasks) and `FocusFlow.tsx:1161` (Sunday review seeding Monday's list). The tasks update allowlist (`firestore.rules`, tasks match block) omits it → every such update denied, and silently: `updateUserTask` catches via `handleFirestoreError` without rethrowing, and the optimistic patch rolls back on the next snapshot. Derived-task commits are unaffected (`upsertTaskFlag` full-doc `setDoc`; the taskFlags closed shape includes `committedDate`). **Branch: live silent-denial bug → allowlist addition** … which was then blocked (see Phase 3).

**Recon 0.6 — `lastCheckedDate` readers.** One real display consumer: the Agent-list closed-stamp fallback (`agentList.ts:491-503` — newest door-closing activity, else `lastCheckedDate`). `discoverAgents.ts:285-293` reads it on **community** records, which never pass through `updateAgent` — unaffected. **No task-surfacing or staleness rule reads it.** Everything else is creation-site writes, seeds, fixtures, or the drawer-lab mock. Verdict: safe; the one visible change is honest ageing (below).

## Phase 1 — `runTimelineCleanup` deleted (`2e8fa5c`)

Deleted `Queries.tsx:698-787` wholesale — the `localStorage('timelineCleanupV3')`-guarded one-shot that ran for every user on Queries mount: it deleted Store-A activity docs whose `type` was not a `QueryStatus` value, deleted same-type duplicates keeping the newest, and inserted a retrospective `PARTIAL_REQUESTED` rung hardcoded to `'Murphy Wurph'` / `"Bethus' Beautiful Peonies"`. Also removed the five imports only it consumed (`getDocs`, `deleteDoc`, `addDoc`, `where`, `serverTimestamp` — each verified single-use inside the block). No replacement.

**The nudge-data note (as instructed, recorded not repaired):** the type filter's "not a QueryStatus" test also matched legitimate non-status rows in the same store — most concretely `logNudge`'s `NUDGE_SENT` entries (`type: "Nudge sent"`). On any browser where the V3 sweep ran while nudge rows existed, that historical nudge-log data is already gone. The query-doc fields (`nudgeDate`, `lastNudgeSentDate`) survive, but the timeline rows and `reconcileNudge`'s ability to re-derive from remaining rows do not. No repair attempted.

## Phase 2 — `responseReceivedAt` derived (`7f9fa85`)

- `queryDerivation.ts`: new `deriveResponseReceivedAt` — the earliest incoming-direction rung (`AGENT_RESPONSE_STATUSES`, the existing classification; nothing invented), returned as ISO. `null` when no incoming rung exists **or when the earliest incoming rung is date-provisional** — an imported rung's `createdAt` is an ordering key, not a date, and writing it out would mint a fabricated response date; `hasAgentResponded` still derives true, so "responded, date unknown" is the stored truth. (`DerivableActivity` gains an optional `dateProvisional`; `orderedStatusBearing` carries the flag through.) This provisional guard is an interpretive extension of the brief's "same pattern as the provisional stage dates" — flagged here deliberately; removing it is one line if the plainer reading was intended.
- `recomputeQuery.ts`: the field joins the single `updateDoc` as the eighth derived field (`?? deleteField()`); `subcollectionDocToDerivable` carries `dateProvisional` (only when set, keeping the adapter's exact-equality tests intact).
- Stamps removed: `recordResponse.ts` primary write (comment now states the derivation; `lastStatusChange` stays as the direct audit stamp), its undo revert (undo deletes the rung, the recompute self-corrects), and the auto-close (`db.tsx` — keeps stamping `lastStatusChange` only).
- The `db.tsx:1934` TODO is rewritten to name the true remainder: **`lastStatusChange` is still stamped inconsistently** (recordQueryResponse and the auto-close stamp it; manual `updateQueryStatus` never does). `responseReceivedAt` no longer belongs on that list.
- Rules: `responseReceivedAt` confirmed present in the queries update allowlist — recomputeQuery's client write passes.
- Tests: six derivation cases (absent / single / earliest-not-latest / undo / provisional-earliest / provisional-later-harmless), recompute payload cases including the provisional `deleteField`, flipped `recordResponse` assertions (stamp gone from the primary write and the undo revert; `lastStatusChange` asserted present), and a **single-writer sweep** over `src/` locking the `responseReceivedAt:` write key to exactly `{queryDerivation.ts, recomputeQuery.ts}`.
- No migration, per the bake: existing queries heal on their next recompute (every mutation path ends in one).

## Phase 3 — `committedDate`: the branch actually taken (`77d2c22`)

Recon proved branch A (live bug → allowlist addition). **The specified fix could not land within the baked constraints**, and this is the one deviation of the run: `todoNotesTasks.test.ts:121` pins the *exact* current update-allowlist string (`hasOnly(['text', 'detail', 'done', 'completedAt', 'updatedAt', 'dueDate', 'surfaceOffset'])`) as a `toContain` artefact lock — and that file lives in `src/components/todo/**`, which this brief bakes as untouchable. Appending `committedDate` reds that lock → red gate → no commit; keeping the pinned line and adding a second OR'd `hasOnly` branch to sneak the field past the lock would be an improvised variant of the fix (and a trap for future combined updates), which the brief bans.

What landed instead: the silent denial is documented at the exact line in `firestore.rules` (comment-only — the pinned string is untouched), naming the callers, the mechanism, the one-line fix, and the lock that blocks it. The Phase 3 rules-test coverage was authored in Phase 5, as the brief permits — as a loudly-named `[KNOWN BUG]` `assertFails` that locks today's behaviour and is flagged to flip to `assertSucceeds` in the same commit that lands both halves. **The unblock is a two-file, one-commit change for whoever owns the todo directory:** append `'committedDate'` to the tasks update `hasOnly` list in `firestore.rules`, amend the pinned string in `todoNotesTasks.test.ts:121`, and flip the `[KNOWN BUG]` rules test.

## Phase 4 — `lastCheckedDate` means last verified (`c13e228`)

- The implicit stamp removed from `updateAgent` (`db.tsx`) — the function body now never mentions the field (comment stating the rule sits above the function, outside the artefact lock's slice).
- `commitAgentEdits`' abstention is now the rule, not the exception — its comment rewritten to say so.
- Creation keeps its stamp (`addAgent`); the semantic is documented on the `Agent` type. No "mark as checked" UI — Tier 2.
- Locks (`src/lib/agentLastChecked.test.ts`, anchored slices per the string-spec law): updateAgent's body mention-free; addAgent still stamps; `commitAgentEdits` carries no write key.
- **Visible behaviour change, as anticipated:** the Agent-list closed-stamp fallback now ages honestly — a closed agent edited recently shows its true last verification (usually creation/import) rather than looking freshly checked. Housekeeping fills (`hkSave` → `updateAgent`) likewise no longer refresh it.

## Phase 5 — rules suites for the uncovered collections (`af18236`)

Four describes in `tests/rules/firestore.rules.test.ts`, matching the file's structure and depth (~35 tests): **notes** (colour enum, closed shape, update allowlist, the documented absent-`dueDate`-key denial — the `== null` pattern errors on absent keys, which is why the app always writes the key), **tasks** (create shape incl. `committedDate`/`surfaceOffset` constraints, update allowlist, the `[KNOWN BUG]` committedDate denial, record-scope create-only), **taskFlags** (closed shape, bounds, the full-overwrite upsert path committing `committedDate` successfully — the working counterpart to the tasks bug), **genreSuggestions** (own-userId create, closed shape, 64-char caps, admin-only read/update/delete including the creator-cannot-read-back privacy property).

**Gating:** not run locally — impossible, not skipped: the emulator requires a Java runtime this machine lacks (verified: `java -version` fails). Statically verified: the suites type-check under the ordinary `tsc` gate (tsconfig has no `include`, so `tests/` is covered) and `vitest.config.rules.ts`'s glob (`tests/rules/**/*.test.ts`) picks the file up. CI (`.github/workflows/ci.yml`, Java 21, `npm run test:rules`) executes them — **the rules suites are unverified until that CI run is green.**

## Gate results per commit

| Commit | Phase | tsc | build | vitest (local) |
|---|---|---|---|---|
| `4586c98` (baseline) | — | 0 errors | pass | 137 files · 2187 \| 2 skipped |
| `2e8fa5c` | 1 | 0 | pass | 137 · 2187 \| 2 |
| `7f9fa85` | 2 | 0 | pass | 137 · **2196** \| 2 (+9) |
| `77d2c22` | 3 | 0 | pass | 137 · 2196 \| 2 |
| `c13e228` | 4 | 0 | pass | **138** · **2199** \| 2 (+3) |
| `af18236` | 5 | 0 | pass | 138 · 2199 \| 2 (rules suites are CI-only) |
| report commit | 6 | run before commit | run | run |

## Contradictions / refinements vs the audit

1. **No contradictions found** — all five phase premises held exactly as the audit stated (cleanup block location, the three stamp sites, the TODO, the allowlist gap, the two `lastCheckedDate` policies, the four uncovered collections).
2. Refinements the audit left open, now closed: the audit's §4.28 ("whether any client update writes `committedDate` was not traced") — traced, yes, two callers; the audit's inference that the suite was green at committed HEAD — confirmed with a clean-tree run.
3. One nuance the audit under-stated: `recordQueryResponse` stamped `responseReceivedAt` even on reversion-to-Queried, i.e. un-responding stamped a response date. Derivation removes that class of error entirely.

## Push

Pushed `origin/main` after the report commit (deliberate, baked: CI is the sole executor of the Phase 5 suites; a push, not a deploy — no `firebase` command ran at any point in this session). The push also publishes the to-do stream's tightening P1–P4 commits, which were already on local `main` ahead of origin. CI must be green before this work is trusted.
