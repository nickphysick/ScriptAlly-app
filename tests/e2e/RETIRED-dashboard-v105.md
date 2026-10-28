# Retired by Dashboard v105 (27 Oct)

| Suite | Case | Why | Replaced by |
|---|---|---|---|
| `dashV93.measure.ts` | **DB93 C1** — the variant (Full / Medium / Compact) from the card's height | it read the medallion and the ladder, which the press ID replaces | DB105 S1 (every state at every size), B2 |
| `dashV93.measure.ts` | **DB93 C2 · C3** — nothing cut at any variant; the ladder's states and the ring | the medallion, its ring and the ladder are gone | DB105 S1, B2 (the ranks strip's colour heads and the one current) |
| `dashV93.measure.ts` | **DB93 C4 · C7** — the "Your contributions" copy table, a/an, no Nick, no green | the card's words are v105's (`lib/foundingCard.ts`, unit-tested) | DB105 B1, B3, B4, S2; `src/lib/foundingCard.test.ts` |
| `dashV93.measure.ts` | **DB93 C5** — the How it works panel: opens at the right, closes by ✕, Esc and the dim layer | Part D replaces the right-hand panel with the slides | DB105 D1 |
| `src/components/dashboard/v93/` (`Dash93Founding.tsx`, `dash93.css`) | v93's card and its panel | nothing renders them after Part D. The one live rule in `dash93.css` (the laptop rows: founding up to 290, task at least 254) moved to `v105/dash105.css` unchanged | `Dash105Founding`, `Dash105How` |
| `src/lib/foundingCopy.ts` (+ test) | the "Your contributions" card's words and the panel's | read only by v93's card | `src/lib/foundingCard.ts` (+ test) |
| `ringFraction` in `src/lib/foundingStats.ts` (+ its tests) | the medallion's progress ring | read only by v93's card | — (the press ID has no ring) |
| `dashV93Shots.measure.ts` | the v93 card's report shots | it drove the retired card | `dashV105Shots.measure.ts` |

**Kept:** DB93 A1–A3 (the task card's kind band) and C6 (the laptop rows: founding up to 290, task at least 254) — neither reads the founding card's insides. DB71, DB77 A1–A4 and D1, DB58 R2.

**Re-pointed, not retired:** DB71 F3 and its `L2-fw-172` / `F3-art-140` breaks now read `Dash105Founding` (`.d105-frame`, the body on show, the photo, the headline or the name). DB93 C5 opened the panel from the press ID's ⓘ between Parts B and D, then retired (above).
