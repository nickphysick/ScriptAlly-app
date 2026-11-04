# Smart Import photo evaluation

| | reads | failed | name | agency | status | date | src hit | spurious |
|---|---|---|---|---|---|---|---|---|
| all | 52 | 0 | 96.9% | 99.7% | 97.6% | 97.2% | 18.1% | 0 |
| handwritten, sharp | 12 | 0 | 99.0% | 98.5% | 98.0% | 100.0% | 22.5% | 0 |
| handwritten, blurred | 12 | 0 | 87.0% | 100.0% | 97.0% | 88.0% | 16.5% | 0 |
| printed | 12 | 0 | 100.0% | 100.0% | 97.2% | 99.4% | 12.7% | 0 |
| screenshots | 12 | 0 | 99.4% | 100.0% | 97.7% | 100.0% | 25.0% | 0 |
| sharp | 24 | 0 | 99.6% | 99.3% | 97.3% | 100.0% | 18.7% | 0 |
| blurred | 24 | 0 | 94.0% | 100.0% | 97.6% | 94.2% | 17.6% | 0 |
| your own photos | 4 | 0 | 100.0% | 100.0% | 100.0% | 100.0% | — | 0 |

| code | tp | fp | fn | precision | recall |
|---|---|---|---|---|---|
| crossed-out | 74 | 0 | 0 | 100.0% | 100.0% |
| mark-unclear | 16 | 0 | 22 | 100.0% | 42.1% |
| illegible-agency | 15 | 2 | 11 | 88.2% | 57.7% |
| no-date | 54 | 2 | 0 | 96.4% | 100.0% |

Pages read: 86. Time per page: 13.4 s. Cost per page: $0.0209. Total cost: $1.79.

