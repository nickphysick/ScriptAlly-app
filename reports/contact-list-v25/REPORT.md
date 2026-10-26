# Contact list v25 — the Query Centre v150 / v150.1 dressing, in the Contact list's own colours

26 Oct 2026 · branch `contact-list-v25` (tip after this report) · base `dev/pk26-pvm-qc1501` **15ffc1f2** (carries
`contact-list-v24` c311313e and `query-centre-v150-1` 15ffc1f2) · integration `dev/db71-plad-db71f-cl25` **80c3442b**,
deployed to dev as **`index-Cj4aNBmO.js`** · **NOT merged to main.** Refs: `design-refs/contact-list-v25/` (16 files,
every SHA-256 matched the pack before enrolling).

## 1. False premises

1. **"Every host of those flows" / F1 "On the Contact list … Log shows query no. {n}".** `QcLogFlow149` and
   `QcWhoReplied149` have exactly **one** host, the Query Centre page (`Queries.tsx`, and only while it is the desktop
   desk on screen). The Contact list never opens them: its doors open the **query drawer's own journeys**
   (`LogJourney`, and `QueryPicker` for "Who replied?"). So the moment is a shared component (`shared/DrawerMoment`)
   drawn by all four, which is what makes it reach the Contact list at all.
2. **…and on the Contact list there is no log door that shows the moment while staying on the page.** The shell's
   "Log a query" (`invokeCapture("query")`) takes the writer to `/queries`, as it did before v25; the row's and the
   agent card's Log doors arrive with the agent already chosen, where the pack itself says the moment must not show.
   F1 therefore holds the moment after the Contact list's own door *wherever it lands* (recorded: `/queries`) and
   holds "Record a response" to staying on `/agents` (it does). Changing where the shell's door goes was not in scope.
3. **D2 "at ≤1440 of SHEET, Filters and Full screen go icon-only, exactly as v150.1".** The Query Centre's fold is
   ≤1440 of **window** (qcv149.css), and the mock's 1512 screens show "Filters" and "Full screen" in words. Built as
   the pack states (sheet, measured from the shell's published insets); so at a 1512 window the Query Centre shows the
   words and the Contact list does not. See §4 and *For Nick*.
4. **B "at ≤1440 of sheet the ring hides".** The mock's 1512 screen draws the ring. Built as the pack states: at a
   1512 window the sheet is 1256, so the ring is folded — and only then do the cards meet the pack's ~103px.
5. **B1 / C "ruled … in QC v150.1 style".** The Query Centre v150.1's "At a glance" and "Your queries" are 28px and
   **unruled** (v150.1 removed the rules). "Ruled" exists only in the mock, so its sizes were taken: "At a glance"
   19px, "Every agent on file" 24px, each with a hairline running to the right.
6. **D2 "the bar's count retires".** v24's bar draws no count; there was nothing to retire.
7. **A v24 bug the pass found:** the bar's "Full screen" label shared the class `cl24-fsl` with the address book's
   list column, which painted it on a white box at 1512. Renamed `cl24-fslb` (Part A).

## 2. Per part

| Part | Commit | What changed |
|---|---|---|
| refs | a2336e5f | 16 refs enrolled. |
| A | 369a392c | The Contact list's own doodle tile on the page sheet (never in full screen or on the empty states). The title card at the Query Centre v150's values by widening qcv150.css's selectors to `.cl25-hd .cl25-card`; highlighter `#e3e8ef`; the new body line. The banner (`PageAlertBanner` use), the view row (`ContactViewRow24`), `missingWords`, their CSS and v24's `:is(.qcv-group, .clv-group)` widening in qcv149.css **deleted**. **Kept:** `PageAlertBanner`'s `lead` prop (shared; Versions and the Query Centre never pass it), `bannerFigures` (its gap total is List health's n). Find moved into the bar (`.qc150-bfind`, its rules widened to `.cl24-bar`). |
| B | 6e4a73f7 | `QcStatCards150` lifted to `shared/GlanceCards` (QC markup compared byte for byte in three states); `ContactGlance25`; `glanceCards`; `inSet` takes a list; page set state is a list; the address book lights no segment while Querying's two sets apply; the Housekeeping guide step points at the List health card. |
| C | 547f28a1 | `ContactListTitle25` (heading, count line, List \| Cards); the switch removed from the bar with its handler, icons and `.cl24-vt` rules; `countLine`, `sortWords`. |
| D | 43c97fae | One width W = min(S − 48, 1200); v150.1's bar (order, Special Elite, value-only pills, GROUP_ICON150, sheet-based icon-only); `chip` on the shared SortField ("Name A–Z"); the cream row in Special Elite. |
| E | a3cf7029 | Full screen capped at 1600 (G = max(0, (S − 1600)/2)); the cream row's sort pill drops its prefix at every width. |
| F | 9238b65a | `shared/DrawerMoment` in QcLogFlow149, QcWhoReplied149, LogJourney and QueryPicker (via `JourneyView.moment`, drawn by DrawerShell atop step 1). |
| G | ed8d8394 | CL25 locks, CL24 re-points, Help Centre, CLAUDE.md. |

