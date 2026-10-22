# Retired by Manuscripts v27 (22 Oct 2026)

The Manuscripts page became two containers (the book and the coming-soon strip). Versions moved to
`/manuscripts/versions`, unchanged. These locks lost their subject and are retired, deliberately:

| File | Cases | Why |
|---|---|---|
| `manuscriptsV21.measure.ts` | B1, B2, B3, V1–V5, M1, F1 (skipped by name; its floor no longer applies) | the book card, the your-move rows, the versions banner and section, the material doors and the footer left the populated page. E1 (empty) and E2 (just deleted) still run: those states are v21's, unchanged. |
| `hr1.measure.ts` HR1-8 | the `manuscripts` case | it held the v21 header's boxes (`[data-ms21='header']`) unchanged; that header is gone from the populated page. |
| `sh2Lib.ts`, `qc135Lib.ts`, `hp2Lib.ts` | their `/manuscripts` entries | they name v21 classes (`.ms21-art`, `.ms21-band`, `.ms21-ban`, `.ms21-hd`) that the populated page no longer draws. Left in place; these censuses were already overtaken by later headers and are listed so a red there is read correctly. |

Unit locks retired in `src/components/manuscripts/v12/msv21Smoke.test.tsx` (each states it where it was): the filled page's
sections, the StatusDot census, the three-step PageGuide, the activity row door. `compsInQueryRetired.test.ts`'s page half
now asserts the absence of comps facts on the page.
