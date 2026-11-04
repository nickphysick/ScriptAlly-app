# Smart Import from photos v1.1 — fixes from Nick's first desktop test

4 November 2026. Phases A and B are on `main`. Phase C is on the dev line only (see the false premises). All three are live on dev. Nothing is on prod.

## False premises

1. **Issue 6's dashboard isn't on `main`.** The dashboard Nick tested is Dashboard v2 (`dashboard-v2`, not merged). That branch was cut from the long dev chain (620 commits not on `main`), so it can't be merged with `main` cleanly. Building issue 6 against `main`'s dashboard would have changed a page Nick never sees. **Phase C is committed on `dev/qc1511-db2-title-sip-qc1512-cl26-sip11`**, the branch dev serves, and has to travel with Dashboard v2 when that reaches `main`.
2. **The crossed-out apply-to-all already listed only queries coded `crossed-out`** (`openCrossedOthers` filters on the code). Leo Marchetti was swept in because the model coded his ✗ line `crossed-out`. The fix is the prompt; the list's filter now has a lock.
3. **`commitSmartImport` needed no change for issue 4.** For an undated query with two events it already writes an undated Queried step, then Full Requested 15/9 and Full Sent 22/9 (checked through `impliedRungs`/`assignTimes`).
4. **There was no `photos-real` folder.** Nick's three test pages were in `~/Downloads` (`page-1.jpg`, `page-2.jpg`, `page-1 (1).jpg`). I copied them into `functions/eval/fixtures/photos-real/notebook-two-pages/` and `.../notepad/` (gitignored) and wrote a truth file for each from the photos.
5. **Leo's crossing-out did not reproduce.** In all three runs with the old prompt he came back `mark-unclear`, so what Nick saw is intermittent. Nick's pages show no false `crossed-out` in any run, before or after.
6. **"No text nodes" in the dashboard region.** The skeleton hides card contents with `visibility` (so each card keeps its loaded size and nothing moves). The text nodes are still in the page; none is drawn. Lock C1 reads drawn text. The band's three buttons are page chrome, per the brief, and are left out of that count.

## Step 0: what the model returned for Kirsten Vale

The repeated 15/9 on the card came **from the model, not the card**. With the old prompt, all three runs returned:

```
status Full Sent · sentDateRaw "15/9" · timeline Full Requested 15/9, Full Sent 22/9 · reasons two-dates
lineRaw "Kirsten Vale - Vale Agency - FULL!! 15/9 -> sent full 22/9"
```

The arrow line was already joined to Kirsten's entry. Nadia Okafor ("3/9 partial!") and Leo ("sent partial 11/9") had the same fault: an event's date read as the sent date.

After (final prompt, both runs): `status Full Sent · no sent date · timeline Full Requested 15/9, Full Sent 22/9 · reasons no-date`. Leo: no sent date, Partial Sent 11/9, `mark-unclear` with `markRaw "X"`. Nadia was right in one run of two; in the other she kept 3/9 as her sent date.

## Commits

| Phase | Commit | Branch | Files |
|---|---|---|---|
| A | `00b0e32a` | `main` | `ImportFlow.tsx`, `ImportPage.tsx`, `BranchB.tsx`, `CaptureFork.tsx`, `OnbLab.tsx`, `PhotosScreen.tsx`, `photoImport.css`, `photoImport.ts`, `v9/BookMore.tsx`, `v9/onbV9.css`, tests `captureFork.test.tsx`, `photosScreen.test.tsx`, `tests/e2e/onbV9.measure.ts`, `tests/e2e/smartImportPhotos/locksV11.mjs`, this folder's Phase A screenshots |
| B | `57c2029c` | `main` | `functions/src/smartImportPrompt.ts`, `functions/src/assembleImport.ts`, `SmartImportReview.tsx`, `reviewRows.tsx`, `v9/DeckQuestions.tsx`, `lib/smartImportReviewModel.ts`, `functions/eval/photoEval.mts`, tests `functions/src/smartImportPhotosV11.test.ts`, `twoDatesV11.test.tsx`, eval readings `eval-live-v11`, `-v11b`, `-v11c`, `eval-real-before` |
| C | `aa06b332` | dev line | `lib/mentorIntro.ts` (+ test), `v2/Dash2Hawk.tsx`, `v2/dash2Hawk.css`, `v2/dash2.css`, `v58/Dash58.tsx`, `onboarding/DashGhost.tsx`, `import/ImportFlow.tsx`, `OnbLab.tsx`, `OnbLabImport.tsx`, `tests/e2e/hawkRest.measure.ts`, `tests/e2e/smartImportPhotos/locksV11C.mjs`, Phase C screenshots |

