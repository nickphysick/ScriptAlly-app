# Log a query specs — the Quick actions door (v1, 24 Nov 2026)

Branch `laq-specs-door-v1`, cut from the dev line `…-rar211-laqunk` (f3659638d, bundle `index-CoYsbCK9.js`).
Test-only: no app code changed.

## Round 3 (24 Nov, ~15:30–16:30Z): deploy, laqV2's door, the load guard

### False premises
- None outright. One correction to round 2 below: laqV2's Dashboard button was named there as "`SetUpCard`'s `go-log`
  or `Dash58Header`'s". It is `SetUpCard`'s (measured, see 2).
- The deploy brief said "deploy 51245eb7a". It was deployed. The branch tip has since moved ahead with this round's
  commit, which is test and tooling only, so the bundle dev serves is still the one built from 51245eb7a.

### 1. Deploy
- Dev had not moved. Before the deploy it served `index-DObz1PwS.js` (built from bc9297997, the `…-laqunk-aa215`
  line).
- I built `51245eb7a` from a clean detached checkout of the pushed tip (`npm run build:dev`, target check OK): `index-DQIDPfLr.js`.
- **The app's behaviour is unchanged.** `git diff --name-only bc9297997 51245eb7a` touches only `tests/` and `reports/`.
  The built `index` differs from the served one only in `release:"bc9297997"` → `"51245eb7a"` and in the chunk names
  that stamp changes. `AppRoot` (7,969,594 bytes both) is identical once chunk names are normalised.
- Deployed with `firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`. The served-hash
  check (`|| exit`) was inside the command. **Dev now serves `index-DQIDPfLr.js`** from
  `dev/…-rar211-laqunk-aa215-laqdoor` @ 51245eb7a.

### 2. laqV2: what it was pressing, and the switch
- A temporary probe in `open()`, not committed, logged the matched element on each open. All 22 opens across
  `laq2-ms`, `laq2-ms0` and `laq2-msn` matched the same element:
  **`button.fv1-btn[data-fv1="go-log"]`, "Log a query →", in `SetUpCard`** (`src/components/dashboard/fv1/SetUpCard.tsx:143`).
  It sits on the Dashboard's "Let's get you set up" start card
  (`section[data-fv1="setup"][data-fv2="start-card"][data-path="ready"]`, in `div[data-d2="setup"]` in the middle
  column). That card shows because the base data's manuscripts have no queries. That run: 10 passed.
- `open()` now calls `pressQuickLogAQuery()` (laqLib). Nothing else in the spec changed.
  `npm run e2e:emu -- tests/e2e/laqV2.measure.ts --project=measure`: **10 passed (2.4m)**, V2-1, V2-3…V2-10, with a load
  of 5.20 at the start and 3.77 at the end.
- There is no red-before for this switch. The spec was never red; it was leaning on a page button that only the base
  data draws.

### 3. The load guard
- New `scripts/load-guard.mjs`, called by the shared runner `scripts/emu-e2e-inner.mjs` (behind every
  `npm run e2e:emu`) just before Playwright starts.
  - Every run prints `[load-guard] 1-minute load N at the start of the run`, and the same at the end.
  - Runs that include a Log a query spec (`laq*.measure.ts`), a Record a response spec (`recordResponse*`,
    `recordCleanup`), or no named spec (the whole suite): while the 1-minute load is above 6, it polls every 10s for up
    to 5 minutes.
  - If the load never drops, the run goes ahead and prints that a red in it is UNPROVEN until rerun below 6.
- It waits only. It adds no retries and raises no timeouts; the lock checks for both.
- While it waits, the run holds the test slot, so other heavy jobs queue behind it.
- **Measured:** the probe run started at load 9.93, waited 130s, ran at 5.41 and passed 10 of 10.
- **Locked:** `src/test/loadGuard.test.ts`, 6 tests. Limit 6 and 5 minutes; which specs are covered; runs at once at 6
  or under; waits, then runs; gives up after 5 minutes and prints UNPROVEN; the runner calls the guard before Playwright
  and prints the load after it; no retries or timeouts. The runner test was red against the old runner and green
  against the new one.
- **The reporting rule** ("a red at load above 6 is unproven until rerun below it") is in
  `docs/decisions/testing-measurement.md`, Current state.

### Gates
- Baseline on 51245eb7a: tsc clean, build clean, Vitest 945 files / 13,427 tests passed.
- After: tsc clean, build clean; loadGuard, heavySlot, emuGuard and firestoreTarget 32 of 32.
- No screenshots or readings committed: every run's rewrites under `reports/log-a-query-v2/` were reverted.

