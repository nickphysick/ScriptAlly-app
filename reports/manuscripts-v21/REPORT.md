# Manuscripts v21 — report

Branch `ms-v21`, built in its own worktree from `origin/main` at `036289e7`. Not merged. Deployed to
dev from the branch (§6).

## 1 · False premises

1. **Nothing on the routed page can delete a manuscript.** §5b describes a state "reached straight
   after `deleteManuscript` in this session", and lock E2 says "after `deleteManuscript`". The only
   caller of `deleteManuscript` is `AllManuscripts.tsx`, which no route has rendered since v12; the
   oracle draws no delete control either. Built as: the page remembers the book it last showed (id
   and title, in memory). When that book is gone and none is left, the empty state names it and the
   toast says so. Whatever deletes the book, the page notices. E2 deletes the document from the
   fixture's seeder while the page is open.
2. **There is no saved comps format.** §3b asks for `queryLine(comps, title, <the user's saved
   format>)`. `ComparableTitlesPage` holds the format in component state and starts on "readers"
   every time; nothing stores it. The card uses "readers".
3. **The comps line does not read as the oracle's.** The oracle draws "For readers of *A* and *B*."
   `queryLine` in "readers" form returns "*Title* will appeal to readers of *A* and *B*." The card
   shows `queryLine`'s own words, as lock B1 requires; `compsPage.ts` was not changed.
4. **The Contact list header wins over the oracle's, by more than 2px.** The oracle's header has 18px
   under the text and a 12% hairline, so its hairline is at 345 (1512). The Contact list's is 10px
   and 14%, hairline at 336.8. §2.2 and lock H1 both say the Contact list wins, so the header is
   built to it (numbers in §2). The drawing's drop is 20 (12 below 1440), not the text's 30 (24):
   the Archivist is taller than the Contact list's hawk, and with the hairline 8px higher a 30px
   drop puts its foot 29px below the line, outside H2's 12–24.
5. **`origin/main` carries the Contact list at v15.2, not v15.3.** The primary checkout's CLAUDE.md
   describes a v15.3 header with 30px of top padding as pushed; `origin/main` (`036289e7`) does not
   contain it. H1 compares against `/agents` as built from this branch. When v15.3 lands, H1 goes
   red until this header follows (as QC133 H3 does for the Query Centre).
6. **The feed's sentences do not fit a 380px card.** §3c asks for "the v13 derivation". Its sentence
   is the dashboard feed's ("Edda Voss asked to read part of *Harbour of Glass*, 52 days after you
   queried"); five of those made the row 696px tall at 1280. The card keeps the v13 derivation for
   which rows exist, their dates, glyphs and sub-lines, and shortens the sentence to the agent and
   what happened ("**Edda Voss** requested a partial"). A record the short table does not name keeps
   the feed's sentence.
