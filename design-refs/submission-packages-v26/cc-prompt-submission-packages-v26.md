QueryHawk — Submission packages v26: the packages-led page, packing-list builder, letters and synopses tabs, named extras, attachments, and Results

GLOBAL RULES
- UK spelling throughout, in code, comments, copy and the report.
- Follow CLAUDE.md's working discipline in full. In particular: confirm the tree is level with `main` before any recon; stage by explicit path and commit with `git commit --only -- <paths>`; never `git add -A`, never `--amend`; read gate output in full with `set -o pipefail`; `git status` clean after every commit.
- Dev deploys are fine (hosting, and dev Firestore/Storage rules per CLAUDE.md's Deployment section). Prod is Nick's.
- The app is pre-launch with no users. Do not halt on a dirty tree or other sessions' staged work: note it and carry on.
- Gates are "no worse than baseline", not "green". Record the baseline before any edit.
- STOP-and-report is the only red gate. If a STOP condition is hit, write the report and end the session.
- Port the design ref wholesale. Read values from the ref's CSS and script, never re-derive them from the screenshots or this prompt.
- ⚠️ The ref's stylesheet is LAYERED: it is v10 to v26 of one mock, and later blocks override earlier ones (some with !important). The ref's COMPUTED styles are the authority, not any single rule. Port the final computed values into clean, page-local CSS; do not copy the cascade.
- ⚠️ The ref's shell (sidebar, bar, folder tab) and its two floating review switches (State: In use / Brand new) are context only and do not ship, except the sidebar regrouping in Phase 1.

NORMATIVE DESIGN REF
- design-refs/submission-packages-v26/submission-packages-v26.html
- SHA256: e47254b206db74ab19eafdffb0866c0bf23ddbbf2a6833867693947f6fd16cdb
- design-refs/submission-packages-v26/SHA256SUMS lists the ref and 26 screenshots (screens/, @2x, at 1512 x 982 and 1280 x 832). SHA256 of SHA256SUMS: d84dd2968635b0bf05555696209894c02c66fd05bd8a3273f61daff1c8c06174
- It SUPERSEDES design-refs/packages-v4/packages-v4.html and design-refs/materials/packages-v3.html for this page. Do not use them except to find what is being retired.
- The mock's figures, names and dates are illustrative. Real figures come from the app's data (see Results).

STEP 0 — RECON (no edits)
1. Confirm the tree is level with main (`git rev-list --count HEAD..main` = 0) and read `git log --oneline -12`. STOP if the base is stale.
2. Verify the ref and every hash in SHA256SUMS. STOP if anything is absent or differs. Do not substitute an older packages ref.
3. Read: src/components/SubmissionPackages.tsx, src/components/packages/** (v4/ and the older parts), src/lib/packageReplies.ts, src/lib/packageMetrics.ts, src/lib/packageEditions*, src/lib/packagesPage.ts, src/lib/bookVersions.ts, the SubmissionPackage, PackageEdition, ManuscriptVersion and BookVersion types in src/types.ts, the `packages` and `versions` blocks of firestore.rules, storage.rules, the sidebar/nav model (find it: `grep -rn "Submission packages" src/components/shell src/lib`), FolderTab's sibling plan, the route table in App.tsx, and the Versions page as built (its header, its drawer and its PRO tag).
4. Record baseline: `npx tsc --noEmit`, `npx vite build 2>&1 | grep -inE "error|\[WARNING\]"`, `npx vitest run` (read the counts, not the exit code).
5. Name at the top of the report any premise below that no longer holds. In particular, check and state:
   a. Whether packages are still frozen on first send with editions (`firstSentAt`, `edition`, `editions`). The v26 UI assumes editions: see BAKED DECISIONS, Data.
   b. Whether a material can hold a real file today (`contentType: 'file'` was reserved, "no Storage"). Say whether Firebase Storage is configured for dev and what storage.rules allows.
   c. Whether `otherMaterials` is still free text.
   d. Where the "asked for more" figure and the too-early threshold live in packageReplies, and what the threshold is.
6. List every test and e2e measure that asserts on the current page (pk4.measure.ts, materialsPageSmoke, workspacePageGrid's packages entries, packageReplies.test.ts and anything else you find). Say which Phase 7 will retire, rewrite or keep.

BAKED DECISIONS (settled with Nick; do not relitigate)

Where the page lives
- In the sidebar, Submission packages moves into the QUERIES group: Query Centre, Submission packages, Analytics. Its row carries a second line, "letters · synopses · packages", and the PRO tag Versions uses. The group currently called MATERIALS is renamed YOUR BOOK and holds Manuscripts, Versions and Comparable titles.
- The folder tab's group reads QUERIES, and its siblings are Query Centre and Analytics.
- Route: `/queries/packages`. `/manuscripts/packages` redirects to it, keeping its query string, so every deep link still works.

Colour (Nick's ruling)
- Packages are Harbour, a petrol navy (#1d4b63), distinct from the ink shell. Letters and synopses are soft pink (fill #f7e3e3, ink #9b4a57). Versions stay neutral. The page header stays the shell's navy (#2a3a52) to read as Pro. Take every other value from the ref.
- One size scale: controls are 32, 40 or 48 tall; radii are 8, 12 or 18. Special Elite is for titles only, Source Serif for reading, the mono for small capital labels.

Widths (measured in the ref at 1512)
- The header card is 92px in from each sheet edge, matching the Contact list's header block. The tab bar is 72px in. Everything below it is 48px in. These three insets hold at every width.

Header (in use)
- The navy card: "SUBMISSION PACKAGES" kicker with the PRO tag, the headline "Bundle it. Send it. Know what went.", one line ("{n} packages for {Manuscript}. Attach one when you log a query, and every agent's record shows exactly what went."), "+ New package" (cream) and "How it works" (ringed). The Archivist with archive boxes sits on the right (the existing asset), standing on the card's bottom edge.
- "How it works" opens a dialog that replays the animation with a short explanation.

Empty state (a writer with no letters or synopses)
- The same navy card, the same width, with the headline over two lines, the lede, three numbered steps and "Build your first package" (scrolls to the builder) and "How it works". The animation sits on the right. Below it, the same tabs, builder and Results as the in-use page, in their empty states.

The animation
- Port the ref's `.an` stage and its keyframes: three material cards drop one by one into the package's three slots, a tick lights in the package bar for each, "Ready" appears, a Standard UK label travels to a query's "What went" and the line of pieces fades in. 10s loop, pauses on hover, and the finished state is static under prefers-reduced-motion. It is built from the app's own parts, not drawn art.

The tab bar
- Plain underlined tabs, no tray: Packages (larger, Harbour underline and count) · Query letters · Synopses (pink underline and count when selected). On the right, "Also goes in", then two shortcut pills: Versions (with the navy number disc and a count) and Comparable titles (book icon and a count), each linking to its page.
- Sticky under the bar while scrolling, as in the ref.

Packages tab: the builder
- Package buttons above the panel (not tabs): icon, name, and "Active" on the active one. The selected one is filled Harbour. "+ New package" ends the row, which scrolls sideways when full.
- The open package: a Harbour header bar (icon tile that opens the details dialog, the name with a pencil, the note, then on the right a Ready or "Needs a letter / version" pill, "{sent} sent · {more} asked for more", and Active or "Make active").
- Below it, a packing list with one row per piece: Query letter (Needed), Synopsis (Optional), Pages from (Needed), Also sends (If asked). A filled row shows the piece's icon, name, summary and first attached file, with Edit (View for pages) and ✕. An empty row is a dashed box saying how to fill it.
- Under the list, one quiet line: "{x} sent as is, {y} with changes. Queries already sent keep exactly what went with them.", or for an unsent package, "Change it as much as you like. Nothing is recorded until you log a query with it."
- Your materials, on the right: Letters, Synopses and Versions tabs, compact rows (icon, name, summary, sent count, attachment count). Rows are draggable onto the matching row of the open package; "Add" appears on hover as the keyboard and touch route. "+ Write or paste a query letter" / "+ Add a synopsis" / "+ Save a new version" end each list.
- Dragging: only the matching row accepts a drop and is highlighted while dragging; the others dim. Keyboard users use Add.

New package and package details (one dialog, Harbour header)
- Name (required), Who it's for (optional), an icon from twelve (box, crown, globe, flag, feather, flask, star, bolt, heart, compass, pen, key), and for a new package "Start from": Empty, or a copy of the active package. Enter submits, Escape closes.
- The same dialog, opened from the pencil or the icon tile, renames and re-icons a package and offers "Delete package". A package that has gone out with queries cannot be deleted; say why in a toast.
- The icon shows wherever the package is named: buttons, header bar, the "In packages" labels, Results.

Also sends: named extras (replaces otherMaterials)
- Chips toggle each extra on the open package. "+ Add" opens a small popover with a name field and suggestions (Marketing plan, Series outline, One-line pitch, Full manuscript, Author photo, Writing CV, Chapter outline, Sensitivity notes), filtered as you type. A new name is saved to the writer's extras for every package and ticked on this one, and the toast offers "Attach the file".
- An extra opens in the material drawer with its name and attached files only.
- A query records which extras went, by name, at the time it went. Adding an extra to a package later never changes a sent query.

Query letters and Synopses tabs
- A full-width header: the small illustration placeholder (pink, dashed: "Hawk sealing a letter" / "Hawk with spectacles"), the title, one line, and the add button on the right (Harbour).
- One white table with dividers, like the Contact list: name (icon, "In use", summary, file count), comps it names on one line ("The Trees, Small Pleasures +1") or length, In packages labels, Sent, and an edit pencil on hover. A row opens the material drawer.

The material drawer (letters, synopses, extras)
- Slide-out drawer with a 7px white rim and a fine inner border. The pink header, cream body and white footer all stop at the inner border.
- First a summary strip: "In {n} packages · sent to {m} agents". Then Name, Summary ("shown in your lists and packages"), the text (letters and synopses only), Attached files (list with remove; a drop zone with "browse"; Word or PDF up to 10 MB), Comps it names (letters only: the existing comps picker, which adds a new title to the Comparable titles library), In packages, Went to (with "See them in the Query Centre"). Cancel and a Harbour Save.
- Saving a change to the text or comps of a letter or synopsis that has been sent asks "A fix, or a new letter?" (as the ref): a fix keeps it in place for the queries it went with; a new one is saved as "{name} (2)". A change only to the name, summary or files is always a fix.
- Saving a new version from Your materials asks "Use it in your packages too?" with the packages that use its parent ticked.

Results (replaces "What went", the query list)
- In a recessed well (deeper cream tray, inset shadow), with the illustration placeholder ("Hawk with a magnifying glass over a bar chart") left of the kicker "RESULTS" and the title "What gets agents asking for more". A segmented switch on the right: Packages · Query letters · Synopses · Versions (selected is navy on white).
- A white list card: a lead sentence naming the best and the lowest ranked, then one row per item (icon, name, a single Harbour bar of the share that asked for more, the percentage, sent count). Bars run to 50% with a faint line at 25%. An item below the threshold has a hatched bar marked "Too early" and is not ranked; an unsent one says "Not sent". A footnote states the overall average and the threshold.
- Clicking a row fills the detail card on the right: Sent, Replied, Asked for more and Full requests as bars, the item's rate against the average, average days to a reply, a "too early" warning when it applies, and "See these {n} queries in the Query Centre" (filtered).
- Brand new: one dashed message, "Nothing to compare yet…".

Data (resolve against Step 0; do not invent a second model)
- ⚠️ Every figure is packageReplies' (`split`, `packageSplit`, `materialSplit`, `overall`, `ranked`, its first-answer rule). "Asked for more" is its existing definition. The threshold is packageReplies' existing too-early rule, and the footnote's words follow it. The mock's "5 sent" is illustrative only.
- ⚠️ Editing a sent package stays the EDITIONS model: a change to its contents starts the next edition, sent queries keep the edition they went with, and the counts on the page are the current edition's ("Counting from {date}, when you last changed it"). "Sent as is / with changes" is the per-edition split. Do not add a second freeze or a second history.
- Named extras: replace `otherMaterials` free text with a stored list of extras on the manuscript (id, name, files), an `extraIds` list on the package (inside the edition, like the other contents), and the extras' names on each query at send time. Migrate an existing `otherMaterials` string into one extra of that name. Update firestore.rules and its tests to match, and deploy the rules to dev.
- Attachments: a material (letter, synopsis or extra) holds `files: {name, size, path, addedAt}[]` in Firebase Storage under the writer's uid. Write storage.rules (writer-only, PDF/Word/ODT/RTF/TXT, 10 MB) and deploy them to dev. ⚠️ If Storage is not available on dev, STOP Phase 5 only, build the drop zone as visible-but-disabled ("coming soon") as today's ATTACH FILE is, carry on with the other phases, and report.
- Package icon: `icon` on SubmissionPackage, one of the twelve keys, default "box". Outside the slot freeze (like name and note).
- Plan gating is unchanged: the page stays open to all as it is today (D7). The PRO tag is visual, as on Versions. Nick has a Free/Pro decision pending; flag it, do not build it.

PHASES (one commit each; important phases first)
PHASE 1 — Route, sidebar, header, tab bar, widths
- `/queries/packages` with the redirect; sidebar regroup and folder tab; the navy header (in use) and "How it works" dialog; the tab bar and shortcut pills; the three insets. Retire the v4 header, summary card and filter pills.
- Commit: "Submission packages v26 — phase 1: route, sidebar, header and tabs".

PHASE 2 — The builder
- Package buttons, Harbour header bar, packing list, Your materials, drag and Add, Make active, the details/new dialog with icons and Start from, Delete. Retire the v4 packages and materials sheets.
- Commit: "… phase 2: the package builder".

PHASE 3 — Query letters and Synopses tabs, and the material drawer
- Both tabs and their tables; the drawer with the inner-border frame, summary strip, fields, comps picker, fix-or-new, and the version prompt. The drawer's attachment section ships disabled until Phase 5.
- Commit: "… phase 3: letters, synopses and the material drawer".

PHASE 4 — Results
- The recessed well, switch, list card, detail card and empty message over packageReplies. Retire "What's getting replies", the blush banner and the What went list.
- Commit: "… phase 4: Results".

PHASE 5 — Attachments
- Storage, rules, upload, list, remove; files shown on rows and in the packing list.
- Commit: "… phase 5: attachments".

PHASE 6 — Named extras, the empty state and the animation
- Extras model, migration, rules, the + Add popover, extras on queries. The empty state and the ported animation.
- Commit: "… phase 6: named extras, empty state and animation".

PHASE 7 — Locks
- Rewrite or retire the locks found in Step 0. Every new lock is proved red first (break its fix, see it fail, restore it) and recorded.
  - Route: /manuscripts/packages?pkg=x lands on /queries/packages?pkg=x with that drawer open.
  - Widths: at 1512 x 982 and 1280 x 832, the header's left and right insets are 92 (±1), the tab bar's 72, the builder's 48.
  - Builder: dragging a letter onto the Synopsis row does nothing; onto the Query letter row fills it; Add does the same by keyboard.
  - Editions: editing a sent package's letter starts a new edition and a sent query still shows the old letter.
  - Extras: adding an extra to a package does not change any sent query's extras.
  - Drawer: the header's fill ends at the inner border (measure the header box against the border box).
  - Results: the figures equal packageReplies' for the same fixture; an item under the threshold is not ranked.
  - Smoke: the page renders populated and empty (pageSmoke census).
- Screenshots at 1512 x 982 and 1280 x 832 matching each ref screen's state, and a side-by-side with the ref for 01, 02, 05, 06 and 09.
- Commit: "… phase 7: locks".

DO NOT TOUCH
- Manuscripts page files (owned by a parallel session).
- The Versions page and the Comparable titles page beyond their nav entries.
- The Query Centre beyond reading a query's recorded package, pieces and extras, and accepting the Results link's filter.
- Marketing (src/marketing/**), onboarding, import, the To-do list.
- No prod deploys.

FINAL REPORT
- False premises first (Step 0's list, answered).
- Baseline vs final for tsc, build and vitest, with the full count lines.
- Each commit's hash and file list.
- Locks added, retired and rewritten, each with its red-before proof.
- The screenshots and side-by-sides.
- The rules changes deployed to dev, and the otherMaterials migration's before and after counts.
- Open for Nick: the Free/Pro split on this page; anything in the ref that the data model could not honour, and what you did instead.
