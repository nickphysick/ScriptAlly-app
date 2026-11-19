# Search v1 — any words in any order, more to find, the peek, and results that open the thing

Branch `search-v1`, cut from `query-card-v160` @ `343976d1c` (the branch dev served on 19 Nov morning:
`index-BBv9y05U.js`, built from `5d8ef0504` on that line — **not** `dev/qc1581-pk62`, which the prompt named as
18 Nov's base). Design refs enrolled at `design-refs/search-v1/`; all 14 SHA256s matched the prompt.

Commits:

| Part | Commit | What |
|---|---|---|
| A | `f63a1407c` | matching (`lib/searchPalette.ts`), SV1-U1…U9, the refs |
| B | `d2e104b28` | what there is to find (`lib/searchSources.ts`), SV1-B1…B6 |
| C + D | `212f781ce` | the desktop palette (`SearchDesk.tsx`, `searchV1.css`) and every opener — **one commit, not two** (below) |
| E | _see git log_ | the rendered locks' greens, the repointed e2e locks, this report |

## False premises (things the prompt said that are not true of the code)

1. **`TODO_OPEN_TASK_SETTINGS` is not "the contract the account menu already uses".** It is defined
   (`lib/todoRoutes.ts:116`) and nothing dispatches or listens to it; the sheet was retired. The account menu's
   Task settings is a plain route, `/account/preferences` (`AccountMenu.tsx:255`). Search's Task settings now goes
   there, as the menu does.
2. **The Corkboard's notes are not `db.notes`.** The Corkboard reads `userTasks` through `sortNotes`
   (`TodoNoteboardPage.tsx:148`, `lib/noteboard.ts:85`); `notes` is the dashboard's desk notes. Search reads the
   Corkboard's.
3. **`exportQueriesToCSV` does not lift.** It is a closure inside `Queries.tsx` reading the page's `agents`,
   `manuscripts`, `activities` and `journalEntries`. Per the prompt, the **Export your queries row is removed**, and
   `Queries.tsx` is untouched.
4. **`setSearchQuery` cannot filter the Agents page from the shell.** `AgentList` reads it only in a `useState`
   initialiser (`AgentList.tsx:199`) and the page stays mounted, so the old agent-row behaviour only filtered on the
   page's first mount. The **Agents hand-off row is left out** (it would say "these" and show everything), and
   `setSearchQuery` is no longer read by search at all.
5. **The Query Centre's Find cannot be seeded from the shell** (local state, initialised once from visit memory,
   `Queries.tsx:2535`). The **Queries hand-off row is left out**, as the prompt allowed.
6. **The Help centre takes no search term** (`HelpHome.tsx:115`, local state; the hash only focuses). "Look for
   “{term}” in the Help centre" opens `/help`.
7. **There is no "Last thing that happened" wording.** The card's nearest fact is **Last heard** (`heardFact`,
   `lib/qc153.ts:103`); the peek uses it under its own label rather than relabelling it as something it is not.
8. **The card's Next box says "Response overdue"** for a nudge-due query (`OVERDUE_VALUE`), a word the prompt rules
   out. The peek keeps that box's line, "Send nudge now", and drops the verdict.
9. **Only one help article is live** (27 of 28 in `content/help/articles.ts` are `draft: true`), so the Help group
   holds one article. Bodies are importable without the Help Centre's page code (`articleText`), and are matched.
10. **The Letters page is `/materials/letters`**, and its selection is local state: a letter opens the page.
11. **The 8 GB Mac cannot run the root `tsc` at Node's default heap** (OOM, exit 134). Every typecheck here ran
    with `NODE_OPTIONS=--max-old-space-size=6144`.

## Step 0 findings

**Locks that read the palette** (and which changed on purpose):

