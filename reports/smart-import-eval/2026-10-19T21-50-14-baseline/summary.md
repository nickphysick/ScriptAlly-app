# Smart Import evaluation — 2026-10-19T21-50-14 (baseline)

Model `claude-sonnet-4-6` · split **dev** · runs per fixture **1** · live model calls
Fixtures: 34 synthetic + 0 real (real files are counted, never printed).

## Headline

| | Field accuracy | Fixtures passed |
|---|---|---|
| Expected to pass (22) | **99.5%** (5433/5460) | **21/22** |
| Expected to fail (12) | 39.5% (1581/4000) | 0/12 |
| All (34) | 74.1% | 21/34 |

Total spend: **$1.3434** · tokens in 114383 · out 66681 · cache read 0 · cache write 0
Time per call: median 8199 ms · max 145017 ms
Calls slower than the callable's 90 s timeout: **2** (kitchen-csv-150, size-csv-300) — in production these fail with an error, whatever the model returned; the scores above do not count that

## By field (expected-to-pass fixtures, first run)

| Field | Accuracy | Correct / compared |
|---|---|---|
| agentName | 99.6% | 777/780 |
| agency | 99.6% | 777/780 |
| status | 99.6% | 777/780 |
| sentDate | 99.5% | 776/780 |
| timeline | 99.2% | 774/780 |
| reasonsMissing | 99.5% | 776/780 |
| reasonsSpurious | 99.5% | 776/780 |

## By knob — which messiness costs most

Every fixture carrying the knob, first run, worst first. `(no knobs)` is the clean reference.

| Knob | Fixtures | Field accuracy | Passed | Expected to fail |
|---|---|---|---|---|
| size:300 | 1 | 0.0% | 0/1 | 1 |
| layout:tabsSplit | 1 | 68.0% | 0/1 | 1 |
| tabs | 2 | 70.0% | 0/2 | 2 |
| layout:events | 2 | 72.1% | 0/2 | 2 |
| layout:tabsRejections | 1 | 80.0% | 0/1 | 1 |
| layout:wide | 2 | 81.0% | 0/2 | 2 |
| layout:links | 1 | 87.5% | 0/1 | 1 |
| links | 1 | 87.5% | 0/1 | 1 |
| layout:merged | 1 | 90.3% | 0/1 | 1 |
| merged | 1 | 90.3% | 0/1 | 1 |
| layout:colour | 2 | 93.1% | 0/2 | 2 |
| colour | 2 | 93.1% | 0/2 | 2 |
| blankRows | 2 | 98.1% | 1/2 | 0 |
| dupHeader | 3 | 98.2% | 2/3 | 0 |
| totals | 3 | 98.2% | 2/3 | 0 |
| placeholders | 3 | 98.2% | 2/3 | 0 |
| whitespace | 3 | 98.2% | 2/3 | 0 |
| emoji | 3 | 98.2% | 2/3 | 0 |
| preamble | 4 | 98.5% | 3/4 | 0 |
| agentNotes | 4 | 98.5% | 3/4 | 0 |
| slang | 4 | 98.5% | 3/4 | 0 |
| dateStyles | 4 | 98.5% | 3/4 | 0 |
| notesDates | 4 | 98.5% | 3/4 | 0 |
| usDates | 1 | 98.6% | 0/1 | 1 |
| (no knobs) | 2 | 100.0% | 2/2 | 0 |
| serials | 1 | 100.0% | 1/1 | 0 |
| unusualColumns | 2 | 100.0% | 2/2 | 0 |
| size:150 | 1 | 100.0% | 1/1 | 0 |

## By size (data rows)

| Rows | Fixtures | Field accuracy | Passed |
|---|---|---|---|
| 10 | 20 | 94.5% | 13/20 |
| 50 | 11 | 93.7% | 7/11 |
| 150 | 2 | 98.7% | 1/2 |
| 300 | 1 | 0.0% | 0/1 |

## Expected-to-fail fixtures — what actually happened

| Fixture | Why it is expected to fail | Outcome | Accuracy | Dropped | Invented |
|---|---|---|---|---|---|
| usdates-csv-10 | the date parser reads an ambiguous dd/mm the British way and infers no file-level order, so a US writer's 04/05 is read as 4 May | mapped | 98.6% | 0 | 0 |
| size-csv-300 | 300 queries need ~15k output tokens against the 12k ceiling; the reply truncates | badjson | 0.0% | 300 | 0 |
| events-csv-10 | one row per EVENT: the prompt maps every row to its own query, so one query becomes several | mapped | 65.7% | 0 | 11 |
| events-xlsx-10 | one row per EVENT: the prompt maps every row to its own query, so one query becomes several | mapped | 78.6% | 0 | 7 |
| wide-csv-10 | a column per stage date: the contract takes the sent date from one column and events only from notes | mapped | 91.4% | 0 | 0 |
| wide-xlsx-50 | a column per stage date: the contract takes the sent date from one column and events only from notes | mapped | 78.9% | 0 | 0 |
| tabssplit-xlsx-50 | closed queries live on an Archive tab the conversion never reads | mapped | 68.0% | 16 | 0 |
| tabsrej-xlsx-10 | rejections live on their own tab, with no status column, which the conversion never reads | mapped | 80.0% | 2 | 0 |
| merged-xlsx-50 | the agency is a merged range; only its top cell carries the value | mapped | 90.3% | 0 | 0 |
| links-xlsx-10 | the website is only the agent name's link target, which the conversion drops | mapped | 87.5% | 0 | 0 |
| colour-xlsx-10 | the status column is empty and a fill colour carries the status; the conversion drops colour | mapped | 88.6% | 0 | 0 |
| colour-xlsx-50 | the status column is empty and a fill colour carries the status; the conversion drops colour | mapped | 94.0% | 0 | 0 |

