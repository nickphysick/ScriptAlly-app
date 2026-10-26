SUBMISSION PACKAGES v40: lifecycle and locking, the shelf and the workbench, Tracking & performance on every tab, and no mono labels

This follows Submission packages v26/v26.1 (branch `submission-packages-v26`, built and on dev). It changes how packages are made and changed: a package that has gone out with a query is locked, and changes are made by making a new package from it. UK spelling throughout, in code, comments, copy and the report.

══ GLOBAL RULES ══════════════════════════════════════════════════════════════════════════════
- Follow CLAUDE.md's working discipline in full. Stage by explicit path and commit with `git commit --only -- <paths>`; never `git add -A`, never `--amend`. Other sessions share the checkout: use a worktree of your own (as v26 did). A dirty tree is not a reason to stop.
- Record the baseline BEFORE any edit: `npx tsc --noEmit`, the production build, `npx vitest run` (read the counts, not the exit code). Gate: no worse than baseline. Read whole outputs with `set -o pipefail`, never `tail`. `git diff --name-only HEAD` empty before trusting any gate.
- Dev deploys are fine (hosting, and dev Firestore rules per CLAUDE.md). Prod is Nick's. Never print the e2e password or ANTHROPIC_API_KEY.
- STOP-and-report is the only red gate.
- The ref is the oracle. Port markup, values and copy wholesale; never paraphrase copy or re-derive values from screenshots or this prompt.
- ⚠️ The ref's stylesheet is LAYERED (v26 → v40 of one mock, later blocks override earlier ones, many with !important, and option switches left in place). Its COMPUTED styles in the frozen state below are the authority. Use the v26 pipeline (`scripts/pk26/extract.cjs` → `gen.py` → `verify.cjs`) to regenerate the generated CSS for the changed parts, and keep hand-written rules in the page's own CSS file. Say which states you extracted.
- ⚠️ The ref's frozen state: `body[data-sb="t"][data-wh="c"][data-tl="t1"]`, workbench grouping `TG='t4'`, layout `LAY='tabs'`. Every other option in the mock (shelf list/strip, workbench header a/b, grouping t1–t3, layout "new", the carousel) is dead and must not ship or be extracted. The STATE pill (In use / Brand new) is a review switch only; the shell (sidebar, bar, folder tab) is context only.

══ INPUTS ════════════════════════════════════════════════════════════════════════════════════
Pack: `design-refs/submission-packages-v40/` (if missing, unzip `submission-packages-v40-pack.zip` from the repo root, then commit the pack on its own).
  submission-packages-v40.html   the mock
  screens/NN-name-{1512,1280}@2x.png, taken at 1512×982 and 1280×832:
     01 in use, top (header, tabs, shelf)        02 the shelf
     03 the workbench (a Ready package open)     04 Package guidelines, open
     05 the shelf drawer (a locked package)      06 the New package dialog
     07 Tracking & performance: Head to head     08 … Scoreboard          09 … Tests
     10 Query letters tab                        11 Query letters: Tracking & performance
     12 Synopses: Tracking & performance (with the "No synopsis" card)
     13 How it works                             14 Brand new, top
     15 Brand new: workbench (a Draft, empty slots)   16 Brand new: Tracking & performance warming up
     17 Brand new: Query letters warming up
  SHA256SUMS
STALENESS GATE: `sha256sum -c SHA256SUMS` passes, and submission-packages-v40.html hashes to
  1d539f8ccc2ff2779917b35168122180245b772f3baaf25ebd4b663a2b335547
Otherwise STOP. Do not fall back to the v26 ref.
Where to look in the mock (all inside the main script): `STG` and `lockBand` (lifecycle, lock band, the start card), `tabsDecor` (TG t4: shelf and workbench selector), `shelfDrawer`, `dup` ("New package from this"), `ask` (the locked dialog), `wbHead` and `wbAlign` (the workbench frame), the guidelines block, `tpRender` (Packages tracking), `tmRender` (letters and synopses tracking), and the last <style> blocks ("v38", "v39", "v40").
The mock's names, figures and dates are illustrative. Real figures come from the app's data (§H).

