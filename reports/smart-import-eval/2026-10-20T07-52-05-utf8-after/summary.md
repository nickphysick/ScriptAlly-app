# Smart Import evaluation — 2026-10-20T07-52-05 (utf8-after)

Model `claude-sonnet-4-6` · split **dev** · runs per fixture **1** · live model calls
Fixtures: 2 synthetic + 0 real (real files are counted, never printed).

## Headline

| | Field accuracy | Fixtures passed |
|---|---|---|
| Expected to pass (2) | **100.0%** (420/420) | **2/2** |
| Expected to fail (0) | — (0/0) | 0/0 |
| All (2) | 100.0% | 2/2 |

Total spend: **$0.0570** · tokens in 1837 · out 3339 · cache read 4628 · cache write 0
Time per call: median 29465 ms · max 29465 ms
Calls slower than the callable's 90 s timeout: **0**

## By field (expected-to-pass fixtures, first run)

| Field | Accuracy | Correct / compared |
|---|---|---|
| agentName | 100.0% | 60/60 |
| agency | 100.0% | 60/60 |
| status | 100.0% | 60/60 |
| sentDate | 100.0% | 60/60 |
| timeline | 100.0% | 60/60 |
| reasonsMissing | 100.0% | 60/60 |
| reasonsSpurious | 100.0% | 60/60 |

## By knob — which messiness costs most

Every fixture carrying the knob, first run, worst first. `(no knobs)` is the clean reference.

| Knob | Fixtures | Field accuracy | Passed | Expected to fail |
|---|---|---|---|---|
| accents | 2 | 100.0% | 2/2 | 0 |

## By size (data rows)

| Rows | Fixtures | Field accuracy | Passed |
|---|---|---|---|
| 10 | 1 | 100.0% | 1/1 |
| 50 | 1 | 100.0% | 1/1 |

## Expected-to-fail fixtures — what actually happened

| Fixture | Why it is expected to fail | Outcome | Accuracy | Dropped | Invented |
|---|---|---|---|---|---|

## Every fixture (first run)

| Fixture | Split | Pass | Accuracy | Dropped | Invented | Ambig. | Wrong fields | Coverage | In | Out | Cache r/w | Cost | ms | Tries | Failure |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| utf8-nobom-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 317 | 558 | 2314/0 | $0.0100 | 6029 | 1 |  |
| utf8-nobom-csv-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 1520 | 2781 | 2314/0 | $0.0470 | 29465 | 1 |  |

⚠︎ = expected to fail. Coverage = share of the expected agent names, agencies and websites present in the converted text at all (a conversion measure; free).

## Wrong fields (first run, up to 6 per fixture; full list in results.json)

