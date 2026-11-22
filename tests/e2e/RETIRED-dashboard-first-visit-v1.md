# Retired and re-pointed by Dashboard first visit v1 (29 Oct)

The pre-query dashboard is now the set-up card, the Mentor's tip and Getting started as the task card
(ref design-refs/dashboard-first-visit-v1/). Every lock that asserted the v60/v60.1 pre-query layout is
listed here with what happened to it. The new rendered locks are `dashFirstVisit.measure.ts` (DFV-A, C, D);
the unit locks are `fv1/dashFirstVisit.test.tsx` (A), `lib/firstWin.test.ts` (B), `lib/dashListOrder.test.ts` (C)
and `fv1/dashEmptyStates.test.tsx` (D).

| Lock | Was | Now |
|---|---|---|
| DB60 P1 (left) | before the first query, the queries door and no chart | **re-pointed**: the set-up card and no chart |
| DB60 P1 (right) | "Ready for lift off?" in the task card's place | **re-pointed**: the task card is the Getting started page |
| DB60 P7 | one drawing (the Courier) and the agents door's glyph or snapshot | **retired**: the doors are gone; the pre-query art is three registered placeholder slots |
| DB60 P8 | the four lift tiles' done states | **retired**: "Ready for lift off?" is gone; Getting started's done states are `gettingStartedRows`, unit-locked |
| DB60 P10 (loading) | the doors and the tiles hold their loaded boxes | **re-pointed**: the set-up card and the tip hold theirs |
| DB601 S1–S7 (whole file) | "Where do I start?": the header button, its answers, spotlight and Escape order | **retired**: the button, its popover and `startAnswers`/`spotOf` are deleted (A1); DFV-A asserts no header buttons before the first query |
| DB71 L3 (first use) | the founding card never under the feed tab, before the first query | **kept**: still holds (the founding card now has the querying column's slot); DFV-A A2 asserts it too |
| DB71 shots (day one) | day-one screenshots | **kept**: they now photograph the first visit |
| IRF-C (pre) | every card carries the skeleton while loading, and no box moves | **kept**: the set-up card and Getting started are `.os-card`/task cards and carry it |
| unit: dashboardPageSmoke | "Ready for lift off?", "Where do I start?" and the doors' copy | **re-pointed**: the set-up card, the tip, Getting started and GETTING READY |
| unit: dashFirstUse.test (tiles, answers) | `firstUseTiles`, `tilesDone`, `startAnswers`, `spotOf` | **retired** with the functions |
| unit: oneScreenMark / oneScreenPanel | Dash60Lift carries no mark / no band | **re-pointed** to the set-up card, the tip and Getting started |
| unit: oneScreenChart "none" | `OneScreenChartEmpty` (the Courier and Log a query) | **retired**: it could never render once loaded; the one-day case now asserts the first point (DFV-D) |
