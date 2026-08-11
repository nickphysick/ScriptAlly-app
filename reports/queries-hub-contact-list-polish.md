# Queries Hub + Contact List — polish pass (report)

**Status: COMPLETE.** All six phases resolved (P3 as a deliberate documented no-op). One commit per
phase, each individually revertible; `main` clean; gates green (tsc + build + Vitest **883**) per
commit. Undeployed hosting — but the P1 *rules* fix was deployed to dev (see P1). Worktree flow: built
on `claude-il`, ff-merged to `main` after a no-overlap check vs Nick's uncommitted WIP (`index.css`,
`themes.md` — untouched).

## Headline flags

- **⚠️ The Queries Hub + Contact List render under the single `.t-f12` master theme**, NOT the three
  `.t-capp`/`.t-bold`/`.t-edn` classes the brief's Global rules assume. So "resolve in all three themes"
  is moot for these panes — there is one theme. The P6 escalation consumes `.t-f12`'s **needs-you**
  tokens `--pink-t` / `--pink-b` / `--pink-i` (index.css:552, commented `/* needs-you */`). Editorial's
  "not pink" needs-you rule doesn't apply here because there's no Editorial variant of `.t-f12`.
- **The tracking readout's CALM colours are still hardcoded hex** in `QueryTimeline` (`wcol`, a
  pre-existing deviation from "no hardcoded hex"). P6 only *added* the overdue treatment via tokens; a
  full tokenisation of the calm palette is out of scope (flagged, not done).
- **No Firestore rules-FILE changes** in the whole pass. **No composite indexes.** (P1 needed a rules
  *deploy* of the already-correct repo rules — see below.)

## Per-phase

### P1 — tri-state "Not stated" (`a2fce7d`) — premise was WRONG; fixed the *real* cause
- **Confirmed root cause:** the toggle **code was already correct** (6c) — "Not stated" writes
  `deleteField()` (not `undefined`); absent reads back as "unstated" (not `false`). The repo **rules
  were also correct** (`noResponseMeansNo` in the agent-update allowlist + permit-absence). The dev
  snap-back was **(a)** community agents seeded `noResponseMeansNo: false`, and **(b)** those optional
  rules were **parked — not deployed to dev**, so `deleteField` was silently denied and the seeded
  `false` survived.
- **Fix:** deployed the current repo rules to dev (`firebase deploy --only firestore:rules --config
  firebase.dev.json --project dev` — compiled + released; Nick authorised dev deploys this session).
  No toggle behaviour change. Extracted the read/write mapping into pure `lib/agentReplyPolicy`,
  refactored the component onto it.
- **Round-trip test result:** `agentReplyPolicy.test.ts` — all three states round-trip (write →
  resulting stored value → read back), incl. **absent → "unstated"**, and "Not stated" produces a
  field-CLEAR intent, never `undefined`/`false`. Green (+6).

### P2 — Contact List de-dup (`8b878d9`)
- Removed the **"Website"** launcher from the command bar (header chip cluster is the single link home;
  a spacer preserves the ⋯/Delete right-alignment). Removed the footer **"OPEN TO QUERIES"** pill —
  the top-right `SegmentedToggle` (same `submissionStatus` source) is the single door readout.

