# Help system v1 — report

Branch `help-system-v1` (worktree `../ScriptAlly-help1`). Ref: `design-refs/help-system-v1/` (checksums verified: `SHA256SUMS` hashes to `831ee6bd…f6bc`, every file OK).

## False premises (read first)

1. **The guide's "seen" and "hidden" are not in `localStorage` `sa.guide.{page}`.** For both the Contact list and the Query Centre they live on the account, in Firestore (`todoPrefs.contacts.guide` and `todoPrefs.queries.guide`: `done`, `seen`, `hidden`, and for the Query Centre `finished`). The `sa.guide.{page}` key belongs to the older one-card `PageGuide`, which only the Manuscripts page still uses. The new per-device keys in this pack sit beside those: `sa.guide.{page}.skipped`, `sa.guide.{page}.last`, `sa.guides.off`, and `sessionStorage` `sa.guide.autoOpened`.
2. **The checklist's popover and done-note were not in the bar.** They were already portalled to `<body>` (`.pck-layer`, z 95). Only the **Help menu** and the **Log a query menu** were rendered inside `.ws-pagebar`. The cause Nick saw is confirmed as stated: `.ws-pagebar` is `position: relative; z-index: 3`, so the Help menu's `z-index: 30` only competed inside the bar, and the sheet's sticky lip (19) and the pinned list headers painted over it.
3. **`NOTE_MS` was already 6s, and the note never paused.** It also never reliably timed out on the Contact list: the note's timer lived in an effect keyed on the `done` map, and that page builds a new map on every render, so each render cleared the timer. Replaced by a clock that runs on its own.
4. **`sendBetaFeedback` was not deployed to dev at all** (`firebase functions:list --project scriptally-dev`: `extractFromEmail`, `smartImportMap`, `waitlist`). Every feedback sent from dev until now failed and said so; nothing was stored. Feedback was never emailed anywhere.
5. **HS1-D2's set-up does not exist in this app.** The Contact list's housekeeping step spotlights **"Fill in the gaps"** (v18.3), not the List health ring, so with that spotlight on, the ring is under the dim; and the step ticks on a Housekeeping **save**, not on a press. D2 is restated as the law it guards (a press on the words inside the ring's button does the button's job: Housekeeping opens), with the pack's mutation.
6. **The mock's response-policy example is not true of the app.** It says a "no response means no" query "closes quietly". Nothing closes a query by itself; the To-do list *suggests* closing it. The example now says that. (The Replies example also uses the app's `~6 weeks`, not the mock's `~6 wks`.)
7. **"Response policy" is labelled in two places, not three.** The agent panel and its editor carry the label. The row's open strip shows the policy as a note under Replies with no label, and the filter offers "Always replies" with no label. Neither was given a term.
8. **The statuses the app shows are more than the eight listed.** The status column also shows Resubmitted and Signed, and the closed set as Passed, Closed with no reply and Withdrawn. Resubmitted and Signed have their own entries; the three closed outcomes share "Closed" and each card draws the row's own dot.
9. **The base.** Dev serves the v140.1 integration `dev/…-cl192-qc1401` at `bbd9f309` (`index-DSAY7Z_7.js`). It carries Contact list v19.2's code and Query Centre v139, v140 and v140.1. `contact-list-v19-2`'s own tip (`d0333f9e`) is not an ancestor, but the only commit missing is its report's deploy note.
10. The "?" **key** opens the shortcuts sheet directly; it was never the menu's trigger, so it is unchanged.

## What was built

| Part | Commit | |
|---|---|---|
| A | `c626cec3` | One pop-up layer `#qh-popovers` (z 80) and `useAnchoredPopover`; one top-bar pop-up at a time |
| B | `de811178` | The Help menu, design A "Page card" |
| C | `7dcd43b6` | The ring pill, the four touches, the auto-open rules, the 6s note, skip / learn more |
| C fix | `81d3adc5` | Two faults the HS1 locks found (below) |
| L1 fix | `8e103078` | Three faults the existing locks found (below) |
| D | `391860cb` | `lib/glossary`, `<Term>`, wired on the Contact list |
| E | `b6058e2d` | The feedback panel; `sendBetaFeedback` stores and emails |

### §0 recon: the pop-ups and where each was

