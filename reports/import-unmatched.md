# F-AF — what a failed CSV match does

Ruling: **import every row, and say what did not resolve.** Ref: `design-refs/import-unmatched-rows.html`.

## Step 0 — recon

### ⚠️ F-AG — R1's audit found nine more, and they are a different disease from the three ids

The three known invented **ids** are real and are fixed in Phase 1. But the same file invents nine
**values**, and two of them are worse than a broken id because they are plausible:

| line | write | what it invents |
|---|---|---|
| 335 | `agency \|\| "Independent"` | an agency name for a real person |
| **336** | **`email \|\| "unlisted@agent.com"`** | **a fabricated email address on an agent's record** |
| 345 | `mswlNotes \|\| "Imported MSWL focus points."` | wish-list notes the agency never wrote |
| 353 | `notes \|\| "Imported from Zite archives."` | a note the writer never made |
| 405 | `genre \|\| "Fiction"` | a genre for the writer's book |
| **407** | **`logline \|\| "A compelling new manuscript."`** | **a logline for a book the app has not read** |
| 410 | `ageCategory \|\| "Adult"` | an age category |
| 446 | `personalisationNotes \|\| "Zite query backup logs."` | what the writer said to that agent |
| 570 | `description \|\| "Activity logged via CSV Import."` | what happened |

`unlisted@agent.com` is the one to look at first: it is a real-looking address on a real person's
record, and nothing downstream distinguishes it from one the writer supplied. `logline` is the same
fault in the writer's own voice — the app writing a sentence about their novel and storing it as
theirs.

**Flagged, not fixed.** D1 is scoped to ids, and each of these is a separate call: some may be
defensible defaults for a form field, and none should be changed by a run that was not asked to.

### ⚠️ F-AH — R2, measured: absence is denied; `""` is the storable form

```
manuscriptId ABSENT → DENIED      manuscriptId: "" → ACCEPTED
agentId      ABSENT → DENIED      agentId: ""      → ACCEPTED
both ""                          → ACCEPTED
```

`isValidQuery` requires `manuscriptId is string` and `agentId is string`. **An existing convention
fits** — `""` is already this model's word for "no link" (`packageId`, and `UNFILLED_SLOT` for
package slots) — so there is no red gate and no new sentinel was invented.

### R3 — and the storable form alone is NOT enough

**`Queries.tsx:2338`, inside the one shared filter predicate:**

```js
const agent = agents.find(a => a.id === q.agentId);
const ms = manuscripts.find(m => m.id === q.manuscriptId);
if (!agent || !ms) return false;
```

A query whose agent **or** manuscript does not resolve is dropped from the list entirely — at every
scope, with no filter selected, and with nothing to say it is there. Measured: two probes planted
(`ms-does-not-exist` and `""`), 46 queries stored, **44 rows rendered**. Both invisible.

> **So `manuscriptId: ""` still fails `!ms`.** Phase 2 has to change this predicate, not just the
> stored value. That is the whole of D2's work, and the recon is what showed it — the fix looked
> finished after Phase 1 and was not.

⚠️ **And a correction to my own earlier reports.** My Part D and F-AD censuses said "scope All". No
such control exists in that toolbar — `getByRole("button", {name: /^all$/i})` matched nothing and the
click was a silent no-op. **The sweeps were complete anyway**, because the list is not scoped by the
shell's manuscript chip: 34 queries on `seed-ms-1` and 10 on `thin-ms`, and all 44 rendered. The
counts stand; the reason I gave for them was wrong.

### R4 — the wizard's step 3 is a progress view, so the summary needs building
### R5 — `agentDisplay.ts` already handles a record with no agent NAME (the agency leads). An agent that does not RESOLVE AT ALL is a different state and is new.

## Phase 1 — the three invented ids are gone

`manuscriptId: foundMs?.id ?? ""` · `agentId: foundAgent?.id ?? ""`, and an activity with no
resolvable query is **not imported and reported by row number** (D4):

> Activity row {n}: no query matches this manuscript and agent, so there is nothing to attach the
> event to. Import the query first, then this row.

That is the one case where dropping is right — an event with nothing to attach to is an orphan, not
a record — and reporting the row number is what separates it from the silent skip the ruling
rejects. `q-seed-fantasy` was worse than either: the activity was written, attached to a query that
does not exist, and visible from nowhere.

## Phase 2 — Unassigned visibility

### ⚠️ Two independent gates on the same fact, and only the second was load-bearing

Fixing `matchesFilters` alone changed **nothing**: 47 stored, 44 rendered, exactly as before. The
list joins its rows a second time —

```js
.map((q) => ({ q, agent: agents.find(…), ms: manuscripts.find(…) }))
.filter((r) => !!r.agent && !!r.ms)      // ← the one that was actually dropping them
```

