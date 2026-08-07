# Dashboard — One-Screen Redesign · Settled Spec

> Committed verbatim from Nick's locked spec (7 Aug 2026). Design locked against
> `dashboard-one-screen.html` (= `37-settled-one-screen-v15.html`, populated + loading),
> `38-first-run-states.html` (day one / early days) and `28-chart-popup-containers.html`
> (popup ref F). **⚠️ 38 and 28 were NOT supplied at build time** — §9 and §4 below are the
> standing authority for those sections until the files arrive; any conflict when they do is
> resolved in the mockup's favour per house rules, with the reasoned-prose carve-out.
> `dashboard-spotlight-tour.html` (= `39-spotlight-tour.html`) is the tour's authority.
> Nothing here is open for reinterpretation at build time.

## 1 · Layout

* Two-column grid inside the existing app shell (nav is a locked component — never touched):
* Main column (flexible): greeting → active-queries chart → tasks.
* Rail (308px): author/manuscript tile → querying goals → activity → Pro mini-card.
* Content grid: `minmax(0,1fr) 308px`, gap 16px, padding `18px 26px 26px`, max-width 1560px centred.
* One-screen promise: `.app` and the main column are hard-capped `height:100vh; overflow:hidden` —
  `min-height` is FORBIDDEN here (it silently grows past the fold with no scrollbar). Only tasks
  and activity scroll, internally.
* Vertical budget: chart is the flexible element (`flex:1 1 auto`, chart area min-height 120px).
  Tasks are content-driven: natural row height up to `max-height:318px` (then internal scroll),
  `min-height:118px` for the empty state.

## 2 · Greeting (header F)

* Mono kicker: `WEEK {n} OF QUERYING · {manuscript title}` (truncates, never wraps).
* `Hello, {firstName}` — Playfair 29px, plain ink `#241811`. No burgundy, no italics. Date chip right.
* Three fact pills: [tenure] [achievement slot] [agents on file].
   * Tenure: `Querying since {month year}`.
   * Agents: `{n} agents on file` (pink pill). "on file", never "met".
   * Achievement slot: see §7.

## 3 · Active-queries chart

* Sage line `#8a9e88` 2.4px, monotone-cubic smoothed (Fritsch–Carlson / `curveMonotoneX`
  semantics — NEVER Catmull-Rom or basis splines, which overshoot and draw values that never
  happened; the curve must pass exactly through every point and stay within neighbour bounds).
  Gradient area fill, resting dot on the latest point. No gridlines. No current-week band. Two
  faint mono y-scale labels at the left edge (axis lo and hi) are the only scale furniture.
  One-time draw-in on first paint: the line traces itself (~0.9s stroke-dashoffset) with the area
  fading up behind it; never re-runs on resize or range change; skipped entirely under
  `prefers-reduced-motion`.
* Rendering: drawn in real pixel coordinates (1 unit = 1px), re-rendered via `ResizeObserver`.
  NEVER a fixed viewBox stretched with `preserveAspectRatio:none` — that distorts strokes and
  nodes. In React: measure the container, redraw on resize.
* Y-scale: floor at 0; minimum span of 5; ~25% padding; extra top padding (30px) for pins. The
  minimum span is deliberate — do not "optimise" it away, it stops a beginner's 2–3 queries
  looking like a cliff.
* Hover: crosshair (dashed `#c9a89e`) + black node (`#241811` stroke, parchment fill). Snap to
  nearest week.
* Reading zone: hover popup activates only on the line and below it (10px grace above). Above the
  line is the pins' territory; cursor flips default↔crosshair across the boundary.
* Event pins: burgundy-ringed pink markers 20px above the line for notable moments (first request,
  first full, offer). Hover shows a pink-banded Form 11 mini-card naming the event. Pins take
  priority over the crosshair.
* Keyboard: chart is focusable (`tabindex=0`, `role=img`, instructive `aria-label`). ←/→ steps
  weeks, Home/End jump, Esc exits. Each step updates an `aria-live="polite"` region: "Week of {w}.
  {n} active queries. {s} sent, {c} closed."
* Range toggle: 8 weeks / 6 months / All (segmented, mono). Headline chip recomputes per range.
  X labels thin automatically (`ceil(len/8)`), last label burgundy.
* Numbers view: table icon toggles a ledger-styled data table in place of the chart — the WCAG
  text alternative, `aria-pressed` on the toggle. Mono caps headers over a heavier rule; week
  labels in mono caps; figures in Playfair with tabular numerals, right-aligned; generous row
  padding with hairline rules; zeroes render as muted em dashes; a Net column (+n sage, −n muted
  brown, 0 as dash); event-pin weeks carry a small pink chip naming the event (Offer, First full,
  First request); current week row washed `#faf3ea` with a burgundy week label; rows warm slightly
  on hover. It should read as a page from a ledger, not a spreadsheet.
* Sparse state: <2 weeks of data → italic "The line begins once you have queried in two separate
  weeks."
