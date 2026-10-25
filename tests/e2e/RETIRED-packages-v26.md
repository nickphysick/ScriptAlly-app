# Retired with Submission packages v26 (25 Oct) — swept by SELECTOR, not by filename

v26 (design-refs/submission-packages-v26/submission-packages-v26.html) replaces the v4 page and the v3 drawer: the
centred light header and its summary card (`[data-pk4="header"]`, `[data-pk4="summary"]`), the filter pills, the
packages and materials sheets, the v4 drawer, "What's getting replies" with its blush banner, and the v4 empty page.
The page also moved from /manuscripts/packages to /queries/packages (the old path redirects with its query string).
The sweep was `grep -rlE 'data-pk4|pk4-|data-ppv|ppv-' tests/e2e`. Recover any retired file from the parent of the
commit that deletes it.

The page is measured now by **`pk26.measure.ts`** (PK26-R, -W, -B, -E, -X, -D, -S; each proved red by a named break,
`pk26Mutate.mjs` for the source ones), the unit locks `src/lib/packagesV26.test.ts` and
`src/lib/packageReplies.test.ts`, and `materialsPageSmoke.test.tsx` (populated and empty).

## Retired — the subject is gone (4)

| File | Last commit | What it measured | Now |
|---|---|---|---|
| `pk4.measure.ts` | eef381fa | v4's A1–A3, B1, C1–C3, D1, E1, F1, L1 and v3's drawer D1–D6, E2–E3 | PK26-R/-W/-B/-E/-X/-D/-S |
| `pk4Shots.measure.ts` | 7529cdd5 | the v4 report's screenshots | `pk26Shots.measure.ts` |
| `pk4Mutate.mjs` | 7529cdd5 | v4's source breaks | `pk26Mutate.mjs` |
| `seedPk4.mjs` | 7529cdd5 | v4's fixtures (every package retired; one letter, no package; a 2nd edition) | `seedPk26.mjs` ("Locks of v26", its own manuscript) |

## Re-pointed, not retired

| File | Change |
|---|---|
| 38 route censuses and registers (`optedOut.ts`, `plateRoutes.ts`, `hp2Lib.ts`, `pageHeaderV2Lib.ts`, `sh2Lib.ts`, …) | `/manuscripts/packages` → `/queries/packages` (a path rename; the redirect would have carried them anyway). |
| `sh2Lib.ts` | the packages art is `[data-pk26="header"] .p6-hd-art img`. |
| `hr1.measure.ts`, `hr1Shots.measure.ts` | packages leaves the shared hero (its hero is the ref's own navy card, held by PK26-W), as the Query Centre did at v149; HR1-5's break moves to the To-do header's right column (`.td5-hd .td5-tr`). |
| `plateRoutes.ts` | the v26 header and the empty state's promise carry `data-own-header`, so the band / compact / living censuses still exempt the page by name. |
