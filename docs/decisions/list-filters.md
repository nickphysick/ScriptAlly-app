# List filters — the Filter panel, Sort, Group and the applied row (Queries list and Agents list)

## Current state (List filters v1, 19 Nov 2026; ref design-refs/list-filters-v1/; report reports/list-filters-v1/REPORT.md)

- **One panel, two pages.** The filter column on `/queries` and `/agents` is `shell/FilterPanel` (presentation only), styled
  by `shell/filterPanel.css`. `QcViews156` says what the Queries panel holds; `ContactViews` what the Agents panel holds.
  `shell/ViewsPanel` is deleted. The card keeps the rail's bones (`qc153-rail`: column, 268 width, stickiness,
  `useTallRail`'s "too tall to pin"); it never scrolls inside itself.
- **Shared parts** (all in `shell/`): `FilterTile` (+ wide), `FilterTiles`, `FilterPills`, `FilterSplit`, `FilterSwitch`,
  `FilterFold`, `FilterSection`, `Num` (the count, with its tween); `StageBar` / `StageLabel` (`shell/StageFilter`);
  `AppliedRow` (`shell/AppliedRow`). Sort is `shell/SortChip` (its labelled form); Export is in `shell/ListBar`.
- **Each page has its own filters.** Queries: What needs you (four tiles, one at a time), Stage (bar + five labels; a label
  toggles every status in `STAGE_STATUSES[stage]`), What you sent, Dates (a fold). Agents: Who to query next (Ready to
  query wide; Always reply and Missing details independent), the two splits, What they want. `where` (Queries) and
  `status` / `action` / `mats` / the set (Agents) have no control but still filter, show as chips, and Clear all clears them.
- **Counts are faceted** and come from `lib/qc153Rail` `railCounts` / `lib/contactV27` `railCounts`: the number is what
  the list would show if that control were pressed. Zero and off is faint and inert.
- **One chip per choice.** A whole stage is one chip on its band; Ready to query is one chip (`appliedChoices`); the
  search is a chip in quotes. "Clear all" is the only clearing word on these two pages.
- **Sort and Group are labelled and stay in step with the headings.** Queries sorts over `Sort151`
  (`lib/cardsSort` `QC_LIST_SORT_FIELDS`); "No grouping" is a menu choice and is remembered (`savedGroupOf`).
  The bar is one line: `ListBar`'s `fitBar` folds "Sort:"/"Group:" then Export's word when Find falls under 160px.

## Rules

- **Colour means something or it isn't used.** Stage colours come only from `lib/stageColours`, written inline, and appear
  only on a stage: the bar, the labels, a whole stage's applied chip. Everything else in the panel, the bar and the
  applied row is navy `#2a3a52`, cream `#f4eee5`, white or paper (`#faf7f2`, `#f6f3ee`, `#e9e3da`). No powder blue.
  Status marks are ink, drawn by `StatusDot`.
- **Probes are the page's own**: `data-qc156` on Queries, `data-clq` on Agents (panel); the applied row is `data-qc1511`
  / `data-cl26` (`applied`, `applied-chip`, `applied-clear`). Every workspace page stays mounted.
- **Motion confirms and never loops**; every transition and animation sits inside
  `@media (prefers-reduced-motion: no-preference)`, and `Num` lands at once under reduced motion.
- **Locks**: tests/e2e/lf1.measure.ts LF1–LF13 (one panel, pages differ, stage colours, nothing arbitrary, stage writes,
  counts, ready, sort is one state, no grouping, export, one line, one word, reduced motion); unit tests
  shell/filterPanel.test.tsx, shell/appliedRow.test.tsx, queries/centre/qcViews156.test.tsx, agents/contact/
  contactQcLayout.test.tsx.
