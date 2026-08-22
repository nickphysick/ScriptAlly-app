# Calendar — the finishing pack

**Session:** `calendar` · 22 Aug 2026, overnight, unattended.
Prior: `calendar-record-layer.md`, `calendar-fixes.md`, `calendar-dedupe.md`, `calendar-pills.md`,
`calendar-peek.md` (recon only), `calendar-reclaim.md`, `tasks-chassis-21px.md`.

> **DEPLOY — filled in at Phase 7.**

---

## Step 0 — gates

| Gate | Result |
|---|---|
| **Red gate 1** — another session mid-edit in `src/components/todo/` | `git status --porcelain` → **empty**. Clear. |
| **Red gate 2** — the chassis fix still in the tree | **INTACT.** `workspaceShell.css:678` carries the deletion *and* the warning comment; no `height: 100vh` on `.ws-main`. |
| `main`, level | behind main **0**; HEAD `e975dbda` ("noteboard: install the approved mockup") — another session's, and moving |
| Whole-tree dirt | 5 files, **no source** — two report PNGs, a deleted run-artifact, two untracked artefacts |
| Baseline `tsc` | **0 errors** |

---

## Step 0 — RECON

### 1. `rolledFrom` still carries each carried item's origin — **yes, unchanged**

`todoCalendar.ts:183` sets `rolledFrom: action` in the roll-forward branch, and `action` is
`cardActionYmd`'s output. Per type:

| Carried type | Origin |
|---|---|
| writer's own task | `c.dueYmd` ← `UserTask.dueDate` |
| query card | `q.lastStatusChange ?? q.dateSent` |
| housekeeping | `null` — never reaches the calendar |

**No carried type lacks a recoverable origin** (flag 4 answered before Phase 5 was reached). Three
existing assertions already pin it, including one on the page's render of `Originally due …`.

### 2. "Everything" is the facet control — **confirmed, and it is entirely calendar-local**

`useState<TodoFacetId>("all")` at `:253`. Consumers: `applyFacet` (`:415`), the two
`facet === "all" ? … : []` gates for user tasks and activities (`:428`, `:429`), `facetCounts`
(`:438`), and the control itself (`:486`–`:501`). **No manuscript scoping anywhere in the page** —
that lives in the shell's sidebar chip, untouched.

### 3. The record toggle — **one reader, so Phase 3 subsumes it by changing one function**

`useState(true)` at `:266`; the single reader is
`recordFor = (ymd) => (showRecord ? recByDay.get(ymd) ?? [] : [])` at `:459`. The grid pills, the
panel section **and the dedupe** all flow from that one call — the dedupe takes the day's record as
an *argument* rather than reading a flag. Plus the legend at `:633` and the button at `:517`.

### 4. Grid start-date inventory — the list Phase 3 must respect

| Site | Assumption |
|---|---|
| `TodoCalendarPage:375` `const visible = monthGridDays(anchor)` | **the only producer of the day range** |
| `:452` `monthLabel(anchor)` subtitle · `:543` grid `aria-label` | the title names the anchor's month |
| `:556` `off = !sameMonth(ymd, anchor)` | adjacent-month dimming |
| `todoCalendar.test.ts:745` | a page lock pinning that exact producer line |
| `todoCalendar.test.ts:755` | 42 cells |
| `tasksAuditBoundary.test.tsx:124` | uses `monthGridDays` as a fixture |

**`grid-auto-rows: minmax(0, 1fr)`** — so fewer weeks means *taller* rows. Any upcoming-mode
geometry with ≤ 6 rows **gains** cushion; none of them can spend it.

### 5. Foot-margin parity — **measured on all three. Calendar matches exactly.**

```
/queries         WINDOW .ws-window ends 880 -> CHASSIS FOOT 20   | lowest ink 892.75 span.f12-nm
/todo            WINDOW .ws-window ends 880 -> CHASSIS FOOT 20   | lowest ink  897.3 div.r-deed
/todo/calendar   WINDOW .ws-window ends 880 -> CHASSIS FOOT 20   | lowest ink    880 div.ws-winwrap
```

**20px on all three, from the same `.ws-main` padding.** The chassis pack's addendum is now
evidenced rather than assumed.

> **⚠️ TWO WRONG READINGS CAME FIRST, AND BOTH LOOKED LIKE ANSWERS.** The first walked for the
> lowest painted box and reported **1959px** on `/queries` — a true measurement of an inner pane's
> *scroll extent*, and nothing to do with a foot margin. The fix for that was to scroll the page to
> its bottom first, which **changed nothing**, because — probed rather than assumed — **all three
> pages FILL: the only page-level scroller on any of them is the sidebar `nav.ws-nav`.** The
> comparable box is the chassis's own window, not the page's ink.

> **⚠️ AND A SIDE-FINDING, NOT MINE TO FIX:** on `/queries` and `/todo` some inner boxes extend
> **past** the window's bottom (892.75 and 897.3 against a window ending at 880). They are clipped,
> so no pixels escape — but the boxes are geometrically outside their frame, which is the
> "measures whole, pixels gone" shape this repo already records. The Calendar's lowest box is the
> window itself. Flagged for whichever session owns those pages; **not touched.**

### 6. Cushion before this pack adds anything — **13 / 4 / 4 / 4**

| width | 1000 | 1280 | 1440 | 1920 |
|---|---|---|---|---|
| cushion | **13** | **4.0** | **4.0** | **4.0** |
| `data-fold-short` | none | none | none | none |

**Not below 4px, so Phase 0B's red condition does not fire.** Exactly where the reclaim pack left
it — nothing has eroded in the day since, which is the first time the grid has held its height
across a session.
