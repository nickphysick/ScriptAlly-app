# Query Centre — the working area stops being a container

Ref: `design-refs/86-fullwidth-white.html`. Commits `6f95ef4` → `05efbd7`. **Not deployed, not pushed.**

Revised after recon: `.ws-window` stays, `--content-gutter: 80px` stays, no cap, fill stays, the
header band stays. What went is `.f12-body`'s box and one duplicate button.

---

## 1 · Recon — every container between the scroller and the content

Identical outer chain in both the list view and the create takeover, measured on HEAD at 1440×900.

| # | element | file:line | draws |
|---|---|---|---|
| 1 | `.ws-window` | `workspaceShell.css:736, 745` | white bg · 1px `--ws-edge` · radius 16 · shadow · **`::after` inset ring** |
| 2 | `.ws-wbody.sv2-stagepad` | — | nothing |
| 3 | `.ws-work.ws-work--fit` | `workspaceShell.css` | white bg |
| 4 | `.f12-root` | `f12.css:21` | nothing — flex column, `height: 100%` |
| 5–7 | three unstyled wrappers | `Queries.tsx:2981`, App slot | nothing |
| 8 | `.wpg.wpg--fill.qc-wpg` | `workspacePageGrid.css` | nothing |
| 9 | `.wpg-plate` | `workspacePageGrid.css` | pad `18px 200px 0` → `0` working |
| 10 | `.wpg-scroll` | `workspacePageGrid.css` | pad `70px 80px 0` → `35px 80px 97px` working |
| 11 | **`.f12-body`** | **`f12.css:986–999`** | **1px `--line` · radius 18 · pad `12px 22px 20px` · margin `22px 0 26px`** ← removed |

Then they diverge:

- **list** → `.f12-list` (`f12.css:1004`) — no box, already de-carded
- **takeover** → `.qp-pane.f12-detail` (`f12.css:1097`, `flex: 1` only, no box) → an inline-styled
  div `pad 16px 20px 20px` (`Queries.tsx:3524`) → `.qch`, `.qc-take-body`, …

**There were two drawn boxes, not three.** "The card wrapping the list-and-pane region" and "the
card wrapping the takeover" are the same element — `.f12-body` — because the takeover replaces the
pane inside it.

---

## 2 · The takeover's dead height — what it actually was

**A flex chain anchored to the scrollport. Not a `min-height`, not a viewport unit, not a fixed
value** — and there is no `100vh` or `calc(100vh − …)` anywhere in it, which is why a grep for `vh`
finds only a popover's `max-height: min(520px, 70vh)`.

```
.wpg--fill > .wpg-scroll   display:flex; flex-direction:column
  .f12-body                flex:1; min-height:0   → stretches to the scrollport
    .qc-take-body          flex:1 1 0%            → stretches inside it
      .qc-form             flex:1 1 0; overflow:auto → stretches again
```

The scrollport's height comes from `.wpg { height:100% }` → `.ws-work--fit` → `.ws-window { flex:1 }`
→ the shell's viewport-locked column. Viewport-**derived**, through `height: 100%`.

Measured, create takeover at 1440×900:

- `.f12-body` **577.8** tall, content **556.8**, ending **123px** above the scrollport
  (97px invariance padding + 26px bottom margin)
- `.qc-form` **417.8** tall holding a **167px** step stack → **~250px** of empty column

**≈ 373px, growing one-for-one with monitor height.**

### The resolution, which was not the one specced

Nick's call, and it is the better answer: **the border was the fault, not the space.** This is a
fill page — the panes scroll internally and the page does not — so a short takeover legitimately
leaves the column taller than its content. *Framed*, that reads as a broken card with a screen of
empty inside it. *Unframed*, it is simply page.

So: **no fill-policy change, no mode-dependent hugging, no viewport arithmetic, and the invariance
padding's premise is untouched.** The 97px reclaim still does its job.

---

## 3 · The `QUERY CENTRE / Close` chrome bar

**There is no such component.** "QUERY CENTRE" is `PageHeader`'s own title rendering as the mono
uppercase label (the collapsed-band pack); `Close` was its single action — `button.svh-btn` inside
`.wsh-acts`, declared at `Queries.tsx:3030`:

```
label: "Close", onClick: () => { if (creating) closeCreate(); else closeRecord(); }
```

**Close and Cancel called identical handlers** — `Queries.tsx:3025` says so in prose. The bar's
Close was a pure duplicate of the in-pane Cancel: the same act, twice, eight pixels apart.

**Nothing else consumed it.** The only other back-chrome is `mobileChrome.tsx`'s `kind: "back"`
spec, registered at `Queries.tsx:648` — mobile-only, untouched, still working.

**What happened:** the action is gone; a journey renders `actions={[]}`. The band stays, because it
*is* the page's header and removing it would undo three packs of strip-on-`creating || recording`.

