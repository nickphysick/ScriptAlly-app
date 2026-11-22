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

## Other suites' desktop parts, updated on `dev/…-qc1522-td51` (their phone parts run unchanged)

- `corkboardV1.measure.ts` — **re-pointed.** B2: "Task" lands on `/todo` with the workspace's "A new task" form open
  (`[data-tws="add"]`), and nothing written. D1: the tick lands on `/todo` with that task on the desk (the desk's title
  field's value). The laws are unchanged.
- `hp2Lib.ts` — **re-pointed.** `LIGHT_HEADER_SEL` reads the workspace's header (`[data-tws="header"]`) for `/todo`, so
  `headerPanelV2` P1 and `headerV3` H1 still check that the route shows its own header.
- `headerPanelV2.measure.ts` P8 (the header's Set aside door) — **retired.** The workspace has no such door; its
  Snoozed and Done tabs are held by `todoWs.measure.ts`. P7 (the phone at 390) keeps `/todo`.
- `hr1.measure.ts` — **the To-do row retired** (its hero is gone; `todoWs.measure.ts` holds the workspace's header), and
  the `HR1-5` mutation re-pointed to Analytics' right card, the same law. `hr1Shots.measure.ts` — the To-do shot retired.
- `phoneAppV2Shell.measure.ts` (PA2-1) — **re-pointed.** The badge's reference is the phone To-do's own band tallies
  (earlier + today, the same chain as `lib/todoDueTally`), where it was the desktop tray's headline.
- `phoneAppV2Todo.measure.ts` (PA2-5) — **the desktop comparison retired** (band = the desktop tray's tallies); every
  phone check stays, including the snooze pop-up's (`[data-td5="pop-passed"]`, `.td5-pchips`, still rendered by
  `SetAsidePop`). Its floor drops by the one reading removed.
- `qcV138.measure.ts` D1 — **re-pointed note** (never asserted): it records the workspace's tray headings.

The workspace's own measurement is `tests/e2e/todoWs.measure.ts`.
