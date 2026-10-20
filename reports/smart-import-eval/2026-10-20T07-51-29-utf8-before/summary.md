# Smart Import evaluation — 2026-10-20T07-51-29 (utf8-before)

Model `claude-sonnet-4-6` · split **dev** · runs per fixture **1** · live model calls
Fixtures: 2 synthetic + 0 real (real files are counted, never printed).

## Headline

| | Field accuracy | Fixtures passed |
|---|---|---|
| Expected to pass (2) | **92.6%** (389/420) | **0/2** |
| Expected to fail (0) | — (0/0) | 0/0 |
| All (2) | 92.6% | 0/2 |

Total spend: **$0.0604** · tokens in 2634 · out 3405 · cache read 4628 · cache write 0
Time per call: median 34992 ms · max 34992 ms
Calls slower than the callable's 90 s timeout: **0**

## By field (expected-to-pass fixtures, first run)

| Field | Accuracy | Correct / compared |
|---|---|---|
| agentName | 93.3% | 56/60 |
| agency | 55.0% | 33/60 |
| status | 100.0% | 60/60 |
| sentDate | 100.0% | 60/60 |
| timeline | 100.0% | 60/60 |
| reasonsMissing | 100.0% | 60/60 |
| reasonsSpurious | 100.0% | 60/60 |

## By knob — which messiness costs most

Every fixture carrying the knob, first run, worst first. `(no knobs)` is the clean reference.

| Knob | Fixtures | Field accuracy | Passed | Expected to fail |
|---|---|---|---|---|
| accents | 2 | 92.6% | 0/2 | 0 |

## By size (data rows)

| Rows | Fixtures | Field accuracy | Passed |
|---|---|---|---|
| 10 | 1 | 97.1% | 0/1 |
| 50 | 1 | 91.7% | 0/1 |

## Expected-to-fail fixtures — what actually happened

| Fixture | Why it is expected to fail | Outcome | Accuracy | Dropped | Invented |
|---|---|---|---|---|---|

## Every fixture (first run)

| Fixture | Split | Pass | Accuracy | Dropped | Invented | Ambig. | Wrong fields | Coverage | In | Out | Cache r/w | Cost | ms | Tries | Failure |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| utf8-nobom-csv-10 | dev | ✗ | 97.1% | 0 | 0 | 0 | 2 | 0.0% | 438 | 556 | 2314/0 | $0.0103 | 7055 | 1 |  |
| utf8-nobom-csv-50 | dev | ✗ | 91.7% | 0 | 0 | 0 | 29 | 0.0% | 2196 | 2849 | 2314/0 | $0.0500 | 34992 | 1 |  |

⚠︎ = expected to fail. Coverage = share of the expected agent names, agencies and websites present in the converted text at all (a conversion measure; free).

## Wrong fields (first run, up to 6 per fixture; full list in results.json)

### utf8-nobom-csv-10
- q3 Noémie Øvergaard / Højgaard Agency · **agentName** · expected `"Noémie Øvergaard"` · got `"Noémie Övergaard"`
- q6 Renée Øvergaard / Peñafiel & Søn · **agentName** · expected `"Renée Øvergaard"` · got `"Renée Övergaard"`

### utf8-nobom-csv-50
- q1 Björn Llwyd-Jönsson / Ó Riordáin Associés · **agency** · expected `"Ó Riordáin Associés"` · got `"Å RiordÃ¡in AssociÃ©s"`
- q2 Ömer Çelik / Højgaard Associés · **agency** · expected `"Højgaard Associés"` · got `"Højgaard AssociÃ©s"`
- q3 Inés Wiśniewska / Mëller Partners · **agency** · expected `"Mëller Partners"` · got `"Müller Partners"`
- q4 Søren Ó Briain / Mëller Literary · **agency** · expected `"Mëller Literary"` · got `"Müller Literary"`
- q5 François Gonçalves / Città Associés · **agency** · expected `"Città Associés"` · got `"Città AssociÃ©s"`
- q7 Dagný Beaulé / Mëller Literary · **agency** · expected `"Mëller Literary"` · got `"Müller Literary"`

