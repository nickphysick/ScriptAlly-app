# Retired and re-pointed by Query Centre v136

The Query Centre's header left the header-panel-v2 panel for its own open, ruled-corner header; the v135 badge
desk gave way to the active and inactive bands; "View the full list" stands between the bands and
"Recently updated".

## Retired (`retiredV136`)

| Case | What it asserted | Superseded by |
|---|---|---|
| `qcV135` B1–B6 | the badge, the tinted strip, the inner border, the art placeholder, the card body, no overflow | QC136 B1–B5 |
| `qcV135` B7 | the selected card's ring in the court's colour | QC136 B6 (the ring is navy) |
| `qcV135` B8 | the badge desk's loading frames | QC136 B7 |
| `qcV135` B9 | the desk's art slots | nothing: no art is drawn on this desk |
| `qcV134` N1 | the hero number and "queries out" | QC136 A2 |
| `qcV134` L1 | the v134 header, desk and faces held loading against loaded | QC136 B7 |
| `qcV133` H3 | the Query Centre's header rhythm held equal to the Contact list's | QC136 A3, A5 |

## Re-pointed, claims intact

- `headerPanelV2` P1, P4, P5, P7: `/queries` is out of the panel census (`OPEN_HEADER` in `hp2Lib.ts`). The other nine workspace routes are held as before.
- `headerPanelV2` A1–A6: the Contact list's panel alone. The two "the two pages agree" checks are gone with the Query Centre's half.
- `headerPanelV2` C1: the Contact list's badges alone.
- `headerPanelV2` D1: the Contact list's badge cards are held to the badge card's own compact values (badge 64 × 64 at 16, −26; strip 64; inner border 1px solid, inset 6), which the two desks shared, in place of a second page.
- `headerPanelV2` P6: the Contact list is the one held page, so its population is two readings (one a size) where it was four.
- `headerPanelV2` floor: 480 readings, where 600 was the floor with the Query Centre in the census (506 written).
- `qcV134` B1: the band's 64 (52) is measured from the link's row, which now stands above it.
- `qcV131` QC1: the bands start 40 under the header's rule; "Recently updated" follows them.

## Deleted

`QcDesk.tsx` and `qcvDesk135.css` (the badge desk), and the desk's leftover margin and loading rules in `qcv131.css`. The header's faces row and its `living` prop. The `QC_DESK_ART_*` slots stay registered in `qcArt.ts` and are read by nothing.

## Red before this pass, not touched

- `qcV126` QC126-2, `qcV131` QC15, `qcV96` QC13 (as recorded by v134).
- `pageHeaderV2` §4.5, the manuscript switcher (as recorded by v133).