— so the predicate agreed to show a row and the join discarded it a few lines later. **A fix that
reads correctly and measures unchanged is the signature of a second gate.** Only measuring found it.

### ⚠️ And removing it took the whole app down

With the join opened up, the list rendered **0 rows and sign-in never completed**. The cause was
`agentDisplay.ts`: `nm = (a) => (a.name || "").trim()` dereferences its argument, so an absent agent
threw. Every workspace page stays mounted, so a throw in the query list kills the shell on **every**
route — the page-won't-load shape, from one query whose `agentId` resolved to nothing.

The helpers already handled a record with **no name**; they had never been given **no record**. Those
are different facts and now say so: `AGENT_NOT_SPECIFIED` ("this agent has no name on file") and the
new `AGENT_NOT_RECORDED` ("this query names an agent we hold nothing about"). Initials render `–`
rather than `?` — a question mark reads as confusion about a record that exists.

### Measured

```
stored 47 · rendered 47 · difference 0        (three probes: no ms, no agent, neither)
rows rendering an empty label : 0
Unassigned scope offered      : "Unassigned · 2"
rows under Unassigned         : 2
```

⚠️ **Two, not three, and that is the design.** "Unassigned" is a **manuscript** scope, so it holds the
two probes with no manuscript. The third has a manuscript and no agent — a **per-row state** (D3),
not a scope. Scoping by "missing agent" would file a query under something it lacks rather than
under the book it belongs to.

The scope is **derived, never stored** (`unassignedCount`) and is offered only when something is in
it: an always-present "Unassigned" would teach that the state is normal, and an absent one on an
account that has some would hide them.

## Phases 3 & 4 — the summary and the banner, and why they are quiet

Both are built. **Three counts** — matched / need a decision / skipped — with the third in the
page's parchment rather than a blush, because a row missing its manuscript is *work, not damage*.
The rows-needing-a-call list renders **only when there is one**: a list that is always present and
empty teaches the eye to skip the place the problems appear.

The banner on the query list is **derived, undismissable, and leaves on its own**: a query is
flagged because its manuscript or agent does not resolve, so it appears when the first such row
arrives and goes when the last resolves. No stored field, no dismissal state — measured: banner
present with four flagged rows, absent once they were removed.

### ⚠️ AND THEY ARE CURRENTLY UNREACHABLE, WHICH IS THE FINDING OF THIS RUN

Driving the wizard with a CSV built for all three failure cases produced **four imported queries and
zero rows needing a decision.** The importer does not leave a row unmatched: **it auto-creates the
missing record.**

```
manuscripts: 2 auto-created   ms-autoimport-…  title "A Book That Does Not Exist"
                                               logline "Imported automatically to preserve Query relationships."
                                               genre   "Uncategorized Fiction"
agents     : 3 auto-created   agent-autoimport-…  name "Nobody At All"
                                                  email "imported@zite.com"
```

So the old `|| "ms-seed-fantasy"` only ever fired when the auto-create itself failed — a tier limit,
a denied write. **The common path was never a dangling id; it was a fabricated record.**

And it is the same disease Nick's ruling was aimed at, one level up. A logline is the writer's
sentence about their own novel, and the app writes *"Imported automatically to preserve Query
relationships."* into that field. `imported@zite.com` is a second fabricated-email path, distinct
from F-AG's `unlisted@agent.com`. A row that matched nothing becomes a manuscript on the shelf and a
contact in the list, with no summary line and nothing to say either was invented.

> **This is Phase 5, and it already exists — running automatically, without asking.** Whether an
> unmatched row should create a record or be flagged is the inverse of what the importer does today,
> and it is a product decision rather than a fix. **Not changed.** Phase 5's own clause — drop it and
> report if it grows beyond the import's write path — applies exactly: this is not building
> create-from-row, it is deciding whether the existing silent creation should stop.

**What the pack leaves in place regardless:** no invented ids (Phase 1), and any row that *does* end
up unresolvable — from a failed auto-create, from prod data, from a future path — is now visible
under Unassigned with a banner, instead of vanishing. The safety net is real even where the summary
is quiet.

---

# Overnight run — retire auto-create, light up the flag flow (24 Aug)

## Step 0 — recon

