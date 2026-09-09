# dash-refdiff · 2026-09-09T12:27:19.230Z

ref: `design-refs/dashboard-cappuccino-v26.html`  ·  app: `http://127.0.0.1:4173`

| probe | 1536 | 1920 | 2520 |
|---|---|---|---|
| main | · | · | · |
| topbar | · | · | · |
| search | · | · | · |
| grid | · | · | · |
| hero | · | · | · |
| stats | · | · | · |
| toprow | · | · | · |
| manuscript-card | · | · | · |
| chart-card | · | · | · |
| plot | · | · | · |
| brush | · | · | · |
| todo-card | · | · | · |
| todo-rule | · | · | · |
| activity-card | · | · | · |
| feed | · | · | · |
| community-tile | · | · | · |
| text:greeting | · | · | · |
| text:subtitle | · | · | · |
| text:panel-title | · | · | · |
| text:chart-title | · | · | · |
| type:card title | · | · | · |
| type:chart figure | · | · | · |
| type:hero greeting | · | · | · |
| type:stat label | · | · | · |
| type:stat figure | · | · | · |
| type:stat chip | · | · | · |
| type:tab | · | · | · |
| type:tab count | · | · | · |
| type:ticket title | · | · | · |
| type:ticket tag | · | · | · |
| type:bubble sentence | · | · | · |
| type:bubble meta | · | · | · |
| type:bubble label | · | · | · |
| type:todo badge | · | · | · |
| page | · | · | · |
| _main (datum, not compared)_ | ref 1274×1392 · app 1274×1392 (window 1544×1524) | ref 1634×1392 · app 1634×1392 (window 1904×1524) | ref 2154×1392 · app 2154×1392 (window 2424×1524) |

**1536**: 0 misses  ·  **1920**: 0 misses  ·  **2520**: 0 misses

**Allowed (3), not counted:**
- `brush` xr — the ref's frequency control is a two-button chip pair (Weekly | Monthly) at 146px; ours is a native select, because this app offers THREE frequencies — Daily, Weekly, Monthly. Below the breakpoint the control row is left-aligned, so the brush starts earlier. Closing it means dropping a frequency the app supports.
- `stats` x — the hero is `auto 1fr`, so the stats begin where the greeting ENDS. The ref's greeting reads "Hello, Bethany"; the harness account's name is a different length, and the difference between the two headings is EXACTLY the difference this forgives — measured each run, not typed. A larger gap than the names account for still counts.

**total misses: 0**
