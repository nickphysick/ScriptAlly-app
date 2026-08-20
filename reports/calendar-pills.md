# Calendar — pill grammar, rolled-forward, click-through

**Session:** `calendar` · 21 Aug 2026, overnight, unattended.
Prior: `calendar-record-layer.md`, `calendar-fixes.md`, `calendar-dedupe.md`.

> **DEPLOYED / NOT DEPLOYED — filled in at Phase 5.** *(Placeholder; the overnight deploy rule
> decides, and the outcome is written here first.)*

---

## Step 0 — gates

- **Red gate — another session mid-edit in `src/components/todo/`:** `git status --porcelain` →
  **empty**. Clear.
- `main`, level with `origin/main` at Step 0 minus the tree's 27 unpushed commits from other
  sessions; HEAD `183a27ad` ("masthead rethink, step 5") — not mine, and moving.
- **Whole-tree dirt: 3 files**, all another session's measurement output
  (`reports/pane-round/*.png`, `run-artifacts/pane-round.txt`). **No source.**
- **Baseline `tsc`: 0 errors.**

---

## Phase 0 — RECON: what "ROLLED FORWARD" means

### Nick's read is confirmed. Phase 4 proceeds.

### 1. Where it is produced, and the exact condition

`src/lib/todoCalendar.ts:166`, inside `calendarDays`'s live-items loop:

```ts
for (const c of [...input.cols.todo, ...input.cols.today]) {
  const action = cardActionYmd(c, input.queries);
  if (!action) continue;
  const family = c.returnedToday ? "snoozed" as const : liveFamilyOf(c);
  if (action < input.today) {
    /* ⚠️ ROLL-FORWARD: the item renders TODAY; the origin day keeps one marker. */
    day(action).rolled += 1;
    day(input.today).items.push({ key: `cal-${c.key}`, ymd: input.today, label: c.title, family, card: c });
  } else {
    day(action).items.push({ key: `cal-${c.key}`, ymd: action, label: c.title, family, card: c });
  }
}
```

**Condition:** a **live** card — from `cols.todo` + `cols.today`, so nothing completed and nothing
housekeeping — whose `cardActionYmd` is *strictly before* today.

**Semantics:** exactly as Nick read it. The item renders on **today**; the day it left keeps a
count of how many left, not the items themselves. It is provenance about a move, not a record of
anything that happened on that day — and the roll is derived from the clock on every read, so
nothing is stored and nothing moves at midnight.

### 2. What consumes it — three places, all accounted for

| Consumer | What it does |
|---|---|
| `TodoCalendarPage.tsx:512` | `{rolled > 0 && <span className="cal-rolled">{rolled} ROLLED FORWARD ↗</span>}` — **the only render** |
| `todoCalendar.test.ts:114` | *"the day they left holds the marker count — not the items"* — asserts `rolled === 2` **and** `items` empty |
| `todoCalendar.test.ts:125` | *"completed items NEVER roll"* — asserts `rolled === 0` on a day holding a struck done item |

**No panel line, no header count, no other surface.** `dayData`'s `{ items: [], rolled: 0 }`
default (`:366`) and the destructure at `:453` are plumbing for that one render.

> **⚠️ THERE IS A SECOND, UNRELATED "ROLLED" AND IT IS NOT THIS ONE.** `ToDoPage.tsx:1340` uses
> `rolledOverCards` (`todoWalk.ts:35`) — *committed* items whose day has passed, surfaced once in
> the gold Keep/Clear bar. `todoBoard.ts:556` states the relationship in its own words: **"The two
> counts are independent."** Deleting the calendar's marker touches neither that bar nor its
> derivation. Recorded because a grep for `rolled` returns both, and conflating them would have
> looked like a much bigger change than it is.

### 3. Does the task genuinely appear on today? — **Yes, and it is already asserted**

The same `if` branch that increments the marker pushes the item into `day(input.today).items`.
`todoCalendar.test.ts:109` asserts precisely that:

```ts
it("the items render on TODAY", () => {
  expect(days.get(TODAY)!.items.map((i) => i.label)).toEqual(["Chase the reference", "Second one"]);
});
```

**So deleting the marker loses provenance and nothing else.** The work is on today either way.

### 4. Provenance for Phase 4 is available without plumbing new state

The original date is `action` — computed **in that very branch**, one line above the marker, and
currently discarded. Carrying it onto the item is not new state: it is the same value the marker
was derived from, kept instead of counted.

The alternative — recomputing `cardActionYmd(item.card, queries)` at render — also works (the
function is exported and pure, and the page has `queries` in scope at `:214`). It is rejected:
that would be a **second derivation** of a fact the first one already had, and this file's whole
history is of two readings of one fact drifting apart.
