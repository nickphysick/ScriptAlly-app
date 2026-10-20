# Smart Import evaluation — 2026-10-19T21-54-19 (fix1-tabsrej-x3)

Model `claude-sonnet-4-6` · split **dev** · runs per fixture **3** · live model calls
Fixtures: 1 synthetic + 0 real (real files are counted, never printed).

## Headline

| | Field accuracy | Fixtures passed |
|---|---|---|
| Expected to pass (0) | **—** (0/0) | **0/0** |
| Expected to fail (1) | 100.0% (70/70) | 1/1 |
| All (1) | 100.0% | 1/1 |

Total spend: **$0.0473** · tokens in 7806 · out 1591 · cache read 0 · cache write 0
Time per call: median 5811 ms · max 5975 ms
Calls slower than the callable's 90 s timeout: **0**

## By field (expected-to-pass fixtures, first run)

| Field | Accuracy | Correct / compared |
|---|---|---|

## By knob — which messiness costs most

Every fixture carrying the knob, first run, worst first. `(no knobs)` is the clean reference.

| Knob | Fixtures | Field accuracy | Passed | Expected to fail |
|---|---|---|---|---|
| layout:tabsRejections | 1 | 100.0% | 1/1 | 1 |
| tabs | 1 | 100.0% | 1/1 | 1 |

## By size (data rows)

| Rows | Fixtures | Field accuracy | Passed |
|---|---|---|---|
| 10 | 1 | 100.0% | 1/1 |

## Expected-to-fail fixtures — what actually happened

| Fixture | Why it is expected to fail | Outcome | Accuracy | Dropped | Invented |
|---|---|---|---|---|---|
| tabsrej-xlsx-10 | rejections live on their own tab, with no status column, which the conversion never reads | **passed** | 100.0% | 0 | 0 |

## Every fixture (first run)

| Fixture | Split | Pass | Accuracy | Dropped | Invented | Ambig. | Wrong fields | Coverage | In | Out | Cache r/w | Cost | ms | Tries | Failure |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tabsrej-xlsx-10 ⚠︎ | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 2602 | 533 | 0/0 | $0.0158 | 5975 | 1 |  |

⚠︎ = expected to fail. Coverage = share of the expected agent names, agencies and websites present in the converted text at all (a conversion measure; free).

## Run-to-run disagreements

| Fixture | Fields that changed between runs |
|---|---|
| tabsrej-xlsx-10 | status (q10 Felix Doyle / Ashgrove Management) |

## Wrong fields (first run, up to 6 per fixture; full list in results.json)

