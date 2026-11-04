# Smart Import photo evaluation

| | reads | failed | name | agency | status | date | src hit | spurious |
|---|---|---|---|---|---|---|---|---|
| all | 52 | 0 | 96.8% | 99.4% | 97.5% | 97.1% | 18.4% | 0 |
| handwritten, sharp | 12 | 0 | 99.0% | 98.0% | 98.0% | 100.0% | 21.5% | 0 |
| handwritten, blurred | 12 | 0 | 87.0% | 100.0% | 97.0% | 87.0% | 19.0% | 0 |
| printed | 12 | 0 | 100.0% | 100.0% | 96.9% | 100.0% | 12.7% | 0 |
| screenshots | 12 | 0 | 98.9% | 100.0% | 97.7% | 100.0% | 25.0% | 0 |
| sharp | 24 | 0 | 99.6% | 99.1% | 96.9% | 100.0% | 19.3% | 0 |
| blurred | 24 | 0 | 93.8% | 100.0% | 97.8% | 94.2% | 17.6% | 0 |
| your own photos | 4 | 0 | 100.0% | 95.2% | 100.0% | 97.6% | — | 0 |

| code | tp | fp | fn | precision | recall |
|---|---|---|---|---|---|
| crossed-out | 74 | 0 | 0 | 100.0% | 100.0% |
| mark-unclear | 27 | 0 | 11 | 100.0% | 71.1% |
| illegible-agency | 16 | 2 | 10 | 88.9% | 61.5% |
| no-date | 53 | 2 | 1 | 96.4% | 98.1% |

Pages read: 86. Time per page: 13.8 s. Cost per page: $0.0205. Total cost: $1.77.

10-page read: ok, 104.7 s, 100 rows, payload 2070700 chars (cap 20000000).
