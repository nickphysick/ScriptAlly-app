# Phone app v2 — progress

Branch `phone-app-v2`, worktree `/Users/nickphysick/ScriptAlly-pa2`.
Base: `7d31b365` (`origin/dev/pk391-qm1-pk392-calx-pk392b-td7-fv1`), which builds to `index-DQ0k846l.js` — the bundle dev served on 29 Oct.
Baseline gates on the base: tsc root 0, tsc functions 0, build clean, Vitest 689 files · 10724 passed · 3 skipped.

| Part | Phase | Commit | State |
|---|---|---|---|
| 1 | A tokens, type, art table | `b945303d` | committed |
| 1 | B the tab bar | `3d4385a4` | committed |
| 1 | C the band | `5f707d05` | committed |
| 1 | D the + sheet, the menu, the book switcher | `be8fdc7c` | committed |
| 1 | E the snackbar, the icon, the launch screen | `4e0f911c` | committed |
| 1 | F locks, shots, report | `459b5d96` | committed |
| 1 | dev deploy | integration `a8b44524` on `dev/…-fv1-pk393-pa2-1` | dev serves `index-Ox21np2m.js` |
| 2 | A–C Home (one commit) | `93d802c7` | committed |
| 2 | D locks, shots, report | `e0531aba` | committed |
| 2 | dev deploy | integration `82adc7b9` on `dev/…-fv1-pk393-pa2-2` | dev serves `index-CRHIwewp.js` |
| 3 | A–D Queries, the sheet, Birds-eye, locks, report (one commit) | `1fba3a3e` (+ `504f3bd5` S1 reader) | committed |
| 3 | dev deploy | integration `8b2f06f5` on `dev/…-pa2-2-td12-ppp1-pa2-3` | dev serves `index-CArPS85T.js` |
| 4 | A the flow layout and the live card | `5d3f7688` | committed |
| 4 | B respond, mark sent, nudge, close, task, note | `3280fa0c` | committed |
| 4 | C celebrations | `feba0f9c` | committed |
| 4 | D locks, shots, report | see `git log` | committed |
| 4 | dev deploy | — | next |

## Dev, as of the end of Part 1
- (end of Part 2) dev serves `index-CRHIwewp.js` = `dev/pk391-qm1-pk392-calx-pk392b-td7-fv1-pk393-pa2-2` (`82adc7b9`). The next part's
  integration branch starts from WHATEVER dev serves then (check the hash first: another session deployed mid-Part 1).
- The integration worktree is `/Users/nickphysick/ScriptAlly-pa2-int` (needs `functions/node_modules` linked).

## Resuming
- Read `git log --oneline -15` and this file; resume at the first phase not committed.
- Local previews: this build on :4391 (`npx vite preview --port 4391 --host 127.0.0.1`); the base build (a copy of the
  base's dist in the session scratchpad) on :4392 for S9-style desktop captures.
- e2e: `SA_E2E_BASE_URL=http://127.0.0.1:4391 npx playwright test tests/e2e/phoneAppV2Shell.measure.ts --workers=1`.

## Part 4 notes
- PA2-4 WRITES and undoes. Before any mutant or new writing run, list the account (scratchpad tools/added.mjs `before <file>`), and check after. Delete residue BY ID after showing it: a bulk "delete what was added" is refused by the session's safety check.
- Part 5's "Add a note" tile should call `openPhoneCompose("note")`.

## Part 3 notes
- (end of Part 3) dev serves `index-CArPS85T.js` = `dev/…-pa2-2-td12-ppp1-pa2-3` (`8b2f06f5`), which includes To-do v12 and Public pages on phones v1 from other sessions. Part 4 integrates on top of whatever dev serves then.
- `pa` sheets are on the escape stack; the phone's `stepRow` opens the drawer directly; drawer 1010/1011, celebration 1050, snackbar 1100.
- QM1's celebration WRITES and undoes. A timeout before its Undo leaves a change on `probe-dangling-pkg`, which happened once and was restored by hand (Part 3 report). Re-check the account after any red run of it.

## Open (for Nick — see each part's report)
- Part 4: Add an agent is not a flow (ruling); the card's edit mode on a phone is unstyled (Part 8); the task flow has no "No date"; Log asks when and how in one step.
- Part 3: the To-do badge (37) disagrees with To-do v12's "Needs you now" (30) on dev; phones 761–767px get the desktop Queries page (`useQm1Phone` ≤760); the ••• is a sheet not a popover; the parked chip sits under an open sheet.
- Part 1: the band's search (palette vs PhoneSearch); four menu tiles with no line; the one-manuscript footnote; the
  Founding chip for everyone; ink #1f2633 on blush rather than the ref's #111.