| Lock | Where | Change |
|---|---|---|
| `searchPalette.test.ts` (33 cases) | `src/lib/` | rewritten for the new core: `GROUP_ORDER`, `GROUP_LABEL`, `emptyStateItems`, `EMPTY_*_COUNT`, `jumpToItem`, `RANK`, `normalise`, `rankItems` are gone; the "both shells mount ONE palette" and "⌘K toggles" source locks kept verbatim |
| `workspaceTasksNav.test.tsx:150–161`, `calendarRetired.test.ts:69`, `todoWorkspace.test.ts:81` | read `PALETTE_PAGES` ids/paths | unchanged, green |
| `shortcuts.test.ts:33` | usePalette must not test `"k"` by hand | unchanged, green; the binding lock now also covers `searchSecond`/`searchScope` (bound in `SearchDesk.tsx`) |
| `shellV2Tokens.test.ts:95` | `searchPalette.css` tokens | unchanged (the phone CSS is untouched) |
| MS3, MS4, MS7, MS8, MS9, MS10 (`tests/e2e/shellMenus.measure.ts`) and their mutation scopes (`inkLib.ts`) | the ink rows | **repointed** to `.sv1-*`. MS7: 920 or 660 by the sheet (was 660 always). MS8: headings "Start something" / "Go to" in sentence case (were capitals — Nick's ruling against eyebrows). MS10: the bound set gains `esc`, `Tab`, `⌘ ↵`/`Ctrl ↵`. MS4: reads `.sv1-soon` |
| SR1.2 (`sidebarRail.measure.ts:62`) | page titles in results | selector also reads `.sv1-t1` |

**What search reads without fetching.** Every collection in `useScriptAllyDb` is subscribed in the auth effect, so
on every signed-in route. Search reads `agents`, `queries`, `manuscripts`, `versions`, `packages`, `userTasks`,
`tasks`, `taskFlags`, `activities`, `currentUser`. **No listener or fetch was added.** The corpus is built only while
the palette is open.

**Openers**, and where the exact thing cannot be opened:

| Row | ↵ | ⌘↵ |
|---|---|---|
| Agent | `openAgentCard(id)` — over the page, no navigation | the query on the active manuscript (`onNavigate("queries", id)`), else Log a query to them (`initialAgentId` seam) |
| Query | `onNavigate("queries", id)` | `openResponse({ queryId })` — the store the card's own Record a response uses; not offered on a closed query |
| Task | `TODO_OPEN_TASK_KEY` (the To-do list's arrival key) then `/todo` | — |
| Note | `/todo/corkboard` — **the page only** | — |
| Letter | `/materials/letters` — **the page only** | — |
| Package | `/queries/packages?pkg=<id>` — the page's own deep link, so the exact package | — |
| Help | `articleHref(slug)` | — |
| Give feedback | `openFeedback()` | — |
| Add “{Term}” as an agent | `openNewAgentCard({ prefill: { name } })` | — |

**Query wording reused:** Sent = `queriedFact`; Next = `nextBox154` with the card's own labels (`NEXT_WAIT_LABEL`,
`QUIET_LABEL`/`QUIET_VALUE`, `nudgeOnLine`); Last heard = `heardFact`; Their policy = `policyWords` ("—" reads
"Not stated"); gone quiet = `isQuietCard`; whose move = the row's `court`.

## Rows that open a page instead of the exact thing, and what it would take

- **A task, when you are already on `/todo`.** The To-do list reads its one-shot key only on arrival
  (`TodoWorkspace.tsx:203`, deps `[pathname, collectionsReady]`), so from `/todo` search goes to the list without
  selecting the task, and writes no key (one written then would open the task on some later visit). Needs: an
  event the workspace listens for while mounted, like `TODO_OPEN_COMPOSER`.
- **A note.** Needs: the Corkboard to read a note id (key, event or param) and bring it forward.
- **A letter.** Needs: `QueryLettersPage` to read a selected id (its `selId` is local state).
- **Record a response** is exact (`openResponse({ queryId })`).
- **Look for “{term}” in the Help centre.** Needs: `HelpHome` to take an initial term.

## Left out under "no new listener" and "no new deep link"

- Nothing needed a listener.
- Export your queries (false premise 3) and both hand-off rows (4, 5).

## Differences from the mock, and from the prompt

- **Parts C and D are one commit.** The presentation and the dispatch were written into the same two files and
  could not be split honestly after the fact.
- **Heading counts.** The mock's capped heading counts the group minus the Best match, while its "Show all" counts
  the whole group. Here both show the whole group's count, so the heading and its "Show all" row agree.
- **"Show all" for Start something or Go to** chooses a scope that has no chip (as the mock does). Tab then
  steps from Everything.
- **SV1-U7** asserts the Import half and that no Export row exists (the prompt's lock expected Export).
- **The phone.** Its presentation, markup and CSS are as they were, and so is its empty state (three actions, the
  first four pages). The matching it uses is the new one, and three corpus changes reach it: query rows are titled
  by the agent alone (the status no longer rides the title), the manuscript rows are gone, and the action
  second lines are the prompt's new wording. SV1-R8's reading against the base is recorded below.
- **Package lines** resolve the letter and version names from `versions[].versionName`. The Packages page resolves
  them through its own hook (`usePk62`'s `letterOf`/`versionOf`), which cannot be called from the shell.
- **No `↵` chip on the selected row.** Group headings are 13px serif, and no text is under 12px (SV1-R1).

## Gates

Baseline (`343976d1c`, before any edit): tsc 7 errors, all in `functions/` (module resolution: the worktree had no
`functions/node_modules`); build clean; Vitest 4 failed tests in 12 failed files (functions/*, `aiRefusal`,
`queryClock`, `firestoreTarget` ×2, `statusMarksV3Sources` SM3-8).

Each part, on a clean tree after its commit: tsc 7 (the baseline's), the build clean, the touched specs green.
`src/lib`, `src/components/shell` and `src/test` together: 2 failed tests in 3 files, all in the baseline set
(`aiRefusal`, `queryClock`, `firestoreTarget` ×2). `statusMarksV3Sources` SM3-8, red in the baseline, is green here.

## The locks, red then green

**Unit** (`src/lib/searchV1.locks.test.ts`), run against the code at `343976d1c` through an adapter that speaks to
either shape of the module, so every red is on behaviour rather than a missing import:

| Lock | Red against the base | Green |
|---|---|---|
| SV1-U1 “full marsh” / “marsh full” | `full marsh: expected false to be true` | ✓ |
| SV1-U2 “zoe” → Zoë first; “orourke” marks O'Rourke | `expected 'Log a query to Chloe Zoeller' to be 'Zoë Achterberg'` | ✓ |
| SV1-U3 “aisah” only as a fallback | `expected [ 'Log a query to Aisah Lim', … ] to not include 'Aisha Rahman'` | ✓ |
| SV1-U4 one letter: starts of words only, never a wishlist | `… to not include 'Dana Black'` | ✓ |
| SV1-U5 one row per agent; “offer” lists the query | `expected 3 to be 1` | ✓ |
| SV1-U6 Best match, four agents, “Show all 20 agents” | `expected undefined to be 'Best match'` | ✓ |
| SV1-U7 “reply” / “csv” | `expected [] to include 'Record a response'` | ✓ |
| SV1-U8 wishlist snippet | `expected [] to deeply equal [ 'Priya Nair' ]` | ✓ |
| SV1-U9 no loose subsequence | `expected [ …(2) ] to not include 'Juliet Mushens'` | ✓ |

`searchSources.test.ts` SV1-B1…B5 went red against Part A's module (`f63a1407c`) on behaviour. SV1-B6 (the task chain
is `useWsCore`'s, call for call) went red by renaming `wsTasks(` in a copy of `useWsCore`, which was then restored.

**Rendered** (`tests/e2e/searchV1.measure.ts`, emulator build): the base was extracted with `git archive 343976d1c`
into the scratchpad, rather than as a sixth worktree, and the spec was run there.

| Lock | Base | This branch |
|---|---|---|
| SV1-R1 nothing under 12px, no capitals but SOON (population > 30 elements, four states) | ✘ `"ESC" (sp-esc) is 9px` | ✓ |
| SV1-R2 ↵ on an agent: card over the page, route unchanged, Agents Find empty | ✘ the selected row is not an agent (the Jump-to row led) | ✓ |
| SV1-R3 Esc clears and stays open; Esc again closes, focus on the bar's field | ✘ the first Esc closed | ✓ |
| SV1-R4 Tab moves the pressed chip, focus stays in the input | ✘ no chips | ✓ |
| SV1-R5 the peek at a sheet ≥1180, the box 920 / 660 | ✘ `box 660 on a 1424 sheet` | ✓ 1512: sheet 1424 → 920 with the peek; 1280: sheet 1192 → 920; 1100: sheet 1012 → 660, no peek |
| SV1-R6 one body height for no term, one result, no match | ✘ no body | ✓ `[440, 440, 440]` |
| SV1-R7 crossing three rows in under 110ms leaves the peek; resting moves it | ✘ no peek | ✓ crossed in 21ms |
| SV1-R8 the phone at 390 is as it was | the baseline (`reports/search-v1/phone-baseline.json`) | ✓ equal |

⚠️ **At 1280 × 800 the sheet is 1192 wide, which is over 1180**, so the prompt's two sizes never show the list-only
box. R5 adds 1100 × 800 for that side.

⚠️ **The phone palette never shows, on the base or here.** At 390 there is no search opener on screen, so ⌘K
mounts the palette and it is never placed (`visibility: hidden`, top 844). R8 compares it as it is. That is an
existing gap, out of this pack's scope.

**Repointed e2e locks**, on this branch: MS7, MS8, MS9, MS10, SR1.2 ✓. **MS3 and MS4 are red on the base too**: the
account button is `inert` before search is opened, so the test times out. They are not this pack's reds. MS10 now
presses Esc twice before opening Help: one Esc clears the words, by design.
