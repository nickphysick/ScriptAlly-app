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
| 1 | F locks, shots, report | (the commit that carries this line) | committed; dev deploy follows |
| 2 | — | — | next |

## Resuming
- Read `git log --oneline -15` and this file; resume at the first phase not committed.
- Local previews: this build on :4391 (`npx vite preview --port 4391 --host 127.0.0.1`); the base build (a copy of the
  base's dist in the session scratchpad) on :4392 for S9-style desktop captures.
- e2e: `SA_E2E_BASE_URL=http://127.0.0.1:4391 npx playwright test tests/e2e/phoneAppV2Shell.measure.ts --workers=1`.

## Open (for Nick — see each part's report)
- Part 1: the band's search (palette vs PhoneSearch); four menu tiles with no line; the one-manuscript footnote; the
  Founding chip for everyone; ink #1f2633 on blush rather than the ref's #111.
