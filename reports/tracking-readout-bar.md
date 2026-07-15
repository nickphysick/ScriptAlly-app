# Tracking readout — no-pill overdue, grace headline, robust bar labels

Follow-up to the Tracking pane (**replaces** the held `tracking-readout-tweaks-prompt.md` — the pill
approach changed and the bar-label fix is now a cleaner rule). **Readout + bar presentation only** — no
fork changes, no schema, no rules. On `main` in `/Users/nickphysick/ScriptAlly-il` (branch `claude-il`,
the standing worktree — no new branch). One commit per phase, revertible. Gates green before each
commit (tsc + production build + full Vitest — **933 green**; rules-compile unaffected, rules untouched).
One source file + its lock test.

The suggested-action model + fork reshape stay held pending the "hugely overdue" threshold decision.

**Design ref:** `bar-anchors-hover.html` (named "no pill, ink icon, end-anchor labels, hollow-circle
hover ticks") was **not present in `design-refs/`** — worked from the prompt's explicit spec. Colours
resolve from `.t-f12` tokens (`--ink`, `--pink-i`, `--panel`, `--faint`), not literal hex.

---

## Phase 1 — Overdue readout: drop the pill (`749c816`)
The overdue amount is now **plain text, no background** — Playfair Display, natural case, `var(--ink)`,
reading `Response overdue by {elapsed}` (keeps the `· nudged {n}×` re-escalation suffix). The pill
background/border/padding are gone; the hourglass icon stays `--ink` to match.

## Phase 2 — Grace headline (already in place)
The spec — `Response {elapsed} overdue — nudge sent {natural date}`, meta `Scheduled follow-up set for
{natural date}` — was **already landed** in the previous pass (`66f8ae7`), verbatim: the headline reads
`Response {elapsedLabel(daysOverdue)} overdue — nudge sent {fmtNatural}`, natural date in the header's
own (inherited) font. **No-op this pass** — nothing to change, so no empty commit.

## Phase 3 — Bar labels: end-anchors + hover/tap milestone pop-ups (`<this commit>`)
The robust rule that **replaces marker-label clamping**: the only persistent bar labels are the two
end-anchors; every mid-bar milestone is a bare marker whose date appears only on hover/tap. Overlap is
impossible by construction (anchors pinned to opposite edges; the pop-up renders above the bar while
anchors sit below).

- **New reusable `BarMilestone`** (module-level in QueryTimeline.tsx): a hollow circle (~13px,
  `var(--panel)` fill, 1.5px `var(--faint, #b3a596)` outline) centred on the bar at a derived `pct`.
  Its date shows in a small dark pop-up **above** the bar, which **anchors inward near an edge**
  (`start`/`end`/`mid` by `pct`) so it can't overflow.
- **Touch-wired, not hover-only:** hover is `pointerType === "mouse"`-guarded (hover doesn't exist on
  touch), and an `onClick` **pin** drives it on tap — tap opens, tap again closes. `role="tooltip"` +
  `aria-expanded`; the pop-up is `pointer-events: none`. One pop-up per marker; each bar has exactly one.
- **Overdue bar:** the old 2px burgundy line + the clamped inline `RESPONSE EXPECTED` label are gone.
  The expected date now rides a `BarMilestone` at `expectedPct`; the axis keeps **`SENT {date}` only**
  (the end warning glyph is the end-anchor — no end label).
- **Grace bar:** the fills + shimmer stay inside the `overflow:hidden` `.tl-gracebar`, now wrapped in a
  relative outer div so the marker + pop-up escape above it. The original-deadline `BarMilestone` sits
  at `deadlinePct`; the axis keeps its end-anchors **`SENT {date}` + `FOLLOW-UP {date}`**.

### Tests (jsdom limits flagged)
jsdom can't verify the tap/hover pop-up firing or the bar's pixel geometry — the new
`Bar P3 artefacts` block in `queryAmbient.test.ts` locks the **structural rule** instead: BarMilestone
present with the hollow-circle chrome (`50%` radius, `--panel` fill, `--faint` outline); touch-wiring
(`pointerType === "mouse"` guard + `setPinned`); pop-up above (`bottom: calc(100% + 8px)`) with inward
anchoring; both bars mount a milestone at its derived position (`expectedPct` / `deadlinePct`); the old
clamp (`Math.min(84, expectedPct…`) is gone; end-anchors present. **⚠ The actual hover + tap
interaction and the pop-up's no-overflow behaviour need Nick's in-browser check on dev** (auth-gated;
requires an overdue query, and a grace query for the deadline marker).

---

## Confirmations
- **`elapsedLabel` reused, not re-implemented** — imported from `src/lib/queryAmbient.ts`.
- **Pill removed** (Phase 1); **mid-bar persistent labels replaced by hover/tap pop-ups, touch-wired**
  (Phase 3).
- **No fork / schema / rules touched** — `composerChips`/`TimelineComposer` untouched; no new fields;
  `firestore.rules` unchanged (rules-compile carries over green).
- **Locked components** consumed verbatim (`StatusDot`, the shared `clockIcon`); tokens not hex; UK
  spelling.

### Git log (this pass)
```
<phase-3>  feat(tracking): bar end-anchors + hollow-circle milestones w/ hover/tap pop-ups
749c816    feat(tracking): overdue readout drops the pill (plain ink Playfair text)
```
Phase 2 was already satisfied (`66f8ae7`) — no commit. Clean `git status` after the Phase 3 commit;
every phase individually revertible. No deploy, no branch, no PR.
