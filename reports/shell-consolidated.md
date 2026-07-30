# Shell, consolidated — run report

**Branch `claude-il`.** Four commits, one per phase, gates green on each
(`tsc --noEmit` clean · production build clean · full Vitest):

| Phase | Commit | Suite |
|---|---|---|
| 1 · Gap and tokens | `a019985` | 2087 |
| 2 · Bar | `5acba8e` | 2089 |
| 3 · Panel | `2ec643f` | 2085 |
| 4 · Fade | `7f3f383` | 2089 + 2 skipped |

---

## ⚠️ How these figures were obtained — read before trusting them

**The signed-in shell is auth-gated and I must not enter credentials, so I could not measure the
live page.** Rather than report CSS source values as though they were rendered ones, I measured in
a real browser through a harness that loads **the app's own production stylesheet** (the built
`dist/assets/index-*.css`, not a copy) over **the exact DOM the components emit** — verified line
by line against the JSX. Every figure below is a `getBoundingClientRect` or `getComputedStyle`
reading taken at **1440×900**, not a value read out of a file.

**What that proves and what it does not.** It proves the cascade, the geometry, the fills and the
fade's behaviour, since those are decided entirely by the stylesheet and the markup. It does not
exercise React state, so "the user block renders on both routes" and "the crumb is back" are
additionally asserted in `shellV2Smoke.test.tsx` against the real components' output.

**If you want these from the live page, sign in on dev and re-read them** — the harness is at
`scratchpad/harness.master.html` with an installer script; it is not committed and does not ship
(the `dist` it is copied into is rebuilt before every deploy).

---

## The measurements

### Search field — the pack's "single most visible miss"

| | Measured |
|---|---|
| `background-color` | **`rgb(253, 251, 248)`** = `#fdfbf8` (`--shell-canvas`) |
| `border` | **`1px solid rgb(227, 217, 207)`** = `#e3d9cf` (`--shell-line`) |
| height | **36px** |

**The cause was in `NavSearch`, not the bar.** Its `capsule` variant rendered
`background: var(--shell-inset)` with **no border** at 34px — on the bar's own `--shell-bar-bg`
that left it almost edgeless, so it read as a gap in the bar rather than a control.

### Brand mark — rendered height

**121.6 × 38.0px.** Not ~17px: the constraint is applying, and was applying at 34px too.

**Why it looked unchanged anyway, and this is the answer to the pack's question:** the artwork is
only **68.4% ink**. `/scriptally-title-v2.png` is 2400×750 with the letterforms spanning y 157→669
— **513px of 750**, so roughly 16% dead margin above and 11% below, baked into the file. At 38px of
element you see **~26px of letterform**. **Raising the number again will not change this**;
cropping the asset is the only thing that would.

There was also a second, separate reason the earlier check misled: `ScriptAllyLogo` hardcoded
`id="scriptally-brand-logo-root"` at every call site, so the bar, the panel and the mobile slim bar
were duplicates and `getElementById` returned whichever came first — **the panel's, at 27px**. The
id is a prop now, set at exactly one mount. Measured `idCount: 1`.

### Gutters

**Left 14px, right 14px** (`getBoundingClientRect`, rail vs container, container vs plane).

**They were never unequal.** `--shell-cap-gap` is 14px with `.sv2-app` as its single owner —
`padding` *and* `gap`, so both edges and both inter-capsule gaps move together. The pack's
diagnosis is the right one and is now in `CLAUDE.md` symptom-first: the left band is *padding +
rail + gap*, and the pale rail reads as margin against the pale ground, so it looks wider twice
over. **Never add right-side padding.**

*(One correction: the pack calls the token `--shell-gap`. In this repo it has always been
`--shell-cap-gap`. Renaming it would churn several files and their locks for no behaviour, so the
name stands and the difference is recorded.)*

### The one unbroken line

| | Height | Bottom edge |
|---|---|---|
| Top bar | 58px | **73px** |
| Rail head | 58px | **73px** |
| Panel Navigate band | 58px | **73px** |

