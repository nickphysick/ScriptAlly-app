# Submission packages v41 — report: the page joins the app

Branch `submission-packages-v41`, cut in its own worktree from the tip of `submission-packages-v39-3` at **14d3d0e3**
(v39.3's code is on dev: only its report commit is not). Level with base: 0 behind, clean tree. The pack's 34 hashes
(the ref c5a0b350…, three art files, 30 screens) verified against `SHA256SUMS` (eaa09d1b…); the ref is enrolled in
`.refhashes.json`.

## 1 · False premises (first)

1. **There is no founding-writer field on the account.** `User` carries only `foundingSeenTier`; during the beta every
   account is a founding member and Pro pages are open through a constant (`PACKAGES_OPEN_TO_ALL`, lib/entitlements).
   So "a user whose Pro access comes from being a founding writer" is derived: **`packagesViaFounding(user)` =
   `PACKAGES_OPEN_TO_ALL` and the plan is not paid Pro.** A paid Pro user never sees the strip; when founding access
   ends, nobody does.
2. **FeedbackDock cannot open with a topic pre-chosen.** `openFeedback()` takes no argument, and its "kind" is the type
   of feedback (broken / confusing / idea / liked), not a page. It already records the **page** as the shell's own
   page name for the route (`WorkspaceShell` → `setFeedbackPage`), so "Tell us what you think" opens it plain and the
   message is filed against Submission packages.
3. **Dashboard v2's framed card is not on this base** (`dashboard/v2/Frame.tsx` is on the dev line only). The frame is
   built page-locally with the same values (pk41.css; `Frame` in Pk41Results) — a lift candidate once both are on main.
4. **There is no shared drawer header "option A".** `HalfDrawer` takes a `head` node from each caller; no art prop
   exists. The New package / Package details drawer draws the ref's option A itself (`.p41-dh`); its frame and body are
   the app's, as the pack asks.
5. **The pinned Archivist cannot be at `right: -6px` and clear the content.** At 212 tall the art's box is 171.5 wide,
   so its left edge sits 7.5px inside the content's right edge at both widths (1346.5 vs 1354 at 1512; 1114.5 vs 1122
   at 1280) — the ref overlaps too. The PNG's ink starts at its left edge and its transparent margin is on the right
   (ink x 1–545 of 724), so **`right: -14px`** slides only transparent pixels off the window (the ink still ends 29px
   inside it) and clears the content (1354.5 / 1122.5). L8 holds it.
6. **The header with the ref's own values is 100.8 tall** (35.7 + 6 + 23.1 + 36) against L3's ≤ 100. The subheader's
   line-height is 1.3 (the house floor for a line that clips), not 1.4: 99.1.
7. **The pack's pattern tile is the shipped one** (the same six motifs, a 240 tile against the shipped 340 × 360, the
   same .085 opacity — the Contact list's, baked into the SVG as theirs is). Kept.
8. **The art is 612KB for a 212px decoration.** Shipped at twice its drawn size (the Archivist 356 × 440, 174KB; the
   Fledgling 72 wide, 19KB); the pack's originals stay in design-refs.
9. **"Drag pieces in yourself"** (the New package drawer's "Empty" option) still named the retired gesture; it reads
   "Pick each piece yourself".
10. **pk38 L9 and PK26-H were already red on the v39.3 base**: they read `data-locked`, Your materials and
    `.p9-po-tt`, none of which v39.3 renders. L9 is retired (pk393 L13-sent holds it); H is re-pointed.
11. **Dev now carries a phone Packages page (`PackagesPhone.tsx`) that imports the old guide's `HOW_STEPS`.** In the dev
    merge it reads the new guide's (same shape; the copy is the current page's).

## 2 · Where things are stored

- **The founding writer**: derived, `packagesViaFounding` (no field).
- **The strip's dismissal**: one leaf on the user, **`todoPrefs.packages.foundingNoteHidden`** (`updateUserPaths`;
  `todoPrefs` is an unconstrained map in the rules, so **no rules change**). How it works offers "Show the founding writer
  note" (below its card, founding writers only, after a dismissal), which clears it.
