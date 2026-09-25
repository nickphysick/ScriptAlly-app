# Query Centre v65.6 — one way to open a query

Reference `design-refs/query-centre-v94.html`, hash matched and enrolled (77 refs guarded); the
comparison is repointed to it.

## §1 — the centred card, over a scrim that covers the whole screen

`QcQueryModal` — a portal to `document.body`, `position: fixed; inset: 0; z-index: 80`, holding the
scrim (`rgba(28,19,15,.42)`) and the card (420px, `max-height: calc(100vh − 80px)`, scrolling
itself). Every door arrives here: a ledger row, a fanned card, `?q=`, and a bar or a name in the
expanded Birds-eye view.

**Why the scrim stopped at the calendar panel on dev.** The card was drawn inside the expanded
view's own body. **A descendant cannot cover its own ancestor's box, whatever its `z-index`** — so
the sheet's blush header stayed bright above a card that was meant to be the only thing in focus.
Portalling to the body puts the modal and the sheet in the same stacking context, where 80 really
does sit over 70.

Measured, from all five doors: scrim `0,0,1440,900` against a `1440×900` viewport, card 420 wide,
centred to within a pixel on both axes, `overflow: auto`, `z-index` 80.

**Closing is one act.** The ✕, Escape and a press on the scrim all call `closeQueryCard`, which
clears **only what that door set** — a query opened inside the calendar is the calendar's and never
touched `?q`; one from the ledger or the URL is the page's. Clearing both would drop the page's own
selection because a reader closed a card they opened in an overlay.

**The page underneath is frozen, not moved.** `overflow: hidden` on the body while the modal is up.
Anything that stored and re-applied a scroll offset would be a second model of where the page is,
and this app already has one.

**Escape has exactly one owner at a time.** While the expanded view is open *it* owns the key and
cascades — popover, card, calendar; the modal then registers nothing at all, so there is no
registration-order race to resolve. With the view closed, the modal owns it.

## §2 — the rail is always the Birds-eye view

`openCard` is gone from the rail's mount. It used to swap to the open query for clicks on the page,
so the same act had two outcomes depending on which door you came through — and the rail, the one
place that shows the shape of everything, went blank exactly when a reader was comparing one query
to the rest. The selected ledger row keeps its ring.

`QcOpenCardSkeleton` lost its only consumer; the page's own loading cover holds the frame now. It
survives for its spec, and the file says so.

## §3 — the locks

One case over all five doors, asserting for each: the scrim's box **is** the viewport, 420 wide,
centred ±1, capped and scrolling, at z 80, the rail has docked nothing, and the expanded view is
still open underneath where it applies. Then all three closes (✕, Escape, scrim press), each
comparing the underlying state before and after — and the view is deliberately scrolled somewhere of
its own first, so "unchanged" is a real claim rather than a claim about zero. Then the Escape order:
card, then calendar.

**Proved red by both of the brief's mutations** — docking the card in the rail, and sizing the scrim
to the calendar panel.

**⚠️ THE SCRIM'S BOX IS ASSERTED FIRST, and it had to be moved there.** With it after the centring
check, the panel-sized mutation reddened on *centring* — a true statement about a consequence,
naming the wrong fault, with the headline claim hidden behind the earlier failure.

Two harness faults of my own on the way: the fan's cards are **fanned**, so the first is the one
nobody can press and the click has to take the top of the pile; and the modal's card is the same
component as the rail's, so it carries the same `open` probe and the "rail docked nothing" count
would have read 1 by construction.

## §4 — the open-on-today fix, verified

Today's position after pressing the rail's ⤢, fresh profile, account padded to 26 live with the
oldest send at ~900 days, fonts held back 1.2s:

| 100ms | 500ms | 1s | 2s |
|---|---|---|---|
| **58.1%** | **58.1%** | **58.1%** | **58.1%** |