The dev line's merges of `main`: `be591e11` (Phase A; one import line in `BookMore.tsx` resolved by hand) and `61abbb22` (Phase B, clean).

## What changed

**A1 · the genre list.** Each field on the "Your book" card runs an entrance animation that holds a transform, which makes every field its own layer; later layers paint over earlier ones, so the age pills and their note covered the list. The genre field now sits one layer up. The list is capped at 360px with its own scroll. It opens upward when it would run off the bottom of the window, and otherwise scrolls the card just far enough to show it.

**A2 · "Use photos".** It now opens the photos screen empty. One large "Add a page" tile stands in for the grid, with the tip under it. The primary reads "Choose photos" and opens the picker from its own click, nothing awaited first. Once a page is added the primary is "Read my photos". Back returns to the fork or the Import page. A photo drop on the Smart import tile still lands on the filled screen. The handle is now `openPhotos` (was `choosePhotos`) and passes the same entitlement gate as a drop.

**A3 · the heading.** "Ok. Let's turn your photos into a smart QueryHawk database." The header is a size container; the title is `clamp(16px, 3.2cqi, 44px)`, fitted to Special Elite's measured ink width (30.4 × the font size). It is one line from a 900px window up (35.1px at 1440, 27.9px at 1204, 18.8px at 901) and wraps, balanced, below. The spreadsheet heading is unchanged.

**B · dates.** The photo addendum now says:
- a date in the same part of the line as a status word ("FULL!! 15/9", "3/9 partial!") is that event's date;
- a date in a part of its own is the sent date, whatever follows it ("2/6 – full req"), crossed out or not;
- a line starting with an arrow, a dash or an indent and naming no new agent continues the entry above;
- the same date is never both the sent date and an event's date.

If a read still gives one date twice, the assembler (both paths) and the review keep it on the event, clear the sent date, and ask the no-date question. The two-dates card has a third answer on both paths, "Neither is when I sent it": both dates stay on their events and the same card asks for the sent date.

**B · ✗.** The addendum says `crossed-out` is a line drawn across the writing, and a ✗ or x after an entry is `mark-unclear` with `markRaw "✗"`.

**C · the hand-off.** The "Setting up your dashboard" card, its timings and its frame are as built. Behind it, every Dashboard v2 card is the same pure skeleton: frame and size kept, band in the grey shimmer, nothing inside. One rule under the page's `data-loading="1"` applies it, so no card can leak by forgetting the skeleton class. The feed column is plain shimmer blocks. The band's three buttons stay.

The clipboard hawk plays once after an import commit (`lib/mentorIntro`):
- at 0.5s he rises over 0.9s, `cubic-bezier(.2, 1.25, .4, 1)`;
- at 2.0s he looks at the writer;
- at 3.2s he goes back to his clipboard (both swaps are 160ms cross-fades).

How it works:
- **The clip.** His drawing runs to its last row and rests a few pixels past the sheet's edge, so a clip released at rest would make his feet pop in. Instead the clip holds at the sheet's bottom edge and then slides to the screen's edge across the overshoot.
- **One clock.** The loading page and the loaded dashboard are two mounts of `Dash2Hawk` on one clock, so the sequence carries on across the hand-over and never replays.
- **Reduced motion.** He is simply there, at rest.
- **Arming.** Import arms the sequence; a failed commit disarms it.
- **Where he's drawn.** On the loading page he's drawn inside the set-up frame. That frame is a fixed layer at z-index 9999, and the first build put him on `<body>`, underneath it.

## Gates (whole count lines)