### P3 — Agent/Manuscript command items — **NO-OP (documented; Nick's call)**
- They are **hardcoded `disabled` "Coming soon" placeholders** (`Queries.tsx`), not link-gated grey and
  not muted secondary links. The jump-to-record navigation isn't built (no seam selects an
  agent/manuscript by navigation). "Enable them" would be net-new nav, not a restyle — Nick chose to
  **leave them as Coming soon**. Nothing restyled for its own sake (per the brief's no-op clause). No
  commit.

### P4 — one materials control (`d8e0aaf`)
- Removed the large dashed "Add the materials you sent" tile that stacked above the hollow checklist.
  The checklist now leads as the prompt; a **quiet link** opens the Edit drawer to record what was
  sent; "Attach a submission package (PRO)" stays. (Nick chose "keep drawer path" — the checklist stays
  a read-only prompt, not tap-to-mark, since it isn't interactive today.)

### P5 — Journal copy (`a0f847f`) — copy-only
- `addJournalEntry(queryId, …)` writes `journalEntries` with `queryId` — **already query-scoped**, so
  no data bug. The ghost first-entry now reads "Your notes on **this query** appear here…".

### P6 — Tracking overdue escalation + composer un-pin (this commit)
- **How overdue is derived:** `queryAmbientStatus` (lib/queryAmbient) — `overdue = nDays > mDays`, where
  `mDays = STAGE_RESPONSE_WINDOWS[stage] × 7` and expected-by = `sentMs + mDays·DAY`. **All live-derived
  from now vs the send date; no stored field.** P6 added a derived `daysOverdue = max(0, nDays − mDays)`
  to the same struct (single source, testable).
- **(a) Escalation → needs-you tokens.** When `overdue`, the readout swaps from the calm sage row to a
  tinted card — `background var(--pink-t)`, `border var(--pink-b)`, ink `var(--pink-i)` — with an
  `Overdue · N days past expected` badge (filled `--pink-i`) and an **inline Nudge** button (promotes
  the action into the readout; wired to the existing `setIsNudgeOpen`). The progress bar gains an
  **EXPECTED marker** at 68%: within window the sage fill sits behind it; overdue, the fill crosses into
  an **overdue zone** (`--pink-b → --pink-i` gradient) and the marker + "EXPECTED BY" caption read as
  **crossed** (`--pink-i`, strikethrough). **Per theme:** one theme (`.t-f12`) → needs-you = the pink
  token set above; nothing to reconcile across `.t-capp`/`.t-bold`/`.t-edn` (they don't apply here).
- **Fork stays NEUTRAL** in both states — the "What happened next?" composer (`TimelineComposer`) carries
  no needs-you tokens (artefact-locked). One escalation signal per pane.
- **(b) Composer un-pinned (Layout A):** `TimelineComposer` moved INSIDE the tracking `EdgeFadeScroll`,
  after `QueryTimeline`, so it flows in normal document order directly under the readout; leftover column
  height falls as whitespace below it (was pinned to the card foot via the scroll's `flex:1`).
- **Tests:** overdue boundary in `queryAmbient.test.ts` — expected-by **yesterday → overdue**
  (`daysOverdue 1`), **today → calm**, **tomorrow → calm**, driving off the derived `overdue`/`daysOverdue`
  (not a new field); plus artefact locks (readout escalates to `--pink-i` + badge + `onNudge`; composer
  has no needs-you tokens). **jsdom cannot verify the flowing whitespace of (b)** — flagged for Nick's
  in-browser check.
- **Design ref:** `design-refs/tracking-overdue-composer.html` was **absent and the approved mockup was
  not supplied to the session** — committed a **spec-derived** reference (both states + Layout A), header
  comment flags it as reconstructed from the prose, not the original.

## Git log (pass)

```
<P6 commit>  fix(polish P6): tracking overdue escalation + composer un-pin (Layout A)
a0f847f      fix(polish P5): journal placeholder copy — this query, not this agent
d8e0aaf      fix(polish P4): one materials control in "What you sent"
8b878d9      fix(polish P2): Contact List — de-dup Website + door state
a2fce7d      fix(polish P1): lock the reply-policy tri-state round-trip
```
(P3 = documented no-op, no commit.)

## To eyeball on dev (auth-gated; three-theme note above)
- Tri-state "Not stated" now sticks (rules deployed). Contact List: no Website in the bar, no footer
  door pill. Queries "What you sent": no dashed tile. Journal ghost copy says "this query".
- **P6 in the browser:** overdue readout tint + badge + inline Nudge + the marker/overdue-zone bar;
  the composer flowing under the readout with whitespace below (Layout A); the fork staying neutral.
