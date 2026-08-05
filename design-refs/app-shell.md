# App shell — CAPSULE system (design reference)

Written against the **supplied** mockup `design-refs/scriptally-capsule-shell.html` (Nick's file,
copied in with capsule Phase 1) — mockup-derived, not spec-derived. **Supersedes the flat v2
scheme below-documented in git history** (`scriptally-shell-v2.html` + scheme 1 "Raised light"):
the dark rail, the tab tongue, the masthead rule/kicker and the canvas-lightness law are all
retired.

**Spec-derived deltas (the fixes pack, 27 Jul browser review — the mockup predates these):**
nav active = the GROUND token, pink retired from nav states; the panel COLLAPSES (the rail is
its collapsed state, ⌘\, persisted); 26px desk-group rhythm; the save-state chip removed; ONE
shell for the whole signed-in app (FocusShell retired — /account, /plans and /help render in
the capsule). **Flyouts pack (27 Jul, later):** the collapsed rail carries quick-nav FLYOUTS
(supersedes "rail only"); the panel AUTO-COLLAPSES on every navigation (expansion is manual,
until the next navigation); `PageHeader` ends with ONE variant — full — on every routed page
except the dashboard, which returned to its ORIGINAL centred greeting header (compact and
greeting variants deleted). **Rail-section-select pack (27 Jul), AMENDED by the
rail-icon-toggle pack (27 Jul, latest): the rail selects a SECTION, never a page — and the
icon of the section that is ALREADY OPEN toggles the panel shut.** Collapse keys off the
section currently OPEN in the accordion, never the section of the page you happen to be on
(the two differ while browsing: on To-do with Agents browsed open, clicking Querying SWITCHES
to Querying and stays expanded — it does not collapse). The table: while collapsed, a section
icon expands and opens that section (no navigation); Dashboard navigates from elsewhere, or
expands with no section open when you're already on it. While expanded, the OPEN section's
icon collapses; a different section's icon switches the open section (no navigation, stays
expanded); Dashboard-from-elsewhere navigates (auto-collapse fires as normal); Dashboard on
Dashboard collapses when no section is open, or switches to the no-section view when one is.
Every cell does something — the old no-op is gone, and ⌘\ and the tuck still collapse; they
are simply no longer the only ways. The rail highlight stays truthful to the CURRENT PAGE
while the accordion browses. Abandoning a browse (Escape — which closes the expanded panel
however it was opened — or a click into page content) collapses and snaps the accordion back
to the current page's section. The dedicated expand control is retired: expansion = section
icons, on-Dashboard Dashboard click, ⌘\; the flyout footer is its only on-screen
advertisement, and the tuck keeps collapse discoverable.

## The design in one paragraph

Three rounded capsules — icon rail, nav panel, content plane — float on a shared warm ground
with a faint paper grain showing through 14px gutters. Depth is expressed by geometry (white
paper on darker ground), not by tone steps between chrome surfaces. Inside the capsules, chrome
controls are **fill-based** — cream fills, no hairline-bordered pills. Ink-bordered content
cards (To-do post-its, Hub cards) are objects *on* the paper and keep their borders.

## Tokens

One source pair, locked in step by `shellV2Tokens.test.ts`: CSS custom properties on `:root` in
`index.css` (`--shell-*`) + JS twins in `designTokens.ts` (`shell*`).

**STEPPED TRIO (ref `scriptally-capsule-tone.html`, scheme D — supersedes the one-shared-surface
law):** depth recedes leftward in three steps. The rail is the deepest surface, the panel sits
above it, content is brightest.

| Role | Token | Value |
|---|---|---|
| Ground (behind all three capsules) | `--shell-ground` | `#e7e0d5` + the paper-grain SVG at ~.03 |
| **Rail** capsule — deepest | `--shell-rail` | `#f1ebe3` |
| **Panel** capsule — one step above | `--shell-side` | `#f8f4ee` |
| **Content** capsule (incl. its top bar) | `--shell-canvas` | `#fdfbf8` |
| Interior fill (search, chips, pills, hovers) | `--shell-inset` | `#efe8df` — moved WITH the panel |
| Card | `--shell-card` | `#fdfaf5` |
| Line / line-soft (interior hairlines only) | `--shell-line` / `--shell-line-soft` | `#e3d9cf` / `#ece3da` |
| Capsule radius / gap+page padding / shadow | `--shell-cap-radius/-gap/-shadow` | `20px` / `14px` / `0 10px 30px rgba(58,28,20,.09)` |

