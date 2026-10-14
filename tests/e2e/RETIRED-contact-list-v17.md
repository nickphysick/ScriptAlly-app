# Retired and re-pointed by Contact list v17 (14 Oct)

Contact list v17 replaces v16's navy title panel, At a glance strip and "The full list" heading with one light
header and a summary card; moves search and the filters into the header and the view tools onto the list sheet;
replaces the ink bar and the three pinned layers with one pinned row; and rebuilds the empty page. Each lock below
is `test.skip` in place with a one-line note, or re-pointed with a comment at the line.

## Retired (the subject is gone)

| Suite | Case | Held now by |
|---|---|---|
| contactV16 | A1 · header: the navy title panel | CL17 A1 |
| contactV16 | B1 · strip: four cells | CL17 A2 (the summary card's figures) |
| contactV16 | B2 · filter: a cell filters the list | CL17 A2 |
| contactV16 | C1 · removed: … the heading leads into the list | CL17 A1, B1 |
| contactV16 | C2's reading "the panel and the strip stay on the column" | CL17 A3 (the header is the list's width) |
| contactV16 | D1 · pins: the bar, the filter row and the headings | CL17 C1 |
| contactV16 | D2 · no jitter | CL17 C2 |
| contactV16 | E1 · full screen | CL17 FS1 (the same claims, against the pinned row; the hook is unchanged) |
| contactV11 | Log query opens the query drawer on this page (the hover tray's door) | CL17 D2 |
| contactV11 | v12 §10.7 — the three ways in, the banner, the two live previews | CL17 F1 |
| contactV13 | CL13-14's "content box is the column's" reading, and its empty-state half | CL17 F1 for the empty page; nothing for the column reading (no part of the page is drawn at the column's width now) |

## Re-pointed (the claim stands, the subject moved)

- contactV16: C3 reads the Grouped pill on the list sheet's top row; C2's floor is 13.
- contactV13: CL13-12 holds the light header and the summary card loading and loaded; CL13-13 rings the summary card
  and step 2 is "Find and filter".
- contactV14: CL14-7 (pills 40 tall); CL14-9 (Action required is read off the More filters pill); CL14-11 (the
  headings stick at 68, under the pinned row; the closed disc is #b3aca5); CL14-15 (Always responds is pressed in
  the More filters menu); CL14-16 (the guide's v17 steps).
- Unit: `inkShell.test.ts` (the page-local header is `ContactLightHeader`); `agentsPageSmoke.test.tsx` and
  `livingExhibitSource.test.ts` (the empty page is `ContactEmptyPage`, and mounts no exhibition).

## What is not held by any rendered lock

- The pointer's hover tray on a never-queried row (it stands down there; nothing asserts that it does).
- The keyboard's L on a never-queried row still opens the plain Log a query drawer, not the panel's journey.

## The shared header suites

`headerPanelV2` P1/P4/P5/P7 and `headerV3` H1–H7 walk every workspace route and expect the navy title panel.
`/agents` no longer has one. Both skip it by name (`LIGHT_HEADER` in `hp2Lib.ts`) and check it shows its own
header; `contactV17` A1 and A3 hold that header.
