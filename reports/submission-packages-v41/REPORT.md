# Submission packages v41 — report: the page joins the app as a workspace

Branch `submission-packages-v41`, cut in its own worktree from the tip of `submission-packages-v39-3` at **14d3d0e3**.
The pack's hashes (the ref 281a1980…, the art, the screens) verified against `SHA256SUMS` (1e36e25c…); the ref is
enrolled in `.refhashes.json`.

## 1 · False premises (first)

1. **"That one was never run" is not so.** The earlier v41 pack (the stacked page: a full-width list above the
   builder) had been built, committed (914630ce → 8e8437f6) and deployed to dev as
   `dev/qc1511-db2-title-sip-qc1512-cl26-sip11-tl1-pk41` (`index-CpIAV0Ww.js`) before this pack arrived. It was
   discarded by **continuing on the same branch**: its full-width list (`Pk41List`) is deleted, its locks rewritten
   rather than added beside, and its retirements (header card, explainer, labels, kicker, results band, tilted
   showcases, v39 guide) kept, since this pack retires the same pieces. Its commits stay in the history.
2. **There is no founding-writer field on the account.** `User` carries only `foundingSeenTier`; during the beta every
   account is a founding member and Pro pages are open through a constant (`PACKAGES_OPEN_TO_ALL`, lib/entitlements).
   So it is derived: **`packagesViaFounding(user)` = `PACKAGES_OPEN_TO_ALL` and the plan is not paid Pro.** A paid Pro
   user never sees the strip; when founding access ends, nobody does.
3. **FeedbackDock cannot open with a topic pre-chosen.** `openFeedback()` takes no argument, and its "kind" is the type
   of feedback (broken / confusing / idea / liked), not a page. It already records the **page** as the shell's page name
   (`WorkspaceShell` → `setFeedbackPage`), so "Tell us what you think" opens it plain and the message is filed against
   Submission packages. FeedbackDock's form is untouched.
4. **The pinned Archivist cannot be at `right: -6px` and clear the content** (the pack repeats the earlier number). At
   212 tall the art's box is 171.5 wide, so at -6 its left edge sits 7.5px inside the content's right edge at both
   widths. The PNG's transparent margin is on the right, so **`right: -14px`** slides only transparent pixels off the
   window and clears the content. L8 holds it.
5. **The rail's cap in the ref is `100vh − 92`**, which assumes the page starts at the top of the window. Here it starts
   under the shell's bar, so the cap is the page's own scrollport: **`--wpg-port-h` − 28** (14 above, 14 below). L5
   reads it after scrolling 600: the rail sits 14 from the scroller's top and ends inside the scrollport.
6. **Dashboard v2's framed card is not on this base** (`dashboard/v2/Frame.tsx` is on the dev line only). The frame is
   built page-locally with the same values (pk41.css; `Frame` in Pk41Results). A lift candidate once both are on main.
7. **There is no shared drawer header "option A".** `HalfDrawer` takes a `head` node from each caller. The New package /
   Package details drawer draws the ref's option A itself (`.p41-dh`); its frame and body are the app's.
8. **The ref's own script still carries the old copy for How it works steps 2 and 3.** The pack's copy wins, verbatim
   (unit-locked in `pk41HowItWorks.test.tsx`); step 3's miniature draws the batch as the header's lower strip.
9. **"The subheader is one line with the title"**: the ref sets it on the line UNDER the title (`.k4-sub` margin 6, its
   own block). L3 holds that it is one line, directly under the title and in its column.
10. **The header with the ref's own values is 100.8 tall**; the subheader's line-height is 1.3 (the house floor for a
    line that clips), not 1.4.
11. **A missing piece in the batch strip** is drawn as the ref draws it in the header (`.k4-hero.wbt .k4-btp > span.no`):
    an inset hairline ring, not a dashed border.
12. **The shared fixture has no package colours** (every package reads as Harbour), so L5 and L6 could not tell two
    packages' colours apart. `pk41Fixture.mjs --colours` sets Standard → Plum and Ready one → Pine; `seedPk40.mjs`
    puts them back.
13. **pk38 L9 and PK26-H were already red on the v39.3 base**: they read `data-locked`, Your materials and
    `.p9-po-tt`, none of which v39.3 renders. L9 is retired (pk393 L13-sent holds it); H is re-pointed.
14. **Dev carries a phone Packages page (`PackagesPhone.tsx`) that imports the old guide's `HOW_STEPS`.** In the dev
    merge it reads the new guide's (same shape).