- **The active package**: unchanged — the manuscript's `activePackageId`, written through the model's `makeActive`
  (toast and Undo included). The batch row's Change reads and writes nothing else.

## 3 · Retired and deleted, versus kept

| Retired from the page | Deleted or kept |
|---|---|
| the header card and its art (`Pk39Header`) | **deleted**; `PACKAGES_HERO` and its PNG are kept (unread) |
| the explainer (`Pk39Tip`) | **deleted**; its job is the header's subheader and How it works |
| the raised panel (`.p9-pkc`) | removed from the markup; its CSS (pk392.css B) is inert |
| the label tiles (`Pk39Labels`) | **deleted**; `Ring` stays in the file (the package drawer reads it) |
| "Build, view and edit" | removed; the builder's section is `.p41-build`, out of v39.1's forced-serif rule |
| the navy results band, the tilted showcases, their headings, **and the pieces' showcase row** (Best opening / letter / synopsis) | **`Pk38Results` deleted**, replaced by `Pk41Results`. The pieces' row is not in the ref; the pieces table ranks them, best first. Every figure is unchanged. |
| the v39 guide (`Pk39HowItWorks`, its test, its `.p9-hw2` CSS) | **deleted**, replaced by `Pk41HowItWorks` |
| the package-colour gloss band on the builder | the band is navy; the colour lives on the icon tile |
| kept as built | the steps, picks and writes, the preview and its linking, the sent lock and Make a copy, renaming in place, the icon-and-colour popover, Make active, the log-a-query journey, every drawer and its handlers, v40's package guidelines (under the frame), the brand-new page's hero |

The generated sheets (`pk38/pk39/pk391/pk40.generated.css`) are left as generated; rules for the retired classes in
them are inert.

## 4 · Commits

