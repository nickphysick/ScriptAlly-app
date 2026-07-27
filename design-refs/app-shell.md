# App shell v2 — design reference

Written against the **supplied** mockup `design-refs/scriptally-shell-v2.html` (Nick's file, copied into this directory with Phase 1 of the rollout) plus the rollout pack's baked decisions — **not** spec-derived. Where the two differ, the pack's table wins (noted inline).

## Surface tokens

One source pair, locked in step by `shellV2Tokens.test.ts`: CSS custom properties on `:root` in `index.css` (`--shell-*`) + JS twins in `designTokens.ts` (`shell*`). Named by role, never by colour.

| Role | Token | Value |
|---|---|---|
| Icon rail | `--shell-rail` | `#2e2622` *(pack table wins; mockup had `#2b2622`)* |
| Sidebar | `--shell-side` | `#f1ebe4` + paper grain (the canonical `PAGE_GRAIN`, inline — the Tailwind v4 CSS parser rejects data-URIs in .css) |
| Top bar | `--shell-topbar` | `#faf6f2` (=== canvas, by design) |
| Content canvas | `--shell-canvas` | `#faf6f2` |
| Card | `--shell-card` | `#fdfaf5` (=== parchment) |
| Line | `--shell-line` | `#e3d9cf` |
| Line, soft | `--shell-line-soft` | `#ece3da` |
| Sidebar right edge | `--shell-side-edge` | `rgba(124,58,42,.14)`, drawn 1px solid |
| Chrome ink | `--shell-ink` | `#2e2723` *(mockup-derived; the pack's table covers surfaces only)* |
| Chrome ink, soft | `--shell-ink-soft` | `#6a615a` |
| Chrome muted | `--shell-muted` | `#9c8878` |
| Recessed fill | `--shell-inset` | `#f2ede7` (save-state chip, hover washes) |

## Spacing scale (sidebar)

Panel width **288px** · rail **74px** · gutter **16** (`--shell-gutter`) · between groups **24** (`--shell-group`) · within a group **8** (`--shell-within`) · card padding **12** (`--shell-card-pad`).

## Rail

74px, icons **with** mono captions (7.5px, `.09em`, uppercase): Desk / Queries / Agents / Shelf + Setup pinned bottom. Active = the **tab tongue**: `margin-right:-8px`, `border-radius:10px 0 0 10px`, background = sidebar colour — rail and panel read as one folder. Nav model in `shellV2Nav.ts` (unit-locked): **To-do and Packages file under Querying** (product grammar, not URL shape); Comps and Import stay on the Shelf.

## Sidebar anatomy (top → bottom)

Masthead (ScriptAlly Playfair 22 · ink rule at 50% · mono kicker: section name + `weekOfQuerying` — the account-level derivation, never manuscript-scoped; tuck control on the top row, `sa.shellSideTucked`, ⌘\, rail-click untucks) → **Pages** nav → partition → manuscript **paper deck** (Playfair first-two-word initials tile; subtitle `16 queries · 11 active`, `shelved` wins; persists `scriptally_active_manuscript_id`) → **Tasks & reminders** ledger (counts by the To-do board's own selectors via `lib/shellSidebar.ts`; pips urgent `#eabfab` / housekeeping `#b7c5b4` / notes `#dccdbc`; **zero rows hidden**; all-zero → the quiet note) → **Actions** 2×2 white tiles (`#d9cec2` border, `2px 2px 0 rgba(46,39,35,.055)` shadow, burgundy icons; the existing capture contracts — no new forms; keyboard hints deliberately omitted until real bindings exist) → flexible spacer → **Pro line** ("Unlock your full query log", slate dot, chevron, hover ×; session dismiss; hidden for Pro) → **user block** (hairline top; 34px parchment avatar chip, `rgba(124,58,42,.25)` border, Playfair initials; task-settings + help icon buttons).

**Only three horizontal rules** exist in the panel: the masthead rule (ink, dominant), the partition (`line-soft`), the user-block rule (`line`). Section labels carry no trailing rule.

## The nav active-state law

**Parchment highlight only**: `background: var(--shell-canvas)` + `inset 0 0 0 1px var(--shell-line)`. **No burgundy tick, no burgundy fill, ever** (the repeatedly-reverted regression). Counts sit in small parchment pill chips.

## Top bar

56px, canvas-coloured, `line-soft` bottom border: breadcrumb (`Section / Page`, mono, current bold) · save-state chip (presentational until a pending-writes source exists) · spacer · the shared `NavSearch` (rail variant, 300px), focused by ⌘K (stands down on /todo, which owns its own registration).

## PageHeader — three variants, one component

`shell/PageHeader.tsx`. Title → optional description → **max two actions** (tuple-typed + runtime slice) bottom-right on the description's baseline → a `line-soft` rule closing the header. Everything below the rule is page content.

- **full** — content pages. 40px Playfair 500 title, description shown.
- **compact** — list/detail pages. 24px title inline with the actions, description omitted, tighter rule.
- **greeting** — dashboard only. Mono date kicker above the title, description omitted.

Secondary = parchment + hairline (`--shell-card`/`--shell-line`). **Primary = the Form 11 soft-pink button** (`--pink`/`--pink-b`, burgundy label). There is no dark-pill CTA anywhere in the app.

## Rollout map — as landed

| Page | Header | State |
|---|---|---|
| Dashboard | Greeting | ✅ (chip + focus-slot mechanics untouched below the rule) |
| Queries Hub | Compact | ✅ (record header carries the StatusDot badge + contextual primary) |
| To-do | Full | ⛔ skipped — the header is the live session apparatus; Nick decides |
| Packages | Full | ✅ (manuscript selector in a row below the rule, pending sidebar live-wiring) |
| Manuscripts | Full | ✅ |
| Contact list | Compact | ✅ |
| Help centre | Full, zero-action | ✅ (browser-check the empty right side) |
| Agents dashboard · Task settings · Brand Studio | — | no such pages exist |
| Onboarding | — | excluded (outside the shell) |
