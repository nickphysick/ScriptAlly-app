# Retired with Submission packages v4 (14 Oct) — swept by SELECTOR, not by filename

v4 (design-refs/packages-v4/packages-v4.html; the drawer is v3's, design-refs/materials/packages-v3.html) replaces the
v2 / v2.1 page: the full `PageHeader` with its living sentence, the inline composer and its drag-and-drop, the
Materials rail (`PageRail` + `PkgMaterials`), the v2 card (`PkgCard`, `[data-ppv="pkg"]`), the centred
`PkgMaterialModal` / `PkgRenameModal`, the material drawer and the "Side by side" band. The sweep was
`grep -rlE 'data-ppv|\.ppv-' tests/e2e`, which found the three suites below (headerV3, livingHeadersV3 and
pageHeaderV2 name the route without measuring a `ppv-` part; their rows are re-pointed, not retired). Recover any
retired file from the parent of the commit that deletes it.

The page is measured now by **`pk4.measure.ts`** (A1–A3, B1, C1–C3, D1, E1, F1, L1 and v3's D1–D6, E2–E3), the unit
lock `src/lib/packageReplies.test.ts` (v3 E1), and `materialsPageSmoke.test.tsx`.

## Retired — the subject is gone (3)

| File | Last commit | What it measured | Now |
|---|---|---|---|
| `pkgMat.measure.ts` | 0a0ab1ed | v2's light profile: S1–S7 shell conformance, P1–P9 (composer, drag-and-drop, rail chips, card actions, Side by side, empty state) | A1–F1 and v3 D1–D6; the shell conformance belongs to the shell's own suites |
| `pkg21.measure.ts` | 071750c0 | v2.1: V1–V9 (the material ⋯ menu, rename modal, put away, results tiles on the card) | D1 (materials sheet), v3 D1/D3 (drawer), C3 (the card's foot) |
| `packagesPartB.measure.ts` | b6f0ed1a | the journey's Part B on the v2 card: editions and the results tiles | v3 D5 (an edit starts the next edition; a rename does not), E1 unit (edition-true crediting) |

## Re-pointed, not retired

| File | Change |
|---|---|
| `headerV3.measure.ts` | `/manuscripts/packages` leaves `NUMBER` (and its `WORDS` / `ROWS` entries): the number panel is gone. |
| `livingHeadersV3.measure.ts` | the packages row leaves `PAGES`: no living sentence, no exhibit. |
| `plateRoutes.ts` | `/manuscripts/packages` joins `OWN_HEADER_ROUTES` (page-local header), so `pageHeaderV2` §4.4 and the band / compact / living censuses exempt it by name. |

`seedPackagesV21Fixture.mjs` and `seedPackagesV2Fixture.mjs` stay: nothing reads them now, and they are the way back
to the fixtures the retired suites used.
