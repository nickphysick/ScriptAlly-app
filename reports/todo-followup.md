# To-do — Follow-up pack (empty states + disabled grammar + spotlight tour)

Refs committed: `design-refs/todo-empty-states.html` (states A–F + §G + the done-band rule, copy
FINAL) + `design-refs/todo-onboarding-tour.html` (Act 1 only — Act 2 desk-walk DROPPED per the
pack; stop 5's button reads "Done").

## STEP 0 — recon

1. **Tree clean; the retoken IS on main** — `bf9dd74 → a023be1 → a0125c2 → 3af7abe → ed7ffc8`
   (HEAD at pack start). No red-gate.
2. **View-model exposure:** per-lane counts (`board.do/nt`, `hkGroups` + `staleCards`), total
   query/agent counts (db context), `clearedToday` (`board.cleared` via `todaySplit().done`),
   housekeeping complete/total (`hkGroupProgress(agents.length, gaps)`) — everything the
   derivations need already exists; the new selectors are pure views.
3. **Doorway routes:** "Start your first query →" = `onNavigate("queries", "Log a query")` (the
   App.tsx:389 interception — opens the Log-a-query overlay, never navigates); "Add agents to your
   contact list" = `onNavigate("agents")` (the Contact List).
4. **The corner ?** = the AppShell's GLOBAL help FAB (fixed bottom:20 right:20), currently
   `onNavigate("help")` on every workspace route. Not inert — so per the pack, the popover ADDS
   "Replay the tour" alongside the existing action ("Help centre") rather than replacing it, and
   ONLY on `/todo`; every other route keeps the direct navigate. Wiring: AppShell opens the menu on
   /todo; "Replay the tour" dispatches a `sa:todo-replay-tour` CustomEvent the board listens for.
5. **User-doc field pattern** = the `hasSeenTour` precedent (Package Workshop): `User` type field +
   `updateUserProfile({...})` + a `firestore.rules` `isValidUser` clause + the user-update
   allowlist entry. `tourSeenAt` (ISO timestamp) follows it exactly. ⚠️ Until the rules deploy
   lands, the write is silently DENIED (affectedKeys) — the tour would re-run per visit; the rules
   edits ride this pack and the deploys are listed for Nick.
6. **Disabled-controls inventory:** ribbon "Work through priorities now" (empty Urgent set) ·
   pop-up "Work the list" (nothing committed) · focus-flow primaries awaiting input (the
   materials-gate "Tick what you sent", batch "Save N", review "Save N & finish" while saving) ·
   "← Back" at queue start · Copy-the-draft/✨ Find while busy · receipt/flip `.tdb-ra` buttons
   while saving. All previously opacity-dimmed.

## PHASE A — inert disabled grammar

ONE shared CSS block (ref §G) applied to every control from the inventory via their `:disabled`
states: paper fill · hairline border · faint text · no shadow · `cursor: not-allowed` · hover
pinned (no response). The old per-button opacity disables are DELETED — never dashed, never
opacity-only. The ribbon button already carries `disabled` when the Urgent set is empty, so it
adopts the grammar automatically; same for "Work the list" (real `disabled` attributes throughout —
`aria-disabled` comes free).

**Gates:** tsc clean · build OK · Vitest **1042** green.

## PHASE B — empty states + done-band rule

All derived (`src/lib/todoEmpty.ts`, unit-locked), nothing stored. **The state table as implemented:**

| State | Condition (pure `deskState` + per-lane) | Renders |
|---|---|---|
| **A · New desk** | `queries === 0 AND agents === 0` (beats everything) | Post-its keep their squares, numerals fade to 45% (`.zero`); ribbon button inert (grammar); the three reels are REPLACED by the welcome card — "A clean desk — *for now.*" + the explainer + **"Start your first query →"** (`onNavigate("queries","Log a query")` — the overlay interception) + **"Add agents to your contact list"** (`onNavigate("agents")`) + the CSS ghost-stack with the Caveat "— your future to-dos" |
| **B · Urgent clear** | data exists, `board.do` empty | Reel header stays; the slim spine card: sage tick disc · "Nothing needs you." · `liveQueriesLine(liveQueryCount(queries))` — real counts, singular handled ("Your 1 live query is with its agent…") · Caveat "— go write something" |
| **C · Housekeeping clear** | groups + stale both empty | "Spotless." · "Every agent record is complete and nothing has gone stale." · the progress bar at 100% with real counts (`hkGroupProgress(agents.length, 0)` → "N of N agents complete · 100%") |
| **D · Notes empty** | notes empty | The dashed ghost card — verified it survived the retoken; unchanged |
| **E · Desk cleared** | all three sets empty **AND `clearedToday` > 0** (earned, never default — unit-locked) | The reels collapse into the moment: sage disc · "Desk cleared." · "Nothing needs you, the records are spotless, and today you cleared:" · the REAL strikethrough list (cap 5 + "and N more", `clearedListCap`) · Caveat "— the waiting is the work. Go write." |
| **F · Pop-up empties** | always-on rules | Committed band empty → "What's on the list today?" / "COMMIT UP TO 5 FROM THE BOARD — OR LET US PICK" (the prompt only renders at zero); header chip "NOTHING YET" at zero; **the "Done today" divider + band do not render at all until the first completion exists — pop-up-wide, not just in empty states** (the old "Nothing cleared yet today." filler is gone); the done chip renders only with a count; "Work the list" takes the inert grammar; the FAB reads "Nothing yet" at 0/0 |

Precedence: **A beats everything; E beats B+C+D; otherwise per-lane** — locked in `todoEmpty.test.ts`
(9 tests: precedence, E-requires-cleared, live-count lines incl. singular, the list cap).

**Gates:** tsc clean · build OK · Vitest **1051** green (+9).
