# Packages through the journey — this run (the query side)

Refs: `design-refs/packages-journey/log-query-packages-v2.html` (SHA256 `3d6e7e26…736d0`) and
`design-refs/packages-journey/package-tracking-v1.html` (SHA256 `00eee592…d7ba7d`). Both hashes
verified against the brief and enrolled in the ref watchlist.

## What did NOT land (read first)

- **Part B in full — B1 editions, B2 locked versions and retiring, B3 results tiles, B4 "Log a
  query with this", and locks PE1–PE6.** Deferred by Nick's split ruling: Part B runs as a separate
  pass on top of the packages session's v2.1 (now done, `89b366cf`) and adds the package edition
  fields then. The adapter already reads `edition`/`editions`/`retiredAt` if present and treats
  every package as its 1st edition until then (§C5). Ownership of the card's "Log a query with
  this" was reported by the packages session as ruled to this side; it is built in the Part B pass.
- **LP6's "change p1's contents" half.** Under today's package rules a sent package's slots are
  frozen, so its contents cannot be changed to test against; the rename half is locked (unit +
  H11 on the deployed build). Part B's editions make contents changes possible and bring the rest.

## Commits and the deployed build

| Phase | Commit | What |
|---|---|---|
| 1 | `ec25a192` | Refs enrolled; Part C committed word for word to `docs/contracts/package-editions.md` |
| 2 | `5577a6fe` | §C3 query fields, `sentRecordOf`, rules for the seven fields, reversible migration |
| 4 | `59e3629a` | A1 step 2 (two ways, opening order, no packages) and A2 saving |
| 5 | `067c39f5` | A3 the two treatments: card chip, Tracking box, request tag, Birds-eye words, review chip |
| 6 | `e8314171` | A4 correcting what was sent; "Add what you sent ›" |

**Dev: `e8314171` serves `index-DXNKyVeM.js` · `index-CVh9hCqg.css`** (built and deployed from a
clean detached worktree of the pushed tip; served hash checked with curl). Dev Firestore rules:
release `updateTime` 2026-09-28T12:37:34Z (query fields only). **Prod rules for the seven query
fields are Nick's** (`npm run deploy:rules`), alongside v1's §R.

## Migration (Phase 2) — harness account, dev

`tests/e2e/migrateSentHow.mjs`: **83 queries scanned · 19 → `sentHow: 'package'`, edition 1 ·
64 → `'unrecorded'` · 0 already set.** Status and every date field re-read after each write and
unchanged on all 83. Re-running reports 83 already set (idempotent). Reversible: the backup of the
exact keys added is `reports/packages-journey/migration-<uid>.json`; `--revert <file>` removes those
keys and nothing else. Packages were not read or written.

⚠️ Not required for correctness: `sentRecordOf` reads an unmigrated query with the same defaults,
so prod reads right before the migration ever runs there.

⚠️ Literal to the brief, and worth knowing: a query the v1 drawer logged with Custom materials has
no `packageId`, so it became `unrecorded` rather than `individual`, even though its materials were
chosen individually. Say if those should be `individual`.

## Locks — each proved red first

| Lock | Where | Proved red by |
|---|---|---|
| LP1 default | unit + rendered | dropping the default from the order |
| LP2 preset holds | unit + rendered (a matching agent seeded for the case: MATCHES on p1, p2, p4 while the preset p4 holds) | the match replacing the preset in `pickAgent` (rendered) |
| LP3 retired | unit + rendered | removing the live filter |
| LP4 none | rendered | rendering nothing |
| LP5 records | rendered | writing a package on every save (rendered) |
| LP6 snapshot (rename) | unit + H11 rendered | — (reads the query; the unit case renders against a renamed live package) |
| LP7 based on | unit + rendered | no changes detected |
| LP8 exact match | unit + rendered | never finding a match |
| LP9 treatments | unit (6 cases) + rendered (6 cases, chip + Tracking box + computed border/ink) | swapping the chip classes; swapping the box classes |
| LP10 correction | rendered (log → correct → credit moves → Undo restores exactly) | leaving the credit off the query (rendered) |
| §A4 editions offered | unit | dropping the date filter; dropping retired packages |

**Against the deployed build (`SA_E2E_BASE_URL=dev`): 12/12 passed** — the ten packages-journey
cases (78 assertions), H11, H12 and `closedRecoverable`. **v1's drawer suites on the same
deployed build: 22/22** (`qaJourneys`, `qaLocks`, `qaDeploySmoke`) — the step 2 rewrite broke none of
the seven journeys.

## Deviations and flags

1. **The sample's portion keeps its control in package mode (deviation from the mock).** The mock
   draws packages that state a sample; the model does not (D2 — "the agent sets its size, the
   version decides its content"; confirmed by the packages session: v2.1 adds no package fields).
   So "In this package" reads the book version as the sample, and the portion defaults to the
   agent's ask. The portion is never a "based on" change.
2. **The frozen package name rides in `sentMaterials`** (`Standard package: …`, `Based on
   Standard: …`). LP6 needs the name as it was on the day and §C3 has no field for it; a new
   field would take the rules beyond Part C (a §S stop). `readSummary` is the one parser.
   **Contract question:** add `sentPackageName` in Part B?
3. **The Birds-eye "tooltip" is a native `title`**, which cannot hold a chip; it carries the same
   three cases in words.
4. **A drawer log stamps `firstSentAt` in the same batch as the query.** Nick's ruling: stamp now;
   the rules make it one-way, so an undo cannot lift it until Part B adds that rule.
5. **A correction onto a never-sent package does not stamp it** (the stamp belongs in the link's
   batch, and this write is an update beside `editActivity`). Part B's editions retire the lock.
6. **Fixed on the way — a v1 race:** a drawer opened within 240ms of a cancelled one was closed as
   it arrived. Close now closes only the request that asked to.
7. **Found under a mutation, not fixed (v1):** `addQuery` writes the query and then its activity rows
   separately. With a deliberately broken payload the query was written, the save reported failure,
   and no Undo was offered — the residue was found and removed. A failed save can leave a query.
8. **"Log another" after an individual log** opens on the manuscript's default package: the ruling's
   order has `again.pkg` second, and "custom" is not a package.
9. Dev logs a console warning that activity type "Holding Reply" is not in this build — another
   session's data on the shared account, not this run's.

## Screenshots (`reports/packages-journey/shots/`)

- Step 2, four states: `step2-1-package-default`, `step2-2-package-preset`, `step2-3-individually`, `step2-4-no-packages` (+ `step2-4b-leave-bar`)
- Six card and Tracking cases: `case-pkg`, `case-ind`, `case-based`, `case-ret`, `case-cor`, `case-imp`
- The exact-match prompt: `exact-match-prompt`; the "based on" note: `based-on-note`; the package review: `review-package`
- The correction journey: `correction-journey`, `correction-review`
- Package-card edition settings, a retired card, the edition warning, the locked-version message: **Part B**
