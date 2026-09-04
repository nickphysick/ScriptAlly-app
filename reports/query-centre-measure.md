# Query Centre — card measured against the ref

Playwright, 1440×900, first card in each. Built page = deployed dev at `aef8b7b4`; ref =
`design-refs/query-centre.html` opened over `file://`. Raw values in
`reports/query-centre-measure.json`.

## ⚠️ The prompt's premise is REFUTED — no global rule wins anything

The brief expected *"global type/layout rules that the ref's scoped CSS does not [inherit]—

specifically a heading scale"*. Measured, that is not what is happening:

- **There is not one `font-size` mismatch in the whole probe.** Band word, name, agency and
  leaf day all measure exactly the ref's sizes. No heading scale is winning; no `h3`/`h4`/
  `.playfair` rule reaches the card.

- **Every `display` mismatch attributes to `(no rule — initial/inherited default)`.** Nothing
  is overriding anything. The card is authored entirely in `<span>`s — because its root is a
  `<button>`, and a `<button>` may not contain block content — and my own stylesheet never declared
  `display` on ten of them. The ref uses `<div>`s, which are block by default.

- The three type differences that DO exist all attribute to **my own rules**
  (`.qcc-word`, `.qcc-turn`, `.qcc-nm`), and one of them is deliberate.

**So the fix is not scoping and not `!important`. It is declaring the display the spans never
had.** Nothing global is touched.

## The diff

| element · property | ref | built | winning rule |
|---|---|---|---|
| `band.word` · `fontFamily` | `"Playfair Display", serif` | `"Playfair Display", Georgia, serif` | .qcc-word { font-family: var(--font-serif) } |
| `band.word` · `lineHeight` | `normal` | `21.75px` | (no rule — initial/inherited default) |
| `band.turn` · `letterSpacing` | `1.17px` | `0.9px` | .qcc-turn { letter-spacing: .1em } |
| `body` · `display` | `block` | `inline` | (no rule — initial/inherited default) |
| `nm` · `lineHeight` | `23px` | `26px` | .qcc-nm { line-height: 1.3 } |
| `nm` · `display` | `block` | `inline` | (no rule — initial/inherited default) |
| `ag` · `display` | `block` | `inline` | (no rule — initial/inherited default) |
| `leaf.mo` · `display` | `block` | `inline` | (no rule — initial/inherited default) |
| `leaf.dy` · `display` | `block` | `inline` | (no rule — initial/inherited default) |
| `leaf.cap` · `display` | `block` | `inline` | (no rule — initial/inherited default) |
| `fact.m` · `display` | `block` | `inline` | (no rule — initial/inherited default) |

## What the geometry says — the part a property table cannot

| claim | ref | built |
|---|---|---|
| agency's top, relative to the name's | **27px** (stacked) | **8px** — same line |
| leaf day's top, relative to the month's | **18px** (stacked) | **-15px** — day sits ABOVE month |

Boxes, where they differ:

| element | ref | built |
|---|---|---|
| `card` | 443x224 | 540x208 |
| `band` | 443x51 | 540x51 |
| `band.word` | 55x20 | 55x22 |
| `band.turn` | 92x12 | 88x13 |
| `body` | 443x173 | 540x193 |
| `who` | 403x64 | 540x48 |
| `whotx` | 279x44 | 416x27 |
| `nm` | 279x23 | 122x27 |
| `ag` | 279x17 | 76x17 |
| `leaf` | 46x64 | 46x28 |
| `leaf.mo` | 44x18 | 17x18 |
| `leaf.dy` | 44x30 | 10x37 |
| `leaf.cap` | 44x14 | 19x14 |
| `fact` | 403x53 | 540x53 |
| `fact.s` | 289x18 | 540x18 |
| `fact.m` | 289x12 | 92x12 |

`nm` at 122px wide against the ref's 279 is shrink-to-fit — an inline box takes its content's
width, so `overflow: hidden` and `text-overflow: ellipsis` on it apply to nothing. `leaf` at 46×28
against 46×64 is the three inline children collapsing onto one line.

## Not faults

- **Grid columns.** Ref `442.656px 442.672px 442.656px`; built `540px 540px`.
  The RULE is identical (`repeat(auto-fill, minmax(380px, 1fr))`, `gap: 20px`) — the ref is a
  standalone page ~1348px wide and the app's content column is ~1100px beside the rail. Two columns
  is `auto-fill` working. **Do not widen `minmax` to force three.**

