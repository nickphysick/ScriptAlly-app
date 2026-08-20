# Calendar — the record layer + day panel

**Session:** `calendar` · **Started:** 20 Aug 2026 (overnight, unattended)
**Basis:** `reports/calendar-rebuild-recon.md` (previous pack's recon), re-read from disk before Step 0.

---

## Step 0 — recon

### Gate checks

- `git rev-parse --abbrev-ref HEAD` = `main`; `git rev-list --count HEAD..main` = **0** (level).
- HEAD at Step 0 = `6302474a` ("settings: the sessions control goes") — the Account settings
  session, committing normally.
- **Red gate 1 — another session mid-edit in `src/components/todo/`:** `git status --porcelain
  src/components/todo/` → **empty**. Clear.
- **Red gate 2 — `TodoCalendarPage.tsx` absent/renamed:** present, 14,899 bytes. Clear.

**Neither gate tripped. Proceeding.**

### Baseline (recorded before any edit)

- **tsc: 6 errors, all in `tests/e2e/pkgRestructure.measure.ts`** (Submission packages session —
  `Property 'stage'/'stepWidths'/'plateHeights'/'onScreen'/'ticks' does not exist on type
  'unknown'`). **Zero in any calendar-owned file.**
- **Vitest: 333 files passed, 5645 passed, 2 skipped, 0 failed.** Green.
  *(For contrast, last night's baseline was 5581→5614 with a failing To-do lock; the Account
  settings session has since fixed the `AccountSettings.tsx` anchor it broke. Recorded fresh, not
  copied.)*

---

### 1. `Activity` shape, and which store is authoritative for a date range

`src/types.ts:493`:

```ts
export interface Activity {
  id: string; userId: string; queryId: string; manuscriptId: string;
  activityType: ActivityType;
  description: string;
  date: string;      // ISO String
  details: string;
  resultingStatus?: QueryStatus;   // absent on non-status events and pre-migration records
}
```

Always present: `id`, `userId`, `queryId`, `manuscriptId`, `activityType`, `description`, `date`,
`details`. Optional: `resultingStatus`. **There is no `agentId` and no direction field** — the
agent must be resolved `queryId → Query.agentId → Agent`, and direction derived.

`ActivityType` (`src/types.ts:474`) has **twelve** members, and they are coarse:

```
STATUS_CHANGED "Status Changed" · NUDGE_SENT "Nudge Sent" · OFFER_ACCEPTED · OFFER_DECLINED
QUERY_SENT · MATERIALS_SENT · AGENT_ADDED · AGENT_UPDATED · AGENT_DELETED
MANUSCRIPT_ADDED · MANUSCRIPT_UPDATED · MANUSCRIPT_DELETED
```

Plus **one cast-in member outside the enum**: `HOLDING_REPLY_TYPE = "Holding Reply"`
(`src/lib/holdingReply.ts:38`, written to the global feed at `:127` via
`as unknown as Activity["activityType"]`, rules-validated). It is the **only** such cast —
verified by grepping `as … Activity["activityType"]` across `src/lib` and `src/components`.

> **⚠️ The consequence for Phase 2, and it shapes the whole derivation.** Every agent reply —
> partial requested, full requested, R&R, rejection — is a single `STATUS_CHANGED` row.
> The fine-grained meaning lives in **`resultingStatus`**, not in `activityType`. So `RECORD_TYPES`
> cannot be a whitelist over `activityType` alone; it must be a table keyed on `activityType`
> **and**, for `STATUS_CHANGED`, on `resultingStatus`.

**Two stores, and they have different shapes:**

| | Per-query nested events | Global projection |
|---|---|---|
| Path | query subcollection | `users/{uid}/activities` |
| Shape | `{ type, createdAt, dateProvisional? }` | `Activity` (`activityType`, `date`) |
| Type vocabulary | `QueryStatus` values + `"Nudge sent"` / `"Holding reply"` (sentence case) | `ActivityType` + `"Holding Reply"` (Title Case) |
| Read by | `buildTimelineRows` (`QueryTimeline.tsx:199`) | the dashboard timeline, `assembleBoardColumns` |

`logNudge.ts:52` names the relationship: *"The global-feed PROJECTION twin
(`users/{uid}/activities`) — what the dashboard timeline reads. Derived from the same build as
`nested`… the caller writes both under ONE shared id."*

**Authoritative for a date-range read across all queries: the global projection.** The nested
events are per-query subcollections — a month view would need one read per query. The global feed
is one collection, already loaded.

### 2. Reading activities across queries — **no new database reads needed**

`src/lib/db.tsx:521`:
```ts
unsubActivities = onSnapshot(collection(db, "users", uid, "activities"), (snap) => { … });
```

**Unwindowed — the whole collection, live, already in memory** (`db.tsx:352`
`const [activities, setActivities] = useState<Activity[]>([])`).

`TodoCalendarPage.tsx:50-52` already destructures everything the record layer needs:

```tsx
const { tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser }
  = useScriptAllyDb();
```

So the page can call a pure `recordDays(activities, queries, agents, range)` with **zero** new
reads, no new hook, and no change to `assembleBoardColumns` (which receives the same `activities`
array for its own purposes). There is no existing windowed selector, and none is needed —
filtering an in-memory array by `ymd` range is the whole job.

### 3. `TimelineComposer` — **not callable, because nothing calls it at all**

Props (`TimelineComposer.tsx:85`):
```ts
{ query, agent, manuscript: {title},
  onOpenRichForm: (responseType, draft?) => void,   // opens RecordResponseFocusForm
  onMarkSent: () => void,                            // opens MarkSentPopover
  onNudge?: () => void }
```
Correction entry point is an imperative handle (`:79`):
```ts
export interface TimelineComposerHandle { focus(); startEdit(entry: ComposerEditEntry); }
export interface ComposerEditEntry { activityId; status; label; dateISO; note; }
```
It reads no router param and no reading-pane context — only `useScriptAllyDb()` and `useToast()`.

**But it has no importer anywhere in the repo.** `grep -rn "from ['\"].*TimelineComposer" src tests`
→ **empty**. `grep -rn "TimelineComposer" src --include='*.tsx'` outside its own file returns three
hits, **all of them comments**. `Queries.tsx:5388` claims:

> *"TimelineComposer itself survives for the dashboard's own flows; only this mount went."*

**That claim is not true** — there are no such flows, and no other mount. Tracing `editActivity`
to a rendered root:

| Call site | Reachable? |
|---|---|
| `TimelineComposer.tsx:230` — the only component call | **No** — component has no importer |
| `Queries.tsx:314` — destructured from the db context | **No** — destructured and never called |
| `db.tsx:2521` — the primitive itself | n/a |

**So no correction UI for *editing* an entry is reachable on any rendered surface today.**
Deleting one is (`Queries.tsx:1003` `onDeleteEntry` → `deleteActivity`, with a derived-consequence
confirm). Editing is not.

> This **corrects my previous report**, which answered flag 4 with *"Yes. `TimelineComposer.tsx:230`
> calls `editActivity`"*. The code exists; nothing mounts it. I checked the definition and not the
> reachability — the exact trap CLAUDE.md names (*"trace it to a rendered root… upward, so you do
> not spend a session hardening something nothing renders"*). It matters here because this pack's
> Phase 5 was written on the strength of that answer.

**Decision for Phase 5: EDIT THIS ENTRY routes to the reading pane.** Building a calendar-local
editor is fenced out, and mounting an unmounted component with three stub callbacks into Query
Centre flows would be a second action surface with dead chips.

### 4. `FocusFlow` from a record row — **it cannot take one; the record must route**

`FocusFlow.tsx:62`:
```ts
export type FocusItem = { kind: "card"; card: BoardCard } | { kind: "group"; group: HkGroup };
```

No third member. A record entry is an `Activity`, not a `BoardCard`, and manufacturing a synthetic
`BoardCard` to squeeze one in would put a fabricated card through a journey that writes.
**Confirmed: the record layer routes, and never opens a flow.** Live card rows in the day panel
keep opening `FocusFlow` exactly as the pips do today — same call, same props.

Deep-link target: `/queries?q=<queryId>` (`App.tsx:334`). **There is no activity-level anchor** —
so "route to the reading pane *at that entry*" can only land on the query. Flagged (8).

### 5. `calFoldCap` — **yes, the `+N` counter can be starved of its line**

`src/lib/todoCalendar.ts:242`:
```ts
export function calFoldCap(rowPx: number): number {
  if (!rowPx || rowPx <= 0) return CAL_CELL_CAP;          // 3
  const room = rowPx - CAL_CELL_CHROME;                    // 26
  /* one row is reserved for the "+N MORE" line itself whenever anything folds — counting it here
     would let a cell promise a pip it then has to take back to make room for the fold line */
  const fits = Math.floor(room / CAL_PIP_H);               // 19
  return Math.max(1, Math.min(CAL_CELL_CAP, fits));
}
```

**The comment says a row is reserved. The arithmetic does not reserve one.** `fits` is pure pip
capacity; nothing subtracts the height of `.cal-more2`, which the cell renders *in addition* to
`cap` pips whenever anything folds.

Worked example — `rowPx = 83`: `room = 57`, `fits = 3`, `cap = 3`. The cell then draws 3 pips
(3 × 19 = 57px, exactly filling the room) **plus** `.cal-more2`
(`font-size:6px; padding:3px 2px 0`, `todoCalendar.css:64`), against a cell that is
`overflow: hidden` (`:41`). The counter is clipped. The window is roughly `rowPx` 77–96; above it
`fits ≥ 4` and the cap of 3 leaves slack, below it `cap` drops to 2 and slack returns. At the
`Math.max(1, …)` floor the same clipping recurs.

**Per the pack: flagged, not fixed.** `calFoldCap` is untouched this run, and record pips fold
through it unchanged as ordinary cell occupants.

### 6. `todoCalendar.css` structure, and whether a day panel fits the chassis

Scoping is flat, page-prefixed `cal-*`, no nesting on the shared chassis:
`.cal-grid` (`:12`, `display:grid; grid-template-columns:repeat(7,1fr); gap:6px`) ·
`.cal-cell` (`:34`, `min-height:0; overflow:hidden; display:flex; flex-direction:column`) ·
`.cal-d`/`.cal-c2` (`:48`,`:53`) · `.cal-pip` (`:55`, + `.struck`/`.inert`) ·
`.cal-more2` (`:64`) · `.cal-rolled` (`:68`) · `.cal-legend` (`:80`) ·
`.cal-dayscrim`/`.cal-daypanel` (`:89`,`:90` — the existing centred modal).

**The chassis takes a panel without being touched.** `TasksPageLayout` (`:110`) renders:

```tsx
<WorkspacePageGrid className="tpl-wpg" fill …>
  <div className="tpl-cols">
    {sidebar && <aside className="tpl-side">{sidebar}</aside>}
    <div className="tpl-body">{children}</div>
  </div>
</WorkspacePageGrid>
```
with `.tpl-cols { display:flex; align-items:stretch; gap:26px; flex:1; min-height:0 }`
(`tasksLayout.css:148`) and
`.tpl-body { flex:1; min-width:0; display:flex; flex-direction:column; min-height:0 }` (`:150`).

So `children` lands in a flex column that already carries the `min-height: 0` chain. A two-column
split (grid + panel) built **inside `children`** needs only my own classes and my own stylesheet.
The `sidebar` prop is the *left* aside and is the To-do list's; I do not use it.

> Note the chain is exactly the one CLAUDE.md warns about (*"a converted page's `flex:1;
> min-height:0` chain needs a flex parent"*). `.tpl-body` supplies it, and `fill` is already on the
> grid. I will measure rather than assume.

---

## Findings that change Phase 2's design (stated, not silently resolved)

**`statusDirection` cannot supply the record layer's `dir`, and reusing it would be wrong.**
`StatusDot.tsx:95` classifies *pipeline direction*, and its own comment says so:

```
out    — writer-side / outgoing (Queried, Partial Sent, Full Sent, Offer)
in     — agent request / incoming (Partial Requested, Full Requested, Revise & Resubmit)
closed — terminal (Rejected, Withdrawn, No Response, and any unknown)
```

The pack asks for **authorship** — *"writer-originated = out, agent-originated = in"*. The two
disagree on real rows:

- **Offer** is `statusDirection → "out"`, but an offer is something the **agent** sent you.
- **Rejected** (agent), **Withdrawn** (writer) and **No Response** (neither) all collapse to
  `"closed"`, which a two-valued `dir` cannot hold at all.

Painting an offer as writer-authored is precisely the kind of quiet untruth the record layer exists
to avoid. So `RECORD_TYPES` carries **both label and direction per record kind**, as one declared
table — which is what the pack asks for anyway (*"stated once and can be read at a glance"*) — and
I do **not** import `statusDirection` into it. `StatusDot` is untouched. Flagged (1).

---

*Recon complete. No code written in this step. Report committed alone.*

---

# Build log — Phases 1–6 COMPLETE

All six phases landed on `main`, seven commits, one per phase plus a cleanup. **No deploy.**

| Phase | Commit | What |
|---|---|---|
| 1 | `c827fd10` | the design ref |
| 2 | `a1d4336f` | the record derivation — two tables |
| 3 | `064fc8c3` | record pips in the grid |
| 4 | `7bae8ed0` | the record's switch |
| 5 | `68c76c62` | the in-focus day panel; the modal retires |
| 6 | `4c691db2` | the week view retires |
| — | `6f3cc1f4` | a constant nothing read, and two dead imports |

**Final gates:** tsc **6 errors, exactly the Step 0 baseline**, all in the Submission
packages session's `tests/e2e/pkgRestructure.measure.ts` — none in any calendar file.
`vite build` exit 0, whole log grepped (only the expected chunk-size note). Vitest **335 files
/ 5718 passed / 2 skipped / 0 failed** — recorded fresh at this commit, not copied.

**⚠️ What is NOT verified.** Everything here is a **code-and-unit** claim. No deploy this run,
so the e2e instrument could not be pointed at it, and **nothing in the panel's geometry has been
measured on a rendered page**. The panel's grid track, its scroll behaviour inside `.tpl-body`'s
`min-height: 0` chain, and the 1080px collapse are the three things most likely to be wrong in a
way unit tests cannot see — the `flex: 1; min-height: 0` chain has produced a silent 0px box in
this repo twice before. Measure before believing the layout.

Every derivation was **verified red by mutation** before being believed, and each file restored
byte-identical afterwards: the Offer direction (`in`→`out`), the slot ordering (record before live
work), the `turned` flag (every gap reading as a reply), and the exchange sequence (counted over
visible days rather than the query).

---

## FLAGS FOR NICK

### 1. Activity types excluded from `RECORD_TYPES` as ambiguous

Only one class was genuinely a judgement call, and it went to exclusion:

- **`AGENT_ADDED` / `AGENT_UPDATED` / `AGENT_DELETED` / `MANUSCRIPT_*`** — excluded. These are
  things the writer did to their **files**, not to a submission. `AGENT_UPDATED` is the closest
  call, because the agent list already derives a closed-door date from it — but a door closing is
  a fact about an agency, not an exchange with one.
- **`STATUS_CHANGED` with no `resultingStatus`** — excluded. The type carries no meaning of its
  own, so a pre-migration row without a status cannot be classified. `MATERIALS_SENT` behaves the
  same way, which means **a pre-migration materials row with no status will not appear**. That is
  the one place the whitelist knowingly drops real data, and it is the direction the pack asked
  for (a missing row is recoverable; a wrong one is not).
- **Orphans** — an activity whose query no longer exists is excluded, because every record row
  offers OPEN QUERY and its agent is only reachable through the query.

**A decision worth your eye:** the three closures all read **"Closed"**, per the pack's label
list. Rejected/Withdrawn/No Response are separated by **direction** (a rejection came from the
agency; a withdrawal and a no-response close are the writer's own act) and by the expanded row,
but not by the pip's word. A month of the word "Rejected" across the grid felt like a running
commentary rather than a record. If you want them distinguished, it is one line in `RECORD_STATUS`.

### 2. Is `TimelineComposer` callable from the calendar?

**No — and not because of coupling. It has no importer anywhere in the repo.** Its `editActivity`
call at `TimelineComposer.tsx:230` is the only one in any component, and nothing mounts it.
`Queries.tsx:5388` states it "survives for the dashboard's own flows"; there are none.

So **no correction UI for editing an entry is reachable on any surface today.** Deleting one is
(`Queries.tsx:1003` → `deleteActivity`, with a derived-consequence confirm). Editing is not.
EDIT THIS ENTRY therefore routes to the reading pane, per the pack's fallback. **This also
corrects my previous report**, which answered this flag "yes" from the definition without checking
reachability. Re-mounting `TimelineComposer` is a real piece of daylight work — it needs
`onOpenRichForm`, `onMarkSent` and `onNudge`, all Query Centre flows.

### 3. Does `FocusItem` admit record entries?

**No.** `FocusItem = { kind: "card"; card: BoardCard } | { kind: "group"; group: HkGroup }`. A
record entry is an `Activity`, and manufacturing a synthetic `BoardCard` to squeeze one in would
put a fabricated card through a journey that **writes**. The record routes; it never opens a flow.
Live card rows in the panel open `FocusFlow` exactly as the pips do — same call, same props.

### 4. Did the day panel fit inside `TplGrow`/`TplZone`?

**Yes — no fork, and `TasksPageLayout` is untouched** (verified in the diff). `children` lands in
`.tpl-body`, already `display:flex; flex-direction:column; min-height:0`, so the two-column split
is the page's own box inside it. `TplZone` is deliberately **not** used and never was on this
page: the month **compresses** to the frame rather than scrolling (tasks-viewport P1/P3), and the
panel is the only scroller.

I did not use the `sidebar` prop — it renders `.tpl-side` on the **left**, and this panel is on
the right.

### 5. Did `todoFamily.ts` accept the record colours additively?

**No, and I would not add them even with the fence lifted.** They are calendar-local
(`REC_TONE`/`REC_LEGEND` in `todoCalendar.ts`). Three reasons, the first the strongest:

1. **The shapes do not match.** A `CAL_PIP` entry is `{bg, tx, bd}` — a filled, bordered chip. The
   record has no fill and no border, so joining that map means writing `bg: "transparent"`, which
   encodes "there is no fill here" in a vocabulary whose every other entry means "this is the fill".
2. **It is not a pip family.** `CalPipFamily` classifies live work by whose it is; widening the
   union would invite a consumer to treat a past event as a live card.
3. **Two locks outside my territory assert the four** — `tasksAuditLegend.test.tsx:30` requires
   legend and map to have identical keys, and `todoCalendar.test.ts:166` names the four exactly.

The legend still renders **from** records rather than literals; it reads two now, each owning its
layer. If you would rather the tones lived in `todoFamily.ts`, it wants a second map beside
`CAL_PIP` — not an entry inside it.

### 6. Can `calFoldCap` starve the `+N` counter of its line?

**Yes.** The comment says a row is reserved; the arithmetic does not reserve one.

```ts
const room = rowPx - CAL_CELL_CHROME;   // 26
const fits = Math.floor(room / CAL_PIP_H); // 19
return Math.max(1, Math.min(CAL_CELL_CAP, fits));
```

`fits` is pure pip capacity — nothing subtracts the height of `.cal-more2`, which the cell renders
*in addition* to `cap` pips whenever anything folds. At `rowPx = 83`: `room = 57`, `fits = 3`,
`cap = 3`; three pips fill the room exactly and the counter is clipped by the cell's
`overflow: hidden`. The window is roughly `rowPx` 77–96, and the same recurs at the
`Math.max(1, …)` floor.

**Flagged, not fixed, per the pack.** `calFoldCap` is untouched — the record folds through it as
ordinary cell occupants, and record pips deliberately keep `.cal-pip`'s box because `CAL_PIP_H` is
the unit the fold counts in. **This is worth measuring rather than reasoning about**, since it
depends on the real rendered height of `.cal-more2`.

### 7. Cross-session collisions

**a. One file outside my territory was edited — `tasksViewport.test.tsx`.** Its assertion
`expect(cal).toContain('view === "month" ? 6 : 1')` was made stale by the Phase 6 deletion you
ordered. I retargeted that one assertion — the law it asserts is unchanged, and both halves
survive — rather than leave `main` red all night for three other sessions. Nothing else in the
file was touched, and a sweep confirmed it was the only such lock (the many
`not.toContain("const [view, setView]")` assertions elsewhere are about `ToDoPage`, unaffected).
**Please confirm you are happy with that call.**

**b. A copy collision I could not resolve in your favour.** The pack names the panel's first
section with a phrase the To-do session **retired repo-wide**, locked by
`todoWorkbench.test.ts` ("THE RENAME, repo-wide: zero matches … in src"). A pack does not overturn
a recorded decision, so the heading reads **"Yours"** — which matches the panel's own count line
("N YOURS") and describes exactly what the section holds. Note the lock greps **raw source**, so
the phrase cannot even be quoted in a code comment to explain itself; the note in the file
describes it instead of naming it. **If you want the original wording back, the lock is the thing
to change, and it is the To-do session's.**

**c. My change orphaned `.cal-viewwrap` in `taskChrome.css`** — that file is not mine and was
**not touched**. `.cal-viewmenu` beside it stays live for the Noteboard, so only the one rule is
now dead. One line for whoever owns that file.

**d. Baseline moved under me, twice.** At Step 0: tsc 6 errors (Submission packages), Vitest all
green. Mid-run the Account settings session briefly had 14 errors in `AccountSettings.tsx` and
`settings/sectionBands.tsx`; they cleared before I finished. **I fixed none of them.** The suite
also grew from 5645 to 5718 tests as the other sessions landed work — every figure in this report
was taken fresh, never copied.

**e. No locked component needed a prop it lacked.** `FocusFlow`, `TasksPageLayout`, `StatusDot`,
`TODO_FACETS`, `assembleBoardColumns`, `todoFamily` and `todoBoardSort` were all consumed verbatim
and are all confirmed unmodified in `git status`.

**f. No global token was wanted.** `index.css` was not opened. Every colour is either a literal in
my own stylesheet or a value in my own module.

### 8. What in the design ref I could not implement faithfully

Three deviations, each because a decision recorded in this repo outranks a mockup:

1. **`align-items: stretch`, not the ref's `start`.** The ref draws a page that scrolls, where
   hugging is right. Here the frame **is** the viewport and the month compresses to fill it
   (tasks-viewport P1/P3). With `start` both columns would hug their content, `.cal-grid`'s
   `flex: 1` would have nothing to fill, and the grid would collapse to min-content.
2. **No `max-height: calc(100vh - 60px)`, and no `sticky`.** CLAUDE.md is explicit that the stage
   is this app's scroll container, not the window, and that viewport arithmetic in page heights is
   forbidden. The panel takes its height from the layout row and scrolls inside it — which is what
   the ref's sticky-plus-max-height was reaching for on a page that had no such row to sit in.
3. **The section heading**, as in flag 7b.

Two smaller notes on fidelity: **"OPEN QUERY" lands on the query, not on the entry** — there is no
activity-level anchor in the router, only `/queries?q=<id>`, so "scrolled to this entry" is not
currently expressible. And **below 1080px the layout becomes the scroller** with a 420px floor on
the month; that is the one width at which this page scrolls at all, stated rather than left silent.