15. **There are 7 worktrees besides the primary** (CLAUDE.md asks to flag more than 5). Only `ScriptAlly-pk41` is this
    session's; it is removed at the end. The stacked build used for the red proofs was exported with `git archive`
    into the scratchpad, not added as a worktree.

## 2 · Where things are stored

- **The founding writer**: derived, `packagesViaFounding` (no field).
- **The strip's dismissal**: one leaf on the user, **`todoPrefs.packages.foundingNoteHidden`** (`updateUserPaths`;
  `todoPrefs` is an unconstrained map in the rules, so **no rules change**). How it works offers "Show the founding writer
  note" (founding writers only, after a dismissal), which clears it.
- **The active package**: unchanged — the manuscript's `activePackageId`, written through the model's `makeActive`
  (toast and Undo included). The strip's Change reads and writes nothing else; Open → only selects the package in the
  workspace.
- **Which package is open in the workspace**: page state (as before), not stored.

## 3 · Retired and deleted, versus kept

| Retired from the page | Deleted or kept |
|---|---|
| the header card and its art (`Pk39Header`) | **deleted**; `PACKAGES_HERO` and its PNG are kept (unread) |
| the explainer (`Pk39Tip`) | **deleted**; its job is the header's subheader and How it works |
| the raised panel (`.p9-pkc`) | removed from the markup; its CSS (pk392.css B) is inert |
| the label tiles (`Pk39Labels`) | **deleted**; `Ring` stays in the file (the package drawer reads it) |
| "Build, view and edit" | removed; the builder's section is `.p41-build` |
| the stacked pass's full-width list (`Pk41List`: navy bar, tabs, Show retired) | **deleted**, replaced by the rail (`Pk41Rail`) |
| the batch as its own row under the header | the same component (`Pk41Batch`), now the header's lower strip |
| the navy results band, the tilted showcases, their headings, and the pieces' showcase row | **`Pk38Results` deleted**, replaced by `Pk41Results`. Every figure is unchanged. |
| the v39 guide (`Pk39HowItWorks`, its test, its CSS) | **deleted**, replaced by `Pk41HowItWorks` |
| the package-colour gloss band on the builder; the stacked pass's navy band | the band is an 11% wash of the package's colour with a 5px stripe of it |
| kept as built | the steps, picks and writes, the preview and its linking, the sent lock and Make a copy, renaming in place, the icon-and-colour popover, Make active, the log-a-query journey, every drawer and its handlers, v40's package guidelines, the brand-new page's hero |

The generated sheets (`pk38/pk39/pk391/pk40.generated.css`) are left as generated; rules for the retired classes in
them are inert.

## 4 · Commits

The stacked pass (kept in the history): 914630ce, f6e3d7ff, 5923039e, 2950ec74, 19478850, 8e8437f6.

| Phase (workspace) | Commit | What |
|---|---|---|
| 1 · ground, padding, retirements | c8b2a5d2f | the ref + `.refhashes.json`; the full-width list retired |
| 2 · banner and header with the batch strip | bc5cc0703 | `Pk41Header` (`batch` prop), `Pk41Batch` as a strip |
| 3 · workspace and rail | f9ea43209 | `Pk41Rail` (new), `lib/packagesV41.ts` (`railGroups`, `railLine`), `SubmissionPackages.tsx` |
| 4 · frames, builder, results, drawer | 9ad5467f9 | `Pk393Builder.tsx`, `Pk26Builder.tsx`, the band's wash and stripe, preview under the steps |
| 5 · How it works; the Archivist as built | a767eb92d | `Pk41HowItWorks.tsx` (+ test) |
| 6 · locks, CLAUDE.md, report, screenshots | the next commit | `pk41.measure.ts`, `pk41Fixture.mjs`, `pk41.shots.measure.ts`, `pk38/pk39/pk393.measure.ts`, the RETIRED manifest, CLAUDE.md, this report, `app/`, `side-by-side/` |

## 5 · Gates (baseline → final)

| Gate | Baseline (14d3d0e3) | Final |
|---|---|---|
| tsc | 0 | 0 |
| build (`build:dev`, grepped) | clean | clean |
| Vitest | 679 files, 10,631 passed, 3 skipped | 680 files, 10,644 passed, 3 skipped |
| e2e, this page | pk393 L10–L14 green | **SP41 L1–L9: 18 of 18 cases green at 1512 and 1280**; re-pointed and green: pk393 L10–L14 (6), pk38 L1, L3, L4, L7, L10, L11, pk39 L5 |

## 6 · Locks

