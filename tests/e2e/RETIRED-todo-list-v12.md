# Retired and re-pointed with To-do list v12 (29 Oct)

v12 restyles `/todo` (desktop) to `design-refs/todo-list-v12/todo-list-v12.html`. The changes behind these retirements:

- The page now opens with **Needs you now**, a carousel of the urgent tasks (`lib/todoUrgent`). The tray holds everything else under **Everything else**, so no task is listed twice.
- v7's **Today** card and the **"Your tray"** line are gone. Their figures are Needs you now's summary now, and the month opens from its **Calendar** button.
- The workspace's top row is an **open white toolbar**, not the navy bar. It holds Find, Filters, the sort and the pin; it has no sentence and no key hints.
- **All caught up** and **Nothing yet** open on the shared header card, like the populated page:
  - All caught up shows the blush acknowledgement band, then Coming up.
  - Nothing yet shows a faded example of the page beside "How this page works".

The new locks are `tests/e2e/todoV12.measure.ts` (L1–L15). Each was proved red before its green was trusted:

- Ten went red against the base build: L1–L6, L9, L12, L13 and L14.
- The other five (L7, L8, L10, L11, L15) are already green on the base, because v7 shipped their rules. Each is proved red instead by a named mutation, `TD12_MUTATE=<lock>`. The ledgers are in `reports/todo-list-v12/ledger/`.

## `todoV7.measure.ts` and `todoV7Shots.measure.ts` — retired whole

v12 supersedes v7's page. Each v7 case either moves to a v12 lock or goes with what it described.

| v7 case | Where its law lives now |
| --- | --- |
| **L1**: the header is PageHeaderCard, boxed as the Contact list's | **TD12 L1**, now in all three states |
| **L2**: Today is three count buttons and Open the calendar; no month on the page | **Retired.** The Today card is deleted. The urgent figures are TD12 L2's summary, and the Calendar button is TD12 L4/L9's. |
| **L3**: header above Today above Your tray above the sheet; scrollTop 0 | **TD12 L4**: header, Needs you now, Everything else, the sheet |
| **L4**: the navy row holds Find and Filters; no row hints | **TD12 L5**: the white toolbar holds Find, Filters, the sort and the pin, with no kbd and nothing navy |
| **L5**: no tablist; Set aside from the header; the row leads back | **TD12 L6** |
| **L6**: bands carry no image; only Your move has the ! mark | **TD12 L7** |
| **L7**: dates as words | **TD12 L8** |
| **L8**: the desk card has no tag, no image, no dashes, nothing uppercase | **TD12 L10** |
| **L9**: Done today on one line | **TD12 L11** |
| **L10**: pinned, the header and Today hidden; Find and Filters in the navy row | **TD12 L15** |
| **LP**: Pick a date moves an own task; Undo is exact | **TD12 L9**, which also asserts that a drag onto the drawer writes nothing |
| `todoV7Shots` 01–09 | `todoV12Shots` 01–13, named as the v12 pack's screens |

## `todoV52.measure.ts` — retired cases

| Case | Why |
| --- | --- |
| **F1**: the Your tray line reads Part B's overdue and today counts, the overdue part rust; the page titles | The Your tray line is deleted. The page still states its urgent figures with the overdue part rust: that is Needs you now's summary, held by **TD12 L2** and `src/lib/todoUrgent.test.ts`. The quiet states' page title is **TD12 L1**. |

## `todoV52.measure.ts` — re-pointed cases (the law kept, the subject moved)

| Case | What changed |
| --- | --- |
| **C1** and **E1**'s "F stands down with the calendar drawer open" | The drawer opens from Needs you now's **Calendar** button (`[data-td12="calendar"]`), not v7's Today card. |
| **J1** | The toolbar's mid-task signals read in plain words: "Task in progress" and "Step k of n". The desk band's own count, "STEP k OF n" in the journey shell, is unchanged. Leaving the journey gives the row back its Find, because there is no "Working through" sentence any more. |

## Unit tests

| Suite | What changed |
| --- | --- |
| `src/components/todo/v5/trayHeaderV52.test.tsx` | **TD52 F1 (unit)** is retired with `TrayHeadline`; `todoUrgent.test.ts` holds the summary's words now. **v7 L1 (unit)** is re-pointed: the body line is v12's, and the Nothing yet variant of the header is covered too. |
