# Query Centre v138.1: report

Branch `query-centre-v138-1`, off the branch dev served: `dev/…-cl171-qc138` at `81544fd9` (v138). Ref `design-refs/query-centre-v138-1/`: all 13 SHA-256 values match, and the html is enrolled in `.refhashes.json`.

## False premises and stops (read first)

1. **Part C is not built. It stopped on its own condition.** The pack says: "If any name would push the tiles past the column, stop and say which." At 1512 the What-you-sent column is 300 wide, and the four tiles leave about **153px** for the chip. The seed data's longest package name is **"The Complete Autumn Submission Bundle for Literary Agents"**, which renders **≈446px** as an untruncated chip (min 96, padding `0 12px 0 10px`). Two more seed names don't fit either: **"Comps-led variant" ≈168px** and **"Agents with MSWL" ≈158px**. In the 128px compact column, only "Package" (96) fits beside the tiles. A chip that never truncates and tiles that always align cannot both hold for these names. The chip is still v138's truncating chip, and C1 is not written. **Nick to rule.** The options: let the chip wrap to two lines, widen the column, drop the tiles when a name is long, or allow truncation after all.
2. **Part A: the pinned row was not riding high.** Measured before any edit, every child (count, glyph capsule, search, Log, ↑) sat **0.0px** from the bar's centre at both sizes. Nothing was offsetting it. A was still built as asked, so the centring no longer depends on luck: the inner row has no padding, its children have no vertical margins and centre themselves, and the count's right margin became padding. A1 holds each child within 1px.
3. **Part D, "the most-stretched gap", is read as the widest gap** (the one with the most px per day). The tick unit is chosen there: the smallest unit at least 6px apart. Choosing it from the highest px/day picked "week" off a 2-day gap clamped to the 44px minimum, which puts a fortnight's ticks nowhere. Each gap then drops its ticks if their spacing falls under 4px or the gap is shorter than one unit.
4. **v138 had broken the list keys.** `useQcListKeys` looked for rows in `.qcw-list`, and v138's sheet is not one, so j/k/Enter/L found nothing. F re-points it at both containers.
5. **My own Part F shipped a bug, caught by its screenshot.** The search took its 300px width from `.ws-app.sheet-wide`. The shell does not set that class at 1512, so the field rendered 220 and truncated "Find an agent or agency". F1 also read its expected width from that class, so it passed over the fault. Fixed in `256ff64f`: the widths now follow the column grid's own `qc138sheet` container line at 1180. F1 now takes its expected width from the sheet's measured width, and it was proved red on the old rule (220 against a 1208px sheet).

## What changed

| Part | Commit | |
|---|---|---|
| A | `6e3a4f8d` | Pinned row: one flex row, no padding, no child margins. |
| B | `7cc50514` | The glyph-row key line removed. |
| C | — | Stopped (above). |
| D | `41948517` | Peek: date cards on a line drawn to scale; linear gaps (floor 0.35, min 44px); labels shorten to `{n}d`/`{n}w`/`{n}mo`/`{y}y`; tick ruler with a "1 tick = 1 {unit}" key; recomputed on open and on resize. |
| E | `80d30959` | Overdue dial: a complete rust ring on white with a 2.4s breathing halo, still under reduced motion. |
| F | `38f4ef54`, `256ff64f` | Search in the navy row: 300 (220 under 1180) at rest, 360 (260) on focus; mirrored with the pinned search; `/` focuses it (the pinned one while pinned); Esc clears. The desktop dead end now renders inside the sheet. |
| G | this commit | Locks, report, CLAUDE.md. |

## Census: queries whose events fell back to "+n more" (for Nick)

All 73 rows were opened, Closed included (`peek-census.json`). Four fold:

- Peter Vance (`seed-query-10`): +3 more
- Ana Duarte (`seed-query-21`): +3 more
- Iris Kwan (`seed-query-11`): +2 more
- Noah Bright (`seed-query-12`): +3 more

No row had an empty peek.

## Locks

`tests/e2e/qcV1381.measure.ts`, at 1512×900 and 1280×800. Red readings are in `mutation-proofs.json`, ledgers in `ledger/`.

- A1, B1, D1, D2, E1, F1: each was green on the branch and red on its named mutation.
- C1: not written (Part C stopped).
- **Edited in `qcV138.measure.ts`, each with a note:**
  - B1: the search is in the sheet's top row, and the header's parts are pills only.
  - E2: an overdue dial is a ring on white, not a fill.
  - F2: the peek has no container.
- **L1:** QC138 16 passed · queryPanelV2 9 passed, 1 skipped · contactV17 13 · contactV171 6 · todoV2 18.

Gates match the baseline: tsc clean; both builds clean; Vitest 8785 passed, and the only red is the known `functions/src/email.test.ts`.

## Shots

`shots/`, named beside each `screens/*`: `01-top`, `02-list`, `03-pinned`, `08-search` at 1512 and 1280; `04-timeline-overdue` and `05-timeline-waiting` at 1512. The D2 sheet's five cases are `06-timeline-scale-1512` and `07-timeline-scale-1100`. At 1512 the Birds-eye tab covers the right end of the fifth case; that tab is page chrome, not part of the peek.

## Integration and dev

Dev served `index-Dwlwm9M3.js`, from `dev/…-cl171-qc138` at `81544fd9`. This branch contains that branch, so the integration branch **`dev/…-cl171-qc138-qc1381`** is a fast-forward to `e3328ec5`: the same commit the gates and locks above ran on. It was built from a clean detached worktree of that tip and deployed hosting-only to `scriptally-dev`. The served hash was checked immediately before the deploy. **Dev now serves `index-CvdwJkYd.js`.** Not merged to main; prod untouched.
