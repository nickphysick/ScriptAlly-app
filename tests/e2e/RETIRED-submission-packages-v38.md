# Retired and rewritten with Submission packages v38 (27 Oct)

The page at `/queries/packages` became one page, built over v40 at Nick's ruling: the header, **Your packages** (labels),
the builder, and the results band and showcases. The tab bar (Packages · Query letters · Synopses), the two tab pages,
v40's shelf and its drawer, and v40's Tracking & performance on every tab are gone. A sent package now opens in the
builder **locked**; the package drawer replaces the shelf drawer; Results' figures are packageReplies'
(`src/lib/packagesV38.ts`), first answer, ranked from four answered.

The new suite is `tests/e2e/pk38.measure.ts` (L1–L11) with `pk38.shots.measure.ts`. Unit locks:
`src/lib/packagesV38.test.ts` (L4, L5's derivations). Fixture: `seedPk40.mjs`, unchanged.

## Deleted files

- `tests/e2e/pk40.measure.ts` (v40 L1, L2, L4–L10) — every case drove the shelf, the workbench selector, the tab bar
  or the per-tab tracking, all removed.
- `tests/e2e/pk40.shots.measure.ts` — screenshots of v40's screens; `pk38.shots.measure.ts` takes v38's.
- `tests/e2e/pk26Shots.measure.ts` and `pk261Shots.measure.ts` — the v26 and v26.1 reports' screenshots (gated by an
  env variable, asserting nothing); both drove the tab bar and v26's Results. Their reports keep the images.

## Case by case

| Lock | What it held | Now |
|---|---|---|
| v40 L1 locked | A sent package never opens on the workbench; the shelf drawer offers no change | **Rewritten: pk38 L9.** A sent package opens in the builder, locked: no ✕, no Add, no extra to tick, a lock line. |
| v40 L2 New package from this | The instant copy from the shelf drawer | **Rewritten: pk38 L10.** "Make a copy" opens New package with "A copy of {name}" chosen. |
| v40 L4 shelf / selector | The shelf lists Out and Retired; the selector Draft and Ready | **Retired** with the shelf and the selector. pk38 L2 holds the labels. |
| v40 L5 L6 Packages tracking | Head to head, Scoreboard, Tests and their figures | **Retired** with v40's tracking. pk38 L5 holds Results' figures. |
| v40 L6 L7 letters/synopses tracking | The "No synopsis" card and the per-piece figures | **Retired** with the tab pages. pk38 L5 holds the pieces row. |
| v40 L8 mono census | No mono capitals, on every tab and layer | **Carried: pk38 L8** (the page, the dialog, How it works, both drawers). |
| v40 L9 widths | The shelf, the workbench and tracking share one width | **Retired** with the shelf and tracking. pk38 L6 holds the band's full width. |
| v40 L10 smoke | Every tab renders | **Rewritten: pk38 L11** (no tabs). |
| PK26-R redirect | `/manuscripts/packages?pkg=` opens that package; its button selected | **Retargeted:** its label is the selected one. |
| PK26-W insets | Header 92, tabs 72, builder 48, Results 48 | **Retargeted:** header and builder only (the tab bar and v26's Results are gone; pk38 L6 holds the band). |
| PK26-E editions | Changing a sent package's letter starts an edition | **Retired.** Red since v40, which locks a sent package; pk38 L9 holds the lock. |
| PK26-X extras | Ticking an extra on a sent package | **Retired.** Same reason as PK26-E. |
| PK26-D drawer frame | The drawer's header stops at its inner border | **Retargeted:** opened from Your materials' pencil (the Query letters table is gone). |
| PK26-S Results threshold | v26 Results: under the threshold, Too early, not ranked | **Retired.** Red since v40 replaced v26's Results; pk38 L5 and the unit L5 hold it. |
| PK26-T stuck tab bar | The tab bar spans the sheet when stuck | **Retired** with the tab bar. |
| PK26-H note | One-line note, or + Add a note | **Retargeted** onto the labels. |
| PK26-RT Results retired | v26 Results lists a retired package last | **Retired** with v26's Results. pk38 L4/L5: a retired package can win Sent the most, never Still to prove. |
| PK26-B, N, M | Drop rules, the sidebar row, Your materials' rows | **Unchanged, green.** |

⚠️ Nine PK26 cases were red on this build before the retargets. Seven of them could not have passed since v40 (R, W, E, X, H, S, RT: they read the v26 package buttons, a sent package's edits, or v26's Results, all of which v40 replaced), so this file had gone unrun since v40. D and T went red with v38 itself (the table and the tab bar they opened from are gone).
