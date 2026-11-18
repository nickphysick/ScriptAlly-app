# Responses (`/queries/responses`) — decisions

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
