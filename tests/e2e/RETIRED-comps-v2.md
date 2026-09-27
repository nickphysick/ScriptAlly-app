# Retired with the Comparable titles v2 rebuild (27 Sep) — swept by SELECTOR, not by filename

The v2 rebuild (design-refs/materials/comps-v2.html; `ComparableTitlesPage.tsx` rewritten across
P2–P6) retires the v3 page's `ct-` markup wholesale: `.ctpage`, the grid's `ct-wpg` class, the
`ct-pagebody`/`ct-toprow`/`ct-qline`/`ct-crow`/`ct-cform` family, `#ct-f-*` form ids, the
`ct-feature`/`ct-stages` marketing blocks and the mounted ScoutPanel (`ct-sbody`/`ct-upsell`). The
sweep was scoped by those selectors (`grep -rlE '\.ct-[a-z]|ct-wpg|ctpage|#ct-f-|"ct-' tests/e2e`),
which found 20 files. Recover any retired file from its last commit (the parent of the commit
that deletes it).

The page is measured now by **`compsMat.measure.ts`** (S1–S7, C1–C9, against the mock by the same
ruler), plus `pageHeaderV2.measure.ts` §2 and §4.4.

## Retired — the subject is gone

| File | Last commit | What it measured | Now |
|---|---|---|---|
| `comps21.measure.ts` | a555535b | v2.1's header and top row (`.ct-toprow`, the manuscript tile) | gone — the tile and the row are retired; the header is the shared full `PageHeader` (S2) |
| `comps21Overflow.measure.ts` | 92340466 | v2.1's stacked row pushing the page sideways | gone — no stacked row; S5 holds the column to the gutter |
| `compsReorder.measure.ts` | 2ffbcebf | v3.1's reorder by native `draggable`, the flip, the missteps block | C2 (grip-only pointer drag and Alt+↑/↓, persisted and re-read after reload) |
| `compsScout.measure.ts` | 3ec69b6e | the mounted ScoutPanel's states | C5 — the Scout is "coming soon" and ScoutPanel is mounted nowhere (its code and unit suite stay) |
| `compsV2.measure.ts` | 58cdc01c | the (older) v2 layout claims | gone — superseded by the materials-pack v2 page and `compsMat` |
| `compsV2Card.measure.ts` | 3ec69b6e | the (older) v2 populated card | C1, C3, C4, C6 on the new card |
| `compsV3.measure.ts` | 71e7afb9 | v3's two states (first visit / workspace) | C7 (empty) and the filled frame cases |
| `compsV31.measure.ts` | 2ffbcebf | v3.1's layout corrections | gone — every v3.1 surface is retired |

⚠️ "compsV2" is an unlucky name: those two files are the EARLIER v2 of this page (Aug), not the
materials-pack v2 this rebuild builds. The name collision is why the new suite is `compsMat`.

## NOT retired — shared censuses whose Comparable titles row is now stale (deferred, owner below)

Eleven masthead-era censuses list the page by the grid class it no longer emits (`cls: "ct-wpg"` /
`root: ".ct-wpg"`): `barBinding`, `chromeGround`, `compactHeader`, `contentGeometry`, `handoff`,
`headerFix`, `illoRules`, `slimBar`, `surfaceCensus`, `toolbarIsContent`, `washEdges` (and
`matrix.measure.ts` names `.ct-hero-l` in a comment only). They measure the grid's chrome SLAB,
which an opted-out page does not have — and they carry the Query Centre and the Contact list under
their pre-opt-out classes (`qc-wpg`, `agl-wpg`) in exactly the same way. The row joins that existing
backlog rather than being patched here: re-pointing eleven shared suites is its own pass.
**Owner: the next shell/masthead census pass (Nick to schedule).** `headerFix`, `gapAudit` and
`subWrap` already route through `optedOut.ts`, where Comparable titles joined in P7.
