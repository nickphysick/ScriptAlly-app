# Comparable titles v26 — report

Branch `comps-v26`, cut from `comps-v25` at `2abbfa30`. Not merged.

| Part | Commit |
|---|---|
| A · the form | `266ce08c` |
| B · the explainer | `e8adbcae` |
| C · the empty page, and the harness | `d02d324d` |
| Lock AD5 strengthened; AD2 stops early | `04632310` |
| CV25 A1 repointed at the new form | `d9e71739` |
| CV25 E2 reads the settled picker | `6e9d73cd` |

The consolidated lock run was made at **`6e9d73cd4fafc922614309b32c8618dd663725a8`**. The dev build is recorded in `INTEGRATION.md`, on the dev branch only.

## 1. False premises

1. **Lock AD5 as written cannot fail.** "With the body scrolled to its end, the foot's bottom equals the drawer's bottom" is also true of a foot INSIDE the scrolling body: scrolled to the end, it sits on the drawer's bottom. Its named mutation ("put the foot inside the scrolling body") passed green. The lock now also reads the foot with the body at the top, and requires that it did not move between the two readings. Under the mutation: foot at 1549 against a drawer bottom of 892.
2. **"Its three points" and "section headings" are not headings in the build.** AD1 asks that the drawer have exactly one heading. The section heads ("What is it?" and so on) and the explainer's "What's a comparable title?" are paragraphs, so the drawer's title is the only heading element. The mock uses `h4` and `h5` for them.
3. **The form has no "Remove" of the kind the spec describes.** v25's Remove was a text link under the form that became its own explanation when refused. In the foot it is a rust "Remove" button; when a sent letter names the comp it is disabled and the reason is its tooltip.
4. **Add did not close the drawer in v25.** It switched to the new comp's detail view. AD6's mutation ("close the drawer after saving") only makes sense if a plain Add closes, so it does now. Flagged as a behaviour change.
5. **The exhibit has a third retired thing the spec does not name.** Its sample cards still draw the "In query letter" switch with a "1st" pill, which v25 retired with `inQuery`. Left as it is, per "leave the rest of the exhibit as it is". The reorder hint ("Drag to reorder. The order sets your query line.") names both retired things and went with them.
6. **Two CV25 locks could not survive the new form unchanged** (see §4).

## 2. §0 findings

**The form before.** `CompForm.tsx`, v2's inline form, mounted in the drawer by v25 inside a `.cpv-scope` wrapper. Its own heading ("Add a comp" / "Edit comp") sat under the drawer's; Title, Author, Publisher and Year shared one four-column row; its buttons were the last row of the form, not the drawer's foot.

- **Type:** `CompTitle.media`, one of `"book" | "film" | "tv" | "other"`. Absent means book, and `normalizeComp` omits `"book"` on write. Unchanged.
- **Tags:** `CompTitle.matchAxis`, the tags joined with `" · "` (`joinTags`) and read back by splitting on `"·"` (`splitTags`). Unchanged. The form now caps them at six and refuses a duplicate ignoring case; a stored `matchAxis` with more than six shows its first six in the form.
- **v25's Remove:** a link at the foot of the edit form's body (`data-cv="drawer-remove"`), refused for a comp a sent letter names. Now the foot's Remove (`data-cf="remove"`), same rule.
- **Add against edit before:** the same component with a `mode` prop; edit seeded the fields and skipped the duplicate check. Still one component set; the differences now are the title, the subline, the head's disc, the explainer (add only), the foot's buttons and the preview (an edited comp keeps its own row).

**Add's save path.** `add()` in `ComparableTitlesPage.tsx`: `normalizeComp` and `withCompIds`, an optimistic list, `runWrite(updateManuscript(…, { comps }))`, a failure toast on refusal. **Undo exists** and is kept: it removes the comp by its id. The toast now reads "Added {title} to your library."; edit's reads "Saved {title}." with Undo, as before.

**The explainer's drawing.** `public/images/dash/mentor-leaning-looking.png`, the dashboard's Mentor facing the viewer (`DASH_ART.mentorLooking` in `lib/dashArt.ts`). It is the drawing the mock uses. No asset was added.

**The empty-state exhibit.** `CompsExhibit` in `CompsEmpty.tsx`. It rendered `<CompsQueryLine … example />` (the query line and its caption) and three `CompCard`s in `example` mode, each with a `.cpv-grip` span.

**Locks rewritten for the old form's layout, labels or copy**

- `compsV2.test.tsx` C7: expected the query line's buttons inside the exhibit; now asserts no button, no query line, no grip, no reorder hint, and three cards.
- `compsV25.measure.ts` A1 and E2: see §4.
- `compsV2.test.tsx` C3 (year shape, tags joined with " · ") and `compsWiring.test.ts` pass unchanged.

## 3. AD locks: red and green

**Consolidated green run:** all nine AD locks and all thirteen CV25 locks in one pass, at 1512 × 900 and 1280 × 800, on a dev bundle built from the clean tree at `6e9d73cd`: **AD 147 readings, CV25 199 readings, all green** (`run-consolidated.log`, `ledger/`, `cv25-ledger/`). Vitest at the same commit: 570 files, 8,626 passed, 3 skipped (baseline 568 / 8,612).

**Red.** Each lock under its named mutation (`mutation-proofs.json`, `mutation-runs/`). Four mutations are applied in the page, five are edits to the source with a rebuild, restored from copies.

