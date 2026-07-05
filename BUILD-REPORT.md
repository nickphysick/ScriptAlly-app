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
