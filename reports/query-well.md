# Query Centre — the well, the toolbar, the skeleton and the entrance

Run of 8 Sep 2026 · ref `design-refs/query-toolbar-v3-chip-locked.html` (`d5c05afe…`), verified and enrolled (`a37e3a9e`). Build `3d8f18c3`.

**§1, §2, §3 and §5 are built and measured. §4 is built and unit-locked, and its RENDERED claim is unproven — see "What is not measured".**

---

## ⚠️ False premises, before anything else

Nine. Three would have produced a wrong build if followed literally.

**1 · The page already has a skeleton, and the live views could never reach it.** §4 reads as "build one". `QueryCentreSkeleton`, `queryCentreSkeleton.css`, a shimmer whose keyframes already avoid the `var()` trap, and `lib/skeletonTiming.ts` — with phases, a minimum, a settle beat, a dissolve and its own unit tests — all exist. The component is mounted at **exactly one site**, inside the retired `GRID_IS_THE_PAGE === false` browsing branch. So the grid, the list and the board have always loaded uncovered, and the honest job was a mount, not a second component.

**2 · And the branch that answered them was the empty state.** While the collections load, `gridRows` is empty — so a cold load rendered **"Nothing matches."**, confidently, for its whole duration. That is the same fault this page's own retired 180ms grace produced on the browsing list, in a different branch. Putting the skeleton branch first is the fix, and it is the most valuable thing in this run.

**3 · "Active in `--state-queried` pink" names the wrong token, and the app was already right.** `--state-queried` is the **sand** `#f7efe3`; the ref fills its active view segment with `var(--pink)` = `#f5e2da`, which is exactly what `.qvs-on` already had. Following the brief literally would have changed a correct colour to a different one — and `queryViewSwitch.css` carries a standing law that *"the states' own colours are never borrowed for chrome"*, which sand would have broken. No change made.

**4 · §5's table and §5's total disagree.** The last first-row card starts at `180 + 30×2 = 240` and runs `340`, ending at **580ms** against a stated total of ≤520. The table is the specific instruction so the table wins, and the flag's lifetime is **computed from the table** rather than typed beside it — a hand-written 520 would strip the entrance while three cards were still moving.

**5 · The app has two skeleton timing models and this would have been a third.** `SKELETON_FLOOR_MS = 400` beside the old mount, `SKELETON_MIN_MS = 500` in `lib/skeletonTiming`, which the dashboard runs. §4 asks for a 200ms crossfade; the shared lib's dissolve is 250. This uses the shared lib and its 250, because one timing model beats a per-page number — the same call as the parity round's 72px icon.

**6 · "The card's shadow contains no blue channel bias" was already true.** It has been `rgba(58, 28, 20, …)` throughout. The assertion is kept — asserted by CHANNEL (r > b at every stop) rather than against a literal, so it survives a retune — but it never had anything to catch. Only the two values changed (.05/22px/.09 → .06/20px/.11).

**7 · There is no `--pad`.** The page's side padding comes from the workspace grid's `--wpg-gutter`, which `.qc-wpg` already overrides. The well's own side margin is therefore **zero**: the ref draws `margin: 0 var(--pad)` on a body with no padding, and restating it here would inset the well twice.

**8 · The ref declares `.pill` five times.** Base, plus `.p2` (column), `.p3` (chip label) and `.p4` (borderless) — its comparison toggles. §3's values are base + **`.p3`**, which the brief's own numbers identify. A reader taking "the `.pill` rule" has a one-in-four chance.

**9 · "No spinner anywhere on the page" catches the shell's toast region.** `ToastProvider` renders `role="status"` — a live region, not a spinner. The assertion is scoped to the Query Centre and to spinner-shaped things.

---

## §1 · The well

`#eee8e0` against the window's `#fefcfa`, 16px radius, `inset 0 1px 3px rgba(58,28,20,.06)`, `--wpg-gutter: 18px` at ≥1280. Measured `rgb(238, 232, 224)` at all three widths, darker than its ground.

It wraps the toolbar and **all four** view renderers — grid, list, board and the calendar placeholder — asserted as containment rather than as a class existing. The export foot stays outside: it acts on the filtered set rather than being part of it.

**It carries no `overflow`, and that is asserted as an absence.** `.qcc-controls` inside it is `position: sticky`, and a clipping ancestor turns a sticky into a clamp — silently, with every computed value correct. This repo has paid for that once already on the packages builder.

### ⚠️ The first cut put the tiles inside the well, and only the screenshot showed it