**Three role-named surfaces, no generic alias.** `--shell-topbar` is RETIRED — the top bar *is*
the content capsule and reads `--shell-canvas` directly.

**`--shell-panel` (`#f2ede7`) is NOT a chrome fill** and deliberately did not move: it is an
in-page grouping surface (the To-do board container, the diary carousel) sitting on the
unchanged content capsule, so its step is untouched. Recolouring it would have leaked a chrome
change into page content.

**The depth law (lock-tested):** ground < rail < panel < content, and the interior fill sits
below every capsule but above the ground — so a fill still reads as an inset even on the rail,
and the nav's active state (the ground token) stays deeper than any hover. No page sets its own
background — content inherits the content capsule.

## ⛔ TRIED AND REVERTED — the merged "one sidebar" (27 Jul)

**Do not propose this again from scratch.** The rail and panel were merged into a single capsule
that changed width (62px `#f1ebe3` collapsed ⇄ 280px `#f6f1ea` expanded), with every item —
brand, nav, manuscript, New, Pro, Settings, user — rendered as one uniform row shape (a 48px
glyph cell + a label region), so that collapsing hid only the labels. It shipped to dev and was
**reverted after Nick's browser review**.

**Why it failed, in his words:** *uniform row weight removed the grouping that made the panel
legible, and the lower half read as a flat list of unrelated items.* The merge was structurally
clean — the glyphs genuinely held position, and the behaviours survived — but the thing that
made the panel readable was the VARIETY of its rows: a nav item, a manuscript card, a Pro row
and a user block are different kinds of object, and flattening them into one shape destroyed the
grouping. **The lesson is about row weight and grouping, not about the number of capsules.** If
the two-capsule geometry is revisited, the panel's internal variety has to survive it.

The attempt is recorded in `reports/one-sidebar.md` (with its own reverted banner) and in the
reverted commit `5ee7fd7`; its mockup was `scriptally-sidebar-final.html`, removed with the
revert. The sections below are the LIVE two-capsule design.

## Shared sidebar rhythm (sidebar-refinements — ref `scriptally-sidebar-refined.html`)

The rail and the panel are two capsules but ONE vertical rhythm. Three values are defined once,
beside the other `--shell-*` tokens in `index.css`, and **both** components read them — if either
carried its own numbers they would drift the first time one was touched.

| Token | Value | Read by |
|---|---|---|
| `--shell-head-h` | **`58px`** | the panel's **Navigate band**, the rail head block **AND the top bar** — one unbroken line across all three capsules |
| `--shell-row-h` | `44px` | the panel nav row's height AND the rail rib's `40px + calc(row − 40)` gap |
| `--shell-pad-t` | `14px` | both capsules' top padding |
| `--shell-kid-h` | `37px` | the accordion child pitch — **the panel alone** |
| `--shell-quiet` | `#b3a598` | the group headings' ink (a role-named tertiary label colour) |

Within a 44px row the icon sits in a **40px hit area**, vertically centred, in both components.

**Alignment holds only with the accordion CLOSED — that is the only state it needs to hold in.**
When a section expands the panel rows shift down and **the rail stays fixed**: no tracking, no
spacers, no sympathetic animation. Lock-tested.

**Brand mark:** the masthead block is 58px, and the mark is the real
brand image at ~27px, height-constrained with its aspect preserved. The rail's plane glyph grows
to match and sits in the same 56px block, so the two read as one line across both capsules.