Already correct at 100ms. The three mechanisms the brief names are all in place from v65.5: a
`ResizeObserver` on the scroller, re-application until the reader's first scroll, drag or Today
press (`touched`), and **any width wider than the window refused** — which is the fix itself, since
the fault was a first read returning the whole track (~12,050) instead of the scroller's ~1,082.
This case is now part of the standing measurement rather than a one-off.

---

## Corrections to the above, and three faults of my own

**⚠️ I DELETED MY OWN TWO NEW CASES AND RAN THREE GREEN SUITES WITHOUT THEM.** Retiring the
superseded §8.11 case, I sliced from its comment to the §D1 comment — and the §1 door case and the
§4 timing case had been inserted between exactly those two anchors. `git diff` showed −132 lines and
read like the retirement; the post-edit file was what said otherwise. Three runs reported **36
passed** with the two cases that matter absent, and only `--list` found it. This repo's rule is that
a removal is verified against the **post-edit file**, asserting both that the target is gone and
that every survivor is still there. I checked the first half and not the second.

**⚠️ AND I MEASURED A STRANGER'S SERVER FOR SEVEN MINUTES.** `vite preview --port 4396` found the
port taken — by a Python server another session is running — and **silently moved to 4400**, so the
harness signed in against a 404 page and `locator.fill` timed out. `--strictPort` now, and the bound
port checked with `lsof` before measuring. It is the same family as a default that silently selects
a subject: the reading was true and it was about somewhere else.

**⚠️ AND I RSYNCED THE OTHER SESSION'S IN-PROGRESS `src/` INTO THE MEASUREMENT TREE**, which broke
the app and produced a sign-in failure that looked like mine. Everything from that point is measured
in a worktree at HEAD carrying **only my files** — which is what the repo prescribes when a gate is
red from another stream's WIP, applied to measurement as well as to gates.

### The ✕, which the mock decides

The mock hides the card's own ✕ in the modal (`.qmodal .open .x { display:none!important }`) and
draws its own at 40px, top 24 / right 32. That is not decoration: the card's ✕ is 24px tall in a
band whose type is 15, so leaving it in renders the band **45px against the design's 36** — which is
how the ref comparison found it. Ours follows the mock.

**The mock also draws prev/next arrows beside it and they are deliberately not built.** The brief
names three ways to close and no way to step; a stepper is a feature rather than a treatment, and
building one from an artefact nobody asked for is how a page grows a control with no decision behind
it. Flagged rather than done.

### Four more locks retargeted, all for the same reason

The card has now moved three times — the page's column, the group's second track, a viewport modal —
and each move left a probe looking where it used to be. `readAll` (which reported `null` rather than
a miss), the ledger's "the chosen query went to the rail" (now: it opens the centred card and the
rail is still the Birds-eye view), the card-geometry probe rooted on `.qcv-group`, and a spill check
asking whether anything ran past **the rail's** sides — a claim that had lost its subject and had
quietly become a claim about the Birds-eye view.

### Gates

**⚠️ THE SHARED CHECKOUT IS NOT A CLEAN GATE — the Contact list session is live in it**, and three
agents specs fail there from its in-progress work (`AgentList.tsx`, `agents/contact/*`,
`contactList.ts`, none of them files this pass touches). Verified in an isolated worktree at HEAD
with only my files: **tsc clean, production build clean, 8,394 passed.**

---

## §F — deployed to dev

**`e36d0a3b`**, built from a clean detached worktree of the pushed tip (never the shared checkout,
where the Contact list session is live) and deployed with `--only hosting --config firebase.dev.json
--project scriptally-dev`. Served bundle verified: `index-pCwDpAGA.js` both sides. **Prod untouched.**

**38 passed, 0 failed against the deployed build** (8.6m), 1,530 assertions. **84 of them are the
door lock's**, and the doors it recorded are `a ledger row · ?q= · a fanned card · a bar · a name` —
checked in the ledger rather than assumed, because three earlier runs reported green without the
case in them at all.

**§4 on the deployed build: 58.1% at 100ms, 500ms, 1s and 2s.**

Screenshots in `reports/v65-6/shots/`.
