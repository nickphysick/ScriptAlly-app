# Submission packages v40 — report

Lifecycle and locking, the shelf and the workbench, Tracking & performance on every tab, and no mono capitals.
Branch `submission-packages-v40` (not merged to `main`). On dev as `dev/db71-plad-db71f-cl25-lm2-cl251-lm3-db77-lm4-cl252-pk40`,
bundle **`index-Dy4CpxPZ.js`**. **Prod untouched**: no prod deploy of any kind, no prod rules, no prod functions.

## 1. False premises

1. **B's single width does not hold for the tracking body.** The ref widens the body to `sheet − 48` once the sheet is
   1200px or narrower (`@container sheet (max-width:1200px){.tp-body{width:calc(100% - 48px)}}`). Measured in the ref:
   1144 and 984 at 1440 and 1280, against 1096 and 936 for the shelf and the workbench. The app follows the ref.
   L9 asserts the ref's rule for the body and B's rule for the shelf and the workbench.
2. **The ref's frozen state never shows a running test.** Its seeded copy never reaches the Tests view, so the capture
   has no rules for a test card. The card's rules are the ref's own authored ones, copied by hand into `pk26.css`.
3. **The ref's locked-package dialog (`ask`) can't be reached in the frozen state**, because a locked package never
   opens in the workbench. It isn't built. Nothing in the app can try to edit a sent package's contents.
4. **The ref still draws one small mono capital: the hero animation's "READY" chip** (8px JetBrains, uppercase), left
   over from an earlier layer. Rule I wins. The chip is the typewriter in sentence case.
5. **The material drawer's section headings and field labels were mono capitals.** The brief allowed only "the label
   restyle" in that drawer, and that restyle is what fixed them.
6. **"Live" on the scoreboard means Ready and Out.** The mock counts its live packages, and on the fixture the summary
   reads "1 of 3 packages with enough to compare". A draft has nothing to compare and a retired package has left the
   page's choices.
7. **"Start from: a copy of …" in the New package dialog did not set `copiedFromId`**, so a copy made there was never a
   test. It sets it now.
8. **The ref's width rules are `@container sheet` queries; the generated sheet buckets them as viewport media queries**
   (1440 and 1300). They agree with the sidebar expanded, which is the frozen state. With it collapsed, the narrow rules
   start about 180px of viewport early. This is known and not engineered round.
9. **The Help article (`src/content/help/articles.ts:185`) still describes editions.** It is a follow-up. Help was
   outside this pack.
10. **Dev hosting was serving another session's stack** (`index-Su9SiFnv.js`, from `…-lm4-cl252`; I confirmed this by
    building that branch byte-for-byte). v40 was merged onto that stack, not onto my old v26 dev branch.

## 2. Merge conflicts

- Branching from `origin/submission-packages-v26` with `origin/main` merged in, there was one conflict:
  `design-refs/.refhashes.json`. I resolved it as the union of both sides (`bd36e6a2`).
- The dev deploy merge onto `…-lm4-cl252` hit the same file and got the same union.
- `firestore.rules` merged cleanly. Against the served stack it differs only by v40's own lines.

## 3. Gates

| | tsc | production build | vitest |
|---|---|---|---|
| Baseline (before any edit) | clean | clean | 661 files · 10,433 passed · 3 skipped |
| Final (`ba5515ab`) | clean | clean | 662 files · 10,459 passed · 3 skipped |
| Merged dev stack | clean | clean (dev) | 670 files · 10,547 passed · 3 skipped |

- Two runs ended with the known `[vitest-worker]: Timeout calling "onTaskUpdate"`. In both, the counts showed every test
  passed and there were no FAIL lines.
- I read the build output for errors and warnings every time and found none.

## 4. Commits