**Hosts of the drawer moment (F):** `Queries.tsx` → QcLogFlow149 ("+ Log a query" in the Query Centre header) and
QcWhoReplied149 ("Record a response" there); `QueryDrawer.tsx` (App, every page) → LogJourney (any unseeded "Log a
query") and QueryPicker ("Record a response" with no query open — not when a query was open, where the picker is a
step).

## 3. Decisions made

- **Lift, not fork.** The stat cards became `shared/GlanceCards` with the probe name as a prop; the Query Centre's
  render is a wrapper. The title and switch reuse qcv150.css's unscoped rules; only the layout is the Contact list's.
- **Two sets as one filter.** The page's set state is now a list; At a glance's "pressed" is derived from it. The
  address book's band, which offers single sets, lights nothing while Querying (two sets) applies.
- **The ring folds by CSS (stepped clamps on `--hsheet-w`, width AND height);** the bar's fold by a measured
  `data-s1440` (a display change cannot be a clamp).
- **The cards' "+N" is the agents the faces stand for, never the figure**, so List health (a percentage) draws no "+N".
- **The Filters MENU is not retyped.** v150.1 sets the group and sort menus in Special Elite and not Filters'; the
  Contact list's Filters menu is shared with the address book and is left as it was.
- **"Who replied?" keeps its big title under the moment** in the Query Centre's flow (the mock hides it under header
  A; the pack says nothing, and QC locks read it).
- **F1's n comes from Firestore** (`tests/e2e/cl25QueriesByBook.mjs`, read-only), so the lock does not share a
  derivation with the page.
