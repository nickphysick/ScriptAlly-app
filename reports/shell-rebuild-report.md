# Shell rebuild — workspace double-decker + aligned top-nav

Run report. Worktree `/Users/nickphysick/ScriptAlly-il`, branch `claude-il`. Six commits, no
branches, no PRs, no deploys.

---

## 1. Recon findings and baseline state

### Gates

| Gate | Result |
|---|---|
| `git status` in the worktree | **PASS** — no modified tracked files. Untracked: `node_modules`, `reports/onboarding-recon.md` (another stream's) |
| Baseline `tsc` | **PASS** — clean |
| Baseline Vitest | **PASS** — 2288 passed, 2 skipped, 145 files |
| Both design refs present | **🔴 FAILED at first run** — see below |

### The design-ref gate, and how it was cleared

`design-refs/shell-workspace-doubledecker.html` and `design-refs/shell-topnav-mega.html` did not
exist in either tree. Both mockups existed **uncommitted in `~/Downloads/`** under their working
names, stamped the same day:

- `scriptally-doubledecker-subnav.html` → *"Double-decker shell · sub-nav"*
- `scriptally-topnav-aligned.html` → *"Aligned top-nav shell (dashboard)"*

They were verified as the intended pair against the pack's own baked decisions before being
committed — rail `52px` / panel `216px`, the gradient
`linear-gradient(90deg,#2e2723 0 52px,#fbf9f5 52px)`, `rail-on` at `rgba(255,255,255,.12)`, the
thread line at `calc(railw + 16px)`, the mega's `offsetHeight+2` maths, spring
`cubic-bezier(.33,1,.5,1)` with 100ms intent and 160ms grace. All present and matching. Copied
byte-identical to the cited paths and committed as `cb9d680`; the gate was then re-run and passed.

### The material finding: an earlier pack had already built much of this

`claude-il` was **9 unpushed commits ahead of `origin/main`**, all shell work, including
`0b57443` *"one expanding column replaces rail and panel"* — **the very shell Baked 1
supersedes**. Also already present: a top-nav with mega-menus (`572b91d`), the route→shell map
(`07907a4`), and a **working command palette** with a pure core and its own locks.

Consequences for the plan, all as the pack allowed for:

- Phase 2 built `WorkspaceShell` fresh rather than reworking `ShellColumn` (whose geometry is
  built on the single-column model — retrofitting the rail-as-paint rule onto it would have
  fought T3 the whole way).
- Phase 4 was a **rebuild**, not a build: the existing top-nav drew a separate panel per menu
  and opened on click only.
- Phase 5 **wired** the palette rather than building one, per the pack's own conditional.

### Routing reality — the pack's recon item 5 was stale

**`Nav.tsx` does not exist.** It was deleted in an earlier hygiene sweep (`7836bd5`), so there is
no `activeTab` switch driving chrome. Routing is `react-router` `BrowserRouter` with a
`pathFor(tab, sub)` bridge in `App.tsx`, and shell selection is `shellForRoute(path, isDev)`.

### Learn

**No `Learn` route exists anywhere in the app** — zero references. Per Baked 14 it is omitted from
both shells. Noted: `lib/topNav.ts` had independently reached and documented the same conclusion
before this pack ran.

---

## 2. Per-phase summary

| Phase | Commit | What landed |
|---|---|---|
| 0 | `cb9d680` | Both mockups committed byte-identical under the cited paths; recon gate re-run and cleared |
| 1 | `eac9653` | `MenuCard`, `AvatarChip`, `SearchPill`, `HelpButton`, count chip + the token palette |
| 2 | `811bad2` | `WorkspaceShell` — painted single column, accordion, collapse, flyouts, bar |
| 3 | `c57a978` | IA, the `?status=` filter, the AppShell swap, `ShellColumn` deleted |
| 4 | `00bc17f` | Top-nav rebuilt as one morphing mega surface |
| 5 | `3843628` | One palette for both shells; Baked 20's ranking and grouping |
| 6 | *(this report)* | QA + report |

**Gates green on every commit** — `tsc` clean, `vite build` clean, full Vitest green, with
`set -o pipefail`. Suite **2288 → 2408 passed**, 2 skipped, 145 → 147 files.

### Files deleted in Phase 3, against the supersession decision

| File | Superseded by |
|---|---|
| `src/components/shell/ShellColumn.tsx` | `WorkspaceShell.tsx` |
| `src/components/shell/shellColumn.css` | `workspaceShell.css` |
| `src/components/shell/shellColumn.test.tsx` | `workspaceShell.test.tsx` |
| `src/lib/shellColumn.ts` | `lib/workspaceShell.ts` |
| `src/lib/shellColumn.test.ts` | `lib/workspaceShell.test.ts` |

No lock was deleted with them. Every assertion was repointed at `WorkspaceShell` or **rewritten**
where the rule itself changed, so the record of what was decided outlives the code that
implemented it.

---

## 3. The TOKENS block — measured

**Measured in the browser**, at `http://localhost:3111/`, by reading `getComputedStyle` off the
document root. These are live computed values, not stylesheet source.

| Token | Spec | Measured |
|---|---|---|
| ink | `#2e2723` | `#2e2723` ✓ |
| ink-soft | `#6a615a` | `#6a615a` ✓ |
| muted | `#9c8878` | `#9c8878` ✓ |
| burgundy | `#7c3a2a` | `#7c3a2a` ✓ |
| parchment | `#f2ede7` | `#f2ede7` ✓ |
| chrome | `#fbf9f5` | `#fbf9f5` ✓ |
| line | `#ece7de` | `#ece7de` ✓ (as `--shell-hair`) |
| edge | `#e6e0d5` | `#e6e0d5` ✓ |
| mega seam | `#ddd2c2` | `#ddd2c2` ✓ |
| rail-text | `#a89a8a` | `#a89a8a` ✓ |
| rail-active-text | `#f4efe7` | `#f4efe7` ✓ |
| avatar bg | `#f5e3da` | `#f5e3da` ✓ |
| avatar border | `rgba(124,58,42,.25)` | `rgba(124, 58, 42, 0.25)` ✓ |
| page (top-nav ground) | `#f7eee7` | `#f7eee7` ✓ |
| desk sage gradient | `160deg #b4c2b6→#a8b8aa` | `linear-gradient(160deg, #b4c2b6, #a8b8aa)` ✓ |
| head | `66px` | `66px` ✓ |
| pitch | `42px` | `42px` ✓ |
| railw | `52px` | `52px` ✓ |
| panelw | `216px` | `216px` ✓ |
| shell gap | `14px` | `14px` ✓ |
| capsule radius | `18px` | `18px` ✓ |
| spring | `cubic-bezier(.33,1,.5,1)` | `cubic-bezier(0.33, 1, 0.5, 1)` ✓ |
| intent | `100ms` | `100ms` ✓ |
| grace | `160ms` | `160ms` ✓ |
| rollout | `320ms` | `320ms` ✓ |
| pane slide | `28px` | `28px` ✓ |

Fonts (Playfair Display / Inter / JetBrains Mono) are the app's existing families and were not
changed by this pack.

### Browser-verify pending — everything the shells actually render

**No shell geometry is reported here, because none of it could be measured.** Both shells are
behind the auth gate: navigating to `/queries` on the dev server redirects to sign-in, and
signing in is not something this session can or should do. What *was* verified in the browser:
the app boots, both routes resolve, and **the console is clean of errors on `/` and `/queries`**
with all six commits in the bundle.

Pending a signed-in pass:

1. **Workspace shell:** rail 52px / panel 216px in flow; the collapse to 52px and that **icons do
   not move** across it; the accordion's `0fr→1fr` morph; the thread line's x against the parent
   label; the flyout's `offsetTop` anchoring; tooltip composition and the 250ms delay.
2. **The `?status=` children** actually filtering the hub, and the "Needs attention" count
   matching the list it opens.
3. **Top-nav:** the height morph between sections; the directional crossfade; hover intent and
   grace at the boundary; **T1 — that the seam is visible with a panel open**; the scrim.
4. **The palette** on `/dashboard` — that ⌘K and the pill now open it at all (this is the gap
   Phase 5 closed and the single most valuable check).
5. **≥768px vs <768px** — that the new chrome appears above the breakpoint and the untouched
   mobile bar below it.
6. **Reduced motion** on a real device.

Per T5, none of the above is asserted as working: `vitest.config.ts` is `environment: 'node'`,
with no jsdom and no testing-library, so no test in this repo can evaluate layout.

---

## 4. Trap checklist

| # | Trap | How it was handled |
|---|---|---|
| **T1** | Seam rule — absolutely-positioned children paint over the parent's borders | The seam is the **mega wrap's own `border-top: 1px solid var(--shell-seam)`**. The bar's `border-bottom` is the *scroll* hairline only and is set `transparent` while open, via a `.megaopen` class. Locked in `topNav.test.tsx` — both halves, plus the class that does it. |
| **T2** | Height morph cannot be CSS `auto` | The wrap's height is **JS-measured**: `paneRefs.current[open].offsetHeight + 2`, set as an inline style. The `+2` is the wrap's own two borders under `border-box`. The stylesheet supplies only the transition. Locked, including an explicit assertion that `height: auto` never appears on `.tn-megawrap`. |
| **T3** | Icon drift if the rail becomes its own container | **The rail is paint.** One column; the ink band is a hard-stopped background gradient; every row spans both surfaces with a fixed 52px `.ws-ci` cell. Collapse changes exactly one width. Locked four ways: the gradient, the summed width, the single collapse rule, and **that no `.ws-rail` selector exists**. |
| **T4** | Tailwind overriding inline-critical colour | No Tailwind utility carries a colour or border in any file this pack wrote. Colour and border come from `primitives.css` / `workspaceShell.css` / `topNav.css` via `--shell-*` tokens — the house pattern, and the same one `accountMenu.css` and `topNav.css` already used. |
| **T5** | jsdom cannot verify flex chains or viewport sizing | Nothing layout-dependent is claimed. Every stylesheet assertion is a **rule-text lock**, and §3 lists the browser-pending set explicitly rather than reporting CSS source as measurement. (Stronger than the trap states: this repo has no jsdom at all.) |
| **T6** | Staggered fades killed by `display:none` | The panel side fades on **opacity + visibility** (`.ws-fade`), never `display`. Locked, including an explicit `not.toContain("display: none")`. |

### Two locks that were wrong before they were right

Both are recorded because each was a *test* bug of a kind the house has been bitten by:

1. **The "no sibling rail" guard failed on its own comment.** `expect(css).not.toMatch(/\.ws-rail\s*\{/)` matched the comment warning against building one. Absence is now asserted against a
   comment-stripped copy — a `not.toContain` over a file that includes its own commentary passes
   and fails for reasons unrelated to the stylesheet.
2. **The single-manuscript guard failed on the user row.** A whole-document
   `not.toContain('aria-haspopup="menu"')` caught the account row's legitimate one. It is scoped
   to the selector row now, with the anchor asserted first.

---

## 5. Deviations

The pack expected none. There are five, each forced by what exists rather than chosen.

1. **`Learn` is absent from both shells.** No route exists. Baked 14 provides for exactly this.
2. **`Documents` is absent, and Materials is therefore CHILDLESS.** No route exists, and the same
   Learn rule was applied on your instruction. A one-child accordion reads as broken — the
   chevron promises a choice the section cannot offer. `TODO(documents-route)`: when a documents
   library is built, Materials gains children and becomes an accordion. The Materials mega drops
   *Documents* and *Upload a document* and keeps *Build a package*; the editorial panel copy is
   unchanged.
3. **Pricing is out of scope.** `/pricing` is a public marketing route outside `shellForRoute`
   entirely; the top-nav shell covers Dashboard only in this pack, per your call.
4. **The brand is TYPE, not the artwork, in both shells** — a Playfair "S" beside a Playfair
   wordmark, per Baked 15 and the workspace mockup's own head row. This **retires the 68.4%-ink
   problem rather than solving it**: the PNG's letterforms span 513px of its 750px, so `heightPx`
   never meant apparent size. A text lockup has no dead margin to compensate for. The asset is
   not cropped — it is simply not used by the shells.
5. **The new chrome is ≥768px only.** Both mockups are desktop-only and Mobile Pass 1 is live and
   locked. Below 768px the column and the new bar are hidden, the desk goes flush and square, and
   the existing `ShellTopBar` keeps rendering as the phone's only bar. Building a phone treatment
   from mockups that do not contain one would have been designing, not implementing.

### Judgement calls recorded

- **"Needs attention" is the past-reply-window set**, not the writer's-turn set. The mockups
  settle it: the work area beneath that child reads *"3 queries have passed their nudge
  threshold"*, and the top-nav panel says *"Three queries are past their reply window"* — one
  figure, quoted in both shells. `isOverdueForReply` moved out of `Queries.tsx` into
  `lib/queriesFilterParam` so the filter, the nav count and the mega panel share **one**
  derivation. The writer's-turn split (`queryBucket === "move"`) stays with the hub's own "Your
  move" control.
- **The `?status=` param is a build, not a wiring.** `Queries.tsx` read no search params at all.
  It maps onto filter state the hub already models and never becomes a fifth pipeline. An unknown
  value falls back to `all` — a stale bookmark that filtered to nothing would read as *"you have
  no queries"*.
- **The rail-and-menus lock was rewritten to assert the RULE, not identical membership.** The two
  surfaces no longer carry the same list (the workspace IA does not place `/import`; the mega
  menus still offer it). Demanding sameness would force one of them to misreport the pack. Both
  are now proved to point only at routes that exist, by walking every path against the router.
- **`--head` 72px → 66px**, superseding a live value both the old top-nav and `ShellColumn` read.
  It is in the TOKENS block and is the one number the two bars must agree on.
- **The content ground went white** (`#ffffff`), per both mockups' `--work`. Still painted once,
  on the stage.
- **The hero greeting went to ink** from `--hdr` (mocha `#5d4037` in Cappuccino). Section titles
  elsewhere keep `--hdr` — this is a rule about the greeting, not about headings.

### One feature was removed

**Session recents in the palette are gone**, with `pushRecent` and `RECENT_COUNT`. Baked 20
specifies the empty state exactly — three actions and four pages — and the `Recent` group was the
only place recents ever rendered. This is a working feature removed on the strength of one clause,
recorded here rather than quietly absorbed. It is a small revert if the empty state is ever
allowed a third block.

---

## 6. Open TODOs

- `TODO(documents-route)` — Materials becomes an accordion when a Documents page exists.
- **`/import`, `/manuscripts` and `/manuscripts/comps` have no workspace nav entry.** The pack's
  IA does not place them; they stay reachable by route, by the top-nav mega menus and by the
  palette. Inventing a home would have been designing rather than implementing.
- **Agents and Materials editorial panels.** Baked 19 asked only for the Queries panel to be
  live and permitted static copy for the other two. In fact **all three read derived figures** —
  `navPanels` was already wired that way by the earlier pack, every figure coming from a
  selector that already exists. There is no `TODO(live-signal)` to leave, and none was added.
- **Signed-in browser pass** — the six checks in §3.
- The dev server for this worktree is the existing `shell-il` launch entry (port 3111).

---

## 7. Rules observed

- Worked only in `/Users/nickphysick/ScriptAlly-il` on `claude-il`; the main tree was never
  touched. The `+475 −0` visible in the status bar at session start was `reports/app-audit.md`
  — an untracked report from a previous session, in the main tree, not written by this run.
- Every commit staged by explicit path and verified with `git diff --cached --name-only` before
  committing. **No `git add .`, no PaintMode code in `App.tsx`** (checked by grep on the staged
  diff at each commit that touched it).
- One commit per phase. No branches, no PRs, **no deploys**.
- UK spelling throughout UI copy and comments.
- Locked components untouched: `StatusDot`, `MountPanel`, `MountCard`, `HubHeaderBar`,
  `TypeGlyph`, `packageMetrics`. No `#/pkg-lab`, no `firestore.rules`.
- `QueryStatus` used only via the enum — `CLOSED_QUERY_STATUSES` is built from
  `QueryStatus.REJECTED / WITHDRAWN / NO_RESPONSE`.

---

# Amendment 1 (first revision) — full-screen workspace geometry + collapse grammar

> ⚠️ **PARTLY SUPERSEDED by the revised Amendment 1 below.** The full-screen geometry, the
> card-on-ground and the collapse grammar in this section all still stand. The **architecture**
> does not: the split-row/painted-rail model recorded here was replaced by a decoupled rail and
> panel, and with it T3 by T3b, the anti-echo rule, the panel width, and the brand's position.
> Kept as the record of what was decided and why.

Applied in one pass, one commit, on top of the six above. The design ref
`design-refs/shell-workspace-doubledecker.html` was **replaced in place** first (`8858254`): the
amendment states it had been recommitted, and it had not been — the updated mockup existed only
in `~/Downloads` as `scriptally-workspace-fullscreen.html`, the same sequencing miss as Phase 0.

## Supersession list

| # | Superseded | Deleted / replaced |
|---|---|---|
| A1 | **The sage desk and the capsule** | `.ws-desk` (sage gradient + 14px pad) and `.ws-cap` (radius + layered shadow) deleted from `workspaceShell.css`; `<div className="ws-desk"><div className="ws-cap">` replaced by a single `.ws-app` in `WorkspaceShell.tsx`. The AppShell root's inline `backgroundColor: var(--shell-desk)` **and its `PAGE_GRAIN` image** are gone — grain was texture for a field that no longer exists. `PAGE_GRAIN` is no longer imported there. |
| A2 | **The foot collapse row** | `.ws-crow` rule and the `ws-crow` button deleted. The foot now ends: hairline → user → Settings. |
| A3 | Shell inside a container | `.sv2-app.ws-host` keeps `padding: 0`; the shell is the leftmost column of the viewport. 52 + 216 arithmetic unchanged. |
| E (Baked 7) | **Collapsed click opened a flyout** | `SectionClick.flyout` removed from the type entirely and replaced by `expand`. No click path opens a flyout now. |
| E4 | The flyout's "Expand sidebar" foot action | Never built in this repo; locked against by name so it cannot arrive. |

**The sage desk is locked as rejected-for-workspace**, in the same pattern as the rejected ink
avatar hex: `workspaceShell.test.tsx` fails if `--shell-desk-grad` or `#b4c2b6` reappears in that
stylesheet, or if `ws-desk`/`ws-cap` reappear in the component. The token itself survives at
`:root` for anything else that wants a desk — it is rejected *here*, not deleted globally.

## New tokens, with locks

| Token | Value | Measured |
|---|---|---|
| `--shell-frame` | `14px` | **`14px`** ✓ |
| `--shell-card-radius` | `16px` | **`16px`** ✓ |

Both `--shell-*` prefixed per the Phase 1 convention, and both read back from `getComputedStyle`
on the running dev server. Locked in `workspaceShell.test.tsx` against `index.css`.

## The three expansion paths, as implemented

Amendment 1 (E) trades **Slack/Jira-style persistent collapse** (click navigates, sidebar stays
shut — collapse as a *setting*) for **Notion/Linear-style peek-and-restore** (collapse as a
temporary *focus mode*, which committed navigation ends). That is the product decision the
grammar below expresses, and it is why the flyout needs no foot action: "Expand sidebar" became
redundant the moment every click did it.

1. **Click anything in the sidebar → expands.** A childless row expands *and* navigates. A
   sectioned row expands, opens its accordion and lands on its default child — *unless* the child
   you are already on belongs to that section, in which case you stay put, because moving you
   would be the surprise rather than the service. The manuscript pill and Settings expand only.
2. **Flyout selection → commits fully.** Navigate to the child, close the flyout, expand the
   shell, and open that section's accordion, so the accordion appears where the flyout was. A
   peek that resolved into a still-collapsed rail would leave you where you started.
3. **Expand without navigating** — the `»` rail row beneath the brand when collapsed, and `[`.
   This is the only path that does not move you, which is precisely why it exists: under
   click-commits, nothing else can restore the shell without also taking you somewhere.

**Hover peeks, pointer only.** Collapsed, hovering a *sectioned* icon opens its flyout after
120ms of intent, with 160ms of grace to travel into it; sliding along the rail while one is open
switches instantly (mega-menu grammar). Childless icons show tooltips only. Touch devices have no
hover, so taps follow path 1 — **nothing is unreachable by touch**.

**`[` is suppressed while typing.** It is a character: a bare-key shortcut firing inside a field
eats the keystroke and reads as the app dropping input. Suppressed for `INPUT`/`TEXTAREA`/`SELECT`,
`contenteditable`, and while the palette is open — the palette being a text field wearing a dialog.

## Inline label icons and the anti-echo rule

Every top-level label now carries its icon inline (16px, `stroke-width:1.6`), inheriting the
label's colour at `.8` opacity and reaching `1` on hover and when active. Settings takes its gear;
the manuscript pill takes a book. **Children stay text-only** — the indent and thread line already
carry the hierarchy, and an icon on every child would compete with them.

That put the same glyph twice on one row, 60px apart. **The anti-echo rule** dims the rail's
copies to `rgba(168,154,138,.4)` (`.65` on hover) while expanded, so the icon reads as living
wherever the nav currently is, and restores them to full strength on collapse where they are all
there is. **The active section is excluded in both states** — that one is a position marker, not
an echo. It is a state-driven colour change on *one* icon set, never a second set.

## Traps

T1, T2, T4, T5, T6 are unchanged from the table above. **T3 gained a clause**: the rail's new
shadow is a **painted `::after` overlay** on the column at `left:52px`, `width:18px`,
`pointer-events:none` — *not* a `box-shadow`. A box-shadow needs an element to cast it, which
would mean giving the rail its own container, which is the exact refactor that reintroduces icon
drift. Locked, including that `.ws-shell` itself carries no `box-shadow`.

## Two more locks that were wrong before they were right

The same two failure modes as the first pass, and worth recording because they keep recurring:

1. **The "no Expand sidebar" guard caught its own tombstone** — the comment recording that the
   item was superseded. Absence in the component is now asserted against a comment-stripped copy
   of the source, as it already was for the stylesheet.
2. **The "children are text-only" guard swept in every later section row**, which legitimately
   carries an inline icon — it would have failed on the rule it was meant to protect. It now
   extracts the `ws-srow` buttons themselves and asserts the count first.

## Gates

`tsc` clean · `vite build` clean · **Vitest 2441 passed | 2 skipped (147 files)**, up from 2408.
Browser: the two new tokens measured live, and **no console errors** on `/` or `/queries`.

## Browser-verify pending — refreshed

Still auth-gated, so nothing below is claimed. **The two items the amendment names as
layout-engine work are top of the list:**

1. **The rail shadow overlay** — that the 18px gradient reads as the rail casting onto the panel
   ground, and does not band or clip at the seam.
2. **The card frame** — 14px of ground on top/right/bottom, 12px on the left, and that the
   asymmetry reads as even given the rail shadow occupying that edge.
3. The card's left edge following the shell's width transition on collapse, without a reflow jump.
4. The anti-echo dimming at both states, and that the active section really does stay full
   strength while its neighbours recede.
5. The three expansion paths end to end, and the 120/160ms peek at the rail-to-flyout boundary.
6. `[` from inside a field and with the palette open — the suppression is the interesting half.
7. Below 768px: the card should lose its frame and become the page, with mobile chrome untouched.

---

# Amendment 1 (revised) — decoupled rail + panel, brand in the crumb, dashboard in-shell

Applied in one pass, one commit. The design ref was replaced in place first (`0102937`) — for the
**third** time it had not been recommitted, and the newer revision was sitting in `~/Downloads`.

## Supersession list

| # | Superseded | Deleted / replaced |
|---|---|---|
| **B / T3** | **The split-row, painted-rail architecture** | `.ws-shell` (the shared gradient column), `.ws-row`/`.ws-ci`/`.ws-cl`/`.ws-ib`/`.ws-fade` and every rule keyed to them, deleted from `workspaceShell.css`. Replaced by `.ws-rail` + `.ws-panel` as siblings. **T3's gradient-and-spanning-rows locks are deleted, not weakened** — see T3b. |
| **B** | **The anti-echo dimming** (section C of the previous draft) | `rgba(168,154,138,.4)`/`.65` rules deleted; a lock now fails if either reappears. It existed only because the rail mirrored the panel's rows. |
| **B** | `--shell-panelw` 216 → **232** | Lock rewritten in `primitives.test.tsx`, and a second lock asserts 216 is *gone*. |
| **B** | The rail shadow as the shell's `::after` | Now the **panel's `::before`** — a shadow cast by the rail would need the rail to own it, and the rail must stay unconditionally static. |
| **B** | Manuscript icon on the rail | Gone. The rail starts at Dashboard; collapsed users switch book by expanding or via ⌘K. |
| **C** | The wordmark in the sidebar | Moved to the **head of the breadcrumb**, as the real asset. The rail's "S" tile is the only mark in the sidebar. |
| **G** | Dashboard (and Settings/Plans/Help) on the top-nav shell | `TOPNAV_SHELL_PATHS` is now **empty**; the branch is deleted from `App.tsx`. `TopNavShell`/`TopNavHost`/`TopNavPanelData` are **intact and unmounted**. |
| **H** | The four Queries filter children | Replaced by **Query Centre** + **Analytics**. No count under Queries; the rail badge is To-do's alone. |
| **H2** | "Queries Hub" as the page title | Renamed **Query Centre**, so nav, crumb and heading agree. |

## Why T3 became T3b — the failure it was defending against

T3 said the rail is background paint under rows that span both surfaces, and that kept the icons
aligned **by construction**. It also made the rail a *function of the panel*: an open accordion
punched a void through the icon column, and the anti-echo dimming turned what remained into a
broken strip.

**T3b retires the problem instead of defending against it.** The rail is its own element with its
own even rhythm, and nothing in it varies with `collapsed` except the `»` control. The active
square comes from the **route**, not from the collapse state, which is why it is not an exception.

## New / changed tokens, with locks

| Token | Value | Measured |
|---|---|---|
| `--shell-panelw` | `232px` *(was 216)* | **`232px`** ✓ |
| `--shell-railw` | `52px` | **`52px`** ✓ |
| `--shell-frame` | `14px` | **`14px`** ✓ |
| `--shell-card-radius` | `16px` | **`16px`** ✓ |
| `--shell-chrome` (page ground) | `#fbf9f5` | **`#fbf9f5`** ✓ |

## ⚠️ Item C — the logotype, and a number that had to be measured

The asset **exists**, so C did not halt: `/scriptally-title-v2.png`, rendered elsewhere by
`ScriptAllyLogo`. But the amendment asks for "**~16px cap-height**", and this asset is the one the
repo already has a warning about.

**Measured in the browser** by reading the PNG into a canvas and scanning for ink:

- Asset **2400 × 750**
- Full ink span **513px = 68.4%** of the height *(confirms the standing note)*
- **Cap-"S" spans y 190 → 577 = 388px = 51.7%**

So `heightPx` is **not** cap-height. A 16px cap needs a **31px element** — and setting `16` would
have rendered an **8px cap**, looking like the logo had simply been made too small, with nothing
to point at. `LOGOTYPE_PX = 31` is locked, with the derivation in the comment.

## The three expansion paths (unchanged in behaviour, re-anchored to the rail)

Amendment 1 (E) trades **Slack/Jira persistent-collapse** (click navigates, sidebar stays shut —
collapse as a *setting*) for **Notion/Linear peek-and-restore** (collapse as a temporary *focus
mode*, ended by committed navigation).

1. **Click anything in the sidebar → expands.** Childless also navigates; sectioned also opens its
   accordion and lands on the default child, unless the child you are on belongs to that section.
   The rail's Settings icon expands. **No click path opens a flyout.**
2. **Flyout selection → commits fully** — navigate, close, expand, open that accordion where the
   flyout was.
3. **Expand without navigating** — the `»` rail row above Settings, and `[`. The only path that
   does not move you, which is exactly why it exists.

**Hover peeks, pointer only**: 120ms intent, 160ms grace, instant switching along the rail;
childless icons tooltip only. Touch follows path 1, so nothing is unreachable.

**One rail-versus-panel difference worth naming:** the rail **never toggles a section shut**. It is
a set of destinations; an icon that sometimes navigated and sometimes closed what you were looking
at would be two controls wearing one glyph. The panel row keeps the toggle.

## G — dashboard in-shell, and what happened to the top-nav shell

With Dashboard on the top-nav shell, **every visit home swapped the entire chrome** — sidebar gone,
nav relocated, ground recoloured — a jarring loss of wayfinding on the most-visited page. It now
renders in the content card as a normal childless section; both the S tile and the rail's Dashboard
icon go there and the sidebar persists. The hero scales **66px → 40px** (container only — structure,
copy and components untouched). `TODO(dashboard-scope)`: the manuscript pill stays visible but
dashboard content remains cross-manuscript for v1.

**The top-nav shell is PARKED, not deleted.** `TopNavShell` (with its morphing mega surface),
`TopNavHost`, `TopNavPanelData` and `lib/topNav.ts` are all intact and unmounted, held for the
public marketing site where the mega nav becomes the logged-out header. `TOPNAV_SHELL_PATHS` is
kept as an empty set deliberately — deleting it would delete the seam it returns through.

## H — where the `?status=` param survives

Removed from the **sidebar**, kept everywhere else. It is still parsed in `App.tsx` beside `?q=`,
still passed to `Queries` as `statusFilter`, and still applied to the hub's own filter model by
`lib/queriesFilterParam`. That is what lets palette results and dashboard deep-links open the hub
pre-filtered. `attentionCount` and `isOverdueForReply` also survive — they drive the hub's filter
and the parked mega panel; only the *nav's* use of them is gone.

`TODO(analytics-page)` — `/queries/analytics` is a real route with an honest placeholder. It
**invents no figures**: a placeholder showing plausible numbers is worse than an empty one,
because it is read as data.

## Traps

T1, T2, T4, T5, T6 unchanged. **T3 → T3b**: the rail is static and never reflows; its contents are
identical between states bar the `»` control and the active square. Locked five ways — no
`.ws-rail.shut` rule, no transition on the rail, the rail is a real element (not a gradient stop),
the *panel* is what collapses, and the rail casts no shadow.

## Three more locks that were wrong before they were right

1. **The collapsed render is not reachable in this environment, and two attempts to fake it both
   failed *silently or loudly*.** Collapse reads `window.localStorage` behind a
   `typeof window === "undefined"` guard; this env is `node` with no window, so seeding
   `globalThis.localStorage` did nothing — **every "collapsed" render came back expanded, and the
   test was green while asserting the wrong state**. Defining a bare `globalThis.window` then broke
   every other render that branches on it. T3b is therefore asserted at **source**, precisely: the
   rail's JSX may read `collapsed` in exactly one render branch. The visual half is browser-pending.
2. **The test fixture still carried the old IA** (All queries / Needs attention), so three
   assertions failed for the right reason — the fixture, not the code. It now mirrors the shipped IA.
3. **Six locks in other files failed as a consequence** and were each rewritten rather than muted:
   the panel-width token, the top-nav tier, the `routeActive` expression (a sibling route now
   shares its `routeKey`), the hub's title, and the two brand locks.

## Gates

`tsc` clean · `vite build` clean · **Vitest 2447 passed | 2 skipped (147 files)**, up from 2441.
Browser: five tokens measured live, the logotype geometry measured from the asset itself, and **no
console errors**.

## Browser-verify pending — refreshed

The shells remain auth-gated. Nothing below is claimed; the two layout-engine items the amendment
names are first, as instructed.

1. **The rail shadow** — now the panel's `::before`. Check it reads as the rail casting onto the
   panel and does not band or clip at the seam.
2. **The card frame** — 14px top/right/bottom, 12px left, and whether the asymmetry reads as even.
3. **T3b in the flesh** — collapse and watch the rail: no icon should move by a pixel, and no gap
   should open where the accordion was.
4. **The panel collapsing to zero** — width + opacity together, with the contents sliding out
   rather than reflowing.
5. **The crumb logotype at 31px** — whether the measured ~16px cap actually sits right beside 13px
   crumb text, and baseline alignment.
6. The three expansion paths, the 120/160ms peek, and `[` suppression inside a field / with ⌘K open.
7. **The dashboard inside the card** — the 40px hero, and whether the stat cards breathe at the
   card's width.
8. Below 768px: card loses its frame, mobile chrome untouched.
