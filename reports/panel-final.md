# To-do — the panel, final (geometry, the chip bench, the blue-sticker Pro card)

The parchment panel's settled form: widened and re-scaled, its context zone turned from a second
nav list into a chip bench, and a blue Pro sticker seated at its foot in place of the old colophon.
Completes the hardback spine. The rail, the bar, the cream L, the session and the width tiers all
stand from the spine pack; only the panel changed.

Refs (fenced in `design-refs/`, first/starred board normative): `panel-geometry.html` (fix56 — the
spine board at 260px; the ivory board rejected) · `panel-chip-bench.html` (fix59 · W1 the chip
bench; W2 checklist / W3 tray rejected) · `pro-card.html` (fix57 · option 5 the blue sticker; 1–4,
6 rejected).

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P0 — the refs (fenced) | `f0aa31c` | 1527 |
| P1 — panel geometry + the breathing head | `4d6ff97` | 1536 |
| P2 — the chip bench | `51eeb37` | 1541 |
| P3 — the blue-sticker Pro card | `9d5c46e` | 1544 |
| P4 — the sweep + this report | `<this commit>` | 1544 |

Gates green per commit (`tsc` + production build + full Vitest, `set -o pipefail`); explicit-path
staging. The pack's own suite is `todoPanelFinal.test.ts` (P1 geometry, P2 bench, P3 sticker
integration); the component lock for the sticker is `assistantPromo.test.ts`.

## What shipped

- **P1 — geometry + the breathing head.** The panel is 260px (`--spine-panel-w`, from 196), with a
  tokened type scale on `.spine-root`: rows `--spine-row-h 38px` / `--spine-row-fs 13px`, count
  `--spine-count-fs 10px`, mono section labels `--spine-lab-fs 7.5px` at `--spine-lab-tr 0.22em`;
  the wordmark up a step (the real artwork, 34). The breathing head is `--spine-head-clear 28px` on
  the wordmark's bottom padding, with `.spine-cat` (the first content node) carrying no top padding
  — so the offset from the wordmark to the first content IS the token. The collapse tier and the
  session panel-exit are unchanged (the clearing panel still reads `var(--spine-panel-w)`, so the
  exit is clean at 260).
- **P2 — the chip bench.** The context zone (`.spine-bench`) is a control surface: an inset
  deeper-parchment card (`#ece4d4` / `#dbcfb8` / radius 12) that heads itself — funnel + mono
  `FILTER` + a `Clear` link shown only when a facet narrows — with the facets as wrapping toggle
  chips (All leads; selected = deep ink `#3a2c20`/cream; idle = parchment/`#cbbc9e`; zero = faded
  45% but rendered). The active search rides as a dismissable ✕ chip. **The selection model is
  unchanged** — the chips call the identical `togglePill` (the solo-then-membership set); every
  reactive bit carries over (counts, struck totals via `fnFace` — now styled at `.spine-chipn
  .tdb-was`, zero-fade). The ruled `.spine-nk` label and the Today's-list lens are retired (baked:
  Today lives in the corner pop-up); TodoShell renders `contextContent` gated on the content.
- **P3 — the blue Pro sticker.** The content-panel colophon retired; its successor (`.spine-pro`,
  option 5) sits at the panel's foot via a new TodoShell `panelPromo` slot (between the spacer and
  the foot: pushed to the foot on a tall viewport, scrolling as content on a short one — never
  pinned). Warm-white ground `#fdf6f2`, 1.5px ink border, a 4px offset block in pastille blue
  `#c2cfda` (**the only blue sticker in the app**), a slate `✦ SCRIPTALLY PRO` pill, the Playfair
  "Hand over the housekeeping", the live-derived "{x} of your {y} tasks could run in the background
  whilst you write." (numbers from the existing colophon derivation, never hardcoded), and "Meet
  the assistant →" opening the preview modal. Gated `plan !== Pro`; no close control. `ProBanner →
  ProSticker` (dropping `rows` + `onWhatsInPro`).
- **P4 — the sweep + the record.** The retired styles are gone: `todoShell.css` lost `.spine-nk`
  and the `.spine-ctx .tdb-fpill*`/`.tdb-fdivider` context row-list rules; `todo.css` lost the
  filter row-list (`.tdb-fq*`, `.tdb-fpill*`, `.tdb-fdivider`, `.tdb-fn .tdb-was`) and the colophon
  (`.tdb-colo*`, `.tdb-cololink*`). `--dot-*` tokens stay (the ledger dots use them); the struck
  total keeps its live rule at `.spine-chipn .tdb-was`. The tour's filter step retargets from
  `.tdb-fpill` to `.spine-bench`. `themes.md` gains "The panel (settled)" (geometry + the breathing
  head, the three-grammar principle, the chip bench, the blue sticker), and the spine section's
  panel bullet is flagged AMENDED.

## In-browser script (dev)

1. **The panel is wider and calmer** — 260px, the wordmark a step larger with a clear band of air
   beneath it before `QUERYING`; the nav rows and counts sit at the new scale.
2. **The chip bench** — below the pages, an inset deeper-parchment card headed by the funnel +
   `FILTER`. Click a chip: it fills ink; the others become the narrowed set; the counts react; a
   `Clear` link appears in the header. A zero-count chip is faded but still there. Type in the
   search: a quoted ✕ chip joins the bench; its ✕ clears the search. `All` brings everything back.
   (Today's list is NOT here — it's the corner pop-up.)
3. **The blue sticker** — at the panel's foot (non-Pro), the board's card language in blue: the ink
   border, the 4px pastille-blue block, the slate `✦ SCRIPTALLY PRO` pill, "Hand over the
   housekeeping", the derived count line, "Meet the assistant →" (opens the preview modal). On a
   tall window it sits just above Help; shrink the window and it scrolls as content, never pinned.
4. **Session + tiers unchanged** — Begin still slides the panel off left while the rail holds; below
   1100px the panel is still the rail-triggered overlay (the bench + sticker ride inside it).

## Deviations (flagged)

- **The funnel is lucide `Funnel`** — the pack names "the funnel icon (TypeGlyph)", but TypeGlyph is
  locked to the three material `ComponentType`s and can't render a funnel; as with every nav/utility
  glyph in this shell, lucide stands in. No locked component edited.
- **The wordmark is artwork, sized by prop.** "Wordmark up a step, tokened" — the wordmark is the
  real `ScriptAllyLogo` (the centring-pack decision), sized by `heightPx` (30 → 34), not a CSS font
  token; the type SCALE (rows/counts/labels) is fully tokened.
- **The sticker's derived line drops the old preamble.** Option 5 shows only the count line, so the
  colophon's "The assistant carries out your agent research for you." sentence is not carried over;
  the wording is option 5's exactly ("could run in the background", not "could be handled in").
- jsdom mounts nothing (the page is auth-gated): geometry, tokens, wiring and placement are
  source/rule-text locks; the pixels are the in-browser script above.

## Close

**The panel is settled.** Queue unchanged: dev deploy → prod sequencing pass → Correction UI.
