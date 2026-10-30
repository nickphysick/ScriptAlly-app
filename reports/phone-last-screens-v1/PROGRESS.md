# Phone last screens v1 — progress

Branch `phone-last-screens-v1`, worktree `/Users/nickphysick/ScriptAlly-pls` (overnight conductor, 30 Oct).
Base: `88be898e`, the tip of `setup-import-phone-v1` (conductor override: cut from Stage 3's tip). That base holds phone app v2 through Part 8, so its band, sheets, flow host and snackbar are reused.
Baseline (same tree as Stage 3's final): tsc root 0, tsc functions 0, build clean, Vitest `Test Files 697 passed (697)` · `Tests 10774 passed | 3 skipped (10777)`.
Ref: MANIFEST hash 4a819d11…cf6e2, 13/13 OK.

| Phase | Commit | State |
|---|---|---|
| A account screens, dead ends, the error page | (this commit) | committed |
| B addresses and column matching | — | next |
| C email drop on a phone | — | |
| D editing a query | — | |
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
