# Retired and re-pointed by Query Centre v151

v151 removes from the desktop page the v150 header card, At a glance and its cards, the "Your queries" block with its
cream switch, the navy bar and the list card, and takes Full screen off the page (QC_FULL_SCREEN). Locks that measure
only those surfaces are retired; locks about Birds-eye, which v151 re-dresses but keeps, are re-pointed or run as they are.

## Run as they are (green on v151)

| Lock | Why it still applies |
|---|---|
| QC150 L7 no overlap | Birds-eye's labels, tails and axis: unchanged (§9) |
| QC150 L8 smooth | drag with momentum, one scrollLeft: unchanged (§9) |
| QC150 L9 past bars | grey past-stage bars from real history: unchanged (§9) |
| QC150 L12 open | a Birds-eye bar opens its query: unchanged (§9) |

## Re-pointed

| Lock | Change |
|---|---|
| QC150 L6 one scale | the view switch is found on the v151 header too (`[data-qc151="switch"]`) |
| QC150 L10 pinning | the date row now pins at the sheet's top: no navy bar above it (§9). The lock reads the scroller's top where the bar's bottom was |
| QC150 L11 group/sort | the list's grouping is v151's Group button and menu, its bands the table's plain sections; Birds-eye's Group is v151's radio-row menu |
| QC1501 L6 hover actions | the card's edge is the v151 Birds-eye card (`[data-qc151="birds-card"]`) |
| nb1Lib `openQc` | also waits for the v151 table or Birds-eye card |

## Retired (their subject is not on the page)

| Lock | Subject removed by v151 |
|---|---|
| QC150 L1 dressing | the v150 header card and its underlined title |
| QC150 L2 cards, L3 card filter | At a glance's four stat cards |
| QC150 L4 widths | min(S − 40, 1320) list and the v149.2 header — replaced by QC151 L1 |
| QC150 L5 title | the "Your queries" block and its centred switch — replaced by QC151 L13 |
| QC1501 L1 one width | min(S − 48, 1200) — replaced by QC151 L1 |
| QC1501 L2 glance, L3 cards | At a glance |
| QC1501 L4 bar type, L5 bar order | the navy bar — replaced by QC151 L3 |
| QC1501 L7 full screen | full screen is off the page (code kept, inert) — QC151 L2 asserts the absence |
