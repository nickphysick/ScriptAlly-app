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