**Sharing a height was not enough, and this is the part the pack could not have known.** All three
already read `--shell-head-h`, but the rail and the panel each started `--shell-pad-t` (14px) lower
than the bar, so they closed at 72 / 72 / 58 — one token, three baselines. **`--shell-pad-t` is
retired** and all three now sit flush to their capsule's top.

### The bar, both states

| | Dashboard | Working page |
|---|---|---|
| left | wordmark, 121.6 × 38 | crumb — `Querying / **Queries Hub**` |
| search width | **294px**, centre offset **0.00** | **264px**, right |
| user block | **present** | **present** |
| overlap with flanks | **none** | n/a |

**Confirmed: the breadcrumb is back on non-dashboard pages**, and absent on the dashboard, where
the wordmark supersedes it. The dashboard-specific crumb rule stays deleted.

**⚠️ The centred search is 294px at 1440, not 440.** The mockup draws this bar beside a 64px rail
with **no panel**; in the app the panel is 288px, so at 1440 with it expanded the bar is only
~1026px and a 440px centred field **overlapped the scope chip by ~38px** (measured before the fix —
`z-index` decided which drew on top, but the field was still occluded, and stacking is not
clearance). It now reserves twice the left flank's bounded maximum and shrinks when it must:
**440px at ≥~1800, 294px at 1440, dead centre in both, overlap `none` in both**. This is the
"report the narrow-viewport behaviour" the pack asked for — the collision starts well above 1100px
whenever the panel is open.

### The panel

| | Measured |
|---|---|
| Navigate band | present, 58px, mono label, tuck right, soft hairline |
| Panel wordmark | **absent** |
| Notification block | **absent** |
| Settings in foot | **present** |
| Rail avatar | **absent** |

Urgency is now a 6px burgundy dot beside the To-do count. **Browser-caught while verifying:** the
tuck kept `position: absolute` from the brand row it used to sit on, so inside the band it landed
**on top of the "Navigate" label** and read as a glyph dropped into the middle of the word. It is a
flex child now — the kind of fault only a browser check finds.

### The fade

| State | `moreBelow` | Fade |
|---|---|---|
| Short page | 0px | **absent** |
| Long page, at top | 696px | **present** |
| Long page, at bottom | 0px | **absent** |

Opacity measured **0 → 1** on the class with the transition suppressed, and the wash is visible in
the screenshot at the capsule's foot. Height 56px, `pointer-events: none`, bottom radius 17px, and
it sits 1px inside the capsule border rather than over it.

**Note on a misleading reading:** `getComputedStyle(...).opacity` reports `0` while the 200ms
transition is in flight, so a naive check looks like a failure. Suppress the transition, or look at
the page.

**The panel is not faded** — its body scrolls too and the same treatment would probably suit it,
but it was out of scope. Worth a look next time the panel is open.

---

## Two things this pack reversed, deliberately

An earlier pass this same day declined to build **the bar's user block** and **the panel's Settings
row**, reading each as a second mount of a control that already existed. **This pack overrules
that**, and the duplication is now approved and asserted in tests so it is not "tidied away" later.
It is the **rail's avatar** that gave way instead. Likewise the **notification desk line** built
hours earlier is removed entirely, along with its `deskNotice` derivation — a dead derivation would
only invite the block back. Recoverable at `6d64b75`.

## Deviations, flagged

1. **`--shell-gap` → `--shell-cap-gap`** (name only; see above).
2. **`var(--shell-cap-bg)` → `var(--shell-canvas)`.** The pack names a token that does not exist;
   `--shell-canvas` is the one holding `#fdfbf8`.
3. **The mockup's ⌘L / ⌘K key hints are not rendered.** No shortcut registry exists, so a hint
   would advertise a key that does nothing. (⌘K itself *is* wired; the printed chip is not.)
4. **Phases 2 and 3 each carry a documentation correction** in the same commit, as instructed.

## Not touched, on purpose

**The timeline** — not moved, not deleted, not given a bar button, not restyled. I also grepped
`CLAUDE.md` and the design refs for any surviving instruction to fold it into the bar: there is
none; that note was already removed. It is not reported on beyond this line.
