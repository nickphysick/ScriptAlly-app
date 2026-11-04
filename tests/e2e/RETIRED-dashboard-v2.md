# Retired and re-pointed by Dashboard v2 (3–4 Nov; ref design-refs/dashboard-v2/)

## Retired
- **dashFirstVisit.measure.ts · C2 "the last page never wraps round".** It held the v71 task card's pager. The task
  card is no longer on the dashboard (Next up has no pager: it shows the top task and the next two). Nothing left to
  hold. C1 now asserts Next up's own count ("{shown} of {n} · See all", shown at most 3).

## Re-pointed (the law kept, the probe moved)
- **dashFirstVisit.measure.ts · A1** — `data-mode` is `d2`; Top tip is retired, so the pre-query page is the set-up
  card, Getting started, and no task card (neither v71's nor Next up).
- **dashFirstVisit.measure.ts · A2** — the founding card is v2's (`[data-d2-card="founding"]`): its four sections drawn,
  nothing in it clipped.
- **dashFirstVisit.measure.ts · A3** — the band carries no buttons before the first query and its three actions after;
  no status label in either state (v2 removes the label the manuscript card carried).
- **dashFirstVisit.measure.ts · A8** — the loading page is `d2`, pre-query, with no band buttons.
- **Unit suites** (each line marked `RE-POINTED (Dashboard v2)`): f1Book, f1Queries, dashFirstVisit.test, fv2 Part A,
  Part E, Part H, dashboardPageSmoke. Listed in reports/dashboard-v2/REPORT.md.
