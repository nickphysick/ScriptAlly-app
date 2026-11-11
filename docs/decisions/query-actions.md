# Query actions (the drawer) — decisions

## Current state

- Query actions v1 + v1.1 (27–28 Sep): every page finishes in the one query drawer; ref design-refs/query-actions-v11.html, report reports/query-actions-v1/. Prod rules for its fields are Nick's.
- Moved verbatim from CLAUDE.md on 11 Nov 2026 (CLAUDE.md diet; map in docs/claude-md-diet/MAP.md). Sections are newest first by the date in their heading; undated sections come last. A section headed “Branch-only” was recorded as not merged; the note under it says what the 11 Nov check found.
- Later work than the newest section here may exist on branches, with its report under reports/<name>/REPORT.md on that branch. Check `git log` before trusting any “current” claim below.

## Query actions v1 — EVERY PAGE FINISHES IN THE QUERY DRAWER (27 Sep; ref = design-refs/query-actions-v11.html; report reports/query-actions-v1/)
- **⚠️ THE STANDING SENTENCE IS NOW "EVERY PAGE FINISHES IN THE QUERY DRAWER"** — it SUPERSEDES the
  section below's "dashboard finishes in the modal, To-do page finishes in the pane". One right-hand
  drawer (`src/components/queryActions/`), mounted once by `App.tsx`, opened ONLY through
  `openQueryDrawer(…)` (`lib/queryActions/drawerStore`). Seven journeys: log (D1) · resp (D2, incl. a
  late reply) · sent (D3) · nudge (D4) · close (D5) · offer (D6) · edit (D7). The To-do pane stays the
  READING surface; its finish buttons open the drawer.
- **⚠️ `DRAWER_LIVE` (`lib/queryActions/entry.ts`) IS THE CUT-OVER, AND THE DOOR TABLES ARE THE ONLY
  ROUTES.** `cardDoors` (the card footer, by status), `rowDoors` (row actions) and `drawerDoorForTask`
  (a task → its journey and step) each offer a door ONLY for a live journey, so no door is ever dead.
  A door not live keeps its old route. **The tick never commits** — it opens the drawer; only the
  drawer writes.
- **⚠️ UNDO IS BY SNAPSHOT (`lib/queryActions/snapshot.ts`), NOT EACH WRITER'S INVERSE.** Before a
  save the drawer reads the query docs, their `activity` logs, their feed rows, their task flags and
  their stored tasks for every query the save touches; undo deletes what was created and writes back
  what changed. **The task flags and tasks are in the set because the drawer writes neither** — one
  appearing is a fault, and the mutation run found that a stored task went unnoticed until they were. Restoring the documents
  restores the derived fields, so nothing is recomputed after. The e2e locks assert Firestore is
  byte-identical after Undo.
- **⚠️ A LATE REPLY REMOVES THE NO-REPLY CLOSURE AFTER THE REPLY IS RECORDED, NEVER BEFORE** — the
  closure rung often carries the self-heal's id (`act-status-no-response-<qid>`) and the heal
  re-creates it the instant the query reads No Response with no rung. And it removes it from BOTH
  stores directly: `db.deleteActivity` finds its target in the FEED, and a heal rung has no feed row.
- **⚠️ NEW STATUSES `Resubmitted` AND `Signed`; `eventKey` ON EVERY DRAWER-WRITTEN ACTIVITY.** Labels
  read `eventKey` first (`lib/queryActions/eventKeys.ts`), description text only for older rows.
  Signed takes no Query Centre tile (the writer's own act, like Withdrawn). A declined offer is
  Withdrawn with `closingReason: offer_declined` and still counts as an offer in Analytics.
- **⚠️ THE DRAWER'S FIELDS ARE FLAT** (`sentPackageId`/`sentMaterials`/`sentVersions`, `closePlan`,
  `nrmnOverride`, the `offer*` marks on each OTHER query, `withdrawTold`, `agentRecheckOn`, …) — a map
  meets the nested-allowlist denial. Dev rules carry them (§R); **prod rules are Nick's.**
- **⚠️ THE DRAWER WRITES NO TASK OR DISMISSAL DOCUMENT.** Planned nudges are `nudgeDate`, "Consider
  closing" is `closePlan` (read by `replyTask`), and the five new task types (`offer_tell`,
  `offer_send_full`, `withdraw_tell`, `signed_tell`, `agent_recheck`) derive from the flat fields.
  `logNudge` writes a task flag, which is why the drawer never calls it.
- **⚠️ QueryHawk never writes for the writer — `nudgeDraft.ts` and every draft UI it fed are deleted.**
- **⚠️ `agent_recheck` HAS NO DRAWER JOURNEY, AND THAT IS A DECISION, NOT A GAP (v1.1, Nick).** It is about an
  AGENT (their door reopened, their wish list may be stale), not about a query, and the drawer is for
  what a writer does TO a query. `drawerDoorForTask` returns null for it, so its card keeps the board's
  own route to the agent. Do not add a journey for it.
- **v1.1 (28 Sep) — what moved:**
  - **Deleting a history entry is the mock's inline confirm ON THE ROW**, then the drawer's Undo bar
    (snapshot). The first entry asks "Delete this whole query?"; a request whose send answers it is
    named and removed with it. Both stores are cleared directly (`deleteActivity` misses a heal rung),
    and any `act-status-…` rung the heal re-creates in the race is removed again. The correction
    fork gains "It never happened" (Delete) beside Move, which stays.
  - **"Record a response" with no query opens the drawer on a picker of LIVE queries** (`QueryPicker`,
    `pickOnly` view: no review step, no primary, phone bar "Choose the query"); a pick remounts the
    response journey via the drawer's `pickQuery`. `RecordResponseScreen` is retired. The Pro
    paste-an-email lane that lived only there is a link in the picker, and App opens the EXISTING
    `PasteEmailFlow` (`PASTE_RESPONSE_EVENT`).
  - **`TaskModal` is deleted, the Sunday weekly review is deleted, and FocusFlow is
    `HousekeepingSweep`** — "Start the sweep" unchanged; query cards reaching it go to the drawer.
  - **The drawer is a full-screen sheet at ≤768px** with the "Step N of M" bar.
  - **The correction desk is `z-index: 81`**, above the query modal (80). At 71 — right for the
    retired slide-over — the fork opened BEHIND the modal and could not be clicked.
