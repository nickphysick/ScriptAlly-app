# Smart Import evaluation harness v1 — the report

19 October 2026 · branch `smart-import-eval` (worktree `../ScriptAlly-smart-eval`), cut from `origin/main` at `30439920` · nothing deployed.

## False premises and deviations — read first

1. **This work is on a branch, not on `main`.** The primary checkout's local `main` was 394 commits behind `origin/main` and held other sessions' uncommitted report files. Building on it would have meant recon against a stale base; fast-forwarding it would have meant moving a checkout someone else may be holding. So this pack ran in its own worktree on branch `smart-import-eval` from `origin/main`. Merging or pushing it is your call; it is eleven commits on top of `30439920`, this report included, and fast-forwards cleanly.
2. **The key was absent at the start.** Phases 1–4 were built and dry-run first. You added `.env.local` to the worktree, and Phases 5–7 then ran live. The key is never printed, logged or written to a report; a sweep of every committed report for `sk-ant` finds nothing.
3. **Fix 1 adds the `### Sheet:` heading only when more than one sheet has data.** The pack said to prefix each sheet. With one sheet of data, which covers every `.csv` and most `.xlsx` files, the text is byte-identical to what it was before, so the fix cannot move any single-sheet result. A snapshot of all 50 fixtures confirms that only the three tab fixtures changed.
4. **"Every date style the prompt names" leaves out year-less SENT dates on purpose.** `parseImportDate` resolves a year-less sent date against *today*, so the expected answer would change from day to day. Year-less dates do appear inside notes, where the parser anchors them to the query's own sent date and the answer stays fixed.
5. **The scorer was wrong in the first paid run, and the run was thrown away.** On `kitchen-csv-150`, several rows have no name and no agency. When the model's answer for one of them lost that empty key, the scorer quietly gave it another row's answer — the silent guess the pack forbids. This is fixed in `2dae3528`: pairs matching on name, agency **and date** are made for every row before any looser match, and a pick the date does not settle is reported as ambiguous. A new test reproduces the fault and was red against the old scorer. The first run saved no raw output, so it could not be re-scored. It was discarded and the baseline run again; both runs count toward spend.
6. **The callable's own 90 s timeout is not in the pack, and it matters.** Two dev calls took longer than that: `kitchen-csv-150` (≈106 s) and `size-csv-300` (≈145 s). In production both fail with an error, whatever the model returns. The scores do not count this. The summary reports it on its own line.
7. **Most expected-to-fail fixtures fail only partly.** The model recovers a good share of them: `wide-csv-10` scores 91.4% and `colour-xlsx-50` 94.0%, because the fields other than the missing one are still right. The 12 are measured, not wiped out.
8. **A small ordering difference in Phase 1.** The callable used to record the import against the writer's allowance *before* assembling the result; it now assembles first. They differ only if `assembleResult` throws, and it is written defensively not to, so the allowance is used up only on success, as before. Every error path returns the same `HttpsError` as before.
9. **The rule "convert through the real function, never a reimplementation" turned up a real app bug.** That function decodes **a UTF-8 CSV without a BOM as Latin-1**, so `—` arrives as `â` and emoji as garbage. Google Sheets exports carry no BOM, so this is the app's own import path. The model coped on every emoji fixture (all passed), but it is reading corrupted text. It is not one of this pack's three fixes, so it is recorded here and deferred.

## Step 0 findings

- **(a) Firebase in the import chain:** yes. `src/lib/smartImport.ts` imports `firebase/functions` directly, so Phase 2 was needed.
- **(b) The request:** `claude-sonnet-4-6` (from `emailImportCore.MODEL`), `temperature: 0`, `max_tokens` 12,000.
- **(c) Sheets read:** one. `bufferToCsv` read `wb.SheetNames[0]` and nothing else.
- **(d) SheetJS:** npm `xlsx@0.18.5`, the community edition from the npm registry, not the SheetJS CDN.
- **Stop conditions:** none applied. The model call and `assembleResult` matched the pack's description, and `sheetCells.ts` exists.
- **Baseline gates:** both typechecks and the build were clean. Vitest: 588 files, 8,852 tests passed, 3 skipped. The run also logged one reporter RPC timeout, a known false red under load (no test failed).

## What each phase landed

