# Tracking readout — overdue pill + grace headline tweaks

Small follow-up on the Tracking pane. **Readout copy/colour only** — no fork changes, no schema, no
rules. On `main` in `/Users/nickphysick/ScriptAlly-il` (branch `claude-il`), one commit per phase,
each revertible. Gates green before each commit (tsc + production build + full Vitest — **927 green**;
rules-compile unaffected, no rules touched). Single file: `src/components/reading-pane/QueryTimeline.tsx`.

The suggested-action model + fork reshape stay held pending the "hugely overdue" threshold decision —
out of scope here.

**Design ref:** `overdue-pill-colours.html` (named "final: ink pill, ink icon") was **not present in
`design-refs/`** — this pass worked from the prompt's explicit spec. Colours come from `.t-f12` tokens
(`--ink`, `--pink-i`), not literal hex.

---

## Phase 1 — Overdue readout (`11993ee`)
- **Badge → ink pill.** Was a mono/uppercase/tracked pink pill; now white text on `var(--ink)`,
  **Playfair Display**, natural case — dropped `FONT_MONO`, `textTransform: uppercase` and the
  `.06em` letter-spacing (8.5px → 12.5px/600 to read at natural case). Text unchanged:
  `Response overdue by {elapsed}` with the existing re-escalation suffix `· nudged {n}×` intact
  (`once` at 1).
- **Hourglass icon → `--ink`** to match the pill (the shared `clockIcon` inherits `currentColor`, so
  the branch's container `color` moved from `var(--pink-i)` to `var(--ink)`; the badge keeps its own
  white text).
- **Axis drops "TODAY."** The warning glyph at the bar end already signifies today. The axis row keeps
  **`SENT {date}` only**; the `RESPONSE EXPECTED {date}` label now rides its own marker (absolutely
  positioned at the marker's `expectedPct`, clamped to 16–84 % so it never overflows the row). The
  marker line itself stays at true `expectedPct`.

## Phase 2 — Grace headline (`<this commit>`)
- Headline now reads **`Response {elapsed} overdue — nudge sent {natural date}`** — the overdue
  duration is added via the **same `elapsedLabel(waiting.daysOverdue)`** the overdue badge uses. The
  natural-language date (`fmtNatural`, e.g. "15th July") stays in the header's own (inherited) font;
  single ink, no burgundy split. Meta line unchanged: `Scheduled follow-up set for {natural date}`.

---

## Confirmations
- **`elapsedLabel` reused, not re-implemented** — imported from `src/lib/queryAmbient.ts`; now consumed
  at the waiting line, the overdue badge, the writer "asked … ago" line, **and** the grace headline.
- **No fork / schema / rules touched** — `composerChips`/`TimelineComposer` untouched; no new fields;
  `firestore.rules` unchanged (rules-compile status carries over green).
- **Locked components** consumed verbatim (`StatusDot`, the shared `clockIcon`); tokens not hex; UK
  spelling.

### Git log (this pass)
```
<phase-2>  feat(tracking): grace headline shows the overdue duration
11993ee    feat(tracking): overdue pill -> ink Playfair, ink icon, drop TODAY axis label
```
Clean `git status` after the Phase 2 commit; both phases individually revertible. No deploy, no branch,
no PR.