`tests/e2e/pk41.measure.ts` (fixture `seedPk40.mjs` + `pk41Fixture.mjs`, restored in afterAll), at 1512 × 982 and
1280 × 832, each with a reading floor. L1, L2, L8 and L9 carry over from the stacked pass; **L3–L7 are rewritten**.

- **L1 Page** — the gradient under the pattern; the pattern's opacity equals the Contact list's; no header card, labels,
  panel, explainer, kicker, band, tilted showcase, **list card, list bar or list tabs**; no horizontal overflow.
- **L2 Banner** — shown for the founding harness, absent for paid Pro (`dv1@scriptally.test`, read only); one line; the
  folder tab and its foot rgb(251, 239, 233); FeedbackDock opens; ✕ writes the leaf, stays hidden after a reload, the tab
  is cream again; How it works brings it back.
- **L3 Header** — exactly one navy panel (≥ 200 × 40) above the results, and it is the header; the rail head and the
  builder band are not navy; one-line subheader under the title naming the manuscript; no image.
- **L4 Batch** — the strip is inside the header, flush left, right and bottom ±1; it is the stored `activePackageId`;
  Open → selects it in the rail; its name and pieces equal the builder's own steps (the synopsis chip hidden at 1280);
  Change lists exactly the Ready and Out packages and a pick writes `activePackageId`; "Choose one →" with no active
  package; absent with no packages.
- **L5 Rail** — 300 ±2 at 1512, 262 ±2 at 1280; its top level with the builder's ±1; the head counts the live packages;
  groups out · ready · draft in order, each count its rows, Out against the store; the sent / ready / draft lines in
  their words (the draft's in berry); Retired folded; for two packages of different colours, the open row's 3px left
  edge is its colour and selecting did not move the page; ↓ and Enter select the next row; after scrolling 600 the rail
  sits 14 from the scroller's top, ends inside the scrollport, and its rows scroll inside it.
- **L6 Frames** — builder, totals, three best cards, two tables: a 7 ±1 white rim, a 1px rgb(227, 213, 201) frame, their
  bands; the builder's band is an 11% wash of the open package's colour (resolved by the browser on a probe) with a 5px
  stripe of it, for Plum and Pine.
- **L7 Preview** — the preview's top is at or below the last step's bottom; with a sent package open every button under
  the preview sits inside the well.
- **L8 Hawk** — fixed, decorative, bottom = the viewport's ±1 before and after scrolling 600, 212 ±2 tall, clear of the
  content and intersecting no element in it; absent at 390.
- **L9 How it works** — the five titles in order, none of the old guide's strings, "Got it" last, Escape closes it.

**Red before** (`redproofs-workspace.txt`): against the stacked v41 build (8e8437f6, `index-mbz5BdaC.js`, exported with
`git archive` and built in the scratchpad), at 1512: L1 (the list card, its bar and four tabs in the DOM), L3 (three
navy panels — header, list bar, builder band — and the band navy), L6 (no stripe; the band navy, not the wash), L7 (the
preview beside the steps, its top 357 above the last step's bottom). L4 and L5 fail by absence on that build (no rail,
no Open → selection; the run times out), so their honest proof is the break below. (The earlier `redproofs.txt` against
v39.3 only shows every case timing out at open — the header is absent there.)

**Red under its own break** (`PK41_MUTATE=L1…L9`, the final build a767eb92d, 1512; ledgers `ledger/mut-L*`):
L1 (no pattern: both ground readings), L2 (the strip wraps; the folder tab cream), L3 (the rail head navy: two navy
panels; the subheader wraps), L4 (the strip inset, not flush: left and right), L5 (rail 340 wide; the open row's edge
navy, not its colour, for both; static, so −328 from the top after scrolling), L6 (no rim on all seven frames; the
stripe navy for both packages), L7 (two columns: the preview beside the steps; the two buttons out of the well), L8 (260
tall, over the content, before and after scrolling), L9 (an old title back). L7's first break run met Firebase's
password-verification quota and was re-run seven minutes later; recorded.

Retired and re-pointed older locks: `tests/e2e/RETIRED-submission-packages-v41.md` (22 retired, 10 re-pointed, and the
table of v41's own locks rewritten for the workspace). pk38, pk39 and pk393 now wait for the rail.

## 7 · Screenshots

`app/` holds the 16 states at 1512 × 982 and 1280 × 832 (the ref's widths), named as the ref's `screens/*`;
`side-by-side/` puts each beside the ref's screen. The fixture is the v40 harness's, not the ref's sample data (names,
counts differ).

## 8 · Deploy

DEPLOY
