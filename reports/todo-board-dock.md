# The board redesigned — and where the dock stands (6 Aug 2026)

> **THE PACK IS COMPLETE.** Phases 1–3 landed first; **Phase 4 (the dock) is now built** — see
> "Phase 4 — the dock" at the foot. The interim it replaced (Action now opening the item sheet) is
> gone.

## SHAs

| SHA | Phase | Note |
|---|---|---|
| `72f6138` | **P1 + P2** | Paired: they interleave in one file, and splitting them would have left a commit where the search was deleted and its replacement not yet built. |
| `0aafdea` | **P3** | |
| `<this>` | **P5**, scoped to what landed | |

**Tests: 159 files, 2636 passed | 2 skipped** (from 158/2605). Three new lock files; ~30 existing
cases retargeted to the retired surfaces, none loosened.

## The two causes the brief asked for

**⚠️ Why the band's family map regressed: it never regressed — it was never CARRIED.**

The family map exists in the old card grammar (`.tdb-band.do/.hk/.nt` in `todo.css`). When the
board was built in Phase 4 of the previous pack, its band rule was written **fresh** from the one
card the ref happened to draw — an urgent one — so that family's tint became the band's only tint.
Nothing overwrote anything; a distinction simply did not make the journey between two grammars.

That is why the lock is on the **map**, not on four colours: a per-colour test would have passed
happily on that urgent card. It now asserts all four families have a rule **and that the four tints
are distinct**, because four rules painting one colour is the same bug wearing more CSS.

**⚠️ How the drag path bypassed undo.** `quickDone` is the completion primitive: it writes, then
raises the toast whose Undo reverses the write. The board's drag-to-Done branch called
`updateUserTask` with the completion field **directly** — the write without the toast — so a card
dropped on Done finished with no way back. Both paths run `quickDone` now, and a test asserts no
board path writes that field itself. This is the one place the board could do real harm, since a
completion you cannot reverse is not recoverable by trying again.

## What landed

**P1 — the tool row is the page's one instrument.** The standalone control bar and the view toggle
are gone; the page is the board, cards only. Search, sort, ▶ Focused session and ＋ Add (which had
been orphaned mid-page) are all in the header. It rides `actionsSlot` rather than `actions`, and
that is a judgement: the max-two law is about ACTIONS competing for attention, and this row is two
instruments beside two buttons. **Retired with it:** `renderLedger`, the three group cards and
`snoozedRows` — the rows view, which was never the default and so was the one nobody saw.

**P2 — FILTERS.** Everything · Urgent · Housekeeping · Your tasks, one active, narrowing all four
columns, counts from the cards the columns render. Snoozed and Notes rows deleted with reasons (a
column, and a facet that could only return nothing); the Notes row is a road sign to the Noteboard.

**P3 — bands, matrix, undo, verbs.** Above, plus: Done accepts user-task ticks only and a derived
card **bounces** with a per-kind verb phrase; the ⋯ menu names acts, never "Move to X"; an offer's
Dismiss renders disabled and says why.

## One mistake worth recording

The splice that removed the control bar **also took the AssistantBand with it**. Its own test caught
it inside the same run and it was restored. Worth writing down because it is the argument for the
page-chrome tripwire built during the corrections pass: a large deletion in a 2,000-line render
tree removes things you were not looking at, and only a test that reads the *page* rather than a
*function* will notice.

## Where this stopped, and why

The brief named the split point: *"if budget runs short, the clean split point is before Phase 4 —
commit, update STATE.md, and say so rather than half-building it."*

Phase 4 is a new 30/70 work surface: queue rails, a work surface with a derived timeline, and
**four per-kind inline flows** — including record-sent's one-act-three-records (write the activity,
move the query status, tick the task, all through existing primitives) — plus completion advance,
keyboard navigation, and the unification of "Work the list" and "Focused session" onto it with
FocusFlow's chrome retired. Starting it with what I had left would have produced a dock that
mounted and did not finish work, which is worse than none: the board's cards would gain an Action
that opens something unusable.

