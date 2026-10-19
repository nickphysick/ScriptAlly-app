# Smart Import evaluation — 2026-10-19T21-56-39 (fix2-merged)

Model `claude-sonnet-4-6` · split **dev** · runs per fixture **1** · live model calls
Fixtures: 1 synthetic + 0 real (real files are counted, never printed).

## Headline

| | Field accuracy | Fixtures passed |
|---|---|---|
| Expected to pass (0) | **—** (0/0) | **0/0** |
| Expected to fail (1) | 100.0% (350/350) | 1/1 |
| All (1) | 100.0% | 1/1 |

Total spend: **$0.0485** · tokens in 3579 · out 2516 · cache read 0 · cache write 0
Time per call: median 27740 ms · max 27740 ms
Calls slower than the callable's 90 s timeout: **0**

## By field (expected-to-pass fixtures, first run)

| Field | Accuracy | Correct / compared |
|---|---|---|

## By knob — which messiness costs most

Every fixture carrying the knob, first run, worst first. `(no knobs)` is the clean reference.

| Knob | Fixtures | Field accuracy | Passed | Expected to fail |
|---|---|---|---|---|
| layout:merged | 1 | 100.0% | 1/1 | 1 |
| merged | 1 | 100.0% | 1/1 | 1 |

## By size (data rows)

| Rows | Fixtures | Field accuracy | Passed |
|---|---|---|---|
| 50 | 1 | 100.0% | 1/1 |

## Expected-to-fail fixtures — what actually happened

| Fixture | Why it is expected to fail | Outcome | Accuracy | Dropped | Invented |
|---|---|---|---|---|---|
| merged-xlsx-50 | the agency is a merged range; only its top cell carries the value | **passed** | 100.0% | 0 | 0 |

## Every fixture (first run)

| Fixture | Split | Pass | Accuracy | Dropped | Invented | Ambig. | Wrong fields | Coverage | In | Out | Cache r/w | Cost | ms | Tries | Failure |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| merged-xlsx-50 ⚠︎ | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 3579 | 2516 | 0/0 | $0.0485 | 27740 | 1 |  |

⚠︎ = expected to fail. Coverage = share of the expected agent names, agencies and websites present in the converted text at all (a conversion measure; free).

## Wrong fields (first run, up to 6 per fixture; full list in results.json)

