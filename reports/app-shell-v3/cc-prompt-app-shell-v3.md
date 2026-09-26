# CC prompt · App shell v3 (sidebar, top bar, page frame)

You're restyling QueryHawk's **app shell** (the sidebar, the top bar, and the page frame the content sits in) to an approved frozen mock. Every route uses the shell. UK spelling throughout.

The mock is the oracle. **Where this text and the rendered mock disagree, the mock wins: say so in your report.**

---

## 0 · Global rules (standing)

- **References.** Commit these to `design-refs/shell/` exactly as supplied, then verify the hashes before any other work. If a file is missing or a hash differs, **STOP and report**. Never substitute an older reference.

  | File | SHA256 |
  |---|---|
  | `app-shell-v3.html` | `98a30a87eb58f174920154054164ae70bf7d38a10a8f947ba45d460d1d707b60` |
  | `page-anatomy.md` | `81f0b507622b379d8522b8526837f4b7f1fbe2ccc52ff7583b794a47f854b558` |
  | `app-shell-v3-geometry.json` | `536f9d263b75acb2f8eec4fa7ba44596ea058c5cef9a7c3f3fd565624d509a4c` |
  | `screens/shell-expanded-1440.png` | `588758187bc096dfcd197313e8ec57e51b9fb16b85abcbf32521c5ba7d39c67d` |
  | `screens/shell-collapsed-1440.png` | `59c81cb8575dafd7e833dcddd92650910e8bf0e477676def04470d3b319a451e` |
  | `screens/shell-expanded-1280.png` | `f13435974f20440a4b775ef2a7d46005e958915b465c46ed743aa5bc604ef0e2` |
  | `screens/shell-collapsed-1280.png` | `07bc80cbb02328ee00cdc499d3460de02306beeca911fcdd1f3befea463cd1b0` |

