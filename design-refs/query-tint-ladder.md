# Query state tints — the tint ladder (rulesheet)

**Status:** locked, 4 Sep 2026. Supersedes the sand/sage/pink scheme in `query-state-colours.html` and the band values in `query-centre.html`; where they disagree, this sheet wins. Canonical tokens go in `design-refs/themes.md` (Cappuccino); Bold Pastille and Editorial rows are `TODO`.

## The rule in one line

**Colour is direction. Depth is a step on a ladder of the same hue.** Sage for anything the writer sent (the query is with the agent); pink for anything the agent asked for (it's with the writer); three flat steps of each, deeper as the query goes further. Slate for an open Offer. Grey for anything closed. Nothing is ever good or bad.

## Tokens (Cappuccino, flat fills — no gradients)

| Token | Hex | Used for |
|---|---|---|
| `--stage-out-1` | `#e6eae3` | Queried |
| `--stage-out-2` | `#d7ddd3` | Partial Sent |
| `--stage-out-3` | `#c7d0c2` | Full Sent |
| `--stage-in-1`  | `#f8e9e2` | Partial Requested |
| `--stage-in-2`  | `#f1dbd0` | Full Requested |
| `--stage-in-3`  | `#e8c9bb` | R&R (revise & resubmit) |
| `--stage-offer` | `#d7e0e8` | Offer, while undecided |
| `--stage-closed`| `#e4e1db` | Closed, Rejected, Withdrawn, Offer accepted/declined, No response |

Band hairline beneath: `.5px solid rgba(0,0,0,.06)` on every step. Text on a band is always ink `#1c130f` (status word, Playfair 15px) and `#6a5a50` (turn caption, JetBrains Mono 9px). `StatusDot` sits in the band at 24px — imported, never recreated.

## Mapping

| Status | Direction | Step | Turn caption |
|---|---|---|---|
| Queried | out (sage) | 1 | With the agent |
| Partial Sent | out | 2 | With the agent |
| Full Sent | out | 3 | With the agent |
| Partial Requested | in (pink) | 1 | With you |
| Full Requested | in | 2 | With you |
| R&R | in | 3 | With you |
| Requested but not yet sent | in | as requested | With you |
| Offer (open) | offer | — | Offer |
| Closed / Rejected / Withdrawn | closed | — | Closed |
| Offer accepted or declined | closed | — | Closed |
| No response | closed | — | No response |

Direction is "who acted last, and therefore whose court it is", not "who the writer is waiting on". A requested-but-unsent partial is pink step 1 even though the writer hasn't done anything yet — the agent's request is the last act.

## Where the tint appears (all surfaces, same tokens)

1. **Query card band** — the primary use.
2. **Calendar leaf month strip** on the card — same token as its band.
3. **Detail panel header band** — same token as the card that opened it.
4. **Quick-filter swatches** — `With you` uses `--stage-in-2`, `With the agent` uses `--stage-out-2`, `Offers` and `Closed` their tokens.
5. **Any list-row tint** (selected row, grouped section header) that encodes state.
6. **Dashboard pipeline cells** and **Fortnight in Focus** when they colour by state — do not invent a second palette.
7. **Ghost tile** (the new-query preview): dashed borders, transparent fill, no tint until saved.

## What the tint does *not* do

- It never encodes time pressure. Overdue is the ink `!` ring (16px, 1.4px border, JetBrains 700) beside a factual sentence — never a hue, never a deeper step.
- It never changes on hover. Hover is shadow only.
- Selection is a `1.5px #e8c8bc` ring, not a fill, so it never collides with the band.
- Chips (agent monograms) are parchment-lifted regardless of band — parchment fill, `.5px #e6dccf`, `0 1px 2px rgba(58,28,20,.08), 0 3px 8px rgba(58,28,20,.10)`. Never pink, never band-tinted.
- No red anywhere; no burgundy outside `StatusDot`, Form 11 chevrons/selected-day, and the inset-frame rgba.
- Closed is always grey, whatever the reason. The reason is stated in words on the card.

## Derivation

`turn`, `step` and the caption come from `lib/queryCardFacts.ts` fed by `recomputeQuery` output. Nothing stores a tint, a step, or a turn. If a surface needs the colour, it calls `cardFacts()` and maps `{direction, step}` → token. One mapping function, exported once, used everywhere.

## ⚠️ Debt: the ladder is scoped to `.t-f12`, and a second surface now copies it

*(Raised by the Calendar's v63 §D, 4 Sep 2026 — for whoever owns this sheet.)*

`f12.css` declares `--stage-out-1`…`--stage-closed` on **`.t-f12`**, the Query Centre's own theme
class. The Calendar's board does not sit under it, so a `var(--stage-out-1)` on a calendar band
resolves to **nothing** and paints nothing — silently, through a clean build. That file's own
comment already records why the scope matters; this is the first surface outside the Query Centre to
need the tokens.

**What the Calendar did, and why it is a stopgap.** `todoCalendar.css` carries `--tl-stage-*`, an
eight-rung **documented copy**, on the precedent `--mk-hero-ground` already sets in this repo: a
cross-tier `var()` read is what a refactor deletes without knowing another surface depended on it.
`src/components/todo/calendarStageTints.test.ts` asserts the copy **against `f12.css` itself** —
never a literal on both sides — so a retone here fails there and gets re-synced deliberately. It
also fails if the ladder ever leaves `.t-f12`.

**The fix that retires the copy: move the eight tokens to `:root` and have `.t-f12` read them.**
Nothing about the Query Centre changes — `:root` is an ancestor of everything — and the Calendar
can then read the ladder directly, deleting its copy and that lock. It was not done from the
Calendar's side because `f12.css` was another session's live file at the time.

**Until then, the two are kept in step by the lock and not by anyone remembering.**
