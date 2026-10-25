# Submission packages v26.1 — polish after review (25 Oct)

Branch `submission-packages-v26`, worktree `../ScriptAlly-pk26`, on top of v26 (9e8efdfb).

## The "Standard UK" cause (first, as asked)

**Results listed every package on the manuscript, retired ones included, while the builder lists only packages
that are not retired.** `resultItems("pk")` read `msPkgs` (this manuscript's packages, any status); the builder's
buttons read `live` (`status !== "Retired"`). So a retired package appeared in Results, ranked beside the live
ones, and the builder did not show it.

- **It was not deletion:** a deleted package is not in the collection at all.
- **It was not another manuscript:** `msPkgs` is filtered by `manuscriptId`.
- **"Standard UK" itself is not on the harness account.** I read every package there: `Standard` is Active on
  Murphy's Day Out, and no package is called "Standard UK". I can't sign into your account, so the name is not
  confirmed.
- **The same fault reproduces on the harness account.** "Comps-led variant" is Retired on The Smoke Test: the
  builder shows 3 packages and v26's Results listed 4.
- **On the fixture, the v26 build put the retired package FIRST and showed it in the detail card**
  (PK26-RT against dev: `["Retired one","Sent one","Drag target"]`, `on: true`). That ordering is how a retired
  package came to be the one Results talked about.

Letters, synopses and versions had the opposite gap. Results read only the live letters and synopses, so a put-away
one vanished along with its record. Archived versions were not listed at all.

## What changed

1. **Sidebar row.** Submission packages is one line with Versions' structure: no second line and no `.two`/`.ws-sub2`
   styling. Both rows are 33px and both PRO tags end at x 224, at 1512 and 1280.
   ⚠️ **The label does not fit that row.** "Submission packages" needs 150px (153 when selected, at weight 600),
   and the 248px shell leaves it 134 (140 selected) beside the tag. v26.1 cuts it with an ellipsis, 6px clear of
   the tag ("Submission pack…"). Before, it was clipped mid-letter under the tag. The button's accessible name is
   the whole label. See "Open for Nick".
2. **Results follows the builder's set.** A retired package, a put-away letter or synopsis, or an archived version
   is listed under the others, reads "Retired" in the quiet italic, and is never ranked, picked for the detail card
   or named in the lead. Deleted items and other manuscripts' never reach the list.
3. **Your materials.** Each name is one line, cut with an ellipsis, with the full name in `title`. "In use" is
   `white-space: nowrap` and `flex: none`, so it neither wraps nor squeezes the name.
4. **Summaries.** With no summary of its own, a material shows "sent {n} · in {m} package(s)", omitting zero parts,
   or nothing when both are zero. This is `materialSummary` in `lib/packagesV26`, used on the materials rows, the
   packing list and the Letters/Synopses tables. The type is never the summary.
5. **Header note.** With no note, a quiet "+ Add a note" (the secondary colour, underlined on hover) opens Package
   details with "Who it's for" focused. A real note is one line, cut short, at every width.
   - **Also needed at 1280:** the status cluster took the bar's width, so the title column first wrapped the
     pencil under the name, then cut the name to "Sen…".
   - **The fix:** the title column now never goes narrower than its name (up to 260px, after which the name is
     cut). The note fills the column without setting its width. The figures wrap instead, between their two
     phrases ("1 sent ·" / "0 asked for more").
6. **Results with little data.**
   - The footnote states the average only when there is one; otherwise it gives just the threshold sentence.
   - A too-early item's detail card drops the two stat tiles, and "Give it {n} more" takes their place.
   - "Not sent" (and "Retired") use the "Too early" quiet italic.
7. **Sticky tab bar.** Its ground reaches back by exactly the tabs' inset, so once stuck it runs from sheet edge to
   sheet edge while the tabs stay 72px in. One token, `--p6-tab-in`, owns both numbers. The ref's band reached only
   32px past the tabs.

## Gates

| | Baseline (9e8efdfb) | Final |
|---|---|---|
| tsc | clean | clean |
| production build | clean | clean |
| vitest | 660 files, 10,424 passed, 3 skipped | 660 files, 10,430 passed, 3 skipped |

## Commits

| Commit | What | Files |
|---|---|---|
| 6662db13 | fix 1 + the lock change it needs (`workspaceNav.test` asserted the row's `sub`) | workspaceNav.ts, workspaceShell.ts, WorkspaceShell.tsx, inkShell.css, workspaceNav.test.ts |
| (the next commit) | fixes 2–7, the new locks, the fixture, this report and its screenshots | packagesV26.ts (+test), usePk26Model.ts, Pk26Results.tsx, Pk26Builder.tsx, Pk26Dialog.tsx, Pk26Materials.tsx, SubmissionPackages.tsx, pk26.css, pk26.measure.ts, seedPk26.mjs, pk261Shots.measure.ts, CLAUDE.md, ledgers, v26-1/ |

## Locks added — each red before green

The new locks were proved red against the **deployed v26 build** (`SA_E2E_BASE_URL=dev`, which served v26
without these fixes); those ledgers are in `ledger/v26-1-red-on-v26/`. They were then green on this branch.
PK26-N and PK26-T were also proved red by a named in-page break (`ledger/mut-PK26-N-1512.json`,
`mut-PK26-T-1512.json`).

| Lock | Claim | Red on v26 | Named break |
|---|---|---|---|
| PK26-N (1512, 1280) | the packages row is Versions' height (±1), its tag's right edge Versions' (±1), no second line, label stops before its tag | 47.7 vs 33 tall; tag at 231 vs 224; one second line | row 48 tall, 3px right padding → 48 vs 33, 231 vs 224 |
| PK26-T (1512, 1280) | stuck, the bar's ground spans the sheet (±1) and the tabs stay 72px in | ground 288→1464 against a sheet of 248→1504 | the ref's −32px band → the same |
| PK26-M | the long letter's name is one line with its title; no summary is the type | name wrapped, no title, three "Query letter" summaries | — |
| PK26-H | the note is one line and cut at 1280; name and pencil keep a line; "+ Add a note" opens the details with the note focused | note 95px tall, pencil wrapped, no link | — |
| PK26-RT | the builder hides the retired package; Results lists it last, "Retired", not in detail or lead | listed first, "Too early", in the detail card | — |

There are also six new unit cases in `packagesV26.test.ts`: retired ordering and ranking, the conditional
average, and `materialSummary`. On v26's code they cannot run as written (`materialSummary` does not exist), and
v26's `resultRows` puts the best-figured retired item first. That is the failure the first case asserts against.

**The fixture gains** a retired package with one passed query (`pk26-pkg-old`, `pk26-q2`), a long-named letter
(`pk26-let-c`) and a note on the sent package. It is cleaned after every run (`removed 10`).

Final run: **PK26 17/17 green** on this branch's dev build.

## Screenshots

These are in `v26-1/before/` (the deployed v26) and `v26-1/after/` (this branch), each at 1512 and 1280:
- `sidebar-*`
- `builder-note-*` and `builder-no-note-*` (the open package's header bar)
- `your-materials-*`
- `results-*` (the harness account's The Smoke Test)
- `stuck-tab-bar-*`

## Dev deploy

See the commit that adds this report and the closing message: it goes onto `dev/hm31-pv4-qc1492-dh41-cl24-hm32-pk26`.

## Open for Nick

- **The sidebar label is cut ("Submission pack…").** At 248px, Versions' structure cannot hold the full label beside
  the PRO tag. Three ways to get the whole label back, each a change to the baked rule, so not made here:
  - a shorter label ("Packages");
  - a smaller PRO tag on both rows;
  - a wider sidebar.
- **"In use" is not shown in any screenshot.** The fixture's manuscript has no active package, so nothing there
  is "In use", and no lock measures the tag. Its `nowrap`/`flex: none` are CSS that I have not seen rendered beside a
  long name.
