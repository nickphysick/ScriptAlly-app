# Page header v1

Reference `design-refs/page-headers-v6.html`, hash matched and enrolled (84 refs guarded).
Worktree at `33113f0c`, never the shared checkout. Baseline: tsc 0 · build clean · **8,298 passed /
498 files**.

## Where the mock and the brief disagree — the mock wins, as ruled

| | brief | mock (measured) |
|---|---|---|
| The rule beneath the header | 1.5px | **1px** `rgba(28,19,15,.16)` |
| Title top | eyebrow + 20 | **eyebrow + 22** |
| Full header height (1280 / 1440) | 259 / 265 | **264 / 270** |
| Compact title top | header + 40 | **header + 42** |
| Compact height | 138 ±2 | **167 as drawn** — the mock's compact page still carries the Query Centre's 460px-capped intro over *two* lines; with a one-line intro it is ~140, which is where the brief's 138 comes from |

Everything else matches exactly: header top = bar bottom + 18 · eyebrow + 26 · padding 26/0 · no
background · intro 18px/1.45 capped 460 at title + 14 · actions 48px at intro + 22 · art box 42% ×
276 anchored bottom-right, drawn 457 × 143 with its bottom on the rule · text block exactly 50%.
Content column **301→1239 / 306→1394 / 462→1718** at 1280/1440/1920, as stated.

**Special Elite did not fall back** in the headless render (the title measured 56px/1), so the 5px
height difference is real rather than the font artefact the brief anticipated.

## Phase 2 — the bar

The breadcrumb is gone, and nothing replaces it. Its two links were "QueryHawk" → `/dashboard` and
the section → its default child, and this file's own comment said the section segment went to *"the
same destination its rail icon and panel row reach"*. Both are the sidebar's doors, so **no route
lost its only way in**. What the trail really carried was the page's name, said a second time a few
pixels above where the header now says it.

Gone with it: `crumb`, `recordCrumb` and `sectionDefaultPath` (all dead once the trail went), the
`shellCrumb` import, five CSS rules, and the dashboard's loading-cover rule that hid the crumb — a
rule whose subject no longer exists.

**⚠️ `position: sticky` WAS ASKED FOR AND IS NOT BUILT, deliberately.** `.ws-main` is a flex column
holding the bar and then `.ws-winwrap`; every page's scroller is *inside* the wrap. The bar is not
in the scroll container at all, so it cannot move, and a `sticky` there would be a declaration that
can never do anything — this repo's own law is that a sticky on a box that cannot scroll claims a
behaviour that cannot occur, and a dead claim is how the next reader is misled into hanging an
offset off it. The lock asserts the **requirement** instead: the page scrolls and the bar has not
moved.

**The scrolled shadow** is derived from the value, never from an event that might not arrive: a
capture-phase `scroll` listener on the wrap (scroll does not bubble, and each page owns a different
scroller), rAF-throttled, `scrollTop > 2`, written only when it differs, and reset on a route change
so the shadow cannot survive into a page nobody has scrolled. The rule restates the hairline —
`box-shadow` is one property, so naming only the new shadow would drop the bar's edge the moment a
reader scrolled.

**Locks** (`tests/e2e/pageHeaderV1.measure.ts`): at 1280, 1440 and 1920 — the bar's left is the main
area's left and its right is the window's; 64px tall; the toggle 24px in and Help's right edge 24px
in; no crumb element, no separator in its text, and it does not state the page's title. Plus: the
bar holds its place through a real scroll and gains its shadow; and no crumb anywhere on four
routes. The unit suite's crumb case is **inverted rather than deleted** — "there is no breadcrumb"
is exactly as losable as its styling was.

Proved red before the change (3 of 4 cases), and by both mutations after: the breadcrumb put back,
and the scrolled shadow removed.

One correction to my own lock: it first drove the scroll on `/todo`, which **fills** rather than
scrolls, so the precondition refused it — correctly. It now finds a route that genuinely overflows
and reports which.

Gates after Phase 2: tsc 0 · build clean · **8,298 passed** (level with baseline).

## Phase 3 — the content column