7. **"Seven activity records" understates the fixture.** The filled account (carried from v13's) has
   fifteen feed records, three letters and two synopses. The locks read the fixture's own expected
   values, so nothing depends on the count.
8. **A manuscript's status is not a query status.** §3b asks for a "`StatusDot`-style glyph plus the
   status name". The house law is that `StatusDot` draws query statuses only. The glyph is drawn
   (the Queried ring) only while the status is Querying, as v12 and v13 did; the other five show the
   name alone.

## 1a · After the rebase (9 Oct, at merge)

`origin/main` moved once before the merge: Contact list v15.3 (`587a0a7f`), which gives its header
30px of top padding. Premise 5 came true, so this header follows: `padding: 30px 0 10px`. Every y in
§2 is therefore 30 lower on both pages than the table says. MS21 was re-run on the rebased build: 23
of 23, 291 assertions, H1 green against the v15.3 header at both widths. The one rebase conflict was
`design-refs/.refhashes.json`, resolved by re-adding the v21 entries to main's manifest.

## 2 · The Contact list numbers (measured on `/agents`, this branch's build, fonts loaded)

Relative to the page's scroller.

| | 1512 × 900 | 1280 × 800 |
|---|---|---|
| Header top | 0 | 0 |
| Title | 72px Special Elite | 58px |
| Hairline y (header bottom) | 336.8 | 263.7 |
| Drawing | 490 × 325.8, top 30 | 380 × 252.7, top 24 |
| Drawing's foot below the hairline | 19 | 13 |
| First content top | 408.8 (72 below) | 323.7 (60 below) |
| Banner (v15.2) | `#f3ddd2`, padding 36 0 34, arrow 150 × 34 | padding 28 0 26, arrow 120 × 28 |
| Next-step band | `#e9e6e0`, spread shadow clipped to the band's height | same |
| Desk card | `#fff`, radius 16, `0 0 0 1px rgba(28,19,15,.09), 0 14px 30px -26px rgba(28,19,15,.4)` | same |

Manuscripts, as built:

| | 1512 × 900 | 1280 × 800 |
|---|---|---|
| Header top | 0 | 0 |
| Hairline y | 337.0 | 264.0 |
| Drawing | 330 × 335.5, top 20 | 260 × 264.4, top 12 |
| Drawing's foot below the hairline | 18.5 | 12.4 |
| First content top | 409.0 | 324.0 |

Differences from this text, each because the measured value differs by more than 2px:

- Header bottom padding 10, not the oracle's 18; hairline 14%, not 12%.
- Cards are `#fdfcfa`, radius 18, with the oracle's shadow (`0 1px 2px rgba(28,19,15,.05), 0 14px
  30px -26px rgba(28,19,15,.4)`), not the desk card's `#fff` / 16 / 1px ring. The oracle and §1.1
  agree on this, and the second shadow is the desk card's own.

## 3 · Locks retired and rewritten

Named case by case in `tests/e2e/RETIRED-manuscripts-v21.md`. In short:

- **Retired:** v13's M1 (one column), M2 (shelf), M3 (bands), M4 (comp rows), L1 (hero one row).
- **Rewritten:** M5 → V3, V4, V5 · M6 → B2 · M7 → B1 · M8 → B3 · L2 → H1, H2 · L6 → E1 · geometry
  vs mock → H1.
- **Kept as unit locks:** L5 (every glyph is `StatusDot`), L9 (unset facts say so), L11 (no
  appraisal words), and the dialogs' write rules (one write, `factPatch`, the rules allowlist, the
  portal, the London date).
- `msv12Smoke.test.tsx` is replaced by `msv21Smoke.test.tsx`; `manuscriptShelf.test.ts` is unchanged.
- `entitlements.test.ts`: two lines read `ManuscriptPage` and `Msv12Empty` for the packages gate.
  The page reads no gate now, and the lock says so.

## 4 · Each lock's red and green readings

**Red first, on unchanged `main`** (`reports/manuscripts-v21/red-first-on-main.log`): all 22 cases
red, each for one reason, "the page has no v21 header" (a 30s wait for `[data-ms21="header"]`).

**Red by named mutation**, in the measurement worktree, each restored and proven byte-identical
(`reports/manuscripts-v21/mutation-proofs.jsonl`): every one red at its own assertion:

**Green:** 23 of 23 cases, 291 assertions, at 1512 × 900 and 1280 × 800 (the floor is 260).

| Lock | Mutation | How | Red at |
|---|---|---|---|
| H1 open header @ 1512 | Give the header a card (a fill and a radius) | css, injected | no ancestor of the title up to the sheet has a background or a radius |
| H2 drawing @ 1512 | justify-self: start on the drawing | css, injected | the drawing's right edge 1033.921875 is the column's 1207.625 |
| B1 book | Read the author from somewhere other than User.name | source, rebuilt | Author is User.name |
| B2 row @ 1512 | Drop the activity's scope filter | source, rebuilt | the five rows, by query |
| B3 your move | Open the record journey instead of the sent journey | source, rebuilt | the drawer's I've-sent-it journey |
| V1 banner @ 1512 | Let the banner's line wrap | css, injected | one line tall |
| V2 50/50 @ 1512 | 1fr 1.4fr on the versions grid | css, injected | the halves differ by ≤ 2 (463.015625 / 648.21875) |
| V3 deck @ 1512 | Open the deck on the oldest version | source, rebuilt | the deck opens on the current version |
| V4 see all @ 1512 | Keep the See all label static | source, rebuilt | the label flips |
| V5 new version | Show a words line on a version with no count | source, rebuilt | a version without a count shows no words line |
| M1 doors @ 1512 | Make only the door's link text clickable | source, rebuilt | the card's corner opens Comparable titles |
| E1 empty | Put a control inside a preview's sketch | source, rebuilt | a preview holds no control |
| E2 deleted | Show the no-manuscript copy after a deletion | source, rebuilt | the just-deleted title |
| F1 footer | none named | — | red on unchanged `main` only |

