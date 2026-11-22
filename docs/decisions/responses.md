# Responses — decisions

> Merged 22 Nov 2026 (consolidate-main-v2): the dev line's newer sections come first, then main's earlier rounds, as the dev copy's own note asked.

## Current state (Responses v15, 17 Nov 2026; ref `design-refs/responses-v15/responses-v15.html`)

- **The page, top to bottom:** the shared navy workspace header (Workspace headers v1, unchanged in place) · A word on
  rejections (the grey band; only with a Rejection collection entry) · the line of facts (early days: the white note) ·
  Agents who want to read on (a row carousel of the Query Centre's own grid card) · In their words (one note at a time)
  · the Rejection collection (one sortable list). Nothing back yet: the header, While you wait, three features.
- **Every figure is `lib/responses` over `buildQcRows`** (`headerTally`, `factsLine`, `notesFor`, `collectionOf`,
  `listCollection`…). A reply is asked for more + passed; a no-reply close is never a reply.
- **The carousel's card is `QcCard154`, imported unchanged.** Its facts are the Query Centre's (Sent · Next), not the
  ref's per-state boxes (Asked · Offered · You sent it): the ref's facts cannot be shown without changing the card.
- **The grey band shares the founding writer band's construction** (`src/components/shared/stripBand.css`, `.sband`
  `.sband--rose` / `.sband--grey`), lifted from `dash2Founding.css` with its values unchanged. The feedback pop's strip
  uses it too. Its Hide is `todoPrefs.responses.wordFolded` (lib/responsesPrefs), as the founding fold is stored.
- **The name is Rejection collection** on the route, in the composer's tick and in the share builder (its image and
  file name included). The phone keeps "Wall of no" for now; other desktop strings that still say it are listed in
  reports/responses-v15/REPORT.md §7.
- **Share your story (both buttons) opens the existing share builder** under the collection. The query story is a
  later prompt.
- **`offWallIds` still applies:** a pass kept off is counted in the header and the facts, and left out of the collection.
- **In their words advances every 9s** (`NOTE_ADVANCE_MS`), waits on hover, focus or an open panel, stops for good on a
  pick, and is off under reduced motion. Locks shorten it with `window.__RS15_ADVANCE_MS`.
- **One 72px gap between sections, 30px from the header to the band** (`--r15-sg`, `.rsp15-body > *`).
- **Locks:** `tests/e2e/rs15.measure.ts` (`RS15_MUTATE=<lock>`), fixture `seedRs15.mjs` (self-cleaning, emulator),
  units `src/lib/responses15.test.ts`, smoke `src/components/responsesPageSmoke.test.tsx`. Retired:
  `tests/e2e/RETIRED-responses-v15.md`.
- **Lift candidates left page-local:** the tally drawing (`RspTally`, also used by the collection), the quote card and
  pill (`.rsp15-qt`, `.rsp15-pl`), the postmark stamp and the segmented switch (`.rsp15-seg`).

Earlier history (v2–v5) is in the old CLAUDE.md's Responses sections and `reports/responses-v5/REPORT.md`.

---

# Earlier rounds (main's copy, moved from CLAUDE.md on 11 Nov)

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