| Phase | Commit | Landed | How it was verified |
|---|---|---|---|
| 1 · pure core `mapSheet` | `6d206bc7` | `functions/src/smartImportCore.ts`; the callable delegates to it | **code + unit.** Fake-client tests: success, prose then strict retry, truncated JSON not retried, API failure on either call. A lock checks the callable imports `mapSheet` and no longer calls `messages.create` itself. |
| 2 · Firebase-free conversion | `a71f990f` | `src/lib/sheetText.ts`, re-exported from `smartImport.ts` | **code + unit.** It imports only `xlsx` and `./sheetCells`, and the re-export is the same function object. |
| 3 · generator + 50 fixtures | `6789f11a` | `functions/eval/generate.ts`, `tests/fixtures/smart-eval/` (34 dev / 16 holdout, 17 expected to fail), `real/` gitignored | **code + unit.** Same seed gives byte-identical files; the committed files equal a fresh generation; one expected query per truth row; every knob covered. |
| 4 · scorer + runner | `500d4827`, `2dae3528` | `score.ts`, `run.ts`, `pricing.ts`; `--dry-run`, `--rescore`, `--runs N`, a $5 spend gate | **code + unit + measured.** The scorer goes red on each of the six named faults and was mutation-proved. A dry run with an oracle stub, through the real conversion and assembly, scores 100% on all 50 fixtures, and that is now a unit test. |
| 5 · baseline | `74c715f2` | `reports/smart-import-eval/2026-10-19T21-50-14-baseline/` | **measured** (34 dev fixtures, live) |
| 6 · conversion fixes | `708f4f97`, `4b85806a`, `a0ee164b` | every tab · merged cells · link targets | **measured.** Unit tests for each fix; a snapshot shows each changes only its own fixtures; a live re-run of those fixtures. |
| 7 · prompt caching | `f92dfc39` | system prompt as one block marked `cache_control: ephemeral` | **measured** (5 fixtures, run one at a time) |

Gates were green before every commit. At the last commit: both typechecks plus the eval's own, a clean `build:dev`, and Vitest at 593 files, 8,902 tests passed, 3 skipped.

## Baseline (dev split, one run each)

| | Field accuracy | Fixtures passed |
|---|---|---|
| Expected to pass (22) | **99.5%** (5,433 / 5,460) | **21 / 22** |
| Expected to fail (12) | 39.5% | 0 / 12 |

Spend $1.34 · median call 8.2 s · 2 calls over the callable's 90 s timeout.

Every field scored 99.2–99.6% on the fixtures expected to pass. The one that failed is `kitchen-csv-150`, and its raw output shows genuine model errors, not scorer artefacts:
- two rows with no agent name **fused into one**;
- two more **dropped** (147 of 150 rows came back);
- a bare `FULL` lost its `status-direction` flag;
- two "requested full ms …" notes were typed as *Full Sent* events.

That call also ran past the 90 s timeout.

**The worst three knobs** (by field accuracy):
1. **Size 300: 0.0%.** The reply truncates at the 12k output ceiling (`badjson`), and the call took 145 s.
2. **Tabs: 68–80%.** The other tabs' rows were simply never sent.
3. **One row per event: 72.1%.** Each event row becomes its own query, inventing 7–11 queries per fixture.

Among the knobs the model *can* handle, the costs are tiny. Every messiness knob scores 98.1–98.6%, and almost all of that loss comes from the one 150-row kitchen-sink fixture. Each knob passes everywhere else.

## Per-fix before and after (live, the fix's own dev fixtures)

| Fix | Fixture | Before → after | Rows dropped | Text coverage |
|---|---|---|---|---|
| 1 · every tab | `tabssplit-xlsx-50` | 68.0% ✗ → **100% ✓** | 16 → 0 | 84% → 100% |
| 1 · every tab | `tabsrej-xlsx-10` | 80.0% ✗ → 98.6% ✗ | 2 → 0 | 90% → 100% |
| 2 · merged cells | `merged-xlsx-50` | 90.3% ✗ → **100% ✓** | 0 → 0 | 100% → 100% |
| 3 · hyperlinks | `links-xlsx-10` | 87.5% ✗ → **100% ✓** | 0 → 0 | 67% → 100% |

