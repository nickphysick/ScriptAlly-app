# Phone app v2, Part 2 — Home

Branch `phone-app-v2` (worktree `/Users/nickphysick/ScriptAlly-pa2`). Ref: `design-refs/phone-app-v2/` — screens 01–03, `screenHome2`, `heroBand`, `foundingCard`; the hashes were re-verified (69 OK). Not merged, not on prod.

## False premises

1. **"Every series and range is the hero chart's existing derivation."** Two of the ref's four series exist.
   - The dashboard chart's ledger (`oneScreen.dailyLedger`) keeps **Active**, a stock, and **Sent**, a flow.
   - Nothing in the app keeps **Replies** or **Requests** as a series over time. Analytics and Responses count them, but neither has a dated, week-by-week line.
   - Following the brief's own rule ("If one is missing, say so and show the three"), the switch shows the two it can draw. It does not derive two new series here.
2. **"Its figures are the existing closed split."** No single function states "{p} passed, {r} no response".
   - The dashboard's closed split, `dashClosed`, is bucketed by how far a query got (quiet, letter, partial, full), not by outcome.
   - The split here is a status count over the Closed chip's own rows (`rowsFor(rows, "closed")`): `Rejected` → passed, `No Response` → no response. A withdrawal is neither.
3. **Home's hero-tap target.** "Tapping the number or the chart opens Queries." The app has no Active-filtered Queries view, so it opens the Queries tab as it stands.

## What Step 0 found, and what survives of dashboard-mobile-v1

- **Survives:**
  - `DashPhone` as the page, with its list plan (`dashList` → `taskCardModel`), `viewTask` and the feed sheet.
  - The `lib/dashPhone` derivations (unchanged; their own tests still run).
  - `dashPhone.css` for the feed sheet and the FeedbackDock-as-sheet.
- **Replaced:**
  - The top bar, already in Part 1.
  - The four stat cards (`PhoneStats`), now the band hero and "Where they stand".
  - `PhoneUpNext`, now the Up next card.
  - `PhoneFoundingRecent`, now the founding card and Latest.
- The three replaced files had no other importer and are deleted.

## Gates

| Gate | Before Part 2 (`c15b495f`) | After |
|---|---|---|
| tsc root / functions | 0 / 0 | 0 / 0 |
| build:dev (grepped) | clean | clean |
| Vitest | 690 files · 10730 passed · 3 skipped | `Test Files 691 passed (691)` · `Tests 10736 passed \| 3 skipped (10739)` |

## Commits

| Commit | What |
|---|---|
| `93d802c7` | 2A–C. **One commit for the brief's three build phases.** The five sections share one component (`PhoneHome.tsx`), one stylesheet and DashPhone's wiring, so a split would have committed half-wired files. Files: `lib/phoneHome.ts` (+ test), `dashboard/phone/{DashPhone.tsx, PhoneHome.tsx, phoneHome.css}`, deletions of `PhoneStats.tsx`, `PhoneUpNext.tsx`, `PhoneFoundingRecent.tsx`, `queries/phone/QueriesPhone.tsx` (the `?chip=` arrival), `phone/phoneShell.css` |
| (this commit) | 2D: locks, shots, pairs, report |

## Locks — PA2-2 (`tests/e2e/phoneAppV2Home.measure.ts`)

Each lock was proved red at 390 × 844. CSS mutations used `PA2_MUTATE`; code mutations were built in their own folders and reverted, with a clean `git diff`.

