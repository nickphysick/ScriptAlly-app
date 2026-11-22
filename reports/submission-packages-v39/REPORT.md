# Submission packages v39 — report

Branch `submission-packages-v39`, pushed, **not merged**. It is built off the branch dev served with v38 on it,
`dev/…-cl255-db105-pk38` (eced7acd), with v38's own tip (7733f695, its report) merged in: **base tip 2f611e08**. Dev
hosting now serves it from `dev/…-cl255-db105-pk38-pk39` (53246c1c), **`index-BsasSL7F.js`**. Dev Firestore rules are
deployed (below). Prod is untouched.

## False premises, first

1. **The rename stop hit.** v40's lock deliberately allows renaming a package that has gone out: `firestore.rules` keeps
   `packageName` writable on a sent package ("renaming is filing, not misreporting"), and v38's locked builder kept the
   name editable. The mock locks it. **Nick ruled (28 Oct): keep v40 — a sent package's name stays editable in place**, the
   padlock moves to the stage indicator after "Out with agents" ("Locked: what each agent got stays as it was. You can
   still rename it; to change what goes out, make a copy."), the details dialog keeps its name field, and L5 is rewritten
   to that. This departs from the mock (screen 05's locked name with its padlock).
2. **The Contact list's header is a shared component — used, not copied — but its values are page-scoped.** It is
   `PageHeaderCard` (shared/), and the Contact list's sizes live in `qcv150.css` / `contactV25.css` under `.cl25-hd`
   selectors. Those files are another page's, so the same values are stated again for `.pk39-hd` in `pk39.css`.
   Measured: the card, title and art boxes equal the Contact list's to the pixel at 1512 and 1280. **Where the ref
   differs, the Contact list won, as the pack says:** the ref's `.eh2` has a 50px title, a 262px card and art rising out
   of it; the Contact list's card is 191.6 tall with a 40px title and **its art sits inside the card** (the card clips,
   `overflow: hidden`). So the hawk does not rise above and below the card; the pack's "as the Contact list's archivist
   does" is true of a Contact list that does not exist.
3. **"Note, copy or delete…" opens a dialog with no copy in it.** The existing details dialog (Pk26Dialog in edit mode)
   offers name, note, icon, colour and Delete; the ref's own dialog has no copy either. And v38's locked foot was the only
   place a package out with agents could be **retired**. So the link keeps its words and opens the details dialog as
   asked, and **on a locked package "Make a copy" and "Retire" stay as two quiet links beside it**. On an unsent package
   the word "copy" in the link still promises something that dialog cannot do — Nick's call whether to reword it.
4. **The Query Centre draws no package's own icon.** It draws a generic box glyph for "package" (`bandMarks.tsx
   PKG_ICON`) and the card story's material chips, never `iconOf(package)`. So Part C's one-line change has nothing to
   apply to, and **the Query Centre is untouched.**
5. **v39's mono capitals against v40's ruling.** v40's no-mono-capitals ruling (kept for v38 at Nick's ruling) still
   stands. The pack names two mono labels explicitly — "BUILD, VIEW AND EDIT" and the PRO stamp — and those ship as
   specified. Everything else the ref draws in mono capitals (slot labels, the stage words, the picker's "ICON"/"COLOUR",
   the list headings, the "STEP n OF 5" label, the Active tags, the art placeholders) reads in the typewriter, sentence
   case. v38's L8 is rewritten to allow exactly those two and to assert they are mono capitals.
6. **The ref's breakpoint is a container query on the sheet, not the viewport.** `@container sheet (max-width:1200px)`;
   the app's sheet at 1512 is 1256 and at 1280 is 1024, the same regimes as the ref's 1264 and 1032. The page's scroller
   is made the `p9sheet` container and the ref's 1200px rules are emitted as the same container query.
7. **The brand-new hero's animated stage stays.** Part G "retires the old animated stage everywhere" and says the empty
   page keeps v38's header; screen 18 draws that header *with* the stage. Read together: the old How it works dialog
   (`#hwm`, which replayed the stage) is deleted and both doors open the new guide; the hero's stage stays as its
   illustration. L7 asserts the old dialog's markup is absent.

## What changed (six commits)

| | Commit | |
|---|---|---|
| 1 | `733554c1` | the Contact list's header, the Pro stamp; the navy header and PlayRing deleted; the v39 ref enrolled |
| 2 | `bb2faaba` | package colour (types, `lib/packagesV39`, rules + emulator cases + rulesProbe), the dialog's Colour row, the labels (Pk39Labels replaces Pk38Labels), the drawer's header colour, the generated `pk39.generated.css` and its generator `scripts/pk39/` |
| 3 | `77a84a65` | the builder as two cards, the icon-and-colour picker, rename in place |
| 4 | `acdc3c69` | Results' headings, the full lists with their tabs, the pieces band, the spacing |
| 5 | `7b66191c` | How it works, the five-step guide; the old dialog deleted |
| 6 | `53246c1c` | the locks, the retargets, the red proofs, the screenshots |

The new parts are styled the way v26 and v38 were: `scripts/pk39/extract.cjs` reads the ref's computed cascade in
Chromium for nine states at 1512 and 1280 over the parts v39 restyles (the labels, the builder, the results rows), with
every package colour normalised to Harbour first, and `gen.py` writes `pk39.generated.css` (305 rules, one conflict —
the two list panels' grounds — resolved by hand). Every `--pc` rule, How it works and the picker (each one unlayered
block in the ref) are in `pk39.css`.

**Deviations, beyond the false premises:**
- **v40's package guidelines stay**, 24 under the cards. So builder → Results is 171 where the ref has 96. Every other
  gap Part I names measures equal to the ref at 1512: 56, 36, 16, 72, 52, 88, 96, 72.
- **The full lists' threshold reads in words** ("once four agents have answered it"), matching the footer's existing
  `thresholdWords()`; the ref prints "4".
- **The draft first package and the start card are kept** (v40), styled by hand in the builder's grammar.
- **"Add a note"** is the header's note line itself, in the ref's words ("Add a note: who is this for?"), pressable as
  v26.1's "+ Add a note" was.

## Rules (dev)

`isValidPackage` gains `colour` as an enum of exactly the eight keys, and the update allowlist gains `'colour'`. It is
filing, outside the freeze, so a package out with agents can be re-coloured. Emulator cases in
`tests/rules/firestore.rules.test.ts`: all eight accepted; "red", a hex, "Harbour", "" and a number refused; a sent
package re-coloured, but only to one of the eight. **Proved red** by loosening the enum to `is string` (2 failed), green
restored (179 passed).

Deployed with the Deployment section's one command (`--config firebase.dev.json --project scriptally-dev`) from the clean
tree at bb2faaba, after checking every branch's rules: the stack is a superset, so nothing another session deployed is
overwritten.
- **Before:** release `cloud.firestore` → ruleset `e7565b5d…`, updateTime **2026-10-27T22:35:54.466Z** (another session's).
  Its source, fetched from the rules API, differs from this tree's file by exactly the two v39 lines.
- **After:** ruleset `ac791b8b…`, updateTime **2026-10-28T11:21:18.563Z**.
- **rulesProbe vintage: v39 P2** — "create with a colour" accepted, "crimson" and a hex denied, a sent package's colour
  writable. Every other denial in the probe is one it expects (Storage is not set up on dev, as before).

**Prod rules are Nick's.** They need the same two lines before a prod build that writes `colour`.

## Gates

| | Baseline (2f611e08) | Final (53246c1c) |
|---|---|---|
| tsc | clean | clean |
| build | clean (no errors or warnings) | clean |
| Vitest | 676 files · 10,610 passed · 3 skipped | 678 files · 10,624 passed · 3 skipped |
| e2e pk38 + pk26 | 23 passed | 23 passed (retargeted) |
| e2e pk39 | — | 12 passed (+ setup) |
| rules (emulator) | 177 | 179 |

## Locks

**New — `tests/e2e/pk39.measure.ts` L1–L8**, each red twice before green: against the base build (crude — they cannot
find v39's labels) and under its own named break on the v39 build (`PK39_MUTATE`), where each break moved one thing the
lock names and the lock caught exactly it (`ledger/mutation-proofs.txt`):

| Lock | Break | Red reading |
|---|---|---|
| L1 header = Contact list's | 44px top, the old highlighter | card y 149.75 vs 129.75 |
| L2 colour everywhere | every label back to Harbour | the label is rgb(29, 75, 99) |
| L3 labels | fixed 150px labels | labels 150 wide |
| L4 builder | an 8px gap | gap 8 |
| L5 rename | a padlock beside the name | padlock beside the name |
| L6 lists | the first row listed twice | six rows for five packages |
| L7 How it works | one step removed | four steps |
| L8 band | the band's shadow removed | the page ground at the sheet's edge |

**Rewritten:** v38 **L8** (two named mono labels allowed and asserted; the guide and the picker scanned; its break moved
to an element the page's own rules don't out-rank — the old break never applied, so it was green under it). v26
**PK26-W** (the builder's inset only; the header is L1's) and **PK26-H** (v39's words). **Retargeted, law unchanged:**
v38 L2, L5, L9, L10, L11 and v26 R, B, M — every one listed in `tests/e2e/RETIRED-submission-packages-v39.md`. **Retired
outright:** none. The retargeted v38 locks found one real miss on the way — the builder's Active tag still in mono
capitals — fixed in phase 6.

On deployed dev: L1, L2 and L7 re-run green against `index-BsasSL7F.js`.

## Screenshots

`app/` holds all 18 ref screens at 1512 and 1280 (`PK39_SHOTS=1 … pk39.shots.measure.ts`); `side-by-side/` holds 01, 02,
04, 07, 09 and 13 beside the ref (`node scripts/pk39/sbs.cjs …`). The fixture is the seeded "Locks of v40" manuscript, so
names and counts differ from the mock's.

## Open for Nick

- **What Free users see on this page.** Gating is unchanged (open to all, D7), so a Free user sees the Pro stamp,
  "Included with your Pro plan", which is untrue for them. Preview, locked, or reword the stamp?
- **Whether the Query Centre should show the package colour**, given it shows no package's own icon today (see false
  premise 4).
- "Note, copy or delete…" on an unsent package, where its dialog cannot copy (false premise 3).
- The guidelines' extra 75px between the builder and Results; keep them, or fold them into How it works?
- Prod rules: the two `colour` lines.

## Left behind, deliberately

- v40's and v38's now-unused generated rules for the navy header, the old builder chrome, the stepper, `#hwm` and the
  v38 labels/results rows (`p6-phd`, `p6-lc`, `p6-hwm`, `p8-pkl`, `p8-agg3` …) are still in `pk40.generated.css` /
  `pk38.generated.css`. Generated sheets; removing their dead rules is a regeneration pass of its own.
- `model.duplicate` is still uncalled (as at v38).
