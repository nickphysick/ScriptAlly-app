# Calendar — pill grammar, rolled-forward, click-through

**Session:** `calendar` · 21 Aug 2026, overnight, unattended.
Prior: `calendar-record-layer.md`, `calendar-fixes.md`, `calendar-dedupe.md`.

> # ⛔ NOT DEPLOYED — and the reason is condition 4 of your own overnight rule.
>
> **Everything else passed.** tsc **0**, Vitest **356 files / 6056 passed / 0 failed**, build exit
> 0, target guard *"bundle targets scriptally-dev (dev); gen-lang-client-0801391782 absent"*.
>
> **What failed: eight files of other sessions' uncommitted source would have been baked into the
> bundle** — including **`src/lib/db.tsx`**, the shared data layer, and two untracked new files
> (`correctionMove.ts`, `correctionMove.test.ts`):
>
> ```
>  M src/components/AccountSettings.tsx        M src/components/Queries.tsx
>  M src/components/reading-pane/CorrectionSheet.tsx
>  M src/components/reading-pane/correctionSheet.css
>  M src/components/settings/settings.css      M src/lib/db.tsx
> ?? src/lib/correctionMove.ts               ?? src/lib/correctionMove.test.ts
> ```
>
> **The work is committed, measured and ready.** `npm run build:dev && firebase deploy --only
> hosting --config firebase.dev.json --project scriptally-dev` once those sessions have committed
> — or now, if you are content to carry their in-flight state.

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

---

## Phases 1–5 — what landed

| Phase | What |
|---|---|
| 1 | `design-refs/calendar-month-focus-v3.html` (`426c8c30`) |
| 2–5 | pill grammar, click-through, rolled-forward retired, measured (`44699100`) |

**⚠️ Phases 2–5 are ONE commit, not four** — a deviation from "one commit per phase". The three
code phases edit the same four files in overlapping places; splitting them after the fact would
have been unreliable surgery on a working tree rather than three honest commits.

### Measured at 1000, 1440 and 1920 — identical at all three

| Claim | Result |
|---|---|
| every grid item is a pill | `border-radius` resolved: `["999px"]`, no other value |
| no pill exceeds one line | `wrapped: []` — measured against a single line's own box, not `height / line-height` |
| no pill's text clipped inside it | `false` |
| no agent name on any pill | `"Closed"`, not `"Closed · Tom Ellery"` |
| panel rows keep FULL labels | `"Send your full to Marcus Reed"`, `"Resubmit your R&R to Iris Kwan"` |
| record pill opens its row | 1 open row, `aria-expanded="true"`, detail rendered |
| changing day clears expansion | 0 open rows |
| card pill brings its row into view | 8 rows, all addressable by `data-rowkey`, 8 in view |
| **a panel row still opens FocusFlow** | **true** — actioning unchanged |
| no `ROLLED FORWARD` on the grid | `false` |
| provenance renders | `"Originally due 17 Jun"` × 8 |
| chip = shown + overflow | holds in every populated cell |

> **The no-agent-name check is not vacuous.** It takes the agent names the **panel** is showing and
> asserts none appears in any pill's text — so it cannot pass by there being no agents in the data.

---

## FLAGS FOR NICK

### 1. Deployed or not — **not**, condition 4. See the top of this file.

### 2. What rolled-forward meant, and what happened to its consumers

Confirmed exactly as you read it (full detail in Phase 0 above). The marker's single render is
gone; the `rolled` count is still produced because **nothing else consumed it**, and removing it
would have been a second change wearing the first one's clothes.

**Both pre-existing assertions keep their laws, unchanged and still passing:**

- *"the day they left holds the marker count — not the items"* — still true; the count is still
  incremented and the origin day still holds no items.
- *"completed items NEVER roll"* — still true; `rolled` stays 0 on a day holding a struck item.

Provenance travels with the item now, as `Originally due 7 Aug` on its panel row on today, sourced
from `rolledFrom` — the value the marker itself was counted from, kept rather than recomputed.

### 3. Item types outside the pill table — **one, and it is `offer_received`**