| | tsc | functions build | vite build | vitest |
|---|---|---|---|---|
| Baseline, `main` f712786f | clean | clean | clean (no errors, no warnings) | `Test Files 668 passed (668)` · `Tests 10213 passed \| 3 skipped (10216)` |
| After A, `00b0e32a` | clean | — | clean | `Test Files 668 passed (668)` · `Tests 10215 passed \| 3 skipped (10218)` |
| After B, `57c2029c` | clean | clean | clean | `Test Files 670 passed (670)` · `Tests 10226 passed \| 3 skipped (10229)` |
| Dev line baseline, `be591e11` | — | — | — | `Test Files 1 failed \| 740 passed (741)` · `Tests 2 failed \| 11228 passed \| 3 skipped (11233)` |
| Dev line final, `61abbb22` | clean | clean | clean (dev mode) | `Test Files 1 failed \| 743 passed (744)` · `Tests 2 failed \| 11246 passed \| 3 skipped (11251)` |

The dev line's two reds are the same before and after: `src/test/firestoreTarget.test.ts` flags another session's Contact list seeders (`tests/e2e/cl251Agents.mjs`, `cl252Data.mjs`, `cl253Data.mjs`…) for creating a Firebase app without `fsTarget`.

## Eval, before and after

48 synthetic reads (24 fixtures × 2 runs), the same as the last report, with the final prompt (`eval-live-v11c`):

| | name | agency | status | date | crossed-out P/R | mark-unclear P/R | illegible-agency P/R | no-date P/R |
|---|---|---|---|---|---|---|---|---|
| last report (`eval-live-1`) | 96.7 | 99.8 | 98.0 | 97.1 | 100 / 100 | 100 / 68.8 | 100 / 41.7 | 95.7 / 100 |
| v1.1 (`eval-live-v11c`) | 96.7 | 99.6 | 97.3 | 97.1 | 100 / 100 | 100 / 71.9 | 100 / 66.7 | 95.7 / 100 |

No field fell by more than 2 points. By row: handwritten sharp, agency 99.0 → 98.0 and status 99.0 → 98.0; handwritten blurred, status 99.0 → 97.0 (the largest move, exactly 2.0); printed and screenshots unchanged or better; date unchanged on every row.

Crossed-out precision before and after: 100%. Mark-unclear recall: 68.8% → 71.9%.

The first wording failed the limit, so it isn't the shipped one: date fell to 92.8 and no-date precision to 51.8. It read "Daniel Pennington – Strand Literary – 2/6 – full req" as the request's date. A second wording reached 96.6 / 88.0. Both runs are kept as `eval-live-v11` and `-v11b`.

Nick's own pages, 2 runs each with the final prompt: the notepad is right on every field in both runs, apart from "???" read as an agency name (and flagged illegible). The notebook (14 entries) gets Kirsten, Leo and both crossed-out lines right in both runs. Still missed: Nadia's sent date (1 run of 2), Imogen's illegible agency, and the ? marks on Meredith and Priyanka (1 run).

Timing and cost: 13.8s and $0.0205 a page. The 10-page read took 104.7s (it was 116.3s); timeouts are unchanged. The three full runs and the before-read of Nick's pages cost $5.48 in all.

## Locks, each with its red-before

