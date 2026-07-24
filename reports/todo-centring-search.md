# To-do — true centring (forensic) + the search in the panel header

Two items. The centring got a forensic, prescriptive fix — the previous pack's jsdom equality
assertion was toothless (jsdom cannot measure real viewport layout), so this pack fixes the
architecture so asymmetry is impossible, and the report carries a manual measurement step.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — one geometry owner (the culprit removed) | `7847144` | 1519 |
| P2 — the big search in the panel header | `e1be441` | 1523 |
| P2B — the real brand in the corner | `cce6c87` | 1530 |
| P3 — the sweep + this report | `<this commit>` | 1537 |

Gates green per commit (`tsc` + production build + full Vitest, pipefail); explicit-path
staging.

## Phase 1 — the named culprit and its fix

**Ancestor chain, grid → frame, with every horizontal box contribution:**

| element | horizontal box |
|---|---|
| `.tdb-grid` | padding `6px 0` (zero horizontal) · fluid `1fr` tracks |
| `.tdb-sheetbody` | padding `0` |
| `.tdb-mainc` (panel) | `width:100%` + symmetric `--tdb-panel-pad` (22px, the card's own content inset) |
| `.tdb-centre` | `width:100%`, no margin/max-width |
| **`.tdb-asm.tdb-ws`** | **`width: var(--tdb-asm)` (fixed 1344px) + `margin: 0 auto`** ← the culprit |
| `.tdb-col` | `max-width` + `margin-inline:auto` + one equal `padding-inline` token |
| `.tdb-wrap` | the scroller, `scrollbar-gutter: stable both-edges` |
| `.tsh-body` | `overflow:hidden`, no padding |

**The culprit: `.tdb-asm`** — a *second* geometry owner nested inside `.tdb-col`. It set a
fixed `width: var(--tdb-asm)` (1344px today-off) plus its own `margin: 0 auto`. Below ~1440px
the fixed row is wider than the column's inner width, so it overflowed the column and bled off
to the right — the content read left-heavy. It is culprit-type (a)+(b) from the pack's list: a
leftover fixed width/centre from the pre-shell "assembly" layout, sizing the content against
the wrong reference.

**The fix (structural):** `.tdb-asm` is now `width: 100%` — it simply fills the column. `.tdb-col`
is the SOLE geometry owner (`max-width` + auto margins + one equal padding token). The whole
dead `--tdb-asm`/`--tdb-sheet` assembly-width tier — its tokens, its 1427/1700 media overrides,
its width transition — is stripped; the ≥1700 media keeps only the 4-up fluid-grid rule.

**Verification honesty:** the jsdom lock asserts the *architecture* (what it can): the culprit
removed (regression grep on `width: var(--tdb-asm)`), `.tdb-col` the single owner, no other
chain element carrying a max-width / auto margin / one-sided horizontal pad, and no `vw`-derived
width in the chain (the `vw` users are all fixed/absolute overlays). Pixel symmetry is the
manual step below.

### Manual gutter measurements (devtools) — TO RECORD ON DEV

> Left gutter = sidebar's right edge → content's left edge. Right gutter = content's right edge
> → page's right edge. Measure `.tdb-col`'s box against `.tsh-mainwrap`.

| viewport | left gutter | right gutter | equal? |
|---|---|---|---|
| 1440px | ___ px | ___ px | ☐ |
| 1920px | ___ px | ___ px | ☐ |

*(Recorded on the dev deploy after this pack lands — the page is auth-gated, so the pixel
numbers are Nick's to fill in from `scriptally-dev.web.app/todo`.)*

## Phase 2 — the search, large, centred in the panel header

The search leaves the breadcrumb bar (now breadcrumb + user only) and moves into the panel's
items row — **absolute-centred** (`left:50%`, translate) so the "{n} items" line (left) and the
view toggle (right) can't push it off-centre. The row grows to seat it and **loses its bottom
hairline** (the cards' top edge separates).

The pill returns to the **settled large design**: 460×46 (tokened `--tdb-hsearch-w/-h`), white,
warm hairline, soft shadow, "Search your list…", the 32px oat roundel at the right. Its width
has a **container-relative floor** — `min(--tdb-hsearch-w, calc(100% - --tdb-hsearch-reserve))`
— so it shrinks before ever colliding with the flanks, never a `vw`. The cards/ledger toggle
grows to the same 46px band (the shared token), its chips scaling, the white+ink-ring active
chip unchanged — so items line, pill and toggle sit on one aligned band.

Behaviour intact: same handler, the sidebar query chip and the "Showing x of y" line unchanged,
⌘K retargeted to the new mount. Session: the search fades with the panel via `EXIT_FADE` and
returns on exit; the orphaned `.tsh-clearing .tsh-search` bar rule is removed. The tour's search
anchor follows to `.tdb-hsearch`.

## Phase 2B — the real brand

The sidebar's placeholder (✈ glyph + text) is replaced by the app's actual assets, recon'd from
the NavDrawer: the paper-plane mark `/scriptally-logo-new.png` then the `ScriptAllyLogo`
wordmark (`/scriptally-title-v2.png`), at the drawer's proportions, wrapped in a home-route link
(`onBrand → dashboard`) with `aria-label="ScriptAlly — go to dashboard"`, the mark decorative
(`alt=""`, the wordmark carries `alt="ScriptAlly"`). No fabricated assets; both files verified
present in `public/`. In the collapsed icon rail the mark stays, the wordmark hides.

## In-browser checklist (dev)

1. **Equal gutters** — by eye and by devtools (record the numbers above); no double scrollbar.
2. **The big pill centred in the items row** with the oat roundel and **no rule beneath**; the
   toggle stands the pill's full 46px.
3. **The real logo + wordmark** in the sidebar corner (paper-plane + "ScriptAlly"), linking home.
4. **Search works** — the desk narrows, the sidebar query chip and the count line update.
5. **A session** opens (sidebar slides, the search leaves with the panel) and closes cleanly —
   no orphaned pill or bar animation.

## Deviations (flagged)

- **"via the drawer's proportions"** — the mark is 34px and the wordmark 38px (the drawer uses
  36/44); trimmed a touch for the 212px sidebar while keeping the mark:wordmark ratio. The
  assets themselves are the real files, unmodified.
- **The dead `--tdb-asm`/`--tdb-sheet` tier tokens were removed in P1** (not deferred to the
  sweep) because they *are* the culprit's machinery — leaving them would leave a second
  geometry vocabulary in the file.
- jsdom limitation is explicit: the lock is architectural (single-owner walk, no stray
  horizontal boxes, no vw in the chain); the pixel symmetry is the manual devtools step.

## Close

The queue: dev deploy → prod sequencing pass → Correction UI.
