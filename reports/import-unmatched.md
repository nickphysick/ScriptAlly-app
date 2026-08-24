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