**Red gates: all clear.** No other session holds `ImportCsv.tsx`, `Queries.tsx` or `agentDisplay.ts`
(only `src/marketing/*` is dirty, and is another session's). Retiring auto-create touches the
import's own write path and nothing else. R2 holds.

### R1 — the two auto-create paths, and what they fabricate

Both sit **inside the query import**, at `ImportCsv.tsx:467` and `:492`. They are distinct from the
Agents and Manuscripts import categories (`:380`, `:432`), which create records because that is what
those imports are *for*.

| | manuscript (`ms-autoimport-…`) | agent (`agent-autoimport-…`) |
|---|---|---|
| | `genre: "Uncategorized Fiction"` | `agency: "Pending Match"` |
| | **`wordCount: 80000`** | **`email: "imported@zite.com"`** |
| | `logline: "Imported automatically to preserve Query relationships."` | `genres: ["Fiction"]` |
| | `ageCategory: "General Adult"` | `mswlNotes: "Auto-profile created via historical query logs."` |
| | | **`starRating: 3`** |
| | | `responseTimeWeeks: 8` · `noResponseMeansNo: true` · `materialsWanted: ["Query Letter"]` · `notes: "Added during Zite CSV import."` |

⚠️ **Two beyond what I reported last run.** `wordCount: 80000` is a specific figure for the writer's
own book, and `starRating: 3` is a rating of a real person the writer has never rated. Both are
written silently and are indistinguishable afterwards from values the writer gave.

**When auto-create itself fails** (a tier cap, a denied write) `foundMs`/`foundAgent` stay undefined
and the row falls through to the Phase 1 code — `manuscriptId: ""` / `agentId: ""`. That is the only
path by which the shipped flag surfaces can currently be reached.

### R2 — re-measured, and the shipped safety net rests on something true

```
manuscriptId: "" + agentId: ""  → ACCEPTED
manuscriptId key omitted        → DENIED
agentId key omitted             → DENIED
```

### R3 — F-AG, the complete list with dispositions

| line | value | disposition |
|---|---|---|
| 472–477 | the manuscript block: genre · **wordCount 80000** · logline · ageCategory | **fixed** — block retired (D1) |
| 498–509 | the agent block: agency · **email** · genres · mswlNotes · **starRating** · responseTimeWeeks · noResponseMeansNo · materialsWanted · notes | **fixed** — block retired (D1) |
| 344 | `email \|\| "unlisted@agent.com"` | **fixed** — a fabricated address that could be sent to |
| 415 | `logline \|\| "A compelling new manuscript."` | **fixed** — the writer's sentence about their own novel |
| 413 | `genre \|\| "Fiction"` | **fixed** (D4) — unset when the CSV does not supply it |
| 418 | `ageCategory \|\| "Adult"` | **fixed** — a claim about the book |
| 454 | `personalisationNotes \|\| "Zite query backup logs."` | **fixed** — this field is *what the writer said to that agent* |
| 353 | `mswlNotes \|\| "Imported MSWL focus points."` | **fixed** — wish-list notes the agency never wrote |
| 343 | `agency \|\| "Independent"` | **fixed** — "Independent" is a factual claim about where someone works |
| 361 | `notes \|\| "Imported from Zite archives."` | **flagged** — provenance, and *true*; but it is written into the writer's own notes field |
| 604 | `description \|\| "Activity logged via CSV Import."` | **flagged** — same shape: true provenance, in a field the writer owns |
| 372 | `responseTimeWeeks: 8` (agent import) | **flagged** — a real default with a meaning, not a fabrication; needs a call |
| 1373 | `act.details \|\| "--"` | **benign** — display only, writes nothing |

The three flagged are held back deliberately: each is either *true* or a genuine default, and Phase
4's instruction is to fix the unambiguous and flag the rest.

### R4 — D3's count: **zero**

`ms-autoimport-*`: 0 of 2 manuscripts. `agent-autoimport-*`: 0 of 16 agents. The only ones that ever
existed on dev were created by my own drives last run and removed at the end of it. **Nothing to
leave alone, no migration to decline.**

## Phase 2 — auto-create retired, and the quiet surfaces light up

The two blocks are gone. An unmatched row now falls through to the Phase 1 code, is recorded in
`unmatchedList`, and reaches the summary and banner that shipped last run with nothing to carry.

### Measured — the same CSV, the same three failure cases

```
records auto-created : manuscripts 0 · agents 0
rows in CSV          : 4          queries created: 4      (nothing skipped)
summary counts       : "4 Successfully Imported" · "0 Lines Failed / Skipped" · "3 NEED A DECISION"
summary rows         : Row 3  Needs a manuscript — no match for manuscript “A Book That Does Not Exist”
                       Row 4  Needs an agent — no match for agent “Nobody At All”
                       Row 5  Needs a manuscript and an agent — no match for
                              manuscript “Another Missing Book” · agent “Also Nobody”
list census          : 52 rendered of 52 stored          (zero dropped)
banner               : "6 queries are missing a manuscript or an agent."
banner once resolved : absent
```

Each row states **what is missing**, never a verdict — "Needs a manuscript", not "invalid row" (D8).

⚠️ **The banner read 6 while the drive had made 4, and that was correct.** Three flagged rows
survived an earlier run that errored before its cleanup. The count is derived from the data rather
than from the import, so it counts what is there — which is the property that makes it a record
rather than a receipt. Verified the other way too: with the last flagged row removed, the banner is
gone.
