# Smart Import photo evaluation

| | reads | failed | name | agency | status | date | src hit | spurious |
|---|---|---|---|---|---|---|---|---|
| all | 48 | 0 | 96.7% | 99.8% | 98.0% | 97.1% | 18.1% | 0 |
| handwritten, sharp | 12 | 0 | 99.0% | 99.0% | 99.0% | 100.0% | 18.5% | 0 |
| handwritten, blurred | 12 | 0 | 87.0% | 100.0% | 99.0% | 87.0% | 17.5% | 0 |
| printed | 12 | 0 | 100.0% | 100.0% | 96.9% | 100.0% | 13.9% | 0 |
| screenshots | 12 | 0 | 98.9% | 100.0% | 97.7% | 100.0% | 26.1% | 0 |
| sharp | 24 | 0 | 99.6% | 99.6% | 97.8% | 100.0% | 16.4% | 0 |
| blurred | 24 | 0 | 93.8% | 100.0% | 98.2% | 94.2% | 19.8% | 0 |

| code | tp | fp | fn | precision | recall |
|---|---|---|---|---|---|
| crossed-out | 68 | 0 | 0 | 100.0% | 100.0% |
| mark-unclear | 22 | 0 | 10 | 100.0% | 68.8% |
| illegible-agency | 10 | 0 | 14 | 100.0% | 41.7% |
| no-date | 44 | 2 | 0 | 95.7% | 100.0% |

Pages read: 80. Time per page: 13.7 s. Cost per page: $0.0211. Total cost: $1.68.

10-page read: ok, 116.3 s, 100 rows, payload 2070700 chars (cap 20000000).
