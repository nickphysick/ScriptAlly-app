# Smart Import photo evaluation

| | reads | failed | name | agency | status | date | src hit | spurious |
|---|---|---|---|---|---|---|---|---|
| all | 24 | 0 | 95.9% | 99.1% | 97.9% | 95.4% | 17.9% | 0 |
| handwritten, sharp | 8 | 0 | 100.0% | 97.2% | 98.6% | 100.0% | 23.6% | 0 |
| handwritten, blurred | 8 | 0 | 87.5% | 100.0% | 97.2% | 86.1% | 19.4% | 0 |
| printed | 4 | 0 | 100.0% | 100.0% | 97.1% | 100.0% | 7.7% | 0 |
| screenshots | 0 | 0 | — | — | — | — | — | 0 |
| sharp | 10 | 0 | 100.0% | 98.0% | 98.0% | 100.0% | 19.4% | 0 |
| blurred | 10 | 0 | 90.8% | 100.0% | 97.4% | 89.8% | 16.3% | 0 |
| your own photos | 4 | 0 | 100.0% | 100.0% | 100.0% | 100.0% | — | 0 |

| code | tp | fp | fn | precision | recall |
|---|---|---|---|---|---|
| crossed-out | 42 | 0 | 0 | 100.0% | 100.0% |
| mark-unclear | 25 | 0 | 5 | 100.0% | 83.3% |
| illegible-agency | 10 | 2 | 8 | 83.3% | 55.6% |
| no-date | 30 | 2 | 0 | 93.8% | 100.0% |

Pages read: 42. Time per page: 12.6 s. Cost per page: $0.0200. Total cost: $0.84.

