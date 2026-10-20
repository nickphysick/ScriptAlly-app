# Retired and rewritten by Analytics v21 (16 Oct)

Analytics v21 (`design-refs/analytics-v21/analytics-v21.html`) restyles the desktop page: a light header in place of the band,
a desk in place of the at-a-glance strip, open section heads in place of the banners, rows for the reply window, a journey
for the steps, a band for the records, and four white cards for the caveats. The phone (≤ 760) keeps v17's page, except
the two rebuilt sections (D and E).

Every case below was run against the base (`d3dd2a94`, untouched, `vite preview` on its own port) and against v21, so a
retirement names a case that this pack turned red, not one that was red already. **Only AN17-17's two disc readings were
red on the base** (header v3 put the band in the shared panel, whose disc is not `[data-probe="band-disc"]`); they are
untouched here and still red, and are reported, not fixed.

## Retired whole (`tests/e2e/analyticsV17.measure.ts`)

| Case | What it read | Why it goes | What holds the new page |
|---|---|---|---|
| AN17-4 · rhythm | the band and the strip at the top, then 40px between every frame and the next banner | the band and strip are gone from the desktop; the rhythm is v21's 80/96, 64/72 and 88 | AN21-C1 (tints, edge to edge) |
| AN17-5 · glance | five strip cells, and Last 90 days changing a big number | the strip is not drawn on the desktop (the desk replaces it); the phone keeps it | AN21-B1 (the desk) |
| AN17-6 · banner | each section's perched-art slot 14px into its frame; titles on one line | no banner and no perch on the desktop | AN21-C1 |
| AN17-10 · reply | v17's reply-window chart: one row per reply, dots in status fills | the chart is deleted on both widths (Part D's rows replace it) | AN21-D1 |
| AN17-11 · records | six v17 records, two with a StatusDot | the desktop's records are v21's band; "Longest full read" is retired | AN21-F1 |
| AN17-14 · workspace + footer | the blush caveat workspace (colour, radius 22) | the caveats are four white cards on the page on the desktop | the page smoke + AN21-L1; `AppFooter` is unchanged and still smoked |

## Rewritten (the law kept, the subject moved)

- **AN17-15 · tab** — the expected names of sections 4 and 5 are "Replies against the stated window" and "How long each
  step takes". The law (the tab names the section in view) is unchanged.
- **AN17-16 · thin sample** — reads the desk's figures and chips, the header card's counts and v21's record values in place
  of the strip's cells and v17's records; the "Last 90 days" strip state is gone from the desktop, so its readings are
  retired. The rule (no 0, 0% or bare dash; a statistic under five names its population) is unchanged.
- **AN17-17 · phone** — "the phone reply chart" reads Part D's rows (`[data-a21="rw"]`), which replace v17's chart on the
  phone too. Every other phone reading is unchanged.

## Registers

- `plateRoutes.ts`: `/queries/analytics` leaves `BAND_ROUTES` (now empty) for `OWN_HEADER_ROUTES` — its desktop header is
  page-local (`data-own-header`). The open-header, band and living-header censuses read the registers, so the move is the
  whole change for them.

## Deleted code

- `A17Figures`'s `ReplyWindow`, `StageGaps` and `Endings`; `A17Empty`; `A17Frame`'s `ExampleRow`; `lib/analyticsExample.ts`
  (only `A17Empty` read it).