`tabsrej-xlsx-10`'s one remaining error is a plain `No response` mapped to *Queried*. That row was right in the baseline. Rerun three times, it was right once and wrong twice: run-to-run variance in the model's status mapping at temperature 0 (most likely the prompt's "no reply yet → Queried" synonym), not the conversion.

No other fixture was re-run, because none of their converted text changed (snapshots before and after each fix). The holdout fixtures for these knobs (`tabscover-xlsx-10`, `merged-xlsx-10`, `links-xlsx-50`) were not run, as the pack says.

## Caching (Phase 7)

| Call (in order) | Cache write | Cache read | Uncached input |
|---|---|---|---|
| `clean-csv-10` | **2,314** | 0 | 267 |
| `preamble-csv-10` | 0 | **2,314** | 308 |
| `totals-csv-10` | 0 | **2,314** | 269 |
| `agentnotes-csv-10` | 0 | **2,314** | 273 |
| `slang-csv-10` | 0 | **2,314** | 255 |

All five still pass. Those five fixtures cost **$0.0789** in the baseline and **$0.0556** cached (−30%). Each warm call saves about $0.006 on input; output tokens, which caching cannot touch, are now most of the cost. The change reaches production through the callable, which makes the same request. The cache only helps imports that land within five minutes of one another.

## Spend

| Run | Spend |
|---|---|
| Baseline, first run (discarded) | $1.35 |
| Baseline (committed) | $1.34 |
| Fix 1, 2, 3 and cache re-runs, and the 3× variance check | $0.24 |
| **Total** | **≈ $2.92** |

Prices live in `functions/eval/pricing.ts`: Sonnet 4.6 at $3 / $15 per MTok, cache write 1.25×, cache read 0.1×, taken from the claude-api skill's table cached on 6 Oct. **Check them against the live pricing page before trusting a cost.**

## The SheetJS colour finding

`xlsx@0.18.5` **can read fill colours**, but only when the read passes `cellStyles: true`. The app's reader (`SHEET_READ_OPTS`) does not, so today every colour is lost.
- With `cellStyles: true`, a solid fill comes back as `cell.s = { patternType: "solid", fgColor: { rgb: "FF0000" } }`.
- Theme colours come back as `{ theme, tint }` and would need resolving against `xl/theme/theme1.xml`.
- A styled cell with no value is only present if the sheet XML writes it, so a coloured but empty status cell can be missing altogether.
- The community edition cannot *write* fills, so the colour fixtures patch `xl/styles.xml` inside the generator.

In the baseline the colour fixtures score 88.6% and 94.0%: every status falls back to *Queried*, and every other field is still right.

## Deferred — for the next prompt

1. **Colour.** Read with `cellStyles: true`, resolve theme colours, and give the model the colour plus the sheet's own legend. This is a conversion change and is measurable with `colour-*`.
2. **UTF-8 CSV without a BOM decodes as Latin-1** (premise 9). A conversion change that affects real writers' files.
3. **Events and wide layouts.** The output contract has no way to say "one query, several rows" or "a column per stage"; these need the events contract or a prompt change. Measure with `events-*` and `wide-*`.
4. **Size: chunking, and the 90 s timeout.** 300 rows truncate, and anything near 150 messy rows already runs past the callable's timeout. Measure with `size-*` and `kitchen-*-150`.
5. **Model behaviour on long messy sheets** (prompt work): rows fused or dropped where several have no name, "No response" wavering between runs, and note events typed as the wrong stage.
6. **US date order.** The parser reads an ambiguous `04/05` the British way and infers nothing from the rest of the file (`usdates-csv-10`, 98.6%).
7. **Holdout.** Not run in this pack: 16 fixtures, about $0.95 estimated.
8. **Real trackers.** `tests/fixtures/smart-eval/real/` is ready and gitignored, but holds none yet.
9. **`firebase.json` uploads `functions/eval/` with the functions source** (no `ignore` list). It is harmless, since nothing loads it at runtime, but it is not production code. Adding `"ignore": ["eval", …]` is yours, since `firebase.json` is outside this pack.

## How to run it

```
npx tsx functions/eval/run.ts --split dev                        # live; prints the estimate first, refuses above $5 without --confirm-spend
npx tsx functions/eval/run.ts --dry-run --split all              # free: proves conversion, assembly and scoring
npx tsx functions/eval/run.ts --only "kitchen-*" --runs 3        # repeat runs report which fields disagreed
npx tsx functions/eval/run.ts --rescore reports/smart-import-eval/<dir>   # re-score saved results, free
npx tsx functions/eval/snapshot.ts out.json [before.json]        # which fixtures' converted text a change touched
npx tsx functions/eval/compare.ts <before dir> <after dir>       # before/after per fixture
npx tsx functions/eval/generate.ts                               # regenerate the fixtures (deterministic)
```
