# Submission packages v4 — report (14–15 Oct, overnight)

Branch `packages-v4` in worktree `../ScriptAlly-pkg4`, off the branch dev served when the run began:
`dev/query-panel-v1-onb9-tip-onb9-comps26-1-qp2-comps27-qp2b-comps27-1-qp2c-corkboard1-qp2d-cl16-cl17-cl171-qc138-qc1381-qc1382-qc1383`
at **162e7f4a**. That base holds Query Centre v138, v138.1, v138.2 and v138.3, and Contact list v17 and v17.1. It did
**not** hold v138.4: another session was building v138.4 in `../ScriptAlly-qc138` that night, and it deployed to dev
(`…-qc1383-qc1384`, `index-D0Dot8dT.js`) while this run was going. The deploy below is built on top of that.

## False premises

1. **The material form has no "modes (text, link, file)".** v3 §0.3 describes `MaterialModal` / `PkgMaterialModal` with
   three modes. The page's form, `PkgMaterialModal`, is paste-only: a name and a text area (letters and synopses), or a
   name and a "what changed" note (versions). `MaterialModal.tsx` is a different, older form this page never mounted.
   The drawer's form keeps today's behaviour: paste only, with the word count.
2. **`openQueryDrawer` cannot open a query to read.** v3 D1 says a credited-query row "opens `openQueryDrawer`". That
   store opens journeys (log, respond, sent, nudge, close, offer, edit); it has no read mode. The row opens the query in
   the Query Centre (`/queries?q={id}`), as the v2 card did.
3. **There was no Delete confirmation to keep.** v3 D1: "Delete keeps today's confirmation". Today's Delete deleted at
   once with an Undo toast. The drawer asks in its foot ("Delete {name}? Nothing has gone out with it." · Keep it ·
   Delete), and the Undo toast stays.
4. **`editionWarning`'s text does not say "Renaming it doesn't".** It reads: *"This starts {name}'s {nth} edition.
   Queries already sent keep the {mth}."* So the form shows the prompt's fallback sentence.
5. **No shared blush banner exists.** v3 E asks to reuse the Query Centre's banner "if it's shared". It was the shell's
   `OpenBanner`, which has since been deleted. The banner is page-local.
6. **`HalfDrawer` cannot host both kinds.** It always dims and is always `aria-modal`. Viewing must not dim (decision
   2), and the shell was out of scope, so the drawer is page-local (`PkgDrawer4`) over HalfDrawer's own sheet.
7. **The Query Centre has no package filter**, so "See all {n} in the Query Centre" opens the Query Centre unfiltered.
8. **The Contact list's header, card, pills and empty page, and the Query Centre's sheet, are all page-local** (§0.1,
   §0.2). Nothing was reusable as a component. The pills and panels are reused by **class** (their rules are global
   literals); everything else is a page-local copy from the same values (lift candidates, below).
9. **At 1512 with the sidebar open, the app is compact.** The mock draws 1512 at full size. The app's switch is the
   sheet's width (< 1440 = compact), so at both reference widths: title 44, ring 76, card 210, page title on the empty
   panel 52. CL17.1 recorded the same.
10. **"In use … FOR NEW QUERIES FIRST" cannot be seen on the harness account at rest**: no manuscript there uses a
    package for new queries. Lock C3 sets one, checks the tag, and undoes it.
11. **v3 Part B said "Edit" on a sent package always starts an edition.** That is only true once the package carries
    its lock stamp (`firstSentAt`). A package whose queries predate the stamp shows as sent (it has credited queries),
    but `updatePackage` starts no edition for it. The edit form's notice follows the stamp (fix commit 0cff267c).

## What landed

