# Corkboard v2.1 — clear ways to start a pile, and a page that doesn't look empty

**Branch:** `corkboard-v2-1`. Its base is `80197a645`, the integration branch dev was serving (`index-yuVLXxZt.js`): it holds Corkboard v2 and everything else on dev.
**Ref:** `design-refs/corkboard-v14/corkboard-v14.html` and its eight screens. Both are copied into the repo and hashed in `.refhashes.json`.
**Commits:** Part A `32e7a8ac2`, Part B `ea76fa165`, Part C `886fca9bf`, Part D (the locks, this report and one CSS fix).
**Rules:** none changed. Nothing in this pack needs one.

## 1. False premises and surprises, first

1. **There are no shared dialog, checkbox or input parts to reuse (§0.3).** The app's pop-ups are each page's own. Start a pile and Add notes are built from the Corkboard's own `cb2-*` pop-up parts: the frame of the "Turn into a task" dialog, portalled to `document.body` under `.cb2-layer`, so they read the page's tokens.
2. **A tag def lives on without any notes, so "is there a def?" cannot mean "the writer started this pile here" (§0.2).** Defs outlive their notes, and older work and other pages create defs too. Using defs alone would list every old tag as an empty pile. The decision is below.
3. **The ref draws no "Remove pile".** The brief asks for one. It sits at the foot of an empty pile's open view, in the ref's quiet-link style. It removes the pile from the started list. It deletes the tag def **only** when no note uses it (CB18 checks this).
4. **The ref's fixture is not the account's.** The ref's few-notes board has two loose notes. The seeded `few` fixture has three, one of them on `#calls`, so that one real pile shows beside the empty one. The shots differ from the ref by that one pile and nothing else.
5. **The emulator ports are shared with another session.** `ScriptAlly-db22`'s emulators took the hub's ports twice mid-run. I left that session alone. `tests/e2e/cb21Emu.sh` now waits for the ports and retries when the log says "port taken" (up to 20 tries, 20 s apart). Several runs waited through two to four retries.
6. **The ledger folder is v2's** (`reports/corkboard-v2/ledger/CB15…CB21`). The v2 harness writes there, and moving it would have meant editing v2's locks.
7. **The heading gap in the pop-up (found by looking at shot 03).** `.cb2-sdlg .cb2-h4--gap` (18 px above "Put notes in it") lost to `.cb2-layer .cb2-h4` (10 px under), which comes later at equal weight. The fix gives the pop-up's two rules `.cb2-layer` as well. The fix is in Part D's commit.

## 2. §0.2: how an empty pile stays listed

- **`todoPrefs.noteboard.started`** is a list of tag ids, written as one dotted leaf (`updateUserPaths`). No rules change is needed: `todoPrefs` is an open map.
- Starting a pile with no notes ticked mints (or reuses) the tag and adds its id to `started`.
- `piles()` lists `started` tags with no notes, A to Z among the rest. The caller passes only tags that still exist.
- `stillStarted()` drops a started tag once any note carries it. After that the pile is listed because of its notes, like any other.
- Remove pile takes the tag out of `started`. It deletes the def only if no note uses it.

This keeps v2's rule: a pile is a note's first tag. It also makes "listed but empty" something the writer did, never a leftover.

## 3. What was built

**Part A: the dashed add tiles**
- "+ New note" is the wall's last child, a post-it in size. It opens the note pop-up and is hidden while Find or a pill narrows the wall.
- "+ Start a pile" is the dashed tile in Piles, labelled "New pile".
- An empty pile's open view is a dashed stack.

**Part B: Start a pile and Add notes**
- The "Your piles" heading with the navy "+ Start a pile" button.
- The Start a pile pop-up (`CbStartPile.tsx`) has:
  - "Name it", with a `#` prefix;
  - suggestions in the ref's order, leaving out names already in use;
  - a clash line that disables the button;
  - "Put notes in it" (optional), a checklist of the notes;
  - "{n} notes chosen".
- On save, ticked notes get the new tag **first**, and their other tags are kept.
- "Add notes to #{tag}" lists only notes not already in that pile.
- The note menu's "New pile…" opens the pop-up with that note already ticked.
- Each of these writes shows a toast with Undo, which puts back every note's tags exactly as they were.

**Part C: empty piles**
- Empty piles work as described in §2.
- An empty pile's open view says what to do and has "Add notes" and "Remove pile".

**Part D:** the locks below, the shots and this report.

## 4. Locks: each red first, on the rendered page

`tests/e2e/corkboardV21.measure.ts` runs on the emulator (`sh tests/e2e/cb21Emu.sh … --project=measure`) at 1512×982 and 1280×800. Last run: **8 passed** (the setup plus 7 locks). The mutations are in `tests/e2e/cb21Mutate.mjs`, one file changed at a time and restored from a backup. Their logs are `mutation-CB*.log` and `mutation-proofs.jsonl`.