| Lock | Where | Red-before |
|---|---|---|
| A1 the genre list's options are topmost at their centres and Romance can be clicked, 1440 × 900, motion on | `locksV11.mjs` | Unchanged build: covered by the age label and a pill, not clickable. Fix removed: same. ⚠️ With reduced motion the old build PASSES, because the fault needs the entrance animations; the lock runs with motion on. |
| A1b in a 560px window the list lands on screen | `locksV11.mjs` | Unchanged build: list bottom at 1148. Both rescues removed: bottom 895. (Removing the flip alone stays green: the scroll rescue still works, as the brief allows.) |
| A2 "Use photos" calls no `click()`; empty state shows "Choose photos" and the tile; "Choose photos" calls `click()` inside its own click | `locksV11.mjs` | Unchanged build: one `click()` on "Use photos", no empty state. `openPhotos` mutated to click: same. |
| A3 heading one line, ink inside the column, Special Elite, at 1440 × 900, 1204 × 800, 901 × 800 | `locksV11.mjs` | Unchanged build: no such heading. Old clamp restored: 1338px of ink in a 1096px column. |
| Photos screen unit locks (heading, empty state, `onAdd` only, `openPhotos` never clicks, one gate) | `photosScreen.test.tsx` | 7 cases red on the unchanged tree. |
| Addendum carries the date and ✗ rules, and the sheet prompt carries none | `smartImportPhotosV11.test.ts` | 2 red on the unchanged tree. The photo-only case is a guard and passes on both. |
| Kirsten as the model gave it: the date stays on the event only, no-date | same | Red on the unchanged tree (it gave a sent date of 15/9 and two-dates). The correct-reply and two-different-dates cases are guards. |
| Two-dates card offers "Neither is when I sent it"; it keeps both events, answers two-dates and opens no-date on the same card; the same on a sheet import | `twoDatesV11.test.tsx` | 3 red on the unchanged tree. |
| One date twice reaches the card once, asked with no-date | same | Red on the unchanged tree. |
| The answer-all lists only queries coded `crossed-out` | same | Passes on the unchanged tree (false premise 2). Red with `openCrossedOthers`' code filter removed. |
| C1 behind the progress card no text or drawing is shown; every card's band shimmers; the feed is shimmer blocks | `locksV11C.mjs` | Unchanged dev line: 21+ visible texts ("Getting started", "Next up", "Active queries", "waiting on you", "Founding writer", "Tell us something", the tiers from "Egg" to "QueryHawk"…), 4 of 6 bands plain. |
| C2–C4 hawk below the edge at 0.3s, rising at 1.0s, at rest and on top at 1.6s, looking at 2.1s, back at 3.4s, sequence over | `locksV11C.mjs` | Unchanged dev line: no hawk. Hawk portalled to `<body>`: `onTop` false (the set-up frame covers him). |
| C5 reduced motion: no animation, at rest, never looking | `locksV11C.mjs` | Unchanged dev line: no hawk. Reduced-motion branch removed: 2 animations running, 237px below rest, looking at 2.3s. |
| C6 an ordinary loading page has no hawk | `locksV11C.mjs` | A guard: passes before and after. |
| HR1 resting box = box on the loaded dashboard, within 1px, at 1440 and 1280 (emulator) | `tests/e2e/hawkRest.measure.ts` | `[1302,675,134,225]` = `[1302,675,134,225]` and `[1142,575,134,225]` = `[1142,575,134,225]`. `HR_MUTATE=offset` (6px): red at both. |
| The clock: armed only by an import, carried across two mounts, never replayed, the timings and the clip | `src/lib/mentorIntro.test.ts` | New module (red by absence). |

Readings: `phaseA-locks.json`, `phaseA-mutations.txt`, `phaseC-locks.json`, `phaseC-mutations.txt`.

## Screenshots (this folder)

- `genre-list-1440.png`: the genre list open over the age section.
- `photos-empty-1440.png`, `photos-empty-390.png`: the empty photos screen.
- `photos-filled-1440.png`, `photos-filled-390.png`: the photos screen with two pages (one flagged blurry).
- `handoff-skeleton-1440.png`: the progress card over the all-skeleton dashboard.
- `handoff-hawk-rising-1440.png` (0.75s), `handoff-hawk-looking-1440.png` (2.3s), `handoff-hawk-back-1440.png` (3.7s): the hawk's three moments.
- `handoff-loaded-1440.png`: the loaded dashboard (emulator harness account), the hawk in the same box.

## Deploy

- Dev served `index-DXb0CEpQ.js` from `dev/qc1511-db2-title-sip-qc1512-cl26` (616ebcb8, another session's Contact list v26). I re-checked that just before deploying.
- `dev/qc1511-db2-title-sip-qc1512-cl26-sip11` is that line plus Phases A, B and C. It's pushed, and I ran `npm run deploy:dev` from a clean checkout of it, which deployed hosting and `smartImportMap(europe-west2)`.
- Dev now serves `index-cVtavgTw.js`, matching the build. Its app chunk names `projectId:"scriptally-dev"` and carries no prod project id.
- Prod is untouched.

## Left alone

- Nick's photos stay in the gitignored `photos-real` folder for the next eval. `photoEval.mts --real-out <dir>` writes those reads outside the repo.
- Both worktrees I made are removed; their branches are pushed.