**Group headings** in the panel's lower half: **ONE now — "Quick actions"** — mono 7.5px `.17em`
uppercase in `--shell-quiet`, a step lighter than `--shell-muted` so it groups without competing.
"Working on" left with the manuscript row (top-bar rebuild); **"Tasks & reminders" left with the
task pills** (panel-foot pack): the desk line that replaced them states its own subject in
words, so a mono label above it only repeats the sentence more quietly. The
"Log · Respond · Agent · Manuscript" caption went with the four tiles it was naming — the two
buttons carry real labels, so there is nothing left to disambiguate.

## Rail capsule

70px, capsule surface. Burgundy brand glyph top (24px), then section icons — Dashboard,
Querying, Agents, Shelf — 42px ribs, 13px radius; active `#f5e2da` fill + burgundy icon; hover
interior fill; `title` tooltips, **no captions, no tab tongue**. Spacer, then Setup, then the
avatar chip at the bottom.

## Panel capsule (top → bottom)

1. **THE PANEL HEAD BAND** — a `--shell-head-h` (58px) band, **flush to the capsule top**, with
   the tuck control right, over a `--shell-line-soft` bottom hairline. Its contents scroll below
   it in `.sv2-pbody`.
   **⚠️ WHAT SITS AT ITS LEFT IS ROUTE-DEPENDENT — THE BRAND APPEARS EXACTLY ONCE** (palette pack;
   this AMENDS the canonical pack, which put a `Navigate` label here on every page):

   | Page | Panel head | Bar left |
   |---|---|---|
   | Dashboard | mono `Navigate` label | **the wordmark** |
   | Every other page | **the wordmark** | the breadcrumb |

   The rule is **the brand goes in the leftmost chrome not already carrying it**, so two logos
   never sit side by side. The panel's wordmark is the same asset at the same **38px** in the same
   58px band as the bar's. The two mounts are **mutually exclusive**, which is exactly why both may
   carry the `scriptally-brand-logo-root` id without colliding — measured, one visible brand in
   either state.
   **When the panel is collapsed on a non-dashboard page there is no wordmark anywhere. That is
   intended** — the rail's plane glyph carries the brand. Do not add a fallback.
   **⚠️ FLUSH IS LOAD-BEARING.** The rail head, this band and the bar share `--shell-head-h`, but
   sharing a height is not sharing a baseline: the rail and the panel used to start
   `--shell-pad-t` (14px) lower, so the three closed at 72/72/58. **`--shell-pad-t` is retired**
   and all three start at their capsule's top edge — measured 30 Jul, all three bottoms at 73px.
   The tuck is a **flex child** of the band, never absolutely positioned: left absolute (as it was
   against the old brand row) it lands on top of the label and reads as a glyph dropped into the
   middle of the word.
2. **Accordion nav** — generous rows (13–14px type, 13px vertical pad, 14px radius).
   **Dashboard is a flat link** (active = pink fill on the row). Sections: Querying (Queries
   Hub · To-do · Packages), Agents (Agent list · Discover), Shelf (Manuscripts · Comparable
   titles). One open at a time, following the route; open = ink text, medium weight, burgundy
   icon, chevron rotated. Children indent 44px, **no vertical hairline**; active child = pink
   fill; counts right-aligned mono muted. Import is off the nav (reachable from the Queries
   empty state).
3. Flexible spacer.
4. **Manuscript row** — bare: sage-gradient initials tile, Playfair title, mono
   `20 queries · 16 active`, up/down chevron.
5. **⚠️ THERE IS NO NOTIFICATION BLOCK — it is REMOVED ENTIRELY** (canonical shell pack). Not
   restyled, not relocated. It had two lives in one day: the Urgent/House task pills, then a
   two-state notification desk line that replaced them; **both are gone.** Urgency is now **one
   6px burgundy dot beside the To-do count** in the nav (`.sv2-akdot`, rendered when
   `tiles.urgent > 0`). The count already says how much; the dot says some of it will not wait.
   The `deskNotice` derivation was deleted with the surface — recoverable at `6d64b75`, but do
   not re-add the derivation without re-adding the surface.