## False premises (follow-ups, 24 Nov afternoon)
1. **"laqV2 may fail for the same reason."** It does not. Run unchanged on `laq-specs-door-v1`
   (`npm run e2e:emu -- tests/e2e/laqV2.measure.ts --project=measure`): **10 passed (2.1m)**, V2-1, V2-3…V2-10. Its
   fixture is `seedLaq2` alone, and with that data something on `/dashboard` still answers to a button named "Log a
   query" (the green run proves that much). The header's row is a menuitem, so it must be on the page itself. The likely
   sources are `SetUpCard`'s `go-log` and `Dash58Header`'s log button; I didn't check which. With `seedLaq21`'s four
   queried agents added, no such button exists (finding 3 of the Unknown v1 report). So laqV2 is
   **not** switched, and there is no red-before/green-after for it.
2. **"The line dev serves" moved during the task.** At the start it was `…-laqunk` (`index-CoYsbCK9.js`). By the merge,
   dev served `index-DObz1PwS.js` from `bc9297997` on `…-laqunk-aa215` (Add an agent v2, design v15; its tip
   `a25cf2857` adds only its report). I merged into that line.

## The merge
`dev/…-rar211-laqunk-aa215-laqdoor` = `origin/…-laqunk-aa215` (a25cf2857) + `--no-ff` merge of `laq-specs-door-v1`
(efd6644c0). It has no conflicts and adds only this report, `laqLib.ts`, `laqV21.measure.ts` and `laqV22.measure.ts`. It is a new
branch, so the aa215 session's branch is untouched. It is **not deployed**, so dev still serves `index-DObz1PwS.js`,
which is the same app code (the merge changes no `src/`).

On the merged line, tsc was clean and `npm run e2e:emu -- tests/e2e/laqV21.measure.ts tests/e2e/laqV22.measure.ts --project=measure`:
- run 1 (load ~8): 8 passed, 2 failed. In V21-3, the held task was "absent" from the Dashboard's Next up. In V22-0,
  `review-stamp-nodate@100` had the card at 965.6–1422.4 inside a 951–1437 column, centred, so it was scaled
  mid-animation. The aa215 line changes only Add an agent files (QcAddAgent, SampleTyped, addAgentStages), so neither
  surface differs from the branch where both passed.
- run 2 (load ~3–5): **10 passed (4.3m)**: V21-1…V21-4, V22-0, V22-2, V22-3, V22-4, V22-5.

All three of this report's reds (V21-4's splash, V21-3's Next up, V22-0's scaled card) came at load 8–11 and passed on a
re-run. They are load-sensitive timing, so read a red from these specs on a busy machine with that in mind.

## What was wrong
`laqV21.measure.ts` and `laqV22.measure.ts` opened Log a query with
`getByRole("button", { name: /^\+?\s*Log a query$/ })` on `/dashboard`. Add an agent v2 (9c6d983ff) retired that
split button for "Quick actions" (`src/components/shell/QuickActions.tsx`), whose "Log a query" entry is a
`role="menuitem"` row (`[data-quick="query"]`) inside a menu that opens on `[data-shell=quick-btn]`. So the
button lookup found nothing and every `open()` timed out after 60s. The header still has its way into Log a query
(the first row of the menu), so the app was left alone.

## What moved
- `tests/e2e/laqLib.ts`: new `pressQuickLogAQuery(page)`. It presses Quick actions, waits for the open menu's
  `[data-quick="query"]` row and presses it. It is the same door `addAgentV2.measure.ts` uses.
- `laqV21.measure.ts`, `laqV22.measure.ts`: `open()` calls it. Everything else in the specs is unchanged.
- `laqV2.measure.ts` still uses the old button lookup and was not touched or run here (out of scope).

## Measured
`npm run e2e:emu -- tests/e2e/laqV21.measure.ts tests/e2e/laqV22.measure.ts --project=measure`:
**10 passed (4.1m)**: V21-1…V21-4, V22-0, V22-2, V22-3, V22-4, V22-5.

One earlier run with the same change, at load average ~11, had 9 passed. V21-4 failed there because the main page
sat on the "QueryHawk" loading splash for 60s after V21-3 (which took 1.3m, against 28s on the green run). V21-4 then
passed alone (17.7s) and again in the full green run at load ~3. Read as load, not the door, but it is a long-lived page
after V21-3's second context, so watch for it on a busy machine.

Shots and readings the runs rewrote under `reports/log-a-query-v2-1/` and `-v2-2/` were not committed; they differed
only because the run was a later one.

Baseline before editing: tsc clean, build clean, Vitest 944 files / 13415 tests passed.
