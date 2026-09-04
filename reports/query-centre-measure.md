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

---

# Pass 2 — measured

Playwright against a local `vite preview` of a worktree holding only this pass's files on clean
`HEAD`. Raw values in `reports/query-centre-pass2.json`.

## ⚠️ Three premises in the prompt, refuted by measurement

**1 · `design-refs/query-tint-ladder.md` does not exist on this machine** — searched Downloads,
Desktop, Documents and `/tmp`, by name and by pattern. The brief calls it the authority for the
eight tokens. §4 was built anyway, from the ref's own `:root` and its status→stage map at line 618,
which is this project's standing rule. **What the rulesheet says beyond the values is unknown to
this pass.**

**2 · There is no `togglePop` in the ref, and nothing toggles `edge`.** The word `edge` occurs
exactly once in the whole file — the CSS rule `.tbtn.edge .pop{left:auto;right:0}` at line 66. The
ref declares the edge treatment and never applies it, so there was no implementation to mirror; the
behaviour came from the brief's prose.

**3 · §5's leafless cards do not exist on this build.** Measured: **54 of 54 cards carry a leaf**,
and there is exactly **one** distinct card height (225px). `Daniel O'Rourke` and `Marcus Reed` are
the REF's fixture names, not the app's — and the ref renders its leaf unconditionally too. The
likely original is the pre-correction-pass-1 build, where the leaf's children were inline and it
collapsed to 28px against the ref's 64: present in the DOM, and absent to look at. That was fixed
by the `display: block` pass. A permanent assertion now holds both halves — every card has a leaf,
and the set of card heights has exactly one member.

## §1 · the cap

| width | ref grid | built before | built after |
|---|---|---|---|
| 1280 | 1208px / 3 cols | — | **1010px / 2 cols** (≈495px cards) |
| 1440 | 1368px / 3 cols | 1100px / 2 cols | **1170px / 3 cols** (≈377px) |
| 2560 | 1480px / 4 cols | 1660px / 4 cols, uncapped | **1480px / 4 cols** (≈355px) |

All five rows — quick, toolbar, stage, grid, foot — share one left edge and one width at every
width measured. The cap is declared **once**, on a wrapping column, rather than five times as the
ref does it: a single capped column cannot disagree with itself, so the toolbar's left edge IS the
grid's left edge structurally rather than by two numbers matching.

⚠️ **1280 yields 2 columns, not the brief's 3, and the cause is measured rather than guessed.**
The app's content column is **1010px** there against the ref's **1208** — 198px narrower, because
the rail takes width the ref's standalone page does not have. `auto-fill` with the ref's own 340px
floor then fits two. Getting three would need the floor at ≤323px, i.e. overriding a value the ref
states in order to compensate for the rail — the same move pass 1 warned against in the opposite
direction. **Flagged for Nick, not silently changed; it is a one-line change if wanted.** The
brief's "≈390/440px cards" assumes the ref's column width for the same reason.

## §2 · the search

`flex: 1 1 0%` → **`flex: 0 0 260px`**, scoped to the browsing column because `.f12-lsearch` is
shared with the record view where it should still grow. Measured before: **962px at 1440 and
1522px at 2560**. After: 260px at both.

## §3 · the popovers

⚠️ **The portal half was already true.** All three measured `offsetParent: (none/body)` and
`clippingAncestor: null` *before* this pass — `useFixedMenu` renders them fixed at document level.
No change was needed and none was made.

**The overflow half was real:** Group's panel measured `right: 1388` against a viewport of 1280.
Fixed by adding `align: "auto"` to the shared hook — right-align once the trigger's left edge is
past the viewport midline. Additive: a third value, every existing caller untouched.

