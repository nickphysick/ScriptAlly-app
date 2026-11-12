# Query letters v2: the letter desk (`/materials/letters`, desktop)

12 Nov 2026 · branch `query-letters-v2` (pushed) · dev line `dev/…-pa41-clp1-ql2` (pushed) · ref `design-refs/query-letters-v2/query-letters-v2.html` (sha256 `bd0b5da4…202764`, matches)

## False premises and disagreements (first, as asked)

1. **The brief vs CLAUDE.md, on branches.** CLAUDE.md says "Direct-to-main only… if you find yourself creating a branch, stop". The brief asks for branch `query-letters-v2`. I stopped and asked; Nick chose the branch.
2. **`?letter=<id>` deep link.** Today's page had none, so there was nothing to keep working. None was added.
3. **The test slot is not on the dev line.** The machine's hook refuses every emulator run in a checkout without `scripts/heavy-slot.mjs` ("merge main first"). Merging main conflicts on CLAUDE.md: the dev line added 501 lines over 124 commits since it split, and the repo rule (take main's) would have dropped them. I asked; Nick chose to **cherry-pick the slot only**: `cf09e363c` (Test slot v1, Phase 1) and `543cac57d` (its Java fix). `tests/e2e/rs2Mutate.sh` stays deleted, as the dev line had it. CLAUDE.md is untouched. That merge is still owed separately.
4. **Loading cannot be held on the emulator.** Holding Firestore also holds the boot splash (sign-in waits on the user document), so the skeleton's real window is a few milliseconds. Loading is measured through a render harness instead (QL2-F3, below).
5. **"Upload a file" in the header.** In the ref it saves a file-only letter at once. The brief says keep today's behaviour, which reads a text file into the form and keeps any other file by name, so it opens the editor with the file in it. The writer then saves.

## Baseline vs final

