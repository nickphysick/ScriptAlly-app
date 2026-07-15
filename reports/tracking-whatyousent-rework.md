# Tracking pane rework + What you sent (report)

**Status: Phases 1–5 DONE; Phase 6 (What you sent rebuild) NOT started — deferred.** Each landed
phase is one commit, individually revertible; gates green per commit (tsc + build + Vitest 910+; no
rules changes — see below). Undeployed. Built on `claude-il`, ff-merged to `main` after the no-overlap
check; Nick's WIP (`index.css`, `themes.md`) untouched.

## ⚠️ Step 0 deviations (all favourable — confirmed with Nick, "wire to existing")
- **No new stored fields.** The two the prompt expected already exist: **`responseDeadline`** (the
  expected-date override — editable via the Edit drawer) and **`QueryMaterial.type`/`quantity`** (the
  sample-materials unit+quantity — `materialsWanted: (string|QueryMaterial)[]`). P4 wires to the
  former; P6 will wire to the latter.
- **No Firestore rules changes, no indexes.** `materialsWanted` is already `is list||map, size≤20`
  (structured entries tolerated); `responseDeadline` is already in the query-update allowlist.
- **Phase 1 was already built** last session (`809f8e3`→`44eb1c7`): `deriveEscalation`,
  `trackingBar`, `nudgeCount`, boundary + response-safety tests. Verified; not re-committed.

## Landed

### Grace vs overdue derivation (Phase 1, pre-existing + P4 override)
- **within** = `!ambient.overdue`. **overdue** = past expected-by AND (no nudge since it lapsed, OR
  the latest nudge's reminder has lapsed). **grace** = past expected-by AND a nudge fired since the
  lapse (`lastNudgeSentDate >= expMs`) AND its reminder (`nudgeDate`) is still future. No future
  reminder → no grace (stays overdue). Read from `Query.nudgeDate` + `Query.lastNudgeSentDate`; count
  from the log. **Nudge response-safety locked** (deriveEscalation reads reminder/nudge only — never
  the overdue clock; the recompute lock proves a nudge changes no derived field).
- **Expected date** derives from the stage send date + window; where none is derivable it falls back to
  the **`responseDeadline` override** (P4). A real send date wins over the override.

### P2 `10f0878` — five readout treatments
within = soft-neutral card; **grace = dashed + a CSS-only sage pulse** (transform-only keyframe,
reduced-motion honoured — the Warm treatment + "Nudge again" link are gone); overdue = pink card +
badge, **no nudge CTA**; your-move = soft-pink + ink border, Playfair title, no divider; **no-expected-
date** = dashed + burgundy "Set an expected date". Design ref `tracking-reworked-v2.html` (spec-derived
— supersedes `tracking-grace-final.html`).

### P3 `e4aebea` — fork rework
**Final per-status mapping** (`*` = pink primary; move/closed unchanged; +No-response when the window
has passed):
- **Queried:** `[Partial requested*, Rejection, Nudge]` — **Other:** `[Full requested]` (implausible jump)
- **Partial sent:** `[Full requested*, Offer, Rejection, Nudge]`
- **Full sent:** `[Offer*, Revise & resubmit, Rejection, Nudge]`
Nudge is a fork **chip** (`{kind:"nudge"}` → fires the nudge flow, never a status change), waiting bucket
only. "Other…" expander for the implausible steps. The fork is a lifted shadowed card with a min-gap
above so it never collides with the last event (true vertical-centring approximated — flowing scroll;
flagged for Nick's eyeball).

### P4 `61b5d03` — expected-date override
Wired to `responseDeadline` (no new field). `queryAmbientStatus` falls back to it for `expMs` when no
stage send date is derivable; the no-date state gates on `hasExpected`; "Set an expected date" opens the
Edit drawer (its existing `responseDeadline` field).

### P5 `84daf31` — nudge ⋯ menu
The nudge row now carries its `activityId`, so the correction ⋯ offers Edit (→`editActivity`) / Delete
(→`deleteActivity`) — closing the delete gap and **aligning the row** (the menu-less nudge row was the
date-misalignment cause). Delete of a nudge correctly reads "won't change the query's status" (the
confirm derives it). Connector landed last session.

### Timeline component sharing
`QueryTimeline` is Tracking-pane only (+ a dev-lab route) — **not** the dashboard drawer or agent
history (`TimelineDot`). Grace/fork/connector stay contained; nothing downstream inherits them.

## Phase 6 — DEFERRED (What you sent → document rows, Option B)
Not started — the largest phase (a full pane rebuild + a new capture UI), held back rather than rushed
at the end of a long session. **Plan (all wiring to existing fields, no schema/rules change):**
- Document rows per `whatyousent-b-refined.html`: manuscript header (cover + title + genre/word-count),
  "Sent with this query" label, Query letter / Synopsis as sent-or-not rows, a Submission package (PRO)
  row at the foot.
- **Sample materials** (renamed from "Sample chapters"): a row with Add/Change → a unit toggle
  (Pages / Chapters / Words) + quantity, written as a **`QueryMaterial` `{material:"Sample …", type,
  quantity}`** into `materialsWanted`, read back as "3 chapters" / "50 pages" / "10,000 words".
- **Back-compat:** a legacy truthy/string entry (e.g. `"Sample chapters"`, no structure) reads as
  "included, unit/quantity unspecified" — never dropped (`formatQueryMaterial` already tolerates this).
- **⚠️ REQUIRED FOLLOW-UP (do NOT build here):** the CSV import template needs matching **unit +
  quantity columns**, or imported queries land with sample materials flagged but no unit/quantity —
  flag in the parked CSV-import stream.
- Commit the `whatyousent-b-refined.html` design ref with this phase; then finalise this report.

## Git log (this pass so far)
```
84daf31  feat(TWS P5): nudge event gets the ⋯ edit/delete menu (date alignment)
61b5d03  feat(TWS P4): expected-date override wired to responseDeadline (no new field)
e4aebea  feat(TWS P3): fork rework — nudge chip + Other + lifted card
10f0878  feat(TWS P2): five Tracking readout treatments (dashed sage-pulse grace)
```
(P1 pre-existing at `44eb1c7`; P6 pending.) `git status` clean apart from Nick's own WIP.

## For Nick's in-browser pass (jsdom can't verify)
The five readout treatments, the sage pulse, the fork's lifted card + Other expander, the bar
geometries, and the nudge ⋯. The design refs are **spec-derived** (mockups weren't supplied).