⚠️ **And it CANNOT BE PROVED RED, which is a finding rather than a gap.** §1's cap and §2's fixed
search between them pull the trio far enough left that no popover overflows whatever the alignment
does — the original fault was caused by the uncapped 1660px row plus a search grown to 1522px.
Measured at 1024, where all three triggers *do* cross the midline (513/559/605 against 512): the
panels are 220–288px wide with ~460px of room, so left-aligning would still fit. **The edge rule is
correct, cheap and currently unfalsifiable here** — recorded as unproved rather than as proved safe.
The overflow assertions themselves are live at two widths and the midline precondition is asserted.

**The three popovers are built, not stubs.** Filter went from 24 rows to 41: `Agency`, `Sent via`
and `Included` are new sections, built from the scoped data rather than a constant. That also
retired dead code — `GridFilters` / `matchesGridFilters` / `emptyGridFilters` were written and
unit-locked in §3a and **mounted nowhere**, which is the "hardening something nothing renders"
fault. They are wired now. Group offers all five options; Sort all five.

## §4 · the ladder

Eight flat tokens, one exported mapping (`stageFor`), read by the card band, the leaf's month
strip and the quick-filter swatches. Measured against the ref, rung for rung:

| status | class | built | ref |
|---|---|---|---|
| Queried | `qcc--s-out-1` | `rgb(230, 234, 227)` | `rgb(230, 234, 227)` |
| Rejected | `qcc--s-closed` | `rgb(228, 225, 219)` | `—` |
| Partial Requested | `qcc--s-in-1` | `rgb(248, 233, 226)` | `rgb(248, 233, 226)` |

⚠️ **The bands were painting as a gradient IMAGE over a transparent colour** — `background-color:
rgba(0, 0, 0, 0)` measured on every card. That is the `background` shorthand resetting the colour,
which this repo has an audit about: one unresolved token and the band is see-through. Now
`background-color: var(--band-a)` with `background-image: none`, matching the ref exactly.

Retired entirely, grep-verified to zero in live code: `--turn-*` (all seven), `.qcc--sand/you/
agent`, and the rejected sand pair `#f7ebd7`/`#f1e1c8`. The only surviving mentions are inside the
lock that forbids them and one obituary comment.

## Proved red

| mutation | result |
|---|---|
| §1 the 1480 cap removed | RED — *the cap is not honoured at 2560* |
| §1 the grid track back to 380 | RED — *not 3 columns at 1440* |
| §2 the search grows again | RED — *the search grew at 1440* |
| §4 band reverts to a gradient shorthand | RED — *Queried paints a background image* |
| §4 a rung repointed to the wrong token | RED — *Partial Requested does not match the ref's rung* |
| §3 edge-awareness removed | **GREEN — unproved**, see §3 above |

## Gate

Isolated worktree, this pass's files on clean `HEAD`: **tsc 0 · build:dev clean · vitest 1 failed
/ 7484 passed (7488)**. The red is `datePickerHub`, another stream's. `functions/src/email.test.ts`
fails to COLLECT in the worktree only (no `functions/node_modules`); it passes 9/9 in the primary
tree.

One lock of mine went red and was retargeted rather than rebaselined: `QueryCard.test.tsx`'s band
class. Its law — *the class comes from the derivation, never re-decided in the component* — is
unchanged; what moved is which derivation, from the five courts to the eight rungs. Both halves are
now asserted, since `turn` still drives the filters.

---

## Pass 2 · addendum — the 320 floor, and the rulesheet audited

The floor moved in the REF (`6f790958`, one line in 107,778 bytes) and the code follows it. Pass 2
declined to lower it precisely because the ref stated 340; the authority moved first.

### Columns, before and after

| width | content column | at 340 | at 320 | card |
|---|---|---|---|---|
| 1280 | 1010px | 2 cols | **3 cols** | ≈323px |
| 1440 | 1170px | 3 cols | 3 cols — unchanged | ≈377px |
| 1920 | — | 4 cols | 4 cols — unchanged | — |
| 2560 | 1480px | 4 cols | 4 cols — unchanged | ≈355px |

