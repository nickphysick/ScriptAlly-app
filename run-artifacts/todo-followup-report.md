# To-do follow-up run — report

**Baseline:** 322 files · **5667 passed** · 2 skipped · **0 failed**.
**Final:** 328 files · **5744 passed** · 2 skipped · **0 failed**. +77 tests, no regressions.
Follows `todo-overnight-report.md` (`f4726e9`, `3749fce`, `c4eef53`, `632c2ba`, `cba5323`).

---

## ⚠️ Premises in THIS brief that turned out false

The last brief's premises were wrong about the page. This one is much closer — but three things
were not as described, and one of them is the same shape as last time.

1. **`design-refs/todo-materials-contract.html` does not exist.** Named as "the visual contract",
   absent from the repo. This is the **fourth** time a named mockup has been missing in this project
   (CLAUDE.md already records *"the specified `design-refs/` dir was ABSENT again"*). Two recent
   candidates exist under other names — `132-materials.html` ("materials interaction", 17 Aug) and
   `158-notes-materials.html` (18 Aug). I took layout intent from the brief's own prose and values
   from the live stylesheet, which is what the brief says to do when they differ.
2. **Phase C's `materialLabel` already existed** — as a *passthrough returning the raw stored
   string*. Its name described the string's shape rather than its job, which is very likely why a
   reader concluded no display map existed. Renamed to `materialToken`; `materialLabel` is now the
   display map.
3. **The architecture Phase C asks for was already in place.** `materials.ts` declares itself the
   single formatter every screen routes through, so "covering letter" reached the query detail, the
   timeline, the CSV export and the editor by changing **one return**.

Also worth correcting: **`exclusive_expiring`**, cited in `cardJourney`'s note as a live kind that
would have hit the send fall-through, now survives **only in test fixtures**. And
**`response_overdue`** is compared twice in `Dashboard.tsx` but is never produced by the engine — a
dead comparison, named here, not fixed.

---

## What landed

### `4732c0b` — Phase A: make task completion explicit per journey
*landed (code + unit + measured at 1440×900), +11 tests*

- `completionVia`'s default was `"mark-sent"` — **a status write**. Every task type ever added
  shipped with a write attached until someone opted out. Two kinds had already reached it that way
  and each was closed **by hand**.
- `TASK_TYPES` census + `TaskType` union; the switch is exhaustive and closes on the house idiom
  `const unhandled: never`. **Verified by adding a member and watching tsc fail**, then reverting.
- **No write changed.** `mark-sent` is now exactly the three kinds that are really sends — the same
  three `sendSpecFor` recognises and the same three `getPrimaryAction` answers "mark-sent" for
  (probed directly). Everything else that reached it was already a no-op.
- **What did change is visible:** an offer card drew a tick that silently refused, because
  `quickDone` re-checks the status. *A second mechanism is not a fix.* Measured: ticks now appear on
  exactly the three sends, two closes and four user notes; offer 0, materials 0, sweep 0.
- Third-door audit: 11 other switch/map defaults over task or journey type. **None writes** — they
  return copy, `null`, or a bucket. `cardJourney`'s `return "send"` is the same *shape*, guarded
  downstream by `isSendTask`; reported, not changed.
- `CLAUDE.md`: a default branch may not perform a write.

### `16a32be` — Phase B: exclude closed queries
*landed (code + unit + measured), +2 tests*

- **Measured on the page: the bulk card went from "19 queries" to "10 queries."** Nine were closed.
- ⚠️ **`isTerminalStatus`, not `queryBucket` — and they genuinely disagree.** `queryBucket` files an
  **Offer** under "closed" because no action is owed; that is right for a filter pill and wrong
  here. Reusing the nearest-looking derivation would have silently dropped every offer. Locked as a
  reconciliation between the two.

### `c856fdd` — Phase C: display labels without a rename
*landed (code + unit + measured), +16 tests*

- `materialToken` (comparison) vs `materialLabel` (display) — opposite jobs, no longer one name.
- **Nothing stored moved**, and the diff proves it: `MAT_OPTS[0]` unchanged, `types.ts` untouched,
  both seed files untouched.
- ⚠️ **Measuring found a site the sweep missed.** After routing the naming constants, `/agents` read
  12 "covering letter" and 0 tokens — and `/queries` still rendered **one raw token**. Four display
  sites in `Queries.tsx` were still hard-coding it. Now zero raw tokens on all three routes.
- ⚠️ **One site deliberately left:** `Queries.tsx:1795` builds a persisted **activity description**.
  Relabelling would make new entries read "Covering letter attached" while every existing one says
  "Query letter attached". The brief says anything persisted stays. **Open call for the morning.**
- Out of scope, recorded: marketing copy, the Help centre's "Query Letter Variants" feature name,
  and Comparable titles' "Query letter line" — those name a feature or a pitch line, not a material.
- The `createFrames` fixture was regenerated through its own flag and the diff read: exactly three
  label spans, nothing structural.

---

## Choices this brief did not cover

1. Took materials design intent from the brief's prose (the named mockup is absent).
2. Left the persisted activity description at `Queries.tsx:1795` on the token (above).
3. Phase A returns `"none"` for `offer_received`, removing a tick that could never write. Behaviour
   preserving in every write sense; visible in that one affordance disappears.