- **The header card's probe is `data-cl25="hd-card"`;** the glance cards' is `data-cl25="card"` (v24's same collision).

## 4. Mock / app disagreements (the app won on shared parts)

- The mock's v150.1 cards draw the count at 44px and discs at 27; the app's v150.1 cards are 40/36 and 30/26. Taken
  the app's (shared CSS).
- The mock shows the bar's words and the ring at a 1512 window; the pack's sheet rule folds both there (§1.3–1.4).
- The mock's drawer is 560 wide; the app's drawer width was left alone, as the pack says.

## 5. Strings changed

Header body: "Every agent you might query with **{title}**, and how to reach them." (no manuscript: "… query, and how
to reach them.") · "At a glance" · "List health", "Not queried", "Querying", "Closed" · "{n} gaps →" · card labels
for screen readers ("List health: 69%. 79 gaps to fill. Open Housekeeping"; "Querying: 11 agents. Show only these") ·
"Every agent on file" · "41 agents · 93% list health · grouped by status, A to Z", "as cards, grouped by status",
"19 of 41 agents", sort words "A to Z / Z to A / newest first / oldest first / fastest reply first / slowest reply
first / furthest on first / earliest first" · bar pills "Status", "Name A–Z" / "Name Z–A" · the moment: "Another one,
out into the world." / "This will be query **no. {n}** for **{title}**. Who’s it going to?" / "Someone wrote back." /
"Whatever they said, it’s an answer, and every answer tells you something. Let’s get it down." · Help Centre: *Find an
agent* lede and body ("at the left of the list's navy bar", "the first thing in the list's navy bar"); *What List
health measures* ("press the List health card under At a glance"). Removed: the banner's sentences and "Fill in the
gaps" from the page, "Grouped by", "Sorted by".

## 6. Locks

**Green on v25 (and again on the integration build):** A1 12/12 · A2 6/6 · B1 22/22 · B2 12/12 · C1 12/12 · D1 8/8 ·
D2 12/12 · E1 11/11 · F1 11/11 (106 readings). Unit: `contactV25.test.ts` 14 cases.

**Red first, on the base build (15ffc1f2, `CL25_BASE=1`):** A1 4/12 · B1 0/8 · C1 0/4 · D1 4/8 · E1 9/11 · F1 5/9.
A2, B2 and D2 wrote no base ledger: each sits behind a sibling in the same test that threw first. Each is proved by
its own break:

| Lock | Break | Reading under it |
|---|---|---|
| A1 | the banner restored (DOM) | 10/12 — "1 banner(s) visible" at both sizes |
| A2 | v24's padding | 4/6 — QC 22/36/24/36 · CL 30/40/32/40 |
| B1 | List health 1.7fr | 20/22 — widths 421 / 248 / 248 / 248 |
| B2 | Querying shows only With the agent (build) | rows {agent: 7} want 11; not navy; "all again" 7 of 53 |
| C1 | the title centred | 8/12 — title 642 · list 276 |
| D1 | v24's widths | 2/8 — card 340 · list 308 |
| D2 | the serif back on Filters | 10/12 — "cl24-ch--fil Georgia" (the first break did not out-rank v25's rule and stayed green; raised and re-run) |
| E1 | the cap removed | 9/11 — book 2484; archivist 90 against 532 |
| F1 | n off by one (build) | 9/11 — "no. 14" where Firestore says 14 → no. 15 |

Ledgers: `reports/contact-list-v25/ledger/` (`base-*`, `mut-<break>-<lock>`).

**L1 (on v25, then on the integration build):** CL24 7 passed · QC150 25 · QC1501 15 · QC1492 4 · QC149 17 (8
skipped, as before) · QC149-L0 3 passed (0 style differences; 0.0024% / 0% pixels against a reference re-captured
from the base build this session — the stored one was days old) · HR1-1…7 pass. **HR1-8 is red, and red on the base
build too:** its `phone /agents` reading finds nothing on either (`a: [null], b: [null]`); v24 recorded HR1-8 red on its
base as well.

**CL24 assertions re-pointed or retired** (a comment at each in `cl24.measure.ts`): CL24-A1 retired (the boxes it
compared — the Query Centre's banner and view row — no longer exist; CL25-D1 holds the shared width); A2 re-pointed to
the List health card (its "k agents" reading retired: the card states no k); A3's chip readings retired for CL25-B1/B2,
its "AND with Filters" reading re-pointed to the Querying card; "banner absent at no gaps" re-pointed to "no gap line at
no gaps"; B1's "switch inside the navy bar" re-pointed to "above the bar, not in it", and its view tabs to
`data-cl25`.

## 7. Screens (from dev, `index-Cj4aNBmO.js`)

`screens/` beside each ref screen: `01-top-1280/1512`, `02-list-1280/1512`, `03-cards-1280/1512`,
`04-glance-not-queried-1280/1512`, `05-full-screen-1280/1512`, `06-full-screen-2560`, `07-drawer-log-1512` (the
Query Centre's flow), `08-drawer-record-1512` (the Contact list's), `09-normal-2560`. The refs are @2x; these are 1x.

## 8. Dev, worktrees

Dev served `dev/db71-plad-db71f` (a3da291d, `index-BPhr9Jhq.js`, confirmed by building it) — it carries v24 and
QC v150.1. Integration `dev/db71-plad-db71f-cl25` = that + `contact-list-v25` (one conflict: the refs manifest, base
taken and v25's ref re-enrolled). Gates there match the baseline (tsc 0, both builds 0, Vitest only the three
`functions/` reds present before any edit). Re-checked before and after deploying: served `index-Cj4aNBmO.js`.
Worktrees `ScriptAlly-cl25`, `ScriptAlly-cl25base` and `ScriptAlly-cl25int` removed at the end.

## 9. For Nick

1. **Which fold do you want for the bar and the ring — sheet (as the pack says, built) or window (as the Query
   Centre and the mock do)?** At a 1512 window the two pages' bars now differ: the Query Centre says "Filters" and
   "Full screen", the Contact list shows icons.
2. **The shell's "Log a query" from the Contact list goes to the Query Centre.** Should it open the drawer in place?
   (Then the moment would show on the Contact list itself.)
3. **"At a glance" and the list title are ruled and smaller than the Query Centre's (19/24 against 28).** Taken from
   the mock because the pack says "ruled"; one rule makes them identical either way.
4. HR1-8's `phone /agents` population is empty on base and here; it needs its own look.
5. Prod is untouched; nothing merged to main.
