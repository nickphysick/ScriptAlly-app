# Retired and re-pointed with To-do list v7 (29 Oct)

v7 restyles `/todo` (desktop) to `design-refs/todo-list-v7/todo-list-v7.html`. The changes behind these retirements:

- The header is the shared `PageHeaderCard`.
- The month leaves the page: a Today card shows the counts, and the month lives only in the slide-out drawer.
- The tray's tab strip, the band drawings and the row dials are gone.
- The desk card is calmer, and Done today folds to one line.
- Dragging a row onto a day is retired (Nick's ruling, 29 Oct). The date menu's "Pick a date" is now the only way to move a date.

The new locks are `tests/e2e/todoV7.measure.ts` (L1–L10, LP).

## `todoV52.measure.ts` — retired cases

| Case | Why |
| --- | --- |
| `A1 capture` and **A1**: the header's height equals the base's; the card takes the header row's height | The calendar card left the header, and with it the `contain: size` rule A1 held. Retired, not re-pointed, as the brief says. |
| **A2**: nothing inside the calendar card clips, at five widths, on three days | The card in the header is deleted (S1). |
| **A3**: the four parts are the tray; the bar is in proportion; Overdue filters without scrolling | The mix bar is deleted (S1). "Overdue filters" is TD7 L2, on the Today card. |
| **A4**: a future day lists its kinds; a past open day reads STILL OPEN; a clear day; the foot returns | The Today card shows today only. The other days live in the drawer, which is unchanged and covered by C1. |
| **A5**: one dot per kind on the page's month | The page has no month (S1). |
| **D1**: one drawing per group, standing 3px above its band's floor | The bands are plain headings (S4), which supersedes the 17 Oct ruling. TD7 L6 asserts no image and the paper tint. |
| **G1**: hovering a dated row lights its day; hovering a day lights its rows | The page's month is gone, so there is no day to light. |
| **G2**, its drag half: "an own task by drag", "a drop on today is refused", "a drop past the ceiling writes nothing, and says why" | Drag onto a day is retired (Nick's ruling). Moving an own task through "Pick a date", with Undo, is TD7 LP. |

The td52Lib mutations for these cases are deleted with them: `A1`, `A2`, `D1`, `D1b`, `F1`, `F1b`.

## `todoV52.measure.ts` — re-pointed cases (the law kept, the subject moved)

| Case | What changed |
| --- | --- |
| **C1**: the drawer opens, its filters, Month and Week, Open on the desk | It opens the drawer from Today's "Open the calendar" (`data-td7="open-calendar"`), not the retired ⤢. |
| **E1**: the pin | "Find is back in the filter row" becomes "Find leaves its pinned form; the header is back": Find lives in the navy row pinned or not (S2). The drawer is opened as in C1. |
| **F1**: the urgent words | The words left the h1 for the "Your tray" line (`data-td7="headline"`). The caught-up page's title is "To-do list" (the card), and its line reads "All caught up". The long-title-fit half is retired with the title it fitted. |
| **F2**: overdue tags | The tag reads as words ("4 mo overdue"), with the same figure and unit (`lib/trayRows.lateWords`). |
| **F3**: contrast | Text clipped by the page's scroller is skipped: v7's "Your tray" heading has no ground of its own, so with the sheet at the top it lies above the scrollport, over the shell's ink, where nobody can see it. F3 also caught real faults in v7's first pass (the ref's 55–58% greys); those are fixed in `todoV7.css` rather than excused. The top screen's population floor drops from 40 to 12 texts: it now holds the header card and Today (16 texts at 1280, 26 at 1512). The sheet keeps its floor of 40. |
| **G3** and **H1**: the slips that land | S7 folds the slips under the desk. The count is read from "Done today · n cleared" (`doneN`): three closes add three, and a double E adds one. |
| **J3**: the quiet tray | The date is read as `[data-td5="dial"]`, which the date in words (`.td7-due`) carries. J3 caught the dimming rules still naming only `.td5-dial`; those are fixed in `todoV52.css`. |
| **G2**: the menu half | The menu's last item is "Pick a date", and under a passed send-by it is absent. |

## Unit

| Suite | What changed |
| --- | --- |
| `src/components/todo/v5/trayHeaderV52.test.tsx` | Re-pointed: TD52 F1's words are asserted on `TrayHeadline` ("All caught up" added). The h1's v5.1 count form is retired, and v7 L1's unit half is added (the card, the body lines, the two buttons, the v5 header's parts gone). |
