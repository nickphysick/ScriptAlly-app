# Retired and re-pointed by Header panel v2 (10 Oct 2026)

The pack replaced the header sheet on every workspace route with the blue panel, removed two subheaders and the
Contact list's faces key, and rebuilt the Contact list's desk as badge cards. These locks measured what was replaced.
Each is named with the HP2 lock that holds the same ground now. The sweep was by selector, not by file name
(`data-header-sheet`, `hsheet`, `dsk-card`, `dsk-disc`, `faces-key`, `cl15-sub`, `oh-sub`, `ph--band`, `337`).

## Retired (`test.skip`, with a pointer at the test)

| File | Test | Why | Held now by |
|---|---|---|---|
| `qcV135.measure.ts` | A1 A2 A3 A4 · the centred pair | The three open headers are panels; the centred pair on the sheet is gone | HP2 P1, P5, A1 |
| `qcV135.measure.ts` | A5 · header no jump | Same headers, new construction | HP2 P6 |
| `shellV2.measure.ts` | S5 · art | Every drawing in its census sits in a panel with no sheet under it | HP2 P5, A5 |
| `contactV151.measure.ts` | CL15.1-HD · hawk and desk | The hawk's size and drop, and the icon desk, are replaced | HP2 A1, A5, A6, D1 |
| `contactV152.measure.ts` | CL15.2-K1–K4 · desk | It read the shared icon card (`[data-dk-part="disc"]`, `.dsk-line`) | HP2 D1–D8 |
| `contactV153.measure.ts` | CL15.3-N1–N5 · header | The faces key and the subheader are gone | HP2 A2, A3 |
| `contactV153.measure.ts` | CL15.3-N6 · week card | It read `.dsk-card` | HP2 D3, `contactDesk.test.ts` |
| `contactV15.measure.ts` | CL15-1 · header | It held "nothing paints behind the title", the subheader's text and no border | HP2 P1, A1–A5 |
| `qcV133.measure.ts` | H1 · open | "No ancestor of the title has a ground": the panel is one | HP2 P1 |
| `qcV133.measure.ts` | H2 · the drawing | 326 (253) tall on the column's right | HP2 A5, P5 |
| `qcV133.measure.ts` | H4 · headroom | The drawing's top against the sheet's top | HP2 P1, P5, P7 |
| `qcV133.measure.ts` | H6 · no jump | Same header, new construction | HP2 P6 |
| `qcV134.measure.ts` | N2 · faces | The agent disc's colour (#3d5070; it is #6a81a8 on the blue) and the halo | HP2 A3; order and caps at unit |
| `qcV134.measure.ts` | N3 · faces spacing | Measured from the subheader, which is gone | HP2 A3 |
| `analyticsV17.measure.ts` | AN17-2 · band | Full bleed, 337px, a 250px disc, the band's own blue | HP2 P1, P9 |
| `manuscriptsV21.measure.ts` | H1 open header (both widths) | "No ancestor of the title has a background" | HP2 P1 |
| `manuscriptsV21.measure.ts` | H2 drawing (both widths) | 330 (260) wide, bare | HP2 P5 |
| `pageHeaderV2.measure.ts` | §2 · Comparable titles' full header (three widths) | The open full header's frame, 18 under the bar, text ≤ 55% | HP2 P1, P4, P6 |
| `pageHeaderV2.measure.ts` | §2 · Submission packages' full header (three widths) | Same | HP2 P1, P5, P6 |
| `pageHeaderV2.measure.ts` | §4.4 · the full headers are one header | Compared open headers' tops | HP2 P1 |
| `quietBar.measure.ts` | Q8 | "The text starts on the column's left": a panel's text starts inside its padding | HP2 P1 |
| `livingHeadersV3.measure.ts` | LH1 · LH2 · LH4 · LH6 · LH7 | LH4 and LH7 measured the open header's left edge and the empty page's shape. **LH1, LH2 and LH6 ride in the same test and are no longer re-proved** | HP2 P1, P6 |

## Re-pointed (still run)

| File | Test | Change |
|---|---|---|
| `shellV2.measure.ts` | S2 S3 S4 | Their census is `SHEET_ROUTES`, which is derived from `hasHeaderSheet`. That is now Import, Plans and the Help centre only; no edit was needed |
| `shellV2.measure.ts` | L1 | Its census is the sheet routes plus every band and banner route, so the bands and banners (all on workspace routes) are still measured loading and loaded |
| `shellV2.measure.ts` | S6 · tab | The population floor is three sheet routes, not "more than five". The expected colour was already derived |
| `livingHeadersV3.measure.ts` | LH9, LH11 | "No header paints a rule" allows the panel's own 1px border; everything else they hold is unchanged |
| `inkShell.measure.ts` | INK2 | No edit: it derives the expected tab colour from `hasHeaderSheet`, so a panel route expects the page colour |

See the report (`reports/header-panel-v2/REPORT.md`) for the suites that were run after the pack and their results.