| Pop-up | Before | z-index / stacking parent | Now |
|---|---|---|---|
| Help menu (`.ws-helpmenu`) | inside `.ws-pagebar` (`.ws-helpwrap`) | 30, inside the bar's z 3 context | in `#qh-popovers`, placed from the "?" |
| Log a query menu (`.ws-capm`, bar placement) | inside `.ws-pagebar` (`.ws-cap--bar`) | 6, inside the bar's context | in `#qh-popovers`, placed from the split button |
| Log a query flyout (sidebar collapsed) | already portalled to `<body>` | 85 | unchanged (not a top-bar pop-up) |
| Checklist popover | portalled to `<body>`, `.pck-layer` | 95 | in `#qh-popovers` |
| Checklist done-note | portalled to `<body>`, `.pck-layer` | 96 | in `#qh-popovers` |
| Spotlight dim and step card | portalled to `<body>` | 97 | unchanged, as the pack asked |
| Page slot (`lib/barSlot`) | the pill only | — | the pill (and its live region) |

The account menu lives in the sidebar, not the bar.

### What `quiet` and `empty` read

| | `quiet` (no automatic open, for the rest of the visit) | `empty` |
|---|---|---|
| Contact list | an agent's panel open (by a row or a deep link to `?agent=`), the agent card or its editor, Housekeeping open, or the search holding text | the empty page (`showEmpty`); items that need an agent read "Add an agent first" |
| Query Centre | the query drawer, an open query's panel (by a row or a deep link to `?q=`), the Birds-eye drawer, or the search holding text | no queries yet (`collectionsReady && !hasQueries`); the existing "After your first query" lines |

The quiet latch is taken only once the page is ready (see the C fix).

### Credit for work done before the guide

- **Contact list "Add an agent"**: now ticked by any agent on file (added by hand or imported), shown at once and written so it survives. It was not credited before.
- **Query Centre "Log a query"**: already ticked by any query on file.
- **Not credited, because nothing records them:** Contact list "Search for an agent", "Pin the list", "Open an agent's card" (all moments, not stored), "Edit an agent" (an edit leaves no per-account trace the page reads), "Do some housekeeping" (a filled gap is indistinguishable from data entered at the start); Query Centre "Find a query", "Pin the list", "Open a query", "See the Birds-eye view" (moments). Skip covers these.

### The two faults the locks found (`81d3adc5`)

- **The quiet latch was taken while the page loaded.** A page's own state passes through values that look like a task before it settles, and the latch held the first automatic open and the session pulse off for a visit nobody had started: on a fresh session the Contact list sometimes did not open by itself, and the Query Centre did not pulse (HS1-C2).
- **A note on arrival.** "Add an agent", credited from an agent on file, lands in the same render as the page becoming ready, so it read as a tick landing and raised a done-note on arrival; the next real tick restarted that note's clock, so it lived ~8.6s (HS1-C4). The render in which a page becomes ready now only takes the baseline.

### The glossary (Nick to review)

Contact list terms, the mock's wording except where noted:

- **List health** (Contact list): "How much of the useful detail on your agents is filled in: genres, wishlist, response policy, contact route. Each gap you fill helps QueryHawk tell you when queries are due and who suits your book." Example, live: "You have **{n} gaps** across {N} agents. Press the ring to fill them."
- **Replies** (Column): "How long this agent usually takes to answer a query, as their website states it. "Not stated" means they haven't said." Example: "**~6 weeks** means QueryHawk counts six weeks from the day you queried before showing a query as past expected." *(the app's "~6 weeks", not the mock's "~6 wks")*
- **Response policy** (Agent detail): "Whether this agent replies to every query or treats silence as a no. QueryHawk uses it to decide what happens when their reply time passes." Example: "**No response means no**: once their reply time passes, your to-do list suggests closing the query. **Always replies**: it suggests a nudge instead." *(changed from the mock: nothing closes a query by itself)*

Query statuses (eyebrow "Query status", each with its real StatusDot):

