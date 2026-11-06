# Dashboard v2.2: founding band under the header, Active/Sent chart, rank progress you can feel

6 Nov 2026 · branch `dashboard-v2-2` · ref `design-refs/dashboard-v2-2/` (all 17 SHA256 verified)

## 1 · False premises

1. **The rank thresholds are not 1 / 5 / 12 / 25 / 40.** The app's rules are `TIERS` in `src/lib/foundingStats.ts`:
   **1 · 3 · 8 · 15 · 25** (Fledgling, Archivist, Scout, Mentor, QueryHawk; the Egg before them at 0). The pack said
   not to touch them, so the band reads `TIERS` through `lib/foundingBand.ts` and nothing else. **The reference images
   show the old thresholds; `TIERS` wins** (Nick, 6 Nov). The lock writers follow `TIERS`:
   - F is a Fledgling with **2** notes (the pack's 3 notes would be an Archivist here);
   - A is an Archivist with 7 notes, so C2 expects the fill at Archivist + **4/5** of the way to Scout;
   - Q is a QueryHawk with 52 notes;
   - C4: focusing Scout for E reads **"At 8 notes · 8 to go"** (the pack's "At 12 notes · 12 to go").
2. **A "rank last celebrated" store already existed: `users.foundingSeenTier`.** It is in `isValidUser` (an int 0–5) and
   the user-update allowlist, and `Dashboard.tsx` already passes `onFoundingSeen` → `updateUserProfile`. It had no reader
   since v105's card was unmounted. Part D reuses it instead of adding `celebratedRank` (Nick, 6 Nov). v105 wrote
   `cardTier(stats)`, the integer 0–5, which is exactly what the band reads, so no stored value is rewritten; a tier name
   would be read as its index (`seenRank`). A v105 value left below the current rank plays one rank-up.
3. **Nothing in the app lists a writer's notes**, so "All your notes" is omitted (FeedbackDock only sends;
   `betaFeedback` is read only for the latest note).

Smaller differences from the brief, where the prompt's values won over the mock or the mock was ambiguous:

- Copy uses the typographic apostrophe (`You’re`, `You’ve`, `Don’t like`), as every other string in the founding
  card's code; the brief's markdown is straight.
- The "Now in the app" chip is the only green outcome. v2.1 also greened "Fixed"; the brief names only "Now in the app".
- The chart card's accessible group name stays "Active queries", so the v2 suite's card lookups still find it.
- The rank-up's sparks move by the Web Animations API, not a keyframe: a `var()` inside `@keyframes` fails silently in
  this setup (CLAUDE.md), and each spark's offset is its own.
- Review stats (the dev aid `__SA_FOUNDING_STATS`) can play the rank-up (with `seen` on the aid) but never write it, per
  v105's rule that nothing derived from aided stats reaches the account.

## 2 · Step 0

| # | Question | Answer |
|---|---|---|
| 1 | Base | `dev/qc1511-…-qc1522-td51-td511` @ `8b23dee26`, the branch dev served (`index-c89gelcz.js`). It carries v2.1's code (Parts A–E, `d526a4ccf`…`d269cac91`); only v2.1's report-shots commit `ebb15042` is not on it. v2.1's founding card rendered in the middle column under Active queries; Closed queries and Agents on file were in the left column. |
| 2 | Founding data | Rank and notes counted: `useFoundingStats` → `cardTier`, `contributions` (`foundingStats/{uid}`, server-written). Thresholds: `TIERS`. Founding number: `stats.foundingNo`. Latest note and outcome: `useLatestNote` (`betaFeedback`, `noteFrom`/`OUTCOME`). No second copy of the rank rules. |
| 3 | Sent weekly data | First-sent date: `sentAt(q)` (lib/oneScreen, the ledger's own). Active's weeks: `dash2Weeks` (ISO weeks, Monday start, the ledger's weekly roll-up) trimmed by `visibleWeeks` to what fits; Sent uses the same visible weeks. A query with no sent date is skipped. |
| 4 | Per-user state | `todoPrefs.dash` (dashPrefsOf / `onPrefs` → `updateUserPaths`, one dotted leaf), writable under the current rules (`todoPrefs is map`, in the allowlist). Fold: `todoPrefs.dash.foundingFolded`. Rank-up: `users.foundingSeenTier` (false premise 2). No rules change. |
| 5 | Notes list | None exists → link omitted. |
| 6 | Rank elsewhere | Shown on the phone: `DashPhone` and `GoalsPhone` (via `lib/dashPhone`). Nothing added. |

## 3 · The commits

| Part | Commit | |
|---|---|---|
| A | `3c99c6897` | the band under the header; the columns |
| B | `5e67661d9` | the chart's band and the Active / Sent toggle |
| C | `2b74b6d10` | the founding band |
| D | `87f810cc7` | the rank-up, once per rank |
| E | `c764eb47c` | the fold |
| D (fix) | `ba2bc1d82` | decide again when the stored rank changes (§6) |
| F | _this commit_ | the DB22 locks, re-pointed suites (incl. DB2 B and DFV-A A2), CLAUDE.md, this report |

Gates per commit (tsc, `build:dev`, production build, full Vitest, `set -o pipefail`, exit codes read): every one equals
the baseline — `tsc` 0, both builds 0, Vitest **2 failed** (both `src/test/firestoreTarget.test.ts`, which flags 28
`tests/e2e/cl25*` seeders from other streams; accepted as baseline by Nick) plus the occasional reporter RPC timeout.
Passing tests rose 11,449 → 11,457 with this pack's unit tests.

## 4 · Re-pointed and retired assertions

Unit:
- `f1Queries.test.tsx` DF1-C — the column order (founding band before the grid; middle = chart then Closed).
- `dashFirstVisit.test.tsx` DFV-A — the founding band above the grid, before the set-up card.
- `dash2.test.tsx` DB21-B — the slice ends at Closed queries (was the founding card); the plot is 270 (was 280).
- `dash2.test.tsx` DB21-C — **retired**: v2.1's hero line and ring; the rules now live in `lib/foundingBand.test.ts`.

e2e:
- `dashV2.measure.ts` A2 — left order Next up → Agents on file; middle Active queries → Closed queries.
- `dashV2.measure.ts` C1 — the plot is 270px.
- `dashV2.measure.ts` D1 — the band's fields: five birds, reached by state, the No. pill, `data-done`, the next bird's
  note count from `TIERS`.
- `dashV2.measure.ts` E1 — the feed ends level with the taller column (was: with the founding card).
- `dashV21.measure.ts` B2 — the plot is 270px.
- `dashV2.measure.ts` B — four framed cards (was five); the founding band is not a card.
- `dashFirstVisit.measure.ts` DFV-A A2 — the band's three sections (top, tell, road), none cut.
- `dashV21.measure.ts` C — **retired**: it measured v2.1's founding card (ring, 132px badge, six-marker road), none of
  which the band has; DB22 C1–C4 hold the band.

## 5 · Worktrees (Nick decides on clean-up)

Besides the primary checkout and this pack's own `ScriptAlly-db22`:

| Worktree | Branch | Last commit | Uncommitted changes | In dev's branch (`…-td511`) |
|---|---|---|---|---|
| scratchpad `…/13a7f272…/wt-emu` | detached | 2 Nov | y (63 tracked) | yes |
| scratchpad `…/c6010769…/int-cb2` | `…-td511-cb2` | 6 Nov 15:30 | n (1 untracked) | no |
| `ScriptAlly-cb2` | `corkboard-v2` | 6 Nov 15:11 | n (2 untracked) | no |
| `ScriptAlly-cl263` | `contact-list-v26-3` | 4 Nov | n | no |
| `ScriptAlly-live` | `release/live-1` | 4 Nov | n (1 untracked) | no |
| `ScriptAlly-qc1522` | `query-centre-v152-2` | 6 Nov 14:47 | y (25 tracked) | no |
| `ScriptAlly-rail2` | `sidebar-rail-v1-dev` | 6 Nov 13:04 | y (45 tracked) | no |
| `ScriptAlly-rsp6` | `responses-v6` | 4 Nov | y (8 tracked) | yes |

(`int-cb2` appeared during this run: another session's Corkboard v2 integration branch, cut from the same dev branch.)

## 6 · Part D: a fault the lock found

The first DB22 run passed at 1512 and failed D1 and E1 at 1280. The user document arrives first from the
persistent cache, then from the server. Part D decided once per rank, so a stale cached `foundingSeenTier` was
decided on and the server's value never looked at again. The decision is now keyed on the rank **and** the stored
value, with a guard so the animation still plays once per rank per load (`ba2bc1d82`, a follow-up commit, not an amend).

The reduced-motion half of D1 then exposed a harness fault, not a product one: `openRoute` loads its route twice
(`goto`, sign in, `goto`). In a fresh browser context the sign-in is slow enough that the **first** load plays the
rank-up and records it, so the measured second load rightly shows nothing. D1 now warms that context on `/queries`,
resets the stored rank, and opens the dashboard once. The first-play and absent cases do the same (`openDashOnce`), and the first-play case waits for the server's
Fledgling before it reads: on the second size the persistent cache can hand over the previous case's Egg first (one
flaky red at 1280 before this; DB22 then passed twice in a row with `--repeat-each=2`).

## 7 · The locks

`tests/e2e/dashV22.measure.ts` on the emulator (`npm run e2e:emu`, the harness account under `demo-scriptally`),
at 1512 × 982 and 1280 × 800. Writers are seeded by firebase-admin on the emulator for each case:
E (0 notes, an Egg), F (2, a Fledgling, last note "built"), A (7, an Archivist, last note "read"), Q (52, QueryHawk).
Readings are in `ledger/` (the clean run).

| Lock | Claims | Break | Red on the break |
|---|---|---|---|
| A1 | band 18 under the header, full width; columns 22 under it; the column orders | `DB22_MUTATE=A1`: the band back in the middle column (v2.1's place) | 10 readings at both sizes: 638px under the header, the band 488px wide, middle column `active, closed-hoop, founding` |
| B1 | the toggle 18px from the band's right, both modes | `DB22_MUTATE=B1`: the toggle centred | 162.1 / 137.0 from the right |
| B2 | Sent's scale is 0–1.15 × the busiest week | source: `SENT_HEADROOM = 1` | tallest bar 192.0 against 167.0 |
| C1 | the rank line for E, F, A, Q | `DB22_MUTATE=C1`: "Fledgling" hard-coded | E, A and Q read "Fledgling" |
| C2 | the fill ends where `TIERS` says (F 0.50 steps, A 1.80) | `DB22_MUTATE=C2`: fill to the next bird | F 593.0 vs 519.6 · A 754.4 vs 723.0 (1512) |
| C3 | F's last note and its green chip; no row for E; A's plain chip | `DB22_MUTATE=C3`: the row for every writer | E shows a last-note row |
| C4 | focusing Scout shows "At 8 notes · 8 to go" (E) / "· 1 to go" (A); future birds focusable; reached birds carry no card | `DB22_MUTATE=C4`: the card on hover only · `C4r`: a card on every bird | opacity 0 on focus · 2 reached birds with a card |
| D1 | plays once; a reload does not; reduced motion shows the end state and still writes; absent set silently; the Egg never plays | source: `rankUpDecision` plays whenever tier ≥ 1 | a reload plays it again; absent plays |
| E1 | the 62px strip, its labels, stored as `todoPrefs.dash.foundingFolded`, survives a reload, unfolds back | source: `onFold={undefined}` in Dash58 | nothing stored; the reload shows the full band |

Every source break was applied in this worktree, run, and restored from a copy named by its path; `git diff` was
empty after each. The mutation runner is the session's `mutall.sh` (not committed).

Shots (`shots/`) sit beside the reference's `screens/`: `01-dashboard`, `02-sent`, `02-sent-hover`, `04-rank-up-end`,
`06-folded`, `07-bird-hover`; the reference's `03-last-note`, `05-progress` and `08-top-rank` are `band-F`, `band-A`
and `band-Q`. The bands' figures differ from the reference's where `TIERS` differs (false premise 1).

## 8 · L1: the neighbouring suites

Run on this build: `dashV2`, `dashV21`, `dashFirstVisit`, `dashFirstVisitV2`, `dashMobileV1`, `helpSystemV1` (emulator,
one worker, 1.2h). 23 passed, 26 failed, 4 skipped.

- **Two reds were this pack's and are re-pointed** (§4): `dashV2` DB2 B counted five framed cards (the founding card is
  now a band, so four remain) and `dashFirstVisit` DFV-A A2 wanted the card's four sections (the band has three; v2's
  foot is gone and its links are in the tell column).
- **The rest were red on the base build too.** Re-run on an untouched checkout of `8b23dee26`: DM1-E1,
  `dashFirstVisitV2` A1, A2, B1, C1 and D1, and HS1-A1, B1 and B3 fail there the same way. That run was stopped after
  those (Nick asked for speed), so `dashFirstVisitV2` F1, G1 and H1 and HS1-C1 to E2 were not re-run on base. None of
  them reads the founding card or the dashboard's columns: they are the first-visit tour and set-up card, the Help menu,
  the checklist pill and the Contact list's glossary cards, which mostly time out waiting for their own controls.