One rule for every workspace route, on `.wpg-scroll > *`: `max-width: 1360px`, `padding-inline:
clamp(28px, 3.2vw, 52px)`, `margin-inline: auto`, `box-sizing: border-box`.

**The gutter is inside the cap, and that is the whole difference from what it replaces.** The old
form was `min(measure, 100% − 2 × gutter)`, where the cap bounded the *content* and the gutter came
off the outside — so past the cap the content ran the full 1360 and the gutter did nothing. Now 1360
is the box: at an ultrawide window the content is 1360 − 2 × 52 = 1256 and the column keeps its air.

`3.2vw` is of the **window**, not the main area, which is what makes the two ends of the page agree:
the bar is inset 24 from the window's right and the column's right margin is a share of the same
width. Against the main area it would drift whenever the sidebar collapsed.

**Six per-page overrides are gone** — the Query Centre, Contact list, Manuscripts v12, Comparable
titles, Tasks and the F12 shell each named their own `--wpg-gutter` and `--wpg-measure`, because the
old rule computed cap and gutter in one `min()` and a page wanting a different inset had to say so.
There is one column now, so no page states either.

**⚠️ THE BRIEF'S ABSOLUTE x VALUES ARE THE MOCK'S, AND THE APP'S SIDEBAR IS 248 WHERE THE MOCK'S IS
260.** So 301 / 306 / 462 land at 289 / 294 / 450 here — the column is exactly right and every
absolute is 12px out. The lock asserts the **relation** §2 states (equal margins ±1; content =
min(1360, main) − 2 × gutter; the cap; `border-box`), which is true of both shells. A lock on the
numbers would have failed on a correct page and could only have been "fixed" by moving the column to
match a sidebar the app does not have.

**The rail** sticks 16 below the bar and ends on the column's right edge, with `RAIL_INSET_FOOT = 20`
split out from the single inset. **§2's "80px from the scroll container's top" is the mock's
arithmetic**: there the bar scrolls inside the same column as the content, so bar + 16 = 80. Here
the bar is a flex sibling *above* the scroller, which already starts at the bar's bottom — 80 would
sit the rail 64px lower than the design draws it. The requirement is 16 below the bar, and that is
what is built and locked.

Three full-bleed children keep `max-width: none` on purpose — the reclaim spacer, the chrome slab
and the mini bar — and their *inners* take the column. The lock finds the first child that actually
takes the cap, so it cannot measure the page's background by accident.

Five unit files retargeted, each asserting the old machinery: `queryCentreFrame`, `queriesHubColumn`,
`qcCentre` (the page's own cap → it states none), `workspacePageGrid` (the rule rewritten, including
`border-box`, without which the padding is added to the cap and every margin reading still passes),
and `qcRail` (the foot inset).

Proved red by the brief's mutation — the column's padding set to 22px — and by the rail sticking at
96 instead of 16.

Gates after Phase 3: tsc 0 · build clean · **8,298 passed**.

## Phase 4 — `PageHeader`, rewritten, mounted on the Query Centre

One component, two sizes, the prop names kept so nine mounts do not churn: **`full`** is the open
header (eyebrow · 56px title · intro · actions · art) and **`workspace`** is the compact one (a
two-column row, actions beside the text). New props: `secondary`, `art`, `primaryRef`.

**The 18px below the bar is stated once, on the header.** The Query Centre paid its own 11px top
inset "so the title sits 25 under the bar's controls"; a page that keeps its own adds to the
header's, which is ten pages opening at ten heights.

**`primaryRef` is not decoration.** The create flow returns focus to "+ Log a query" when it
closes, and that button used to be the page's own — moving it into the component without the ref
would have dropped a keyboard reader at the top of the document every time they cancelled.

Measured against the mock, both widths: 18 below the bar · eyebrow at +26 · title at eyebrow + 22,
56px (50 at ≤1360) · intro 14 below the title, capped 460 · actions 22 below, 48px tall · art 42% ×
276 anchored bottom-right, drawn bottom on the rule · text block ≤ half. Compact: 18 below the bar ·
title at header + 42, 44px · 140 tall with a one-line intro · actions sharing the title's row · no art.

**The full header measures 267 at 1440 against the mock's 270**, and that is content rather than
geometry: every offset matches, and the app's real facts line wraps to 52px where the mock's sample
takes 55. The lock asserts the offsets and reports the height.