## 5 · Shots

`reports/manuscripts-v21/shots/`, named as the reference screens in `design-refs/manuscripts/v21/`:
01 header, book and activity · 02 versions · 03 materials · 04 see all · 05 empty, each at 1512 and 1280 ·
06 just deleted (1512) · 07 add (1280) · 08 edit details (1512) · 09 new version (1512). The four
single-width shots are a gap against the eighteen reference screens.

## 6 · The branch and the dev bundle

- Branch `ms-v21`, pushed to `origin/ms-v21`; three commits over the reference enrolment (the page, the
  locks, this record). Rebased on `origin/main` (`036289e7`, unmoved during the build).
- Dev (https://scriptally-dev.web.app/manuscripts) serves the branch's `build:dev`: `index-B7AIKcVD.js` and
  `index-B8HGKPfx.css`, hosting only. Not merged to `main`; prod untouched; no rules or functions deployed.
- A later dev deploy from `main` will take this page off dev until the branch is merged.

## 7 · Lift candidates

- **The open header.** Three page-local copies now: `ContactOpenHeader`, `QcOpenHeader`,
  `MsOpenHeader`. Same grid, title, sub-line, buttons and drawing slot; they differ in the title's
  source and the drawing's size.
- **The banner.** `.cl15-ban` and `.ms21-ban` are the same band and arrow.
- **The full-bleed band.** `.cl14-next` and `.ms21-band` use the same spread-shadow-and-clip.
- **The dialog shell.** `Msv21Dialogs`' `Shell` (ink header strip, two-column form, footer) would
  serve any small form.

## 8 · Rulings made, and what is deferred

- **Cover upload is not built.** No cover flow exists and Storage is not wired, so the cover is
  inert and labelled "Cover upload coming soon". A stored `coverUrl` is shown.
- **A version's Open button** opens the version dialog in edit mode (name and note). There is no
  per-version panel.
- **"with {q} queries and {r} requests so far"** counts every query sent with the current version
  (closed ones included) and, as requests, those asked for or already sent on. The oracle's own
  numbers are placeholders.
- **An owed request is never pushed out of the five rows** by newer events, and one with no feed
  record gets a row from the request's own date.
- **Activity rows that are not "your move"** open the drawer's edit journey for their query.
- **"Letters & synopses"** opens Submission packages. That page has no link that opens its
  Materials panel on arrival.
- **Add your manuscript** is one write: the first version is in the document `addManuscript`
  creates. Age category is left unset (the oracle's form has no field for it).
- **`firestore.rules` does not check a book version field by field** (`bookVersions is list`, at
  most 50), so `wordCount` needed no rules change. A unit lock fails if that changes.
- **The page guide is shared** (`shell/PageGuide`), so the page is enrolled with the three steps.
- **The sidebar switcher** with no manuscript reads "+ Add a manuscript". The shell was not edited.
- **One build commit, not one per phase.** Phases 2 to 4 share one parts file and one sheet; they
  were built together and are committed together, with the locks and the record as separate commits.
- **Deleted, nothing else imported them:** `Msv12EditDetails.tsx`, `Msv12Empty.tsx`,
  `Msv12Sections.tsx` (`OwedList`), `Msv13Shelf.tsx` (`ShelfComps`, `ShelfMaterials`,
  `ShelfPackages`, `VersionTiles`, `RecentActivity`), `msv12Smoke.test.tsx`. `msv12.css` is cut down
  to its tokens and face reset. `lib/manuscriptShelf.ts` stays: the page still reads
  `versionTiles`, `manuscriptActivity` and `packagesFact`.

## Gates

Baseline (before any edit): tsc clean, both builds clean, Vitest 539 files passed and 1 failed
(`functions/src/email.test.ts`: the worktree had no `functions/node_modules`; an environment fault,
fixed by linking it).

On the branch: tsc clean; `vite build` and `build:dev` clean, with no CSS diagnostics; Vitest 541 files
passed, 8,472 tests passed and 3 skipped. No worse than baseline.