`.qcc-controls` holds the tiles *and* the toolbar, so opening the well before it swallowed the tiles. **Every rect assertion passed** — each measured element was exactly where it should be relative to a well that was simply too big. The tiles now sit above the well and the sticky wrapper (toolbar + chips) sits inside it, which keeps the toolbar pinning.

## §2 · The toolbar

A three-track grid, `1fr auto 1fr`, so the search sits on the **row's** midline rather than centred between two unequal flanks — which matters here because the count runs from "9 of 54" to "54 of 54" as you filter, and in a flex row the search would move every time it did. Search 360px, 99px radius, lifted off the recess. The flex spacer went with the flex row.

**`Showing N of M` is this page's own element, not the shared `PageTally`** — 15px, muted, figures in ink, against the shared tally's 18px shell ink. It could not go through that component without moving Contact list and Analytics with it. **That is a divergence from the Contact-parity round**, which asserted these pages state their count identically. Whether Contact list follows is a decision, not an oversight.

## §3 · The chip pill, and per-view defaults

The pill treatment is **scoped to `.qcc-tb`** because `.qcc-tb-btn` has THREE consumers — this page, the To-do page (`.tdb-qtool`) and Contact list (`.agl-toolbar`). A bare restyle would move three pages on a brief naming one. The shared button's label became an element, which is additive: a span with no rule attached renders as the text did.

Defaults live in a pure table where **each view states only the controls it has an opinion about** — an absent key is not `none`, or switching to the board would clear a grouping the grid was using. A control the writer has touched is theirs for the session; both branches are locked, including a walk through all four views with a chosen sort surviving.

## §5 · The entrance

Measured at 1440: after it ends the flag is off and `animation-name` is **`none`** on the masthead, a tile, the well and a card. Then a filter change, two view switches and opening the drawer — still `none`, flag still off.

**The flag is removed when the entrance ends, and that is the whole mechanism.** Leaving it on would look identical, because animations do not restart on a re-render — while leaving every block with a live `animation-name` for a future remount to replay.

---

## §6 · Measured

| reading | 1280 | 1440 | 1920 |
|---|---|---|---|
| well background | `rgb(238, 232, 224)` | same | same |
| its ground | `rgb(254, 252, 250)` | same | same |
| list inside the well | ✓ | ✓ | ✓ |
| board inside the well | ✓ | ✓ | ✓ |
| entrance settled | — | flag off, all `none` | — |
| entrance after mutating state | — | flag off, all `none` | — |

Shots at all three widths: loaded Grid, loaded List, Board in the well.

## ⚠️ What is NOT measured, and why

**§4's rendered claim is unproven.** The skeleton is built, mounted ahead of the empty state, and locked at source — the bones render the card's own classes, the sheen's keyframes are literal, `aria-busy` is on the well, the bones are hidden from AT, and there is no spinner. What could not be done is **hold the app in the cover state long enough to photograph and measure it.**

Four fixtures were tried: hold every Firestore request (the shell never boots — the user doc shares the WebChannel with the collections); hold by request order (same); hold by the collection paths in the POST body (works on a warm channel, misses on a cold one); and clear the origin's storage per width to force cold loads (which is what breaks the body match).

**And the near-miss is the part worth recording.** Three of those fixtures reported GREEN — including `firstCard 225px vs 225px` at identical x and y, at all three widths. They were measuring the **dissolve**: the bones stay mounted through the fade, `toBeVisible()` is satisfied by a non-empty box, and Playwright does not treat `opacity: 0` as hidden. The screenshots showed an empty well beneath a correct toolbar, and I nearly filed that as a rendering bug in the skeleton before probing the computed style and finding `.qcs-wrap { opacity: 0 }`. Adding the precondition — *the cover, at full opacity* — turned three vacuous greens into three honest reds.

The case now records `coverObserved: false` per width and proves everything that does not depend on it, so the day the cover becomes observable the claim is waiting rather than forgotten.

**The deterministic fix is a way to ask the page for its own skeleton** — a dev-only flag the harness can set. That is a production code path added for a test's benefit, which is a decision for Nick rather than something to take unilaterally after four fixture attempts.

## Flags

1. **The count diverges from Contact list** (§2 above). The parity round made them one; this makes them two.
2. **The chip pill is Query-Centre-only.** To-do and Contact list keep the old pill. One line to extend, if they should follow.
3. **The board's first-row stagger drifts 30ms below 980px**, where the grid is two columns and `nth-child(-n+3)` reaches into row two. The alternative is a column count in the entrance sheet kept in step with `queryCard.css`'s own.
4. **`main` is far ahead of `origin` and unpushed.**
