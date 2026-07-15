# Tracking readout/bar (final) + Phase 6: What you sent

Two panes in one pass (**replaces** the held `tracking-readout-bar-prompt.md` — folds in the
warning-glyph removal and continues into Phase 6). On `main` in `/Users/nickphysick/ScriptAlly-il`
(branch `claude-il`, the standing worktree — no new branch). One commit per phase, revertible. Gates
green before each commit (tsc + production build + full Vitest — **938 green**; rules-compile
unaffected, no rules touched). No new fields, no rules changes.

**Not in this pass (still held):** the suggested-action model + fork reshape (same-style chips, pulse
only) — waiting on the "hugely overdue" threshold decision.

**Design refs — both committed** (⚠ **spec-derived**: neither mockup was supplied to the build
session; reconstructed from the prose, structure/behaviour only, colours from `.t-f12` tokens):
`design-refs/bar-anchors-hover.html` (readout/bar) and `design-refs/whatyousent-b-refined.html`.

---

## Phase 1 — Overdue readout final (`6ff4c46`)
Pill already dropped + hourglass already `--ink` (prior passes). This pass **removes the warning glyph**
at the bar end (redundant with the "Response overdue by …" headline); the rose→burgundy fill already
runs `inset:0`, so it now reaches the **full end of the track** with no gap where the glyph sat. Axis
stays `SENT` only.

## Phase 2 — Grace headline (already in place)
`Response {elapsed} overdue — nudge sent {natural date}` (meta `Scheduled follow-up set for {date}`)
landed verbatim in `66f8ae7`. **No-op** — no commit.

## Phase 3 — Bar labels (already in place) + design ref (`cf4fead`)
End-anchors + hollow-circle hover/tap markers already landed in `4298312` (touch-wired: pointerType-
guarded hover + an onClick pin; pop-up above, anchored inward near edges). This pass commits the
`bar-anchors-hover.html` design ref documenting the finalised bar. **No production-code change.**

## Phase 4 — What you sent → document rows (Phase 6) (`<this commit>`)
Rebuilt the sub-card ([Queries.tsx](../src/components/Queries.tsx)) per `whatyousent-b-refined.html`:

- **Manuscript header** — a cover plate + the title (keeps 5d click-to-reassign) + a mono
  `{genre} · {word-count}` line.
- **"Sent by {method} · {date}"** — the method keeps its click-to-pick popover.
- **"Sent with this query"** eyebrow, then **document rows**, each a locked **`TypeGlyph`** + name +
  a sent-or-not pip:
  - **Query letter** and **Synopsis** — sent-or-not; clicking the row toggles it (adds/removes the
    material). Historic queries with no `materialsWanted` display the **agent's** expected set; the
    first edit promotes that set onto the query.
  - **Sample materials** (renamed from "Sample chapters") — an **Add / Change** affordance opens an
    inline editor: a **unit toggle (Pages / Chapters / Words)** + a **quantity** field. On save the row
    reads it back — **"3 chapters" / "50 pages" / "10,000 words"** (comma-grouped) — via the new pure
    `sampleMaterialText` in the canonical `lib/materials.ts` (no second formatter elsewhere). A
    **Remove** control clears it.
- **Submission package (PRO)** — the foot row (linked-package card, or an "Attach a submission
  package" row with the Pro chip → the packages page).

### Data — wired to existing fields, back-compat read
- Writes go through **`updateQuery(id, { materialsWanted })`** (a plain patch; `materialsWanted` **is**
  in the query update allowlist — [firestore.rules:555](../firestore.rules), validated as a list ≤20),
  each with an **undo** restoring the prior stored value. **No new fields, no rules change.**
- The sample unit/quantity uses the existing **`QueryMaterial.type` / `quantity`**
  (`"pages"|"chapters"|"words"|"other"` + number|string).
- **Back-compatible read (historic data preserved):** a legacy item with no `type`/`quantity` (a bare
  boolean/"included"/name-only entry) reads as **"Included"** (unit/quantity unspecified) rather than
  vanishing; a legacy free-string keeps its existing display. Locked in `materials.test.ts`.

### ⚠ Required follow-up — CSV import template (flag, not built)
The parked CSV-import stream needs **matching unit + quantity columns** for sample materials —
otherwise imported queries land with sample materials flagged but **no unit/quantity** (they'd read
"Included" via the back-compat path, losing the "N pages/chapters/words" detail). Flagged here as the
required follow-up in that stream; **not built in this pass** (no CSV work in scope).

---

## Confirmations
- **`elapsed()` reused** (=`elapsedLabel`, `lib/queryAmbient.ts`); **`QueryMaterial.type`/`quantity`
  reused**, not re-added.
- **Pill removed; warning glyph removed + fill to end** (Phase 1).
- **Bar labels = end-anchors + hover/tap hollow-circle markers, touch-wired** (Phase 3, prior pass).
- **What you sent wired to existing `QueryMaterial.type`/`quantity` with a back-compat read;** CSV-
  template follow-up flagged above.
- **No new fields / no rules changes.**
- **Shared timeline component?** The Tracking readout/bar lives in `QueryTimeline.tsx`, consumed **only**
  by the Queries reading pane (`Queries.tsx`) — grep confirms no other importer — so these changes don't
  ripple to other panes. The What-you-sent sub-card is inline in `Queries.tsx` (not shared).
- **Locked components** consumed verbatim (`TypeGlyph`, `StatusDot`, `F12Menu`, nav); tokens not hex;
  UK spelling; exact `QueryStatus` strings.

### Git log (this pass)
```
<phase-4>  feat(queries): What you sent → document rows + sample unit/quantity (Phase 6)
cf4fead    docs(tracking): bar-anchors-hover design ref (spec-derived)
6ff4c46    feat(tracking): overdue bar drops the warning glyph, fills to the end
```
Phase 2 already satisfied (`66f8ae7`) — no commit. Clean `git status` after the Phase 4 commit (bar the
pre-existing out-of-scope theme WIP `themes.md`/`index.css`, untouched); every phase individually
revertible. No deploy, no branch, no PR.

## ⚠ Verify in-browser on dev (auth-gated — the preview harness can't log in)
- **Overdue/grace bar** — the hover **and tap** date pop-up on the hollow-circle markers; the fill runs
  to the end with no glyph.
- **What you sent** — toggling Query letter / Synopsis; adding/changing sample materials (unit + qty →
  readback); the undo toasts; a legacy query reading "Included"; the PRO package foot row.
