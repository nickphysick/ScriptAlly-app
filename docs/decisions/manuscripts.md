# Manuscripts — decisions

> Created on the dev line by Manuscripts v29 (18 Nov 2026). Main already has a `docs/decisions/manuscripts.md`: at
> merge, fold this file's sections into main's by hand, newest first, and keep main's "Current state" in step.

## Current state (Manuscripts v29, 18 Nov 2026)

The populated page (`/manuscripts`, 768px and up) is the shared navy header and, beneath it, a two-column desk.
Design authority: `design-refs/manuscripts-v29/manuscripts-v29.html` (enrolled in `design-refs/.refhashes.json`).
Locks: `tests/e2e/manuscriptsV29.measure.ts` (MSV29 L1–L10) and `src/components/manuscripts/v29/msv29.test.tsx`.

- **Header** (`v27/Msv27Parts` `MsHeader`, on `shell/WorkspaceNavyHeader`): one button, "Edit details" (white, the pen,
  serif 600/18 at the built height). Right block = `v29/Msv29Parts` `MsVitals`: the count with "words" beneath (or an
  underlined "Add a word count" that opens the drawer on the word count), a hairline, the main genre, the age category,
  a cream dot and the status, "{Status} since {d Mon yyyy}" only when Querying and the date exists. The collapsed bar's
  button is "Edit details". The header's box is unchanged from before v29 (MSV29 L1 at 1280/1512/1717).
- **Desk** (`.ms29-desk`): `minmax(0,1fr) 392px`, 24 gap, tops aligned, 24 under the header (the ref's `.head` margin;
  the shared sheet's 48 is taken back page-locally). One column at 1180 and below: Pitch, Details, Your manuscripts.
- **The pitch** (sand band): logline (italic serif in curly quotes; a writer's own outer quotes dropped from the display;
  the closing mark bound to the last word), elevator pitch, synopsis (paragraphs kept; over 90 words it clamps to five
  lines with "Read it all" / "Show less"; "{n} words" always). Written rows: Copy pill + Edit link. Unwritten rows: "No …
  yet." + the reason + "Add one". Band sub-line by how many are written (3 / 1–2 / 0).
- **Details** (stone band, Edit link): five ledger rows, each a full-width button opening the drawer on the first
  section, aria-label "{Label}: {value}. Edit". Foot: "{n} queries sent for this book" (1: "1 query …") + "See them"
  (the Query Centre, scoped by the shell's shared manuscript key), or "No queries sent for this book yet." + "Log a
  query" (railNav `invokeCapture("query")`, the top bar's own entry).
- **Your manuscripts** (stone band): the active book on the rail spine's cloth (#34425c) with the ref's spine strip and
  an "Active" pill — not a control; then the dashed "Add a manuscript" tile with "Coming soon" — not focusable,
  `role="group"` labelled "Add a manuscript, coming soon". Only the active book, whatever the account holds.
- **Feedback**: Copy → "Copied" + tick on the sage fill for 1.8s and a toast "{Piece} copied." (no Undo); a refused
  clipboard → "That didn’t copy. Select the text and copy it yourself." and the pill unchanged. Save → "Saved the
  book’s details." with Undo → "Put back as it was."; each changed pitch row flashes sand → white once (none under
  reduced motion).

## Decisions (newest first)

### 18 Nov 2026 — Manuscripts v29: the book on the page
- **The book's details live on the page.** Supersedes the 21 Oct ruling that they live only in the drawer. The book view
  (`v27/BookView`), "View summary", the logline strip, the coming-soon bar and the Versions / Submission packages tiles
  are retired; `BookView.tsx`, `MsFoot.tsx`, `QuotedLine.tsx` deleted (no other importer). Retired locks:
  `tests/e2e/RETIRED-manuscripts-v28.md`.
- **Undo is a genuine inverse, and never a compensating entry.** `updateManuscript` narrates every save into the feed
  ("You updated a manuscript's details"). Undo therefore writes back through `updateManuscriptQuiet` (no narration),
  then deletes the feed rows for this book that did not exist when the drawer opened (the ones the save made). A status
  move's `statusChangedDate` is put back in a second quiet write, because the quiet write re-stamps it after the fields
  whenever the status moves. The inverse (`lib/manuscriptV29` `inverseOf`) holds exactly the keys the save changed, with
  `deleteField()` for a key that was absent — except the keys `firestore.rules` requires (title, genre, ageCategory,
  wordCount, logline), which a rule-valid book always has and which could not be deleted without the whole Undo being
  denied.
- **The drawer may rewrite a stored genre label on save** (GenreField resolves "Book club" to "Commercial Fiction"):
  existing behaviour, seen in MSV29 L9's shot; Undo restores the stored label exactly.
- **The status mark is the plain navy dot, never StatusDot** (StatusDot is for query states). Labels are italic serif;
  headings the typewriter face; no small uppercase mono labels; no verdict words; no Pro information on this page.
- **Long titles keep the built 54px wrap**, not the ref's `.title.long` clamp (36–48px): wsHeaders H8 locks a
  60-character Manuscripts title at 54px "never smaller". Open for Nick's ruling.
- **The frames are page-local** (`ms29-frame`/`ms29-in`/`ms29-band`): Versions v6's `.v6-card` is scoped under `.vv6`.
  Lift candidates for a shared frame.