### Two faults of my own

**⚠️ MY ART PROBE ASSERTED A PROPERTY OF THE BOX AND CALLED IT THE DRAWING.** It read the image
element's `bottom` — which, with `object-fit: contain`, is the *container's* bottom and says nothing
about where the picture ends. The mutation that anchors the art to the top reddened it, but on the
BOX having moved, so the message named the wrong fault. It now computes the drawn bottom from
`object-position`, and re-proved: moving only the anchor, with the box untouched, reddens it at
**184 against a rule at 384**.

**⚠️ AND IT READ A HIDDEN PAGE'S HEADER.** Every workspace page stays mounted and the shell toggles
`display`, so `querySelector` found the Query Centre's full header while measuring To-do and
reported a full header 0px tall. The probe measures to find the visible one.

### The suites, rewritten rather than retired

`pageHeaderDefault`'s byte-for-byte lock is **repointed, not deleted** — its stated reason (five
pages "protected by nothing except" the frozen string) is obsolete now those pages have moved, but
the mechanism is the only check that notices a stray wrapper or a reordered child. `mastheadFormat`
keeps its partition and now asserts **two** shapes and **names the pages in each**, because a count
alone passes on two groups split down any line at all.

**Retired with their reasons, and named here so the report does not hide a shrinking count:**
`pageHeader`'s "the two-action maximum" and "the tool row" (five cases — there is no tool row, and
two actions is now the shape of the props rather than a runtime slice), `mastheadFormat`'s "none of
them holds a control" (inverted by design), and `qcCentre`'s head-grid container-query case (the
header places the art, and a copy here would be a second description of one layout). **8,290 against
a baseline of 8,298.**

Three claims inverted rather than dropped: the eyebrow exists (it was "no kicker anywhere — the
section is the crumb's job", and the crumb is gone), the header holds controls, and there is no top
rule. The primary reads `--sp-anthracite` rather than a literal — the colour changed, the law did not.

Gates after Phase 4: tsc 0 · build clean · **8,290 passed**.

## Phase 5 — the rollout

**Compact, and already correct:** To-do, Calendar, Noteboard, Analytics, Discover, Comparable
titles, Submission packages — each already passed `variant="workspace"`, so the rewrite reached them
without a per-page edit. **Moved to compact:** `/import`, `/plans`, `/help`, which said
`variant="full"` when that meant "the plain one".

**`/import` mounted at the top of its chassis with no restructuring** — your note 2 resolves the
good way. It is 141px tall at both widths, 18 below the bar, on the column.

### What each compact page ended up with — rendered, nothing invented

| Page | Intro | Actions |
|---|---|---|
| To-do list | yes | Add a task |
| Calendar | **none** | New task |
| Noteboard | yes | **none** |
| Analytics | yes | **none** |
| Discover | yes | **none** |
| Comparable titles | yes | Add a comp |
| Submission packages | yes | New package |
| Import | yes | **none** |

Calendar's header is 109px (no intro), the one-line pages are 140–141, the two-line ones 163. **No
copy was written.**

**⚠️ `/import` RENDERS NO EYEBROW**, because it is in no nav section and the section arrives by
context. That is the rule working — an eyebrow reading " / Import" would be the separator with
nothing before it — but it does mean one workspace page opens without its first line.

### ⚠️ The Contact list is NOT converted, and this is the report rather than a silent reshape

It is named as a full-header page and it is the one thing in this build that did not land. Its hero
is a **measured layout**: `place()` reads the art's box and the text's height and writes seven custom
properties that position the count cards and the add card, with a `ResizeObserver` and a fonts pass
behind it. Taking the title, the facts line and the drawing into the header leaves that machinery
measuring elements that are no longer there — `place()` returns early, `data-ready` never flips, and
the page's own CSS is gated on it.

**What it would take:** retire `heroLayout` and `place()`, and lay the count cards and the blank card
out in flow beneath the header (they no longer need to dodge an image the header owns). That is a
restructure of a page another session shipped this week, and the brief's own instruction for
`/import` — *"if it needs more than that, leave it as it is, and list it in the report with what it
would take. Don't reshape it silently"* — is the same judgement. It also means **§4.5's full-size
consistency is unproven**: with one page in the set the claim is vacuous, so the lock records the
population and says so rather than passing.

The brief also **changes the Contact list's drawing** to `active_queries_hawk` (it draws the
Archivist today). That decision is recorded and unapplied.

