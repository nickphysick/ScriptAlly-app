# Retired with the To-do list v2 rebuild — swept by SELECTOR, not by filename

To-do list v2 (design-refs/todo-list-v2.html, 28 Sep) retires the Grid/List/Board view switch and
every body it switched between — the ticket grid (`.tkt`, `.tkt-grid`), the list card (`.tlc`,
`.listcard`, `.l-body`, `.l-search`), the board (`.brd-card`) — together with the split
(`.tdw-split`/`.tdw-rail`/`.tdw-work`), the old toolbar row (`.tdb-qtool`, `.tdb-popwrap`) and the
seven stat tiles. The page draws one body of row cards (`[data-todo-v2="row"]`) under the shared
full header, beside the desk rail; a task opens in the query drawer or the task pane.

The sweep below is scoped by the SELECTORS those surfaces are reached through, plus the shared
door `todoOpen.ts` (`openTaskInView`/`selectTodoView`), which every To-do suite enters by. That
helper is deliberately NOT re-pointed: it throws "the switch was RETIRED by to-do list v2" the
moment a suite asks for a view, so every file here fails LOUDLY, naming the retirement — never
vacuously green. **The subject of these suites is gone by design; none of them is a regression.**
Their replacement is `tests/e2e/todoV2.measure.ts` (19 cases: anatomy, tiles, controls, rows,
desk, doors). Recover any file's subject from the commit before `f5f2b838`.

Measured, not assumed (Phase 8): a sample of four (`listPort`, `setAside`, `tightened`,
`todoEdges`, 18 cases) was run against the v2 build — **17 failed and 1 passed (the auth setup)**,
every failure on a missing subject: 12 test timeouts clicking a retired element, "the door must
exist", "housekeeping must be showing something", "no such segment" from `selectTodoView`, and two
chain/drawer claims about the retired split. None went green vacuously.

## The census suites (re-pointed, not retired)

`barBinding`, `chromeGround`, `compactHeader`, `contentGeometry`, `headerFix`, `illoRules`,
`toolbarIsContent`, `washEdges` walk every workspace page. Their To-do entry now names
`tdv2-wpg`. **They were already red on `main` before this rebuild** — every one of them fails on
the Query Centre, Analytics or Submission packages entry first (masthead-era claims that page
header v1/v2 retired), so none of them reaches the To-do list; that is a masthead-census pass of
its own and is left to it.

## Retired (subject gone) — 89 files

