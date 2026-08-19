# To-do page — match the Query Centre (layout and tokens only)

`tests/e2e/qcMatch.measure.ts` · 12 assertions · **6 red before, 12 green after**
Screenshots: `reports/qc-match/{queries,todo}-{1440,1920}.png`

## Red before the change

    RED  W1440 · content width equals the Query Centre's    todo=1010 (pad 80/80)  qc=1100 (pad 35/35)
    RED  W1920 · content width equals the Query Centre's    todo=1490              qc=1580
    RED  W1440 · the page's scroll row does not scroll      todo=[ws-nav,wpg-scroll]  qc=[ws-nav,f12-rows]
    RED  W1920 · the page's scroll row does not scroll      (as above)
    RED  T1    · no raw hex outside :root                   60 distinct, 117 occurrences
    RED  T2    · a sage band paints the QC panel header     todo=(unmeasured)  qc=rgb(220,224,217) rgb(208,214,204)

## 1 · Full width, one screen — the same mechanism, not a second one

The Query Centre's chain is `.wpg-scroll` (flex column, from the grid's `fill` prop) → **a grid** at
`flex: 1; min-height: 0` whose second track is `minmax(0, 1fr)` → a column with `min-height: 0` →
a scroller at `flex: 1; overflow-y: auto; min-height: 0`. To-do had every link of it except the
middle one, where `.tdw-split` was a **wrapping flex row**.

**That wrap was the whole fault.** In a wrapping row the line's cross size is the tallest item's own
content height, not the container's — so `.tdw-rail` and `.tdw-work` measured **1331px inside a
669px split**, `.wpg-scroll` took the overflow, and the page scrolled as one block with the header
travelling with it. `align-content: stretch` cannot rescue it: there is no leftover space to
distribute once the content already exceeds the line. The split is a grid again.

The wrap had been introduced to fix a real thing — `minmax(260px, 340px)` starved the pane to
**w=0** at 390, because 260 is a floor the grid honours before `minmax(0, 1fr)` is fed anything.
That is fixed in the **track** instead: `min(340px, 34%)` has no floor, so the pane always keeps two
thirds of the measure. Measured at 390: rail 94, work 164. No breakpoint decides it.

Gutter: `.qc-wpg .wpg-scroll` overrode `padding-inline` to 35px against the shell's 80. To-do now
does the same, and the number is stated **once** — `--content-gutter-tight`, read by both — rather
than as a literal in each sheet. The row's padding is overridden, never `--content-gutter` itself,
which `.wpg-plate` reads through a `calc()` and which would drag the masthead out of true with the
other nine pages.

Result at both widths: content **1100 = 1100** and **1580 = 1580**, `documentElement` overflow 0,
and `/todo` scrolls in exactly two places — `tpl-zone` and `tdk-w` — against `/queries`' `f12-rows`.

### The regression this pass introduced, and the assertion that missed it

Making the page stop scrolling exposed that **`.tdw-work` clipped 125px of card** — the whole
Snooze / Open query / Dismiss / Complete footer — at `566` tall against `691` of content, with
`overflow: hidden` and nothing able to reach it. While the page scrolled, the cards simply grew past
the pane and the page absorbed it; the pane had never needed a scrollport of its own.

`.tdk-w` is that scrollport now — `flex: 1; min-height: 0; overflow-y: auto`, the Query Centre's
`.f12-rows` in this page's clothing.

**The first form of L1/L2 passed over it.** "The pane column owns a scroller" counted elements with
`overflow-y: auto` anywhere inside the column, and was satisfied by the form card's own
EdgeFadeScroll — a scroller, just not the one that had to exist. The assertion now checks that
**nothing is stranded**: no box in either column may hold content taller than itself and clip it.
That is false when the page scrolls on the column's behalf *and* when a scroller sits in the wrong
place, so it covers both halves of "the panes scroll, the page does not".

## 2 · Tokens by name

`todoDock.css` held **117 hex occurrences across 60 distinct values, and no `:root` block**. It now
holds **zero outside `:root`**, and the one `:root` block carries two rgba values only.

The vocabulary was measured, not guessed — `tests/e2e/qcVocab.measure.ts` reads every custom
property that resolves in the pane's own scope and inverts it to hex → token. **40 of the 60
literals sat Δ1–Δ4 from a token that already existed** (`#b3a496` is one step off `--qc-tx-stamp`;
`#eee4d7` one off `--qc-rim-off`; `#fbf6ee` one off `--nt-empty-bg`) — colour-picker roundings of
real tokens, which is exactly what the brief said they were.

The three bands, which is what the brief named:

| band | was | is |
|---|---|---|
| housekeeping | `#d7ddd5 → #d5dbd3`, `rgba(90,110,88,.2)` | `--sage-band → --sage-band-2`, `--sage-edge` |
| urgent | `#f3e0d6 → #eed7ca`, `rgba(124,58,42,.16)` | `--pink → --pink-h`, `--pink-b` |
| yours | `#f7f0e2 → #f2e9d6`, `rgba(138,116,64,.16)` | `--gold-t → --gold-b`, `--gold-b` |