| Phase | Commit | Files |
|---|---|---|
| 1 · ground, column, retirements | 914630ce | the ref + `.refhashes.json`, the two art files, `pk41.css` (new), `SubmissionPackages.tsx`, `Pk26Builder.tsx`, `Pk39Labels.tsx`; `Pk39Header.tsx`, `Pk39Tip.tsx` deleted; two unit locks re-pointed |
| 2 · strip and header | f6e3d7ff | `lib/entitlements.ts`, `types.ts`, `lib/packagesV41.ts` (+ test), `Pk41Banner.tsx`, `Pk41Header.tsx`, `pk41.css`, `SubmissionPackages.tsx` |
| 3 · batch row and list | 5923039e | `Pk41Batch.tsx`, `Pk41List.tsx`, `lib/packagesV41.ts` (+ test), `pk41.css`, `SubmissionPackages.tsx`, the smoke test |
| 4 · frames, builder, Results, drawer header | 2950ec74 | `Pk393Builder.tsx`, `Pk26Dialog.tsx`, `Pk41Results.tsx`, `pk41.css`, `SubmissionPackages.tsx`, the smoke test; `Pk38Results.tsx` deleted |
| 5 · the Archivist and How it works | 19478850 | `Pk41Hawk.tsx`, `Pk41HowItWorks.tsx` (+ test), `pk41.css`, `SubmissionPackages.tsx`, `Pk26Header.tsx`, `pk39.css`; `Pk39HowItWorks.tsx` (+ test) deleted |
| 6 · locks, CLAUDE.md, report | this commit | `tests/e2e/pk41.measure.ts`, `pk41.shots.measure.ts`, `pk41Fixture.mjs`, `RETIRED-submission-packages-v41.md`, `pk26/pk38/pk39/pk391/pk392/pk393.measure.ts`, `scripts/pk41/sbs.cjs`, `pk41.css` (the header's line-height), `CLAUDE.md`, this report |

## 5 · Gates (baseline → final)

| Gate | Baseline (14d3d0e3) | Final |
|---|---|---|
| tsc | 0 | 0 |
| build (`build:dev`, grepped) | clean | clean |
| Vitest | 679 files, 10,631 passed, 3 skipped | 680 files, 10,644 passed, 3 skipped (+13: `packagesV41.test.ts`, `pk41HowItWorks.test.tsx`; − the deleted v39 guide test) |
| e2e, this page | pk393 L10–L14 green | **SP41 L1–L9: 18/18 green** (1512 and 1280); pk393 L10–L14 7/7; pk26 R, N ×2, H; pk38 L1, L3, L4, L7, L10, L11; pk39 L5 — all green |

## 6 · Locks

New, `tests/e2e/pk41.measure.ts` (fixture `seedPk40.mjs` + `pk41Fixture.mjs`, restored in afterAll), at 1512 × 982 and
1280 × 832, each with a reading floor:

- **L1 Page** — the ground computes the gradient under the pattern; the pattern's opacity equals the Contact list's
  tile's (read from both SVGs); no header card, labels, panel, explainer, kicker, band or tilted showcase in the DOM; no
  horizontal overflow (scroller and document).
- **L2 Banner** — the harness is a founding writer (plan read from the store) and sees one strip; ≤ 60 tall; its text
  does not overflow; the folder tab and its foot compute rgb(251, 239, 233); "Tell us what you think" opens FeedbackDock;
  ✕ hides it, the leaf is written, it stays hidden after a reload, the tab is cream again; How it works brings it back.
  **Paid Pro**: a fresh context signed in as `dv1@scriptally.test` (Pro, read only) renders the page and no strip.
- **L3 Header** — ≤ 100 tall, navy, one-line subheader naming "Locks of v40", no image.
- **L4 Batch** — the row is the stored `activePackageId`; its name, version, letter and synopsis equal the builder's own
  steps for that package (two derivations against each other; the synopsis chip hidden at 1280); Change lists exactly
  the Ready and Out packages, a pick writes `activePackageId` (read back from the store) and shows the writer's toast;
  no active → "Choose one →"; no packages → no row.
- **L5 List** — one card, a navy bar counting the live packages (from the store), All lists exactly them, each tab's
  count is its rows (Out against the store), Show retired (n); the open row's inset navy edge, #f3f5f8, no button,
  "Open below"; with no packages the tabs are disabled at 40%, Show retired is hidden, the empty line.
- **L6 Frames** — builder, totals, three best cards, two tables: a 7 ±1 white rim, a 1px rgb(227, 213, 201) frame, the
  bands (navy, navy, sand, sage, stone, stone, stone).
- **L7 Footer** — with a sent package open, every button under the preview sits inside the well; both 42 tall.
- **L8 Hawk** — fixed, decorative, bottom = the viewport's ±1 before and after scrolling 600, 212 ±2 tall, clear of the
  content edge and intersecting no element in the column (before and after the scroll); absent at 390.
- **L9 How it works** — the five titles in order, none of the old guide's strings, "Got it" last, Escape closes it.

**Red before** (`redproofs.txt`): every case red on the v39.3 build (the v41 header is absent, so each times out at
open). **Red under its own break** (`redproofs.txt`, `redproofs2.txt`, ledgers `ledger/mut-*`): L1 (no pattern: the
ground's two readings), L2 (the folder tab back to cream), L3 (121 / 113 tall), L4 (a different name in the row), L5
(no inset edge; tabs at full opacity), L6 (no rim; the sand band white), L7 (the primary out of the well at 1512), L8
(260 tall, over the content), L9 (an old title back). The first L9 break (swallowing Escape on `document`) changed
nothing — the escape stack listens earlier — and was replaced; recorded.

Retired and re-pointed older locks: `tests/e2e/RETIRED-submission-packages-v41.md` (22 retired, 10 re-pointed).

## 7 · Screenshots

`app/` holds the 15 states at 1512 × 982 and 1280 × 832 (the ref's own widths); `side-by-side/` puts each beside the
ref's screen. The fixture is the v40 harness's, not the ref's sample data (names, counts).

## 8 · Deploy

See §8 below, written at deploy time.
