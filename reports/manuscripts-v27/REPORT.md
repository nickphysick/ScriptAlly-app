# Manuscripts v27: one neat page for the book, a book that opens, and a guide

Branch `manuscripts-v27` (worktree `../ScriptAlly-ms27`), cut from `dev/css1-pv3` at **caa9a1e6**, the build dev served
(`index-BZj1FSmS.js`; my build of that commit differs only by the baked build date, which also renames one chunk).
That base renders the **v21** page (`v12/ManuscriptPage.tsx`, "THE MANUSCRIPTS PAGE (v21)"), so v27 is built on v21.
v24 was not pulled in.

## False premises

1. **"Keep the existing drawer and its fields."** There is no edit drawer. Edit details is a centred modal
   (`Msv21EditDetails`, `useOverlay`), and it had **no elevator pitch or synopsis field**. The mock draws a right-hand
   drawer in the Comparable titles drawer's dress. Following "the built component wins", I kept the modal, added the two
   fields, and grouped its fields into five numbered sections (as the mock's drawer is) so the guide can light one.
   Turning it into a drawer is one component if you want it.
2. **"See them in the Query Centre opening the QC filtered to this manuscript."** The Query Centre takes no manuscript
   filter from outside (its filter is local state in `Queries.tsx`, out of bounds). The link opens the Query Centre
   unfiltered. With one manuscript per account the list is the same.
3. **"The versions UI ... (cards, New and Edit version, What's landing, fill-in)."** What's landing and fill-in are v24's;
   v21 (the base) has neither. The Versions page renders v21's versions UI unchanged: the banner, the copy, the stacked
   deck and its list, New version and Edit version.
4. **"Under 1500px of window, Comparable titles shows as an icon only. Under 1600px, Submission packages already does."**
   The bar's tabs have no fixed widths: `planTabs` (FolderTab) measures the names and turns them into icons as room runs
   out. Versions joined through the nav model and the built fit rules do the rest (screens: at 1280, both fold to icons).
   No thresholds were added.
5. **Lock A1: "no element on the page contains … 'Submission package'".** The coming-soon strip's own copy names
   Submission packages. The lock asserts the phrase appears only inside the strip.
6. **"Learn more links to the Help Centre article on manuscript details."** There isn't one, and the Help Centre has no
   anchor for its Materials area. Learn more opens `/help`.
7. **"Remove every 'working copy' string on this page, its drawer and the book view."** None of the three had one
   (the drawer had no synopsis). Elsewhere: `src/lib/manuscriptProfile.ts` ("Your working copy, kept with the
   manuscript") belongs to the unrouted `AllManuscripts` book profile; not changed.

## Step 0

- **References:** all 13 files present and every SHA256 matched. Enrolled at `design-refs/manuscripts-v27/` and in
  `.refhashes.json`.
- **Rules:** `tests/e2e/ms27RulesProbe.mjs` wrote and cleared `elevatorPitch`, `synopsis`, `setting` and `series` on a
  dev harness manuscript: all four accepted, and the manuscript restored exactly. No rules were edited or deployed.
- **Edit details' fields (before):** title, word count, genre, age category, logline, setting, series, status (six), and
  the shelved reason while Shelved is chosen. After: the same, plus elevator pitch and synopsis.
- **Helpers:** Since = `queryingSince` (lib/manuscriptSummary), the earliest `dateSent`; queries sent = the
  manuscript's queries; asked for more = `analytics.buildRows(...).reachedRequest`; with agents =
  `tileCourt(status) === "agent"` (lib/qcSummary); byline = `User.name` (there is no pen-name field).
- **The guide:** `PageChecklist` was already page-agnostic: items, done flags, seen/hidden, targets and flow cards are all
  props, and each page passes its own (Contact list in `AgentList.tsx`, Query Centre in `Queries.tsx`).

## What was built

- **Part A** (`e83cbd55`): two containers, `.ms27-bkx` (the book) and `.ms27-soon` (coming soon), and no footer. The
  header uses the header-rules tokens (`--hero-*`): art 22px into the card, text at `--hero-text-x` + 8, the details
  card 40px from the card's right. The narrow layout (one column of five rows) is a container query on the page root,
  because the app has no `sheet` container: the root's content box ≤ 1152 is a sheet ≤ 1200. Gutters 24 (36 wide).
- **Part B** (`265e2032`): the book view, timings as the mock except the hold, which is 280ms (not ~350) so the turn
  ends inside B1's 1.8s. Portalled, focus-trapped, Escape and the dim close it, focus returns to the opener.
- **Part C** (`2405dc7f`): the pitch and synopsis fields with the prompt's placeholder and hints; empty saves by
  omitting the key; `focus` opens on a section, centred, with the caret at the end.
- **Part D** (`501b9e82`): five additive props on `PageChecklist` (`FlowCard.follow`, `FlowCard.above`, `pillClass`,
  `finalNote`, `allDone.after`), all off by default. Manuscripts state at `todoPrefs.manuscripts.guide.{seen,hidden}`,
  by leaf; done flags come from the saved manuscript. Every step opens Edit details on its field with a pass-through
  spotlight (the hole follows the field as the form scrolls). The pill drops to ring and count at 1400px and below
  (`.pck-pill--ms27`, the page's own rule).
- **Part E** (`b68ea6e7`): `/manuscripts/versions`; the sidebar row (⇆, PRO tag on a new `--ink-rose` token); the route
  in App, routeTiers, shellForRoute and the search palette.

## TODOs left

- `TODO(illustration)`: `SOON_ILLUSTRATION` in `v27/Msv27Parts.tsx`. Set it to the artist's image and the placeholder
  goes.
- `TODO(gating)`: the coming-soon links (`SoonStrip`), and the Versions row's PRO tag (`workspaceNav.ts`).

## Locks (MSV27, `tests/e2e/manuscriptsV27.measure.ts`)

Run on the rendered page at 1512 × 900 and 1280 × 800, on the dedicated `ms21-filled` harness account (restored after).
**Green: 25 of 25** (floor 120 assertions met).

| Lock | Red (mutation, `MS27_MUTATE=`) | Green |
|---|---|---|
| A1 sections | `a1` re-mounts a versions section: red | ✓ both widths |
| A2 header | `a2` drops the in-card inset: right inset 154, red | ✓ |
| A3 card | `a3` keeps the wide card at 1280: red | ✓ (4 rows + 50,000 at 1512; 5 rows at 1280) |
| A4 strip | `a4` moves the strip's text: 517 vs 523, red | ✓ (both links navigate) |
| B1 book | `b1` stops the cover turning: m11 1, red | ✓ (all three openers; focus returns) |
| B2 rows | `b2` adds a dash row: red | ✓ (no Series row; counts 7 · 3 · 4) |
| B3 motion | CSS mutation could not redden it (the book mounts open, so no transition starts); **source** mutation `b3src` (ignore reduced motion): red | ✓ |
| C1 copy | `c1` restores a "working copy" hint: red | ✓ |
| C2 field | `c2` takes focus off the field: red | ✓ |
| D1 done | `d1` marks the pitch done on the click: "cancelled: still 3 of 4", red | ✓ (3 of 4 → Learned ✓) |
| D2 drawer | CSS/DOM mutation could not (the page is inert behind the form); **source** mutation `d2src` (pitch step opens the book): red | ✓ |
| D3 others | see below | |
| E1 versions | `e1` removes the Versions row: red | ✓ |
| L1 | see "Retired" | |

Every mutation result is in `mutation-proofs.jsonl`.

**Natural reds:** every MSV27 case, run against the unchanged build dev serves (`index-BZj1FSmS.js`), fails: its subject
is not drawn there, so each times out waiting for it rather than passing (`natural-reds.jsonl`).

**D3 (the other two guides, on this build):** Contact list v18.3 F1–F6 6/6, Contact list v20 CL20-G 3/3, Query Centre
v139 A1, A2, B1–B5 12/12, v140 G1 2/2, v140.1 B1 3/3, help system HS1-A/B/C 11 of 12. The one red, **HS1-B1** (the
Contact list's Help menu article titles), is **red on dev's unchanged build too**: it predates this pack, and the
article data it reads is untouched here.

## Retired

Listed in `tests/e2e/RETIRED-manuscripts-v27.md`: `manuscriptsV21.measure.ts` B1–B3, V1–V5, M1, F1 (E1 and E2, the empty
and deleted states, still run); HR1-8's manuscripts case; the `/manuscripts` entries in `sh2Lib`, `qc135Lib` and
`hp2Lib` (subjectless now); and the unit cases in `msv21Smoke.test.tsx` and `compsInQueryRetired.test.ts`, each noted in
place.

## Gates

Baseline (caa9a1e6): tsc clean, build clean, Vitest 1 failed / 9,877 passed, three files red, all in `functions/`
(`eval/run.test.ts`, `src/email.test.ts`, `src/smartImportCore.test.ts`). Each of the five commits was checked out on
its own and gated: tsc 0, build 0 with no warnings, Vitest no worse than baseline (the same three files), 9,889 passed at
the tip.

## Screens

`reports/manuscripts-v27/shots/` holds 01–05 at 1512 and 1280 beside the mock's `screens/*`, taken on the
`ms21-filled` harness account. **Not Nick's account:** I can't sign in as you. Screen 06 (the finished guide) is
exercised by D1 but not shot.

## Integration and deploy

- Dev served `index-BZj1FSmS.js` (`dev/css1-pv3`, caa9a1e6) at the start and again right before the deploy.
- Integration branch **`dev/css1-pv3-ms27`**: `origin/dev/css1-pv3` + a merge of `manuscripts-v27` (no conflicts; its
  tree equals the branch's). Gates there: tsc 0, build clean, Vitest no worse than baseline (the same three
  `functions/` files). MSV27 on its build: 25 of 25.
- **Deployed to dev, hosting only** (`firebase.dev.json`, `--project scriptally-dev`), from a clean checkout of that
  branch. Dev now serves **`index-CCHtLZcn.js`**. A1, A3, B1 and E1 re-run against deployed dev: 8 of 8.
- Not merged to `main`. No rules or functions deployed.
