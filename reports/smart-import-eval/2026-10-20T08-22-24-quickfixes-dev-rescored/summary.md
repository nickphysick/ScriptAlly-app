> Re-scored from `reports/smart-import-eval/2026-10-20T08-22-24-quickfixes-dev` with the current scorer — no model calls.

# Smart Import evaluation — 2026-10-20T08-22-24 (quickfixes-dev)

Model `claude-sonnet-4-6` · split **dev** · runs per fixture **1** · live model calls
Fixtures: 38 synthetic + 0 real (real files are counted, never printed).

## Headline

| | Field accuracy | Fixtures passed |
|---|---|---|
| Expected to pass (27) | **99.6%** (11086/11130) | **26/27** |
| Expected to fail (11) | 92.1% (1750/1900) | 3/11 |
| All (38) | 98.5% | 29/38 |

Total spend: **$1.6407** · tokens in 49644 · out 97159 · cache read 85618 · cache write 2314
Time per call: median 9688 ms · max 179943 ms
Calls slower than the callable's 300 s timeout: **0**

## By field (expected-to-pass fixtures, first run)

| Field | Accuracy | Correct / compared |
|---|---|---|
| agentName | 99.9% | 1589/1590 |
| agency | 99.9% | 1589/1590 |
| status | 99.5% | 1582/1590 |
| sentDate | 99.3% | 1579/1590 |
| timeline | 99.7% | 1585/1590 |
| reasonsMissing | 99.4% | 1581/1590 |
| reasonsSpurious | 99.4% | 1581/1590 |

## By knob — which messiness costs most

Every fixture carrying the knob, first run, worst first. `(no knobs)` is the clean reference.

| Knob | Fixtures | Field accuracy | Passed | Expected to fail |
|---|---|---|---|---|
| layout:events | 2 | 72.1% | 0/2 | 2 |
| layout:wide | 2 | 81.0% | 0/2 | 2 |
| layout:colour | 2 | 93.1% | 0/2 | 2 |
| colour | 2 | 93.1% | 0/2 | 2 |
| blankRows | 2 | 96.9% | 1/2 | 0 |
| dupHeader | 3 | 97.0% | 2/3 | 0 |
| totals | 3 | 97.0% | 2/3 | 0 |
| placeholders | 3 | 97.0% | 2/3 | 0 |
| whitespace | 3 | 97.0% | 2/3 | 0 |
| emoji | 3 | 97.0% | 2/3 | 0 |
| preamble | 4 | 97.6% | 3/4 | 0 |
| agentNotes | 4 | 97.6% | 3/4 | 0 |
| slang | 4 | 97.6% | 3/4 | 0 |
| dateStyles | 4 | 97.6% | 3/4 | 0 |
| notesDates | 4 | 97.6% | 3/4 | 0 |
| usDates | 1 | 98.6% | 0/1 | 1 |
| layout:tabsRejections | 1 | 98.6% | 0/1 | 1 |
| tabs | 2 | 99.8% | 1/2 | 2 |
| (no knobs) | 2 | 100.0% | 2/2 | 0 |
| serials | 1 | 100.0% | 1/1 | 0 |
| unusualColumns | 2 | 100.0% | 2/2 | 0 |
| size:150 | 1 | 100.0% | 1/1 | 0 |
| size:300 | 1 | 100.0% | 1/1 | 0 |
| layout:tabsSplit | 1 | 100.0% | 1/1 | 1 |
| layout:merged | 1 | 100.0% | 1/1 | 1 |
| merged | 1 | 100.0% | 1/1 | 1 |
| layout:links | 1 | 100.0% | 1/1 | 1 |
| links | 1 | 100.0% | 1/1 | 1 |
| size:200 | 1 | 100.0% | 1/1 | 0 |
| size:250 | 1 | 100.0% | 1/1 | 0 |
| accents | 2 | 100.0% | 2/2 | 0 |

## By size (data rows)

| Rows | Fixtures | Field accuracy | Passed |
|---|---|---|---|
| 10 | 21 | 96.3% | 15/21 |
| 50 | 12 | 97.7% | 10/12 |
| 150 | 2 | 97.9% | 1/2 |
| 200 | 1 | 100.0% | 1/1 |
| 250 | 1 | 100.0% | 1/1 |
| 300 | 1 | 100.0% | 1/1 |

## Expected-to-fail fixtures — what actually happened

