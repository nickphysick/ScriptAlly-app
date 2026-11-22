# Query letters v1 — report (6 Nov)

Branch `query-letters-v1`, on `sidebar-rail-v1-dev` (the four Sidebar materials v1 commits, e976cda59 → ace1e6a8f), so
no rebase was needed. Not merged, not pushed. Dev deploy: see the end.

## Commits

| | |
|---|---|
| 58ca79dda | the design refs (`design-refs/query-letters-v1/`, hashes checked) |
| 0103834a7 | Part A — the page and cards, `inUseLetterId`, the one in-use reader, the log journey's default |
| e46b4685a | Part B — Which letter is landing? |
| f8e8e2c76 | Part C — the letter drawer and New letter |
| 8c432a575 | Part D — the empty page and the first letter's note |
| 0fb9ccb3c | Part E — the Pro lock for Materials |
| f4b1449a6 | Part F — e2e (QL1–QL5, 6/6 pass) and screenshots |

Gates on each: tsc clean, production build with no CSS warnings, full Vitest green apart from two
`firestoreTarget.test.ts` cases that were already red at the base (the Contact list v25.x seeders, from ba8ce1226).

## Recon answers

1. **Letters** are `ManuscriptVersion` documents with componentType "Query Letter" (versionName, contentDraft,
   contentType text/link/file/ref, fileName, wordCount, createdDate, status "Retired"). Writers: `db.addVersion`,
   `updateVersion` (refuses content edits once sent; fixes recorded comps once sent), `deleteVersion` (refuses while a
   package holds it), `archiveVersion`. Readers: compUsage, packages, versionsV2, manuscriptSummary, the log journey,
   the comps pages.
2. **A query's letter** is `compUsage.traceLetter`: its `sentVersions` (the letter ids recorded at send; two is
   ambiguous and takes the first), else the package edition that went, else the package's letter now, else none.
   On the harness account **56 of 114 queries resolve to no letter**: The Smoke Test 43 of 52 (41 record nothing, 2 are
   package sends whose package holds no letter), The Quiet Fixture 10 of 10, The Quiet Second 2 of 2, Harbour of Glass
   1 of 8, Murphy's Day Out 0 of 14.
3. **In use** could not be derived cleanly: three readers disagreed (the newest letter; the letter of the latest sent
   query's package; the active package's letter), and a writer with no packages had no answer at all. Stopped; you
   approved one field.
4. **Replies and asked-for-more** are Versions' `isReply` / `isMore` over Analytics' rows (`reachedRequest` = a partial
   or full request or beyond). Withdrawn queries are not counted, as on Versions.
5. **Comps** are logged with `CompLetterPicker` (Comparable titles v25+); the drawer opens that same picker.
6. `HalfDrawer` + the escape stack (`pageDrawer`; the picker sits above at `pageModal`); Versions' lock lives inside its
   own page and has a dev aid; the nav's Pro marks use `navLockedFor`.

## Fields added (optional, no backfill)

- `Manuscript.inUseLetterId` — rules: `isValidId`, and the manuscript update allowlist.
- `ManuscriptVersion.parentId` (the letter it was copied from) and `changes` (one to eight short lines), as Versions'
  `BookVersion.parentId` / `changes`. Rules: `parentId` a string up to 128, create only; `changes` a list up to 8, and
  in the versions update allowlist.

**Prod rules must go with your next prod deploy**, or on prod every "Use for new queries" and every new letter with
changes is denied.

`lib/queryLetters.inUseLetter` is the one reader: the stored letter while it is live, else the active package's letter,
else the newest live letter. The page, its flags and pill, and the log journey's individual-send default all read it.
When the active package holds a different letter, the in-use card adds "Package sends go with {package}'s letter:
{letter}", linking to the package; neither value is changed.

## How earlier queries are credited

By derivation (`resolveLetters`), Versions' Original rule: a query that records no letter (no `sentVersions`, and no
package naming one) and was sent on or before the manuscript's first letter's save day counts towards that first
letter. Nothing on any query is written. A query whose send was recorded without a letter is never credited.

Credit counts in the figures but does not lock the letter: the writer may still edit the first letter's text, because
what went out with those queries was never recorded here. Its foot then reads "Your earlier queries count towards this
letter." The note "You already have {n} queries out…" shows on the new letter's view after the first save (n = the
manuscript's unrecorded, non-withdrawn queries). "It's easy to change on each query" is true: the query's edit journey
can correct what was sent (`sentCorrect`).

## Differences from the refs, and why

- **The cards' and table's bars show the true percentage.** The mock scales them ×3 (a third fills the bar); a bar
  should read as the number beside it.
- **Every letter gets the band.** With no letter sent the band stays and says "Once a letter goes out with a query,
  you'll see how agents respond to it here." (the mock never draws that state).
- **The empty page has no band and no grid**: the pack describes its body as the one card and the explainer.
- **"Upload a file"** reads plain-text files into the letter; any other file (Word, PDF) is kept by name only
  (contentType "ref"), with a note. Materials have no file storage and the app has no Word reader.
- **"Draft"** means "not sent yet". The in-use letter wears the in-use flag instead, even when unsent.
- **"The first letter"** is the oldest letter's line only; an older letter with no recorded changes shows its note or
  nothing (the first smoke caught every legacy letter saying "The first letter").
- **The picker** behind "Change" is a small list under the link (the mock opens the drawer instead).
- **Title type** is the serif, as the screenshots draw it (the mock's CSS names Special Elite, which brand.tsx
  overrides on the h1).

## Open

- **The Scout's floating tab still shows over a locked Comparable titles page.** It is portalled from that page's own
  file, which this pack does not edit. Opening it changes nothing (the Scout is coming soon).
- The harness's three letters on Murphy's Day Out hold only "Dear Agent," as text; the e2e seeds real text into the
  emulator copy for the run only.

## Screenshots (1512 × 982, emulator)

01-page (ref 02) · 03-landing (ref 03) · 04-drawer-letter · 05-drawer-stats · 06-free-lock · 07-free-lock-comps ·
08-empty · 09-new-letter. Ref 01 (the pinned sidebar) is Sidebar materials v1's and unchanged.
