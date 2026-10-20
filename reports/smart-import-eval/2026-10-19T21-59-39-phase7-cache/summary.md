# Smart Import evaluation — 2026-10-19T21-59-39 (phase7-cache)

Model `claude-sonnet-4-6` · split **dev** · runs per fixture **1** · live model calls
Fixtures: 5 synthetic + 0 real (real files are counted, never printed).

## Headline

| | Field accuracy | Fixtures passed |
|---|---|---|
| Expected to pass (5) | **100.0%** (350/350) | **5/5** |
| Expected to fail (0) | — (0/0) | 0/0 |
| All (5) | 100.0% | 5/5 |

Total spend: **$0.0556** · tokens in 1372 · out 2670 · cache read 9256 · cache write 2314
Time per call: median 5849 ms · max 6982 ms
Calls slower than the callable's 90 s timeout: **0**

## By field (expected-to-pass fixtures, first run)

| Field | Accuracy | Correct / compared |
|---|---|---|
| agentName | 100.0% | 50/50 |
| agency | 100.0% | 50/50 |
| status | 100.0% | 50/50 |
| sentDate | 100.0% | 50/50 |
| timeline | 100.0% | 50/50 |
| reasonsMissing | 100.0% | 50/50 |
| reasonsSpurious | 100.0% | 50/50 |

## By knob — which messiness costs most

Every fixture carrying the knob, first run, worst first. `(no knobs)` is the clean reference.

| Knob | Fixtures | Field accuracy | Passed | Expected to fail |
|---|---|---|---|---|
| (no knobs) | 1 | 100.0% | 1/1 | 0 |
| preamble | 1 | 100.0% | 1/1 | 0 |
| totals | 1 | 100.0% | 1/1 | 0 |
| agentNotes | 1 | 100.0% | 1/1 | 0 |
| slang | 1 | 100.0% | 1/1 | 0 |

## By size (data rows)

| Rows | Fixtures | Field accuracy | Passed |
|---|---|---|---|
| 10 | 5 | 100.0% | 5/5 |

## Expected-to-fail fixtures — what actually happened

| Fixture | Why it is expected to fail | Outcome | Accuracy | Dropped | Invented |
|---|---|---|---|---|---|

## Every fixture (first run)

| Fixture | Split | Pass | Accuracy | Dropped | Invented | Ambig. | Wrong fields | Coverage | In | Out | Cache r/w | Cost | ms | Tries | Failure |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| clean-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 267 | 520 | 0/2314 | $0.0173 | 5680 | 1 |  |
| preamble-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 308 | 544 | 2314/0 | $0.0098 | 6207 | 1 |  |
| totals-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 269 | 493 | 2314/0 | $0.0089 | 5849 | 1 |  |
| agentnotes-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 273 | 598 | 2314/0 | $0.0105 | 6982 | 1 |  |
| slang-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 255 | 515 | 2314/0 | $0.0092 | 5843 | 1 |  |

⚠︎ = expected to fail. Coverage = share of the expected agent names, agencies and websites present in the converted text at all (a conversion measure; free).

## Wrong fields (first run, up to 6 per fixture; full list in results.json)