* Derivation: weekly active/sent/closed all derive from the activity log (net = sent − closed must
  reconcile with the line's deltas). Never stored.

## 4 · Chart hover popup — Form 11 frame (ref 28-F)

* Parchment rim (5px pad, radius 13) → `.frame` child: 1px burgundy border, radius 9,
  `overflow:hidden` (real clipping container per the MountCard canon — never an overlay border).
* Sage band header: mono `WEEK OF {date}` left, Playfair count right. Band fills to the frame edge.
* Body: Sent / Closed / Net three-column row (hairline separators). Net of 0 renders as a muted
  em dash, +n sage, −n muted brown.
* Then mono cap `WHERE THEY STAND` (current week) / `WHERE THEY STAND TODAY` (past weeks) + seven
  stage rows: StatusDot · short name · count. No meter bars. Zero-count stages dim to 40%, never
  omitted.
* StatusDot is the locked shared component throughout — consumed, never re-rolled.

## 5 · Tasks

* Grid rows: `56px | minmax(0,1fr) | 104px | 18px` — kind pill, text (title + agent line, both
  truncate), end cell, ⋯.
* Kind pills fixed 20px height, centred text (Pages/Offer/Tidy).
* End cell: status pill and action button occupy the SAME cell, absolutely positioned;
  hover/focus-within crossfades status→action. No reflow on hover. `@media (hover:none)`: action
  always visible.
* Row hover: `#faf6ef` wash, title→deep burgundy, ⋯ appears. Rows are `tabindex=0`.
* Header: `{n} thing(s) require your attention` / one housekeeping item → "One thing to pick up
  when you have a moment" / housekeeping only → "Spare some time to work on these" / empty →
  "Nothing needs you" + italic body "Nothing needs you today."
* Actions from live CTA logic: Mark sent / Review / Work the list ("Work the list" is ink, never
  pink).

## 6 · Rail components

**Author tile (C · band & overlap):** sage→pink wash band (52px) with week pill; avatar (54px,
card-coloured ring) breaking the band, "+" add-photo badge (hover: burgundy); name;
`Querying {n} manuscript(s)`; book shelf inset (`#faf6ef`): mini cover (real cover image when
uploaded; styled placeholder otherwise), title, genre chips, word count — all truncate. Shelf
hover: cover tips −1.6° with deeper shadow.

**Querying goals (new feature):** heading + `{done}/{target}` mono; target sentence; 25-segment
block meter (filled `#c9a293`, staggered fill-in on load, hover deepens). No pace line, no nudge.

* Data model: store ONLY the target (`goalTarget`, `goalPeriod` on the user or a small `goals`
  doc). Progress derives from the activity log. Derived-over-stored.

**Activity:** hairline-centred "Activity" header + expand control; cardlet timeline identical to
the old peek drawer (day labels, StatusDot thread, status pill/time/name/caption rows); internal
scroll; footer is a quiet mono caption only — `LAST 30 DAYS` — no link (hidden while expanded).
The arrows button is the sole route into the expanded feed.

* Expand: arrows button toggles `rail-expanded`; author + goals collapse (max-height→0, opacity,
  margin, padding, border-width, then `visibility:hidden`) while activity, being `flex:1`, grows
  to fill the rail — the flex recomputation IS the animation, don't animate the panel's own height.
* Dismiss: toggle click, Escape (focus returns to button), click-outside. No timer, no
  mouse-leave. Mono hint line while expanded. `aria-expanded`/`aria-controls` on the button.
  Auto-collapse if the viewport drops below the two-column breakpoint.
* ⚠ Collapse trap: intro animations must NOT use persistent `fill-mode` — an animation's final
  keyframe outranks class declarations in the cascade and pins opacity (the "squashed header"
  bug). Scope entrance animation to an `.enter` class removed after it runs.

**Pro mini-card:** parchment, 2px pastille-blue top edge `#c2cfda`, blue dot + mono
`SCRIPTALLY PRO`, link `See what's included →` (`#46608a`), image placeholder 44px
(`#e3eaf1`/`#c9d6e2`). No tagline, no gradient. Pro accent colour is blue, sitewide.

## 7 · Achievement pill rule

Show the highest-priority TRUE fact. Facts only — never encouragement, never consolation variants.

1. Best month yet — {n} sent in {month}: requires ≥3 completed months of history AND the latest
   completed month strictly beats every earlier month AND that month ≥3 sent. Shows for 14 days
   after the month closes, then falls through.
2. {n} weeks running with a query out — current streak of consecutive weeks with ≥1 send, shown
   when streak ≥4.
3. {nth} query sent {timeframe} — round-number milestones (10, 20, 25, 50, 100), within 14 days
   of the event.
4. Fastest reply yet — {n} days — a new personal-fastest response within the last 30 days.
5. Fallback (always true): {n} queries awaiting a reply — current awaiting-reply count.

Each of 1–4 has a 14-day window; recompute daily; on a bad month the slot simply shows a
lower-priority fact, it never comments on the month.

## 8 · Loading skeletons

* Per-card pulse overlays (gradient shimmer `#efe7db→#f8f2e9`, 1.5s loop; static tint under
  `prefers-reduced-motion`). Bars roughly echo each card's structure (heading bar + content bars +
  grow bar). Card content `opacity:0` while loading — layout doesn't shift when data lands.
