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

---

# Manuscripts rebuild — bookplate hero + comp shelf + Pro suggestions (4 Jul 2026, afternoon unattended run)

Separate build from the dashboard report above. Ground rules honoured: no deploys, no new deps,
explicit-path `--only` commits, no touches to the no-touch set (App.tsx · Agents.tsx ·
shell/AppShell.tsx · agents/** · recon docs · PNGs). Send-query preselection via
`initialManuscriptId` is DEFERRED (needs App.tsx — named follow-up at the end).

## ⚠️ Live-tree context — read this first
- The parallel stream committed during this run (Agents v2 `1850afe`, Queries `44bd564`, Builder
  Cappuccino retokens `2e6e5cf`/`01362ea`) and holds UNTRACKED WIP in the shared tree:
  `src/lib/discoverAgents.ts` + `discoverAgents.test.ts`, `src/components/agents/discover.css`,
  plus a modified `src/components/packages/PackagesHome.tsx`.
- **Model collision — action for the agents stream:** their untracked `discoverAgents.ts` reads
  `Manuscript.comparableTitles`, which Phase 1 (`7bd522e`) replaced with `comps: CompTitle[]`.
  Repo-wide `tsc` is red on exactly those two untracked files until they migrate — helpers are
  ready in `src/lib/comps.ts` (`manuscriptComps` / `compsSearchText`; `communityMatch.ts` shows
  the one-line pattern). Until then their `hasComps` reads false at runtime. Their WIP was NOT
  edited from this run (no-touch spirit + live lost-update risk).
- **Gate protocol adapted for that collision:** every phase's gates (tsc + build + full Vitest)
  run green in an ISOLATED worktree of HEAD + only this build's files (untracked WIP absent by
  construction) before each commit; build + Vitest are also green in the shared tree (only tsc
  is affected there, only by their two files). Worktree: scratchpad `gatecheck` (auto-cleaned).

## Pre-flight
- `design-refs/manuscripts-page-v1.html` committed byte-identical from ~/Downloads (`2b6b78e`).
- Shared-tree baseline at run start: tsc clean · build clean · **452 tests / 33 files** (the
  go-ahead's 444 predated the stream's `listRowDate` tests). This file is tracked (not
  untracked as the go-ahead assumed) — this section is appended and left uncommitted.

## Phase 1 — structured comps (`7bd522e`)
Files: `types.ts` · `lib/comps.ts`+test (new) · `lib/manuscripts.ts` · `lib/seeds.ts` ·
`lib/communityMatch.ts` · `lib/packageMetrics.test.ts` · `AddManuscriptFocusForm.tsx` ·
`AllManuscripts.tsx` · `ImportCsv.tsx` · `firestore.rules` · `tests/rules` fixture.
- `CompTitle { title, author?, year?, note?, source?: 'user'|'suggested' }`;
  `Manuscript.comps: CompTitle[]`. Legacy `comparableTitles` strings parse at READ time only
  (`parseLegacyComps`: " meets " then commas, titles only) — never written back.
- Add-form tags write `{title, source:'user'}` (capture unchanged); edit modal's comps field
  REMOVED — the shelf is the single editing home; CSV import maps the comps column through the
  same parser; the seed manuscript is structured.
- `communityMatch` matches on comp titles via `compsSearchText` (verdict 10).
- Rules: `comps` validated as a list capped at 12 + allowlist swap (verdict 11). **STAGED, NOT
  DEPLOYED.** Validated optional-when-present (not required) so pre-cut docs stay updatable —
  avoiding the affectedKeys silent-denial trap.
- Rules-test fixture updated but NOT executed here (emulator needs Java — unavailable in this
  environment); verify on the next emulator run.

## Phase 2 — page shell (`5a96086`)
Files: `AllManuscripts.tsx` (interior replaced) · `components/manuscripts/{manuscripts.css,
FieldCard.tsx, MaterialsCard.tsx}` (new) · `lib/manuscriptPage.ts`+test (new).
- Control row (`YOUR MANUSCRIPTS · N`, spine switcher only when >1, shelved spines dimmed with
  the SHELVED micro-label) · bookplate hero (grey pill reads "Shelved" under
  shelved-presentation per verdict 1; word-count whisper; logline hue rule; corner motif;
  Capp-only inset frame + card grain, both `.t-capp`-scoped) · In the field (zero-suppressed
  stage rows in canonical pipeline order, real StatusDot at 15px, one aggregate Closed row on
  the Rejected cross glyph; R&R and Offer are active rows, never folded) · Submission materials
  (live per-type version counts from the Builder's versions collection, canonical TypeGlyph,
  `N VERSIONS` / `—` per verdict 6).
- Conservative adaptations (all logged):
  - **Page CSS lives in `src/components/manuscripts/manuscripts.css`, NOT `index.css`** — the
    parallel stream was actively committing `index.css` mid-run; theme scoping
    (`.t-capp .msv1 …`) is identical from a page stylesheet and contention-free. Tokens are
    `--msv-`-prefixed because the mockup's names (`--card`, `--band`) exist app-wide with
    DIFFERENT values. The hue pair consumes the existing `--sd-hue`/`--sd-centre` (identical
    hexes to the mockup's `--hue`/`--huec` in all three themes).
  - Page background = the app's `--desk` token (the Bold mockup hex was 1-off the app token:
    `#c3cfdb` vs `#c2cfda` — token wins).
  - `genreWordCountRange` was ALREADY the shared util the prompt asked to extract — consumed
    as-is; existing genre coverage sufficed. New tested builder `wordCountWhisper` composes the
    phrase + compact range ("YA steampunk fantasy typically runs 50–80k").
  - Queries-sent figure counts ALL the manuscript's queries (undated provisional imports
    included); "N active" = non-closed statuses (Offer is active).
  - Spine selection persists through the existing `scriptally_active_manuscript_id`
    localStorage key — the Package Builder reads the same key, so OPEN PACKAGE BUILDER opens
    scoped to the active book, and returning keeps context.
  - Body font stays Source Sans Pro (the established app deviation from mockup Inter); button
    icons are lucide (Plus/Send/Pencil) rather than the mockup's inline paths.
  - VIEW IN QUERIES HUB → plain `onNavigate("queries")` (the hub's manuscript filter is
    internal-only state — verdict 5).
- **Dropped from the old interior per verdicts 3/4** — flagged prominently: the **jottings
  feed UI is gone** (the `users/{uid}/manuscripts/{id}/notes` subcollection and its data are
  untouched — it needs a future home), and the filter/search/sort panel died with the old
  interior (the rail `searchQuery` prop is kept but currently unused by this page).
- Empty states: zero-manuscript minimal panel in the page grammar (verdict 7); zero-query
  "Still on the runway." card with Send-first hidden for shelved books.

## Phase 3 — comp shelf + pitch line (`5474f70`)
Files: `lib/comps.ts`+test (extended) · `components/manuscripts/CompShelf.tsx` (new) ·
`manuscripts.css` · `AllManuscripts.tsx`.
- Pitch block (2 comps → italic line + Copy→Copied ~1.4s; 1 → "one more comp completes the
  line"; 0 → hint only, all per reference). Shelf grid `auto-fill minmax(235px,1fr)`: hue
  spines, `AUTHOR · YEAR` mono with graceful omission, Caveat notes (Playfair italic under
  Editorial), hover remove-×, derived gold `OLDER COMP · {year}` chip (`isOlderComp`,
  year ≤ now−5 — never stored). Add-a-comp modal in the page's theme language writes
  `{…, source:'user'}` with empty optionals OMITTED (Firestore rejects undefined in maps).
- Adaptations: shelf cap 12 mirrors the rules cap — the add tile disables at capacity (the
  mockup had no cap; rules verdict 11 implies one). Comp adds/removes go through pure
  `withCompAdded`/`withCompRemoved` (tested, including the cap). A first shelf write on a
  legacy-string doc converts it to `comps` (stray `comparableTitles` field remains inert).

## Phase 4 — Suggestions UI + Pro gating (`bc0fcb7`)
Files: `lib/suggestComps.ts`+test (new) · `components/manuscripts/SuggestionsSection.tsx` (new) ·
`manuscripts.css` · `AllManuscripts.tsx`.
- Free: section fully visible, button routes to `/plans` (the canonical upsell destination
  found in recon) — no fake skeletons. Pro: ≥1s shimmer → callable → rows (Playfair title,
  `AUTHOR · YEAR`, rationale, gold caution chips) → button becomes Refresh. Shelf +
  session-dismissal dedupe is per manuscript and case-insensitive; dismissals are component
  state only. Add to shelf writes `{title, author, year, source:'suggested'}`. Age caution
  derived client-side from `year` via the SAME `isOlderComp` rule as the shelf chip. Footer
  copy exact per spec. Quiet unavailable state + TRY AGAIN (until the function deploys, every
  real click lands here by design — the window mock `__SA_SUGGEST_COMPS_MOCK` exercises the
  loaded path).
- Adaptation (verdict 9): the PRO chip replicates the Builder badge exactly (slate `#6A89A7`
  on `#e7eef3`, 1px `#cfdde6`, mono 9px) rather than the original prompt's white-on-slate.
- Client-side response re-validation (`validateSuggestionsPayload`) guards against function
  version skew — malformed items drop, never throw.

## Acceptance walk — PASSED (5 Jul, staged dev account, all three themes)
Pre-flight: Phase 6 confirmed landed (`5812448`); rules deployed to dev via
`firebase.dev.json` (compiled + released to the `(default)` DB — a parallel session also landed
the whole rules file to prod the same day); account staged end-to-end through the real UI:
`bookplate.walk.0705@example.com` (Pro), two manuscripts (Citadel querying w/ 3 comps + 1 query;
Salt overlay-shelved), left in place on dev for Nick's own eyeball — localhost:3040.

All eleven checks passed. Highlights and proofs:
1. Hero — eyebrow/pill/title/`98,200 words` + live whisper ("YA fantasy typically runs 50–80k")
   /logline rule/motif. Inset frame + grain computed-style verified PRESENT in Capp
   (1px rgba(124,58,42,.3) + feTurbulence) and ABSENT in Bold/Editorial.
2. Shelved — the verdict-1 amendment live: overlay-shelved-while-Drafting reads grey "Shelved";
   SHELVED micro-label + dimmed spine; sends hidden; Shelve→undo toast and Reactivate→"back in
   play" both fired; the shelve WRITE succeeded (deployed rules proven).
3. Spines — absent at one book, present at two; selection persisted across saves and switches;
   OPEN PACKAGE BUILDER wrote the shared active-manuscript key (the Builder's first-visit home
   lists both books on a fresh account, so visual scoping there is inconclusive — key contract
   verified, not a bookplate defect).
4. Pitch line — 0-comp hint · 1-comp "meets …" · composed line with italics · Copy→Copied→Copy
   (~1.4s cycle confirmed with fresh node reads).
5. Shelf — themed add modal wrote {title, author, year, note, source:'user'} (rules accepted);
   `V.E. SCHWAB · 2015` by-line; Caveat note (Playfair italic in Editorial — computed);
   OLDER COMP derived on 2015 AND on the 2021 boundary; add-form tag arrived titles-only.
6. Free gate — plan flipped to Free live: Find suggestions routed straight to /plans, no call;
   PRO chip = the Builder badge (computed rgb(106,137,167) on rgb(231,238,243), constant across
   all three themes).
7. Pro — via `__SA_SUGGEST_COMPS_MOCK`: ≥1s shimmer (3 rows) → rows with rationale; shelf-dedupe
   filtered an on-shelf title out of the response; derived age flags ("5 YEARS OLD", and
   "MEGA-BESTSELLER"+"11 YEARS OLD" scale-first); Add to shelf grew the shelf to 3 (author+year
   carried, source:'suggested') and the row left via dedupe; dismiss removed a row
   (session-state only); footer copy exact; button → Refresh. Without the mock: the real call
   fails pre-deploy into the quiet "Suggestions aren't available right now. TRY AGAIN" state.
8. In the field — a real query logged through the form: figure 1 / "1 active" pill /
   zero-suppressed "Queried · 1" with a real StatusDot; VIEW IN QUERIES HUB landed /queries
   showing that query; "Still on the runway." on the unqueried book (send hidden while shelved).
9. Materials — live "—" ×3 from the versions collection; builder link navigates + writes the
   key. The populated `N VERSIONS` state wasn't exercised (fresh account, no versions authored)
   — that derivation is unit-tested.
10. Preselect (`a716cad`) — hero: Citadel pre-chosen; empty-state Send-first (after
    reactivating Salt): Salt pre-chosen; both editable; the shelved book is absent from the
    picker entirely, so it can never arrive pre-chosen.
11. Console — ZERO errors across the entire walk, all themes (the deliberate failed callable is
    caught and wrapped by design).

Environment caveats: headless preview runs at dpr 1, so Bold's 1.5px ink borders compute to
1px (device-pixel snapping — colour/radius prove the token block applies; retina renders true
1.5px). The walk drove the real dev Firestore; the staged account is live test data, kept
deliberately (it IS the staging the walk asked for).

## Phase 5 — `suggestComps` Cloud Function (`ad04e4a`) — BUILT, NOT DEPLOYED
Files: `functions/src/suggestCompsCore.ts` (pure core) · `suggestComps.ts` (callable) ·
`suggestCompsCore.test.ts` (runs in the root Vitest suite, like assembleImport) · `index.ts`.
- Mirrors `extractFromEmail`: onCall `europe-west2`, `defineSecret("ANTHROPIC_API_KEY")`,
  `claude-sonnet-4-6`, timeoutSeconds 60 / 512MiB, auth → input validation (title/age/genre
  required; logline optional; synopsis optional; shelfTitles ≤24) → SERVER-SIDE Pro check on
  `users/{uid}.plan` → model call → parse (strip fences, JSON.parse, drop-malformed items,
  caution allow-list, dedupe vs shelf + internal, cap 6, rationale ≤160) → `{suggestions}`.
  Retry-once on malformed output; `internal` vs `unavailable` HttpsError split the client
  understands. Per-call token usage logged to console.
- Deliberate choices: temperature 0.7 (Refresh wants variety; extraction keeps 0);
  `functions npm run build` (tsc) green — note tsc emits despite errors, so the gate checks
  the exit code with pipefail (one real error caught and fixed this way: the structural
  AnthropicLike client must type its param `any` like emailImportCore, not `unknown`).
- Rate limiting beyond auth+Pro deliberately deferred (per spec). The client currently omits
  `synopsis` (the Manuscript model has no synopsis field — the add-form's "synopsis" box
  stores into `notes`); the callable accepts it for when a real source exists.

## Phase 6 — docs + close-out
- CLAUDE.md: new "Manuscripts page v1 — LOCKED SPECS" section (grammar, CompTitle model,
  single-home comp editing, derived-never-stored rules, Pro-gate pattern, footnote copy,
  pending actions) inserted after the agents-stream's v2 section; current suite figure noted
  (~523 — the go-ahead's 444 and the historical 368 both predate parallel-stream tests).

## Pending manual actions (Nick)
1. **`firebase deploy --only firestore:rules`** — ships the comps list validation (cap 12)
   together with the still-pending agent-location rules. Remember the dev dual-DB gotcha:
   dev deploys need `--config firebase.dev.json --project dev`.
2. **`firebase deploy --only functions`** for `suggestComps` once the Blaze/API-key gate opens
   (same secret as Smart Import; deploy command in the function's header comment). Verify the
   ANTHROPIC_API_KEY rotation noted in CLAUDE.md's Loose ends BEFORE any functions deploy.
3. **Follow-up prompt:** send-query preselection — thread `initialManuscriptId` through
   App.tsx's LogQueryFocusForm overlay state once the Agents stream has landed and App.tsx is
   clean (deferred by the go-ahead; single-manuscript users already default correctly).
4. **Jottings feed:** decide whether the manuscript notes subcollection gets a home in the new
   page grammar — the UI was removed this run, the data is untouched.
5. **Agents-stream handover:** their untracked `discoverAgents.ts`/`.test.ts` must migrate
   `comparableTitles` → `manuscriptComps`/`compsSearchText` (repo-wide tsc is red on exactly
   those two files until then).
6. **Rules tests:** the manuscript fixture in `tests/rules/firestore.rules.test.ts` now uses
   `comps: []` — run the emulator suite when Java is available (not runnable here).

## Review pointers
- Eyeball on a real account: /manuscripts in all three themes (rail seg) — hero inset frame is
  Capp-only; spine switcher needs ≥2 manuscripts; shelved book (status or overlay) shows the
  grey "Shelved" pill + hidden Send a query. Comp add/remove + Copy. Suggestions: Free routes
  to /plans; Pro shows the quiet unavailable state until the function deploys (set
  `window.__SA_SUGGEST_COMPS_MOCK = {suggestions:[…]}` in the console to preview the loaded
  rows without a deploy).
- The reduced-motion check: the suggestions shimmer stills under Reduce Motion (CSS guard).
- **A dev server for this build is running at http://localhost:3040** (`scriptally-dev-manuscripts`
  in `.claude/launch.json` — added; 3000/3010/3030 were held by the parallel sessions). Boot
  verified signed-out: zero console errors, bundle loads all new modules.
- Late live-tree note: by close-out the agents stream had picked up the comps model itself —
  `communityMatch.ts` carries their updated doc comment (uncommitted, theirs) over my Phase-1
  change, and their `discoverAgents.ts` migration looked underway. The gate worktree was removed
  at close; every phase commit remains isolated-verified.

## Follow-up — send-query manuscript preselect (`initialManuscriptId`), 5 Jul
Closes pending action 3. A copy of the agents seam (`abd4d87`), one commit:
- `LogQueryFocusForm` gains optional `initialManuscriptId`, coexisting with `initialAgentId`
  (independent fields; neither touches the other). The manuscript seeds ONLY when pickable —
  `resolveInitialManuscriptId` (`src/lib/logQuerySeed.ts`, unit-tested) checks the id against
  `pickableManuscripts` and otherwise falls back to today's default (first pickable, "" when
  the library is empty). Absent, the reset line is behaviourally identical to before. No
  dirty-baseline change was needed: unlike the agent, the manuscript selection has never been
  a dirty-check field.
- `App.tsx`: `opts` widened to `{ agentId?, manuscriptId? }`; the interception stows
  `logQueryManuscriptId` (cleared on close) and passes it to the form — the exact `abd4d87`
  shape, nothing else moved.
- Bookplate entry points: the hero's "Send a query" and the field card's "Send first query"
  both pass the active manuscript's id (derived from the existing spine selection — no new
  state). Tests: happy path · unpickable fallback · absent-prop unchanged · empty library
  (coexistence with `initialAgentId` holds by construction — independent code paths — and no
  component test harness exists in this repo to assert it end-to-end).

## Landing page + route tiers (`landing:` series), 5 Jul

**Shipped:** `f63fff8` design refs → `0f63ad5` route tiers + shells → `da1565f` static landing → `a7393c8` two-act demo → Phase 5 journeys/docs (this commit). Commit zero (`9879690`, the pending CLAUDE.md) was landed by its owning stream mid-recon — adopted, not duplicated. Gates green per commit; suite 542 → 566 across the build (tier locks + copy locks + timeline locks).

**Route tiers:** `tierForPath` in `src/marketing/routeTiers.ts` is the one source (marketing `/` + `/pricing` · focus `/account /plans /help` · workspace = the old KNOWN_PATHS minus those, now `WORKSPACE_PATHS`). App.tsx branch order: dev labs → authReady splash → **marketing** (public, before the guard) → `!currentUser` guard (unchanged for app tiers) → onboarding gate → **focus** → unknown→dashboard → AppShell. `#/signup` joined `#/login`/`#/signin` as a recognised pre-auth hash on marketing routes only (elsewhere signup was already the default); once auth completes with a hash set, a `<Navigate to="/dashboard" replace>` finishes the journey (hash cleared by the router).

**Deviations / decisions (all deliberate):**
- **Body font = Source Sans Pro,** not the refs' Inter — the standing SidebarShell-era precedent; avoids a fourth webfont.
- **Copy tests lock exported constants** (`landingCopy.ts`), not DOM renders — the repo has no component-test harness (node env, no testing-library). Components consume the same constants, so drift fails the locks.
- **Privacy · Terms render inert** (styled spans) — no pages exist yet. Pending content decision.
- **Feature-row text-links:** import row → the real xlsx template download; "See what Pro adds" → `/pricing`; the rest → `#/signup` (the app is the explainer). Revisit if real explainer anchors land.
- **Phase 1 ran tsc-only** (two HTML files outside the build graph; the full trio had just run green for commit zero). Full gates on every code phase.
- **Tier crossings unmount the AppShell** — visiting `/account` etc resets workspace page-local UI state (Queries filters/selection); Firestore data lives in DbProvider and survives. Workspace-internal navigation keeps the pages-stay-mounted behaviour untouched. This is the architectural cost of "the rail disappears" and matches pre-AppShell parity for those tabs.
- **`AccountSettings` upgrade CTA retargeted** `pricing` → `plans` (one line + header comment) per the journeys table — the only workspace-page edit in the build.
- **Demo fidelity fix over the ref port:** the × point is measured once while the split is open and reused for the depart glide (the ref reuses `xpt`; a post-close re-measure aims at a collapsed 0-width column — caught live in verification).
- **StrictMode dev double-mount** is absorbed by the AbortController cleanup (first loop aborts mid-first-sleep; prod single-mounts).

**Verification:** all table journeys walked in-browser on a throwaway account (deleted after, auth shell console-purgeable): logged-out landing/login/signup hashes; signup → onboarding gate; logged-in `/` no-redirect with authed nav; **un-onboarded `/` → Open dashboard → onboarding gate (explicit check, passed)**; rail Settings → `/account` FocusShell → back (only Dashboard highlighted — no active-tab coupling to the moved routes exists in Rail/Nav/BottomTabBar, verified by grep + eyeball); upgrade → `/plans`; wordmark → `/`; `/help`. Demo Act 1 witnessed live (cursor parked on the spark end at (557.4, 388.5); popup shown through its 4s hold, positioned end.x−108 / end.y−14−height); Act 2 split/×-aim/close verified by state sampling. **Harness caveats:** native scroll events, CSS animation playback and `prefers-reduced-motion` cannot fire in the preview — the nav hairline and fade/glide *rendering* were verified by synthetic dispatch + class/style state; the reduced-motion tableau is unit-tested (`applyStaticTableau`) but wants one real-device eyeball, same as the loader's.

**Old landing retirement:** nothing to delete — `holding/` + `firebase.holding.json` (default-site coming-soon page + `/api/waitlist` fn rewrite) live outside the app build and deploy only when that config is explicitly invoked. Repointing `scriptally.ink` is Nick's console/DNS decision after dev review (out of scope). CLAUDE.md now records both facts.

## Rail rebuild (`rail:` series), 5 Jul

**Shipped:** `73e47cc` design refs → `599d4d7` structure (Cappuccino) → `572e996` Bold + Editorial tokens → docs (this commit). Suite 566 → 582 across the build (grouped-index/capture locks + token rule-text locks).

**Decisions / deviations (all deliberate):**
- **Record a response seam:** no app-level entry existed (the dashboard opens `RecordResponseScreen` from local state), so the rail's button rides a NEW App.tsx interception (`"Record a response"`) hosting a second instance of the same self-contained screen. Two independent hosts of one component — Dashboard internals untouched (fence), no new form built.
- **Floating card → flush panel:** the mockups draw the rail as a radius-16 bordered card in a swatch; the live rail stays the full-height shell panel — the frame token drives the right edge, the shadow rides verbatim, and the mockup's `overflow:hidden` is deliberately NOT carried over (the bell/account flyouts must escape the rail).
- **Rejection analytics omitted** (in both refs, not built — no dead links).
- **Collapse:** all new elements slot into the existing `.arail-collapsed` CSS block (eyebrows hidden, Record icon-only, pair stacks, badge as icon-corner bubble) — no disproportionate work, no simplifications needed.
- **`--navpill`/`--navtext` are no longer read by the rail** (it consumes only the additive --rail set); they remain defined and untouched per the fence.
- **Bell badge shape:** the count bubble sits on the icon corner (works expanded AND collapsed) rather than a right-aligned chip — the refs don't draw a badge, so the existing bubble treatment carried over.

**Gate note (multi-stream):** at Phase 3 gate time `npx tsc` was RED in the shared tree — `src/components/Queries.tsx(2733) hasName` from the location stream's live uncommitted WIP, not this stream's files. Per the multi-stream protocol the gate ran in an isolated worktree at HEAD + only this phase's files: tsc clean · build green · 582/582. Phase 4 is docs-only and rides that verified code state.

**Verification (throwaway account, deleted after):** grouped rail renders per grouped-v5 in all three themes (Bold: 1.5px ink edge + 5px offset shadow + `#eec9c3` pill + ink-framed buttons w/ 2px offset shadows; Editorial: borderless + layered shadows + `#e9eaeb` pill + WHITE hairline buttons distinct from the pill). Active states: /queries · /agents · /agents/discover · /manuscripts/packages each light exactly their own entry; focus routes light nothing. Captures: Record opens the real RecordResponseScreen over the current page (no navigation); + Query the Log form; + Agent the Add form. Bell from the utility group: TasksDropdown opens at x=229 beside the 216px rail, fully on-screen. Collapsed: eyebrows gone, icon-only buttons, pair stacked, items centred (target width 60px — the computed 216 mid-probe was the harness's frozen width transition). CSS motion itself (collapse glide, hover transitions) needs Nick's real-browser eyeball as ever.

## Rail follow-up — capture regroup + notifications removal, 5 Jul

`+ Record a response` moved from the top slot to lead the foot capture cluster (full width above the `+ Query`/`+ Agent` pair, styling untouched incl. the Editorial white-button exception); the index gains the freed space (the elastic nav region absorbs it — comfortable at 720px height, foot unchanged at 712). **Notifications removed from the rail.** Recon: the rail item was the only DESKTOP trigger for `TasksDropdown`; the below-`md` mobile slim bar (`Nav.tsx`) keeps its own bell trigger. So on desktop, task alerts now surface ONLY via the dashboard to-do/attention flow — **open product decision** whether they need a dedicated desktop surface again. `TasksDropdown` + `useTaskAlerts` are intact (mobile still consumes them); the rail simply no longer imports them. Rail tests needed no changes (they lock the grouped index + capture contracts, which are unchanged; no test asserted the utility-group contents).

## Rail collapse rebuild — hover-peek + pin + scrim (`rail:` series), 5 Jul

**Shipped:** `7b0060c` design ref → `d6f8412` mechanics → `0318a36` Bold/Editorial tokens → docs (this commit). Suite 586 → 603 (peek state/persistence/intent locks + token locks). Prereqs verified up front (width/type raise `4cb6241`, capture regroup `a89335c`).

**Decisions / notes:**
- **Overlay architecture:** wrapper `aside.arail` owns the FLOW width (60 rest / 240 pinned, 280ms); the absolute `.arail-panel` owns the VISUAL width (240 during peek) — verified live that the stage's left edge holds at 60px mid-peek (no content reflow).
- **Scrim placement:** fixed inset-0 INSIDE the aside (z 0 vs the panel's z 1, aside at z 40) — keeps it inside the themed tree so `--rail-scrim` resolves per theme, under the drawer (45/46)/modals(50)/dropdowns(60) with no portal. Verified: timeline pull-tab renders above the scrim.
- **Account-menu hold:** the menu flies past the panel, so the pointer legitimately leaves during use — the peek holds open while the menu is open (component-level `peeking || showAccount`, deliberately not part of the pure model).
- **Search slot at rest** keeps its height via `visibility:hidden` so entering the peek never jumps the index vertically (the ref mock has no search; this is the translation).
- **⌘K assist:** unpinned at rest the search is hidden, so ⌘K opens the peek first (`openNow`, no intent delay) then focuses — focus-within keeps it open.
- **Unpin-under-cursor:** after unpinning (button or `[`), the rail retreats even though the pointer may still be over it; `onPointerMove` re-arms the intent so the next twitch of the mouse re-peeks. Deliberate, minor.
- **Theme-seg at rest:** hidden (exactly its old collapsed handling — nothing awkward to report).
- **Legacy key migration** verified LIVE (the walk profile carried the old chevron key: expanded→pinned mapped and wrote through on first read). The legacy key is left in place — the dev `#/shell-lab` SidebarNav still reads it.
- **Coarse pointers** (`pointer: coarse`): permanently pinned, pin button not rendered. Static per session (pointer class doesn't change mid-session).

**Verification (throwaway, deleted after):** fresh default = pinned; unpin → rest (60px, hairline dividers, icon rows); pointer-over → intent-delayed peek (still rest at 80ms, peek at 200ms) with scrim + flow-width hold; leave → grace collapse (still open at 150ms, closed after 240); focus-in/out parity (confirmed with throttle-proof waits — the harness clamps background timers, which corrupted the fast probes); `[` toggles + persists both ways; pin survives reload; peek shadow/scrim classes per theme (Bold/Edn scrim computed correctly; the SHADOW's computed value lagged the stylesheet in the throttled window — inline declaration + rule-text locks are correct; **flag for Nick's real-browser pass**, along with true hover feel, the 280ms glide and touch emulation).

## Workspace top strip — TopCrumbStrip (crumb-only), 6 Jul

**Shipped:** `80cb661` component + integration → docs (this commit). Suite 603 → 610 (crumb table + link-target + exemption + token locks). Variant A per the pack; the ref's other variants are rejected alternatives, committed for context only.

**Notes:**
- ONE mount point (AppShell content column, above the stage) serves all six routes — `crumbForPath` returns null on the dashboard (exemption), focus/marketing routes, the guarded `/email-import-dev`, and unknowns. Rendering above the stage means the strip never scrolls and viewport-locked pages simply get 38px less stage (stage-relative heights, per the standing invariant — no bar-offset maths anywhere).
- The strip renders at ALL widths (the pack doesn't exempt mobile); it stacks under the mobile slim bar — flag if it reads as double chrome on small screens.
- Verified live (throwaway, deleted): all six crumb strings; dashboard shows no strip; `AGENTS` from Discover → `/agents`; `SCRIPTALLY` → `/dashboard`; Agents tab pills untouched beneath the strip; during an unpinned peek the rail overlays the strip's left edge (screenshot-confirmed — the frozen-transition probe artefact is documented, target geometry wrapper 60 / panel 240 is correct).

## Workspace chrome slab (Option A) + Agents tab-bar retirement, 6 Jul

**Shipped:** `8916547` ChromeSlab + Agents/Discover + tab-bar retired → `b6c23de` Manuscripts/Packages/Import → `5d5c485` Bold/Editorial tokens → docs (this commit). Suite 613 → 616.

**The Queries deviation (flagged, not silent):** the pack's commit 1 includes the Queries Hub flattening, but Queries.tsx carried a parallel stream's LIVE uncommitted WIP (EdgeFadeScroll threading, importing a then-untracked file) at build time — committing the file would have shipped their broken half-work. Per the multi-stream protocol the flattening is DEFERRED: `/queries` keeps the standalone TopCrumbStrip via a TEMP routeKey-gated AppShell mount. **Remaining when their WIP lands:** flatten the qhbar (title/meta/CTA onto a ChromeSlab, frame deleted, both empty+populated branches), remove the TEMP mount, delete TopCrumbStrip.tsx if then unused.

**Decisions:**
- Slab mounted BY EACH PAGE (tools are page state); padded desks bleed via negative margins in the `style` escape (agentsV2/discover/manuscripts CSS untouched — .ag-masthead styles are now dead selectors awaiting a cleanup commit).
- `ChromeSlab.onNavigate` optional with a direct-router fallback (crumb targets are never interceptions). Divergence: the fallback skips the bridge's searchQuery-clear — wire the bridge where pages hold it (Discover, Manuscripts do; AgentsTopBar deliberately doesn't to avoid touching Agents.tsx while it carried WIP).
- Agents: the landed "editorial masthead" (kicker/title/rule/count) became the slab composition inside the untouched-props AgentsTopBar — Agents.tsx itself never edited.
- Import: the centred "ScriptAlly migration desk" branding block judged decoration (a framed-title-card equivalent) and superseded; its descriptive sentence survives as an intro line. Sub-tab switcher untouched.
- Packages: slab renders on the zero-manuscript state too (crumb + title + Pro pill, no tools).
- Discover's explainer sentence stays as page content below the slab (body copy, not mono meta).

**Verification (throwaway, deleted):** visible-slab-per-route probes (hidden StagePage slots false-positive plain querySelector — probes are visibility-aware); crumbs correct on all five integrated routes; zero tab pills in the stage; dashboard exempt; /queries interim strip alive; theme probes — Capp/Bold surfaces + Editorial's separating shadow resolve live (Bold's computed border WIDTH read 1px vs the declared 1.5px in the throttled window — declaration rule-text-locked; eyeball on a real browser).

## ChromeSlab fix pack — geometry, wrapping, Discover, 6 Jul

**Items 1–3 shipped; item 4 (Queries Hub flattening) SKIPPED per Step 0** — Queries.tsx still carries the location stream's live WIP (EdgeFadeScroll threading; their fortnight-carousel commit landed mid-run but the tree stayed dirty on that file). The deferred-work entry from the slab build remains open.

- **Geometry:** only Discover was actually inset (its slab was mounted inside the centred 880px `.dv-wrap`) — now mounted at the content-column level as `.dv2`'s first child. Manuscripts/Packages/Import audited: already column-level. Note on the earlier probe scare: slab right edges sit at the stage's clientWidth (15px short of the viewport when a scrollbar is present) — that IS the content column; Packages only reached the viewport edge because it has no page scrollbar.
- **Wrapping:** slab header row hardened (title nowrap, META truncates with ellipsis, tools cluster nowrap with minWidth 0); Agents search pill is the flexible tool (flex 1 1 auto, floor 160px), Add agent + Add manuscript nowrap/flex-none. Verified single-line Add agent at 1180 AND 1280.
- **Discover alignment:** `.dv-wrap` → max-width 1240, margin 0 (left-aligned to the standard gutter, ragged right); banner/explainer/cards share the left edge. No card-internal changes.

## Queries Hub slab completion, 6 Jul — deferred entry CLOSED

The location stream landed its EdgeFadeScroll work (`9a246bb`) mid-run, clearing Queries.tsx; the flattening then landed clean with NO rider. Both branches (empty + populated) now render ChromeSlab (title · `Tracking {manuscript}` meta · Log a new query as the tool; frame + shadow deleted); the TEMP routeKey-gated crumb mount is removed and `TopCrumbStrip.tsx` is retired (artefact locks added: 2 slab mounts in Queries.tsx, zero qhbar, zero TopCrumbStrip references). `.t-capp .qhbar::after` in index.css is now a dead selector — left for a cleanup commit (the rule text is part of a locked convention note). Verified live: /queries empty state wears the slab full-bleed, exactly one crumb, CTA functional. 618/618 in isolation at the new HEAD.

## Pane heights — the desk rule (Agents + Queries), 6 Jul

**Shipped:** `a9435bd` desk rule on Agents → this commit (Queries floor + law docs). Suite 618 → 626 (clamp/provenance/artefact locks).

- **Schema flag for Nick:** the provenance footer's right side (verification status) is ABSENT — user agent documents carry no verification/verified-at field (`dateAdded` is rules-required and renders; query count derives live). Decide whether a verification field should exist before any footer extension.
- **Anatomy note:** the Agents pane's five always-present sections put its real content minimum ≈ 700px, so the 360px floor is a guard against stub records (the ref's no-floor failure case), not a height you see daily. Floor lives once: `READING_PANE_FLOOR_PX` ≡ `--ag-pane-floor`, artefact-locked.
- **Verified live** (throwaway, deleted): hug at a 928px cell (sparse 806, rich 744 — its timeline self-caps at the pre-existing 320px inner scroll), cap + internal scroll at a 628px cell, list fills + scrolls with the pinned `30 AGENTS · ↑↓ ⌘K` footer at both sizes, compact strips in place of the skeleton tiles, provenance rendering real fields (`Added 14 Mar 2026 · 14 queries`). Bold/Editorial footers + hug probed. Queries: list already furniture (verified, no drift); pane already hugged+capped — floor added with the shared constant.
- Seeding artefact noted during verification: the history timeline derives from ACTIVITY records (none seeded), so "clean slate" appeared beside a 14-query footer count — correct behaviour, mismatched fixture.

## Queries workspace — filled pane + command bar (queries: series), 6 Jul

**Shipped:** `d44298d` design ref → `1548b2d` workspace fill → `195df48` command bar → `3e2543e` theming → docs (this commit). Suite 626 → 640. Blast-radius file (`Queries.tsx`) touched in the smallest coherent diffs, one concern per commit; `Queries.tsx` was clean-of-WIP at start (the dirty tree was the location stream's disjoint dashboard diary-carousel — proceeded per the multi-stream protocol, isolated-worktree gates throughout).

**The desk-rule amendment:** documents hug, workspaces fill. Agents pane stays a document (hug/floor); the Queries pane becomes a workspace (fills to the viewport line). Recorded in CLAUDE.md as the law's second clause.

**One home for actions:** the top action toolbar (Record/Edit/Download) is deleted and the in-column yellow "your move" band lost its button (prose kept). Every query action now lives ONLY in the command bar. Artefact-locked (no `gridRow: 1` toolbar, no top Download, exactly one `markSentTriggerRef` and it's in the bar, `onMarkSent` handler gone from QueryTimeline).

**Ambient status computed once:** `lib/queryAmbient.ts` (`queryAmbientStatus` + `commandBarStatus`) is the single derivation of days-waiting / expected-reply / days-since-request; both the Tracking trailing block and the command-bar centre consume it, so they can't disagree. Whose-turn still comes from `getPrimaryAction` (passed in, never re-derived). `STAGE_RESPONSE_WINDOWS`/`DAY` moved here from QueryTimeline.

**Popover upward:** `useFixedMenu` gained an opt-in `{ placement: "up" }` (anchors the menu's bottom above the trigger, grows upward regardless of height). Additive — every other caller keeps the default downward. Verified live: from the bottom command bar the Mark-sent popover opens upward and stays on-screen (bottom 1013 above button top 1021).

**Decisions / flags:**
- **Agent band:** the pack said "presentation only, name ~24px" but the ref's flat band is *smaller* than the existing 33px status-tint hero. Treated "no content changes" as binding: kept the hero's content + functional add-pills + watermark, nudged the name 33→27 (a move toward the ref without stunting it beside the filled columns). A fuller reshape to the ref's flat band is available but was out of "presentation only" scope for a blast-radius file — Nick's call.
- **Column-content type "up a notch":** the finer per-column type tuning is best done by eye across themes; the structural fill + the name nudge landed in Phase 1, the rest is available as a follow-up taste pass (not blocking).
- **Column fade token:** the Phase-1 fade read `--pane` (blush in Bold) but the cards are `#fffefb` — fixed in Phase 3 with `--qp-col-bg` (#fffefb all themes) so no Bold seam.

**Verified live (throwaway, deleted):** State 1 (Rosa, waiting) and State 2 (Charles, partial requested) match the ref — pane fills, three full-height columns, composer pinned, command bar with the right primary/secondaries + ambient status per state, upward popover, Export in the list footer, no bar without a selection. Bold (ink rule) + Editorial (hairline + soft upward shadow) command bars eyeballed. Bold's 1.5px bar rule computes as 1px in getComputedStyle (harness rounding) — declaration rule-text-locked; worth Nick's real-browser glance along with the finer column type.

## Queries workspace — height-chain repair, 6 Jul

**Root cause:** when Phase 2 collapsed the desk grid to a single row (retiring the toolbar row), it removed `gridTemplateRows` entirely AND left the workspace pane's stale `gridRow: 2`. With no template rows, the grid auto-created two: the list (`gridColumn:1`) landed in auto-row 1 (content-height, ~208px) and the pane (`gridRow:2`) in row 2 — the two column panes ended up **diagonally stacked**, each hugging its content with dead desk in the other two quadrants (list top-left, pane bottom-right). This read exactly as the report: list hugs with desk below, pane "starts halfway" with dead desk above, tops unaligned. The flex chain ABOVE the grid (root → main → deskpad → grid, all `flex:1; min-height:0`) was correct; the break was solely the grid's row template.

**Fix (one commit):** `gridTemplateRows: "minmax(0, 1fr)"` on both `.queries-content-grid` occurrences (a single row that fills the grid height), pane `gridRow: 2 → 1` (and dropped its now-redundant `height:100%` — `align-self:stretch` fills the row), list pinned `gridRow: 1`. No viewport-relative heights anywhere: the stage bounds remain the only place the viewport is known. Verified in a real browser at **720 / 800 / 1000px** heights: both pane tops flush 14px beneath the slab, both bottoms on the viewport line, list fills with its pinned footer, workspace fills with the command bar pinned, page never scrolls — in all three themes.

**jsdom blind spot (recorded per the pack):** the vitest/jsdom suite PASSED this broken layout across the whole Queries workspace build. jsdom does not lay out — `getBoundingClientRect` returns zeros and CSS grid/flex sizing is not computed — so it cannot verify: flex `min-height:0` chains, `grid-template-rows`/auto-row placement, `align-self:stretch` fills, viewport-relative sizing, or "does the page scroll." **Layout/visual claims on this codebase require a real browser (the preview MCP / an actual Chromium), never the test harness.** The structural guards added here are source-artefact assertions (single-row template present, no stale `gridRow:2`, no `vh`/`margin-top:auto` in the pane subtree) — they catch the specific regression class but are NOT a substitute for a real-browser height check.

## Hub grammar — one token sheet, two papers, 6 Jul

Run: unify the Queries and Agents hubs onto a shared grammar + a single `--hub-*` token sheet (Route B — "structure identical, paper per purpose"). Ground rules honoured: **no deploys**, no `functions/` edits, no new deps, explicit-path commits, gate (tsc + build + full Vitest) before every commit. `Queries.tsx` and `Agents.tsx` are both blast-radius — one concern per commit; Phases 2 and 3 never interleaved edits to each other's page.

**Phase 1 — token sheet (`ee8d752`).** Added a ~40-property `--hub-*` block to each theme root (`.t-capp`/`.t-bold`/`.t-edn`) in index.css, values from Nick's tuner spec. Where the spec disagreed with the v3 design ref, **the spec won** — logged inline: Capp espresso `#422701`/taupe `#705e4c` (v3 caramel superseded), Bold reference band `#fbefef` (v3 blue-grey superseded) + **both panes white `#ffffff`** (supersedes the old Queries Bold `#ece2e0`), Editorial reference band `#f5f5f5` + primary `#dedede` + pale-blue row `#f5fbff` (v3 whites superseded). Migrated the Queries hub's named surfaces onto the sheet (desk/list/pane/col/band/command-bar/primary/monogram/row) via read-then-substitute — a structural no-op in Cappuccino, but Bold's white panes and Capp's espresso land visibly. Locks: `hubTokens.test.ts` (values, spec-wins, 40-token completeness, Queries-consumes).

**Phase 2 — Queries filter bar (`938156d`).** A floating bar under the slab: **STATUS** pills All/Waiting/Your move/Closed, **MANUSCRIPT** pills (All + one per manuscript with queries, only when >1), **Sort · Date sent** dropdown right. The STATUS pills map to the **CTA-engine buckets, not raw status** — `queryBucket(status)` added to `lib/queryAmbient.ts` as a pure function (kept out of Queries.tsx so tests don't pull firebase), mapping ball-holder → waiting/move/closed exactly as `getPrimaryAction` splits it. The Sort dropdown wires to `setSortKey` — and here recon found a real bug: the old list-header Sort control set `sortOption`, which `sortedList` **never read** (it reads `sortKey`, whose setter was never called) — so sorting was dead; the new bar is the first working sort. The list-header Sort/Filter icon-buttons + their dropdown menus retired (`filterMenuOpen`/`sortMenuOpen` deleted); list head is count-only. Verified live (Capp): All→2, Waiting→Rosa (Queried), Your move→Charles (Partial Requested), Closed→0, back-to-All→2, sort value + options correct, list header clean. Locks: `queryBucket.test.ts`.

**Phase 3 — Agents migration (`fcc97e0`).** The reading pane now **FILLS** (the desk-rule hug clause is retired) and gains a **command bar** pinned to its foot, mirroring Queries: left primary "Send query" + secondary "Edit profile" (both **retired from the control-row toolbar** — single-home rule, `.ag-chipacts` deleted), centre the provenance `ADDED {date} · {n} QUERIES` (mono uppercase, absorbing the old `ag-panefoot` footer via `paneProvenance`), right a **read-only** open-to-queries chip (the interactive availability flip stays the identity pill's locked job — no duplicate control). Reference-paper surfaces tokenised by aliasing the page-scoped `--ag-*` layer onto the sheet (`--ag-panebg: var(--hub-pane-reference)`, `--ag-bandflat: var(--hub-band-reference)`, `--ag-selbg: var(--hub-row-on)`, `--ag-av-bg/-ink: var(--hub-monogram*)`), so every consuming rule stays put; the segmented toggles adopt `--hub-toggle-on`. Verified live in all three themes: pane fills its grid cell exactly (Capp 688=688, Bold 686=686, Edn 688=688), command bar pinned to the pane base, Capp monograms espresso `#422701` + toggles taupe `#705e4c`, Bold panes white with the ink command-bar rule, Editorial `#fbfbfa` bar + grey monograms. Locks: `agentsHub.test.ts`; updated one pre-existing agentsPage lock (`ag-panefoot` → `ag-cmdbar`).

**Decisions / flags:**
- **Hug retired, floor kept:** `.ag-pane` moved from `align-self:start; min-height:floor` to `align-self:stretch; height:100%`. `READING_PANE_FLOOR_PX`/`clampPaneHeight`/`--ag-pane-floor` survive as the artefact-locked constant (Queries still imports it as a workspace guard; the coupling test stays green) but no longer drive the Agents pane height. `clampPaneHeight` is now vestigial (tested, not consumed) — a candidate for a later cleanup that also drops the stale Queries import, out of this phase's scope (would touch Queries.tsx during the Agents phase).
- **Open chip = display, not control:** the pack lists it as "the open-to-queries chip"; the Agents-v2 spec locks the identity open/closed **flip pill + kebab**. Rendered the bar chip as a read-only status mirror to honour both — one flip home (identity), one status readout (bar).
- **Capp de-pinking is hub-scoped:** documented as such in CLAUDE.md — the app-wide Cappuccino retoken is a separate future pass; judge the hubs in isolation.

**jsdom blind spot (again):** the pane-fills claims (688=688 etc.) are real-browser measurements via the preview MCP — jsdom returns zeros for `getBoundingClientRect` and does not compute grid/flex, so the artefact tests assert only source text (`.ag-pane` has `align-self:stretch`, `.ag-panewrap` `flex:1`, the command-bar classes exist). A real-browser eyeball of both hubs × three themes × sparse/rich is still Nick's to do.

## Grand masthead (hub grammar v2) — 6 Jul

Run: fold the grand masthead into both hubs (v2 supersedes the unrun v1 pack — but v1's substance was already built + deployed to dev, so this run is purely the masthead delta). Ref: `grand-masthead-fullpage-v1.html`. The token sheet needed NO reconciliation — v2's tuner spec matched the v1 index.css values verbatim across all three themes (confirmed by spot-check before building). Ground rules honoured: gates before every commit, explicit-path staging, no interleaving of Queries.tsx and Agents.tsx edits.

**Design ref (`308253b`).** Committed `design-refs/grand-masthead-fullpage-v1.html`.

**Phase 1 — masthead + Queries pulse (`aeec0f8`).** Added an opt-in `grand` variant to `ChromeSlab` (the crumb-render was extracted so both layouts share it): crumb → 54px Playfair title in `--hub-head` → mono pulse-line meta → CTA bottom-right. Masthead tokens `--hub-mast-title` (54px, stepping to 40px under `@media (max-height: 819px)`) + `--hub-mast-pad` live theme-independently in index.css. The Queries CTA moved off its hardcoded-pink raised pill onto `--hub-primary` (a shared `mastCtaStyle`), so it reads as one grammar with the command-bar primary. Pulse line = `queriesPulse(scopedQueries, scope)` in queryAmbient.ts — `m` ("awaiting your move") reuses `queryBucket === "move"`, never a fresh count, so it can't drift from the "Your move" filter pill; counts are over the manuscript-scoped set (not the status/search view). Both slab mounts (empty + populated) pass `grand` + `meta={hubPulse}`. Verified live (Capp): 54px black title, espresso CTA, pulse "Tracking all manuscripts · 2 queries · 1 awaiting your move" (Charles/Partial Requested = the 1 move); **step confirmed** — 54px at 860px viewport height, 40px at 720px. Locks: `mastheadHub.test.ts` + `queriesPulse` in `queryBucket.test.ts`.

**Phase 2 — Agents masthead + pulse (`cced4ad`).** `AgentsTopBar` gained `grand` + `idleCount`; when grand its meta becomes `agentsPulse(count, idle)`, its CTA becomes the hub primary (same `mastCtaStyle`), and its search pill fixes to 210px so it never squeezes the 54px title. `agentIdleCount(agents, queries)` (idle = unqueried) + `agentsPulse` are pure in agentsPage.ts. Verified live across all three themes: titles 54px in each theme's heading ink (Capp `#000`, Bold `#1d1712`, Editorial `#1a1a1a`); CTAs the hub primary (Capp espresso `#422701`/white r7, Bold pink `#f4c7c2`/ink r9, Editorial grey `#dedede`/black r8); pulse "Your database · 2 agents on file · 0 idle". Locks: `agentsHub.test.ts` + idle/pulse in `agentsPage.test.ts`.

**Decisions / flags:**
- **Search stays in the masthead tools** (ref relocates it into the list) — the ⌘K/`searchRef` wiring is load-bearing; fixed 210px when grand. Relocation is a follow-up.
- **Masthead scope = the two hubs only.** Manuscripts/Packages/Import keep the compact slab; masthead rollout there is a pending consistency decision (recorded in CLAUDE.md).
- **Probe gotcha (recorded):** the first `<button>` inside the grand slab is a CRUMB segment (crumb segments render as buttons), so a naive `querySelector('button')` reads a transparent crumb button, not the CTA — target the CTA by its text. Also: pages stay mounted, so `.sa-slab-grand` matches BOTH hubs' (hidden) slabs — scope browser probes to the visible page container (`.agv2 .sa-slab-grand`).
- **jsdom blind spot:** the 54→40 step is a viewport-height media query jsdom can't evaluate; the artefact test asserts the token + `@media (max-height: 819px)` rule text, and the real step was a browser resize check (860→54, 720→40).

Suite 680 green at close (was 665 pre-masthead; +9 Phase 1, +6 Phase 2).

## Content max-width caps (ultrawide) — 8 Jul

Run: stop workspace content stretching edge-to-edge on wide monitors — one shared wrapper in the AppShell content column, capped + centred, per-route variant. Ref `maxwidth-ultrawide-v1.html` was NOT supplied (absent from Downloads + design-refs), so built from the spec text (caps/gutter fully specified).

**Halt-then-proceed:** the working tree was dirty in the pack's files at open — `index.css` mid theme-editor retoken (2026-07-07) + `DiscoverNewAgents.tsx`/`discover.css` reworked (+176/+85), all uncommitted. Per the pack's halt rule + the no-touch-other-WIP protocol I stopped and surfaced it; Nick chose "I'll land it" then said build anyway without landing it. Resolved by working ONLY in clean/new files and routing around the dirty ones: cap tokens went to a NEW file (not the dirty index.css), and Discover's bespoke max-width removal was deferred (dirty file). No other stream's WIP was edited or staged.

**The build (`454d95b`):** a new `src/components/shell/contentColumn.css` (tokens `--content-max-work:1600` / `--content-max-read:1200` + `.sa-content-col` classes) + `StagePage` gaining `contentVariant?: "work"|"read"` — it paints `var(--desk)` on the full-width slot and centres the page in a capped column, with a `--fill` modifier that passes `height:100%` through so the viewport-locked hubs keep their internal scroll. App.tsx wires the four slots (queries/agents = work; manuscripts/import = read); the dashboard stays unwrapped. Manuscripts' bespoke `.msv-wrap { max-width:1150 }` folded into the read cap. FocusShell left as-is (already 860px, tighter than read).

**Why it's seamless:** recon found `--desk` ≡ `--hub-desk` in every theme (Capp #e8ddd0 · Bold #c2cfda · Editorial #f4f4f3), so the slot's `--desk` margins meet each page's own desk with no seam. Gutter reconciled (not doubled): every page already insets its content ≥ the spec's 16/24px via its own edge padding, so the wrapper adds no competing padding — keeping the ≤1440 render byte-identical.

**Verified in a real browser (jsdom can't lay out):**
- 2300px wide, Cappuccino: rail left 0 / w 240 (uncapped); Queries `work` col 1600, margins 223=223 (true-centre), desk #e8ddd0 in the margins; Agents `work` 1600 (.agv2 fills), margins 223=223; Manuscripts `read` 1200, margins 423=423. Bold: desk margins #c2cfda, 1600, 230=230.
- 1440px: nothing caps — Queries fills 1200, Manuscripts fills 1185, both 0 margins → looks unchanged, exactly the spec.
- Height locks intact: Queries workspace stage overflow 0 (no page scroll); Agents' 105px overflow is the pre-existing dark footer (a stage sibling shown on agents/manuscripts by design), NOT the cap.

**Deferred / flagged:** Discover's inner max-width still constrains it below the 1600 work cap until its WIP lands (then delete it). The two cap tokens live in contentColumn.css rather than index.css (dirty at build time) — fold into index.css when convenient. Suite 737 green (isolated-worktree gate from HEAD + only my files; the dirty theme/Discover WIP excluded from the gate).

## Full-bleed crumb + floating masthead (ultrawide amendment) — 8 Jul

Run: the amendment to the max-width caps — detach the crumb to full-bleed window chrome and demote the masthead to a floating card (ref `crumb-fullwidth-v1.html`, variant A).

**Halt → snapshot → build.** The amendment's core files (`ChromeSlab.tsx`, `App.tsx`, `Queries.tsx`, `index.css`) were dirty with another stream's ACTIVE crumb work — a `crumbBar` prop + `--crumb-bar-*` theme tokens (terracotta/blush/black, dated today) building the *opposite* structure (a tinted crumb bar INSIDE the capped slab). Unlike the caps, this couldn't be routed around — the amendment IS a restructure of those files. Flagged the collision; Nick chose "amendment supersedes it" and authorised parking the WIP. Committed the in-flight tracked WIP as one reversible snapshot (`06bb6ea`, verified buildable first) to clean the tree, then built the amendment as clean commits on top.

**The build (`24ffd97`):** new `CrumbStrip` (shell/) draws the crumb full-bleed — a translucent wash + hairline strip spanning the whole content column, rendered by `StagePage` OUTSIDE `.sa-content-col` (a flex-column slot: crumb `flex:none` above the `flex:1` capped column). `ChromeSlab` dropped its own crumb entirely and became a floating card — theme card treatment via `--bd`/`--bdw` + `--hub-radius` + a new per-theme `--mast-sh` (Capp soft / Bold `4px 4px 0` hard / Editorial soft), a 14px gap below, inset by the page's padding. The negative-margin bleed was removed from all 7 slab mounts (Queries ×2, Agents, Manuscripts, Packages — Discover/Import had none). `crumbBar` + `--crumb-bar-*` superseded (inert).

**Verified in a real browser (jsdom can't lay out), 2300px:**
- Crumb: `crumbOutsideCap` true, width 2060 (rail edge 240 → viewport edge 2300) — full-bleed on both grand (Queries) and compact (Manuscripts) pages.
- Card: width 1544, inset 28px within the 1600 cap; borders/shadows per theme — Capp #d8cebf/r6/soft, Bold #1d1712/r14/`4px 4px 0` hard, Editorial hairline/r10/soft.
- Stage overflow 0 (workspace still height-locked); caps + true-centre from the base pack intact.

Suite 742 green (isolated-worktree gate from the snapshot HEAD + only my files). Lock: `crumbStrip.test.ts`. **Reminder for whoever owns the parked WIP:** `06bb6ea` holds your theme-editor + crumb-bar + discover/comps changes — reconcile or `git reset` as needed; the `crumbBar`/`--crumb-bar-*` bits are now superseded by this amendment.
