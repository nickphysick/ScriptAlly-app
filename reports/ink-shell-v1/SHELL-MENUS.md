# Ink shell v1 — follow-up 2: bar menus, search, your menu and Settings (7 Oct)

Same worktree (`../ScriptAlly-ink`). Reference `design-refs/shell/shell-menus-settings-v1.html`
(SHA256 `e7d448f7…c9e6`, matching the brief; enrolled in `.refhashes.json`). **Nothing is pushed.**
Deployed to **dev** on request from a clean checkout of `43f6722b` (served bundle `index-CwK75_Rk.js`
confirmed against the build). Prod is Nick's.

Commits: `ae381f4f` (menus + search) · `a569d30c` (Settings + two phone regressions) · `43f6722b`
(the locks MS1–MS15 and the two faults they found) · this report.

## False premises (first)

1. **The arrow already opened the capture menu — the menu was clipped to nothing.** `.ws-appctl` (the
   bar slot the ink pass put "Log a query" in) is `overflow: hidden` so it can fold away in settings
   mode; the menu hangs below the button and was cut off at its foot. A click on the arrow therefore
   looked dead. The fix is the overflow, not the handler.
2. **"Help opens under Log a query" is not what this build did** — it opened under "?", right-aligned.
   Its text, though, was cream on a white menu, exactly as the brief says (measured: the help rows'
   computed colour was `rgba(244,238,229,.66)` on `#ffffff`).
3. **The brief's own secondary inks fail its 4.5:1 rule.** Measured from rendered pixels (text clipped to
   its own box): ink **58%** on paper is **4.46:1** (search descriptions, Sign out); ink **42%** is
   **2.71:1** (every eyebrow, the disabled row). MS3 holds every chooseable row and every search title to
   4.5 (all pass, the lowest at ink 100%); the secondary readings are recorded in
   `menus/ms3-secondary.json` and **the brief's values ship unchanged** — raising them is Nick's call
   (58% → 60% is the smallest step that passes, 4.67:1).
4. **"232px = the sidebar's inner column" is false.** The column is **220** (the sidebar pads 14).
   Your menu is the brief's 232, left edge on the inner edge, so it runs 12px past the column and stays
   2px inside the 248 sidebar.
5. **There was no lilac token.** The "lilac" tile is `--slate-tint` (`#eef2f7`) on the Pro plan; Free was
   pink. Both retire from the desktop menu; MS11 asserts the slate tint is absent.
6. **None of the five menus exists below 768px** — the bar and the sidebar are desktop chrome, and the
   phone bar's account button is in the DOM but not visible. MS15 therefore holds the *pages* at 390
   against `main` (Settings ×4 and the Query Centre).
7. **The selector's manuscript rows are not 36px rows** — each carries a cover, title, meta and facts.
   They keep their content; the menu's action rows (Open this manuscript, Add a manuscript), eyebrows,
   divider and surface take the language. MS5 asserts the language's rows.

## Step 0

- ✓ Fix-ups committed and green: Vitest 530 files / 8,368, tsc, `build:dev`, `inkShell.measure.ts` +
  HC locks (27 passed).
- ✓ Reference hash matches.
- ✓ `document.fonts` (loaded): JetBrains Mono, Playfair Display, Source Sans 3, **Source Serif 4**,
  **Special Elite**.
- **What the arrow opened:** the capture menu (`.ws-capm.is-open`), invisible (clipped). **What "?"
  opened:** a two-row Help menu on pages with a page guide, `/help` directly everywhere else.

### Census (computed font-family before this pass)

| Surface | File · component | Font before |
|---|---|---|
| Search | `shell/SearchPalette.tsx`, `searchPalette.css` | Source Sans 3 |
| Arrow menu | `shell/SidebarCapture.tsx` (`.ws-capm`) | Source Serif 4 |
| Help menu | `shell/WorkspaceShell.tsx` (`.ws-helpmenu`) | Source Sans 3, cream text |
| Your menu | `shell/AccountMenu.tsx`, `accountMenu.css` | Source Sans 3 (inherited) |
| Selector menu | `shell/BarSwitcher.tsx` (`.ws-ms-menu--port`) | Source Sans 3 |
| "+N" menu | `shell/FolderTab.tsx` (`.ws-ftmenu`) | Source Serif 4 |
| Settings page | `AccountSettings.tsx`, `settings/SettingsCards.tsx`, `settingsCards.css` | Playfair (h1/h2, forced by brand.tsx) + Source Sans |
| Settings shell | `settings/SettingsRail.tsx`, `settingsRail.css` | Playfair heading, sans "Back to app" |

