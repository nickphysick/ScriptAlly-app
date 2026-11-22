# Retired by Corkboard v15 (18 Nov 2026; ref design-refs/corkboard-v15/)

Corkboard v15 rebuilds the desktop page (≥768px) as `Cb15Desk` + `Cb15Dialogs`; the phone keeps v2 / v2.1's
components and layout, with its pile words changed to stack. Every Corkboard v2 (`corkboardV2.measure.ts`) and
v2.1 (`corkboardV21.measure.ts`) lock is listed here, lock by lock: **kept**, **re-pointed** (its law moved to a
v15 lock) or **retired** (no successor), and why.

## corkboardV2.measure.ts (v2, 6 Nov) — the file stays; superseded cases are `test.skip` with a RETIRED note

| Lock | Subject | Fate | Why / where the law went |
|---|---|---|---|
| CB1 | five papers; the old three mapped on read with no write on load | re-pointed | v15 C19 (same law on the v15 wall) and C6 (colour + Undo) |
| CB2 | the old panel header | already retired (14 Nov) | wsHeaders H1/H6/H7 |
| CB3 | glance filter fades to 22% | re-pointed | v15 C1: each figure filters to exactly its notes; v15 hides, it does not fade (the ref) |
| CB4 | Special Elite on a post-it | re-pointed | v15 C5 (face on every wall note) |
| CB5 | clamp and Read all | re-pointed | v15 C5 |
| CB6 | pinned first in every sort | re-pointed | v15 C3 |
| CB7 | reorder writes one order leaf, My order | re-pointed | v15 C7 (order + sort in one write; the wall follows; the pinned line holds) |
| CB8 | piles: a drop sets the first tag, keeps the rest; New pile mints | re-pointed | v15 C8 (drop on a tag pill) and C6 (Move to stack + Undo); the mint is unchanged code (`resolveTag`) |
| CB9 | Add a task writes /todo's fields; Turn into a task writes dueDate | re-pointed (Turn) / retired (Add) | Turn: v15 C6. Add a task is the To-do list's own `AddTask`, unchanged code and write; its field-for-field lock is not re-run on the desktop (open item in the report) |
| CB10 | view and sort survive a reload | re-pointed | v15 C20 |
| CB11 | empty: Pick a colour to start, four examples, Keep this | re-pointed | v15 C2 and C11 (three examples now — v15's, not NOTE_EXAMPLES) |
| CB12 | phone at 390: no overflow, one column, nothing draggable | **kept** | the phone is unchanged; v15 C15 also reads its words |
| CB13 | to-do composer Note mode | already retired | — |
| CB14 | rules accept the five papers, the old three and pinned | **kept** | rules are unchanged; not a page lock |

## corkboardV21.measure.ts (v2.1) — the file is deleted

| Lock | Subject | Fate | Why / where the law went |
|---|---|---|---|
| CB15 | the new-note tile: last child, post-it size, opens the pop-up, gone while filtered | re-pointed | v15 C4 (the ghost is the last tile of the deal) and C13 (the pop-up); v15 keeps the tile while filtering, as the ref |
| CB16 | start-pile doors (heading button, dashed tile, menu's New pile…) | re-pointed | v15 C9 (+ Start a stack tile), C6 (More lists New stack…), C15 (the Start a stack pop-up opens from + New stack) |
| CB17 | start writes: #agents with two ticked notes | retired | v15's Start a stack has no "put notes in it" list (the ref); with a note (More → New stack…) it files that one note — exercised by hand, not locked (open item) |
| CB18 | an empty pile listed; a note drops it off; Remove pile | re-pointed (listed) / retired (Remove) | v15 C9 (empty stack dashed, open says so); Remove stack is the phone's only |
| CB19 | add notes to a pile | retired | not in v15 (the ref); the phone keeps it |
| CB20 | the clash line | retired | v15's Start a stack has no clash line (the ref); the phone keeps it, re-worded "stack" in Phase 2 |
| CB21 | no overflow at 1280 and 390, pop-up open and closed | re-pointed | v15 C16 (1280 / 1512 / 1717, 14 and 60 notes); the phone half is CB12 |

## Files deleted with them

| File | Why |
|---|---|
| tests/e2e/corkboardV21.measure.ts | its cases are above |
| tests/e2e/corkboardV21Shots.measure.ts, tests/e2e/corkboardV2Shots.measure.ts | desktop pictures of v2 / v2.1; superseded by corkboardV15Shots.measure.ts (the v2 file's one phone shot is not re-taken: the phone is unchanged) |
| tests/e2e/cb21Emu.sh | started the emulators without `emu-guard` (it was `src/test/emuGuard.test.ts`'s one offender on this line); v15 runs through `npm run e2e:emu` |
| tests/e2e/cb2Mutate.mjs, tests/e2e/cb21Mutate.mjs | red-first mutations aimed at v2 / v2.1 desktop sources that no longer draw the desktop; v15's red-before proof is a run against the base build (reports/corkboard-v15/REPORT.md) |
