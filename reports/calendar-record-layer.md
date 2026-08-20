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