* Skeletons show while Firestore subscriptions are pending; they are distinct from empty states
  (skeleton = "don't know yet", empty state = "know it's nothing").

## 9 · First-run & empty states (ref 38 — NOT SUPPLIED; this prose is the authority)

**Day one** (no manuscript, no queries): kicker "Getting started", single pill "Day one". Chart →
large faded line-art illustration (envelope with rising letter, stroke `#c9b8a5`, ~34% opacity,
centred behind the copy) + "Every query you send and every reply that comes back will be charted
here." + ink `Send your first query`. Tasks → "Nothing needs your attention yet" / "Tasks appear
here as your queries progress." + ghost CTAs `Add your manuscript` / `Add an agent`. Author tile →
band pill "Day one", sub "No manuscript added yet", shelf becomes a dashed add-manuscript slot
(hover: burgundy). Goals → "Set a target for the quarter" + ghost dashed blocks + `Set a goal`.
Activity → fading thread + italic "The story starts with your first query." Pro card unchanged.
Early-days chart chip: "{n} awaiting a reply". Copy register throughout: professional, friendly,
factual — no lyrical or AI-tell phrasing.

**Early days** (first fortnight): kicker "Week 2 …"; pills = tenure + agents only (no achievement
until one is true); chart draws its 2 points on the 0–5 minimum-span axis; goals show real
progress (2/25); activity includes the "Manuscript added" event; tasks may hold a single
housekeeping row.

## 10 · Interaction polish (all under `prefers-reduced-motion`)

Card hover lift (shadow/border only, no movement); one-time staggered entrance via `.enter` (see
§6 trap); count-up on the chart headline (tabular-nums, instant under reduced motion); arrow-slide
on all `→` links; slim warm scrollbars appearing on container hover; focus-visible rings (2px
`#b98a76`) everywhere hover does something.

## 11 · Responsive rules

* ≤1360px: rail 282px, gaps tighten, h1 26px. ≤1200px: rail 262px, achievement pill drops first,
  task grid tightens.
* ≤1024px: single column, viewport lock released (page scrolls), fixed chart/activity heights,
  expand control hidden.
* Height ≤680px on desktop: lock released likewise — never clip content behind `overflow:hidden`
  with no scrollbar.
* ≤640px: task rows stack to a single column, actions always visible, ⋯ hidden, date chip reflows.
* ≥1560px: content capped and centred.

## 12 · Spotlight tour (ref = dashboard-spotlight-tour.html)

* Six steps: chart → tasks → author tile → goals → activity → closing card. Copy per the ref;
  Form 11 mini-card (parchment pad, burgundy frame, sage band with `STEP n OF 6` + progress dots),
  Skip link, Back ghost, Next/Finish ink.
* Spotlight: a positioned hole with a 9999px box-shadow scrim (`rgba(43,33,24,.46)`), radius 16,
  easing between targets over .45s; card lands beside the hole (right of main-column targets, left
  of rail targets), clamped to the viewport. Final step: hole shrinks away, card centres.
* Controls: Next/Back buttons, ←/→ keys, Esc or Skip to end; focus moves to Next on each step and
  returns to the launcher on exit. Repositions on window resize. All transitions off under
  `prefers-reduced-motion`. Tour collapses the expanded rail before starting and hides demo chrome.
* Visibility rule: auto-runs once on the user's first dashboard load (`tourCompletedAt` unset).
  The `Take the tour` chip (beside the date chip, burgundy dot) remains for the first 7 days of
  membership — derived from account creation date, not stored as a flag — then retires. Skipping
  counts as completing for auto-run purposes; the chip still allows reruns within the window.
  Store only `tourCompletedAt` (timestamp) and `tourDismissed` (bool); day-7 visibility is derived.
* Tour must not run below the two-column breakpoint (≤1024px) — targets reflow; suppress the
  auto-run and hide the chip there.

## 13 · What this replaces / build notes

* This dashboard replaces the live one wholesale: four stat cards, "The story so far" panel,
  "Dates for the diary", Live pipeline, and the to-do popover all leave this page (pipeline/diary
  live elsewhere; not this page's concern).
* Bottom gradient fade: gone — nothing on this page is page-scrollable.
* Demo-only artefacts in the mockups (bottom-right switchers) are not to be built.
* Build target: `/Users/nickphysick/ScriptAlly-app` on `main`, one commit per phase, no
  branches/PRs/deploys.
* Manual browser review required for: viewport-height chain, expand/collapse, chart resize,
  skeleton→content swap (jsdom cannot verify any of these).
