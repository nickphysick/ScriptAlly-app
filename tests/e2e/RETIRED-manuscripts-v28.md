# Retired by Manuscripts v29 (18 Nov 2026)

Manuscripts v29 (design-refs/manuscripts-v29/manuscripts-v29.html) put the book's details on the page. The book view,
"View summary", the logline strip, the coming-soon bar and the Versions / Submission packages tiles left the populated
page, and `v27/BookView.tsx`, `v28/MsFoot.tsx` and `v28/QuotedLine.tsx` were deleted (nothing else imported them). Each
lock below lost its subject. They are skipped by name in their files (`RETIRED_BY_V29`), not deleted, so the record
stays readable.

| Lock | What it asserted | Replaced by |
|---|---|---|
| MSV27-A1 sections | the page is the book container then the page foot | MSV29 L3 (the desk's columns) · msv29.test D2 (desk order), D3 (retired parts gone) |
| MSV27-A3 card | the header's right block reads "{age} · querying since {day}" with the count as its figure | MSV29 L8 (the vitals) · msv29.test A2 |
| MSV27-B1 the book opens | View summary opens the book view and focus moves into it | none (book view retired, baked decision 2) |
| MSV27-B2 rows | the book view's rows | MSV29 L8 / msv29.test C1 (the Details ledger) |
| MSV27-B3 reduced motion | the book view's cover does not animate under reduced motion | msv29.test F4 (the one animation left, the save flash) |
| MSV27-C1 copy | no "working copy" on the page, book view and drawer | unit msv27Smoke C1 still holds the drawer's hints; msv29.test E1 (no verdict words on the desk) |
| MSV27-C2 opens on the field | the book view's "Add one" opens the drawer on the pitch | MSV29 L6 (Edit / Add one / Add a word count, focus and caret) |
| MSV28-F1 | the page foot fills to the content bottom less 28; two tiles of one height | none (foot retired, baked decision 3) |
| MSV28-A1 | every Edit entry (header, book view, …) opens the drawer, never a modal | MSV29 L6 (every pitch entry) · L9 (header-free save path) |
| MSV28-A2 | the drawer's sections in order, and no Setting in the book view | unit msv28Smoke A2/B (sections, unchanged); the book-view half has no subject |
| MSV28-B1 | the series switch, read back through the book view | msv29.test C1 (Series row: Standalone / Part of a series); the switch itself: msv28Smoke B1 |
| MSV28-E2 | stored legacy ages display as the new labels in the book view | msv29.test C1 (Age category row through `ageDisplay`) |
| MSV281-A1 | the header reads Edit and View summary | MSV29 L2 · msv29.test A1 (one button, Edit details) |
| MSV281-A2 | the logline strip holds no link | none (strip retired) |
| MSV281-A3 | a rust closing quote on the strip and in the book view | msv29.test B2, B6 (one pair of marks, the closing mark bound to the last word) |

Unit locks retired in place (comments beside them): msv27Smoke "the header: … two buttons", "a written logline sits in
the strip alone", "renders the three pages' parts"; msv28Smoke F1 (both cases). Re-pointed: msv27Smoke "every step opens
Edit details" (no book view to close), MSV27 FLOOR 63 → 45, MSV28's `openPage` / `openDrawer` (the desk; "Edit details"),
and tests/e2e/wsHeaders.measure.ts's Manuscripts row (first section = the desk, 24 under the header).
