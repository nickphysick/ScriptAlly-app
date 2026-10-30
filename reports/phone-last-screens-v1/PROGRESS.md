# Phone last screens v1 — progress

Branch `phone-last-screens-v1`, worktree `/Users/nickphysick/ScriptAlly-pls` (overnight conductor, 30 Oct).
Base: `88be898e`, the tip of `setup-import-phone-v1` (conductor override: cut from Stage 3's tip). That base holds phone app v2 through Part 8, so its band, sheets, flow host and snackbar are reused.
Baseline (same tree as Stage 3's final): tsc root 0, tsc functions 0, build clean, Vitest `Test Files 697 passed (697)` · `Tests 10774 passed | 3 skipped (10777)`.
Ref: MANIFEST hash 4a819d11…cf6e2, 13/13 OK.

| Phase | Commit | State |
|---|---|---|
| A account screens, dead ends, the error page | `711c1207` | committed |
| B addresses and column matching | `69abc04c` | committed; PLS1 L1–L5 written and green (L1–L3 lab, L4–L5 signed in) |
| C email drop on a phone | `af75ae97` | committed; behind `emailDropPhoneLive()`, OFF; PLS1 L6 green on the lab |
| D editing a query | (this commit) | committed; PLS1 L7 green (writes and undoes on the harness account) |
| E writing materials and building packages | — | |
| F locks, shots and the report | — | |

## Resuming
- Read `git log --oneline -10` and this file; resume at the first phase not committed.

## Recon facts (for C–E)
- The EditQueryDrawer is desktop only; the phone edits in the card (`QcQueryCard149`, `onSaveEdits` in Queries.tsx). The drawer saves all fields at once via `commitQueryEdits` (`lib/saveQueryEdits.ts`).
- The reply window: the agent stores weeks only (`responseTimeWeeks`); the query's own expected date is `writerExpectedDate` (a date), so a weeks+days wheel can be stored exactly as a date with no rounding.
- Smart email drop IS mounted: `PasteEmailFlow` (Pro only, App.tsx), opened by `PASTE_RESPONSE_EVENT` from QueryPicker's "Paste the email instead". `PasteEmailButton` is mounted nowhere.
- `src/components/phone/pages/ManuscriptPhone.tsx` starts with "Manuscript" and is treated as off-limits. Its Packages and Versions headings have no id; `#materials` and `#comps` exist.
- Materials are plain text (`ManuscriptVersion.contentDraft`); `updateVersion` refuses content edits on a sent version; `usePackagesModel().saveMaterial` edits in place when unsent, otherwise adds a version.

## Phase A notes
- 1B: `.sf--account .ws-ftg, .ws-ftsibs { display: none }` below 768px. Sentence case was already done by public pages on phones v1.
- 2B: `DeadEndCard`'s foot is `StepFoot` (PhonePin), so on a phone in set-up the actions are pinned; the band was already drawn by Stage 3's frame. On `/import` (no SetupFrame) the foot renders in place.
- 3B: the error page is full-screen shell ink at every width (the one desktop change). Feedback cannot open from outside the shell, so "Tell us what happened" links to `/contact`. `#/throw-lab` (dev builds only) forces the fallback for L3.

## Phase B notes
- 4B: App.tsx (hook-free `matchMedia`, among the early returns like Part 8B's account index) redirects `/queries/packages`, `/manuscripts/comps`, `/manuscripts/versions` with `replace` to `/manuscripts{?query}#packages|comps|versions`. `PhoneSectionLanding` scrolls the Packages/Versions heading in (found by the lists it heads, because `ManuscriptPhone.tsx` is a `Manuscript*` file and is not edited) and opens `?pkg=`/`?version=` by pressing the page's own row.
- 5B: already true on this base: `/todo/calendar` redirects to `/todo` (`todoRedirectFor`), and the phone To-do shows the week band. L4 asserts it.
- 6B: `ImportDoorsPhone` opens a sheet from "Match your own columns": its two doors call the page's own `onSmart` / `onUpload`. Copy from the board's `matchB`.
- Harness: `tests/e2e/phoneLastScreens.measure.ts` (PLS1) reuses pa2Lib's `openPhone`, `colourSweep`, `imageSweep`.

## Phase C notes
- FALSE PREMISE: Smart email drop is already mounted and reachable for Pro: `PasteEmailFlow` (App.tsx, Pro only), opened by QueryPicker's "Paste the email instead". So no new door was added.
- The phone screens (`EmailDropPhone.tsx`: `EmailPastePhone`, `EmailUpdatesPhone`) render from `PasteEmailFlow` below 768px when `emailDropPhoneLive()` is true. It is OFF: production never reads the switch, and on a dev build it is per device (localStorage `sa.lab.emailDropPhone` = "1"). Nick decides.
- The phone save calls `commitEmailImport` with only the ticked records, then `showUndoBar`. Undo restores a snapshot (matched query) or deletes the created agent, which cascades its query (new agent). The celebration is the existing phone Queries watcher.
- No allowance exists in the entitlement model, so the line reads "Included with Pro." (the mock's "30 emails a month" has no source).
- `#/email-drop-lab` (dev only) holds the two screens over a fixture for L6. The account-writing half of L6 (save and Undo on the harness account) cannot run: the harness account is free and the flow is Pro only.
- Walk on dev (Stage 3): "Just getting started" times out waiting for the Contact list on the BASE build too (pre-existing).

## Phase D notes
- `EditQueryPhone` (queries/phone): the page and six one-question screens. The ••• menu's Edit opens it (Queries.tsx phone branch, `phoneEditId`); it portals to <body> at z 1050, above the phone sheets (the query sheet stays open beneath and holds #root inert) and under the snackbar (1100). L7 found the first version unclickable under the sheet's scrim.
- Every save builds the drawer's `QueryEditOps` and calls `commitQueryEdits`; the drawer's option lists (`METHOD_OPTIONS`, `IF_NO_RESPONSE_OPTIONS`, `REJECTION_TYPE_OPTIONS`) are now exported from EditQueryDrawer and read, never copied.
- Field → section: agentId → Agent; manuscriptId, packageId (+ stamp when unlocked), materialsWanted (via `editMaterialsUpdate`), personalisationNotes → What you sent; dateSent, sendMethod → How and when; writerExpectedDate, ifNoResponse → Reply window; timeline appends/edits/deletes (checked by `validateTimeline`), rejectionType (rejected/withdrawn only, as the drawer), agentComments → Their responses; journal (`addJournalEntry`) → Notes.
- "No reply means no" maps to the drawer's `ifNoResponse`: on = "Mark as no response automatically"; off = back to "Remind me to nudge" (or the stored "Do nothing", kept).
- The reply window is the drawer's `writerExpectedDate` (a date at noon), so days from the wheel are stored exactly: no rounding, and Nick's question answers itself.
- Undo: a query snapshot before each save; a note (its own `journalEntries` document, outside the snapshot) is undone by deleting the entry it added.
- NOT DONE: the same wheel replacing the presets in the phone log-a-query flow's reply question (Part 4 is on this base). Lift note: `ReplyStep`'s chips + `Wheel` are the parts to share.