6. **Quick actions — TWO controls** (panel-foot pack), replacing the four unlabelled tiles.
   **All four of the strip's contracts survive**: `New` (pink primary, 40px, radius 12; its plus
   rotates 45° when open) opens a popover **upward** — it sits at the panel's foot, so downward
   would leave the capsule — carrying `Log a query`, `Add an agent`, `Add a manuscript`; and
   **`Record a response` is PROMOTED to its own button** (card surface, `line` hairline), because
   it is what you reach for holding a reply, not while thinking about making something.
   Dismissal follows the scope chip's pattern (pointerdown outside, Escape, and any navigation).
   **The mockup's ⌘L/⌘N hints are deliberately NOT rendered** — no shortcut registry exists, so a
   hint would advertise a key that does nothing (standing flag).
7. **The foot: a fading divider, a SETTINGS row, then the account row — and the upsell is FOLDED
   INTO THE PLAN LINE** (panel-foot treatment 1, "folded into the plan line"; the ref's other three columns are
   the rejected alternatives). **The standalone upgrade row and its slate `PRO` pill are GONE.**
   The row is: avatar · name · `Free plan · Upgrade` · chevron, where **`Upgrade` is a plain slate
   link** (underlined, `#c3d2df`), never a pill and never a fill. Pro users read `Pro plan` with
   **no link** — a paying user is never sold to. Derivation: the pure `planLine(plan)`.
   **Settings sits above the account row AND stays a rail rib** — it has to survive the panel
   collapsing, and the rail is the collapsed state. (Unlike the account, which had three homes and
   gave the rail's up.)
   Why this treatment: a persistent sold-looking row in permanent chrome is a thing you learn to
   stop seeing, and the panel foot is already where someone goes when they think about their
   account, so the prompt is in the right place at its quietest weight. The plan line stopped
   being 8px mono uppercase when it started carrying a link — `FREE PLAN · UPGRADE` reads as a
   system tag, and the point of this treatment is that it is a sentence about your account.
   *(An earlier pass declined to build the Settings row and the bar's user chip, reading them as
   second mounts. The canonical pack overrules that: both are built, the duplication is approved,
   and it is the RAIL's avatar that gave way instead.)*

**⚠️ THE NAV ACTIVE-STATE LAW, RESTATED (app-shell pack — this REPLACES the old wording, which is
deleted rather than left standing):** active = **`--shell-active-fill` (#fff)** — **a bright surface
LAID ON the capsule, not a hole cut through to the ground** — ink text, burgundy icon, same radii;
one law for the rail ribs and both panel row kinds. Hover stays the interior fill.

The old sentence read *"active = GROUND fill `#e7e0d5`, the row reads as a window cut through to the
page ground"*. That held only while the ground was a neutral cream. **The ground is now sage
`#aebdb0`, and cutting a window through to sage produces a green pill** — so the metaphor had to go
with the colour. Soft pink stays RETIRED from nav states everywhere; it survives as the
primary-button colour and content accent. **Never pink, never burgundy, in nav states.**

## Content capsule

Top bar inside the capsule (`line-soft` bottom hairline), wearing the rail's tone — one chrome
family. Its height is **`--shell-head-h` (58px)**, the SAME token as the rail head and the panel
masthead, so all three capsules close on one continuous line. The bar used to restate `58px`
while the token said `56` — which is exactly how the two drifted. Never restate the number.

**THE BAR HAS TWO STATES, ONE COMPONENT** (ref `scriptally-bar-per-page.html`):

| | Dashboard | Every working page |
|---|---|---|
| left | the **wordmark**, 38px | the **breadcrumb** |
| search | **absolutely centred** on the bar, 440px | **right**, 264px, in the tools cluster |
| constant | scope · divider · help | scope · divider · help |

**Exactly two things differ — wordmark versus crumb, and where search sits.** Everything else is
constant, so the bar never reads as a different component from one page to the next. The search is
centred on the BAR's midline (`position:absolute; left:50%`), not on the space left over between
the flanks, so a long manuscript title in the scope chip cannot pull it off the line: the flanks
carry `z-index:2` and the search `1`, so the title passes under it.

**The manuscript SCOPE lives here, not in the sidebar.** Every figure on screen is filtered by
it, and in the panel it vanished the moment the panel collapsed. It exists ONCE: the sidebar's
manuscript row and its "Working on" heading are gone, and the panel's lower half now reads
Tasks & reminders → Quick actions.

**THE BREADCRUMB IS BACK on every non-dashboard page** (bar-per-page pack — a REINSTATEMENT: a
previous pass removed it everywhere, which was an overreach). Source is the pure
`shellCrumbForPath` in `shellV2Nav.ts` — `Section / **Page**`, mono 9.5px uppercase, section in
muted ink, current page bold and inert (it does not navigate). Off-nav routes keep their entry
through `CRUMB_EXTRAS`.

**The DASHBOARD crumb rule stays DELETED, and that deletion is right.** It said: brand mark when
the panel is collapsed / "Your dashboard" when expanded. The dashboard now reads the **wordmark**
in that slot in every state, so the rule has nothing to come back to. Deleted, not contradicted —
do not resurrect it.

**The brand's DOM id is a PROP, set at exactly ONE call site** (the bar's). `ScriptAllyLogo` used
to hardcode `id="scriptally-brand-logo-root"`, so the bar, the panel and the mobile slim bar all
carried the same id and `getElementById` returned whichever came first in the document — which
made inspecting the brand measure the *panel's* 27px copy rather than the bar's. **Measured
30 Jul at 1440×900: the bar's mark renders at exactly 38px** (it was 34, and the constraint was
applying all along), and the artwork is only **68.4% ink** — 513px of the asset's 750px height —
so 38px of element reads as ~26px of letterform. Raising the number is not the same as raising the
apparent size; the dead margin is baked into the PNG, and cropping the asset is the only thing
that would change it.

**Help is a bar button**, so the floating FAB is retired — one of the three suspects in the
right-gutter bug, removed as a class of problem rather than repositioned again.

**The TIMELINE is out of scope entirely.** An earlier note here told a future run to fold it into
the bar and delete the floating version; **that instruction was withdrawn — it was never a
decision.** Leave the timeline exactly as it is: do not move it, delete it, or give it a bar
button.

## Panel collapse (fixes pack — the rail question, RESOLVED)

The rail IS the panel's collapsed state. The tuck toggle (two-pane glyph) sits top-right of the
panel, centred on the brand mark; while collapsed the same glyph appears in the rail beneath
the brand glyph and expands it. `⌘\` toggles (registered at shell level so it works on every
route, including /todo where the top bar's ⌘K stands down). Collapsed = the panel hides via
the container's `sv2-collapsed` class (CSS width/opacity/margin transition — the negative
margin swallows the capsule gap so the content plane widens by 288 + 14px). Persisted in
`localStorage["sa.shellSideTucked"]` (the sa. UI-pref convention; the flat shell's key,
reused). Works identically on every routed page — no opt-outs. **Auto-collapse (flyouts pack,
baked option a): every route navigation returns the panel to the rail; expansion is manual and
lasts until the next navigation** (observed on the full pathname; query-param changes such as
`?q=` deep-selection do not collapse).

**Rail flyouts (flyouts pack — supersedes "no hover flyout, no mini-panel"; ref
`scriptally-rail-flyouts.html`):** while collapsed, hovering (or focusing) a section rib opens
a floating quick-nav capsule 12px off the rail, top-aligned to the icon and viewport-clamped:
capsule surface, radius 16, shadow `0 14px 38px rgba(58,28,20,.16)`, 8px padding, ~212px
min-width. Contents: mono section kicker → page rows (15px icon, muted → burgundy on
hover/active · label · mono count right; hover = interior fill, active = GROUND — the nav law
everywhere) → a `line-soft` hairline and the "Expand sidebar · ⌘\" footer. A ~140ms grace
timer carries the pointer rib → flyout. Dashboard has NO flyout (straight link, tooltip only);
Setup's flyout = Task settings (navigates to /todo and fires `sa:open-task-settings` — the
sheet lives in that page) + Help centre. Rows are real buttons (Tab + Enter); no fuller
menu-key system. Expanded panel = no flyouts.

## The To-do page — NO GROUP CONTAINERS (ref `scriptally-todo-sectioned.html`)

The To-do page predates the capsule shell: it was built as a self-contained world with its own
containers, ground and CTA language, and the bright content capsule exposed all of it. The
governing principle of the rebuild:

**Nesting on this page ends at content capsule → cards, with nothing in between.** The board
panel, the filter slab and the lane header bars are deleted. **Sectioning is typographic**: a
Playfair 27px heading with its count beside it in mono, closed by a 2px rule whose left 96px
carries the section's identity colour (Urgent `#e8c8bc` · Housekeeping `#c3cfc0` · remainder
`#ece3da`); 46px above each heading, 22px below the rule. Both item views — cards and rows —
sit under the same headings, so there is ONE heading builder (`SectionHead`), not one per view.

