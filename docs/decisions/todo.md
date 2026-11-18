# To-do list — decisions

⚠️ **This file was created on the dev line (branch `todo-list-v57`, 18 Nov 2026).** `main` has its own `docs/decisions/todo.md`
(the earlier rounds, moved out of CLAUDE.md on 11 Nov). When this branch merges, put the v57 section below at the top of
main's file's "Current state" and keep main's sections beneath it, newest first.

## Current state (To-do list v57, 18 Nov 2026)

- **v57 is one stylesheet, `src/components/todo/ws/todoWs57.css`, imported last in `TodoWorkspace.tsx`** — a byte-for-byte port of `design-refs/todo-list-v57/todoWs57.css` (sha256 `b6d8e8db…6c75532`); desktop only (≥768px); never fold it back into todoWs/54/55/56.
- Tray `clamp(340px, 29%, 396px)` (titles one line from ~1,440 up; below ~1,280 it stays 340 and titles wrap, accepted); preview `clamp(390px, 42cqw, 568px)` of the desk; answer tiles two across at most.
- Rows and group bands at full strength for good (the 0.62/0.8 fade is gone; the selected row's navy ring is the only marker); a hovered row hides its figure while the quick actions show.
- Ground: the To-do doodle tile (`public/images/todo/doodle-tile.svg`), laid as the Query Centre lays its own; question headings Source Serif 4 600 20px; pop-up options in the serif, pop-up heading in Special Elite.
- Known: from ~1,460 to ~1,600 wide the questions column is ~544–594px, and on step 2 (Back + "2 of 4" + Next) the footer overflows it and Next overlaps the preview by up to ~24px (todoV52 L6/L7 red at 1512). Locks: `tests/e2e/todoV57.measure.ts`; report `reports/todo-list-v57/REPORT.md`.
