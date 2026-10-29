# Submission packages v39.3 — report: the builder becomes Steps + preview

Branch `submission-packages-v39-3`, cut in its own worktree from the tip of the corrected v39.2,
`origin/submission-packages-v39-2` at **e37795fe** (the page pattern, the raised panel, version first: all landed). Level
with base: 0 commits behind, clean tree. The ref and its twelve screens verified against `SHA256SUMS` (ref b334d89b…,
SHA256SUMS 2af9d453…), and the ref is enrolled in `.refhashes.json`.

## 1 · False premises, and Nick's ruling

1. **The sent note's copy promised editions the code does not make.** The pack's note read *"Change anything and it
   becomes a new edition from your next query"*. v40's rule (`lib/packagesV40.ts`: *"Out with agents means locked.
   Nothing here starts an edition; a change is a new package made from it"*) is enforced by the model —
   `changeContents` refuses every contents change to a package that is out with agents — and the pack listed that logic
   as do-not-touch. **Nick ruled (29 Oct): keep the lock; the pack's copy was wrong.** So, departing from the pack:
   - a sent package's steps are **read-only**: each shows its filled piece, no "Change", a head that does not open, no
     refused-pick toasts; Also sends shows its chips' state, not toggleable, no "+ Add";
   - the note reads **"Out with {n} agents. What went stays as it went. To change anything, make a copy. The {n} already
     sent keep exactly what they got."** with a **Make a copy** link (the existing copy flow);
   - under the preview, **Make a copy** sits beside the primary, which stays enabled ("Log a query with it");
   - rename stays allowed (v39's ruling); L13's sent half asserts all of it, and that no pick writes.
2. **The letter body field is `ManuscriptVersion.contentDraft`** (the model's `MaterialRow.text`); the summary is
   `notes`. The preview quotes the first ~200 characters of the text, cut at a word, never the summary. The fixture's
   letter A now has a long text and a separate summary, so L11 can tell the two apart (before, both were near-empty).
3. **A version has no material drawer.** Versions are edited on the Versions page, so a version row's pencil opens that
   page ("Open {name} on the Versions page"); letter and synopsis pencils open the material drawer.
4. **Materials carry no files**, so the preview has no file attachments (as in v39.2).
5. **"Drag them into the package" (How it works step 3's title) now names a gesture that no longer exists.** The pack
   says step 3 stays as v39.2 wrote it, so it is unchanged; **flagged for Nick** (the body copy is right; the title is
   not).
6. **The ref draws "Draft · needs …" on the label tiles**; the tiles are v39.2's and unchanged here.
7. **"First agent on the Contact list"**: the Contact list's default order is surname A–Z, then name
   (`DEFAULT_LIST_VIEW`, `sortFacts`); "not queried" is scoped to this book's queries, as the Contact list is.

## 2 · Material management: nothing lost, four things moved

| Lived in the retired card | Now |
|---|---|
| each letter / synopsis's Edit (material drawer: text, comps, files, put away, delete) | the choice row's Edit pencil in its step |
| "+ Write or paste a query letter / Add a synopsis / Save a new version" | the create link under each step's rows |
| **put-away materials ("Show put away (n)" → Open)** — their only way back | under the letter and synopsis steps' rows |
| the Versions page and comparable titles links | the version and letter steps' foot lines |
| **Retire** (the old package card's foot, a sent package) | the sent note, beside Make a copy |
| an extra's Edit (the extras drawer) | the pencil on each Also sends chip |
| `?tab=let|syn|ver` (opened Your materials on that list) | opens that step (on a live package) |

## 3 · Commits

| Phase | Commit | Files |
|---|---|---|
| 1 · the header and the sent note | 7288ec5a | `Pk393Builder.tsx` (new), `Pk26Builder.tsx`, `pk393.css` (new), `SubmissionPackages.tsx`, the ref + `.refhashes.json` |
| 2 · the steps | 2ee08e9e | `Pk393Builder.tsx`, `Pk26Builder.tsx`, `pk393.css` |
| 3 · the preview | b7afa54c | `Pk393Builder.tsx`, `pk393.css`, `lib/packagesV393.ts` (+ test) |
| 4 · retire the card, drag, the packing list; How it works step 2 | bb33ba87 | `Pk26Builder.tsx`, `Pk393Builder.tsx`, `SubmissionPackages.tsx`, `Pk39HowItWorks.tsx` (+ test), `materialsPageSmoke.test.tsx`, `materialsBand.test.ts`, `pk391.css`, `pk392.css` |
| 5 · locks, shots, report | this commit | `tests/e2e/pk393.measure.ts`, `pk393.shots.measure.ts`, `seedPk40.mjs`, `pk26/pk38/pk39/pk391/pk392.measure.ts`, `RETIRED-submission-packages-v39-3.md`, `scripts/pk393/`, `CLAUDE.md`, this report |

Values are the ref's option B, in the app's tokens (`--sp-anthracite` #2a3a52 for the navy primary, `--sp-type`,
`--sp-serif`, Harbour #1d4b63 via `--pc`); no ref value differed from a token. The CSS that only styled the retired parts
is removed from `pk391.css` and `pk392.css`; the generated sheets (`pk39.generated.css`) are left as generated, so their
orphaned `.p9-pb-lib` / `.p9-mr` / `.p9-lr` rules remain, inert. **The preview's mono labels had to join v39.1's serif
rule's exceptions**, or that rule turned them serif.

## 4 · Gates (baseline → final)

| Gate | Baseline (e37795fe) | Final |
|---|---|---|
| tsc | 0 | 0 |
| build (`build:dev`, grepped) | clean | clean |
| Vitest | 678 files, 10,624 passed, 3 skipped | 679 files, 10,631 passed, 3 skipped (+7: `packagesV393.test.ts`) |
| e2e (pk26, pk38, pk39, pk391, pk392, pk393) | — | 41 passed + 2 red (PK26-D and pk38 L8 reached the drawer through the retired card); both re-pointed to the letter step's pencil and re-run green: **all pass** |

## 5 · Locks

New, `tests/e2e/pk393.measure.ts` (fixture `seedPk40.mjs`, re-seeded per writing case):

- **L10 Steps** — an empty package opens on the version step, only that one; a version fills it and opens the letter
  step; a letter closes them all with two green discs (#3e7d5a); each pick is ONE Firestore Write to that package and
  the writer's own toast.
- **L11 Preview** — the body quotes the letter's stored text (cut ≤ 201 with an ellipsis) and never its summary; the
  pages attachment names the version; ticking Author bio adds its "if asked" attachment and unticking takes it away;
  "To" is a real agent with no query for this book, the first by surname, marked (example) (checked against the stored
  agents and queries, `seedPk40.mjs --agents`).
- **L12 Linking** — hovering each step outlines exactly its parts (2px Harbour on #eef4f7) and nothing else; nothing is
  outlined at rest.
- **L13 Primary** — disabled, "Add a version and a letter to send it", then "Add a letter to send it", then enabled "Log a
  query with it", which opens the log journey with this package chosen (its chip pressed at the package step; without
  the package passed in, the journey would choose the active package, "Standard"). **Sent (Nick's ruling)**: the note's
  words, Make a copy, no step head is a button, clicking the heads opens nothing, no choice rows, no extras controls,
  **no write**, the primary enabled with Make a copy beside it.
- **L14 Retired** — the builder present; no Your materials card, no draggable rows, no packing-list slot markup.

**Red first, on the v39.2 build** (`redfirst-v39-2-base.txt`): all six cases red — L10 and L14 on readings; L11, L12 and
both L13 cases by timing out on elements that do not exist there.

**Red under its own break, on the final build** (`mutation-proofs.txt`, with each break's failing readings): L10 (an open
step's rows hidden: no pick happens), L11 (the body shows the summary), L12 (every part lit), L13 (the primary never
disabled), L13s (a sent step's head opens), L14 (a draggable step, scoped to the page — the first form of this break was
silent, because something outside the page is already draggable; recorded).

Rewritten and retired older locks: `tests/e2e/RETIRED-submission-packages-v39-3.md`. Retired: PK26-B, PK26-M, pk39 L4,
pk392 L7, pk392 L9's builder halves. Rewritten: pk391 L3 and L4, pk39 L5's padlock half, pk392 L2 and L8, pk38 L1 (and the
drawer paths of pk38 L8 and PK26-D). Every rewrite is red on the v39.2 build (`redfirst-rewritten-on-v39-2.txt`).

## 6 · Screenshots

`app/` holds the six ref states at 1512 × 982 and 1280 × 832; `side-by-side/` puts each beside the ref's (drawn at 1300
and 1100). The fixture differs from the ref's sample data (names, the letters' list, Author bio not ticked on the draft).

## 7 · Deploy

(Filled in after the deploy.)