A heading is a heading: no header actions on it. No "Clear this section" (not built — never
render a dead control), and the lane play button and Notes ＋ went with the bar.

**One control line, not two bands:** filter chips left (fill `#efe8df`, 99px radius, active =
the Form 11 soft-pink with a burgundy label, zero-count chips at 45% and non-interactive), a
flexible spacer, then the list search (fill, no border, 228px) and the view toggle (fill
container, the active segment takes the capsule surface). 44px above the row, no container, no
label slab. The old "{n} items" line is retired — the All chip's struck total carries the
narrowed count.

## Open questions (unchanged)

The To-do page header; Agents' eight actions; the dashboard's four CTAs vs the header pair;
the manuscript switcher's live wiring.

## The user block, and an approved duplication (canonical shell pack)

The account appears in **two** places, on purpose: **the bar's right end on every page**
(avatar · name · chevron, identical size and position in both bar states) **and the panel's
foot** (avatar · name · plan line · chevron). **This duplication is intentional and approved —
do not tidy it away.** They do different jobs: the bar's copy is the one that survives the panel
collapsing, and the panel's is the one that carries `Free plan · Upgrade`.

**The RAIL's avatar chip is retired.** Three homes was one too many, and the rail's was the one
with no job the other two were not already doing.

**The search field takes the content capsule's own paper (`--shell-canvas`) with a
`--shell-line` hairline**, 36px, radius 11 — not the bare `--shell-inset` fill it had, which on
the bar's `--shell-bar-bg` left it with barely any edge and read as a gap in the bar rather than a
control. The fill and the border are inline in `NavSearch`'s capsule variant, since that component
owns its own presentation; the hover lives in `shellV2.css` beside the scope chip's.

