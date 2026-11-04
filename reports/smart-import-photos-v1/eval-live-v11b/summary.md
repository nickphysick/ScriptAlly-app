# Smart Import photo evaluation

| | reads | failed | name | agency | status | date | src hit | spurious |
|---|---|---|---|---|---|---|---|---|
| all | 52 | 0 | 96.9% | 99.4% | 97.7% | 96.1% | 18.9% | 0 |
| handwritten, sharp | 12 | 0 | 99.0% | 97.0% | 98.0% | 99.0% | 24.0% | 0 |
| handwritten, blurred | 12 | 0 | 87.0% | 100.0% | 97.5% | 86.5% | 19.0% | 0 |
| printed | 12 | 0 | 100.0% | 100.0% | 97.2% | 99.4% | 12.3% | 0 |
| screenshots | 12 | 0 | 99.4% | 100.0% | 97.7% | 100.0% | 25.0% | 0 |
| sharp | 24 | 0 | 99.6% | 98.7% | 97.6% | 99.6% | 18.9% | 0 |
| blurred | 24 | 0 | 94.0% | 100.0% | 97.6% | 93.6% | 18.9% | 0 |
| your own photos | 4 | 0 | 100.0% | 100.0% | 100.0% | 85.7% | — | 0 |

| code | tp | fp | fn | precision | recall |
|---|---|---|---|---|---|
| crossed-out | 74 | 0 | 0 | 100.0% | 100.0% |
| mark-unclear | 25 | 0 | 13 | 100.0% | 65.8% |
| illegible-agency | 14 | 0 | 12 | 100.0% | 53.8% |
| no-date | 52 | 10 | 2 | 83.9% | 96.3% |

Pages read: 86. Time per page: 13.8 s. Cost per page: $0.0205. Total cost: $1.76.

10-page read: ok, 104.7 s, 100 rows, payload 2070700 chars (cap 20000000).