### Shortcut audit

| Keycap shown | Where | Bound? |
|---|---|---|
| ⌘L | search · Log a query (`searchPalette.ts`) | **No** — no registry entry, no listener. Removed. |
| ⌘R | search · Record a response | **No** (and the browser's reload). Removed. |
| ⌘↵ | search · "Log a query to …" | **No** — Enter opens the selected row; nothing reads ⌘↵. Removed. |
| ⌘K / Ctrl K | the bar's field, the search footer | Yes — `usePalette.tsx` (`SHORTCUTS.search`) |
| ↑ ↓ ↵ ESC | the search footer | Yes — the palette's own key handler |
| ? | Help menu · Keyboard shortcuts | Yes — `ShortcutsSheet.tsx` (`SHORTCUTS.shortcuts`) |
| M | the selector's hint line | Yes — `BarSwitcher.tsx` (`SHORTCUTS.switchManuscript`) |

No binding was added.

## What was built

- **One menu language** (`shell/shellMenus.css`, desktop only) worn by all five menus: paper, 36px serif
  rows, the terracotta wash + 2px edge on hover/focus, mono keycaps, the 1px divider, muted and disabled
  rows. Keyboard: arrows/Home/End move through chooseable rows (`lib/menuKeys.ts`), Esc returns focus to
  the control.
- **The arrow's capture menu** — Record a response · Add an agent · divider · Add a manuscript (SOON); 8px
  below, right edges together, max-content ≥ 220, the arrow half lit while open.
- **Add a manuscript is SOON** in the capture menu, the selector's menu and search: `aria-disabled`, the
  SOON tag, no navigation, never an arrow-key stop.
- **"?" always opens Help** — Help centre · Show the page guide (only where the page has one) · Keyboard
  shortcuts (`?`, the existing sheet via its event).
- **Your menu** (`shell/InkAccountMenu.tsx` + `accountMenuInk.css`) — head, ink plan tile, Settings · Task
  settings · Help centre · divider · Sign out (muted); above the foot, the foot row lit.
- **Search** (`searchInk.css`, desktop) — 660 wide, centred on the sheet, 10 below the bar, the window
  dimmed, an ink input band, the eyebrows renamed, sidebar icons on Go-to rows, one-line rows, status
  pills, the ↵ keycap on the selected row, the footer.
- **Settings shell** — ACCOUNT · Settings in the tab; the ghost "Back to app" in the bar (once); the
  sidebar's logo row, SETTINGS eyebrow, section rows, plan tile and foot (no gear). The rail now mounts
  *inside* the sidebar column instead of over the whole panel.
- **Settings content** (`settings/settingsInk.css`, desktop) — the ledger layout, the cards, rows, inputs,
  toggles, pills and the segmented theme picker.

## Faults found and fixed along the way

1. **Search never focused its input when opened from the bar** (pre-existing): the palette was still
   `visibility: hidden` when `focus()` ran, so typing went to the page — "marsh" opened the selector (M).
2. **The fix-ups' header card applied on the phone** and ran the Query Centre's title off the card at 390
   (already on dev from the fix-ups deploy; fixed in this deploy). The card is desktop-only now.
3. **The selector's portalled menu made every phone page 490px taller than `main`** (ink pass) — it sat
   hidden at the foot of `<body>`. It is `position: fixed` at every width.
4. **MS1**: the arrow's lit state lost to its hover rule while the pointer rested on it.
5. **MS4**: search pre-selected the SOON row when it was the only result.

## Deviations, deliberate

- The dim covers the **whole window** as the brief says (the reference dims only the main column).
- Query rows in search print the **agent** with the status as a pill; the reference's "manuscript → agent"
  title needs data the row does not carry in that shape (the manuscript stays in the description).
- A Free plan's tile link reads **"Upgrade"** (to /plans) — there is nothing to "Manage" on Free.
- Search's new labels (placeholder, eyebrows, "Query Centre", SOON) and the SOON *behaviour* apply on the
  phone too: they are product rules, not chrome. The ink *presentation* is desktop only.

## Every "Add a manuscript"

| Where | Done |
|---|---|
| `shell/SidebarCapture.tsx:57` (capture menu) | SOON |
| `shell/BarSwitcher.tsx:296` (selector menu footer) | SOON |
| `lib/searchPalette.ts` (search action) | SOON |
| `shell/BarSwitcher.tsx:198` (the zero-manuscript tile) | **kept** — a writer with no manuscript must make one |
| `shell/ShellSidebar.tsx:128, :150` (phone scope sheet) | reported — mobile chrome, untouched |
| `DiscoverNewAgents.tsx:436, :449` | reported — page internals |
| `manuscripts/ManuscriptAlsoRows.tsx:65`, `ManuscriptsEmpty.tsx:75/81`, `ComparableTitlesPage.tsx:350`, `manuscripts/v12/ManuscriptPage.tsx:157`, `AllManuscripts.tsx:426/490/551` | reported — Manuscripts files, untouched |

## Every user-visible "Queries Hub"

| Where | Done |
|---|---|
| `lib/searchPalette.ts` (search Go-to row) | → "Query Centre" |
| `shell/shellV2Nav.ts:48` (the phone bar's page name — visible at 390) | reported — mobile chrome |
| `lib/packageAnalytics.ts:224` ("Open in Queries Hub") | reported — page internals |
| `lib/topNav.ts:58` (the top-nav shell's menu) | reported — a shell not mounted on any workspace route |

## Settings sections with no description yet (for Nick to write)

Email · Your plan · What each plan includes · Workspace · Your to-do list · What appears on your list ·
How long we keep it · Signing out · Delete your account. ("Ways to sign in" and "Take a copy of your
data" keep their existing blurbs as their descriptions; You, Details, About your querying and News from
QueryHawk use the reference's text.)

## Locks — red first

`tests/e2e/shellMenus.measure.ts`, MS1–MS14 at 1280/1440/1710 (MS3/4/8/9/10/14 at 1440), MS15 at 390
against references captured from `main` in the same run session (refused past 12 hours). **Final run:
15/15 green.** Each proved red by its named mutation (`tests/e2e/msMutations.sh`, appended to
`mutation-proofs.jsonl`):

| Lock | Mutation | Verdict |
|---|---|---|
| MS1 | swap the arrow's and "?"'s handlers | red — the arrow opened Help |
| MS2 | swap them the other way | red — "?" opened the capture menu |
| MS3 | menu text set to cream | red — 1.14:1 |
| MS4 | re-enable the rows | red — aria-disabled |
| MS5 | rows in Arial | red |
| MS6 | menus offset 20px | red — top 78 vs 58 |
| MS7 | search centred on the window | red — centre 640 vs the sheet's 760 |
| MS8 | "Queries Hub" restored | red |
| MS9 | the grid icon on every Go-to row | red — "Dashboard" |
| MS10 | a ⌘J keycap | red |
| MS11 | the lilac restored | red — the plan tile |
| MS12 | the sidebar's Back link restored | red — two Back to app |
| MS13 | content centred | red — 132 from the sheet |
| MS14 | toggle-on track green | red |
| MS15 | the desktop layout below 768px | red — /account/profile differs from main |

⚠️ **MS3's first instrument was wrong and is recorded so it is not repeated:** an element screenshot
read 16:1 for a 42% eyebrow (the menu's rounded corner let the dark page into the box) and 7.8:1 for the
muted Sign out (the icon's overlapping semi-transparent strokes composite darker than their ink). It now
clips to the text's own Range; the cream mutation still reds it.

## Screenshots

`menus/before/` and `menus/after/` at 1440 — `1-search`, `2-search-typed` (marsh), `2-help`,
`2-your-menu`, `5-arrow`, `x-selector`, `3-settings-profile`, `4-settings-notifications`, and
`3-settings-profile-1280`. The reference's five sections rendered: `menus/ref/section-1…5.png`.

## Cleanup

The comparison worktree `../ScriptAlly-inkmain` and its 4612 preview are removed with this commit's
follow-up; the 4611 preview of this worktree is left running for review.