- **Queried**: "You've sent your query and the agent hasn't answered yet. Nothing is needed from you while you wait."
- **Partial requested**: "The agent has asked to see part of your manuscript, usually the first few chapters or a set number of pages. It's your move: send it when it's ready." Example: "Dashed ring = they've asked for something. Half filled = a partial. Once you send it, the ring turns solid." *(the mock's)*
- **Partial sent**: "You've sent the pages the agent asked for. They're with the agent now, and the next reply is theirs."
- **Full requested**: "The agent has asked to read the whole manuscript. It's your move: send it when it's ready."
- **Full sent**: "You've sent the whole manuscript. It's with the agent now, and the next reply is theirs."
- **Revise & resubmit**: "The agent has asked for changes and would like to see a new version. It's your move: send the revised manuscript when it's ready."
- **Resubmitted**: "You've sent the revised manuscript back after a revise and resubmit. It's with the agent now, and the next reply is theirs."
- **Offer**: "The agent has offered to represent you. It's your move: you decide, and you can tell the other agents still reading."
- **Signed**: "You accepted this agent's offer. The query is finished."
- **Closed** (Passed, Closed with no reply, Withdrawn): "This query has ended: the agent passed, it closed with no reply, or you withdrew it. The words beside it say which."

### Feedback

- **The screenshot shipped.** Storage was already set up on dev (manuscript attachments, per-user paths). The client uploads to `betaFeedback/{uid}/{timestamp}.{ext}` before calling; the function refuses a path under any other uid.
- **The Storage rule** (`storage.rules`):
  ```
  match /betaFeedback/{userId}/{fileName} {
    allow create: if request.auth != null
      && request.auth.uid == userId
      && request.resource.size < 5 * 1024 * 1024
      && request.resource.contentType.matches('image/.*');
  }
  ```
  Create only; no read, list, update or delete for anyone.
- **The function** stores kind, message, severity, wantsReply, pageName, route, viewport, browser (the user agent, as before), browserName ("Chrome 154 on a Mac"), appVersion, screenshotPath, uid (token), and email (token, only when a reply is wanted); writes first, then emails `FEEDBACK_TO` (default feedback@queryhawk.net) from `FEEDBACK_FROM` (default "QueryHawk feedback <feedback@queryhawk.net>"), Reply-To the writer only when wanted; an email failure is recorded as `emailed: false` + `emailError` and the call still succeeds. `sendEmail` gained optional from / reply-to overrides; the waitlist's calls are unchanged.
- The VERSION line is the build's date ("Beta, 19 Oct").

### Other decisions to know

- **Article links go to `/help` for now.** `lib/helpArticles` lists every slug this pack links to; `LIVE_ARTICLES` is empty until the Help Centre prompt writes them. "Search help" goes to `/help#search` and What's new to `/help#whats-new`; the current Help centre page does not act on either hash yet.
- **What's new** has three entries I wrote from what shipped (help on every page; pin the list; List health and Housekeeping). Nick to check or replace.
- **"Open the page guide" on a finished guide** brings the pill back (sage) for the visit and opens the checklist with every row ticked and pressable.
- The Contact list's pill now stays sage for the rest of the visit when the last item lands (it used to vanish after 2.4s).

## Nick's to-do

- **Add `feedback@` as an alias on the queryhawk.net mailbox** in Namecheap Private Email, as hello@ was. Nothing new is needed in Resend: the domain is verified.
- If you want feedback in a different inbox, set `FEEDBACK_TO` in `functions/.env.scriptally-dev` (and prod's file when it ships there).
- Prod is untouched: the function, the Storage rule and hosting all went to dev only.

## Gates

Baseline (`bbd9f309`): tsc root 0, tsc functions 0, both builds 0, Vitest 617 files / 9155 passed, 3 skipped.

| Commit | tsc | tsc fn | prod build | dev build | Vitest |
|---|---|---|---|---|---|
| A `c626cec3` | 0 | 0 | 0 | 0 | 617 / 9155 |
| B `de811178` | 0 | 0 | 0 | 0 | 617 / 9155 |
| C `7dcd43b6` | 0 | 0 | 0 | 0 | 617 / 9155 (exit 1: the known reporter RPC timeout, `onTaskUpdate`; no failed file or test) |
| D `391860cb` | 0 | 0 | 0 | 0 | 617 / 9155 |
| E `b6058e2d` | 0 | 0 | 0 | 0 | 618 / 9166 (+ the function core's suite) |

Each gate ran in a clean detached checkout of the commit (`git diff --name-only HEAD` empty).

## Locks: HS1

`tests/e2e/helpSystemV1.measure.ts` (A1–E2, rendered, 1512 × 900 and 1280 × 800) and `functions/src/betaFeedbackCore.test.ts` (E3, E4). Ledgers in `ledger/`: `HS1-*.json` green, `mut-HS1-*.json` under the break. Src breaks: `tests/e2e/hs1Mutate.py`, applied and undone in a separate measurement worktree.

| Lock | Green | Red (named break) |
|---|---|---|
| A1 on top | 62/62 (Contact list unpinned and pinned, Query Centre; Help menu, Log a query menu, checklist; scrolled 400px) | menu rendered back inside `.ws-pagebar`: 13 of 21 readings red before the page fell over, e.g. the Help menu's top corners hit the page, not the menu |
| A2 one open | 6/6 | close-others call dropped: red from the keyboard (`["popover","help-menu"]`); the pointer path stays green because the checklist also closes on any outside press — two guards, one observable |
| B1 contents | 12/12 | Keyboard shortcuts row restored: 10/12 |
| B2 continue | 8/8 | Continue opens the checklist: 4/8 |
| B3 keys | 10/10 | the "?"'s keydown removed: 4/10 |
| C1 pill | 12/12 | bars restored: 10/12 |
| C2 once | 6/6 | session key cleared on route change: 4/6 |
| C3 quiet | 8/8 | `quiet` ignored: 6/8 |
| C4 note | 10/10 (lifetime 6.46s; hovered, alive at 8s) | pause removed: 8/10 |
| C5 last | 6/6 | the 6s timer on the last note: 4/6 |
| C6 skip | 10/10 | Skip a no-op: red, the row never ticks and no Undo appears |
| D1 card | 6/6 | delay 0: 4/6 |
| D2 click-through | 8/8 (restated, see premise 5) | the term stops the click in the capture phase: 6/8 |
| D3 statuses | 10/10 | a copied glyph in the card: 4/10 |
| E1 kinds | 6/6 | the select restored: 0/6 |
| E2 draft | 8/8 (the send answered by a route stub: nothing written, nothing emailed) | reset on close: red, Send stays disabled after reopening |
| E3 stored and emailed | 7/7 | email awaited before the write and rethrown: 5 failed |
| E4 uid | 3/3 | `request.data` spread into the record: 1 failed |

## L1: the existing locks

Run on this build and, for comparison, on the unchanged base (`bbd9f309`), each against its own local build:
`contactV192`, `contactV191`, `qcV139`, `qcV140`, `qcV1401`, `contactV183` (the guide's own suite) and `shellMenus`. Logs in `l1/`.

| | Base | This build, first run | This build, final |
|---|---|---|---|
| Result | 74 passed, 4 failed | 55 passed, 17 failed, 6 not run | 76 passed, 2 failed; then F2 alone green |
| Reds | QC140-C3, MS3, MS4, MS15 | see below | MS15, and F2 before its fix |

**Pre-existing (red on the base):** MS15 needs references captured against main first (`MS15_CAPTURE=1`); QC140-C3, MS3 and MS4 were red on the base run and green on the final one, so they move with the account's data rather than with this pack.

**Faults of mine the existing locks caught (fixed in `8e103078`):**
- **CL191-E1** found `#qh-popovers` "painting over" the Contact list's illustration. That probe forces `pointer-events: auto` on everything to read paint order, and a transparent full-window layer counts. The layer is now a zero-size box — **a deliberate deviation from the pack's `inset: 0`**: its children are fixed to the window whatever its size, so nothing is lost and nothing covers the page.
- **CL1833-E5**: a keyboard-opened row would not close on Escape. The row's focus opens its status word's card, and the term's capture-phase Escape swallowed the key. A term inside a control now closes its card and lets the key go on.
- **CL183-F2**: pressing the pill within 380ms of closing the checklist (during the shrink) toggled it shut. A press during the shrink now keeps it open.

**Locks updated deliberately, each with its reason at the line:**
- `contactV183` F1, F4 and `qcV139` A1, `qcV140` G1: the pill reads "{Page} guide" and "{n} of {N}" (C.1); "Add an agent" is credited from an agent on file, so F2/F4's "nothing else ticked" allows it (C.5).
- `contactV183` F2, F3 and `qcV139` B1: a checklist row holds Skip and Learn more, so "the row's button" is the direct child (`> button`).
- `shellMenus` MS2: the Help menu's rows are the Page card's (no Keyboard shortcuts; the four links in order). MS3 measures the Help menu's `.hm-row`s (article rows reported as secondary). MS5 exempts the Help menu: its rows are the pack's, not the house 36px menu row; HS1-B1 holds them.
- QC140-A4 and QC140-G1 were red once on the first run and green on the final run with no change between: transient.
