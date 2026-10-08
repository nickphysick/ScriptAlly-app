# Contact list v15.1 — report (8 Oct)

One phase on `main`, on top of v15 (`0e9c98ef`). Not deployed.

## False premises, first

1. **"The footer is shared, so this changes every page."** It changes three. `AppFooter` is opt-in and is rendered by
   the Query Centre (`Queries.tsx`), Analytics (`QueryAnalytics.tsx`) and the Contact list (`AgentList.tsx`). No other
   route has a footer. It is one shared component (`src/components/shell/AppFooter.tsx` + `appFooter.css`) and no page
   sets a footer background of its own, so §5's stop condition did not apply.
2. **The 56 (36) gap cannot be a minimum on every account.** At 1512 the app's content column is 1160 wide (the mock's
   is 1167) and the harness account's title, "37 agents on file", is 625.5 wide. 625.5 + 56 + 490 is 1171.5. The
   drawing keeps its 490 and its right edge (H1, H2), so the gap is 44 there. Preflight's `max-width: 100%` had
   squeezed the drawing to 478 instead; that is fixed (`max-width: none`, and it overhangs its track to the left).
   A three-digit count will close the gap further. Say if the title should give instead.
3. **The mock disagrees with the prompt in three places; I followed the prompt in two.**
   - Desk titles read 16px at 1280 in the mock. The prompt says 14 below 1440. Built at 14.
   - The mock's footer hairline runs the full sheet width. The prompt says the content column. Built in the column.
   - The mock renders 73 (65) from the band's edge to the grid, because its band has 1px of padding around a 72 (64)
     margin. Built at 73 (65): that is what puts the panel exactly 39 (31) inside, and it is inside B2's ±2.

## What changed

| Part | Change | Files |
|---|---|---|
| Header | Hawk 490 (380), at the column's right edge, dropped 30 (24) by `position: relative; top`, painted over the rule. No top margin. Hairline at 14%. The text centres against the drawing's layout box exactly (0.0 apart). | `contactV15.css` |
| Desk | 72 (60) under the hairline. Titles 16 (14). 16 (12) under the header row. Cards are 203 (185) tall. | `contactV15.css`, `shell/desk/desk.css` |
| Band | `#e9e6e0`, the sheet's full width as a spread shadow clipped to the band's height; the box stays the column. 64 (52) above, 56 below. Card ring at 10%. | `contactV14.css`, `shell/featureStage/featureStage.css` |
| Footer | No ground: `background: var(--ws-page)`. No shadow, no clip. 40 above. One hairline (ink 14%) and 52 of padding on `.af-in`. | `shell/appFooter.css` |

One change the prompt did not list: the "Your agents" panel's bottom margin went from 60 to 20, so panel to footer
hairline is 60, as the mock renders it. With the footer's new 40 it would have been 100.

`shell/desk` and `shell/featureStage` are imported by the Contact list only. No Query Centre file was edited.

## Locks — `tests/e2e/contactV151.measure.ts`

Red readings are from the pre-v15.1 build (`0e9c98ef`). Where the baseline was already inside a lock's range, the
named mutation is what proved it. All 14 mutations went red (`mutation-proofs.jsonl`).

| Lock | Red, 1512 / 1280 | Green, 1512 / 1280 / 1920 | Mutation |
|---|---|---|---|
| H1 width | 400 / 310 | 490 / 380 / 490 | 400 and 310 restored |
| H2 right edge = desk's | 1377.9 vs 1455.6 / 1152.8 vs 1231.0 | equal at all three | `justify-self: start` |
| H3 bottom below the rule; drawing painted there | −11 / −11; `DIV`, `HEADER` | 19 / 13 / 19; the drawing | `top` removed |
| H4 text centre vs layout box | 4.0 apart / inside range | 0.0 / 0.0 / 0.0 | drop as a margin: 15 apart, header 41 taller |
| H5 top below the sheet | inside range (28 / 24) | 30 / 24 / 30 | top margin restored: 58 / 52 |
| D1 rule to desk | 28 / 28 | 72 / 60 / 72 | 28 restored |
| D2 titles; row gap; height | 18px, 8 / 15px, 8 | 16px, 16, 203 / 14px, 12, 185 / as 1512 | 18px titles; 8 under the row |
| B1 tint and painted edges | no background; page colour at both edges | band colour at both edges, all three widths, both states | shadow removed: page colour at both edges |
| B2 gaps | 0, 100, 92, 0 / 0, 90, 84, 0 | 64, 73, 73, 56 / 52, 65, 65, 56 / as 1512, both states | padding removed; margins removed; ring at 8% |
| F1 footer | `rgb(235, 233, 229)`, shadow ground, no inner rule, on all three routes | page colour, no shadow, inner rule, 40 above, on all three routes | `#ebe9e5` restored; inner rule removed |

B1 samples pixels, because a spread shadow has no box to read. The sheet shades its own last 10px, so an edge pixel is
compared with the band colour under the same shade, taken from the page ground at the same x.

A unit lock in `appFooter.test.tsx` holds the token read (red on the `#ebe9e5` mutation).

### v15 locks retired (`tests/e2e/RETIRED-contact-list-v15.md`)

- CL15-1 "the drawing starts 56 (36) after the text block" and "the drawing is 400 / 310 wide" (H2, H1).
- CL15-2, the whole lock: "8px or more below the top bar" (H5).
- CL15-3 "every card is 200 / 186 tall or less" and "the desk is 28 under the header's hairline" (D2, D1).
- CL15-5a's two gaps, 66 (56) and 58 (50) (B2).
- CL15-1's hairline reading was re-pointed from 12% to 14%.
- `analyticsV17.measure.ts` AN17-14 "the footer's top rule spans the main column": the rule runs the content column now (F1 measures it on that route).

## Gates

- tsc: 0 errors.
- Vitest: 538 files, 8,446 passed, 3 skipped (baseline 8,445; one case added).
- Build: exit 0, whole log read: no error and no CSS warning; the standing chunk-size and dynamic-import notes only.
- e2e, one worker: see "Neighbours" below.

## Screenshots

`reports/contact-list-v15-1/shots/`, beside the pack's `screens/`:

| Pack | Built |
|---|---|
| `01-header-and-desk-{1512,1280}.png` | `header-desk-{1512,1280}.png` |
| `03-band-ready-{1512,1280}.png` | `band-ready-{1512,1280}.png` |
| `02-band-all-queried-{1512,1280}.png` | `band-all-queried-{1512,1280}.png` |
| `04-footer-{1512,1280}.png` | `footer-{1512,1280}.png` |

Written only with `CL151_SHOTS=1`, so a routine run does not dirty them.

## Neighbours

One worker, on the v15.1 build:

- `contactV151`, `contactV15`, `contactV14`, `contactV13`, `contactV11`: 47 passed, 0 failed.
- `qcV126` QC126-11 (the Query Centre's footer): passed, unchanged.
- `analyticsV17` AN17-14: passed after the one retirement above (28 readings).

Another session was running Query Centre suites on the same harness account during these runs. Nothing collided.

## Files

- `red-ledger/` — every reading on `0e9c98ef`. `ledger/` — every reading on the v15.1 build.
- `mutation-proofs.jsonl` — the 14 mutations and what each turned red.
- `design-refs/contact-list-v15-1.html` is committed with its hash in `.refhashes.json`.

## Open, for Nick

1. The header gap on a wide title (false premise 2): the drawing wins today.
2. The footer hairline: content column (the prompt) or full sheet (the mock)?
3. Desk titles at 1280: 14 (the prompt) or 16 (the mock)?