══ STEP 0 · RECON (no edits) ═════════════════════════════════════════════════════════════════
0.1 Branch `submission-packages-v40` from `origin/submission-packages-v26` and merge `origin/main` into it. Report the conflicts and how you resolved them. Do not merge `versions-v2`. (v26 already carries `src/lib/versionsV2.ts` with `MIN_SENT_FOR_RATE = 5`; confirm.)
0.2 Pack present, gate passes (RED GATE).
0.3 Read: `src/components/packages/v26/**`, `usePk26Model.ts`, `src/lib/packageReplies.ts`, `packageMetrics.ts`, `packageEditions*`, `packagesOverview.ts` (`isRetired`), `packagesV26.ts`, `versionsV2.ts` (`MIN_SENT_FOR_RATE`, `isReply`, its funnel), the SubmissionPackage / PackageEdition / Query types, `activePackageId` and `resolveActivePackage`, and the `packages` block of firestore.rules and rulesProbe.mjs.
0.4 Answer, with file:line:
   a. Where the UI starts a new edition today, and every caller of the editions engine.
   b. On dev: how many packages have more than one edition; how many have `firstSentAt`; how many are Retired.
   c. Whether a query records its letter, synopsis, pages and extras at send time, so a material can be credited from the query alone (with or without a package).
   d. Whether anything records which package a package was copied from (it should not exist yet).
   e. The definitions behind Sent, Replied, Asked for more and Full request in versionsV2 and in packageReplies, and where they differ.
0.5 Record the baseline (gates above).
0.6 List the v26 locks this changes or retires (at least PK26-E, PK26-X, PK26-S, and the Results parts of the smoke census) and what replaces each.
0.7 Write the Phase 6 locks first and prove each one RED on today's branch before building.

══ BAKED DECISIONS (settled with Nick; do not relitigate) ═════════════════════════════════════

A · Lifecycle and locking
A1 One pure helper decides a package's stage: Retired (`isRetired`) · Out with agents (it has gone out with at least one query that isn't withdrawn, i.e. `firstSentAt` is set) · Ready (it has a letter and pages) · Draft (anything else). The synopsis is optional and never blocks Ready. Unit-test the table.
A2 Out with agents means LOCKED. Its letter, synopsis, pages and extras never change again. The UI never offers a change. firestore.rules deny any change to the slots and `extraIds` once `firstSentAt` is set. Deploy the dev rules and prove the denial with rulesProbe.
A3 The editions model stops here. Nothing starts a new edition any more. Packages that already have several editions stay readable; their queries keep exactly what went; their figures count every edition together. Do not delete the editions engine in this pass: list every remaining caller in the report for a later clean-up.
A4 "New package from this" (shelf drawer, start card "Copy {name}", the locked dialog): a new package with the same letter, synopsis, pages, extras, icon and note; name "{name} 2" (the next free number); nothing sent; a new optional field `copiedFromId` holding the original's id (rules: set on create only, never changed). It becomes the open package in the workbench, the page scrolls to it, the drawer closes, and the toast reads "Made **{new}** from {old}. {old} stays as it was." The original is not written to.
A5 Make active: offered on Ready packages (workbench) and on locked packages that aren't active (shelf drawer). Exactly one active package, as `activePackageId` today.
A6 Retire: offered in the shelf drawer for locked packages that aren't active ("Make another package active before retiring this one." otherwise). Reuse the existing Retired status. A retired package stays on the shelf, greyed, with its results kept.
A7 Delete: only packages that have never gone out ("Delete draft" on a Draft, "Delete" on a Ready package), as v26.
A8 Name, note and icon: data unchanged (outside the lock). The shelf drawer is read-only in this pass.

B · Page order (Packages tab)
B1 Header (as v26, with "Pro" now a soft pill beside the title and no eyebrow above it) → tab bar (as v26) → the shelf, "On query" → the workbench, "Put a package together" → Tracking & performance. No extra tab or switch between the shelf and the workbench.
B2 The shelf, the workbench and the Tracking & performance body all take the Contact list width, `min(1600px, calc(100% - 96px))`, centred, with the header centred over them.

