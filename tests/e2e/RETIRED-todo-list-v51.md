# Retired with To-do list v51 (the task workspace, on the dev line), 6 Nov 2026

The desktop tray-and-desk page (`src/components/todo/v5/`, as To-do v7 and v12 left it) was replaced by
`src/components/todo/ws/` and deleted in the same change. Its measurements go with it: each named the tray's own probes
(`data-td5`, `data-td52`, `data-td7`, `data-td12`, `.td5-*`), which no component renders any more.

## Deleted

- `todoV5.measure.ts`, `todoV51.measure.ts`, `todoV52.measure.ts`, `todoV12.measure.ts` — the v5, v5.1, v5.2 and v12 locks
  (v7's were already retired into v12's, `RETIRED-todo-list-v12.md`)
- `todoV5Shots.measure.ts`, `todoV52Shots.measure.ts`, `todoV12Shots.measure.ts` — their screenshot walks
- `td5Lib.ts`, `td52Lib.ts` — their helpers
- `lib/deskDoing`, `lib/todoReviewAid`, `lib/todoUrgent` (+ tests) — read by the tray alone

## Kept, because the phone's To-do still reads them

- `lib/trayCalendar`, `lib/trayRows`, `lib/todoTray` — the phone page and the "{n} due" badge (`lib/todoDueTally`)
- `SetAsidePop` — moved to `src/components/todo/SetAsidePop.tsx`, with `MonthCal.tsx` (from the compose card) and
  `setAsidePop.css`: the rules from `todoV5.css` / `todoV52.css` that reached the phone (the unscoped ones), verbatim

## Cases in other suites whose desktop half is now retired (left in place, not edited)

These compare something against the desktop `/todo` page by the tray's probes. Their desktop reads find nothing and the
case fails; it does not pass vacuously. Each needs re-pointing at the workspace (`[data-tws=…]`) or retiring by its owner.

- `corkboardV1.measure.ts` (C-cases reading `[data-todo-v5] [data-td5="compose"]` and `[data-td5="desk-card"]` after the
  Corkboard's "+ Add a task" and its tick hand off to `/todo`)
- `headerPanelV2.measure.ts` + `hp2Lib.ts` (`[data-td5="header"]` in the light-header census)
- `hr1.measure.ts`, `hr1Shots.measure.ts` (the header rules' `/todo` row: `.td5-hd …`)
- `phoneAppV2Shell.measure.ts` (the desktop tray's headline beside the phone's count)
- `phoneAppV2Todo.measure.ts` (line 47: the desktop tray's `data-td7="count"` figures; its phone `SetAsidePop` cases stand)
- `qcV138.measure.ts` (line 366: the tray's calendar rows)

The workspace's own measurement is `tests/e2e/todoWs.measure.ts`.
