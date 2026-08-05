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
