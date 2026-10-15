# Retired by To-do list v5 (15 Oct)

`/todo` on a desktop is the tray and the desk (`src/components/todo/v5/`); the phone keeps the v2 page
(`TodoRoute` chooses by width). The suites below measured parts of the v2 desktop page that are no longer
rendered there. They are retired **by name**, not left to go silently green or loudly red. What replaces each
claim is named beside it. The files are recoverable at `954a9413` (the base this pack was built on).

## Whole files

| File | Cases | Why it retires | What holds the claim now |
|---|---:|---|---|
| `todoV2.measure.ts` | 13 | It opened `/todo` at 1440 and read the v2 tiles, controls, row cards, desk rail and composer. None is on the desktop page. | TD5 A1/A2 (header, card, badge), C1–C3 (sheet, tray, desk), D1 (keys), E1 (doors, zero writes on a row click), F1 (the composer, now in a drawer), G1 (states). |
| `cleanupTodoV2Probe.mjs` | — | Its only caller was `todoV2.measure.ts`. | TD5 F1 deletes its own probe tasks (`Zz td5 probe …`) in a `finally`. |
| `livingHeadersV3.measure.ts` | 6 (LH3, LH5, LH8, LH9, LH10, LH11) | `/todo` was the **last** page in its `PAGES` table: the Query Centre (v133), the Contact list (v15), Comparable titles (v25) and Submission packages (v4) had each left it for a page-local header. With `/todo` gone too the table is empty and every case would measure nothing. | `/todo`'s header: TD5 A1. Its three states: TD5 G1. LH9 (a filtered-to-nothing list keeps its hero) has no subject left anywhere. |

## Entries re-pointed, not retired

| File | Change |
|---|---|
| `plateRoutes.ts` | `/todo` joins `OWN_HEADER_ROUTES`. |
| `headerV3.measure.ts` | `/todo` leaves `NUMBER` (and its `WORDS` entry and tile check). `/todo/corkboard` stays. |
| `mastheadMatrix.measure.ts` | `/todo` is `none` ("a page-local header"). |
| `hp2Lib.ts` / `headerPanelV2.measure.ts` | `/todo` joins `LIGHT_HEADER` on the desktop (P1 reads its own header); P7 at 390 still reads its phone panel; P8's Set-aside door is the light header's `[data-td5="aside"]`. |
| `toolbarIsContent`, `barBinding`, `chromeGround`, `washEdges`, `compactHeader`, `contentGeometry`, `illoRules`, `headerFix` | The page's grid class `tdv2-wpg` → `td5-wpg`. |
| `qcV138.measure.ts` D1 | Its recorded (not asserted) note reads the v5 card rows instead of the v2 tiles. |

## Known, not fixed

- `frame2Recon.measure.ts` is a recon script (no assertions) that still pairs `/todo` with `.tlc`; it was already stale before this pack.
- `corkboardV1.measure.ts` A1 reads `[data-todo-v2="noteboard-link"]` on `/todo` inside a `catch`; on the desktop that link is gone, which A1's claim (no "Noteboard" on the page) is satisfied by.
