# To-do workspace — consistency audit

A pass across every settled piece (four pages, board, lifecycle, snooze/dismiss, batch, composer, suggested bench, shell) looking for places where two parts of the design disagree, and gaps where a rule is missing. **Resolved** items have a decision baked; **Decide** items need your call before the packs are cut.

## Contradictions found

**1. The counts don't reconcile — RESOLVED (rule proposed).**
The panel badge says To-do 44; the lists say Urgent 3 + Housekeeping 41 + Your tasks 2 + Notes 6 = 52. Nothing defines what 44 counts. Rule: **the badge counts actionable items** (urgent + housekeeping + open user tasks); **notes are excluded** — they are dateless by definition and nothing chases them, so they don't inflate the number that means "things waiting on you". One derivation, used by the badge, the page count, and the hero line. Invariant test: badge == list page total == board total.

**2. A note appeared in the board's Snoozed column — RESOLVED.**
My own mock put "Comp titles idea" in Snoozed. Notes can't be snoozed (snooze is a date; notes have none) and can't be done (no tick). Rule: **notes never appear on the board**. The board holds actionable work; the Noteboard holds notes. (Fixed in fix84.)

**3. Auto-surfaced Today items vs "you built this list" — DECIDE.**
The surfacing rule (a dated task joins Today on its day, or earlier per its offset) quietly contradicts "Today is a list you built". Both are right; the seam is removal: what happens when you remove an auto-surfaced due-today item from Today? Proposed: removing it opens the snooze popover — a due item leaves today's list with a new date or not at all, and its card always carries the DUE TODAY chip explaining why it arrived. Alternative: allow plain removal and let it reappear tomorrow. **The snooze-on-removal version is recommended** — it keeps the list truthful.

**4. Snoozed items had no home in the list view — RESOLVED.**
The page sidebar's LISTS (Urgent / Housekeeping / Your tasks / Notes) lost the old Snoozed facet, so in list view snoozed items were findable nowhere except the board. Rule: **LISTS gains a fifth row, Snoozed {n}**, and the To-do list page shows a collapsed "Snoozed · {n}" band at its foot. Dismissed stays out of LISTS by design (Task settings ledger only), and search's include-toggle covers both.

**5. Calendar keeps completed items forever; the board clears Done at midnight — RESOLVED (same fact, two lenses).**
Not a true contradiction once stated: Done-at-midnight clears the *working surfaces*; the activity log keeps everything; **the calendar renders completed pips from the log**, struck through, on the day of completion. Rule stated so CC derives both from one source.

**6. Suggested bench could suggest what you've silenced — GAP CLOSED.**
Rule: suggestions exclude snoozed and dismissed items always, exclude anything already on Today, and never include notes.

**7. Two quick-adds, two meanings — RESOLVED.**
"＋ Add a task or note…" (Your tasks group) opens the composer. "＋ Add something to today…" (Today page) creates a **task due today** — and typing there never creates a note. Adding an *existing* item to Today is only ever ＋Add/drag. One verb per control.

**8. The composer has no tag control — GAP CLOSED.**
Tags attach to notes and tasks, but the composer and item sheet never offered them. Add: a tag picker row in the composer (both modes) and in the item sheet; tags survive note→task conversion.

**9. Two searches, one page — RESOLVED (already designed, now stated).**
⌘K = global, jumps anywhere including the four To-do pages. "Search your list" = narrows the current page only. The include-snoozed-and-dismissed toggle belongs to the page search on To-do list; ⌘K always searches everything.

**10. Board columns must equal their sources — INVARIANT.**
Today column == Today page == panel Today count; Snoozed column == Snoozed list; Done column == today's log entries. These are the same derivations rendered thrice; tests assert equality so the board can never drift into a second system again.

## Confirmed consistent (checked, no action)
- Note↔task by presence of dueDate (CC's model) == the Noteboard's "give a note a date and it becomes a task" == the composer's two natures. One rule, three surfaces.
- Roll-forward: undone items move to today; snoozed items are not "undone" until they return; dismissed items never appear on the calendar.
- Focused session works Today's list; the board's Today column feeds it; no competing "doing" state remains.
- Offers: no dismiss anywhere (rows, sheet, board — an offer card cannot be dragged to Snoozed beyond tomorrow), batch-excluded, cannot be deleted.
- Due-day promotion is derived at render (never stored), so the board's Today column and the Urgent group can't disagree.

## The one decision outstanding
Item 3 (removal of auto-surfaced due items). Everything else is baked and ready for the packs.