| Phase | Commit | What |
|---|---|---|
| — | `bd36e6a2` | merge origin/main |
| — | `93085f02` | the design pack |
| 1 | `cebdd0d0` | model: `lib/packagesV40`, the lock in `db.updatePackage` and the rules, `copiedFromId`, "New package from this", editions off |
| 2 | `7c4088a4` | the shelf, the shelf drawer, the workbench; CSS regenerated from v40 |
| 3 | `c758867e` | Tracking & performance on the Packages tab (Results retired) |
| 4 | `0b9d2ffa` | tracking on the Query letters and Synopses tabs |
| 5 | `2904e6ee` | no mono capitals, the dialog, How it works |
| 6 | `67f0dd0f`, `ba5515ab` | locks, screenshots, the brand-new shelf, the stepper, the Draft chip's pencil |

## 5. Locks

All locks are on the rendered page (`tests/e2e/pk40.measure.ts`) at 1512 × 982, plus 1280 × 832 for L9, on the
`seedPk40.mjs` fixture. Each one was red on the v26 branch before the build; those ledgers are in
`ledger/red-before/`. Final ledgers are in `ledger/`.

| Lock | What it holds | Red before (v26) | Final |
|---|---|---|---|
| L1 | a package with a sent query never opens on the workbench; its drawer offers no slot, Add or extra | 0/7 | 7/7 |
| L2 | New package from this: "Standard 3", same pieces, `copiedFromId`, the original unchanged, the toast | 0/8 | 8/8 |
| L3 | the stage table (unit: `src/lib/packagesV40.test.ts`, 26 cases) | module missing | green |
| L4 | shelf = Out + Retired; selector = Draft + Ready | 0/5 | 5/5 |
| L5–L6 | head to head, the verdict, the scoreboard, the summary, Tests | 0/10 | 10/10 |
| L6–L7 | letters and synopses figures; "No synopsis" counts exactly 2 | 0/6 | 6/6 |
| L8 | no visible text is mono AND uppercase, across every tab, the dialog, How it works, both drawers | 0/12 | 18/18 |
| L9 | the three sections' widths and centring; the art left of the title | 0/7, 0/7 | 7/7, 7/7 |
| L10 | populated and brand new, every tab, no console errors | 1/7 | 7/7 |

**Named breaks** (`PK40_MUTATE`, ledgers `mut-*.json`):

| Break | Applied | What turned red |
|---|---|---|
| L8 | a mono-caps eyebrow over the workbench heading | 8 readings ("P.: THE WORKBENCH") |
| L9 | the shelf takes the v26 column back | width and centring (1208 against 1160) |
| L4 | a locked package injected into the selector | `["pk40-draft","pk40-ready","pk40-std"]` |

**Corrections to the instruments, each found by running them:**

- **L2**'s "original unchanged" check now compares with the keys sorted. Two reads of one unchanged document listed its
  fields in different orders.
- **L8**:
  - It reads only elements that hold text themselves. A container whose own, unused style is mono capitals is not text
    anyone sees.
  - It checks that each layer actually opened before reading it. Its How it works button named a class that doesn't
    exist, so that reading had never opened the modal.
  - It now reads the material drawer as well.
- **L10** found a real fault: the brand-new page had hidden the shelf. The ref draws it with "Nothing has gone out
  yet…", and the page does now.

## 6. The rules

- The dev ruleset was released at **21:05:07Z** (`f339d37e`).
  - That release came from my branch and **dropped Dashboard v77's `betaFeedback` owner-read rule**, which another
    session had deployed at 17:02 and which isn't on `main`.
- I restored that rule verbatim and re-released at **21:06:04Z** (`71bab5c7`).
  - For about a minute, dev's `betaFeedback` reads fell back to the older rule.
- The v40 lock was re-probed at 22:14Z with `tests/e2e/rulesProbe.mjs`:

| Write to a sent package | Result |
|---|---|
| change the letter | DENIED |
| change the synopsis | DENIED |
| change the pages | DENIED |
| change `extraIds` | DENIED |
| change the letter with an edition bump | DENIED |
| change name, note and icon | ACCEPTED |
| retire | ACCEPTED |
| create with `copiedFromId` | ACCEPTED |
| change or remove `copiedFromId` | DENIED |
| change the letter on an unsent copy | ACCEPTED |

- **Prod rules are untouched and are Nick's.** They still carry the edition branches.

