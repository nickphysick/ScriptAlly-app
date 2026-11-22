# Retired with Phone app v5 (12 Nov 2026)

`tests/e2e/phoneAppV4.measure.ts` (PA4-1…11) and `tests/e2e/phoneAppV41.measure.ts` (PA41-1…14) are deleted. Phone app
v5 replaced the dock (Today · To do · + · Materials · Profile), Today's header, the Birds-eye card, Today's Up next lead
card, the Queries and Agents tabs, the You page and the full Birds-eye view's rows, so most of their selectors
(`[data-pa4="tab"][data-tab="queries"]`, `[data-pa41="birds-card"]`, `card-row`, `[data-pa41="need"]`, `up-pos`,
`.pa41v-*`, `[data-pa41="vrow"] .pa41v-trk`, `[data-pa41="zoom"]`…) no longer exist, and both specs went red on
selectors rather than on behaviour. Their subjects are measured again by `tests/e2e/phoneAppV5.measure.ts` (PA5-1…15),
or retire with the surface they measured:

| Old lock | Now |
|---|---|
| PA4-1 one filled button per screen | retires with v4's Today lead card; To do's card has the one verb (PA5-10 opens its journey); the query page is unchanged and not re-measured |
| PA4-2 sizes, PA4-3 text size (125%) | PA5-13, on every v5 screen and sheet, scrolled through |
| PA4-4 Today's four states | everyday / after / quiet retire with the lead card (their tasks are To do's); day one is unchanged and not re-measured |
| PA4-5 "How close" Birds-eye | already retired in v4.1 |
| PA4-6 the query page from every door | PA5-2 (a block row's Open, the full list) |
| PA4-7 the quick log and its record | + is v4's quick log, unchanged; PA5-2 reaches it; not re-measured |
| PA4-8 reachable within three taps | PA5-2 (every page the base reached, from the new dock) |
| PA4-9 words, PA41-13 words | PA5-14 (every phone screen, groups unfolded) |
| PA4-10 motion, PA41-12 motion | PA5-14 (reduced motion, the harness's motion kill lifted first, with a control) |
| PA4-11 desktop, PA41-14 desktop | PA5-15 (Dashboard, Queries, Agents, Materials ×2, the desktop Birds-eye) |
| PA41-1 one count | PA5-1 (the badge on To do = To do's tasks = the need pill) |
| PA41-2 figure = the card's counts | carried into PA5-4's ledger: the block's three counts add up to the header's active figure |
| PA41-3 week on week | carried into PA5-1's ledger: the change = the chart's last week − the one before |
| PA41-4 nothing over the month labels | retires with v4.1's header (the Mentor is mirrored to the left edge, the tabs follow the chart) |
| PA41-5 the pinned bar | PA5-3 (the slim bar and the tab strip, on Today and Materials, through every tab) |
| PA41-6 the card's rows and order | PA5-4 (the block's filter) with the block's order (nearest their date) carried into its ledger |
| PA41-7 engine = the desktop's | PA5-9 (the block's and the full view's bars against `QcBirds150` at 1512) |
| PA41-8 fold at five | carried into PA5-8's ledger (a group over five shows five and "Show N more") |
| PA41-9 pan | PA5-8 (a 120px drag moves the track and not the name column) |
| PA41-10 the expansion's one button | the expansion is kept, led by the name, agency and status; not re-measured |
| PA41-11 sizes and landscape | PA5-13; landscape in PA5-8 (844 × 390 is the desktop; 740 × 360 the phone's landscape) |

The ledgers and pairs stay in `reports/phone-app-v4/` and `reports/phone-app-v4-1/` as the record of what they measured.