- **`nm` line-height 1.3 vs the ref's 1.15.** Deliberate, and it stays. Mixed-case Playfair
  below 1.3 crops its descenders — the house law — and a mockup only ever exercises the names
  somebody typed into it. Costs 3px of card height.

- **`band.word` font-family.** `var(--font-serif)` resolves to the same face with one more
  fallback. Reading the token is right.

## Toolbar — measured, and the brief is right

| control | in the browsing view? |
|---|---|
| search input | **NO** |
| Filter | **NO** |
| Sort | **NO** |
| Group | present, but **icon-only**, alone at the end of the quick row |
| Log new query | yes — the masthead primary, at y=111 |
| active-chips row | **NO** |

Quick row as rendered: `All54@241`, `With you8@241`, `With the agent33@241`, `Offers1@241`, `Closed12@241`, `!Past expected@241`, `(icon only)@237`

⚠️ **The first run of this probe reported Filter, Group and Sort all present at `top: 0`.**
That was the hidden-page trap — every workspace page stays mounted, so a document-wide text search
matched another page's copies. The tell is a rect at the origin. The probe is scoped to the visible
`.wpg` now, and the honest answer is that none of the three is on this view.

⚠️ **`PillTrig` is icon-only by decision, not by accident** — a 36px icon button since v5 P1,
with "the word in the title, the aria-label and the popover's own header". The ref draws labelled
toolbar buttons. That is a real divergence between the ref and an established app control, and it
is flagged rather than resolved by whichever I happened to build last.

---

# After the fix — re-measured

Same probe, same viewport, rebuilt bundle served from a local `vite preview` of a worktree
holding only this pass's files on top of clean `HEAD`.

## Property diffs remaining

| element · property | ref | built | why it stands |
|---|---|---|---|
| `band.word` · `fontFamily` | `"Playfair Display", serif` | `"Playfair Display", Georgia, serif` | `var(--font-serif)` — same face, one more fallback. Reading the token is right. |
| `band.word` · `lineHeight` | `normal` | `20.25px` | The ref's `normal` stated as `1.35`. `normal` is a font metric: if Playfair fails to load, Georgia's is ~1.14, under the descender floor. |

**2 remaining, all three named and deliberate.** Every other property is an identical string.

## The two structural faults, fixed

| claim | before | after | ref |
|---|---|---|---|
| agency sits below the name | **8px** (same line) | **27px** | 27px |
| leaf day sits below the month | **−15px** (day above month) | **18.875px** | 18px |

## ⚠️ The name's line-height is a MEASUREMENT, not a citation

The ref sets `1.15`. I kept `1.3` on the house descender law — and the brief was right to ask
for evidence rather than a rule, so here it is. Playfair Display, 20px, the string
`Jorge Pippa Guy qy`:

| line-height | box | ink spilling BELOW the box |
|---|---|---|
| `1.15` | 23px | **+2px** |
| `1.3` | 26px | **+0px** |

`.qcc-nm` computes `overflow: hidden` and carries no vertical padding, so
ink below its box is **cropped**. At the ref's 1.15 that is 2px off every agent whose name has a
descender. At 1.3 the spill is 0. The ref drew names that happened not to have one.

The lock asserts the **property** — *the name does not crop* — measured on the real `.qcc-nm`,
so any future retune passes if it is safe and fails if it is not.

## ⚠️ Playfair Display has OLD-STYLE FIGURES, which decided the leaf

`0123456789` at 19px with `line-height: 1`: box **19px**, ink **26px**, spilling **+3px below** and +4px above. The digits descend.

The ref's `line-height: 1` on the leaf's day is therefore the exact construction the house law
forbids — and it is nonetheless **safe here**, because the day's own `padding: 6px 0 5px` absorbs
the 3px inside a leaf that clips. So the ref's value is matched, with the measurement recorded at
it and a warning not to tighten the padding.

## Toolbar, after

| control | before | after |
|---|---|---|
| search | NO | **yes**, y=237→285 row |
| Filter · Group · Sort | Group only, icon alone in the quick row | **all three**, together at y=285 |
| active-chips row | reported missing | **present** with 2 controls once a filter is set |

Quick row now holds courts and nothing else: `All54@237`, `With you8@237`, `With the agent33@237`, `Offers1@237`, `Closed12@237`, `!Past expected@237`

## Widths

1280 → 2 columns · 1440 → 2 · 1920 → 4 · 2560 → 4. Shots in `reports/query-centre-shots/`.
The column count is REPORTED, never asserted: it is a property of the width beside the rail, not of
the card, and pinning it would fail the day the content cap moves.