The housekeeping band is now **the same two stops the Query Centre's Tracking/Notes header paints**,
by name: measured `rgb(220,224,217) rgb(208,214,204)` on both pages.

Everything else went onto the f12 semantic ramp — `--ink` / `--ink-2` / `--sub` / `--muted` /
`--faint` for the type scale, `--line` / `--hair` / `--hairline` for the three edge weights,
`--white` / `--card` / `--paper` / `--oat` / `--desk` for surfaces, `--burg`, `--sage` / `--sageD`,
`--pink` / `--pink-b` / `--pink-i`, `--gold-i`.

**Two pages, two palettes, and that is the point.** `/queries` runs `.t-f12.qc-neutral` (the `--n0…
--n8` ramp); `/todo` runs the warm `.t-f12` base. So `--ink` resolves `#141412` there and `#1e1a16`
here. Writing names rather than values is what lets the pane follow whichever palette its page is
in — and `--sage-band` and `--pink` happen to be identical in both, which is why the band assertion
holds across the two.

Two values had no name anywhere: the card rim's burgundy at `.28` and its hairlines at `.13`
(`--qc-rim-*` are all opaque). Added as `--tdk-rim` / `--tdk-rimline`, nothing else reads them.

## 3 · Still fluid, still three rimmed cards

No fixed widths, no media queries, no container queries. `container-type: inline-size` also went
from `.tdk-w`: the last `@container` in the sheet was removed when the pane went fluid, so it named
a context nothing read — and it is not inert, since `container-type` applies containment and makes
the element a containing block for fixed descendants. Checked before removing (this sheet declares
no `position: fixed`; todo.css's remaining query is answered by `.tdb-jnbody`, in the takeover
that is portalled clear of this column). The three cards and their rims are untouched — 72/72 on
`paneChassis.measure.ts`, 93 on `contract.measure.ts`.

## Locks retargeted, and one that went red on its own prose

Six unit locks asserted the literals this pass deleted. Every claim survives; the artefact changed:

- **the rim's colour** (×2) — now `var(--tdk-rim)` **and** the rgba in `:root`. Asserting only the
  `var()` would pass a token repointed to anything; asserting only the value would go red the moment
  it moved to where every other colour in the sheet lives.
- **the three group tints** — asserted over token names, plus "no group has gone back to a literal".
  Stronger than before: two tokens that drift to the same value still read as two decisions.
- **`.tdk-prime`'s ink fill** — was `var(--ink-strong, #241209)`. **`--ink-strong` is defined nowhere
  in `src/`**, so the fallback was doing the whole job. Repointed to `--ink`, which resolves.
- **the split's mechanism** — required `flex-wrap: wrap` and forbade `grid-template-columns`,
  i.e. it encoded the fault. Inverted, with the reason.

`tasksViewport.test.tsx` then went red **on the comments explaining the change** — the prose names
both `flex: 0 1 340px` and `.tpl-head` while saying they are gone. The house rule applied: strip
comments before asserting. Two cases there now read a decommented copy.

`paneChassis.measure.ts`'s stop table was six hexes copied out of the stylesheet — a lock asserting
a file against itself. It reads the tokens off the page and checks the band paints them: two
derivations against each other, never against a number typed by hand.

## Standing / not mine

- **`--ink-strong` is read by five files and defined nowhere** — `forms.css`, `todo.css`,
  `paneJourney.css`, `paneSweep.css` and (until this pass) `todoDock.css`. Every one of those
  buttons is painted by its hex fallback. Only the in-scope one is fixed; the other four are a
  sheet-by-sheet job.
- **`chase` / `fix1` "reachable on this account"** are red on `contract.measure.ts` — and are red on
  the **deployed** build too, same account, verified directly. Data, not this change.
- **The band's figure overlaps the motif and the close control** when its value is a word rather
  than a number ("Yesterday"), and a note renders two tiles both labelled ADDED. Both are present
  identically on the deployed build — pre-existing, and content rather than layout.
- **The split keeps its own 22px padding**, so To-do's cards sit 22px inside the content column
  where the Query Centre's sit flush. The asserted parity is the content column and it is exact;
  this is a page-internal rhythm the brief did not name, and changing it would move the vertical
  spacing too.
- **The header plate now stands expanded at rest**, where it used to arrive condensed — because the
  page no longer scrolls, so nothing sets `stuck`. That is the collapse-on-engagement law working as
  written for a `fill` page: the signal there is the first click in the content, not scroll.

## Gates

tsc 0 · production build 0 (grepped whole output) · vitest **330 files, 5776 passed, 2 skipped**
· qcMatch 12/12 · paneChassis 72/72 · paneFrame 32/32 · contract 91/93 (the two above).