| Lock | Claim | Mutation | Red reading |
|---|---|---|---|
| H1 | each series × range: the number is the derivation's (Active = the desktop chart's headline; Sent = the Queries tab's sent count), the line has 5 / 13 / every weekly point, the change is last − first with its phrase | `range-off` (1M takes 6 points) | `active 1M: 5 points — 6 vs 5` |
| H2 | the switch survives a reload | `no-store` (no write) | `Sent · 1M survives a reload — {"s":"active","r":"3M"}` |
| H3 | the three counts equal the Queries chips; each button lands on its chip with the URL tidied | `swap-chips` | `you: lands on the you chip — {"chip":"agent"}` |
| H4 | the closed count equals the Closed chip and its rows; the passes equal the chip's "Passed" rows | `withdrawn-pass` | `passed = the Closed chip's Passed rows — 12 vs {"passed":11,"withdrawn":1}` |
| H5 | Up next's item is the desktop task card's first | `second-task` | `task-full-rj-dupe vs task-offer-seed-query-12` |
| H6 | stand · up next · latest · founding, in order; white on navy, ink on blush, no green or red | CSS `ink-title` | `text on navy is not white: h1.pa-bt.pa-bt--hello` |
| H7 | no image twice | `dup-art` | `no image twice — ["/images/tier-founding.png"]` |
| H8 | the desktop is untouched | PA2-1 S9 re-run on this build (proved red in Part 1 by `desk-bar`) | see below |

**On first writing, H4 was too weak.** It asserted only "passes + no-replies ≤ closed". On this account that holds even when a withdrawal is counted as a pass (11 + 1 → 12 + 1, against 13 closed), so the mutation would have gone green. It now compares the passes with the Closed chip's own "Passed" rows.

**Final green:** 390 × 844 and 360 × 780, 39 readings each. Examples: Active All 133 weekly points; With you 16 = 16; Closed 13 = 13 rows; Up next `task-offer-seed-query-12` on both.

**Tap targets.** `dashMobileV1`'s F1, which still runs, found that "See all", "Responses" and View task were under 40px tall. The links now have a 44px hit area, taken back by equal negative margins so no line moves. View task is 44px tall; the ref's `.btn.sm` is 38. Re-run: F1 passes, and PA2-2 still passes.

**H8 (the desktop):** S9 re-captured on this build and compared with the Part 1 base captures. Dashboard: 0 px at 1512 and 1280, against base-to-base envelopes of 48 and 171. The other routes are byte-identical. The DOM is identical everywhere.

**Retired:** `dashMobileV1` DM1-B1 (stat cards), DM1-C1 (Up next) and DM1-D1 (founding row and Recent), each with its reason at the line. DM1-C1 was already red on the unchanged base. E1 (furniture) and F1 (sideways scroll, tap targets) still run.

## Where the app's derivation overrode the ref

| Item | Ref | App |
|---|---|---|
| hero | 11 active, +7 | 39 active, +7 over 3M on the harness account; Sent 52 |
| split bar | 2 / 6 / 3 | 16 / 6 / 17 |
| closed line | "5 closed · 4 passed, 1 no response" | "13 closed · 11 passed, 1 no response" (the 13th is a withdrawal) |
| Up next | "Send Eleanor the full", "See all 8" | the desktop's own first item, "Noah Bright has made an offer", "See all 34" |
| founding progress | "2 of 5 to Archivist" | `{sent} of {sent + toNext} to {next rank}` from the founding stats; "0 of 1 to Fledgling" here |

**A fall in the hero is stated as "−n {range}", with no arrow.** The ref draws "No change" for anything not a rise, which would misstate a fall. "No change" is kept for an actual zero.

## Dev

- **Before:** dev served `index-Ox21np2m.js`, the Part 1 integration `a8b44524`.
- **Integration branch:** `dev/pk391-qm1-pk392-calx-pk392b-td7-fv1-pk393-pa2-2`, at `82adc7b9` = `a8b44524` + `phone-app-v2` at `e0531aba`. No conflicts.
- **Gates there:** tsc 0 / 0 · build clean · Vitest `Test Files 692 passed (692)` · `Tests 10743 passed | 3 skipped (10746)`.
- **Locks there:** PA2-1 `10 passed, 2 skipped` (S9 needs `PA2_L1`) · PA2-2 `3 passed`.
- **After:** dev serves `index-CRHIwewp.js`.

## Not done, and why — for Nick

1. **Replies and Requests in the hero.** Adding them means a new dated series. The likeliest source is `lib/responses`' `answerMs` per reply or request. That is a new derivation, so it is your call.
2. **The hero's tap opens Queries as it stands.** There is no Active-only view to open.
3. **Up next's "View task" is 44px tall, where the ref's `.btn.sm` is 38.** That is what the tap-target law needs.
4. **`PhoneSearch` and the old search state in DashPhone are still unreachable** (Part 1, open question 1).

## Worktree

Kept for Parts 3–8.