| File | Reached the retired page through |
|---|---|
| `allSessions.measure.ts` | .tlc todoOpen |
| `anatomyCard.measure.ts` | openTaskInView todoOpen |
| `anatomyDiff.measure.ts` | openTaskInView todoOpen |
| `anatomyRecon.measure.ts` | openTaskInView todoOpen |
| `anatomyShots.measure.ts` | openTaskInView todoOpen |
| `auditRecon.measure.ts` | tdg-row tdg-t tdw-rail |
| `auditRecon2.measure.ts` | tdg-row tdg-t |
| `auditShot.measure.ts` | tdg-row tdg-t |
| `calFixes.measure.ts` | .qvs |
| `calGround54.measure.ts` | tpl-zone |
| `calTint54.measure.ts` | tpl-zone |
| `calTodoCheck.measure.ts` | tdw-rail tdw-work |
| `cardConformance.measure.ts` | tdg-row |
| `cardProbe.measure.ts` | tdg-gtitle tdg-head tdg-row tdg-sec |
| `chaseStory.measure.ts` | .tlc todoOpen |
| `chassis21.measure.ts` | .l-body tpl-zone |
| `chassisShots.measure.ts` | tdg-row tdg-t |
| `closeShots.measure.ts` | .tlc todoOpen |
| `completionLeaves.measure.ts` | .tlc tdw-split todoOpen |
| `completionSafety.measure.ts` | tdg-bpill tdg-row tdg-t tdg-tick |
| `contract.measure.ts` | tdg-row tdw-rail tdw-split |
| `contractShots.measure.ts` | tdg-row tdg-t |
| `deedRound.measure.ts` | .tlc todoOpen |
| `deedShots.measure.ts` | .tlc todoOpen |
| `deployCheck.measure.ts` | tdg-row tdg-t tdg-tick |
| `devVerify.measure.ts` | tdg-row tdg-sect tdg-shd tdg-t |
| `dockIdentity.measure.ts` | tdg-row |
| `drawerMotion.measure.ts` | .l-body .tlc tdw-split tdw-work todoOpen |
| `finishRound.measure.ts` | .tlc todoOpen |
| `fixJourney.measure.ts` | tdg-row |
| `frame2.measure.ts` | .tlc todoOpen |
| `frame2Recon.measure.ts` | .tlc todoOpen |
| `frame2Shots.measure.ts` | .tlc todoOpen |
| `framePort.measure.ts` | .tlc todoOpen |
| `frameShots.measure.ts` | tdg-row tdg-t |
| `groupSweep.measure.ts` | tdg-row |
| `hintSqueeze.measure.ts` | tdg-row tdg-t |
| `item3.measure.ts` | tdg-row |
| `journeyBuckets.measure.ts` | tdg-row |
| `journeyRound.measure.ts` | .tlc tdg-snoozed todoOpen |
| `listLandingShots.measure.ts` | todoOpen |
| `listPort.measure.ts` | .l-body .tlc listcard tdg-bpill tdg-figstack tdg-head tdg-pill tdg-row tdg-sect tdg-sub tdg-t tdg-tick tdw-rail todoOpen tpl-zone |
| `listRound.measure.ts` | .l-body .tlc tdb-qtool tkt-grid todoOpen |
| `listWide.measure.ts` | .tlc tdw-split todoOpen |
| `materialsAcceptance.measure.ts` | tdg-row tdg-t |
| `materialsBulk.measure.ts` | tdg-row tdg-t |
| `materialsEverywhere.measure.ts` | .tlc todoOpen |
| `materialsForm.measure.ts` | tdg-row tdg-t |
| `materialsGap.measure.ts` | tdg-bpill tdg-figlab tdg-row tdg-sub tdg-t |
| `matrix.measure.ts` | tpl-zone |
| `nbFinish.measure.ts` | .tlc todoOpen |
| `nbPaper.measure.ts` | tpl-zone |
| `offerJourney.measure.ts` | tdg-row |
| `openQuery.ts` | todoOpen |
| `pageShots.measure.ts` | tdg-row tdg-t |
| `paneChassis.measure.ts` | tdg-row tdg-t |
| `paneFrame.measure.ts` | tdg-row tdg-sub tdg-t tdw-rail |
| `paneHeight.measure.ts` | tdw-work |
| `paneJourney.measure.ts` | tdg-row |
| `paneMounts.measure.ts` | .qvs .tlc tdw-work |
| `paneRound.measure.ts` | .tlc tdw-work todoOpen |
| `paneShots.measure.ts` | .tlc todoOpen |
| `popupBulk.measure.ts` | .tlc todoOpen |
| `popupRound.measure.ts` | .tlc todoOpen |
| `qcChassis.measure.ts` | .l-search .qvs .tlc tdb-qtool tdw-split tdw-work tkt-grid |
| `qcMatch.measure.ts` | tdw-rail tdw-work |
| `reportShot.measure.ts` | tdg-row |
| `resetView.measure.ts` | .tlc |
| `routeShots.measure.ts` | openTaskInView todoOpen |
| `sheetSlip.measure.ts` | .tlc tdw-split tdw-work todoOpen |
| `statTiles.measure.ts` | tdg-row |
| `steerRound.measure.ts` | .tlc todoOpen |
| `steerShots.measure.ts` | .tlc todoOpen |
| `stickyBand.measure.ts` | tdg-shd tpl-zone |
| `surfaceCensus.measure.ts` | .qvs openTaskInView tdb-qtool todoOpen |
| `taskPaneShots.measure.ts` | tdg-row tdg-t |
| `tightened.measure.ts` | .l-search .qvs .tlc tdb-qtool tdw-split |
| `todoEdges.measure.ts` | .l-body .qvs .tlc tdb-qtool tkt-grid |
| `todoOpen.ts` | .qvs .tlc openTaskInView |
| `todoShot.measure.ts` | tdg-row |
| `todoV2.measure.ts` | .qvs |
| `unitNext.measure.ts` | .tlc tdw-split todoOpen |
| `viewPanels.measure.ts` | .l-search .tlc todoOpen |
| `views.ts` | .tlc tkt-grid |
| `viewsClaims.measure.ts` | .tlc tkt-grid todoOpen |
| `viewsDiff.measure.ts` | .tlc tkt-grid todoOpen |
| `viewsRecon.measure.ts` | .tlc tkt-grid todoOpen |
| `viewsShots.measure.ts` | todoOpen |
| `workspaceRound.measure.ts` | .tlc todoOpen |
