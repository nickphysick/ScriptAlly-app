# Smart Import evaluation — 2026-10-20T07-57-37 (size-sweep)

Model `claude-sonnet-4-6` · split **dev** · runs per fixture **1** · live model calls
Fixtures: 5 synthetic + 0 real (real files are counted, never printed).

## Headline

| | Field accuracy | Fixtures passed |
|---|---|---|
| Expected to pass (4) | **99.2%** (5206/5250) | **3/4** |
| Expected to fail (1) | 100.0% (2100/2100) | 1/1 |
| All (5) | 99.4% | 4/5 |

Total spend: **$0.8862** · tokens in 26689 · out 52978 · cache read 9256 · cache write 2314
Time per call: median 116682 ms · max 181124 ms
Calls slower than the callable's 90 s timeout: **4** (kitchen-csv-150, size-csv-300, size-csv-200, size-csv-250) — in production these fail with an error, whatever the model returned; the scores above do not count that

## By field (expected-to-pass fixtures, first run)

| Field | Accuracy | Correct / compared |
|---|---|---|
| agentName | 99.9% | 749/750 |
| agency | 99.9% | 749/750 |
| status | 99.1% | 743/750 |
| sentDate | 98.5% | 739/750 |
| timeline | 98.9% | 742/750 |
| reasonsMissing | 99.1% | 743/750 |
| reasonsSpurious | 98.8% | 741/750 |

## By knob — which messiness costs most

Every fixture carrying the knob, first run, worst first. `(no knobs)` is the clean reference.

| Knob | Fixtures | Field accuracy | Passed | Expected to fail |
|---|---|---|---|---|
| preamble | 1 | 95.8% | 0/1 | 0 |
| dupHeader | 1 | 95.8% | 0/1 | 0 |
| totals | 1 | 95.8% | 0/1 | 0 |
| blankRows | 1 | 95.8% | 0/1 | 0 |
| placeholders | 1 | 95.8% | 0/1 | 0 |
| agentNotes | 1 | 95.8% | 0/1 | 0 |
| slang | 1 | 95.8% | 0/1 | 0 |
| dateStyles | 1 | 95.8% | 0/1 | 0 |
| notesDates | 1 | 95.8% | 0/1 | 0 |
| whitespace | 1 | 95.8% | 0/1 | 0 |
| emoji | 1 | 95.8% | 0/1 | 0 |
| size:150 | 1 | 100.0% | 1/1 | 0 |
| size:300 | 1 | 100.0% | 1/1 | 1 |
| size:200 | 1 | 100.0% | 1/1 | 0 |
| size:250 | 1 | 100.0% | 1/1 | 0 |

## By size (data rows)

| Rows | Fixtures | Field accuracy | Passed |
|---|---|---|---|
| 150 | 2 | 97.9% | 1/2 |
| 200 | 1 | 100.0% | 1/1 |
| 250 | 1 | 100.0% | 1/1 |
| 300 | 1 | 100.0% | 1/1 |

## Expected-to-fail fixtures — what actually happened

| Fixture | Why it is expected to fail | Outcome | Accuracy | Dropped | Invented |
|---|---|---|---|---|---|
| size-csv-300 | 300 queries need ~15k output tokens against the 12k ceiling; the reply truncates | **passed** | 100.0% | 0 | 0 |

## Every fixture (first run)

| Fixture | Split | Pass | Accuracy | Dropped | Invented | Ambig. | Wrong fields | Coverage | In | Out | Cache r/w | Cost | ms | Tries | Failure |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| kitchen-csv-150 | dev | ✗ | 95.8% | 1 | 0 | 1 | 37 | 89.3% | 4162 | 7845 | 0/2314 | $0.1388 | 105158 | 1 |  |
| size-csv-150 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 3744 | 7538 | 2314/0 | $0.1250 | 89629 | 1 |  |
| size-csv-300 ⚠︎ | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 7531 | 15034 | 2314/0 | $0.2488 | 181124 | 1 |  |
| size-csv-200 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 4952 | 9933 | 2314/0 | $0.1645 | 116682 | 1 |  |
| size-csv-250 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 6300 | 12628 | 2314/0 | $0.2090 | 149259 | 1 |  |

⚠︎ = expected to fail. Coverage = share of the expected agent names, agencies and websites present in the converted text at all (a conversion measure; free).

## Wrong fields (first run, up to 6 per fixture; full list in results.json)

### kitchen-csv-150
- dropped: q28 (no name) / (no agency)
- ambiguous: q17 (no name) / (no agency)
- q15 (no name) / (no agency) · **timeline** · expected `[]` · got `[{"type":"Full Requested","date":"2024-03-16"}]`
- q15 (no name) / (no agency) · **reasonsSpurious** · expected `[]` · got `["two-dates"]`
- q17 (no name) / (no agency) · **sentDate** · expected `"2024-06-09"` · got `"2024-04-12"`
- q17 (no name) / (no agency) · **timeline** · expected `[{"type":"Full Requested","date":"2024-06-16"}]` · got `[]`
- q17 (no name) / (no agency) · **reasonsMissing** · expected `["needs-identifying","two-dates"]` · got `["needs-identifying","two-dates"]`
- q17 (no name) / (no agency) · **reasonsSpurious** · expected `[]` · got `["check-name"]`