## 7. Editions callers left (A3: the engine stays, nothing starts an edition)

- `db.updatePackage` no longer calls `nextEdition`. A sent package's contents are refused, in the client and in the rules.
- Still calling into the engine:
  - `editionsOf`: `packageReplies.ts:98`, `qcRowLines.ts:182`, `compUsage.ts:101`, `packagesV26.ts:120`.
  - `editionNumber`: `packagesV26.ts:106,118`, `PkgCard.tsx:58`, `v4/usePackagesModel.ts:154`.
  - `revertPackageEdition`: `v4/usePackagesModel.ts:155`. It is exported by `db.tsx` and is unreachable now that no
    edition starts.
  - `contentsChanged`: `db.tsx:2000`, for an unsent package's edition bookkeeping.
- Packages that already hold several editions stay readable. The dev harness account has none (0 of 11).

## 8. packageReplies callers left (H: the page's figures are versionsV2's)

- Every figure in Tracking, the shelf and its drawer comes from `lib/packagesV40.factsOf`. That means:
  - versionsV2's `counts`, `isMore` and `isReply`;
  - `MIN_SENT_FOR_RATE` of 5;
  - reply days from the log.
- `packageReplies` is still imported by:
  - `v26/usePk26Model.ts`: `materialSplit`, `packageSplit`, `overall` and `materialQueries`. These feed Your materials'
    "sent n", the material drawer's "sent with n queries" and "went to", and the model's legacy splits.
  - `v4/usePackagesModel.ts`: `currentSplit`/`allSplit`, which nothing on the page draws any more.
  - `lib/packagesV40.ts`: `creditedTo` and `creditedSlot`, its crediting rules only.
  - `lib/versionsV2.ts` and `lib/packagesV26.ts`.
- On the fixture the "sent" counts agree: Hook-first is 7 both ways, Comps-forward 4.

## 9. Screenshots

- Screens 01–17 at 1512 and 1280 are in `app/`, taken by `tests/e2e/pk40.shots.measure.ts` (`PK40_SHOTS=1`).
- The six side-by-sides (01, 03, 05, 07, 11, 15, ref left and app right) are in `side-by-side/`.
- Differences, each resolved or expected:

| Difference | Why |
|---|---|
| Names, counts and dates | The fixture isn't the mock's data: "Standard", "Locks of v40", no reply dates (so "– days to reply"). |
| The app's shell around the sheet | The beta strip, the sidebar's labels and the feedback card are the shell's, not this page's. |
| Brand new, Pages from | The ref's draft starts on its "Original" version; the brand-new fixture manuscript has no versions, so the slot is empty. |
| Brand new, Also sends | The ref lists two extras; the fixture has none. The draft first package has no "Delete draft" because nothing is stored yet (v26's rule). |
| The draft's stepper wraps its sub-lines | The app's sheet is narrower than the ref's, and a draft needing both pieces says "Add a query letter and pages". The steps now shrink and wrap where they used to be cut off at the panel edge (measured 684 of 684). |
| Fixed | The Draft chip's "✎" was missing (the capture drops `content`); added. |

- The generated sheet was checked against the ref with `scripts/pk40/verify.cjs` (the ref's own DOM, styled only by the
  generated sheet). At 1512 the states differ by 2–4%, mostly italic antialiasing:
  - use 2.48%
  - Scoreboard 2.32%
  - letters 3.94%
  - start card 3.53%
  - brand new 2.63%
- The shelf drawer reads 12.3% because the harness lays its fixed layer out differently.
- Extracted states:
  - use
  - shelfDrawer (×2)
  - guidelines
  - dlgNew, dlgEdit
  - tpB, tpC
  - let, syn, libsyn, libver
  - drawer
  - expop
  - hwm
  - dup
  - drag
  - start
  - new, newLet, newSyn

## 10. Follow-ups

- The Help article on editions (§1.9).
- Prod rules (Nick's), when this goes to prod.
- `revertPackageEdition` and the v4 model's splits can be retired once nothing else reads them.
- Container queries for the generated width buckets (§1.8).
