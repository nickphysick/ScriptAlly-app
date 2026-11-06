# Corkboard v2 — report (6 Nov 2026)

The Corkboard (`/todo/corkboard`) is a scrolling wall of post-its under the Contact list's navy header, with two
views (Corkboard and Piles), drag and drop in both, a note pop-up, the To-do list's own composer for tasks, a new ⋯
menu, an empty page of examples and a phone layout. Five new papers (Butter, Blush, Powder, Sand, Stone) replace
yellow, pink and sage, which are mapped when read and never rewritten.

Branch `corkboard-v2`, one commit per part (A–H) and one for the locks and this report (I), on
`6ef04863f` — the branch dev served (§2). **Not merged to `main`.**

---

## 1. False premises (read these first)

1. **The Contact list's header is not shared.** It is `agents/contact/ContactHeader26.tsx` + `contactV26.css`
   (`.cl26-*`), mounted only by `AgentList`. It is copied, not lifted: `CbHeader` restates its values under `cb2-`
   and the Contact list is untouched. Lift candidate.
2. **The ref's header is not the Contact list's header.** The ref's `.hp` draws radius 22, 34px padding, a 46px
   title and `#2d3a50`; the Contact list as built on dev is radius 20, padding 24/30/24/22, a 34px title, `#2a3a52`
   and `min(sheet − 64, 1136)` wide (plus up to 80 on a sheet over 1500). CB2 holds the panel to the Contact list,
   so the build follows the Contact list, not the ref's `.hp`. My first width rule was wrong (W = min(sheet − 48,
   1200) and the scroll row's gutter on top): CB2 caught it (inset 160 vs 144 at 1512, 65 vs 32 at 1280).
3. **`NoteColour` was shared with a second entity.** The dashboard's desk notes (`Note`, the `notes` collection,
   `components/notes/*` and `dashboard/HeroCard.tsx`, all reached only through NotesLab) use it, and their rules
   require one of `pink`/`sage`/`yellow` on every write. They keep their three papers under a renamed type,
   `DeskNoteColour` (type rename only). **So there is still a second colour table — `notesTheme.ts`'s `NOTE_THEMES`
   — for that entity.** Every Corkboard and To-do reader goes through the one mapping. Your call whether the desk
   notes should move to the five too.
4. **The `HeroCard` in the brief is the dashboard's** (NotesLab), not the marketing hero. **`NotesPane.tsx` reads no
   colour at all**, so it needed nothing and was not touched.
5. **A note's link could not change after it was made.** The update rule's `affectedKeys` did not list
   `agentId`/`queryId`/`manuscriptId`, and Part A did not name the change. Asked; you ruled to widen it. Checked as
   you asked: the To-do list reads the link live from the same document (`trayItem` takes `userTask.agentId` from
   the same `userTasks` snapshot; `userCard` reads `t.agentId` / `t.manuscriptId`), so a changed agent or manuscript
   link shows there on the next snapshot. **Gap, not fixed (`/todo` is out of bounds): a link to a QUERY never shows
   on the To-do row** — the own-task row reads `agentId` only. That predates this work.
6. **"Four example post-its from `NOTE_EXAMPLES`" and screen 09 disagree.** The ref's four are shortened rewrites
   of four `NOTE_EXAMPLES` entries. Built from the data, as the brief says: the same four entries, in the ref's
   order, so the words are longer and the papers are the data's (Butter, Butter, Blush, Blush), not the ref's.
7. **The To-do composer is fuller than screen 06.** "Add a task" hosts the To-do list's own `ComposeCard`, which
   keeps every question (the Task / Note switch, "When should it come to the top of your tray?", tags), so it is
   longer than the ref's simplified dialog. Its writes are the To-do list's own (CB9).
8. **The phone already had its own Corkboard.** Phone app v2 (Part 5C) routed phones to `CorkPhone`. Screen 10
   draws this page on a phone, so `/todo/corkboard` is now one page at every width; `CorkPhone.tsx` and PA2-5's
   Corkboard case are retired.