| Gate | Baseline (6eaa7ff61) | Final (5de6b2525) |
|---|---|---|
| `tsc --noEmit` | 2 errors (functions/ had no node_modules in the new worktree) | 0 errors (primary's `functions/node_modules` symlinked) |
| `vite build` | clean | clean (no error or `[WARNING]` lines) |
| Vitest | 4 failed / 11 964 passed; 7 files failed (4 of them could not load `functions/` deps) | 4 failed / 12 021 passed, then 1 fixed in 5de6b2525. Now **3 failed**, all three in the baseline: `emuGuard` "no recipe under tests/…", and two in `firestoreTarget`. |

## Phases and commits

One commit per phase was not possible for B–F: the five phases share the page and its one stylesheet, and a hunk-by-hunk split would have meant faking intermediate pages. So B–F landed as **d06bcc3cd**, with each phase described in its message.

| Commit | What |
|---|---|
| fc5b14692 | **A**: the ref + `SHA256SUMS`, and `tests/e2e/queryLettersV2.measure.ts` (the locks), written before the build |
| cf09e363c, 543cac57d | the test slot, cherry-picked from main (see 3 above) |
| d06bcc3cd | **B–F**: the letter desk; v1's components deleted |
| fd13d6fd6 | F follow-ups: the ground fills a short page; the loading render harness; the locks wait for the editor's focus |
| 5de6b2525 | the slot's runner line on the dev line's 13 extra `.sh` runners (heavySlot.test.ts went red with the cherry-pick) |

### What landed

- **B, the header.** `shell/OpenHeader` (not edited), with the Courier, `lettersTitle(n)` or "No query letters yet", "for {title}", and "+ New letter" (navy) and "Upload a file" (white), hidden on day one. The third column holds the in-use block: "{name} in use" with Change over a 2px navy rule, and "Going out with new queries. {more} of {sent} asked for more so far." or "Not sent yet." v1's package line stays. No ring, no chart. The page-scoped grid is `280px minmax(0,1fr) 380px`, gap 36px. The ground is the Query Centre's (cool off-white, doodle tile under an even .45 wash), and the pink wash is gone. No Query Centre stylesheet was edited.
- **C, the desk.** Three columns; the left and right are sticky, and the left scrolls inside itself (`max-height` from the page's measured scroll port, never a viewport offset).
  - **Your letters:** rows in `pageOrder`, each a full-width button.
  - **The middle:** the letter on a 760px sheet at 16/1.65.
  - **How it's doing:** v1's drawer tab brought onto the page, with the real `StatusDot` and query rows that open the query panel. "+ Log a comp from your library" opens `CompLetterPicker` exactly as the drawer did.
- **D, writing.** One editor for New letter, New version, Edit and Paste the text. The ref's status line, a "Not saved yet" row pinned at the top, and a "While you write" right column. The guard bar appears on another row, Cancel, Esc, New letter and Upload. A route change keeps the edit (pages stay mounted) and raises the guard for the writer's return. Closing the tab asks through `beforeunload`. ⌘S / Ctrl+S saves. Each save gives a toast with Undo: the edit's own snapshot, or `deleteVersion` for a letter just created. Then the next-step card and the first-letter note. Writes go through `addVersion` and `updateVersion` only, plus `updateManuscriptQuiet({ inUseLetterId })`. `save` refuses a sent letter's text before `updateVersion` would. An empty letter does not save ("Paste your letter in first. There's nothing to save yet.").
- **E, the comparison.** `lib/letterDiff.ts` ports the ref's `diff` / `wdiff` / `alike` as segments, so no HTML is set. The switch tints added text blush and strikes removed text through in grey, with the key beside it.
- **F, edge states.** Day one is the ref's numbered lines and paste sheet. Loading is skeleton blocks at the columns' final sizes. Reduced motion stops the flash, stamp and slide. The Free lock behaves as before.
- **Pure helpers added to `lib/queryLetters`:** `bracketGaps` and `earlyNote`. Nothing that was already there changed.

## Locks: red before, green after

Red = `fc5b14692` + the slot (today's page with the new spec), in a disposable measurement worktree. Green = the branch tip. Both runs were on the emulators through `npm run e2e:emu`, one worker.

| Lock | Today's page | New page |
|---|---|---|
| QL2-1 header is OpenHeader; title over the letter column, in-use block over the rail (±1px) | ✘ no `header.qc1531-hd` | ✓ 1440: 428/428, 1020/1020 · 1920: 514/514, 1414/1414 |
| QL2-2 no ring/chart/grid/band (subjects counted first) | ✘ | ✓ |
| QL2-3 a row shows its letter and its `letterFacts` (row = cells = meta) | ✘ | ✓ "1 of 5" = cells 5/1 = "sent with 5 queries" |
| QL2-4 sent letter: no Edit, typing into the sheet + ⌘S changes nothing; the diff switch shows ins/del | ✘ | ✓ |
| QL2-5 edit a draft → ⌘S saves once (one toast) → Undo restores the text | ✘ | ✓ |
| QL2-6 New version: draft with the parent recorded, changes saved, the parent's text and figures unchanged | ✘ | ✓ |
| QL2-7 guard holds the selection; Keep, Esc, Discard (loses only the edit), Save-then-move | ✘ | ✓ |
| QL2-8 next-step card only for a new letter not in use; Use writes with Undo | ✘ | ✓ |
| QL2-9 `[agent]` typed appears; removed disappears; "Nothing left in square brackets." | ✘ | ✓ |
| QL2-10 `letterDiff` unit suite (6 cases: identical, moved, reworded, added, removed, the ref's spacing) | module absent | ✓ 6/6 |
| QL2-11 below 768px still redirects to `/manuscripts#materials` | ✘, a harness fault, not the page: `openRoute` waited for the desktop shell, which a phone never shows. Fixed in the spec; this lock guards untouched code, so its green run is the meaningful one | ✓ |
| QL2-12 contrast ≥ 4.5:1 over 90 text nodes; nothing under 12px; 21 controls ≥ 32px | ✘ | ✓ none failing |
| QL2-F day one | ✘ | ✓ |
| QL2-F2 the Free lock, as v1 (kept behaviour, not a new lock) | ✓ | ✓ |
| QL2-F3 loading skeleton at 280 / 1fr / 380, no spinner (render harness) | n/a | ✓ |

**Render harness.** `src/components/letters/qlRender.harness.test.tsx` is skipped in the normal suite. QL2-F3 runs it with `QL2_RENDER_OUT` set. It renders the page with `collectionsReady: false` into an HTML file linking every stylesheet the build emitted (`dist-emu/assets/*.css`). The loading screenshot therefore has no app shell, and its art and doodle (absolute `/images` paths) do not load from `file://`. It measures the column sizes, not the paint.

Unit smoke (`queryLettersPageSmoke.test.tsx`, rewritten) covers:

- the populated desk, the sent and draft states, the package line and the early-days note;
- v1's surfaces absent;
- day one and loading;
- a copy sweep: no agent pronouns, no verdict words.

`openHeaderShared.test.tsx` passes untouched.

## Deleted, and the proof

`LetterCard.tsx`, `LandingBand.tsx` and `LetterDrawer.tsx` were imported only by `QueryLettersPage.tsx` and by each other. I grepped `src`, `tests` and `scripts` for `LetterCard`, `LandingBand`, `LetterDrawer`, `NewLetterTile` and letters' `DrawerMode`; the only other hits are the unrelated `queryActions/drawerStore` `DrawerMode`. `fmtDay` and `isFileOnly` moved, unchanged, to `letterBits.tsx`. `tests/e2e/queryLettersV1.measure.ts` probed the deleted surfaces and is retired; its Free-lock check lives on as QL2-F2.

## Screenshots (rendered emulator build)

In `reports/query-letters-v2/shots/`:

| File | Shows |
|---|---|
| `01-everyday-1440.png`, `01-everyday-1920.png` | the in-use letter selected |
| `02-sent-1440.png` | a sent letter |
| `03-sent-diff-1440.png` | a sent letter with "Show what changed" on |
| `04-editor-1440.png` | the editor mid-edit |
| `05-guard-1440.png` | the guard bar |
| `06-next-step-1440.png` | the next-step card |
| `07-day-one-1440.png`, `07-day-one-1920.png` | day one |
| `08-loading-1440.png`, `08-loading-1920.png` | loading (render harness) |

The flows were shot at 1440 only. The 1920 layout is measured in QL2-1 and QL2-F3.

## Built differently from the ref, and why

- **The rail drops under the letter below a 1320px viewport** (the ref's own breakpoint). The app's sidebar makes the content narrower than the ref's page, but at 1440 the middle column still measures 556px, so three columns hold.
- **"their bars" when two or more letters are early.** The ref says "have … so its bar" in the plural.
- **Ref details that don't fit the data:**
  - The ref copies the parent's comps onto a new version. The app's `addVersion` never did, so the new version starts with none.
  - "Paste the text" on a **sent** file-only letter opens a new version, because its text cannot be written.
- **Day one's "Upload" link** reads a text file into the box or keeps the file by name, as v1 did. The ref saves it at once.
- **The flag colour.** The ref's in-use flag is berry (`#8f4a5a`), kept as drawn. It is not rust or red, and the bars and marks are navy.

## Dev deploy

- Before: dev served `index-Bq5D30Du.js` from `dev/…-pa4-qc155-pa41-clp1` @ 6eaa7ff61, which is this branch's base.
- Merged into: a new line, `dev/…-pa41-clp1-ql2` @ 5de6b2525 (a fast-forward of that line; pushed).
- After: dev serves **`index-BTbKdg-q.js`**. It was built from a clean checkout of the pushed tip, and the deploy was guarded by a served-hash check. Hosting only. Prod not touched.

## Worktrees

`ScriptAlly-ql2-base` (measurement) and the scratchpad deploy checkout are removed. `ScriptAlly-ql2` is removed after this report is committed and pushed.