| Fixture | Why it is expected to fail | Outcome | Accuracy | Dropped | Invented |
|---|---|---|---|---|---|
| usdates-csv-10 | the date parser reads an ambiguous dd/mm the British way and infers no file-level order, so a US writer's 04/05 is read as 4 May | mapped | 98.6% | 0 | 0 |
| events-csv-10 | one row per EVENT: the prompt maps every row to its own query, so one query becomes several | mapped | 65.7% | 0 | 11 |
| events-xlsx-10 | one row per EVENT: the prompt maps every row to its own query, so one query becomes several | mapped | 78.6% | 0 | 7 |
| wide-csv-10 | a column per stage date: the contract takes the sent date from one column and events only from notes | mapped | 91.4% | 0 | 0 |
| wide-xlsx-50 | a column per stage date: the contract takes the sent date from one column and events only from notes | mapped | 78.9% | 0 | 0 |
| tabssplit-xlsx-50 | closed queries live on an Archive tab the conversion never reads | **passed** | 100.0% | 0 | 0 |
| tabsrej-xlsx-10 | rejections live on their own tab, with no status column, which the conversion never reads | mapped | 98.6% | 0 | 0 |
| merged-xlsx-50 | the agency is a merged range; only its top cell carries the value | **passed** | 100.0% | 0 | 0 |
| links-xlsx-10 | the website is only the agent name's link target, which the conversion drops | **passed** | 100.0% | 0 | 0 |
| colour-xlsx-10 | the status column is empty and a fill colour carries the status; the conversion drops colour | mapped | 88.6% | 0 | 0 |
| colour-xlsx-50 | the status column is empty and a fill colour carries the status; the conversion drops colour | mapped | 94.0% | 0 | 0 |

## Every fixture (first run)

| Fixture | Split | Pass | Accuracy | Dropped | Invented | Ambig. | Wrong fields | Coverage | In | Out | Cache r/w | Cost | First token ms | ms | Tries | Failure |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| clean-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 267 | 520 | 0/2314 | $0.0173 | 1625 | 6287 | 1 |  |
| clean-xlsx-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 262 | 513 | 2314/0 | $0.0092 | 894 | 5529 | 1 |  |
| preamble-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 308 | 544 | 2314/0 | $0.0098 | 1047 | 6031 | 1 |  |
| preamble-xlsx-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 1291 | 2510 | 2314/0 | $0.0422 | 1107 | 27540 | 1 |  |
| dupheader-xlsx-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 281 | 523 | 2314/0 | $0.0094 | 1261 | 5989 | 1 |  |
| totals-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 269 | 493 | 2314/0 | $0.0089 | 1965 | 6473 | 1 |  |
| placeholders-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 290 | 530 | 2314/0 | $0.0095 | 3254 | 7783 | 1 |  |
| agentnotes-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 273 | 598 | 2314/0 | $0.0105 | 966 | 6742 | 1 |  |
| agentnotes-csv-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 1213 | 2563 | 2314/0 | $0.0428 | 758 | 25740 | 1 |  |
| slang-csv-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 1252 | 2531 | 2314/0 | $0.0424 | 988 | 26663 | 1 |  |
| slang-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 255 | 515 | 2314/0 | $0.0092 | 2186 | 6911 | 1 |  |
| datestyles-csv-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 1181 | 2409 | 2314/0 | $0.0404 | 1120 | 26144 | 1 |  |
| datestyles-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 251 | 494 | 2314/0 | $0.0089 | 804 | 5166 | 1 |  |
| serials-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 225 | 470 | 2314/0 | $0.0084 | 794 | 4995 | 1 |  |
| usdates-csv-10 ⚠︎ | dev | ✗ | 98.6% | 0 | 0 | 0 | 1 | 100.0% | 266 | 511 | 2314/0 | $0.0092 | 563 | 5318 | 1 |  |
| notesdates-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 285 | 563 | 2314/0 | $0.0100 | 1419 | 6519 | 1 |  |
| notesdates-csv-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 1319 | 2703 | 2314/0 | $0.0452 | 1737 | 29378 | 1 |  |
| whitespace-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 95.0% | 282 | 517 | 2314/0 | $0.0093 | 995 | 5883 | 1 |  |
| unusualcols-xlsx-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 1656 | 3106 | 2314/0 | $0.0523 | 743 | 32453 | 1 |  |
| emoji-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 305 | 540 | 2314/0 | $0.0097 | 1357 | 6146 | 1 |  |
| kitchen-xlsx-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 89.4% | 2013 | 3580 | 2314/0 | $0.0604 | 587 | 45119 | 1 |  |
| kitchen-csv-150 | dev | ✗ | 95.8% | 1 | 0 | 1 | 37 | 89.3% | 4182 | 7788 | 2314/0 | $0.1301 | 1023 | 103433 | 1 |  |
| size-csv-150 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 3744 | 7538 | 2314/0 | $0.1250 | 1188 | 88431 | 1 |  |
| size-csv-300 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 7531 | 15034 | 2314/0 | $0.2488 | 1257 | 179943 | 1 |  |
| events-csv-10 ⚠︎ | dev | ✗ | 65.7% | 0 | 11 | 0 | 24 | 100.0% | 491 | 1030 | 2314/0 | $0.0176 | 1295 | 10185 | 1 |  |
| events-xlsx-10 ⚠︎ | dev | ✗ | 78.6% | 0 | 7 | 0 | 15 | 100.0% | 390 | 828 | 2314/0 | $0.0143 | 909 | 8158 | 1 |  |
| wide-csv-10 ⚠︎ | dev | ✗ | 91.4% | 0 | 0 | 0 | 6 | 100.0% | 328 | 638 | 2314/0 | $0.0112 | 1083 | 7198 | 1 |  |
| wide-xlsx-50 ⚠︎ | dev | ✗ | 78.9% | 0 | 0 | 0 | 74 | 100.0% | 1519 | 2420 | 2314/0 | $0.0416 | 1109 | 27812 | 1 |  |
| tabssplit-xlsx-50 ⚠︎ | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 1285 | 2525 | 2314/0 | $0.0424 | 3648 | 30447 | 1 |  |
| tabsrej-xlsx-10 ⚠︎ | dev | ✗ | 98.6% | 0 | 0 | 0 | 1 | 100.0% | 288 | 534 | 2314/0 | $0.0096 | 4871 | 9688 | 1 |  |
| merged-xlsx-50 ⚠︎ | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 1265 | 2516 | 2314/0 | $0.0422 | 832 | 27014 | 1 |  |
| links-xlsx-10 ⚠︎ | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 410 | 678 | 2314/0 | $0.0121 | 958 | 7174 | 1 |  |
| colour-xlsx-10 ⚠︎ | dev | ✗ | 88.6% | 0 | 0 | 0 | 8 | 100.0% | 274 | 519 | 2314/0 | $0.0093 | 745 | 5320 | 1 |  |
| colour-xlsx-50 ⚠︎ | dev | ✗ | 94.0% | 0 | 0 | 0 | 21 | 100.0% | 1104 | 2478 | 2314/0 | $0.0412 | 1366 | 24358 | 1 |  |
| size-csv-200 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 4952 | 9933 | 2314/0 | $0.1645 | 1197 | 116737 | 1 |  |
| size-csv-250 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 6300 | 12628 | 2314/0 | $0.2090 | 1106 | 148311 | 1 |  |
| utf8-nobom-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 317 | 558 | 2314/0 | $0.0100 | 1131 | 6072 | 1 |  |
| utf8-nobom-csv-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 1520 | 2781 | 2314/0 | $0.0470 | 1183 | 29407 | 1 |  |