4. `TASK_TYPES` omits `exclusive_expiring` — a census states what the app can produce.

### `c9fe505` — Phase D: the single-query materials form
*landed (code + unit + measured at both viewports), +9 tests*

One step, because the query already answers three of the send's four questions. **No date field** —
it states "These attach to the query sent on 4 May 2026 — no new date is recorded." Nothing ticked
on open; the agency's requirements are a **button**. Measured: 0 ticked, then 2 after "Start from
this", strip reading "Will record: Covering letter · Synopsis".

⚠️ **The one constraint is structural, not careful.** `updateQuery(id, { materialsWanted })` writes
only the fields handed to it, and the field is one.

⚠️ **The target is the query, not the send activity — a recorded trade-off.** The rules name
`Activity.materials` canonical, but nothing writes it, there is no `updateActivity`, and an imported
query may carry no send activity. **This is the top thing to revisit.**

Three faults the page showed: a **duplicate row** (`other` rendered twice), the primary reading
generic **"Action"**, and — the interesting one — the summary saying **"Choose how this one ended."**
`journeySummary` was an if-ladder *ending* on the close journey's sentence. Phase A's fault one
register along: a permissive default answering *as* another journey. Now exhaustive.

### `70a8ade` — Phase D (second half): closed queries stay fixable
*landed (source-locked + measured), +4 tests*

**Nothing needed building.** `Queries.tsx` already carries the §2 materials editor — same four rows,
`toggleDocMaterial`. A second one *is* the fork the brief forbids. It is **not status-gated**, which
is what makes Phase B's exclusion safe; locked as the absence of a terminal-status guard.

⚠️ **Not verified end-to-end:** I could not select a specifically *closed* query in the Query Centre
from this account (rows print no status, no Closed filter pill found). The claim is from source plus
the editor rendering generally. **Worth one manual click.**

### `5b6161c` — Phase E: the bulk table
*landed (code + unit + measured), +16 tests*

⚠️ **The brief asked for full width; the pane is 378px and the contract says otherwise.**
`PaneSweep`'s own note: a cohort "is not a different kind of object from a task". The columns became
a row's own lines. Deviation taken on the contract's authority.

Measured: 5 rows + "Show 5 more", oldest first, 0 ticked, 0 editors open, **"Record 0 queries"
disabled**, "Leave them all unrecorded" beside it. After fill: "Record 10 queries". Copy-down
propagates.

⚠️ **One acceptance item could not be demonstrated here, and I checked rather than guessed.**
"Fill produces different values per row" measured *identical*. The unit tests prove the function
differentiates — so I read the data: the Contact list carries 12 materials lines and **exactly one
distinct summary**. Every agency on this account asks for the same two things. (My first check
looked conclusive and was not — a per-name lookup matched a shared ancestor five times.)

### `10a80ea` — Phase G: acceptance
*+21 tests*

Status-write assertion **verified red** by injection. On the page: 0 zero-height boxes, 0 page scroll
at both viewports, **0 console errors beyond the 6 known duplicate-key warnings**.

⚠️ The probe's own false alarm is recorded: it first reported six zero-height boxes on a page with
none, because the workspace keeps 7 other pages mounted and a child of a hidden *ancestor* still
computes `display: block`.

---

## Phase F (Pro) — skipped, and not for time

The harness account is **Free**, there is **no dev plan override** anywhere in `src/`, and this run's
standard is that a claim is verified on a real page. Building a version picker I could not measure
would produce exactly the "landed in code" claim both reports argue against. The brief ranks F first
to cut.

Its contingency does **not** apply: `SubmissionPackage.samplePagesVersionId` is structured, not free
text — there is no string to refuse to parse. **What it needs is a Pro fixture or a plan override.**

---

## ⚠️ The one thing to look at first in the morning

**Where recorded materials are stored.** Phase D and E write `Query.materialsWanted`. The rules
commit (`1a0c397`, 17 Aug) says `Activity.materials` is canonical because the query-level field is
ambiguous between "what they ask for" and "what you sent" — but nothing writes it, there is no
`updateActivity`, and an imported query may have no send activity to attach to. Both paths go
through one encoder, so moving them later is one function, not two surfaces. **It is cheap now and
expensive after data accumulates.**

## Pre-existing, named not fixed

- **The foot hint squeeze.** Measured across journeys on a 378px foot: materials 53px/4 lines, close
  82px/4, **send 51px/7**. The worst is the oldest journey — shared CSS, needs its own walk.
- **Duplicate React key warnings on `/todo`** — 6 per load, unrelated, uninvestigated.
- **`Queries.tsx:1795`** builds a persisted activity description from the token. Relabelling would
  split the timeline between old and new wording. **Open call.**
- **`response_overdue`** is compared twice in `Dashboard.tsx` and never produced by the engine.
- Everything in the brief's out-of-scope list.

**Nothing on the do-not-touch list moved.** `recomputeQuery`, `StatusDot`, `MountPanel`,
`HubHeaderBar`, `packageMetrics`, the nav, `#/pkg-lab` and `functions/` are all untouched. No deploy.