## The foot fade (canonical shell pack)

The content capsule's scroll region **fades out at its foot when there is more content below**, so
a hard cut line never reads as the end of the page.

**It is a STATE, not decoration.** It appears only while
`scrollHeight - scrollTop - clientHeight > 8` and fades at 200ms; **a permanent fade over a short
page reads as a rendering fault.** The 8px slack keeps sub-pixel rounding from flickering it at
the very bottom of a scroll.

56px tall, `pointer-events: none`, a gradient from transparent to `--shell-canvas`. **Inset 1px
left and right** so it sits inside the capsule's border rather than darkening it along the foot,
and its bottom corners are `calc(var(--shell-cap-radius) - 1px)` — the capsule's radius minus that
inset, or the fade squares off the curve.

**It is driven by CONTENT height, not only by scrolling.** A `ResizeObserver` watches the stage
and its first child as well as the scroll event, because a freshly-navigated long page would
otherwise have no fade until you first scrolled it, and a page that grows in place (an accordion,
a lazily-filled list) would never gain one.

**The stage itself is untouched** — the wrapper (`.sv2-pgwrap`) is new; the stage keeps its id,
its ref, its scroll-memory handler and its styles, because `stageScroll.ts`, the overlay locks and
per-route scroll restoration all address it directly.

**The panel is NOT faded in this pack** — its body scrolls too, and the same treatment would
probably suit it, but it was out of scope here. Worth a look when the panel next gets attention.