| Commit | Part |
|---|---|
| 1d94d68f | Derivations: `lib/packageReplies.ts` (v3 E's lib) + unit lock; refs enrolled |
| 53907300 | v3 D: the drawer (package view with two tabs, package form with parking, material view and form) and `usePackagesModel` |
| b88daf16 | A: the centred light header and the summary card (counts + Reply rate ring) |
| 44f62872 | B: the filter row |
| d9cf3a78 | C: the packages sheet |
| 85c5000f | D: the materials sheet; the Materials rail retires |
| 47e1eac1 | E: the banner and "What's getting replies" |
| 0723112e | F: the empty page |
| 0cff267c | Fixes found while writing the locks |
| (G) | Locks, retirements, CLAUDE.md, this report |

## v3 §0 findings

**Acts and their db calls (all moved into `usePackagesModel`, unchanged):**

| Act | Call |
|---|---|
| log | `openQueryDrawer({ mode: "log", manuscriptId, packageId })` |
| use | `setActivePackage(msId, id)`; Undo restores the previous id |
| edit / create | `updatePackage` (edition bump inside it when stamped) / `addPackage` (+ `setActivePackage` when none is active) |
| edit Undo | `revertPackageEdition(prev)` if an edition started, else `updatePackage` with the old fields |
| dup | builds a draft only; `addPackage` on Create |
| retire / restore | `retirePackage` (clears active first) / `restorePackage` |
| delete | `deletePackage`; Undo re-adds through `addPackage` |
| note | `updatePackage({ note, noteEditedAt })` on blur |
| material add | `addVersion(createPayload(...) + notes)`; version: `updateManuscript({ bookVersions: appendBookVersion(...) })` |
| material edit | unsent: `updateVersion` in place; gone out: a new version via `addVersion` with `nextVersionName`; version: `renameBookVersion` |
| put away / restore / delete | `archiveVersion` / `restoreVersion` / `deleteVersion` |

**Deep links:** `?tab=builder` (App's "New package", via `pathFor`), `?tab=tracking`, `?tab=packages`, all kept; new
`?pkg={id}` and `&view=replies`. Callers that could use `?pkg=`: the Query Centre row's package chip
(`QcList138`'s `onOpenPackage(pkgId)`), which today navigates to the page without the id (`Queries.tsx` 5484, 7140) —
not changed, the Query Centre was out of scope.

**Credited editions on the harness account:** 18 credited queries; **none** points at an edition its package lacks.
Two point at packages that no longer exist (`probe-dangling-pkg → pkg-seed-default`, `seed-pkgq-2 → pkg-vanished`);
they count in no package's or material's figures.

**Shared parts:** `usePopover` (shell) is reused; the pills and panels reuse v17's classes. Page-local copies (lift
candidates): the light header and its card (`PkgHeader4`, from `ContactLightHeader`), the sheets, their navy rows, the
in-sheet search, the bands and the heading strips (`PkgSheets4`, from `QcList138`), the empty page (`PkgEmpty4`, from
`ContactEmptyPage`), the banner, and the drawer host (`PkgDrawer4`; `HalfDrawer` + a `modal` switch would serve).

## Calls I made (unattended)

- **The drawer host is page-local** rather than a `modal` prop on `HalfDrawer` (shell out of scope).
- **"Showing all {N} packages" counts live and retired** (the mock counts live only). Retired is a band in this sheet,
  so a total that left it out would not match what the sheet holds.
- **Bands are 56 tall at every width.** The prompt's "56 tall / 44" is v138's DENSITY switch; this page has no density
  control.
- **The replies table lists every material**, sent or not (unsent muted, "Not sent yet"), as the mock does; v3 said
  "every material that has gone out". Put-away materials appear only if they have gone out.
- **A material row's italic line always reads "in {n} packages" once it has gone out** (the mock's form), so "fewer than
  4 answered" shows only on rows with no other line.
- **The Status filter and the card share one list.** A card row press sets it to that one status; the pill can hold
  several. A row is "pressed" when its status is in the list.
- **The form's version is required on a NEW package only** (when the manuscript has a version); an edit may stay
  without one, and offers "Not recorded" to clear it.
- **The edit form offers the put-away letter a package holds** (marked "Put away"), so it shows as chosen.
- **"Delete" on a material is offered only when it is in no package** (v3's rule), letters and synopses only.
- **A three-digit rate ("100%") steps the ring's figure down a size** to stay inside the ring; the mock never draws it.
- **The empty page waits for every collection** (`collectionsReady`), so a loading account is never shown as empty.

## Locks — red and green

**Green: one consolidated run at 35da19ef** (code identical to 7529cdd5; 35da19ef only corrects 7529cdd5's message),
`SA_E2E_BASE_URL` = a `build:dev` of that commit: **37 passed** (36 lock tests + sign-in), 391 readings, ledgers in
`ledger-green-35da19ef/`. The same file again on the integration build: 37 passed. A3 was re-run green after c9c2915f
(the ring's "100%" size; CSS only).

**Red, two ways:**
- **Base:** `PK4_BASE=1` against a `build:dev` of 162e7f4a (the base, before v4): **36 of 36 failed** (ledgers in
  `ledger-base/`; the ones that wait on a missing element failed by timeout and wrote none).
- **Named mutations** (`mutations/summary.txt`, ledgers per mutation). Every one failed at both sizes:

| Lock | Mutation | First failing reading |
|---|---|---|
| A1 header | the Archivist back in the header | images in the header: shadow, other |
| A2 card | scroll on press | scrollTop 0 → 180 |
| A3 ring | the gap drawn in rust | 1 rust circle |
| B1 filters | match on any edition (source) | "Two editions" shown for its 1st edition's letter |
| C1 sheet | a sort pill in the row | buttons in the row: Sort ⌄ |
| C2 bands | Retired open by default | Retired aria-expanded true |
| C3 card | the foot may wrap | foot rows at four heights |
| D1 materials | no heading strip | strip rgba(0, 0, 0, 0) |
| E1 replies | under-4 rows sort by value (source) | Rate (reversed): flags `--Q--` |
| F1 empty | the example as a real package | package cards 1 |
| L1 no overflow | the shadow 3200 wide | 1920 scroller 3514 / 1664 |
| v3 D1 no modal | a centred dialog on Edit | edit package: 1 other dialog |
| v3 D2 scrim | a scrim on viewing | viewing: 1 scrim |
| v3 D3 tabs | the own row as a button | own row is a BUTTON |
| v3 D4 park | close the drawer on park-save (source) | the package form is not back |
| v3 D5 edition | an edition on rename (source) | the edit cannot be undone exactly — see below |
| v3 D5 (b) | the v2 save, `deleteField()` for an unset version (source) | the rename of a sent package without a version does not save |
| v3 D6 duplicate | write on Duplicate (source) | 5 packages before, 6 with the duplicate open |
| v3 E3 order | default sort by sent (source) | Requests aria-sort none |
| v3 E1 (unit) | credit every query to the current letter | 3 of 13 unit cases fail |
| v3 E2 (unit) | drop the 4-answered threshold | "a lead cell ignores rows under 4 answered" fails |

- **E1, E2 and E3 first stayed green under their mutations, and that was the fixture:** on "The Smoke Test" the one
  row with 4 or more answered ("The Complete Autumn…", 4 of 4, 2 requests) ties the best under-4 row ("Prologue-led",
  2 of 2, 2 requests) on rate AND requests, and the tie goes to more sent. E1 now presses every heading in both
  directions (a Name sort shows the rule broken); E3 asserts the default sort itself. **E2 cannot be seen on this
  account at all**, so its rendered lock asserts the composition and its red is the unit lock's
  (`packageReplies.test.ts`, proved red).
- **The D5 mutation run changed the account and the lock said so** ("could not undo the edition — the account has
  changed"): the mutation appended to "anything else" on every save, so no Undo could restore it exactly. "Prologue-led"
  was left as "Prologue-led x x" in a 3rd edition. **Restored by hand** (two rule-compliant writes stepping the edition
  back), and checked field by field against `seedPackages.mjs`: name, letter, synopsis, version, stamp, no "anything
  else", no stored editions. D5 (b) was then re-run on the clean fixture.
- **A harness bug cost one round:** in-page mutations ran before `<body>` existed, so the first A1 proof passed. They now
  wait for `DOMContentLoaded`. And the build gate's production build overwrote the dev bundle the preview served once;
  `bundleGuard` refused to measure it, which is what it is for.

**Account restored.** Every writing lock puts the account back in the same run (F1, V3-D4, V3-D5, C3), and `seedPk4.mjs
--clean` runs in `afterAll`. Checked after the runs: "The Smoke Test" holds exactly its four seeded packages, unchanged.

## L2 — no regression (integration build, 55e2acad)

| Suite | Result |
|---|---|
| pk4 | 37 passed |
| qcV138 / qcV1381 / qcV1383 / qcV1384 | 17 / 7 / 4 / 6 passed |
| qcV1382 | 3 passed, D1 (motion timing) failed in the batch; **passed alone** on the same build — load from concurrent runs |
| contactV17 / contactV171 | 14 / 7 passed |
| queryPanelV2 | 9 passed, 1 skipped, **V6–V8 failed: "another row on screen". It fails identically on the deployed dev build without packages v4** — it predates this pack |
| headerV3 | 4 passed, 1 skipped (the route left its NUMBER set) |
| todoV2 | 19 passed |

Unit and build gates on the integration branch: tsc 0, both builds 0, Vitest 8,807 passed (the one failing file is
`functions/src/email.test.ts`, which fails to import in a worktree without `functions/node_modules`; red at the base too).

## Retired and rewritten locks

Retired (`tests/e2e/RETIRED-packages-v4.md`): `pkgMat`, `pkg21`, `packagesPartB`. Re-pointed: `headerV3` (route out of
`NUMBER`), `livingHeadersV3` (row out), `plateRoutes` (route into `OWN_HEADER_ROUTES`). Unit: `materialsPageSmoke`
(chrome reads the new title; the empty case is the empty page), `livingExhibitSource` (the exhibit's mount row out;
`PkgEmpty4` into the no-data sweep), `materialsBand` (one materials surface is the sheet; the way back is the sheet and
the drawer), `packageLock` (the draft builders live in `usePackagesModel`; the edit-branch window widened).
`PackagesExhibit`, `PkgCard`, `PkgComposer`, `PkgMaterials`, `PkgMaterialDrawer`, `PkgBand` and `PageRail` are no
longer mounted by the page; their files stay for their own tests and other importers.

## Shots

`shots/`: each `design-refs/packages-v4/screens/*` view at 1512 and 1280 (`01-top` … `08-empty-lower`), v3's drawer views
(`ref-drawer-inside`, `-stats`, `-more`, `ref-pkg-new`, `ref-pkg-edit-sent`, `ref-mat-letter`, `ref-mat-new`), the parked
material form, `every-retired`, `empty-one-letter`, and `page-1920` / `page-1024` (with `-lower`). They were taken with
the fixtures seeded, so "The Smoke Test" shows the "Two editions" fixture (which is why it reads "4 packages in use").

## For Nick

- **At 1280 the packages and materials sheets are one column**, as the prompt's "one below 1100 of sheet width" says:
  the sheet is ~976 wide there. The mock (whose breakpoints are the viewport's) draws two. The lead row is two columns
  and the search 220. Nothing overflows (L1 at 1920, 1512, 1280, 1180 and 1024). If two columns of cards are wanted at
  1280, the breakpoint is one number.
- **Reply rate on the harness account:** "Harbour of Glass" **100% (4 of 4 answered)**; "The Smoke Test" **100% (7 of 7)**.
  Both are honest and both look odd: every answered query there drew a reply.
- **"Not recorded" versions:** 7 credited queries on "The Smoke Test" (its packages without a version), 1 on "Harbour of
  Glass" ("First round").
- **A pre-existing bug, now fixed on this branch:** on the v2 page, editing or renaming any SENT package without a
  version failed silently (a `deleteField()` reached `updatePackage`'s edition check). It is fixed at the call site;
  `updatePackage` is untouched, but its check would be safer reading only strings.
- **Lift candidates:** `HalfDrawer` + a `modal` switch; the light header and its card; the white sheet, its navy row,
  search, bands and heading strip; the empty page's panel, section heads and ways cards; a shell FilterPill/Panel.
- **The Query Centre's package chip could deep-link** with the new `?pkg={id}` (`Queries.tsx` 5484 and 7140).
- **Prod rules: no change was needed.**

## Deploy

- **Integration branch:** `dev/query-panel-v1-onb9-tip-onb9-comps26-1-qp2-comps27-qp2b-comps27-1-qp2c-corkboard1-qp2d-cl16-cl17-cl171-qc138-qc1381-qc1382-qc1383-qc1384-pkg4`
  — the branch dev served at deploy time (v138.4's, c0f59a6c, `index-D0Dot8dT.js`) with `packages-v4` merged in. The
  only conflict was `design-refs/.refhashes.json` (the integration's copy kept, the two packages refs re-enrolled).
  Gates on it: tsc 0, both builds 0, Vitest 8,807 passed.
- **Dev build:** `index-0P7A_QV6.js`, built from caf0ee4e in a clean worktree, hosting only
  (`--config firebase.dev.json --project scriptally-dev`). Served hash checked before (`D0Dot8dT`) and after
  (`0P7A_QV6`). A1 and C1 re-run green against the deployed site.
- Both branches are pushed. **Nothing is merged to `main`.** No rules or functions changed.
