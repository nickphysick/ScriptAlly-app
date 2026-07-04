# Overnight build report — 4 July 2026

Run: dashboard rebuild · theme retokening · Editorial theme · StatusDot amendment.
Ground rules honoured: **no deploys of any kind**, no `functions/` edits, no new npm deps,
explicit-path commits only, gate (tsc + build + full Vitest) before every commit.

## Suggested morning review order
1. **The dashboard itself** (`npm run dev` → /dashboard, or the screenshot walk below): greeting,
   chip, focus slot (pin a stat, swap via a mini, unpin), the drawer (open/pin), then flick
   Capp → Bold → Editorial from the rail seg. This is 80% of the visual risk.
2. **Phase 1 knock-on to the Queries page**: the hub "Log a new query" CTA is now white/mocha in
   Capp (was soft pink) — the one-button lock reaches it via `qcta-pink`. Confirm you want that
   there too, or say and I'll scope it back.
3. **StatusDot in all three themes** on a populated account (my test accounts were empty):
   queries list, reading pane, fortnight chips — six pipeline statuses single-hued, Offer +
   closed set unchanged, un-themed surfaces (onboarding/labs) unchanged.
4. **Deviations + pending decisions** below.
5. Commits: `bfbea6f` (mockup) → `d7f7a01` (themes) → `1f4694f` (StatusDot) → `c5fd246`
   (dashboard) → Phase 4 (tests/docs).

## Phase 0 · Recon

### Deviations (so far)
1. **Mockup filename.** The brief names `design-reference/dashboard-consolidated-v37.html`;
   the file on disk was `~/Downloads/scriptally-consolidated-v37.html` (downloaded 00:41 tonight).
   Content verified — title "Consolidated mockup v37 (all theme picks locked)", `t-edn`, focus
   slot, flip keyframes, drawer all present — adopted into the repo under the brief's expected
   name (commit `bfbea6f`).
2. **Inherited working tree.** The run started with the previous session's *uncommitted*
   Editorial (Manila `.t-ed`) diff in the tree: theme wiring (types union, rail switcher +
   Settings radio entries, AppShell theme map), Manila token values, Queries-page override hooks
   (`qcta-pink`/`qcta-raised`/`qmono`/`qchip`/`qcaveat`), and a `firestore.rules` edit adding
   `'editorial'` to the `queriesTheme` enum. Tonight's Phase 1 spec supersedes the Manila values —
   the wiring and hooks are reused, tokens replaced with the locked graphite spec, class renamed
   `t-ed` → `t-edn` per the brief.
3. **`firestore.rules` is NOT touched or committed by this run** (ground rule 2) — but note:
   the **prod** rules still enum-restrict `queriesTheme` to `cappuccino|bold`, so selecting
   Editorial in prod will be **silently rejected** until the parked rules edit ships via
   `npm run deploy:rules`. Dev rules already accept `editorial` (deployed 3 Jul for the Manila
   review). The parked edit remains uncommitted in the working tree for Nick.

### Mockup — locked picks (from the v37 shell classes + inline JS)
- Shell: `t-capp pos-d es4 eb2 on-dash an-d`; dashboard page `hv-o1`; grid `l-final`; drawer `tl4`;
  top bar `tb-w-float tb-l-center`.
- Greeting = **O1 Salutation** (centred; eyebrow date · week; 49px Playfair; chip; CTAs; no
  status line, no quote, no corkboard). `.ho-hi em` forced non-italic, colour inherit.
- Focus hand-off = **Flip (an-d)**: out `rotateY(-68deg)` 240ms `cubic-bezier(.5,0,.8,.4)`
  forwards; in `from rotateY(68deg)` 340ms `cubic-bezier(.22,.8,.3,1)` both; sequencing
  `{switchAt:230, inMs:350, outMs:240, keep:false}` + `animating` guard; side column has
  `perspective:1400px`.
