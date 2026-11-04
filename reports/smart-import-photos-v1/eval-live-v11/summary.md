# Smart Import photo evaluation

| | reads | failed | name | agency | status | date | src hit | spurious |
|---|---|---|---|---|---|---|---|---|
| all | 52 | 0 | 96.8% | 99.3% | 96.7% | 92.5% | 19.8% | 0 |
| handwritten, sharp | 12 | 0 | 99.0% | 97.0% | 98.0% | 91.5% | 29.5% | 0 |
| handwritten, blurred | 12 | 0 | 87.0% | 100.0% | 95.0% | 84.0% | 15.5% | 0 |
| printed | 12 | 0 | 100.0% | 100.0% | 96.0% | 95.1% | 14.2% | 0 |
| screenshots | 12 | 0 | 98.9% | 100.0% | 97.7% | 100.0% | 23.9% | 0 |
| sharp | 24 | 0 | 99.6% | 98.7% | 96.9% | 96.2% | 22.4% | 0 |
| blurred | 24 | 0 | 93.8% | 100.0% | 96.2% | 89.3% | 17.1% | 0 |
| your own photos | 4 | 0 | 100.0% | 97.6% | 100.0% | 85.7% | — | 0 |

| code | tp | fp | fn | precision | recall |
|---|---|---|---|---|---|
| crossed-out | 74 | 0 | 0 | 100.0% | 100.0% |
| mark-unclear | 27 | 0 | 11 | 100.0% | 71.1% |
| illegible-agency | 16 | 1 | 10 | 94.1% | 61.5% |
| no-date | 54 | 47 | 0 | 53.5% | 100.0% |

Pages read: 86. Time per page: 13.8 s. Cost per page: $0.0208. Total cost: $1.79.

10-page read: ok, 105.0 s, 100 rows, payload 2070700 chars (cap 20000000).
