# Responses — decisions

## Current state

- Responses v2 (15 Oct): the third Queries tab, `/queries/responses`; ref design-refs/responses-v4/, report reports/responses-v2/REPORT.md.
- Every figure comes from lib/responses.ts over the Query Centre's rows.
- Moved verbatim from CLAUDE.md on 11 Nov 2026 (CLAUDE.md diet; map in docs/claude-md-diet/MAP.md). Sections are newest first by the date in their heading; undated sections come last. A section headed “Branch-only” was recorded as not merged; the note under it says what the 11 Nov check found.
- Later work than the newest section here may exist on branches, with its report under reports/<name>/REPORT.md on that branch. Check `git log` before trusting any “current” claim below.

## Branch-only (not on main): `responses-v2`

_Recorded in CLAUDE.md as not merged. Checked 11 Nov 2026: no branch of this name exists any more, local or on origin (CLAUDE.md records that merged branches were deleted on 15 Oct when main took the dev stack)._

## Responses v2 — every answer, the requests as a carousel and the nos as a list (15 Oct; ref = design-refs/responses-v4/responses-v4.html + screens; report reports/responses-v2/REPORT.md; branch `responses-v2` off the dev branch @ 954a9413, NOT merged)
- Responses (v2, `/queries/responses`): the third Queries tab. The Contact list / packages centred light header ('— RESPONSES —', '{n} answers from agents', byline, + Record a response / Share your wall of no; no illustration) with one card: Asked for more / Passed / No reply counts and a Reply rate ring ((more + passed) ÷ answered, ink only). Then Asked for more as a carousel of large request cards (your move first) on a paper-white band; the blush banner; the hand-drawn tally; the nos as a white list sheet (navy row with All / Passed / No reply and search, sortable headings, month dividers, pinned). Then the share-image builder. Cards and rows open in the query panel's container (`?answer=`). Each answered query appears once, by its latest answer.
- Empty /queries/responses: navy panel with the wall hawk, How it works, Ways to get started. Answers but no nos: the 'Rejections are part of querying' banner in place of the tally and list.
- **⚠️ EVERY FIGURE IS `lib/responses.ts`, over the Query Centre's own rows (`buildQcRows`).** Placement is the query's current status (its latest rung): Partial / Full requested, R&R and Offer, and the three sent states (Partial sent, Full sent, Resubmitted), are Asked for more; Rejected is Passed; No Response is No reply. **Queried, Withdrawn and Signed are not on the page.**
- **⚠️ A PERSONAL NOTE IS `rejectionFeedbackType === "detailed"`**: the journey's `feedbackType: "Yes"` as `recordResponse` stores it. Only that keeps `rejectionFeedbackText`. **There is no note on a partial or full request in the model**, so only a revise-and-resubmit card (`rrNotes`) can carry a quote.
- **⚠️ PAGE-LOCAL COPIES, NOT LIFTS:** the header and card, the sheet, the in-sheet search, the heading strip, the banner, the empty page and the index card are restated under `rsp-` / `rsn-` from the same values, because each is page-local on its home page. Lift candidates with packages v4, the Contact list and the Query Centre.
- **⚠️ THE PANEL IS `SidePanel` IN THE QUERY PANEL'S DRESS (`.qsp .qcv-open-*`)**, as the Contact list's agent panel is, claiming the right-hand panel as the new owner `"answer"`. Journeys step into it through the drawer's `panel` request; "Edit the response" is the edit journey on the closing entry. The header's "+ Record a response" is query panel v2's door (`openResponsePicker`), so it opens the Query Centre's panel.
- **⚠️ COMPACT IS THE SHELL'S `sheet-wide` SWITCH** (a sheet 1440 or less), not the window's, as on every page in this family: a 1512 window is compact.
- **Locks:** `tests/e2e/rs2.measure.ts` A1, A2, B1–B4, C1–C4, D1, D2, E1, F1, F2, L1 (fixtures `seedRs2.mjs`, removed in `afterAll`); `src/lib/responses.test.ts` (D1 data and the panel's words). Mutation runner `tests/e2e/rs2Mutate.sh`.