9. **The folder tab already read "TASKS Corkboard"** (the nav table's section plus the route label). No shell edit.
10. **The keyboard sheet shows every scope on every page.** `N` is added under a new "Corkboard" scope.
11. **The link finder lived inside `ComposeCard`.** It is exported as a pure `linkOptions(...)` that ComposeCard
    now calls too, so the note pop-up uses the same finder. That is an edit to a `/todo` file outside Part H, with
    no visible change on `/todo`.
12. **Turn into a task stamps Butter, not yellow,** on a note with no colour (the paper is still written before the
    date, so the note keeps its board place).
13. **"linked to agents" counts any link**, as the ref does (`n.link` of any kind), so a query or manuscript link
    counts too.
14. **The emulator's ports are fixed and shared.** Another session (`ScriptAlly-td511`) was running its e2e on the
    same ports; my runs waited for them rather than touching that session.
15. **Eight worktrees besides the primary existed when I started** (over the limit of five). None were mine; I left
    them alone. Worth a clean-up pass.

## 2. The base

`6ef04863f` — `dev/qc1511-db2-title-sip-qc1512-cl26-sip11-tl1-pk41-cl262-db21-sip12-pk41w-qc152-fn121-pk42-qc1521-sr1-qc1522`.
Built here, it gave `index-C53uvdXY.js`, the bundle dev was serving.

Baseline before any edit: `tsc` clean; `npm run build` and `npm run build:dev` clean (no errors or warnings in the
logs); Vitest 11,427 passed / 3 skipped, **2 failed** — both in `src/test/firestoreTarget.test.ts`, red on the base
and on every commit since (the known-red set).

## 3. Recon (§0)

**What `/todo/corkboard` mounted on the base:** `TodoNoteboardPage` with the shared `PageHeader` panel and the
`corkboard-header` ArtSlot; v1's add bar and filter row; `CorkBoard` (free pinning, tidy view, cork texture) with
`CorkTasksCard` as an item; an inline compose card; the shared `PortalMenu` with `noteMenu`; the Turn-into-a-task
panel (`BrandDatePicker`); the Tags… sheet (`TagPicker`); the examples drawer; `NoteboardWorkflow`. Below 768px,
`CorkPhone`. Helpers from `lib/noteboard` (sortNotes, noteColour, orderNotes, reorderIds, linkifyBody, noteTagChips,
…) and `lib/corkboard` (the cork layer, `arrange`, `corkPrefs`, `ownTaskRows`, the header copy).

**Header (§0.2):** page-local on the Contact list (false premise 1); copied.

**Rules (§0.4):** `isValidUserTask`'s `hasOnly` lacked `pinned`; its colour check took the old three; the update
rule's `affectedKeys` lacked `pinned` and the three link fields.

**Task composer (§0.5):** `ComposeCard` writes nothing itself (the host's `onSave` writes) and needs only props, a
`td5-root` wrapper and the To-do sheet that is already in the bundle. Hostable without changing its writes.

**Doors (§0.6):** agent → `openAgentCard(id)`; query → `openQueryPanel(id, "other")`; manuscript →
`/manuscripts?m={id}`.

## 4. What was built, part by part

| Part | Commit | What |
|---|---|---|
| A | `7a875356e` | Five papers + mapping (`NOTE_PAPERS`, `paperOf`), `pinned`, link fields on `updateUserTask`, rules, `lib/corkboard` v2 derivations |
| B | `ce8aa34ee` | `CbHeader` (navy panel, sentence, At a glance / Pick a colour), `CbToolRow` (find, pills, view switch, sort) |
| C | `325a76d09` | `CbWall` + `CbPostIt`, drag to reorder (one `order` write), Read all, link chips; v1's board retired |
| D | `6229143ea` | `CbPiles`: piles by first tag, the open pile's shelf, move to pile with Undo, New pile through the minter |
| E | `311cb1624` | `CbNoteDialog`, "Add a task" hosting `ComposeCard`, `CbTurnTask` |
| F | `f41ad5fe5` | `CbMenu` in the brief's order, arrow keys |
| G | `bda8ddd94` | Empty page (`CbEmpty`), the phone (one page everywhere), `N` |
| H | `01ef9bc15` | To-do composer's Note mode: the five papers |
| I | (this commit) | Locks CB1–CB14, mutation runner, screenshots, this report; the width fix CB2 found |

## 5. Every `NoteColour` reader touched

| Reader | Change |
|---|---|
| `src/types.ts` | `NoteColour` = the five; `LegacyNoteColour`, `StoredNoteColour`, `DeskNoteColour`; `UserTask.colour?: StoredNoteColour`; `pinned?` |
| `src/lib/noteboard.ts` | `NOTE_PAPERS`, `NOTE_COLOURS`, `LEGACY_PAPER`, `paperOf`, `paperHex`, `paperName`; `noteColour` maps |
| `src/lib/db.tsx` | `setUserTaskColour` takes a stored colour; `updateUserTask` takes `pinned` and the links |
| `src/components/todo/noteboardExamples.ts` | typed `StoredNoteColour` (data unchanged, mapped when read) |
| `src/components/todo/v5/ComposeCard.tsx` | Note mode papers from `NOTE_PAPERS`, header tint `paperHex` (Part H) |
| `src/components/todo/v5/TodoTray.tsx` | edit reads `noteColour(t)`; a new note's paper written when not Butter |
| `src/components/todo/TodoNoteboardPage.tsx` + `corkboard/*` | everything through `paperHex` / `noteColour` |
| `src/components/todo/phone/CorkPhone.tsx` | retired (its own `PAPER` table went with it) |
| `src/components/notes/*`, `dashboard/HeroCard.tsx` | type renamed to `DeskNoteColour` only (false premise 3) |
| `src/components/manuscripts/NotesPane.tsx` | not a reader; untouched |

## 6. Files retired or left

Retired: `CorkBoard.tsx`, `CorkTasksCard.tsx`, `noteboardEmptyState.tsx`, `noteboardEmptyArt.tsx`,
`phone/CorkPhone.tsx`, the examples drawer and v1's inline composer / date panel / Tags… sheet (inline in the page),
v1's pure board layer in `lib/corkboard.ts`, the v1 e2e suite (`corkboardV1.measure.ts`, `corkboardShots`,
`cbLib`, `cbStore`, `seedCorkboard.mjs`) and the unit cases that held them. Each with where its law went:
`tests/e2e/RETIRED-corkboard-v2.md`.

Left: `PortalMenu` (the To-do board uses it), `noteMenu` (the To-do board's), `TagPicker`, the `corkboard-header`
ArtSlot brief (registered, unused), the `nb-` styles in `todoNoteboard.css` that other cases still read,
`todoPrefs.noteboard.layout` / `dismissedExamples` on user documents (no longer read, not deleted).

## 7. Rules — the prod change for you

Dev is deployed (§9). **Prod is yours** — `firestore.rules`, three edits:

1. `isValidUserTask`: `hasOnly([...])` gains `'pinned'`.
2. `isValidUserTask`: the colour check takes
   `['butter', 'blush', 'powder', 'sand', 'stone', 'pink', 'sage', 'yellow']`, and a new clause:
   `(!data.keys().hasAny(['pinned']) || data.pinned is bool)`.
3. `match /tasks/{taskId}` update: `affectedKeys().hasOnly([...])` gains `'pinned', 'agentId', 'queryId', 'manuscriptId'`.

Until prod has them, pinning, the new papers and changing a link are refused on prod (the client reports a failed
colour write and keeps the note).

## 8. The locks

`tests/e2e/corkboardV2.measure.ts`, on the emulator build, at 1512 × 982 and 1280 × 800 (CB12 at 390):
**all fourteen green**, and each red on its named break (`node tests/e2e/cb2Mutate.mjs`; logs in
`reports/corkboard-v2/mutation-CB*.log` for the reruns, every result in `mutation-proofs.jsonl`).

| Lock | Asserts | Mutation | Red reading |
|---|---|---|---|
| CB1 | the five papers paint their hex; old yellow/pink/sage paint butter/blush/powder; no task write on load; the documents keep their old values | rewrite old colours on read | "6 task write(s) on load" |
| CB2 | panel background, radius and both insets equal the Contact list's ±1; title; the sentence's counts; no zero glance row (a no-link fixture), and the count follows a 5-note board | hard-code "13" | `"13 notes on your board." over 5 notes` |
| CB3 | "linked to agents" leaves exactly n2, n3, n4, n9 at full opacity; again clears | filter on tags | ten notes at full opacity |
| CB4 | every post-it's words compute to Special Elite | inherit the serif | `"Source Serif 4", Georgia, serif` |
| CB5 | the paragraph shows Read all, a one-liner does not, only one note is cut | always show Read all | 13 notes show it |
| CB6 | the pinned note is first in Newest, Oldest, By colour and My order, and on top of Loose notes | sort before pinning | "first is cb2seed-n2" |
| CB7 | a drag writes ONE user-document update whose mask is `todoPrefs.noteboard.order` (+ `.sort`), never the map; the sort reads My order; the note sits right before its target | write the whole todoPrefs | "paths todoPrefs" |
| CB8 | a drop on a pile sets its tag first and keeps the rest; Undo restores exactly; New pile mints a TagDef and puts it first | replace all tags | the second tag lost |
| CB9 | "Add a task" on the Corkboard and /todo's composer write the same fields for the same answers; Turn into a task writes only dueDate (+ colour when absent) | write colour on the task | `colour` on one side only |
| CB10 | the view and the sort survive a reload and are stored | keep them in component state | Piles not pressed after reload |
| CB11 | empty: Pick a colour to start, four examples, no wall; Keep this creates the note and the board leaves the empty state | show the wall | red |
| CB12 | at 390: no sideways overflow, one column, nothing draggable | allow drag on phone | 13 draggable elements |
| CB13 | /todo's Note mode offers Butter, Blush, Powder, Sand, Stone | leave Yellow / Pink / Sage | `Yellow, Pink, Sage` |
| CB14 | the rules accept the five, the old three, `pinned` and a link change, and refuse `green` | narrow to the new five | the old three refused |

⚠️ **The first mutation pass reported five greens (CB1, CB2, CB5, CB6, CB9) that were runs which never started**:
another session held the emulator's fixed ports and the runner read "no failures" as green. The runner now waits
for the ports, keeps each log, and says DID NOT RUN when a lock never ran; rerun, all five went red.

The emulator loads this branch's `firestore.rules`, so CB14 is a statement about the edited rules; the deployed dev
rules are checked separately in §9.

## 9. Deploy

**DEPLOY_RESULTS**

## 10. Screenshots

The ref's screens are in `design-refs/corkboard-v13/screens/`; the build's in `reports/corkboard-v2/shots/`, same
numbering.

| Ref | Build |
|---|---|
| 01-board-1512@2x.png | shots/01-board-1512.png |
| 01-board-1280@2x.png | shots/01-board-1280.png |
| 02-piles-1512@2x.png | shots/02-piles-1512.png |
| 02-piles-1280@2x.png | shots/02-piles-1280.png |
| 03-pile-open-1512@2x.png | shots/03-pile-open-1512.png |
| 04-new-note-1512@2x.png | shots/04-new-note-1512.png |
| 05-menu-1512@2x.png | shots/05-menu-1512.png |
| 06-add-task-1512@2x.png | shots/06-add-task-1512.png (fuller: false premise 7) |
| 07-turn-into-task-1512@2x.png | shots/07-turn-into-task-1512.png |
| 08-filter-linked-1512@2x.png | shots/08-filter-linked-1512.png |
| 09-empty-1512@2x.png | shots/09-empty-1512.png (data examples: false premise 6) |
| 10-phone-390@2x.png | shots/10-phone-390.png |

## 11. Open, for you

- Whether the dashboard desk notes (NotesLab) move to the five papers (false premise 3).
- A query link on a dated note doesn't show on the To-do row (false premise 5).
- The header ring's drawing: set `CORKBOARD_RING_ART` in `lib/corkboard.ts` when it arrives.
- Prod rules (§7).
