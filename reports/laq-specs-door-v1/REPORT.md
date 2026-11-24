# Log a query specs — the Quick actions door (v1, 24 Nov 2026)

Branch `laq-specs-door-v1`, cut from the dev line `…-rar211-laqunk` (f3659638d, bundle `index-CoYsbCK9.js`).
Test-only: no app code changed.

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
