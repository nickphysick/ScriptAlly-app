# Dashboard header rework and shadow bleed — run report

Baseline taken in a fresh worktree each phase (other streams are live in this checkout, and a
green suite on a mixed tree proves nothing).

| Phase | Commit | Note |
|---|---|---|
| 1 — card hover lift clipped | `e2c0ad0` | **already landed** before this pack, from Nick's direct report |
| 2 — Goals loses its band | `cfccf32` | only the mark box had shipped; the band was never in code |
| 3 — Active queries header, option A | `73545d3` | |
| 4 — shadow bleed | `24dfe6f` | |
| 5 — verification | *this commit* | |

Final gates: `tsc` clean · **3,738 passing, 2 skipped** · `npm run build` ✓.

## Phase 5 — the checks, measured

Measured against the **built** CSS at 1440×900 (a harness must load `dist/assets/index-*.css`, or
Tailwind's preflight is missing and every box is the wrong box model).

| Check | Result |
|---|---|
| All three bands exactly 51px, **computed height** | chart **51.00** · tasks **51.00** · activity **51.00** · spread **0** |
| Title does not wrap | 1280 ✓ · 1440 ✓ · 1920 ✓ (`titleWraps: false` at all three) |
| Card positions unchanged by the bleed | author `26,16` · chart `341,16` · tasks `26,333` · goals `1127,16` · activity `1127,120.8` — **identical** with and without |
| Page still does not scroll | `pageScrolls: false` |
| No card lifts on hover | every `.os-card…:hover` rule enumerated — **no transform**, one `transform: none` guard |
| Rim still responds | `.os-card.os-lift:hover::after` sets `box-shadow` ✓ |
| Goals has no band | `goalsHasBand: false`, `goalsHasMark: false` |
| Bleed applied correctly | `content-box`, padding `10px`, margin `-10px` |

**Hover was verified by enumerating every matching rule**, not by reading the first one. That is
deliberate: reading only the first `.os-card.os-lift:hover` is exactly what produced a confident
wrong diagnosis earlier in this sequence, when a second rule 870 lines below added the lift.

## Phase 1 — the correction to the correction

The pack asks that the earlier `CLAUDE.md` entry be corrected if it attributes the fault to
rasterisation or to a band overpainting the border. **One of those is excluded and one is not**,
and the entry says so:

- **Rasterisation — genuinely excluded.** Whole-pixel and half-pixel card tops rendered identically.
- **Band overpainting — NOT excluded; it was proven by test.** With a red rim and no band the
  border draws complete; with the band, red survives **only in the corner arcs**. A child with an
  opaque background inside a rounded `overflow:hidden` parent is clipped to the *border* box.
- **Clipping the lifted edge — the cause of the HOVER symptom**, which is what Nick was seeing.

Both mechanisms were real and both are fixed — the ring overlay for the first, the removed lift for
the second. The entry records which explains which symptom rather than collapsing them.

## Phase 3 — what changed and why the numbers matter

The band's height is **declared, not derived**. All three were content-sized and agreed only by
coincidence: Tasks at 11/18 padding against the sage band's 10/16, measured **51 against 49**. The
lock now asserts neither band re-declares padding of its own, because that is precisely how they
drifted apart.

Controls: parchment fill, `#bcc7b9` edge, inset shadow so the track reads as a channel rather than
a scratch, burgundy thumb with a white ring. Select and slider take the same treatment so they read
as a pair. **The slider gives before the title does** — it is the only child with no natural
minimum, so it takes a clamp and the cluster takes `min-width: 0`.

**Rejected and not built:** a second control row beneath the band, measured at **55px** of lost
chart (205 → 150 in a 302px card).

## Phase 4 — the sweep, reported not fixed

The technique: padding grows the box outward so the clip sits further out, the equal negative
margin pulls it back so the content has not moved. `content-box` is **required** — under
`border-box` the padding eats into `height: 100%` and the margin then drags content out of place.

**46 clipping or scrolling containers** across the app have children that may be shadowed — the
hubs, the To-do board, the agent list, manuscripts and the shells. Most are **scrollers rather than
card columns**, so the fault only bites where a shadowed child meets the boundary. This wants
triage per surface, not a blanket application, and is its own piece of work.

Named candidates worth looking at first: `.msv-panel` / `.msv-rpanel` (manuscripts), `.ws-panel`
(shell), `.sv2-plane`, `.aglist` and `.f12-pane`.

## ⚠️ The screenshot is a HARNESS, not the app

`/dashboard` is auth-gated and I do not enter credentials, so the attached 1440×900 capture is the
four real containers composed against the built stylesheet — the same construction every
measurement above used. It shows the geometry and the paint truthfully and shows nothing about real
data. **Nobody has seen these headers against a real account.** Harness kept at
`reports/img/dashboard-headers-harness.html` so the numbers can be reproduced.

Cappuccino only; Bold and Editorial remain unreviewed across this whole sequence.

## Standing item

**The reduced-motion ordering lock has now caught the same mistake four times.** It fires because
appending is the natural way to add CSS and that block must be last. Four is no longer luck: the
sheet wants a designated tail section, or the block wants its own file. Worth a small piece of work
rather than more care.