**So Phase 4 is untouched and unstarted.** `Action now` and the bounce toast's `Open` both route to
the existing item sheet, which is exactly what the brief specifies as the interim ("until then it
opens the item sheet").

## For Nick — the walk

**https://scriptally-dev.web.app**, signed in, `/todo`.

| # | Check |
|---|---|
| 1 | **No control bar.** The header carries search · ⇅ Most pressing · ▶ Focused session · pink ＋ Add. No second instrument row, and no dead band where it was. |
| 2 | **Sort reorders all four columns.** Try Most pressing → A–Z → Newest. An offer should lead under Most pressing. |
| 3 | **FILTERS** reads FILTERS, with Everything active. Click Urgent — all four columns narrow, not just one. Counts should match what you can count on screen. |
| 4 | **No Snoozed or Notes row.** In their place: "Notes to self live on the Noteboard →", and it should route there. |
| 5 | **Band colours.** Urgent cards pink, housekeeping latte, your own tasks sage, Done muted sage. Four different tints. |
| 6 | ⚠️ **Drag a derived card (e.g. "Send your full to…") onto Done.** It must BOUNCE with "Sending the full is what completes this — open the action". Drag a *user task* onto Done — that one completes. |
| 7 | ⚠️ **Undo:** tick a user task from the card, then complete another by dragging to Done. **Both** should raise a toast with a working Undo. |
| 8 | **The ⋯ menu** says Action now · ＋Add to today · Snooze… · Open the query · Dismiss. On an offer, Dismiss is greyed and reads "Dismiss — not for offers". No "Move to" anywhere. |
| 9 | On a card in **Today**, the ⋯ verb reads "− Take off today". |
| 10 | **Action now** opens the item sheet — expected; the dock is Phase 4 and unbuilt. |


---

# Phase 4 — the dock

## SHAs

| SHA | What |
|---|---|
| `ca96721` | CLAUDE.md: the two git-discipline rules this session paid for |
| `afbf5e4` | **P4 — the dock** |

**163 files, 2676 passed | 2 skipped** (from 161/2641). Two new lock files: the pure model (12) and
a **rendered** surface (23).

## What it is

30/70. **Left, the queue** — slim rails in the board's own column order, filtered view respected,
handed over rather than recomputed, so what you walk is what you were looking at. The docked rail
is **ringed in ink**; the others are **not dimmed**, because they are where you go next.

**Right, the work surface** — the family band (the board's own map, so a card looks like itself
when it docks), Playfair title, the record line, the timeline **derived from the activity log**,
then the flow for the kind: agent-waiting gets the send, stale the close, offers and housekeeping
hand off to the flows that already own them, a user task gets its detail and its tick.

**The foot** carries the flow's ink primary, Snooze, ⋯ and the "NEXT: {item}" line — or says
plainly that you have reached the end.

## The three decisions worth stating

**⚠️ ONE ACT, THREE RECORDS — and only two of them are writes.** Recording a send calls
`recordMaterialsSent`, the existing primitive: it appends the MATERIALS_SENT activity **and** moves
the query's status. The third record — the task going away — is **derived, not written**. The
engine generates a `partial_requested` task *because* the query sits at PARTIAL_REQUESTED, so
moving the status retires the task by construction. A write there would be a second record of a
fact the first already carries, and the two would eventually disagree. **The test asserts the
absence**, not merely the presence: no `resolveTaskFlag`, no completion field, in that function.

**⚠️ The dock performs nothing itself.** It decides what to OFFER; the page runs the primitive.
Sends go through `recordMaterialsSent` with its undo; user tasks through `quickDone`, the same call
the board's tick makes; offers, stale closes and housekeeping hand off rather than the dock growing
a second implementation of a dialogue that exists.

**⚠️ Advancing offers the next item; it never runs it.** A surface that started the next act on
your behalf would be deciding at exactly the moment you had stopped paying attention, having just
finished something.

## Unification

**Action now**, the **bounce toast's Open**, **"Focused session"** and Today's **"Work the list"**
all call `openDock`. The queue is the only thing that differs between them.

`FocusedSession` is **retired** — it was a second work surface, and two of them would have had to
agree about what "done" means; the first time they disagreed one would have been silently wrong.
`FocusFlow` survives as the per-kind flow engine, which is what it was always good at. Eight
existing cases across two files were retargeted to the retirement.

## The two rules CLAUDE.md gained, and why

Both were paid for earlier in this session, and both are now written where the next person will hit
them before repeating them:

- **After explicit-path staging, `git status` must be clean before the gates are believed.** A
  retargeted lock in `src/lib/` was left behind by a commit staging `src/components/todo/`; the
  local suite was green against a tree the commit did not contain; CI was right.
- **Comments are not guards — a constraint worth a warning comment is worth a test.**
  `ToDoPage.tsx` carried a verbatim warning against post-return `const`s that the render reads, and
  the bug was written into that same file, in a session that had read the comment, and shipped as a
  page that would not load through a fully green suite.

## For Nick — the dock walk

**https://scriptally-dev.web.app** → `/todo`.

| # | Check |
|---|---|
| 1 | Click a card, or ⋯ → **Action now**. The page should **split 30/70** — queue left, work surface right. Not a modal over the board. |
| 2 | The **docked rail is ringed in ink**; the rest stay readable. Click another rail — it switches. |
| 3 | **Esc** (or ×) returns to the board **at the scroll position you left**. Scroll halfway down first to test it properly. |
| 4 | On an **agent-waiting** card ("Send your full to…"): the ink act reads **"Record the full as sent"** and is **disabled** until you tick "the full — as they asked". |
| 5 | ⚠️ **Record it.** One act should: write the activity, move the query to Full Sent, **and make the card disappear from the board** — the last being derived, not a separate tick. Check the Queries Hub agrees. Then **Undo** from the toast. |
| 6 | After completing, the dock **advances to the next item and stops** — it must not start it. |
| 7 | A **user task** in the dock offers "Mark it done"; that one does tick. |
| 8 | ⚠️ Drag a derived card to **Done** on the board → it bounces → click **Open** in the toast → **it docks** (it used to open the item sheet). |
| 9 | **▶ Focused session** in the tool row, and **Work the list** on `/todo/today`, both open this same dock. |
| 10 | **Keyboard:** ↑↓ walk the queue, Enter fires the primary, Esc closes. Typing in a field must not trigger any of them. |