- Drawer = **tl4 floating**: fixed 14px insets, 285px, radius 18, hairline border, layered
  shadow, `translateX(calc(102% + 14px))` ↔ none, 360ms `cubic-bezier(.22,.8,.3,1)`; T1 entry
  cards; stage `padding-right: 309px` push ≥1180px; per-theme heads (foam gradient / vivid pink /
  graphite 6% tint); pin hides ×.
- Top bar = floating pill (radius 99, margin -8 0 16, padding 8 18, shadow
  `0 2px 10px rgba(58,28,20,0.07)`, card bg, theme border): date left · search centred
  (`⌘K` kbd chip, focus ring) · settings + avatar + name right.
- Stat visuals: 8-bar `mbar` (hot bar = theme hue; neutrals `#d9cbb8` capp / `#e3e2e0` edn),
  `segbar` pipeline mix, `people` row + `+N`, `slider` at rate %.
- Chip: transparent/borderless mono 10px; 7px dot `--chipdot` (capp `#7c3a2a` / bold `#1d1712` /
  edn `--acc #44484d`) with 2s `chippulse` box-shadow ring; text singular at 1; `gone` = fade 260ms.
- Mockup nav pill (capp) resolves to `var(--cbtn, #ffffff)` — white-on-white in the white rail;
  the brief pre-authorises `#f0e8db` + text `#5d4037` if contrast fails (it does — decision
  logged under Phase 1).

### Ground-truth map (verified against code)
- **Dashboard** (`src/components/Dashboard.tsx`, ~2700 lines): TWO layout modes behind
  `isMagazineLayout` (localStorage `scriptally_is_magazine_layout`) + a dev "Switch layout"
  floater. Standard layout children: `dashboard/HeroCard.tsx` (greeting + quote + 4 CTAs +
  notes-desk corkboard), `dashboard/StatCards.tsx` (4 MountCards w/ SVG visuals),
  `dashboard/OverToYou.tsx` (the To-do card: pink band, Urgent/Housekeeping/Notes tabs, real
  row actions incl. Nudge → NudgeModal), `dashboard/WhatsLivePanel.tsx` (6 pipeline nodes =
  REAL StatusDots at 50px + animated dotted line), `dashboard/FortnightInFocus.tsx`,
  "The story so far" inline at 2021–2309 (merged activities, date-grouped, StatusDots +
  parchment cards), CalendarView overlay. First name: `getUserFirstName()` (1122); no
  time-of-day logic today. No global ⌘K anywhere.
