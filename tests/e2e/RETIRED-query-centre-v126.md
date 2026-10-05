# Retired with Query Centre v126 — what went, and why

**Recoverable at `d41e168b`** (the last commit that still contains them).

These were run against the v126 build on 5 Oct (127.0.0.1:4413, no stale-bundle refusals): 49 red, 14 green.
Every red names a subject this pack deletes: the fan, the rail, the expanded card, the view switch, and
the one-line list head. Where a claim survives the rebuild, the line says which v126 lock re-states it.
Where nothing does, it says **SUBJECT LIVE, uncovered**.

## Whole files

| File | Subject | Verdict |
|---|---|---|
| `qcFan.measure.ts` | `QcFan`, dealt from a desk section | **Gone with its subject** (phase 3). The carousel replaces it; QC126-5/6/7 lock it. |
| `qcV65.measure.ts` (38 cases) | the rail, the expanded card, its date row, its Filter/Group/Sort, `?view=`, and the docked card beside the ledger | **Gone with its subjects** (phases 4, 6). The drawer re-states the timeline claims in QC126-12…19. The 6 greens were the ref-mode check, the under-900 drawer, the entrance, reduced motion, Escape and the report header. **SUBJECT LIVE, uncovered:** the entrance-runs-once and reduced-motion claims, which no v126 lock re-states. |
| `qcV95.measure.ts` | v95's desk, list head, rail bars and rail header | **Superseded by `qcV96.measure.ts`**, which carries every case still standing (below). Its reds are the same reds as v96's retired cases. |
| `fixtures/qcRailHeader.a5770cdd.json` | the rail header's byte capture | **Gone with its subject** (QC10 in v95/v96). The rail is deleted. |

## Cases cut from `qcV96.measure.ts`

| Case | Verdict |
|---|---|
| QC2 · the desk counts the manuscript, never the filtered list | **Gone.** The desk no longer filters the list (phase 3). QC126-6 locks the reverse: the desk chooses for the carousel and leaves the list identical. |
| QC3 · a section filters the list AND sets the rail's control | **Gone with its subject**: no rail, and no list filter from the desk. |
| QC5 · the folds at 1460 / 1366 | **SUBJECT LIVE, uncovered, needs re-keying.** The folds are container queries on the row's width. With the rail gone, the row at 1460 has the room to keep Queried, so the viewport-keyed claim reads red on a correct page. The law (fold on the row's own width) stands; the lock should state the container widths 751 / 663, not viewport widths. |
| QC9 · the rail's bars | **Gone with its subject.** The drawer's bars are QC126-17. |
| QC10 · the rail's header byte-identical | **Gone with its subject.** |
| QC11 · Group = urgency draws the rail's three courts | **Gone with its subject.** The drawer's grouping is QC126-19. |

## Kept in `qcV96.measure.ts`

QC1 (the desk's equal sections), QC4 (nothing the app chooses truncates), QC6 (the tray), QC8 (what you
sent), QC12 (the tray's buttons) and QC13 (the guide). The floor now expects those readings.

⚠️ **QC4 is red, and it is not this pack's fault.** "Send partial 2 days over" truncates in the 160px
Coming-up column at every width. v126 changed neither the verb (`lib/qcComingUp.ts`; only `trayRequest`
was added) nor the row's grid. The "N days over" figure appears once a query's send-by date passes,
so a fixture date drifted past and exposed the overflow. It's kept red because it is a real overflow
on the page, reported in `reports/qc-v126/REPORT.md` §7.
