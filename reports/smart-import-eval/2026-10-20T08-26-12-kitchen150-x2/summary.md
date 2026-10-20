# Smart Import evaluation — 2026-10-20T08-26-12 (kitchen150-x2)

Model `claude-sonnet-4-6` · split **dev** · runs per fixture **2** · live model calls
Fixtures: 1 synthetic + 0 real (real files are counted, never printed).

## Headline

| | Field accuracy | Fixtures passed |
|---|---|---|
| Expected to pass (1) | **99.7%** (1047/1050) | **0/1** |
| Expected to fail (0) | — (0/0) | 0/0 |
| All (1) | 99.7% | 0/1 |

Total spend: **$0.2588** · tokens in 8364 · out 15488 · cache read 4628 · cache write 0
Time per call: median 104388 ms · max 104388 ms
Calls slower than the callable's 300 s timeout: **0**

## By field (expected-to-pass fixtures, first run)

| Field | Accuracy | Correct / compared |
|---|---|---|
| agentName | 100.0% | 150/150 |
| agency | 100.0% | 150/150 |
| status | 100.0% | 150/150 |
| sentDate | 100.0% | 150/150 |
| timeline | 100.0% | 150/150 |
| reasonsMissing | 98.7% | 148/150 |
| reasonsSpurious | 99.3% | 149/150 |

## By knob — which messiness costs most

Every fixture carrying the knob, first run, worst first. `(no knobs)` is the clean reference.

| Knob | Fixtures | Field accuracy | Passed | Expected to fail |
|---|---|---|---|---|
| preamble | 1 | 99.7% | 0/1 | 0 |
| dupHeader | 1 | 99.7% | 0/1 | 0 |
| totals | 1 | 99.7% | 0/1 | 0 |
| blankRows | 1 | 99.7% | 0/1 | 0 |
| placeholders | 1 | 99.7% | 0/1 | 0 |
| agentNotes | 1 | 99.7% | 0/1 | 0 |
| slang | 1 | 99.7% | 0/1 | 0 |
| dateStyles | 1 | 99.7% | 0/1 | 0 |
| notesDates | 1 | 99.7% | 0/1 | 0 |
| whitespace | 1 | 99.7% | 0/1 | 0 |
| emoji | 1 | 99.7% | 0/1 | 0 |

## By size (data rows)

| Rows | Fixtures | Field accuracy | Passed |
|---|---|---|---|
| 150 | 1 | 99.7% | 0/1 |

## Expected-to-fail fixtures — what actually happened

| Fixture | Why it is expected to fail | Outcome | Accuracy | Dropped | Invented |
|---|---|---|---|---|---|

## Every fixture (first run)

| Fixture | Split | Pass | Accuracy | Dropped | Invented | Ambig. | Wrong fields | Coverage | In | Out | Cache r/w | Cost | First token ms | ms | Tries | Failure |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| kitchen-csv-150 | dev | ✗ | 99.7% | 0 | 0 | 0 | 3 | 89.3% | 4182 | 7797 | 2314/0 | $0.1302 | 2245 | 104388 | 1 |  |

⚠︎ = expected to fail. Coverage = share of the expected agent names, agencies and websites present in the converted text at all (a conversion measure; free).

## Run-to-run disagreements

| Fixture | Fields that changed between runs |
|---|---|
| kitchen-csv-150 | status (q15 (no name) / (no agency)); reasonsMissing (q15 (no name) / (no agency)); timeline (q121 Rosalind Nkemelu / Penfallow Literary); timeline (q126 Nadia Penrose / Quill Partners) |

## Wrong fields (first run, up to 6 per fixture; full list in results.json)

### kitchen-csv-150
- q3 (no name) / Juniper Management · **reasonsMissing** · expected `["check-name"]` · got `["check-name"]`
- q3 (no name) / Juniper Management · **reasonsSpurious** · expected `[]` · got `["needs-identifying"]`
- q15 (no name) / (no agency) · **reasonsMissing** · expected `["needs-identifying","status-direction"]` · got `["status-direction"]`