---

## 4 · Width caps

**None in force.** `--maxw: 1520px` is declared at `index.css:899` and is **dead** — no `var(--maxw)`
reader survives anywhere. Reported, not acted on: widths are relationships applied as padding, never
a cap. The proposed 1560px cap was dropped for the same reason.

Content width comes solely from `.wpg-scroll`'s `padding-inline: var(--content-gutter)` = 80px,
shell-wide. Measured at 1024, 1440 and 1920: gutters equal at **95px** a side (80 token + 15
scrollbar reservation), constant as the window grows, content flexing between them.

---

## 5 · The vertical seam — added, not kept

The pack said "that seam stays". **There was none.** With the border gone, the only thing between a
list column and a reading pane that scroll and select independently would be 12px of air.

One hairline on the list's own right edge, `--gut` of padding inside it and the row's `gap: var(--gut)`
outside, so it centres in the channel without either side naming a figure the other must track. It is
the only rule drawn inside the working area.

---

## 6 · Tints changed in §3

**None. Zero.**

The reason is structural, not luck: **`.f12-body` never painted a fill** — three locks forbade it
("the frame must never gain a fill") — so every element's ground was the white `.ws-work` before the
border went and is the same white after. Removing a border cannot change what a child sits against.

| element | own | ground | separation |
|---|---|---|---|
| resting list row | transparent | white | 1px `#f0eae1` bottom seam |
| selected row | `#e7eef6` | white | **17.9** luminance |
| row on hover | `--paper #faf6f0` | white | 9 (rule already present) |
| search field | `#faf6f0` | white | 9 |
| pills · hero · cards · picker | `#fffdfb` | white | 2 — separated by their 1px `#e6dccd` border, as always |
| collapsed step rows | transparent | white | 1px `#e6dccd` |
| sage header band | transparent | `#fffdfb` | 1px `#c8d0c5` bottom edge |

**No orphaned ring.** The only `::after` rim overlay in the chain belongs to `.ws-window`, which
stays — so removing `.f12-body` orphans nothing.

**The sage cards' rim is a plain border, not a pseudo-element.** The pack assumed a ring overlay;
measured, `.f12-card` and `.f12-hero` use `border: 1px` + `overflow: hidden`. The intent is gated:
all four edges, at rest **and** on hover, on both — because each time that fault recurred it was one
edge in one state, which a single-edge check misses.

---

## 7 · Browser checklist

Automated and green against **localhost** (`SA_E2E_BASE_URL=http://localhost:3000`), because this
pack does not deploy and the deployed bundle is a build behind:

| check | 1024 | 1440 | 1920 |
|---|---|---|---|
| working area draws no box (border/radius/fill/shadow/side pad/margin) | ✓ | ✓ | ✓ |
| vertical seam renders (1px `#f0eae1`) | ✓ | ✓ | ✓ |
| gutters equal both sides | 95/95 | 95/95 | 95/95 |
| page does not scroll (fill chain intact) | ✓ | ✓ | ✓ |

| check | result |
|---|---|
| band holds 52px through a journey | ✓ |
| strip offers no action during a journey | ✓ |
| in-pane Cancel present | ✓ |
| Esc closes | ✓ |
| Cancel closes, 96px card returns | ✓ |
| all four rim edges, agent hero, rest + hover | ✓ |
| all four rim edges, sage card, rest + hover | ✓ |
| working area paints no surface | ✓ |

**Left for your eye** (a harness cannot judge these): whether the flattened working area reads as
intentional rather than unstyled at 1920; whether the seam is the right weight against the page now
that it is the only rule inside the area; and the takeover with a short stack, which is where the
373px used to be framed.

---

## 8 · Two faults found that were not mine

**`createFrames.test.tsx` was red at HEAD before this pack touched anything** — and its own header
said it could not be: *"EVERY INPUT IS FIXED… or this would go red at midnight for nobody's
benefit."* `emptyDraft()` seeds today, so every frame carries the current date several times over.
The fixture was rendered on 12 August; the suite turned red on the 13th. The whole 56kB diff was
`12 August` → `13 August`. Regenerating would have hidden it for one day; the clock is pinned
instead (`3ee997f`), fixture untouched.

**The e2e harness was deleting three of the app's own stylesheets.** `liftMotionSuppression` removed
every `<style>` *containing* `animation: none !important`; `vite dev` serves each CSS file as an
injected `<style>`, and `f12.css`, `workspaceShell.css` and `motion.css` all carry that declaration
in reduced-motion blocks. It presented as the header band measuring 24px instead of 52 — computed
height 24, no transform, `animationName: none`, stable across 1.8s. Every reading true; the rule was
not beaten, its stylesheet was gone. It could not show against the deployed build, where the CSS is
one linked file. Fixed by marker (`e81ee73`).