- **What in the mock is normative.** Only the **shell** (everything between `/* === SHELL ===` and `/* === /SHELL ===` in its CSS, and the sidebar and top-bar markup) and the **page frame** (`.win` padding and `.group`). The Manuscripts content drawn inside the frame is illustrative only. Don't port it.
- **Screens and geometry were captured without web fonts** (the sandbox can't reach Google Fonts). Treat their pixel values as a guide. The relational rules below, and your own measurement of the mock with fonts loaded, are normative.
- **Tokens:**
  - Read design values from code where they already exist.
  - Add new values as tokens, never hard-coded in a component.
  - Put the palette at `:root` (portalled components don't inherit page-scoped tokens).
  - After changing tokens, regenerate `design-refs/themes.md`.
- **Git and gates:**
  - Record baseline `tsc`, `build:dev` and Vitest results **before** any edit. The gate is "no worse than baseline".
  - Make one commit per phase, with `git commit --only -- <explicit paths>`. Never use `git add -A`.
  - Run mutations only in a separate measurement worktree. Never `git checkout` in the primary.
  - `git diff --name-only HEAD` must be empty before you trust any gate.
  - Push after each green phase.
  - **No deploys.** Nick deploys.
- **Locks.** Every change gets a lock that's proved **red** against today's `main` before you trust it green. Each named mutation must turn at least one lock red.
  - A lock that finds no subject has failed, not skipped.
  - Prove the population is non-zero before asserting on it.
- **Measure the rendered page.** Take positions from measured boxes, never from declared CSS. Measure at **1280 × 800**, **1440 × 900** and **1920 × 1080**, with web fonts loaded.
- **Another session is rebuilding `ManuscriptPage.tsx` in parallel.** Don't edit that file (see Phase 5).

---

## Step 0 · Recon (red gate: STOP and report on any ✗)

Report each item before touching anything.

1. **The shell.**
   - Name the component(s) that render the sidebar, the top bar and the content wrapper today (the 22 Sep "enclosed card" shell), with file paths.
   - List every route that renders inside the shell, and every route that doesn't or that uses a variant: the Dashboard, Settings' shell takeover, onboarding, and any dev labs.
2. **The inner card.** On Contacts and Manuscripts the content sits inside a second rounded card; the Query Centre doesn't. Say exactly which component draws that card for each page:
   - a shared wrapper (name it and list every route that uses it); or
   - markup inside the page file.
3. **"All changes saved."**
   - Name the component, and the state or store that drives it.
   - Say how save **failures** reach the writer today (toast, inline error, or through this indicator).
   - ✗ if this indicator is the **only** place a failed save becomes visible. Then STOP: removing it would hide failures, and Nick decides the replacement.
4. **Search and help.** Name the command palette's trigger and the ⌘K binding, and the help button's action. Confirm both can move to an icon-only button without changing behaviour.
5. **Collapse.**
   - Report the current collapsed width.
   - Report how the collapsed state persists (local storage, user prefs or none).
   - Report the tooltip and accessible-name behaviour for collapsed links.
6. **Themes.**
   - Say how `.t-capp` (default), `.t-bold` and `.t-edn` set the sidebar, top-bar and active-item colours today, and where `designTokens.ts` defines them.
   - ✗ if the shell reads colours that don't come from a token.
7. **Fonts.** Confirm Source Serif 4, Special Elite and JetBrains Mono are loaded app-wide (the Query Centre v65 work added them). Name the font the sidebar uses today.
8. **Nav inventory.** List the real sidebar items in order, with their icons and badges. The mock's list is illustrative: keep the app's real items and order.
9. **Harness.** Confirm Playwright renders the mock and the app at all three sizes with web fonts loaded. Name the shared fixture account you'll use, and don't touch it beyond reads.

---

## Phase 1 · Harness and locks, red against `main`

- Write the locks listed under **Locks** below. Target these routes, with the sidebar expanded and collapsed:
  - Query Centre, Contact list and Manuscripts;
  - Dashboard, To-do list and Settings, if they render inside the shell.
- Show every lock failing against today's `main`. Some should pass today, for example "search opens on ⌘K"; mark each of those **"guard"**.
- Commit the harness only.

## Phase 2 · Shell tokens

- Add the shell tokens from the mock's `:root` to `designTokens.ts` and the CSS source, for the **default theme** (`.t-capp`):
  - `--shell-side` `#e7e3dc`
  - `--shell-rule` `rgba(28,19,15,.10)`
  - `--shell-side-w` `248px`
  - `--shell-side-w-collapsed` `68px`
  - `--shell-top-h` `64px`
  - `--shell-active-bg` (= `--btn` `#2a3a52`)
  - `--shell-active-fg` `#fdf9f5`
  - `--shell-hover-bg` `rgba(255,255,255,.45)`
- For `.t-bold` and `.t-edn`, map each new token to that theme's **existing** equivalent colour. Don't invent colours, and report each mapping.
- Regenerate `design-refs/themes.md`.

## Phase 3 · Sidebar

Port the mock's sidebar exactly. **Keep the app's real items, order, icons, badges and behaviour.**

**Expanded**
- The Stone surface, with the single hairline on its right edge.
- The logo, and the switcher card on a `.7` white fill with a hairline.
- Section labels in mono.
- Nav items in **Source Serif 4, 14.5px**.
- Hover wash.
- **Active item:** anthracite fill with cream text, 600 weight, and `aria-current="page"`. Exactly one per route.
- The user row, with a hairline above it.

**Collapsed**
- 68px wide, icons only, on the same surface.
- The active item is a 40 × 34 anthracite tile.
- Section labels become 28px hairlines.
- Badges become a 5px dot.
- The switcher shows its icon only.
- Every link keeps a tooltip and an accessible name.
- Collapse persistence stays exactly as it is today.

**Colours**
- Leave the badge dot's colour as it is in the app today.
- Burgundy never appears in the shell.

## Phase 4 · Top bar

**Order:** collapse · breadcrumb · (space) · search · Give feedback · help.

- **Height:** 64px, on the page ground, with the single hairline underneath. **Padding:** 0 24px. **Gap:** 10px.
- **Breadcrumb:**
  - Source Serif 4, 15px;
  - parent levels muted, slashes at 45% opacity;
  - the current page in ink at 600 weight, with `aria-current="page"`;
  - rendered as `<nav aria-label="Breadcrumb">`.
- **Search:** an icon-only 36px white circle with a hairline, the accessible name "Search (⌘K)" and a tooltip. It opens the same palette as today, and ⌘K is unchanged.
- **Give feedback:**
  - a 36px outline button: transparent fill, `rgba(28,19,15,.28)` ring, 10px corners;
  - Special Elite 13.5px with a pencil icon;
  - the same action as today.
- **Help:** a 36px white circle, with the same action as today.
- **Remove "All changes saved"** from the shell and every route. This removes the indicator only. Leave the save-failure path found in Step 0 intact.

## Phase 5 · Page frame

- The content window keeps 28px padding (90px at the bottom). Page content sits straight on the page ground.
- **Remove the inner card** found in Step 0:
  - If it's a **shared wrapper**, change the wrapper (or stop using it for page bodies) so that no route draws a card, border, radius or shadow around its content. Manuscripts will then conform without its file being touched.
  - If the card is **markup inside a page file**:
    - remove it from `ContactList` (or whatever file Step 0 named);
    - **don't touch `ManuscriptPage.tsx`**. Record Manuscripts in the report as "pending: the Manuscripts v2 prompt removes it", and mark its L7 lock as an expected failure with that owner.
- Don't change any page's hero, rail or sections.

## Phase 6 · Page titles

The Contact list's page title moves from Playfair to **Special Elite** at the size the Query Centre's title uses (read that value from code).

- If a shared page-title component or token exists, change it there.
- Query Centre: confirm only.
- Manuscripts: out of scope (the other session).

## Phase 7 · Full pass and report

- Run every lock at all three sizes, expanded and collapsed, on every shell route.
- Compare the app against the mock side by side, both with fonts loaded.
- Fix, re-run, then write the report.

---

## Relational rules (normative)

- Sidebar right = content window left, and the only thing between them is the 1px `--shell-rule`.
- Top bar bottom = content window top (±0). Top bar background = page background.
- Top bar height = 64 (±1).
- Right clearance: the top bar's right edge − the help button's right edge = 24 (±1).
- Search, feedback and help are vertically centred in the top bar (±1) and spaced 10px apart (±1).
- Breadcrumb left = collapse button right + 14 (±2).
- Sidebar width: 248 expanded, 68 collapsed (±1).
- **Expanded:** the active item's left = sidebar left + 14 and its right = sidebar right − 14 (±1).
- **Collapsed:** the active item is 40 × 34, centred in the sidebar (±1).
- At 1280 × 800, the expanded sidebar never clips its content horizontally. If the real nav is taller than the window, it scrolls vertically: report that, but don't shrink the type.
- The page frame's first box has no border, no shadow, no radius, and the same background as the page.

---

## Locks and mutations

| Lock | Asserts | Mutation that must turn it red |
|---|---|---|
| L1 tone | The sidebar's computed background is `rgb(231,227,220)` on every shell route | Use `#f0ebe3` |
| L2 one-divide | The sidebar's right edge and the top bar's bottom edge each have exactly one 1px `rgba(28,19,15,.10)` rule; there's no other border or shadow between them and the content window; the top bar's background = the page's | Add a border-bottom to the top bar and keep the shadow |
| L3 active | Exactly one `aria-current="page"` nav link; its background is `rgb(42,58,82)` and its colour `rgb(253,249,245)`, expanded and collapsed | Render the active item with a white background |
| L4 nav-type | Nav links use Source Serif 4 at 14.5px; section labels use JetBrains Mono; the fonts are really loaded (`document.fonts.check`) | Swap the nav back to its old font |
| L5 top-bar | The top bar's children, in order, are collapse, breadcrumb, spacer, search, feedback, help; the text "all changes saved" (any case) appears in no route's DOM | Put the indicator back |
| L6 search | Search is 36 × 36 with no visible text; clicking it **and** pressing ⌘K both open the palette | Unbind ⌘K |
| L7 no-inner-card | On every shell route, the page frame's first box has no border, shadow or radius, and the page background (Manuscripts is an expected failure only if Step 0 found its card inside `ManuscriptPage.tsx`) | Put the wrapper card back on Contacts |
| L8 geometry | Every relational rule above, at all three sizes, expanded and collapsed | Change the top bar's padding to 20px |
| L9 collapse | Collapsed: labels hidden, every link has an accessible name, the highlight is kept; persistence behaves as it did before (guard) | Remove the `title`/`aria-label` from the links |
| L10 themes | Under `.t-bold` and `.t-edn`, the shell's surface, rule and active colours resolve to non-transparent values from tokens | Delete one token mapping |
| L11 save-failure | A forced failed save still shows the writer an error after the indicator is removed (guard) | Swallow the error in the save handler |

---

## Baked decisions (not to be relitigated)

- **D1 Tone step.** The sidebar is one shade deeper than the page. **Stone `#e7e3dc`.** Rejected alternatives: no top bar, an anthracite sidebar, a ledger rule, sheet-on-a-desk (22 Sep), and a card inside the enclosed shell.
- **D2 The one hairline** `rgba(28,19,15,.10)` is the only divide. There's no mat and no margin: the shell uses the whole window.
- **D3 Active item** is **anthracite** with cream text. Nick chose it over the white pill, the tab and the edge marker.
- **D4 Top bar** is **Quiet**: icon-only search, an outline Give feedback button, and help. It is **kept**, not removed.
- **D5 No "All changes saved" indicator.**
- **D6 Sidebar type** is **Source Serif 4**. Section labels stay JetBrains Mono.
- **D7** Page content sits on the page ground, with no inner card.
- **D8** Page titles are Special Elite.
- **D9** The rail pattern and each page's hero belong to their page sessions (see `page-anatomy.md`), not to this prompt.

---

## Do not touch

- `ManuscriptPage.tsx`, `lib/manuscriptSummary.ts`, and any Manuscripts files (a parallel session owns them)
- Query Centre page internals, the Contact list's hero, rail and rows (only its wrapper card and its title change)
- `StatusDot`, `MountCard`/`MountPanel`, `HubHeaderBar`, `recomputeQuery`, `correctionGuards.ts`, `packageMetrics.ts`
- `AllManuscripts.tsx`, `src/types.ts`, `firebase.json`, `firestore.rules`

---

## Final report

1. **False premises** found in this prompt, at the top, before anything else.
2. Step 0 findings, item by item.
3. Per phase: the commit hash, the locks added, each lock's red-before evidence, and each mutation with the lock it turned red.
4. App against mock side by side at all three sizes, expanded and collapsed, with any difference over 2px explained.
5. The theme mappings for `.t-bold` and `.t-edn`.
6. Every route's status, including any expected failures and who owns them.
7. Anything deferred, named explicitly with a proposed owner. Nothing is left to a code comment.