| Lock | Holds | Mutation | Result |
|---|---|---|---|
| CB15 | The New-note tile is the wall's last child, a post-it's size, and opens the pop-up. It is gone while filtered. | Render it while filtered | RED: "the ghost shows while find narrows the wall" |
| CB16 | Three doors reach Start a pile (heading button, dashed tile, menu's New pile…), and the menu pre-ticks its note. | Drop the pre-tick | RED: "ticked [] (want cb2seed-n2)" |
| CB17 | Starting #agents with two ticked notes puts agents first, keeps their other tags and creates the def. Undo restores all of it. | Replace all tags | RED: "f3 [tag-…] (was [calls, strategy])" |
| CB18 | A pile started with nothing ticked is listed empty. Adding a note takes it off the started list. Remove keeps a def that notes use. | Delete the def | RED: "the strategy def was deleted" |
| CB19 | Add notes lists only notes outside the pile. Adding moves them, with Undo. | List every note | RED: "13 listed; own n2, n4" |
| CB20 | A name already in use disables the button and shows the clash line. | Allow duplicates | RED: 'clash "null"' |
| CB21 | No sideways scroll at 1280 or 390, with the pop-up open or closed. | Fixed-width pop-up | RED: "dialog 24–664" at 390 |

Unit tests (`src/lib/corkboardV2.test.ts`) cover `boardPrefs().started`, `piles()` with started tags, `stillStarted`, `pileSlug` and the suggestions.

## 5. Screenshots beside the ref (1512)

Ours are in `reports/corkboard-v2-1/shots/` and the ref's in `design-refs/corkboard-v14/screens/`.

| Screen | Ours | Ref |
|---|---|---|
| Few notes, board | ![](shots/01-few-board-1512.png) | ![](../../design-refs/corkboard-v14/screens/01-few-board-1512@2x.png) |
| Few notes, piles | ![](shots/02-few-piles-1512.png) | ![](../../design-refs/corkboard-v14/screens/02-few-piles-1512@2x.png) |
| Start a pile | ![](shots/03-start-pile-1512.png) | ![](../../design-refs/corkboard-v14/screens/03-start-pile-1512@2x.png) |
| Empty pile, open | ![](shots/04-empty-pile-open-1512.png) | ![](../../design-refs/corkboard-v14/screens/04-empty-pile-open-1512@2x.png) |
| Add notes | ![](shots/05-add-notes-1512.png) | ![](../../design-refs/corkboard-v14/screens/05-add-notes-1512@2x.png) |
| Piles | ![](shots/06-piles-1512.png) | ![](../../design-refs/corkboard-v14/screens/06-piles-1512@2x.png) |
| Menu, New pile… | ![](shots/07-menu-new-pile-1512.png) | ![](../../design-refs/corkboard-v14/screens/07-menu-new-pile-1512@2x.png) |
| Board with the add tile | ![](shots/08-board-ghost-1512.png) | ![](../../design-refs/corkboard-v14/screens/08-board-ghost-1512@2x.png) |

The differences are the fixture (§1.4) and the app's own shell around the page.

## 6. Every file touched (against `80197a645`)

- `design-refs/.refhashes.json`, `design-refs/corkboard-v14/corkboard-v14.html` and the eight screens.
- `src/types.ts`: `started` on the noteboard preferences.
- `src/lib/corkboard.ts`: `started` in `boardPrefs`; `piles(…, started)`; `PILE_SUGGESTIONS`, `pileSlug`, `stillStarted`.
- `src/lib/corkboardV2.test.ts`.
- `src/components/todo/TodoNoteboardPage.tsx`: the start, add, remove and undo writes, and the pop-up state.
- `src/components/todo/corkboard/CbStartPile.tsx` (new): Start a pile and Add notes.
- `src/components/todo/corkboard/CbPiles.tsx`: the heading button, the dashed tile, the empty pile's view.
- `src/components/todo/corkboard/CbWall.tsx`: the New-note tile.
- `src/components/todo/corkboard/CbMenu.tsx`: New pile…
- `src/components/todo/corkboard/corkboard.css`.
- `tests/e2e/corkboardV21.measure.ts`, `corkboardV21Shots.measure.ts`, `cb21Mutate.mjs`, `cb21Emu.sh`, `seedCorkboardV2.mjs` (the `few` and `started` commands).
- `reports/corkboard-v2-1/**`, `reports/corkboard-v2/prefs-v21.json`, `reports/corkboard-v2/ledger/CB15…CB21`.

Nothing outside the Corkboard page and its helpers was touched. That includes `/todo`, `manuscripts/**` and the rules files.

## 7. Gates and deploy

- tsc, `vite build`, `build:dev` and full Vitest were run on the final tree. The only failures were the two known `firestoreTarget` ones.
- Deploy: dev only, after checking that dev still served the build this branch contains. The result is in the wrap-up.
