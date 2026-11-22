# Retired and re-pointed by Contact list — Query Centre layout v1 (14 Nov)

This run gives the Contact list the Query Centre's layout:
- the Query Centre's navy header (`ContactHeaderQc`, through `shell/OpenHeader`) replaces v27's open header (`ContactHeader27`);
- the Query Centre's Views panel (`ContactViews`, through `shell/ViewsPanel`) replaces the v27 filter rail (`ContactRail27`);
- the Query Centre's light bar (`ContactBar`, through `shell/ListBar`) replaces v26's navy band inside the card.

The stuck mask and the pin's `stuck` reading are deleted (`contactV26.css`, `ContactSheet26`). `healthNudge` and v26's on-navy ring colours (`ring26Colours`, `RING26_TRACK`) are deleted with the header that used them. Each lock below is `test.skip` in place with a one-line note, or re-pointed with a comment at the line.

## Retired (the subject is gone)

| Suite | Case | Held now by |
|---|---|---|
| cl26 | H1 · the open header | clq1 L1, L3; contactQcLayout.test Phase 1 |
| cl26 | H4 · the band: count, Find, Group, Sort | clq1 L2; contactQcLayout.test Phase 3 |
| cl26 | H10 · Group and Sort menus, the rail's quick picks | contactQcLayout.test Phases 2–3; clq1 L4 |
| cl26 | H11 · Missing details + a genre, from the rail | clq1 L4, L5 |
| cl26 | shots | clq1 screens |
| cl27 | H1 · the open header | clq1 L1, L3 |
| cl27 | R1 · the rail beside the list | clq1 L2; contactQcLayout.test Phase 2 |
| cl27 | R2 · every rail control leaves the rows it counted | clq1 L4, L5 |
| cl27 | R3 · the headings stick under the band | clq1 L6 (pinned) |
| cl27 | shots | clq1 screens |
| clh2 | CLH2-5 · one button in the header | contactQcLayout.test Phase 1 (two buttons, Nick's ruling) |
| clh2 | CLH2-6 · List health as the figure | clq1 L3; contactQcLayout.test Phase 1 |
| clh2 | CLH2-12 · the h1 on the list card, the Scout on the panel | clq1 L1, L2 |
| clp1 | CLP1 · one filled navy button | contactQcLayout.test Phase 1 (on the navy the filled one is cream); clq1 L1 |
| clp1 | CLP6 · More filters (the rail's row) | contactQcLayout.test Phase 2 |
| clp1 | CLP13 · under 1000px, the rail above the list | **not re-measured this run.** The stacking rules are re-pointed to the new header (`contactPrinciples.css` §5) |
| clp1Shots | each state | clq1 screens |
| clp2 | CLP18 · List health 32px inside the frame (the nudge) | clq1 L1 (the Query Centre's column) |
| clp2 | CLP19 · the ring's centre on the headline block's | clq1 L3 |
| clp2 | CLP20 · 24px between the headline and the ring (the nudge) | clq1 L1 |
| clp2 | CLP21 · the header ring navy over soft pink | contactQcLayout.test Phase 1; contactPrinciples2.test (the navy pair) |

## Re-pointed (the subject moved)

| Suite | Where | Now |
|---|---|---|
| cl26 | `count` helper: `[data-cl26='count']` in the card | `[data-clq='count']` in the list column (the light bar) |
| cl27 | `rows` helper: the same | the same |
| clp1 | CLP12's count and genre | `[data-clq='count']`, `[data-clq='genre']` |

## Unit locks retired

| File | What | Held now by |
|---|---|---|
| contactHeader27.test.tsx (and its snapshot) | the v27 header; CLH2-7, v26's navy header snapshot (unmounted `ContactHeader26`) | contactQcLayout.test Phase 1. On the navy the ring is now cream over soft pink at every score. |
| contactPrinciples2.test | `healthNudge` (five cases) | deleted with the nudge |
| contactV26.test | `ring26Colours` on navy | contactPrinciples2.test "the List health ring on the navy" |