⚠︎ = expected to fail. Coverage = share of the expected agent names, agencies and websites present in the converted text at all (a conversion measure; free).

## Wrong fields (first run, up to 6 per fixture; full list in results.json)

### usdates-csv-10
- q3 Lena Tremayne / Hollis Management · **sentDate** · expected `"2024-07-05"` · got `"2024-05-07"`

### kitchen-csv-150
- dropped: q28 (no name) / (no agency)
- ambiguous: q17 (no name) / (no agency)
- q3 (no name) / Juniper Management · **reasonsMissing** · expected `["check-name"]` · got `["check-name"]`
- q3 (no name) / Juniper Management · **reasonsSpurious** · expected `[]` · got `["needs-identifying"]`
- q15 (no name) / (no agency) · **reasonsMissing** · expected `["needs-identifying","status-direction"]` · got `["status-direction"]`
- q17 (no name) / (no agency) · **sentDate** · expected `"2024-06-09"` · got `"2024-04-12"`
- q17 (no name) / (no agency) · **timeline** · expected `[{"type":"Full Requested","date":"2024-06-16"}]` · got `[]`
- q17 (no name) / (no agency) · **reasonsMissing** · expected `["needs-identifying","two-dates"]` · got `["two-dates"]`

### events-csv-10
- invented: actual #1 Imogen Fennimore / Harwood Partners; actual #3 Ezra Harrow / Harwood Partners; actual #6 Ines Voss / Harwood Management; actual #7 Ezra Faraday / Harwood Partners; actual #9 Owen Quigley / Harwood Management; actual #10 Owen Quigley / Harwood Management … (+5)
- q1 Owen Quigley / Harwood Management · **status** · expected `"Full Sent"` · got `"Queried"`
- q1 Owen Quigley / Harwood Management · **timeline** · expected `[{"type":"Full Requested","date":"2024-02-14"},{"type":"Full Sent","date":"2024-03-07"}]` · got `[]`
- q1 Owen Quigley / Harwood Management · **reasonsMissing** · expected `["two-dates"]` · got `["two-dates"]`
- q2 Saoirse Whitlock / Fairweather Partners · **status** · expected `"Rejected"` · got `"Queried"`
- q2 Saoirse Whitlock / Fairweather Partners · **timeline** · expected `[{"type":"Full Requested","date":"2024-08-31"},{"type":"Full Sent","date":"2024-10-15"},{"type":"Rejected","date":"2024-10-30"}]` · got `[]`
- q2 Saoirse Whitlock / Fairweather Partners · **reasonsMissing** · expected `["two-dates"]` · got `["two-dates"]`

