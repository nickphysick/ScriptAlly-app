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
| `--shell-head-h` | `56px` | the panel masthead AND the rail head block |
| `--shell-row-h` | `44px` | the panel nav row's height AND the rail rib's `40px + calc(row − 40)` gap |
| `--shell-pad-t` | `14px` | both capsules' top padding |
| `--shell-kid-h` | `37px` | the accordion child pitch — **the panel alone** |
| `--shell-quiet` | `#b3a598` | the group headings' ink (a role-named tertiary label colour) |

Within a 44px row the icon sits in a **40px hit area**, vertically centred, in both components.

**Alignment holds only with the accordion CLOSED — that is the only state it needs to hold in.**
When a section expands the panel rows shift down and **the rail stays fixed**: no tracking, no
spacers, no sympathetic animation. Lock-tested.

**Brand mark:** the masthead block is 56px starting 14px from the top, and the mark is the real
brand image at ~27px, height-constrained with its aspect preserved. The rail's plane glyph grows
to match and sits in the same 56px block, so the two read as one line across both capsules.

**Group headings** in the panel's lower half: **"Working on"** above the manuscript row and the
task pills, **"Quick actions"** above the four action tiles — mono 7.5px `.17em` uppercase in
`--shell-quiet`, a step lighter than `--shell-muted` so they group without competing. The
"Log · Respond · Agent · Manuscript" caption beneath the tiles **stays**: the heading names the
group, the caption still names each tile.

## Rail capsule

70px, capsule surface. Burgundy brand glyph top (24px), then section icons — Dashboard,
Querying, Agents, Shelf — 42px ribs, 13px radius; active `#f5e2da` fill + burgundy icon; hover
interior fill; `title` tooltips, **no captions, no tab tongue**. Spacer, then Setup, then the
avatar chip at the bottom.

## Panel capsule (top → bottom)

1. **Brand mark** — the real ScriptAlly artwork (`ScriptAllyLogo` → `/scriptally-title-v2.png`),
   large and centred, ~28–34px tall (40px allowance if it reads small — judge in browser),
   aspect preserved, never restyled; ~26px clear below. The Playfair wordmark, ink rule and mono
   kicker are retired (`weekOfQuerying` still lives in dashboardStats for the dashboard).
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
5. **Task pills** — two cream pills: pip + Playfair count + mono label (`Urgent` / `House`),
   derived from the To-do board's own selectors.
6. **Action strip** — four equal fill tiles, 44px, radius 12: Log query (pink/burgundy), Record
   response (sage band/deep), Add agent + Add manuscript (both tan `#efe7db`/`#8a7358` — **blue
   is reserved for Pro**). Mono caption below: `Log · Respond · Agent · Manuscript`.
7. **Upgrade row** — card surface, `line` hairline, radius 12: solid slate `PRO` pill (mono,
   white) · `Upgrade to Pro` 12.5px medium · chevron. Hover goes slate, never burgundy. No
   meter, no benefit copy. Hidden for Pro users.
8. **User block** — hairline above: avatar chip, name, plan. (No utility buttons in this idiom.)

**The nav active-state law (fixes pack): active = GROUND fill `#e7e0d5` — the row reads as a
window cut through to the page ground — ink text, burgundy icon, same radii; one law for the
rail ribs and both panel row kinds. Hover stays the interior fill `#f2ede7` (adjacent tones —
browser-check the distinction). Soft pink is RETIRED from nav states everywhere; it survives as
the primary-button colour and content accent. Never pink, never burgundy, in nav states.**

## Content capsule

58px top bar inside the capsule (`line-soft` bottom hairline): crumb left · save-state chip ·
`NavSearch` right (cream fill, no border; ⌘K wiring unchanged). `PageHeader` renders inside the
capsule as-is (all three variants; primary = Form 11 soft-pink). Page scroll happens inside the
capsule, never on the window.

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