## Every fixture (first run)

| Fixture | Split | Pass | Accuracy | Dropped | Invented | Ambig. | Wrong fields | Coverage | In | Out | Cache r/w | Cost | ms | Tries | Failure |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| clean-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 2581 | 520 | 0/0 | $0.0155 | 6679 | 1 |  |
| clean-xlsx-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 2576 | 513 | 0/0 | $0.0154 | 6107 | 1 |  |
| preamble-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 2622 | 544 | 0/0 | $0.0160 | 6715 | 1 |  |
| preamble-xlsx-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 3605 | 2510 | 0/0 | $0.0485 | 28690 | 1 |  |
| dupheader-xlsx-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 2595 | 523 | 0/0 | $0.0156 | 5618 | 1 |  |
| totals-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 2583 | 493 | 0/0 | $0.0151 | 6651 | 1 |  |
| placeholders-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 2604 | 530 | 0/0 | $0.0158 | 5768 | 1 |  |
| agentnotes-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 2587 | 598 | 0/0 | $0.0167 | 7099 | 1 |  |
| agentnotes-csv-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 3527 | 2599 | 0/0 | $0.0496 | 27532 | 1 |  |
| slang-csv-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 3566 | 2531 | 0/0 | $0.0487 | 26788 | 1 |  |
| slang-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 2569 | 515 | 0/0 | $0.0154 | 5911 | 1 |  |
| datestyles-csv-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 3495 | 2409 | 0/0 | $0.0466 | 26686 | 1 |  |
| datestyles-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 2565 | 494 | 0/0 | $0.0151 | 5381 | 1 |  |
| serials-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 2539 | 470 | 0/0 | $0.0147 | 5108 | 1 |  |
| usdates-csv-10 ⚠︎ | dev | ✗ | 98.6% | 0 | 0 | 0 | 1 | 100.0% | 2580 | 511 | 0/0 | $0.0154 | 5691 | 1 |  |
| notesdates-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 2599 | 563 | 0/0 | $0.0162 | 9259 | 1 |  |
| notesdates-csv-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 3633 | 2703 | 0/0 | $0.0514 | 28745 | 1 |  |
| whitespace-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 95.0% | 2596 | 517 | 0/0 | $0.0155 | 5925 | 1 |  |
| unusualcols-xlsx-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 3970 | 3106 | 0/0 | $0.0585 | 35658 | 1 |  |
| emoji-csv-10 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 2624 | 530 | 0/0 | $0.0158 | 5711 | 1 |  |
| kitchen-xlsx-50 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 89.4% | 4327 | 3468 | 0/0 | $0.0650 | 42784 | 1 |  |
| kitchen-csv-150 | dev | ✗ | 97.4% | 3 | 0 | 0 | 6 | 89.3% | 6476 | 7665 | 0/0 | $0.1344 | 104084 | 1 |  |
| size-csv-150 | dev | ✓ | 100.0% | 0 | 0 | 0 | 0 | 100.0% | 6058 | 7538 | 0/0 | $0.1312 | 88401 | 1 |  |
| size-csv-300 ⚠︎ | dev | ✗ | 0.0% | 300 | 0 | 0 | 0 | 100.0% | 9845 | 12000 | 0/0 | $0.2095 | 145017 | 1 | badjson |
| events-csv-10 ⚠︎ | dev | ✗ | 65.7% | 0 | 11 | 0 | 24 | 100.0% | 2805 | 1030 | 0/0 | $0.0239 | 9789 | 1 |  |
| events-xlsx-10 ⚠︎ | dev | ✗ | 78.6% | 0 | 7 | 0 | 15 | 100.0% | 2704 | 828 | 0/0 | $0.0205 | 8199 | 1 |  |
| wide-csv-10 ⚠︎ | dev | ✗ | 91.4% | 0 | 0 | 0 | 6 | 100.0% | 2642 | 638 | 0/0 | $0.0175 | 7195 | 1 |  |
| wide-xlsx-50 ⚠︎ | dev | ✗ | 78.9% | 0 | 0 | 0 | 74 | 100.0% | 3833 | 2420 | 0/0 | $0.0478 | 27933 | 1 |  |
| tabssplit-xlsx-50 ⚠︎ | dev | ✗ | 68.0% | 16 | 0 | 0 | 0 | 84.0% | 3194 | 1745 | 0/0 | $0.0358 | 16589 | 1 |  |
| tabsrej-xlsx-10 ⚠︎ | dev | ✗ | 80.0% | 2 | 0 | 0 | 0 | 90.0% | 2533 | 426 | 0/0 | $0.0140 | 5374 | 1 |  |
| merged-xlsx-50 ⚠︎ | dev | ✗ | 90.3% | 0 | 0 | 0 | 34 | 100.0% | 3372 | 2241 | 0/0 | $0.0437 | 24102 | 1 |  |
| links-xlsx-10 ⚠︎ | dev | ✗ | 87.5% | 0 | 0 | 0 | 10 | 66.7% | 2572 | 506 | 0/0 | $0.0153 | 5492 | 1 |  |
| colour-xlsx-10 ⚠︎ | dev | ✗ | 88.6% | 0 | 0 | 0 | 8 | 100.0% | 2588 | 519 | 0/0 | $0.0155 | 5861 | 1 |  |
| colour-xlsx-50 ⚠︎ | dev | ✗ | 94.0% | 0 | 0 | 0 | 21 | 100.0% | 3418 | 2478 | 0/0 | $0.0474 | 23990 | 1 |  |

