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
greeting variants deleted).

## The design in one paragraph

Three rounded capsules — icon rail, nav panel, content plane — float on a shared warm ground
with a faint paper grain showing through 14px gutters. Depth is expressed by geometry (white
paper on darker ground), not by tone steps between chrome surfaces. Inside the capsules, chrome
controls are **fill-based** — cream fills, no hairline-bordered pills. Ink-bordered content
cards (To-do post-its, Hub cards) are objects *on* the paper and keep their borders.

## Tokens

One source pair, locked in step by `shellV2Tokens.test.ts`: CSS custom properties on `:root` in
`index.css` (`--shell-*`) + JS twins in `designTokens.ts` (`shell*`).

| Role | Token | Value |
|---|---|---|
| Ground (behind all three capsules) | `--shell-ground` | `#e7e0d5` + the paper-grain SVG at ~.03 |
| Capsule surface (rail, panel, plane, bar) | `--shell-rail/-side/-topbar/-canvas` | `#fdfbf8` — one surface, locked equal |
| Interior fill (search, chips, pills, hovers) | `--shell-inset` (and `--shell-panel`, folded in) | `#f2ede7` |
| Card | `--shell-card` | `#fdfaf5` |
| Line / line-soft (interior hairlines only) | `--shell-line` / `--shell-line-soft` | `#e3d9cf` / `#ece3da` |
| Capsule radius / gap+page padding / shadow | `--shell-cap-radius/-gap/-shadow` | `20px` / `14px` / `0 10px 30px rgba(58,28,20,.09)` |

**The depth law (lock-tested):** ground darker than capsule surface; the four chrome surfaces
are one colour; the interior fill sits between them. No page sets its own background — content
inherits the content capsule.

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

## Open questions (unchanged)

The To-do page header; Agents' eight actions; the dashboard's four CTAs vs the header pair;
the manuscript switcher's live wiring.