| Lock | Mutation | Red reading | Green reading |
|---|---|---|---|
| AD1 one heading | Restore the body's "Add a comp" heading | two headings: `Add your first comp` in the head, `Add a comp` in the body | one heading, in the head: "Add your first comp", "Add a comp", "Edit Salt Road" |
| AD2 explainer | Open the card for every add | with comps: `card true · link false · 3 points` | no comps: card open, 3 points; with comps: `card false · link true`; edit: neither |
| AD3 labels | Clear the fields on type change | `who: "", pub: ""` after choosing Film | Director / Studio or distributor · Creator / Network or channel · Creator / Publisher or platform; typed values kept |
| AD4 ready | Disable Save while not ready | `save disabled true` for a book with no publisher | needs, with Save enabled; book ready; film with a year ready |
| AD5 foot | Put the foot inside the scrolling body | at the top: `foot 1549 · drawer 892`; moved `1476 → 819` | at the top and at the end: `foot 892 · drawer 892`; did not move; no horizontal overflow |
| AD6 again | Close the drawer after saving | `the drawer stays open — closed` | one comp written; every field empty; Book; focus in Title; explainer folded; title "Add a comp" |
| AD7 tags | Store tags comma-joined | `"Tone, Coastal"` | `"Tone · Coastal"`; "Matches on" shows Tone, Coastal; six held, a seventh refused |
| AD8 preview | Render a hand-built preview | no row cell in the preview (`"null"`) | the preview's cell and a row's cell have the same tag, classes and children; title "Salt and Iron" |
| AD9 empty page | Restore the query line | `1 line element(s)` | 0 line elements, 0 grips; "Your comps 3", three cards, no buttons |

AD5 first went GREEN under its mutation; see §1.

## 4. The CV25 re-run

Eleven of the thirteen CV25 locks ran unchanged and green, and twelve of thirteen ledgers are byte-identical to those committed from `comps-v25` (A1 differs only in the random ids a comp is given on first write).

Two read differently on v26 and were changed:

- **A1 (ids).** It saved through the old form's submit button and removed through the old drawer's Remove, and timed out. It now presses the foot's Save, opens the added comp from its row (a plain Add closes the drawer) and presses the foot's Remove. Its claims are unchanged.
- **E2 (picker).** It read the picker the moment it mounted. The picker chooses its letter in an effect, one render after mounting; on the v26 build that read lands in the empty frame every run and reports "no letter, 0 logged". The lock now waits, with a bound, for the picker to name its letter. **The picker is unchanged**, and it does draw one frame with no letter selected. I did not fix that, because the picker was out of scope.

## 5. Decisions I made that you should check

1. **A plain Add closes the drawer** (it used to show the new comp).
2. **The duplicate check is kept**: adding a title already on the list shows "{title} is already on your list" with Show me and Add anyway. The spec does not mention it.
3. **A year of the wrong shape still stops a save** ("Use four digits, like 2021."). That is the old rule, about shape, not readiness; the ready note itself blocks nothing.
4. **In the preview, an edited comp keeps its own row** (its letters and its next move), so editing a comp in a sent letter previews "In 9 queries", not "Log in a letter". A new comp previews on the shelf, in no letter.
5. **With no title, the preview's next move reads "Add a publisher / NEEDED BEFORE A LETTER"**, because it is the real row's cell and an untitled book has no publisher. The mock may have meant something quieter there.
6. **"Other" draws a star in the type control and the head's disc**, as the mock does, but the list still draws an Other comp with the film icon (v25's rule).
7. **Below 1100px of window the foot's left line is hidden**, so the three add buttons keep one row.
8. **The idle note's glyph is a centred dot.** The spec gives "!" and "✓" for the other two states and nothing for idle.

## 6. Not done, and not verified

- **The old form's styles are orphaned.** `compsV2.css` still carries `.cpv-form`, `.cpv-fgrid`, `.cpv-seg` and the rest; nothing renders them now.
- **Focus was measured only for "Add and add another"** (it lands in Title). Focus on first open and focus return on close were not measured.
- **Cmd/Ctrl + Enter and Enter-to-save were not measured on the rendered page.**
- **The phone layout of the form was not looked at.**
- **No other suite was re-run** beyond CV25 and AD.

## 7. Shots

In `reports/comps-v26/shots/`, each beside its reference in `design-refs/comps-v26/`:

| Reference | Shot |
|---|---|
| `ref-first-1512@2x.png`, `ref-first-1280@2x.png` | `first-1512.png`, `first-1280.png` |
| `ref-first-end-1512@2x.png`, `ref-first-end-1280@2x.png` | `first-end-1512.png`, `first-end-1280.png` |
| `ref-another-empty-1512@2x.png`, `ref-another-empty-1280@2x.png` | `another-empty-1512.png`, `another-empty-1280.png` |
| `ref-another-filled-1512@2x.png`, `ref-another-filled-1280@2x.png` | `another-filled-1512.png`, `another-filled-1280.png` |
| `ref-film-ready-1512@2x.png`, `ref-film-ready-1280@2x.png` | `film-ready-1512.png`, `film-ready-1280.png` |

Also: edit mode (`edit-*.png`, `edit-end-*.png`), the filled form scrolled to its end (`another-filled-end-*.png`), and the empty page (`empty-page-*.png`). The first-comp drawer over the empty page is `first-*.png` itself: in the build, unlike the mock, that state opens over the empty page.

**What remains in the exhibit** (`empty-page-1512.png`): the label "HOW THE PAGE LOOKS ONCE YOU'VE ADDED A FEW", the "Your comps 3" heading, and three sample cards, each with its spine tile, title, byline, tags, note, age line, the "In query letter" switch and Edit / Remove as inert words.
