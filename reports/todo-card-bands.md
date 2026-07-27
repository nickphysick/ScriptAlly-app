# To-do Card Header Bands (Variant A) — slim tinted bands replace the spines

Pack: `todo-card-bands`. Presentational conversion of every board card. Gates per phase (tsc ·
build · full Vitest). ⚠ **The design ref was NOT in Downloads** (`todo-card-bands-a-full.html`
absent); built from the pack's detailed prose (the structure law + tag treatments + ~34px band +
lane tints are all fully specified). `design-refs/todo-card-bands-a-v1.html` committed as an
honest RECONSTRUCTION (header comment records provenance) — reconcile when the real mockup lands.

## STEP 0 — recon (tree clean at `0f210a6`)

1. **Spine consumers to retire:** `.tdb-tile::before` (+ `.do/.hk/.nt`), `.tdb-gcard::before`,
   `.tdb-tile.rvcard::before`, and (Phase 2) `.tdb-clear::before` (+ `.do/.hk`). All are the 3px
   left `::before` bars.
2. **Clip chain:** `.tdb-tile` was `overflow:hidden` with `.tdb-mid { flex:1 1 auto; overflow:hidden }`
   clipping and `.tdb-tmeta`/`.tdb-tacts` pinned `flex:none`. Under the frame model the whole
   mid/meta/acts group moves into `.tdb-body` (a flex column, `min-height:0`); `.tdb-mid` still
   flex-clips beneath the band — pinned-pill grammar intact (halt (a) does NOT fire). Overlays are
   `.tdb-tile receipt`/`.tdb-tile dismissed` variants (Phase 2 — halt (b) does not fire; they
   convert to rim→frame→body).
3. **Height:** 208 → **242** (208 + the ~34 band; two-line subs still fit). Uniform on
   `.tdb-tile` + `.tdb-gcard`. Exact-fit is **width-only** — `--tdb-cardw` is the flex-basis; the
   band adds height, `laneFit.ts` is untouched (halt (c) does NOT fire).
4. **Tag/kicker sites:** the tile's `.tdb-tags` row and the grouped card's `.tdb-kick` move into
   the band; on-band treatments below.

No halt condition fired.

## PHASE 1 — the frame conversion

- **Structure law (CSS):** `.tdb-tile`/`.tdb-gcard` = RIM (white, radius 13, 3px pad, NO clip,
  shadow) → `.tdb-frame` (1px `--line`, radius 10, `overflow:hidden` — the clip context) →
  `.tdb-band ${stream}` (slim 34px, lane tint, 1px identity `border-bottom`) + `.tdb-body` (white,
  `flex:1 1 auto`, the mid/meta/acts). Spines DELETED (no dead CSS).
- **Band tints:** `.do` → `--pink-t` / `--pink-b`; `.hk` → `--hk-cof` / `--hk-cof-edge`; `.nt` →
  `--note-t` / `--note-b`.
- **On-band tags:** standard `.tdb-tag:not(.offer):not(.warn)` → WHITE fill (pink border/ink kept
  — soft-pink would vanish pink-on-pink); urgency `.warn` keeps `--pink-btn`/`--pink-deep`/700;
  offer keeps the ink ★; the grouped-card `.tdb-kd` dot goes white-filled with the coffee border.
- **Markup:** `renderCard` (do/hk/nt tiles incl. notes), `renderGroupCard`, `renderReviewCard`
  wrapped rim→frame→band+body; the hover lift stays on the rim, the border-warm moves to the
  frame; `.tdb-tile.today .tdb-frame` carries the on-today border; the rail + review ✕ stay rim
  children (absolute, over the band).
- Tests: NEW `todoCardBands.test.ts` — the structure law (rim no-clip / frame clip / band tints /
  spines gone / on-band tag+dot / 242 height / --cardw width) + band-then-body order per card
  type. 1172 → **1180**.

## PHASE 2 — overlays, edges, the law

- **Overlays re-drawn against the framed card:** receipt / dismissed / fork / flip each wrapped in
  `.tdb-frame`, covering the whole frame (no band). The sage receipt fill + hk-spine border + the
  dismissed paper fill + all overlay padding moved onto the frame; the rim stays white. The
  flip/settle animations (`tdbRin`) ride the body as before; the cards still size to `--cardw`.
- **Empty-state sweep:** the per-reel `.tdb-clear` cards carried spines → RETIRED and gone NEUTRAL
  (horizontal empty-state cards, not lane tiles — a lone band read worse than the plain hairline).
  The new-desk welcome card, desk-cleared card, and the dashed ghost note card carried no spine —
  untouched.
- **`themes.md` regenerated:** a dated "CARD ANATOMY: header bands supersede the spines" section
  documents the rim/frame/band/body law + the on-band tag treatments, and marks the retune's spine
  references superseded.
- Tests 1180 (Phase 1) → **1180** (+3 Phase-2 overlay/clear locks fold into the same file count).

## FINALISE

| Phase | SHA | |
|---|---|---|
| 1 | `02ca2b7` | frame conversion (tile / grouped / review) |
| 2 | (this) | overlays, clears, themes.md |

- **Files:** `todo.css` · `ToDoPage.tsx` · NEW `todoCardBands.test.ts` · `themes.md` ·
  `design-refs/todo-card-bands-a-v1.html` (reconstruction). Vitest **1180+**. No engine/lib
  touched; `laneFit.ts` untouched (exact-fit is width-only).
- **Spine-retirement sweep:** `.tdb-tile::before` (+do/hk/nt), `.tdb-gcard::before`,
  `.tdb-tile.rvcard::before`, `.tdb-clear::before` (+do/hk) — ALL removed; grep-verified no 3px
  `::before` bar survives on any card.
- **Height resolution:** 208 → 242 uniform (both card classes), two-line subs fit.
- **In-browser checklist (Nick, dev):** the urgency `.warn` tag's rank on a pink band at real
  density (must still outrank the white-filled standard tags) · a Focused-session receipt flip on
  a banded card at the 3-card width (the sage overlay covers the frame incl. the band) · the
  forty-card coffee Housekeeping lane wash (does the repeated coffee band read calm or heavy) ·
  the note-yellow band on a Notes card · the grouped card's white kicker dot on coffee · the rail
  hover + review ✕ sitting over the band.
- **⚠ DEVIATION — the design ref was NOT supplied** (`todo-card-bands-a-full.html` absent from
  Downloads); built from the pack's detailed prose (structure law + tag treatments fully
  specified). `design-refs/todo-card-bands-a-v1.html` is an honest reconstruction — reconcile
  against the real mockup when it lands. Other deviations: clears went neutral (reported); band
  height 34, rim pad 3, body pad 13/18/14 tuned to the prose ("~34px", "3px padding").