⚠︎ = expected to fail. Coverage = share of the expected agent names, agencies and websites present in the converted text at all (a conversion measure; free).

## Wrong fields (first run, up to 6 per fixture; full list in results.json)

### usdates-csv-10
- q3 Lena Tremayne / Hollis Management · **sentDate** · expected `"2024-07-05"` · got `"2024-05-07"`

### kitchen-csv-150
- dropped: q17 (no name) / (no agency); q19 (no name) / (no agency); q20 (no name) / (no agency)
- q15 (no name) / (no agency) · **reasonsMissing** · expected `["needs-identifying","status-direction"]` · got `["status-direction"]`
- q18 (no name) / Everly Literary · **sentDate** · expected `"2024-04-12"` · got `"2024-06-09"`
- q18 (no name) / Everly Literary · **timeline** · expected `[]` · got `[{"type":"Full Requested","date":"2024-06-16"}]`
- q18 (no name) / Everly Literary · **reasonsSpurious** · expected `[]` · got `["two-dates"]`
- q121 Rosalind Nkemelu / Penfallow Literary · **timeline** · expected `[{"type":"Full Requested","date":"2024-08-11"}]` · got `[{"type":"Full Sent","date":"2024-08-11"}]`
- q126 Nadia Penrose / Quill Partners · **timeline** · expected `[{"type":"Full Requested","date":"2024-05-25"}]` · got `[{"type":"Full Sent","date":"2024-05-25"}]`

### size-csv-300
- dropped: q1 Imogen Voss / Inkwell & Co; q2 Marianne Webb / Fairweather Agency; q3 Clara Webb / Pemberton & Co; q4 Dev Achebe / Bellwether Agency; q5 Callum Vidal / Quill Associates; q6 Felix Ostrander / Inkwell Literary … (+294)

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

### tabssplit-xlsx-50
- dropped: q3 Kwame Doyle / Harwood Agency; q4 Saoirse Hale / Penfallow Partners; q6 Tamsin Doyle / Juniper Literary; q7 Dev Salt / Quill Management; q13 Imogen Faraday / Blackthorn Associates; q14 Nadia Brennan / Harwood Management … (+10)

### tabsrej-xlsx-10
- dropped: q1 Clara Lindqvist / Juniper Partners; q8 Nadia Nkemelu / Ashgrove Management

### merged-xlsx-50
- q49 Esme Harrow / Ashgrove Literary Agency · **agency** · expected `"Ashgrove Literary Agency"` · got `""`
- q24 Callum Hale / Copperfield Literary · **agency** · expected `"Copperfield Literary"` · got `""`
- q2 Imogen Carter / Dunmore Literary Agency · **agency** · expected `"Dunmore Literary Agency"` · got `""`
- q47 Ezra Ostrander / Dunmore Literary Agency · **agency** · expected `"Dunmore Literary Agency"` · got `""`
- q28 Kwame Kaur / Everly Literary Agency · **agency** · expected `"Everly Literary Agency"` · got `""`
- q18 Imogen Doyle / Fairweather Literary Agency · **agency** · expected `"Fairweather Literary Agency"` · got `""`

### links-xlsx-10
- q1 Freya Okafor / Juniper Associates · **website** · expected `"https://www.juniperassociates.co.uk"` · got `""`
- q2 Clara Achebe / Juniper Associates · **website** · expected `"https://www.juniperassociates.co.uk"` · got `""`
- q3 Felix Nkemelu / Larkspur Associates · **website** · expected `"https://www.larkspurassociates.co.uk"` · got `""`
- q4 Kwame Marsh / Larkspur Associates · **website** · expected `"https://www.larkspurassociates.co.uk"` · got `""`
- q5 Tomas Raman / Larkspur Associates · **website** · expected `"https://www.larkspurassociates.co.uk"` · got `""`
- q6 Rosalind Kaur / Inkwell Literary Agency · **website** · expected `"https://www.inkwellliteraryagency.co.uk"` · got `""`

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