⚠️ **The ref and the build now differ at 1440, and that is the rail rather than a fault.** At 320
the ref's 1368px page fits FOUR; the app's 1170px column fits three. Same rule, different available
width — the same reason 340 fitted two at 1280. The brief asked for 3 at 1280 and no change at
1440/1920/2560, and that is what shipped.

### `query-tint-ladder.md` — audited against the built page

The rulesheet arrived after pass 2 built §4 from the ref's code. **Every token value and the whole
status→stage mapping in it match what shipped**, including the two the ref could not have told me:
that `Requested but not yet sent` takes the step it was requested at, and that a decided offer
becomes `closed`.

#### "Where the tint appears" — 7 items

| # | item | state |
|---|---|---|
| 1 | Card band | ✅ |
| 2 | Leaf month strip, same token as its band | ✅ |
| 3 | **Detail panel header band, same token as the card that opened it** | ❌ **contradicted** |
| 4 | Quick-filter swatches (`in-2` / `out-2` / offer / closed) | ✅ |
| 5 | Any list-row tint **that encodes state** | ⚠️ see below |
| 6 | Dashboard pipeline cells / Fortnight in Focus | ➖ neither |
| 7 | Ghost tile — dashed, no tint until saved | ➖ not built (Phase 5) |

**Item 3 is a measured contradiction.** Opening a card (`qcc--s-out-1`) reaches the record
view, and **nothing inside it paints a ladder token** — `stageTokenUsersInRecord: 0`. No element
matching `.qc-heroband` / `.f12-hero` / `.qc-hero` / `.qc-idband` was found either, so the record
view has no state-tinted header band to carry the card's token. The record view is the surface
Phase 4 replaces with the slide-over, so this is **reported, not fixed here** — but it is a real
divergence from a locked sheet and should be closed by Phase 4 rather than forgotten.

**Item 5 needs Nick's ruling.** The list's selected row paints `rgb(247, 227, 221)` — a pink that is
**not** a ladder token (`--stage-in-1` is `rgb(248, 233, 226)`). Two readings, and the sheet
supports both: item 5 only claims rows *"that encode state"*, and a selection tint encodes
SELECTION, so it is arguably out of scope. But "What the tint does not do" says *"Selection is a
1.5px #e8c8bc ring, not a fill"* — and this is a fill. **The card obeys that rule** (ring, no fill);
the list row predates it. Flagged rather than changed, since the list is Phase 4's to re-house.

**Item 6 is neither followed nor contradicted.** The dashboard's charts colour by `--sd-hue`, the
StatusDot theme accent — one hue for the whole surface, not a state palette. They do not encode
query state by colour at all, so there is no second palette to have invented.

#### "What the tint does not do" — 6 rules

| rule | state |
|---|---|
| Never encodes time pressure; overdue is the ink `!` ring, 16px / 1.4px / JetBrains 700 | ✅ exactly that, and locked |
| Never changes on hover; hover is shadow only | ✅ locked as an absence of `transform` |
| Selection is a `1.5px #e8c8bc` ring, not a fill | ✅ on the card · ⚠️ the record list row fills (above) |
| Chips parchment-lifted regardless of band — never pink, never band-tinted | ✅ locked |
| No red; no burgundy outside StatusDot, Form 11 chrome and the inset frame | ✅ swept, both files |
| Closed is always grey whatever the reason; the reason is stated in words | ✅ `--stage-closed` for every closed status, and `closedSentence()` states the reason |

⚠️ **One thing the sheet names that the app cannot model:** `Offer accepted or declined → closed`.
`QueryStatus` has `OFFER` and no accepted/declined member, so that row describes a distinction the
data does not carry. Not a contradiction — a gap in the model the sheet assumes. Flagged.

### Gate

Isolated worktree, this pass's files on clean `HEAD`: **tsc 0 · build:dev clean · vitest 1 failed /
7484 passed (7488)** — `datePickerHub`, another stream's. `functions/src/email.test.ts` fails to
COLLECT in the worktree only (no `functions/node_modules`); it passes 9/9 in the primary tree.
