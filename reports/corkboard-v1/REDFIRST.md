# Corkboard v1 — red first

Every lock was run against the build WITHOUT the pack (`9fc11a2a`, the branch dev served on 12 Oct), from its own worktree and bundle, with `CB_ROUTE=/todo/noteboard` so the locks opened the page's old address (on that build `/todo/corkboard` is not a route and falls through to the dashboard).

All 15 are red there, in three kinds:

- **Six with readings** (A1, A2, C1, C2, C3, C5): the ledger rows say what the old page does instead.
- **Six where the probe found no subject** (B1, B2, B3, C4, D1, L1): the thing the lock reads (the tag chip with a count, the paper squares, the cork board, the tasks card) is not on that build, and the probe timed out or read null. A red, but a crash-shaped one. L1's is a sign-in that did not complete, so it may belong with the next group.
- **Three that are NOT readings** (C6, C7, D2): Firebase's password-verification quota (`auth/quota-exceeded`) ran out during the run. Playwright starts a new worker, and so a new sign-in, after every failed test, and fifteen failures in a row used the quota up. Their subjects (the Tidy chip, the top-right menu button, the tasks card) do not exist on that build.

Every one of the 15 also has a named mutation that turned it red on the finished build (`mutation-proofs.jsonl`), which is the stronger proof for the nine without readings.

| Lock | On `9fc11a2a` | First reading |
|---|---|---|
| A1 | red: 10 of 14 readings | /todo/noteboard 1512x900 — a writer can read " 45 45 to do Calendar Calendar Noteboard Noteboard Give feedback BETA H " |
| A2 | red: 2 of 8 readings | /todo/noteboard?q=x 1512x900 — the current sidebar row is ["Noteboard"] |
| B1 | red: the probe found no subject | TimeoutError: locator.click: Timeout 12000ms exceeded. |
| B2 | red: the probe found no subject | TimeoutError: locator.evaluate: Timeout 12000ms exceeded. |
| B3 | red: the probe found no subject | TimeoutError: locator.click: Timeout 12000ms exceeded. |
| C1 | red: 2 of 2 readings | 1512x900 — the board is on the page |
| C2 | red: 4 of 23 readings | 1512x900 · render 1 — 0 notes on the board |
| C3 | red: 2 of 2 readings | 1512x900 — a note to drag |
| C4 | red: the probe found no subject | TypeError: Cannot read properties of null (reading 'items') |
| C5 | red: 2 of 3 readings | 1512x900 — the board rendered |
| C6 | red, NOT a reading (auth quota) | FirebaseError: Firebase: Exceeded quota for verifying passwords. (auth/quota-exceeded). |
| C7 | red, NOT a reading (auth quota) | FirebaseError: Firebase: Exceeded quota for verifying passwords. (auth/quota-exceeded). |
| D1 | red: the probe found no subject | TimeoutError: locator.evaluate: Timeout 12000ms exceeded. |
| D2 | red, NOT a reading (auth quota) | FirebaseError: Firebase: Exceeded quota for verifying passwords. (auth/quota-exceeded). |
| L1 | red: the probe found no subject | Error: expect(locator).toBeVisible() failed |

The ledgers of that run are in `base-ledger/`.
