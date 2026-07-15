# Tracking pane — delete-nudge bug + state revisions (TR)

**Priority framing (Nick's):** *the bug is the priority; the visual revisions ride along because
they touch the same nudge / grace / reminder code.* Done in that order.

Branch `claude-il` in the worktree `/Users/nickphysick/ScriptAlly-il`, ff-merged to `main`.
Suite **927 green** at close (tsc + production build + full Vitest, `set -o pipefail`, green before
every commit). No new stored fields, no rules changes.

---

## P1 (priority) — the delete-nudge desync, fixed

### Root cause
Grace is derived, but it reads two **stored** query fields the nudge writes — `nudgeDate` (the
follow-up reminder) and `lastNudgeSentDate` (when it fired). `deriveEscalation` returns `grace` when
a nudge fired since the query lapsed **and** its reminder is still in the future. Deleting the nudge
activity ran `recomputeQuery`, but recompute derives from **status** events only — it ignores the
non-status nudge row (by design, so a nudge never counts as a response) and therefore **never touched
`nudgeDate` / `lastNudgeSentDate`**. So the activity vanished from the timeline while the query stayed
in grace: an orphaned reminder, a query stuck in a horizon it no longer had.

### What now clears on delete
`deleteActivity` gained a nudge-aware tail (only when the deleted activity is a `NUDGE_SENT`), run
**after** the existing `recompute`:

1. Re-reads the query's `activity` subcollection, keeps the rows typed `NUDGE_NESTED_TYPE`.
2. `reconcileNudge(remaining)` (pure, `src/lib/logNudge.ts`) re-derives the snapshot from what's left:
   the **latest** surviving nudge supplies `lastNudgeSentDate` (its `createdAt`) and `nudgeDate` (its
   `reminderDate`); **no nudges left → both clear** (`deleteField()`).
3. If nothing remains, `resolveTaskFlag(nudge_overdue)` clears the task flag too.

To make reconcile authoritative, the nudge write now stores a **structured `reminderDate`** on the
nested activity (piggy-backing the existing nudge write — `isValidActivityNested` uses field-type
checks, not `hasOnly`, so an extra string field needs **no rules change**). Legacy text-only nudges
(no `reminderDate`) clear the reminder rather than trying to parse prose back out — a deleted legacy
nudge still fully un-graces.

Single source: the nudge routes through the authoritative per-query `activity` row; the global
`activities` projection twin and the derived reminder both read from it. (A down-payment on the parked
consolidation — not a full refactor.)

### Tests (all green)
- `reconcileNudge`: empty → both clear (`hasNudges:false`); latest-wins; legacy (no reminderDate) →
  reminder clears, still `hasNudges`; touches **only** the two nudge fields.
- **delete → un-grace at the derivation level**: an overdue query with a future-reminder nudge derives
  `grace`; after `reconcileNudge([])` clears both fields, `deriveEscalation` reads null → back to
  `overdue`.
- **response-safety** (through the REAL derivation): a nudge row maps to a non-status derivable, so
  `deriveQueryFields([queried, nudge])` equals `deriveQueryFields([queried])` — a nudge (or its
  deletion) changes nothing recompute writes. The overdue clock reads `dateSent + window`, untouched
  by `nudgeDate`.

---

## P2 — grace readout (per the revised spec)

Dashed box, **no fill**. Header in the **header font** (not mono), single ink, natural language:
`Response overdue — nudge sent 15th July` (`fmtNatural` → ordinal + full month, UK). Meta line
`Scheduled follow-up set for {natural date}`. The bar spans **sent → follow-up**, two-tone: sage
`sent → deadline`, overdue red `deadline → today`; the **fill ends at today** (today → follow-up stays
empty), the sage→red transition lands on the deadline, **deadline marker only** (no today marker), and
the shimmer is wrapped in a `width: todayPct` `overflow:hidden` clip so it's **confined to the fill**.
Axis `SENT / FOLLOW-UP`.

## P3 — overdue readout (per the revised spec)

Pink card, badge `Response overdue by {elapsed}`; **no nudge CTA** in the readout (nudging moved to the
fork). Bar fully filled `sent → today` (rose → burgundy), a warning glyph at the end, and a labelled
`RESPONSE EXPECTED` marker at the expected-date position. Axis `SENT / RESPONSE EXPECTED / TODAY`.
**Re-escalation:** the badge appends `· nudged N×` only when nudged (`once` for 1, `N×` for more);
omitted entirely when never nudged.

Artefact locks in `queryAmbient.test.ts` were updated from the old copy (`past expected`, `· no reply`)
to the new (`Response overdue by`, `RESPONSE EXPECTED`, the `nudges > 0 ? … "once" … ${nudges}×`
re-escalation append).

## P4 — one elapsed-time helper, page-wide

`elapsedLabel(days)`: `≤28 → "{n} days"`, else `"{round(n/7)} weeks"` (`src/lib/queryAmbient.ts`, unit
locked). Applied to the waiting line, the overdue badge, and the writer "asked {n} ago" line.

## P5 — the fork, revised

A tidier fork: **one positive primary + the outgoing Nudge + (when offered) Close query**; everything
else — **including Rejection** — tucks under `Other…` (the "less likely from here" tag is gone).

- **Nudge → "Nudge again"** once a future follow-up reminder is already set (`hasFutureReminder`).
- **Close query** — grey chip, a ringed `×` glyph (no StatusDot). Offered in **overdue / grace**
  (a waiting query past expected, derived from the **same `deriveEscalation`** the readout reads) and
  on **any your-move status**; never within-window. Records a **bucket-appropriate close** through the
  single `recordQueryResponse` path: your-move → *Withdrew my submission* (→ Withdrawn), waiting →
  *No response after expected window* (→ No response). It **replaces** the old policy-gated
  "No response — close it" chip (which only appeared when the agent's `noResponseMeansNo` window
  passed) — the new chip is the broader give-up affordance.

### Final per-status fork mapping
| status (bucket) | primary row | under `Other…` |
|---|---|---|
| **Queried** (waiting) | Partial requested · Nudge · [Close query] | Full requested · Offer · R&R · Rejection |
| **Partial Sent** (waiting) | Full requested · Nudge · [Close query] | Offer · R&R · Rejection |
| **Full Sent** (waiting) | Offer · Nudge · [Close query] | R&R · Rejection |
| **your-move** (Partial/Full requested, R&R) | {Mark-sent} · [Close query] | Rejection |
| **closed** | Reopen | — |

`[Close query]` shows only when the caller passes `canClose` (overdue/grace, or any your-move).
The your-move primary is still `getPrimaryAction`'s mark-sent target verbatim — the composer can't
diverge from the CTA engine. **Generalisation flagged:** the spec worked Queried and your-move
explicitly; Partial/Full-sent follow the same one-positive shape for consistency (documented in the
`composerChips` header). Locks rewritten in `composerChips.test.ts`.

---

## P6 — carry-overs + refs

**Carry-overs verified present — none needed rebuilding:**
- within-window bar (shared `bar`, within branch)
- no-expected-date readout (`Awaiting response — no expected date set` + `Set an expected date →`)
- your-move box (`Your move — send the {sendWhat}`)
- container-drawn connector (`!isLast` + `TL_EVENT_GAP`; StatusDot untouched — locked)
- nudge ⋯ edit/delete menu (TWS P5)
- derived escalation state machine (`deriveEscalation`; no stored `isGrace` flag)

**Design refs:** `design-refs/tracking-reworked-v2.html` was already committed; this pass adds
`design-refs/tracking-revised.html` — **⚠ spec-derived** (the named mockup was not supplied; the file
is reconstructed from the prose, structure/behaviour only, colours resolve from `.t-f12` tokens in the
app). Flagged in the file header.

---

## Invariants honoured
- Derived-over-stored: no `isGrace`/`isCalm` flag; `recomputeQuery` stays the single status writer; a
  nudge (or its deletion) never counts as a response and never moves status.
- No new stored fields (`responseDeadline`, `QueryMaterial.type`/`quantity` already existed);
  `reminderDate` rides the field-type-checked nested-activity rule → **no rules change / deploy**.
- The timeline connector is drawn by the row container, never by editing the locked `StatusDot`.
- Single write path: every close/response goes through `recordQueryResponse`; the composer primary is
  `getPrimaryAction`'s target.
- CSS-only shimmer (transform-only keyframes, no `var()` in `%` selectors), reduced-motion honoured;
  UK spelling; exact `QueryStatus` strings. Revised, not rebuilt.

## Git log (this pass)
```
af6cc8f feat(TR P5): fork revisions — Close query chip, Nudge again, tidier mappings
f11f9c9 feat(TR P2/P3): grace + overdue readout revisions (tracking-revised)
05f3e83 feat(TR P4): elapsed-time helper — days→weeks at 28, applied page-wide
926f524 fix(TR P1): delete-nudge desync — a deleted nudge now fully undoes
```
(This report + the two design refs land with the P6 commit.)

**Deploy:** to dev (hosting-only) at close, per Nick's "deploy to dev once done". Prod remains Nick's.