C · The shelf (screens 01, 02, 14)
C1 Heading row: lock icon, "On query" (typewriter), a count, then the italic line "Locked, exactly as agents got them. Open one to see who got it." With none out, the count is 0 and the line reads as the ref's brand-new copy.
C2 Tiles: grid `repeat(auto-fill, minmax(290px, 1fr))`, gap 16. The active package first, retired last. Each tile: a Harbour header band (icon tile, name, note in italic, an "Active" or "Retired" pill), then three lines with small glyphs (letter, synopsis or "No synopsis" in faint italic, the pages' version disc and name), then a footer: "{n} sent", "{x}% asked for more" (or "{q} of {n}" under the threshold) and a thin Harbour bar. The active tile has the terracotta ring. A retired tile's band is grey. Values from the ref's `.sh-tile`, `.st-*` rules.
C3 A tile opens the shelf drawer.

D · The shelf drawer (screen 05): read-only
D1 Harbour header: icon, name, "🔒 On query · locked since {date}" (· Active). Body: "What went" (Query letter, Synopsis, Pages from, Also sends), "How it's doing" (three stat cards: sent, asked for more, days to reply), "Who got it" (the agents, their agency and date, their current status). Footer: "New package from this", "Make active" (when not active), "Retire" (when not active).
D2 The drawer frame follows v26's material drawer (white rim, fine inner border, fills stop at the border).

E · The workbench (screens 03, 04, 15)
E1 One framed card. Header: the illustration placeholder on the LEFT (dashed, Harbour-tinted, 96×96, 80×80 at ≤1200 sheet width, "Art / Hawk packing an envelope"), then "Put a package together" and the line "Drag a letter, synopsis and pages into a package. Change it as much as you like: it only locks when its first query goes out.", and "+ New package" (Harbour) on the right. A hairline under the header.
E2 Body: grid `380px | 1fr` (300px at ≤1200). Left: "Your materials" (typewriter subheading) with "Drag one across →" in italic, then the v26 materials panel. Right: "Your package" (typewriter subheading) with the package selector right-aligned on the same row: buttons for Draft and Ready packages ONLY (locked packages live on the shelf). The open package card: Harbour header bar (icon, name, pencil, note; the stage pill; "Make active" or "Active"), the lifecycle track (Draft → Ready → Out with agents, with the step's sub-line from `lockBand`), the three slot tiles, the Also sends row (v26's extras), and the foot line.
E3 Empty slots are quiet (screen 15): a faint dashed outline, a small grey icon tile and two short lines: Query letter "Drop a letter here" / "or press Add next to one on the left"; Synopsis "No synopsis" / "That's fine for agents who don't ask for one"; Pages "Drop your pages here" / the same second line. Slot labels are sentence case ("Query letter", with "Needed"/"Optional" in italic). While dragging, the slot that accepts the piece turns pale blue; the others dim (v26's rule).
E4 With no Draft or Ready packages, the package card is replaced by the ref's start card: "Start a package", one line, "From scratch" and up to three "Copy {name}" buttons (A4).
E5 Package guidelines: a collapsed footer inside the frame, "ⓘ Package guidelines", opening to the ref's six points verbatim (screen 04).
E6 The New package dialog is v26's, restyled only (screen 06): no eyebrow over the title, field labels in the typewriter in sentence case, hints in italic.

F · Tracking & performance, Packages tab (screens 07–09, 16); replaces v26's Results
F1 A navy band: "Which package gets agents asking for more?" / "Every query sent with a package counts here, and so does every piece inside it." / ↓. No eyebrow. The body overlaps the band; a pill switch: Head to head · Scoreboard · Tests.
F2 Head to head: "What's different" strip (letter / synopsis / pages, the changed one highlighted with "{A} → {B}", the others "Same: {name}"); two cards side by side with a select each (icon, the big % or "{q} of {n}" with "Too early for a %", the four-step funnel bars, "Replies take {d} days on average"); "vs" between; the verdict line from `tverdict` verbatim (too early / too close to call under 10 points / "{name} is ahead", adding "so that's the likely reason" when exactly one piece differs). Defaults: A = the active package; B = the newest package copied from it, else the next most sent.
F3 Scoreboard: three summary tiles (queries sent with a package; % asked for more across them; "{n} of {m} packages with enough to compare"), then four ranked columns (Packages, Query letters, Synopses, Pages from) and the foot line. Items under the threshold show, unranked, as "early".
F4 Tests: the intro line, one card per package with `copiedFromId` whose original still exists: state pill (Running / Too close to call / "{name} ahead"), "Testing the {piece}" or "Testing {n} changes", the change list, the two sides, and the footer line; then the "Start a test" card (new package from the active package).
F5 Nothing sent yet: the ref's warming-up panel (illustration placeholder and the two lines, no eyebrow).

G · Tracking & performance on the Query letters and Synopses tabs (screens 11, 12, 17)
G1 Under each tab's table, the same navy band: "Which letter gets agents asking for more?" / "Every query that went out with a letter counts here, whichever package it was in." and for synopses "Which synopsis gets agents asking for more?" / "Every query that went out with a synopsis counts here, and so do the ones that went without."
G2 One white card: the verdict line first (`tmRender`'s three cases verbatim: too early, too close to call, "{name} is ahead."), then one card per letter or synopsis: icon, name, "In {packages}" or "Not in a package yet", the big % or "{q} of {n}" with "Too early for a %: {k} more to go", the funnel, the reply days. The leader (at least 10 points clear, both at the threshold) gets the Harbour outline and an "Ahead" pill.
G3 Synopses add a "No synopsis" card (dashed, cross icon) for queries that went out with the synopsis slot empty, so a writer can see whether sending one helps.
G4 Foot line verbatim, with "See your tests" switching to the Packages tab, Tests view, and scrolling to it.
G5 Nothing sent: the warming-up panel with the ref's copy for letters and synopses.

H · The figures (one model; do not invent a second)
H1 Threshold: `MIN_SENT_FOR_RATE` from versionsV2 (5 sent), the same rule Versions uses. Under it: no percentage, "{q} of {n}", not ranked. The copy's "5" comes from the constant.
H2 Sent excludes withdrawn queries. "Asked for more", "Replied" and "Full request" use the Versions definitions (versionsV2's `isReply` and its funnel). Rate = asked for more ÷ sent.
H3 A letter, synopsis or version is credited from what each query recorded at send time, whichever package it was in, or none (0.4c). If queries don't record their pieces, STOP this item, credit through the package only, and report.
H4 packageReplies' answer-based rule (`MIN_SENDS_FOR_CLAIM`) stays where anything else uses it. List every remaining caller in the report so Nick can decide whether to unify.

I · Typography: no small mono capitals
I1 Nowhere on this page (header, tabs, shelf, workbench, dialogs, drawers, How it works, tracking) is there small uppercase mono text: no eyebrows above headings, no mono labels. Removed: "SUBMISSION PACKAGES" over the header (Pro moves beside the title), "THE WORKBENCH", "— TRACKING & PERFORMANCE —", "WARMING UP", "NEW PACKAGE" over the dialog title. Re-set in sentence case: "Your materials" and "Your package" as typewriter subheadings without number discs; "Also goes in", "Also sends", slot labels, table column headings, "What's different", the drawer labels, the dialog's field labels and the How it works labels in the typewriter or the serif italic as the ref has them; the Active, Ready, Draft and In use pills in the typewriter in sentence case.
I2 Only the dashed illustration placeholders keep their "Art"/"Illustration" text, and the artwork will replace them.

══ PHASES (one commit each; important ones first) ═════════════════════════════════════════════
Phase 1 · Model: the stage helper, the lock (UI and rules), `copiedFromId`, "New package from this", Make active / Retire / Delete rules, the editions engine switched off for new changes. Dev rules deployed; rulesProbe green on the new cases. Unit tests red-before.
Phase 2 · Shelf, shelf drawer and workbench (C, D, E): the frame and header with the art placeholder, the materials column, the selector for Draft and Ready only, the slots and their empty states, the start card, the guidelines. Retire v26's mixed package-button row and its in-place edit of sent packages.
Phase 3 · Tracking & performance on the Packages tab (F, H). Retire v26's Results well, switch and detail card.
Phase 4 · Tracking & performance on the Query letters and Synopses tabs (G).
Phase 5 · Typography sweep (I), the New package dialog and How it works restyle.
Phase 6 · Locks and verification (below), screenshots, dev deploy.

══ LOCKS (Phase 6; each proved RED before its green is believed; prove every population non-zero first) ═
L1 Locked: for a package with a sent query, no slot accepts a drop, Add is absent, extras can't be ticked, and a direct Firestore write to its slots is denied (rulesProbe).
L2 New package from this: the copy has the same pieces and `copiedFromId`; the original's document is byte-for-byte unchanged.
L3 Stage table: draft / ready / out / retired, including "synopsis missing is still Ready".
L4 The shelf lists exactly the Out and Retired packages; the workbench selector lists exactly Draft and Ready.
L5 Tests lists exactly the packages with a live `copiedFromId`; the verdict and state strings follow the threshold and the 10-point rule.
L6 Figures: every %, count and funnel on the page equals the helpers' output for the seeded fixture; an item with 4 sent shows "{q} of 4" and is unranked; withdrawn queries are not counted.
L7 Synopses: the "No synopsis" card counts exactly the queries sent with an empty synopsis slot.
L8 Mono census: on /queries/packages in both states, every tab, both dialogs, the shelf drawer and How it works, no visible element has the mono font AND `text-transform: uppercase`, except the illustration placeholders. Break: restore one eyebrow and see it fail.
L9 Widths at 1512×982 and 1280×832: the shelf, the workbench frame and the tracking body are `min(1600, sheet − 96)` and centred (±1); the workbench header's art sits left of the title.
L10 Smoke: the page renders populated and brand new, every tab, no console errors.
Screenshots of 01–17 at both widths into `reports/submission-packages-v40/` beside the refs, with a side-by-side for 01, 03, 05, 07, 11 and 15. List and resolve every difference, or say why it is expected. Deploy to dev and record the bundle hash.

══ DO NOT TOUCH ══════════════════════════════════════════════════════════════════════════════
The Manuscripts page files (parallel session). The Versions page (import its helpers only). The Comparable titles page. The Query Centre beyond reading a query's recorded package and pieces. Marketing, onboarding, import, the To-do list. The material drawer beyond the label restyle. Attachments (still parked: no Storage on dev). Prod, in any form.

══ REPORT (reports/submission-packages-v40/REPORT.md, and paste back) ═══════════════════════════
False premises first (Step 0's answers, especially 0.4a–e). Conflicts from the merge. Baseline vs final gates with the full count lines. Commits per phase. Each lock with its break and red readings. Dev rules release time. The editions callers left (A3) and packageReplies callers left (H4). Screenshot comparison. Dev bundle hash. Prod untouched.
