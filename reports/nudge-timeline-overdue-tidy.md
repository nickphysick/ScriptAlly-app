# Nudge in the query timeline + overdue tidy (report)

**Status: COMPLETE.** P1 = no-op (tri-state confirmed working, per the brief — no commit). P2 + P3
landed, one commit each, individually revertible; gates green per commit (tsc + build + Vitest
**892** at close). Undeployed. Nick's WIP (`index.css`, `themes.md`) untouched; built on `claude-il`,
ff-merged to `main` after the no-overlap check.

## Headline flags

### P2 — diagnosis: **write-path/desync**, with a latent render gap behind it
- **Write-path (primary):** `logNudge` wrote **only the global projection (b)** (`users/{uid}/activities`,
  via `addActivity`) — the dashboard's store — and never the **authoritative subcollection (a)**
  (`users/{uid}/queries/{qid}/activity`), which is exactly what the Tracking pane's `onSnapshot` reads.
  Confirmed reads: dashboard's sole live listener = (b) (`db.tsx:507`); Tracking = (a) (`Queries.tsx`).
  It correctly avoided **(c)**, the vestigial singular `users/{uid}/activity`.
- **Render gap (latent, would have bitten after the write fix):** `QueryTimeline` filtered events to
  `QueryStatus` enum types — a nudge row would have been **silently dropped**, and the
  keep-earliest-per-type dedupe would have collapsed repeat nudges. Both fixed.
- **What changed:** `buildNudgeWrites` now emits the **authoritative `nested` row and the projection
  `activity` from ONE build**; `db.logNudge` writes **(a) FIRST** (failure aborts the nudge), then the
  **same-id (b) twin** best-effort — the `saveQueryEdits` same-id-twin convention. **The projection now
  derives from the authoritative event** (same id, same payload, one writer) — not an independent
  parallel write; there is no double-write of the event (one row per store, shared identity). This is
  the down-payment on the parked store consolidation, not the consolidation.
- **Render:** row-building extracted to the pure exported `buildTimelineRows` (unit-testable). Explicit
  nudge case keyed on `NUDGE_NESTED_TYPE` (`"Nudge sent"` — deliberately non-enum): one
  **"Nudged · via {method} · {date}"** row per nudge, never deduped, merged chronologically. The dot is
  the locked `StatusDot` rendering the **outgoing glyph** (QUERIED's burgundy-ring/→), `decorative` —
  the node claims no status. Nudge rows carry no `activityId`, so the correction ⋯ never offers on them
  (corrections operate on status entries; deleting a mistaken nudge from the timeline is a backlog note).
- **Response-safety — CONFIRMED by the recompute test:** the nested type normalises to no enum member,
  so `deriveQueryFields([queried, nudge]) === deriveQueryFields([queried])` exactly — status,
  `hasAgentResponded`, response-count, `revisionRound`, pipeline dates all unchanged; overdue derives
  from `dateSent` + window (nudgeDate is not an input), so **nudging does not calm the escalation**.
- **Glyph note:** the brief described the dashboard's "NUDGE SENT" as an outgoing StatusDot; the
  dashboard actually renders a **clock glyph** (`TimelineDot.tsx:44`). Followed the instruction (locked
  StatusDot, outgoing) for the Tracking node; the dashboard's clock is untouched.

### P3 — overdue tidy: **dropped** (not demoted)
- **(a)** The "Waiting to hear back · N days" line is **dropped entirely** from the overdue branch — the
  "Overdue · N days past expected" badge is the single headline (the clock icon stays as a wordless
  anchor; no second counter). Rationale: total-elapsed is recoverable from SENT + the badge; a muted
  secondary line would still be two clocks off one send date.
- **(b)** The `EXPECTED BY ~…` strikethrough is **removed** — the `textDecoration` conditional deleted;
  the crossed meaning rides the bar marker + the burgundy (`--pink-i`) tone only. Artefact-locked:
  `line-through` no longer appears in `QueryTimeline.tsx`.
- Within-window (calm) state unchanged. **jsdom can't verify the visual balance** of the tidied
  escalated card — flagged for Nick's in-browser check.

## Rules / indexes
- **No Firestore rules change** — the nudge's nested row (`{type, createdAt, note, …}`) passes the
  existing `isValidActivityNested` (type ≤128 · createdAt · note; extra keys admitted — the same shape
  family `recordResponse` writes). **No composite index** (Tracking's existing `orderBy(createdAt)`
  listener serves it).

## Backlog notes
- **Parked: the three-store consolidation** — (a) authoritative subcollection · (b) global projection ·
  (c) vestigial singular. The nudge is now aligned on (a)-with-derived-twin; everything else still
  double-writes by convention. The consolidation (single authoritative store + one true projection)
  remains its own future pass.
- **Un-built (noted, per the scope fence):** surfacing the "Follow-up reminder · {date}" inside the
  Tracking pane (the nudge's check-back rides `nudgeDate` + the row's `note`, so the data is already
  there when wanted).
- Deleting a mistaken nudge from the Tracking timeline (nudge rows deliberately carry no ⋯ this pass).
- Pre-existing, unchanged: the calm readout's hardcoded sage hexes (`wcol`) predate this pass.

## Git log (pass)

```
<P3 commit>  fix(nudge P3): overdue readout tidy — single headline, no strikethrough
8e2c93e      fix(nudge P2): nudge reaches the per-query Tracking timeline
```
(P1 = no-op, no commit.) `git status` clean apart from Nick's own WIP (`design-refs/themes.md`,
`src/index.css` — untouched by this pass).

## To eyeball on dev (when next deployed; auth-gated)
- Nudge a waiting query → a "Nudged · via Email · {date}" node appears in Tracking (outgoing dot),
  AND still on the dashboard timeline; repeat nudge → two nodes; status/response stats unchanged;
  the overdue escalation still counting (nudging doesn't calm it).
- Overdue card: badge-only headline (no double counter), EXPECTED BY in burgundy but NOT struck
  through, marker + overdue zone unchanged.