- **Stats today** (all in Dashboard.tsx): sent = `queries.length` (735); active = STATUS_ORDER
  non-terminal filter (738–747); agents = `agentBuckets()` queried+idle (752, lib/lifecycle.ts —
  idle = 0 queries ∧ open ∧ ¬set-aside); responses = `hasAgentResponded ?? legacy-status-set`
  (937–956, canonical once-per-query rule from `lib/queryDerivation.ts:90–94` via
  recomputeQuery); weekly send bins from `query.dateSent` (764–784, rolling 7-day bins — the
  brief's ISO-week bars are a change, noted). "Awaiting a reply" ≡ ballHolder "agent"
  (QUERIED/PARTIAL_SENT/FULL_SENT — derived, not stored). Week-of-querying: derivable from
  `min(dateSent)`; no stored field.
- **Theme infra**: classes on the AppShell root (`shell/AppShell.tsx` THEME_CLASS), tokens in
  `index.css` (plus `:root` brand tokens from the Package-Builder stream — `--burg`, `--card`
  per theme, `--slate`…), `queriesTheme` on the user doc, rail-foot seg + Settings radio
  (`AccountSettings.tsx:770`) both write it.
- **StatusDot** (`src/components/StatusDot.tsx` + `statusDot.css`): pure CSS+SVG from
  `STATUS_DOT_MAP` — per-status base hex spectrum (10 statuses), fill = mix(parchment, base,
  .2), glyph = mix(base, ink, .22), 1px base ring, pulse on the four "your move" states,
  `ghost`/`decorative`/`overrideSize` (min 12; default 30). `STATUS_DOT_LEGEND` +
  `statusDirection` exports. **41 render sites** incl. queries list/pane, legends
  (StatusDotDemo), FortnightInFocus, StatCards, WhatsLivePanel (the six pipeline nodes ARE
  StatusDots), story entries, onboarding loaders + LoginDashboardPreview (both render OUTSIDE
  the themed shell — token defaults must keep them looking as today).
- **Tasks**: `useTaskAlerts()` = tasks + overdue notes; urgent split + row actions live in
  OverToYou (`buildOverToYouRows`) — Mark sent / Review / Record / Nudge with real handlers.

## Phase 1 · Theme retokening + Editorial — DONE (`d7f7a01`)
- Shared per-theme token vocabulary added (`--hdr`, `--band-a/-b/-bd/-meta/-strong`,
  `--abtn-*`, `--navpill`/`--navtext`, `--acc`); Capp mocha/foam/white-button set; Bold
  black/ink-frame set; **Editorial `t-edn`** graphite system (Soft `.sa-soft` container class +
  Tinted buttons, every tint pre-computed — no runtime `color-mix()`). Both switchers carry
  Editorial. Gate: tsc clean · build ✓ · 368/368.
- **Decisions logged:**
  - Capp nav pill = `#f0e8db` + mocha text (the brief's pre-authorised fallback — the mockup's
    resolved white pill is invisible in the white rail).
  - The pink hard shadow under the Queries hub CTA is retired in ALL themes (v37 buttons are
    flat); `qcta-raised` now neutralises it.
  - Green sweep: applied to themed chrome; the remaining `#2e3a2c` sites are all UN-themed
    pre-shell surfaces (onboarding, auth, Form-11 drawer headers, dev labs) + `designTokens.
    headingInk` — left alone (out of themed scope; dashboard greens go in Phase 3).
  - Class renamed `t-ed` → `t-edn`; Manila token values fully superseded.
- **Parallel-session note:** another stream is committing packages work in this repo tonight
  (`FirstVisitHome.tsx` WIP appeared mid-run). All commits here use explicit `--only` paths.

## Phase 1.5 — Queries page under the retokened themes
The Queries hub CTA now follows the one-button treatment in every theme (white/mocha in Capp —
a visible change from soft pink, per the lock). Band/header colours inside Queries.tsx remain
hard-coded (they read `--band`/`--bd`, unchanged); the foam band application is dashboard-scoped
in Phase 3 per the brief's 3.6.
## Phase 2 · StatusDot amendment — DONE (`1f4694f`)
- Six pipeline statuses read `--sd-hue`/`--sd-centre` (per-theme values as specced); per-status
  spectrum hexes remain as FALLBACKS so un-themed surfaces (onboarding, auth preview, dev labs)
  render exactly as before. Pulse ring follows the hue. CLAUDE.md lock rewritten.
- **Interpretations logged (mockup/brief vs app reality):**
  - "The offer tick disc keeps its existing treatment" — the app's Offer dot is a green star,
    not a tick disc (that's mockup shorthand); Offer is exempted wholesale (keeps green).
  - "Closed-state grey" read as the closed SET (Rejected/Withdrawn/No Response) — all three keep
    their current colours, including Rejected's red.
  - The What's-live pipeline nodes ARE real StatusDots in the app (not the mockup's bespoke 62px
    ring circles). They pick the theme hue up automatically; the mockup's "2–2.5px ring" styling
    was NOT recreated — geometry lock + "legends render the component" outweigh it.
- Gate: tsc · build ✓ · 368/368.
## Phase 3 · Dashboard rebuild — DONE (`c5fd246`, single commit — the 3a–3d split wasn't
needed; the pieces landed coherently in one gated pass)
- New files: `dashboard/DashTopBar.tsx`, `FocusGreeting.tsx`, `TimelineDrawer.tsx`,
  `DashboardStatsRow.tsx`, `focusSlot.ts` (pure reducer), `dashboardV37.css`,
  `lib/dashboardStats.ts` (selectors). `Dashboard.tsx` re-composed to the v37 single column;
  the story-so-far entry markup moved verbatim into the drawer body.
