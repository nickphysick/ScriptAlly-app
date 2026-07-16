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

## PHASE C — spotlight tour (Act 1 only)

**Act 2 (the desk-walk sheets) is DROPPED per the pack — not built.** Stop 5's button reads
**"Done"** (not the ref's "Try it →") and ends the tour.

**The overlay** (`TodoTour.tsx` + `todoTour.ts`): a fixed scrim (rgba ink .55) with a moving
rounded cutout (the box-shadow-hole technique), soft white outline, **450ms ease between stops**
(`prefers-reduced-motion` → no transition); the coach card in the header's grammar (white, 1.5px
ink border) — mono "N OF 5" + progress dots (done = hk-spine, current = burgundy), Playfair
heading, ≤25-word body, **Skip the tour** (always), **Back** (from stop 2), **Next → / Done**.
**The five stops, copy VERBATIM from the ref** (snapshot-locked in `todoTour.test.ts`): the
post-its → the Urgent reel → the first urgent card's ＋ Today's-list pill → the corner FAB →
"Work through priorities now". Targets are located by selector at open, scrolled into view before
measuring, recomputed on resize; **missing targets are filtered and the count renumbers** (a
replay on an urgent-empty board simply skips the pill stop). **Esc ends the tour (counts as
skip).** The scrim blocks board interaction for the duration.

**The flag — the one schema addition (pre-answered):** `User.tourSeenAt` (ISO timestamp) via the
established `hasSeenTour` pattern — types + `updateUserProfile` + the `firestore.rules`
`isValidUser` clause + the user-update allowlist entry (the rules diff is exactly those two
hunks). **Auto-run predicate** (`shouldAutoRunTour`, unit-locked): `tourSeenAt` absent ∧ NOT the
new-desk state — so it only auto-runs when the board has data. **The flag is stamped on Done AND
on skip/Esc**; never localStorage. ⚠️ Until the rules deploy lands, the stamp write is silently
denied (affectedKeys) and the tour re-offers per visit — dev rules deploy rides the next
"deploy to dev"; prod is Nick's.

**Replay — the ? popover:** recon found the corner ? NAVIGATES to /help globally (not inert), so
per the pack the popover ADDS rather than replaces: **on `/todo` only**, the ? opens a two-item
menu — "Help centre" (the existing action) + **"Replay the tour"** (dispatches
`sa:todo-replay-tour`; the board listens and opens the tour regardless of the flag). Every other
route keeps the direct navigate, byte-identical.

**Gates:** tsc clean · build OK · Vitest **1057** green (+6). `App.tsx` untouched (the popover
lives in AppShell.tsx); no PaintMode.

## FINALISE

- **SHAs:** A `3e2f190` (inert grammar) · B `4a4bb0e` (empty states + done-band rule) · C `<this>`.
- **Done-band rule applies POP-UP-WIDE** ✓ — the divider + band render only when `clearedToday`
  is non-empty, in every state, not just empties.
- **Disabled inventory → the grammar** ✓ — ribbon priorities button, pop-up Work-the-list, the
  focus-flow primaries/Back/Copy/Find, receipt + flip buttons: one shared `:disabled` block; the
  old opacity disables deleted.
- **Tour flag semantics** ✓ — auto-run = absent-flag ∧ not-new-desk; set on complete AND skip;
  cross-device (user doc, never localStorage).
- **? popover** ✓ — additive, /todo-scoped; Help centre preserved.
- **Deploys for Nick:** dev rules (`tourSeenAt`) ride the next dev deploy I run on request; prod
  hosting/rules/functions remain Nick's list.
- **Mobile note for the proper pass:** spotlight targets shift on mobile (the postits wrap, the
  FAB moves) — the hole/coach maths already recompute, but stop framing needs a mobile eye; flagged,
  not built.

**Nick eyeballs:** the new-desk state on a fresh dev account (welcome card + faded zeros + inert
button + both doorways) · B/C with seeded data (real counts in the lines) · E after clearing a
seeded desk · the pop-up morning state ("NOTHING YET", no done band, the new prompt) · a disabled
"Work the list" · the tour end-to-end (glide, Back, Done) + Esc-skip + replay from the ? popover.
