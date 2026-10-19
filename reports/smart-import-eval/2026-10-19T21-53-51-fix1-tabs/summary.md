# Smart Import evaluation — 2026-10-19T21-53-51 (fix1-tabs)

Model `claude-sonnet-4-6` · split **dev** · runs per fixture **1** · live model calls
Fixtures: 2 synthetic + 0 real (real files are counted, never printed).

## Headline

| | Field accuracy | Fixtures passed |
|---|---|---|
| Expected to pass (0) | **—** (0/0) | **0/0** |
| Expected to fail (2) | 99.8% (419/420) | 1/2 |
| All (2) | 99.8% | 1/2 |

Total spend: **$0.0645** · tokens in 6201 · out 3059 · cache read 0 · cache write 0
Time per call: median 28799 ms · max 28799 ms
Calls slower than the callable's 90 s timeout: **0**

## By field (expected-to-pass fixtures, first run)

| Field | Accuracy | Correct / compared |
|---|---|---|

## By knob — which messiness costs most

Every fixture carrying the knob, first run, worst first. `(no knobs)` is the clean reference.

| Knob | Fixtures | Field accuracy | Passed | Expected to fail |
|---|---|---|---|---|
| layout:tabsRejections | 1 | 98.6% | 0/1 | 1 |
| tabs | 2 | 99.8% | 1/2 | 2 |
| layout:tabsSplit | 1 | 100.0% | 1/1 | 1 |

## By size (data rows)

| Rows | Fixtures | Field accuracy | Passed |
|---|---|---|---|
| 10 | 1 | 98.6% | 0/1 |
| 50 | 1 | 100.0% | 1/1 |

## Expected-to-fail fixtures — what actually happened

| Fixture | Why it is expected to fail | Outcome | Accuracy | Dropped | Invented |
|---|---|---|---|---|---|
| tabssplit-xlsx-50 | closed queries live on an Archive tab the conversion never reads | **passed** | 100.0% | 0 | 0 |
| tabsrej-xlsx-10 | rejections live on their own tab, with no status column, which the conversion never reads | mapped | 98.6% | 0 | 0 |

## Every fixture (first run)

| Fixture | Split | Pass | Accuracy | Dropped | Invented | Ambig. | Wrong fields | Coverage | In | Out | Cache r/w | Cost | ms | Tries | Failure |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tabssplit-xlsx-50 ⚠︎ | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 3599 | 2525 | 0/0 | $0.0487 | 28799 | 1 |  |
| tabsrej-xlsx-10 ⚠︎ | dev | ✗ | 98.6% | 0 | 0 | 0 | 1 | 100.0% | 2602 | 534 | 0/0 | $0.0158 | 6466 | 1 |  |

⚠︎ = expected to fail. Coverage = share of the expected agent names, agencies and websites present in the converted text at all (a conversion measure; free).

## Wrong fields (first run, up to 6 per fixture; full list in results.json)

### tabsrej-xlsx-10
- q10 Felix Doyle / Ashgrove Management · **status** · expected `"No Response"` · got `"Queried"`