- **Verified live** (throwaway dev account, deleted after): greeting/eyebrow/chip-at-zero, four
  CTAs, stat zeros, focus open → mini-swap (flip) → unpin, drawer open/pin (`sa.timelinePinned`)
  /close + 309px stage push + pull tab, Bold + Editorial + Capp token spot-checks on the page.
- **Deviations / judgement calls:**
  - Top-bar search binds the existing shared `searchQuery` state directly (the composed pill is
    not the NavSearch typeahead — the rail already hosts that; "existing search behaviour" for
    the dashboard is the filter state).
  - Drawer body shows ALL story entries (existing behaviour); the eyebrow counts the fortnight's.
  - "Queries sent" focused sub-line omits the mockup's "best week since May" comparative (not
    trivially derivable); "Responses" omits "median 31 days" for the same reason. Both logged
    per the brief's show-what-you-can rule.
  - Magazine layout + its dev floater retired from render (helpers/components kept in-file);
    HeroCard/StatCards stay in the repo unrendered.
  - Weekly bars use ISO-week bins (the brief's spec) — the OLD stat card used rolling 7-day
    bins, so the "+N this week" number can differ from the previous dashboard's.
  - Editorial pipeline segbar: lead segment = theme hue, tail = fixed neutral ramp (shared
    across themes) — per-theme tails felt out of scope for tonight; flag if wanted.
  - A "Missing opening (" Tailwind build failure traced to `*/` inside a CSS block comment
    (token names like `--band-*/`) — comment reworded; watch for that pattern in CSS comments.
## Phase 4 · Tests, a11y, docs — DONE (final commit)
- **27 new unit tests**: focus-slot reducer (open/close/swap-eviction, animating guard, stray
  events, reduced-motion instant, locked timings), stat selectors (ISO-week series fixtures,
  awaiting-reply, canonical response rule incl. legacy fallback, idle agents, week-of-querying
  wording, chip pluralisation, salutation), timeline pin persistence (storage-injected,
  private-mode safe). Suite total: 395.
- **A11y shipped in Phase 3, verified here:** chip `aria-expanded`; focus moves into the slot
  panel on open and back to the chip on close; drawer tab/pin/× are real buttons with labels
  (`aria-pressed` on the pin); every animation/transition has a `prefers-reduced-motion` path
  (CSS blocks + the reducer's instant mode).
- `App.tsx` now passes `setSearchQuery` to Dashboard (the top-bar search was inert without it).
- CLAUDE.md: new "Dashboard v37 + themes — LOCKED SPECS" section (token tables, chip, focus-slot
  mechanics + flip timings, drawer spec, selector rule); StatusDot lock was rewritten in Phase 2.

## Pending decisions for Nick
- Status pills ("PARTIAL REQUESTED" etc.) — explicitly out of scope tonight (Phase 2.6).
- Rail bell/TasksDropdown vs the new dashboard To-do focus slot — two homes for tasks now;
  untouched tonight per the brief.
- Timeline drawer app-wide? Built dashboard-only per spec.
- Prod rules deploy needed before Editorial persists in prod (see Deviations #3) — the parked
  `firestore.rules` edit is still uncommitted in the working tree, untouched by this run.
- The Queries hub CTA inherits the one-button treatment (white in Capp) — confirm or scope back.
- Guided empty state still renders ABOVE the new dashboard for brand-new users (unchanged
  behaviour); it reads a little long stacked on the v37 greeting — worth a look.
- `.claude/launch.json` gained a `scriptally-dev-alt` (port 3010) config — gitignored, local only
  (port 3000 was held by the parallel packages session overnight).
- The parallel packages stream was active during this run (`FirstVisitHome.tsx` WIP observed);
  every commit here used explicit `--only` paths and never touched its files.
