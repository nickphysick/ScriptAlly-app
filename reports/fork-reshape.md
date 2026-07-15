# Unit-toggle alignment fix + fork reshape (suggested-action)

Two fixes to the Queries pane. On `main` in `/Users/nickphysick/ScriptAlly-il` (branch `claude-il`,
the standing worktree — no new branch). One commit per phase, revertible. Gates green before each commit
(tsc + production build + full Vitest — **948 green**; rules-compile unaffected, no rules touched). No
new fields, no rules changes.

**Design refs — both committed** (⚠ **spec-derived**; colours from `.t-f12` tokens, not the files'
hex): `design-refs/whatyousent-b-refined.html` (unit toggle) and `design-refs/tracking-suggested.html`
(fork chips + pulse). **Ref scope honoured:** `tracking-suggested.html` is used ONLY for the fork-chip
styling + pulse; its stale readout/bar (old black pill, warning glyph, different nodes) is **ignored** —
dev is the source of truth for the readout and bar, and none of it was reintroduced.

---

## Phase 1 — Unit-toggle alignment (`ecb6515`)
The Pages/Chapters/Words segments carried a **per-segment `borderLeft` divider**; with `box-sizing:
border-box` that gave the first segment 1px more content width than the others (and the inset ring
doubled against the border), misaligning the row. **Fix:** removed the per-segment borders — a clean
equal-width segmented control whose selected state is the **inset `--ink` ring only** (`box-shadow:
inset 0 0 0 1.5px`, no border, no layout shift). Design ref updated to match.

## Phase 2 — Fork chips: one style, no fill (`e8cf1e8`)
- **The pink fill is gone.** Every fork chip renders in **one outlined style** — `tc-primary` /
  `tc-terminal` / `tc-nudge` / `tc-close` all fall through to the base `.tc-chip` look (no fill, no
  bold). Chips are told apart by their **direction-coloured StatusDot** (and the close chip's × glyph).
- **Rejection returns as a visible primary** for with-agent (waiting) states — Queried / Partial sent /
  Full sent now show **positive next + Rejection + Nudge + Close (when offered)**; the remaining
  outcomes tuck under "Other…" (from Queried, **Full requested stays under Other**). **Your-move**
  is unchanged (mark-sent + Close, Rejection under Other — the agent isn't evaluating there).
- Added the **pulse** machinery: `@keyframes tc-suggest` + `.tc-chip.tc-suggested` (a gentle burgundy
  halo; **CSS-only, no `var()` in the % selectors**, reduced-motion honoured). Applied in Phase 3.

## Phase 3 — Suggested-action rules, derived (`<this commit>`)
Exactly **one** chip may pulse, chosen by rule — **nothing stored** (`suggestedAction` in
`lib/queryAmbient.ts`, pure + unit-locked):

| state | suggested |
|---|---|
| overdue, **not** hugely overdue | **Nudge** |
| overdue **and** hugely overdue | **Close query** |
| grace (nudged, reminder ahead) | — (you're waiting on the agent) |
| within window | — |

`TimelineComposer` derives it from the **same escalation the readout reads** and applies `tc-suggested`
to the one chip whose `action.kind` matches (`nudge` / `close`); a `title="Suggested next step"` gives
reduced-motion / screen-reader users the cue too.

### "Hugely overdue" threshold — one clearly-named constant
```
HUGELY_OVERDUE_WINDOW_MULT = 3      // > 3× the agent's stated response window …
HUGELY_OVERDUE_FLOOR_WEEKS = 12     // … floored at 12 weeks (tiny/unstated windows don't flip early)
```
`isHugelyOverdue(daysOverdue, agentWindowWeeks)` → `daysOverdue > max(3 × window, 12 weeks) × 7 days`.

**Per-agent window availability:** `Agent.responseTimeWeeks` **is readable per query** (passed as
`agent.responseTimeWeeks`) — so the real per-agent window drives the threshold; the 12-week floor
covers agents whose window is tiny or unset. The **flat-26-week fallback was NOT needed** (it's only for
a schema with no readable window; ours has one).

### Tests
`suggestedAction` picks nudge / close / none at each level; grace + within pulse nothing; the tiny/unset
window is floored at 12 weeks; the threshold rises above the floor for large windows. Artefact locks:
the composer applies `tc-suggested` to a single chip matched by `action.kind`; the pulse is CSS-only
with no `var()` in the `%` selectors + reduced-motion off; no chip carries a pink fill (`--pink-btn`
gone). `composerChips.test.ts` re-locked for Rejection-as-primary + the ≤4 waiting count.

---

## Confirmations
- Unit toggle uses the **inset ring, no border** — aligned.
- **No fork chip is filled** — the suggested action is **pulse-only**.
- **Rejection is a primary** for with-agent states.
- Threshold constant: **> 3× the agent window, floor 12 weeks**; the **per-agent window was available**
  (no flat-26 fallback).
- **No new fields, no rules changes.** Derived-over-stored (suggested action is computed, no stored
  field). Tokens not hex (the halo's burgundy is a literal rgba only because `var()` can't live in a
  keyframe `%` selector — the documented exception); UK spelling; locked components verbatim.

### Git log (this pass)
```
<phase-3>  feat(tracking): suggested fork action pulses one chip by derived rule
e8cf1e8    feat(tracking): fork chips one outlined style, no fill; Rejection back as primary
ecb6515    fix(queries): unit-toggle alignment — drop per-segment borders
```
Clean `git status` after the Phase 3 commit (bar the pre-existing out-of-scope theme WIP
`themes.md`/`index.css`, untouched); every phase individually revertible. No deploy, no branch, no PR.

## ⚠ Verify in-browser on dev (auth-gated — the preview harness can't log in)
- The unit toggle: selecting a segment draws the inset ring with **no row shift**.
- The fork: all chips one outlined style; on an **overdue** query the **Nudge** chip pulses; on a
  **hugely overdue** one the **Close query** chip pulses; on **grace / within-window** nothing pulses;
  Rejection is a visible primary chip.