### events-xlsx-10
- invented: actual #3 Ezra Kaur / Kite & Co; actual #5 Owen Marsh / Kite & Co; actual #6 Owen Marsh / Kite & Co; actual #8 Owen Marsh / Kite & Co; actual #12 Clara Moreau / Greenhouse Literary Agency; actual #13 Tomas Ibbotson / Copperfield Associates … (+1)
- q1 Clara Moreau / Greenhouse Literary Agency · **status** · expected `"Rejected"` · got `"Queried"`
- q1 Clara Moreau / Greenhouse Literary Agency · **timeline** · expected `[{"type":"Rejected","date":"2024-08-26"}]` · got `[]`
- q1 Clara Moreau / Greenhouse Literary Agency · **reasonsMissing** · expected `["two-dates"]` · got `["two-dates"]`
- q3 Rosalind Achebe / Kite & Co · **status** · expected `"No Response"` · got `"Queried"`
- q3 Rosalind Achebe / Kite & Co · **timeline** · expected `[{"type":"No Response","date":"2024-12-01"}]` · got `[]`
- q3 Rosalind Achebe / Kite & Co · **reasonsMissing** · expected `["two-dates"]` · got `["two-dates"]`

### wide-csv-10
- q4 Callum Carter / Juniper Agency · **timeline** · expected `[{"type":"No Response","date":"2024-07-03"}]` · got `[]`
- q4 Callum Carter / Juniper Agency · **reasonsMissing** · expected `["two-dates"]` · got `["two-dates"]`
- q5 Yusuf Brennan / Juniper Agency · **timeline** · expected `[{"type":"No Response","date":"2023-09-29"}]` · got `[]`
- q5 Yusuf Brennan / Juniper Agency · **reasonsMissing** · expected `["two-dates"]` · got `["two-dates"]`
- q10 Bea Brennan / Juniper Agency · **timeline** · expected `[{"type":"Rejected","date":"2025-08-06"}]` · got `[]`
- q10 Bea Brennan / Juniper Agency · **reasonsMissing** · expected `["two-dates"]` · got `["two-dates"]`

### wide-xlsx-50
- q1 Dev Voss / Quill Agency · **timeline** · expected `[{"type":"Rejected","date":"2024-11-07"}]` · got `[]`
- q1 Dev Voss / Quill Agency · **reasonsMissing** · expected `["two-dates"]` · got `["two-dates"]`
- q2 Rory Rook / Hollis Associates · **timeline** · expected `[{"type":"Full Requested","date":"2025-05-15"}]` · got `[]`
- q2 Rory Rook / Hollis Associates · **reasonsMissing** · expected `["two-dates"]` · got `["two-dates"]`
- q3 Clara Llewellyn / Blackthorn Literary Agency · **timeline** · expected `[{"type":"Partial Requested","date":"2024-02-23"}]` · got `[]`
- q3 Clara Llewellyn / Blackthorn Literary Agency · **reasonsMissing** · expected `["two-dates"]` · got `["two-dates"]`

### tabsrej-xlsx-10
- q10 Felix Doyle / Ashgrove Management · **status** · expected `"No Response"` · got `"Queried"`

### colour-xlsx-10
- q1 Esme Moreau / Ashgrove Literary Agency · **status** · expected `"Full Requested"` · got `"Queried"`
- q3 Seb Sato / Copperfield Partners · **status** · expected `"Offer"` · got `"Queried"`
- q4 Imogen Doyle / Copperfield Partners · **status** · expected `"Rejected"` · got `"Queried"`
- q5 Owen Salt / Hollis Agency · **status** · expected `"No Response"` · got `"Queried"`
- q6 Rory Kaur / Ashgrove Literary Agency · **status** · expected `"Full Requested"` · got `"Queried"`
- q7 Orla Harrow / Kite Partners · **status** · expected `"Offer"` · got `"Queried"`

### colour-xlsx-50
- q4 Ezra Achebe / Penfallow & Co · **status** · expected `"Rejected"` · got `"Queried"`
- q5 Tamsin Kaur / Copperfield Management · **status** · expected `"Rejected"` · got `"Queried"`
- q6 Yusuf Kaur / Wren Literary · **status** · expected `"Rejected"` · got `"Queried"`
- q7 Kwame Vidal / Dunmore Management · **status** · expected `"Rejected"` · got `"Queried"`
- q8 Imogen Voss / Copperfield & Co · **status** · expected `"Rejected"` · got `"Queried"`
- q18 Esme Doyle / Blackthorn Management · **status** · expected `"Full Requested"` · got `"Queried"`

