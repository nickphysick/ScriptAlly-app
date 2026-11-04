# Smart Import photo evaluation

| | reads | failed | name | agency | status | date | src hit | spurious |
|---|---|---|---|---|---|---|---|---|
| all | 52 | 14 | 95.8% | 99.4% | 97.9% | 96.6% | 20.6% | 0 |
| handwritten, sharp | 12 | 0 | 99.0% | 98.0% | 98.0% | 100.0% | 25.0% | 0 |
| handwritten, blurred | 12 | 0 | 87.0% | 100.0% | 98.0% | 88.5% | 19.5% | 0 |
| printed | 12 | 6 | 100.0% | 100.0% | 97.5% | 100.0% | 14.2% | 0 |
| screenshots | 12 | 6 | 100.0% | 100.0% | 97.7% | 100.0% | 25.0% | 0 |
| sharp | 24 | 6 | 99.4% | 98.8% | 97.5% | 100.0% | 22.2% | 0 |
| blurred | 24 | 6 | 92.0% | 100.0% | 98.2% | 92.9% | 19.1% | 0 |
| your own photos | 4 | 2 | 100.0% | 100.0% | 100.0% | 100.0% | — | 0 |

| code | tp | fp | fn | precision | recall |
|---|---|---|---|---|---|
| crossed-out | 59 | 0 | 0 | 100.0% | 100.0% |
| mark-unclear | 29 | 0 | 4 | 100.0% | 87.9% |
| illegible-agency | 14 | 1 | 11 | 93.3% | 56.0% |
| no-date | 37 | 1 | 0 | 97.4% | 100.0% |

Pages read: 86. Time per page: 10.1 s. Cost per page: $0.0147. Total cost: $1.27.

