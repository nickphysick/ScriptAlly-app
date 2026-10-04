# The plate header — Step 0

**Stopped on item 3, as the pack instructs.** Nothing edited.

## False premises

1. **"The page name still appears only once the title is behind the bar" (§1) and PH6's "at `scrollTop` 0
   on every route … the page name is hidden" are false on the six living routes** — the Query Centre is one.
   Living headers v3 (1 Oct) puts the page's crumb in the bar *from first paint*; `quietBar.measure.ts`
   carries a separate living branch asserting exactly that, and the Query Centre's bar measures name
   `opacity: 1` at rest today. PH6 as written would reverse living headers v3 on six routes, which §1's
   "everything else … unchanged" says it should not.
2. **The report's "scrolled until the page name shows"** has no such position on the Query Centre — the
   name is there at rest.
3. **The pack names Q2, Q3 and `.ph-art` as the locks to amend, and misses three the plate breaks by
   design** (item 4 below): `pageHeaderV2` §4.4, `livingHeadersV3` LH4, and `quietBar` Q8.

## 1 · Level, and the baselines — ✓

The worktree was **21 commits behind** (`3a420a1c`); fast-forwarded to `2ae7d18a`, 0 ahead, clean. One
landed change touches this pack's files — six lines in `pageHeader.css`, a line-height fix on the living
intro's styled runs — and it does not conflict.

| | baseline at `2ae7d18a` |
|---|---|
| `tsc --noEmit` | 0 errors |
| `build:dev` | clean, 0 flagged lines |
| Vitest | **8,265 passed · 3 skipped / 512 files** |

## 2 · The Query Centre's header — ✓

`QcCentre` renders `PageHeader variant="full"` with `living={living}` and the courier as `art`.
`QcEmpty` is its own component on its own branch (`emptyKind === "first"`), with its own `PageHeader`
call — so a `plate` prop that only `QcCentre` passes leaves it untouched.

## 3 · The desk frame's white — ✗

**`.qcv-desk { background: #fff }` — a literal** (`qcvCourts.css:24`). The page's `--qcv-*` palette has
no white. The pack says "✗ if only a literal would do".

The closest token: **`--fc-card: #ffffff` at `:root`** (`components/containers/framedCard.css`) — the
shared card-surface white, declared at `:root` so it resolves everywhere including portals. Same value,
right meaning. But the desk does not read it, so the plate and the desk would share a *value*, not a
*source*.

## 4 · What the plate moves

| Lock | Asserts today | With the plate |
|---|---|---|
| `quietBar` **Q2** (all routes) | at rest no hairline (`hairline === 0`) | amended by §1 — hairline visible |
| `quietBar` **Q3** | at 3 the hairline wakes | still true; no longer a change |
| `quietBar` **Q2 (living)** | at rest the crumb is shown | **unchanged** — see premise 1 |
| `pageHeaderV2` **§4.4** | the QC's header and title tops equal the Contact list's, comps' and packages' (±0.5) | **breaks by design** — the plate moves the QC's top by ~56px |
| `livingHeadersV3` **LH4** | h1, intro, actions, first tile, first row share one left x (±1) | **breaks by design** — the plate insets the text 38px |
| `quietBar` **Q8** | the header's text starts level with the cards | **breaks by design**, same reason |
| `livingHeadersV3` LH1 · LH6 · LH7 | the QC header against itself across counts | should hold |
| `pageHeader.test`, `pageHeaderDefault.test`, `mastheadFormat.test`, `contactV11` | the default full header and `.ph--full .ph-art` | should hold — the plate is opt-in |

## 5 · The room above the plate — ✓, narrowly

Measured at rest, 1440: the bar ends at **105.8**, and so does `.ws-window`, which clips (`overflow:
hidden`). The plate's top would be 105.8 + 74 = **179.8**; the drawing rises 62px, so its top is
**117.8 — 12px inside the clip.** It fits. The title is still `h1[data-page-title]`; the 74px of ground
holds only the `aria-hidden` art; and on the Query Centre the bar's name is shown from first paint
anyway, so the title detection gates nothing there.

⚠️ The same pageHeader.css records a drawing that rose 40px and lost its top 14px to that clip. This one
rises 62 into 74 — fine at rest, but a future change to the bar's height or the 74 eats the margin first.