### A fault my own lock could not see

**Every compact page opened 35px right of every full one** — the grid's masthead slot still carried
its pre-§2 measure (`--work-max`, `--mast-gutter`). §4.5 was green throughout, because it compared
only **vertical** offsets: "opens identically" is a claim about both axes and only one was being
asked. The left edge is in it now, along with a cross-size check, since a per-size comparison passes
on two sets that each agree internally and with nothing else.

Fixing it surfaced a second: with the column's padding on the full-bleed chrome band **and** on the
masthead inside it, the gutter was paid twice (340 against 294). Exactly one pays it, and it has to
be the masthead — past the cap, only a capped-and-centred box lands where the column's content does.

Gates after Phase 5: tsc 0 · build clean · **8,290 passed**. Ten measurement cases green.

## Phase 6 — the masthead suites, and the law

**Both rewritten rather than retired**, with a stated division of labour so they do not become two
descriptions of one thing:

- **`mastheadMatrix.measure.ts`** — every workspace route opens with the size the table says, on the
  column. It asserted ONE shared masthead across ten pages: the same shape, one mark size, no
  control anywhere, and an `OPTED_OUT` set of three that declined it. Every claim is now untrue by
  design or moved — the SHAPE is `mastheadFormat.test.tsx`'s partition, the GEOMETRY is
  `pageHeaderV1`. **And the opted-out set inverted**: the pages that declined the shared masthead
  are the ones that now get the full header, which is the opposite relationship to the one the name
  described. The register is the file's own table, so a page changing size is a diff rather than a
  silent regrouping — and `/agents` and `/manuscripts` are in it as `none` **with their reasons**,
  so the gap is in the table rather than in a comment nobody reads.
- **`illustratedMasthead.measure.ts`** — the drawing stands on the rule, clears the words, and a
  page without one reserves nothing. It measured a 52px MARK on ten pages; there are no marks. The
  old claims have no subject, so they are not retargeted — what survives is the question they were
  asking. It computes the drawn edge from `object-position`, which is the whole reason it can make
  its claim: asserting the element's rect passes with the art anchored to the top, the one
  arrangement the design forbids.

One fault in my own rewrite: `mastheadMatrix` first took "the column" from whichever scroller child
carried a `max-width`, picked a full-bleed one whose padding is 0, and failed a page whose header
was exactly right. It computes the column from the rule now.

**CLAUDE.md** gains "The page header — PageHeader, full or compact, and there is no breadcrumb",
carrying the five laws this build established, and the old masthead section is **fenced as history
in place** rather than deleted.

---

## Deployed to dev

**`07c4bb1d`**, built from a clean detached worktree of the pushed tip — never the shared checkout,
where the Contact list session is live. Served bundle verified: **`index-D27ne6fj.js`** both sides.
Prod untouched.

**13 passed, 0 failed against the deployed build** (6.0m): the bar, the column, the rail, full and
compact geometry at 1280 and 1440, §4.5's consistency, the route matrix and the art.

Screenshots in `reports/page-header-v1/shots/` — Query Centre, Contact list, Manuscripts and To-do
at both widths, beside the mock's full and compact.

## What did not land

1. **The Contact list keeps its own hero.** Its layout is measured from the art's box; see Phase 5
   for what converting it takes. Its drawing is also meant to change to `active_queries_hawk`.
2. **§4.5's full-size consistency is unproven** — one page in the set makes the claim vacuous, and
   the lock says so rather than passing.
3. **`/import` renders no eyebrow**, being in no nav section. The rule is right; the consequence is
   one page opening without its first line.
4. **The Query Centre's header spans the ledger, not the whole column** — its rail starts at the top
   of the page, so a header running the full column would pass underneath it. The mock draws no rail
   beside its header, so this is a deviation rather than a miss, and it is why the art and the rule
   stop short of the rail.