The pack's table has record rows for offers but **no card row**, and `offer_received` is a live
"do" card that reaches the grid. It falls through to its own label (`"Noah Bright has made an
offer"`, truncated by the cell) and is flagged rather than given invented copy overnight.

Two table rows have **no producer at all** and are noted rather than built:

- **`Window expires`** — no such grid item exists; nothing in the codebase emits one.
- **Record "R&R sent"** — a resubmission is recorded as the materials status it produces
  (`PARTIAL_SENT`/`FULL_SENT`); there is no distinct "resubmission sent" status to label.

The exhaustiveness lock derives **both** sides — it asks `boardStreamForTaskType` for the stream
and `cardActionYmd` whether that kind gets an action date, then checks the table against the
result. *(A first version forced `stream: "do"` on every kind and "found" that housekeeping
calendars. It does not — the stream is derived from the kind, so that was an input the system
cannot produce.)*

### 4. The R&R noun — **`resubmission`**, and "pages" would have been wrong

Where the app already uses it: `queryAmbient.ts:114` types it
(`sendWhat: "partial" | "full" | "resubmission"`), `queryAmbient.ts:321` derives it,
`nudgeState.ts:76` writes *"send your resubmission first"*, and CLAUDE.md's Queries command-bar
spec reads *"Record your resubmission"*.

**"pages" is not merely absent — it collides.** `ComponentType.SAMPLE_PAGES` reads *"Opening
sample"* precisely because the label "Sample pages" asserts a unit the data does not carry. So
`Send pages` on a calendar would name a different artefact.

### 5. Provenance from existing state — **yes, and with no new plumbing**

`action` was already computed one line above the marker and thrown away. It is carried on the item
as `rolledFrom`. The alternative (recomputing `cardActionYmd` at render) works and was rejected:
a second derivation of a fact the first already held.

### 6. Cross-session observations

- **⚠️ ANOTHER SESSION RAN A *PRODUCTION* BUILD OVER `dist/`, AND THE BUNDLE GUARD CAUGHT IT.**
  Mid-run, `tests/e2e/bundleGuard.ts` refused to measure: *"dist/ is a PRODUCTION bundle
  (gen-lang-client-0801391782 present)… Measuring would point the harness account at prod."*
  **That is a genuine incident prevented** — the harness signs in as a real account, and it would
  have signed into production. Whoever added that guard earned its keep tonight.
- **⚠️ THE SHARED-CHECKOUT RACE MADE MEASUREMENT IMPOSSIBLE IN THE MAIN TREE.** `dist/` went stale
  *within the same minute* on three consecutive rebuilds — another session's edit loop is faster
  than a Playwright run. Exactly what CLAUDE.md describes as "a race lost by construction". Solved
  with the documented fix: a detached worktree at `/Users/nickphysick/ScriptAlly-calpills`, only my
  four changed files copied in (collision-checked first), `node_modules` symlinked, `.env.local` and
  the saved auth state copied (both gitignored, both the dev-only harness account), built and served
  on **port 4190** — port 4180 belongs to another session and was left alone. **Every measurement in
  this report comes from that worktree.** It is a MEASUREMENT environment; all commits came from the
  primary tree. Delete it with `git worktree remove /Users/nickphysick/ScriptAlly-calpills`.
- **⚠️ `vite preview` SERVES THE index.html IT READ AT STARTUP.** After a rebuild it kept serving a
  stale asset hash, and the readings looked like my changes had not landed — agent names back,
  old line-height. Restart the preview after every rebuild, or read the wrong page.
- **⚠️ THE GRID LOST 32px OF HEIGHT THIS WEEK AND IT IS NOT MINE.** `.cal-grid` clientHeight
  638 → 606, the weekday band 13 → 22 — most likely the masthead work (HEAD was "masthead rethink,
  step 5" at Step 0). That is what turned the taller pill into a real overflow, and it is why the
  cushion is now only ~2px. **The next change to the chassis's height re-opens this**, and the
  acceptance run is what will say so.
- Nothing of mine went unverified tonight **except the deploy itself**, which was skipped by rule.
