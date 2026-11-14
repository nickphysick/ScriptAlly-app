# Two-door import v1.1 — Phase 0 recon

Worktree `ScriptAlly-tdf`, branch `two-door-import-finish`, cut from `origin/dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi`
@ c24562273, the line dev serves (`index-BQC9KmLH.js`), plus `two-door-import`'s last two commits (the walk fix and the
report, ee0de971f and 1c1840084, which reached dev only as files, not as a build change). The served line contains the
two-door build. Worktrees besides the primary at the start: 3 (co1, live, rsp6), so this one is the fourth.

No STOP condition is met.

## 1. The draft store
- `lib/importDraftModel.ts:23` `ReviewSnapshot` = `{ agents, queries, reconciled, touched, screen }` — SmartImportReview's
  whole working model. `:31` `DraftPayload` = `{ result, review, already }`. `:57` `resumeRow`, `:101` `RESUME` (words).
- `lib/importDraft.ts:34` `saveDraft` (parts, then meta, at `importDrafts/{uid}`), `:49` `loadDraft`, `:60` `deleteDraft`,
  `:79` `subscribeDraftMeta`. The meta carries `source: "smart" | "template"` (`:19`).
- `components/import/ImportFlow.tsx` `keepDraft` (the review's `onChange`, debounced `DRAFT_SAVE_MS` = 800 ms) saves
  `{ uid, fileName, source: importSource, manuscriptId, startedAt, payload }`; it returns early only in the lab, with no
  writer, or with nothing read. `resume` (the handle) restores `importSource`, `already`, the result and `resumeSnap`,
  and opens the review. `dropDraft` deletes it on finish or discard.
- **Saved on both routes and from both hosts.** `ImportFlow` is the one flow behind set-up's `BranchB` and the Import
  page, and `importSource` is `"template"` on the headings route and `"smart"` otherwise. In set-up the flow has no
  `manuscriptId`, so the draft's is `null`.
- `dashboard/v58/Dash58.tsx:498-507` subscribes to the meta; `:508` shows it when its `manuscriptId` is null or the
  scoped book's; `:660` `ResumeCard` → `onCarryOn` = `navigate("/import?resume=1")`; Start again deletes it and opens
  `/import?start=smart`. `components/import/ImportPage.tsx:118-150` reads `resume=1`, `loadDraft`s and calls `resume`.
- ⚠️ A leftover: `RESUME.source` reads "Smart Import · started …" for a template (headings) draft too. Words not
  changed here (Phase 2 says the card's words stay).

## 2. Does the snapshot hold everything two-door added?
Yes — every answer two-door added lives on the working model, which is what is saved:
- corrected dates on an out-of-order query: the query's `timeline`/`sentDate`/`status`, and the
  `dates-out-of-order` reason marked resolved;
- a confirmed month-first date: `sentDate` set and the `unreadable-date` / `no-date` reason resolved;
- a chosen outcome: the re-typed `timeline` event, `status`, and `outcome-missing` resolved;
- the rules' settlements: `agencyWaived`, `sentWaived`, the removed `no-date` and date reasons, the derived `status`,
  and the no-year dates.
**The rules are not re-run on resume.** `SmartImportReview` starts from `resume?.agents ?? seeded.agents` and
`resume?.queries ?? seeded.queries`; `ruledModel(result)` is still computed for `initial`, but only `originals` (the
names as read) and `hadDuplicates` are taken from it. So re-running cannot reopen an answered question. What is NOT
kept: the deck's two refs (`agentDeck`, `queryDeck`), so cards answered before leaving are not in the deck on return
(their rows are in the ready list) — the data is kept, the deck's history is not. Proven by running in Phase 3.

## 3. Leaving set-up mid-review, today
- **Through the frame's "Skip for now"** (exit mode `ask` on the read screen and the review, `BranchB.exitModeFor`):
  `SkipSetupConfirm` asks, then `handleSkip` — the held manuscript is created once (`ensureBranchBManuscript`) and
  `finishOnboarding` makes set-up's one write (`onboardingComplete: true`). The writer lands on the dashboard; the
  draft (saved 800 ms after the review's first render) is there, so `ResumeCard` shows (its `manuscriptId` is null).
- **By closing the tab:** no write. `onboardingComplete` stays false, so the next sign-in opens set-up again, at the
  welcome (`normalizeStep` → 0; only `queryingStage`, title and genre are kept in localStorage). Set-up never reads the
  draft, so the writer is back at the doors and the draft sits unused until the dashboard (after set-up) shows it.
- **Opening set-up on the review from a draft is more than a small change:** the held book (`b2Draft`, the details for
  the one manuscript write) is in memory only, so a resumed set-up review would have no manuscript to import into —
  it would need the book persisted and the branch's screen state restored. Not built (Phase 2 allows that).

## 4. What "Take me to my dashboard" calls
`CaptureFork` `onNothingYet` → `BranchB` `onSkip` → `Onboarding.tsx` `handleSkip`: `ensureBranchBManuscript()` if a book
was entered, then `finishOnboarding()` — `persistProfile({ onboardingComplete: true })`, the `signed_up` event,
`onComplete()`. Nothing in it depends on the import having run, and the review already reaches it today (item 3). So
"Finish later" is: flush the draft, then `handleSkip` without the confirm. No second write; no rules change. Not a STOP.

## 5. The six older suites
None makes a live Smart Import call: `onbV5` K3's "Read my file" presses a lab spy (`OnbLab.tsx` LabConfirm,
`onRead={labSpy("runMapping")}`); `onbV5ImportPage` F1 (smart) stops at the confirm and presses Back; every file the
walks upload is a template fixture, which now takes the headings route. Classification below is from reading each
lock; Phase 1 runs them and corrects it.

| Suite · lock | Live call | Class | Why |
|---|---|---|---|
| onbV9 W1 ×2, T1 ×3, T2 ×2, B1–B4, B@400 | no | (a) | set-up before the fork, unchanged |
| onbV9 F1 three tiles | no | (b) A | two doors |
| onbV9 F1 hand-off (confirm) | no | (a) | the confirm is unchanged |
| onbV9 F1 fork and hand-off at 400 | no | (a)/(b) | no-overflow holds; any tile count is A |
| onbV9 S1 ×3 | no | (a) | re-pointed in v1, green |
| onbV9 G1 agents: two questions | no | (b) D | a blank agency is no longer asked |
| onbV9 G2 queries: nine questions, the blank date among them | no | (b) D/E | a missing sent date is not asked; primaries changed (F) |
| onbV9 G2 status set; two-way date cannot be left blank | no | (a) | still asked |
| onbV9 G3 ×2 nameless row | no | (a) | still asked |
| onbV9 G4 Skip for now from the queries step asks first | no | (a) → changed by Phase 2 | Finish later replaces it on the review |
| onbV9 G at 400/1280 | no | (a) | |
| onbV9 M1 ×3 | no | (a) | screens at rest / no sideways scroll |
| onbV9 R1 loaders and Import page tiles are the base's | no | (b) A | three tiles on /import |
| onbV9Walk ×3 journeys to the fork | no | (b) A | asserts the fork's tiles |
| onbV9Walk Just getting started | no | (a) | |
| onbV9Walk template-mixed.csv to the dashboard | no | (b) B/D/F | summary words, no-agency/no-date questions, primaries |
| onbV5Import R2, R3, R4 (reading loader) ×vp | no | (a) | |
| onbV5Import S1 sums, S2 shape | no | (b) | the summary is the read screen (Phase 3 of v1) |
| onbV5Import V1, V2, V5 | no | (a) | review frame, no walk, undo |
| onbV5Import V6 leaving asks first | no | (a) → changed by Phase 2 | |
| onbV5Import V4 same result as the baseline ×2 | no | (a)/(b) C/D | rules may change the handed-over result; run to see |
| onbV5Import R2, R4 (importing loader), H1 ×2, H2, T1, N2 ×3, N3 | no | (a) | |
| onbV5 F1–F4, A1, A3, S1, S2, K3, T1, A4 | no | (a) | |
| onbV5 K1 three tiles | no | (b) A | |
| onbV5 K2 fact lines (template "Always free", by-hand) | no | (c)/(b) | two of its three tiles are gone |
| onbV5 E1 dead ends ("Use the template instead" back to the fork) | no | (a)/(b) | the card exists; where it leads changed |
| onbV5 shots | no | (a) | |
| onbV5ImportPage P1 every screen as before the move | no | (b) | compares to p1-before.json, captured before v1 |
| onbV5ImportPage D1 (re-pointed in v1) | no | (b) done | |
| onbV5ImportPage D2 tiles per entitlement | no | (b) | the spreadsheet button is never disabled now |
| onbV5ImportPage D3, T1, F2, F3, F4, M2, M3, T1 matcher | no | (a) | |
| onbV5ImportPage F1 template | no | (a) | re-pointed in v1 to the one picker |
| onbV5ImportPage F1 smart (confirm; Back to 3 tiles) | no | (b) A | waits for three tiles (missed in v1) |
| importTruth R1 | no | (b) A/B | waits for the template tile's upload button and picks `input[type=file]` nth(1), now the photos picker |

## 6. ImportDoorsPhone
`components/phone/pages/ImportDoorsPhone.tsx`: Smart import ("Import a spreadsheet", **disabled when spent**, unlike
the desktop since v1) → `onSmart` → the one picker; "Our template · Always free · No limit" heading, "Download the
template" → the headings sheet; "Upload my sheet" → `onUpload` = `ImportPage.chooseTemplate` → `start("template")` →
the same one picker; "Match your own columns" → a sheet offering "Import a spreadsheet" (disabled when spent) and
"Upload my sheet" (the one picker); "Log one by hand" → the query drawer.

## 7. The `import` hatch
`App.tsx:538-540` reads and clears `scriptally_post_onboarding_tab`. Nothing in `src/` writes it (grep, excluding tests).
