# Noteboard build — from the approved mockup

Run started 22 Aug 2026. Tree `/Users/nickphysick/ScriptAlly-app`, branch `main`, level with
`main` (`git rev-list --count HEAD..main` = 0), 6 commits ahead of `origin/main` at Step 0.
Commit only; nothing pushed, nothing deployed.

---

## 1 — Premises that turned out false

This section is written first because it is the most valuable part of the run. Eight assumptions
in the prompt were contradicted by the repo. Each is stated as **the premise**, **the reality**,
and **what I did instead**.

### 1.1 — "Notes that are not tasks appear nowhere else in the app. No To-do row."

**Reality: false, and deliberately so.** `assembleBoardColumns` (`src/lib/todoBoard.ts:517`) maps
*every* non-done `UserTask` to a board card, dated or not. `userCard` (`:387`) branches on
`isTask = !!t.dueDate` and gives a dateless note `stream: "nt"`, `kind: "NOTE"`,
`record: "Your note"`, `due: "PINNED {date}"`. A note therefore already has a To-do row, in the
"Notes to self" lane. That is the shipped notes-and-tasks two-natures design, not an oversight.

**What I did:** left it alone. Making the premise true would mean editing the To-do board to
delete a shipped lane — far outside this scope, and a feature deletion dressed as a fix. The
consequence for Phase 6 is recorded in 1.3.

### 1.2 — "A note is never destroyed by becoming a task. The task is a projection."

**Reality: the app's law is the exact opposite, and it is a ⚠️ law in two places.**
`TodoNoteboardPage.tsx`'s own header says:

> ⚠️ THE DATE IS THE DOOR. "Give it a date…" converts a note to a task with ONE write (dueDate):
> it leaves this board, joins the To-do list's Your-tasks group and appears on the Calendar —
> **one object, three rooms. Nothing copies, nothing moves.**

`isNoteTask = (t) => !t.dueDate && !t.done` (`todoBoard.ts:35`). Dating a note removes it from the
Noteboard by construction. The mockup's model — note stays, task appears — requires **two
documents**, which is a different model, not a different rendering of the same one.

**What I did:** built the projection as the prompt specifies (two documents), and **retired
"Give it a date…"** so the app does not ship two contradictory doors to the same place. The
retirement is the honest half of the change: leaving both would give one note two conversion
mechanisms with opposite semantics. Recorded in full at Phase 6.

### 1.3 — "…and the note stays on the board" (the duplicate this creates)

Following from 1.1 and 1.2 together: because a dateless note *already* has a To-do row, a note
that projects a task now produces **two rows on the To-do board** — the note ("Your note",
PINNED) and its task ("Your task", due). Under the one-object law there was only ever one.

**What I did:** shipped it and flagged it. Suppressing the note's own card would mean editing
`todoBoard.ts`, and the prompt's stated intent is "zero edits to the To-do and Calendar surfaces".
The duplicate is a real consequence of the projection model and is Nick's call, not mine.

### 1.4 — "store the task reference on the note"

**Reality: a stored reference cannot ship in this run.** `firestore.rules:410` validates
`userTasks` with `data.keys().hasOnly([...])` — a closed allowlist with no reference field — and
the update rule additionally gates `affectedKeys().hasOnly([...])`. An unlisted key does not
degrade: on **create** it denies the whole document, so pinning a note would fail outright. And
this prompt forbids deploying, so a rules edit cannot be made live.

**What I did:** made the link **derived, not stored** — the projected task takes the id
`notetask-{noteId}`. The note has a task iff that document exists and is not done. `addUserTask`
already accepts a caller-supplied id, `isValidId`'s `^[a-zA-Z0-9_-]+$` is satisfied by a task id,
and no schema, no rule and no deploy is involved. This is strictly better than the prompt's
version and is what the house derived-over-stored law asks for anyway.

### 1.5 — Note colour: the field genuinely does need a rules deploy

`colour` is *input*, not derivable, so 1.4's trick does not apply. It needs a real field, which
needs the same closed allowlist opened, which needs a deploy this run may not do.

**Two things the repo supplied that the prompt did not know about.** First, the type already
exists: `NoteColour = "pink" | "sage" | "yellow"` (`types.ts:598`) — *exactly* the mockup's three
colours. I reused it rather than declaring a parallel union. Second, there is a **second, live
notes store** — `users/{uid}/notes`, the `Note` type (`types.ts:600`), which already carries
`colour` and whose rules already permit it on create and update (`firestore.rules:719-724`). That
is the dashboard post-it store, consumed by `Dashboard.tsx` via `addNote`/`updateNote`. The two
note stores have never been converged (a known queue item).

**What I did:** stayed on `userTasks` — moving the Noteboard to the `notes` store would sever the
task conversion entirely, since nothing in `assembleBoardColumns` reads that store. Landed
`colour` as an additive optional field, **edited `firestore.rules` and did not deploy** (the house
pattern used for `pinned`, `country`, `homeCountry` and `hasSeenTour`), and made the write path
degrade rather than break: **colour is never sent on create.** The note is created plain — which
always succeeds — and the colour follows as a separate write. Until the rules deploy lands, that
second write is denied and the note renders yellow; the swatch reports the failure rather than
silently doing nothing, so it is not a dead control. The day the rules deploy, colour works with
no code change.

### 1.6 — "Port the mockup's page chrome: MountPanel → frame → sage band"

**Reality: the page already has chrome, and it is not the page's to draw.** `TodoNoteboardPage`
renders inside `TasksPageLayout` → `WorkspacePageGrid` → `PageHeader variant="workspace"` — the
pinned masthead shared by nine pages (plate 128 · illustrated mark 88 · Playfair 38 title · 44px
gap), governed by `workspacePageGrid.css`, **which is on the do-not-touch list**, and measured by
`serifClip`, `gapAudit` and `stickyRow`. The mockup is a standalone HTML file with
`body{padding:28px 32px}` and its own `.mount`; its author drew the whole page including chrome
the app already provides. Porting it wholesale gives **two mastheads**.

**What I did:** kept the chassis and ported the mockup's *content* — toolbar, board, note cards,
composer, menus, popover, drawer — class for class. The band's three pieces were rehomed rather
than dropped: the title is already the masthead's, the subtitle went into the masthead's
`description`, verbatim, and the count went to the tool row.

### 1.7 — "band count on the right" — there is no count slot, and its deletion was deliberate

`PageHeaderProps` (`PageHeader.tsx:85`) says so in as many words:

> ⚠️ THERE IS NO `count` PROP — the slot is DELETED from the variant (amendment 7), not merely
> unused. The two pages that had one had their figure REHOMED rather than dropped.

**What I did:** rehomed it the same way, to the tool row — which is also what
`TasksPageLayout`'s own docstring prescribes ("the plate carries identity while the tool row
carries tallies and context"). Copy is the mockup's verbatim `{n} notes pinned` / `1 note pinned`.

### 1.8 — "Where the mockup's class name collides with an existing app class, prefix with `nb-`"

**Reality: `nb-` is already this page's own prefix** — `.nb-grid`, `.nb-note`, `.nb-add`,
`.nb-search`, `.nb-empty` and more are in `todoNoteboard.css` today, and four other test files
lock them by name. The instruction's escape hatch collides with the thing it was escaping.

**What I did:** kept `nb-` (this is a rewrite of that page's own stylesheet, not an addition
beside it) and mapped each mockup class onto an `nb-` name, listed at Phase 3. Where an existing
`nb-` class is referenced from **outside** this page — `.nb-tagwrap`, which lives in
`taskChrome.css` and is shared with the To-do list — I left it untouched.

### 1.9 — Tags: free text vs. a stored taxonomy restored yesterday

The prompt bakes "Tags are free text, one per note, optional… never a stored taxonomy." The app
has a stored taxonomy: `TagDef`s on the user document, with colours from `TAG_PALETTE`, a
`TagPicker`, and `useTagWrites`. Tag management was **restored on 21 August** after an earlier
change silently took it offline.

**What I did:** split the sentence. The **chip row is derived** from the tags actually in use on
notes — `#All` then alphabetically, never a stored list, exactly as asked. The **composer's `#tag`
input accepts free text** and routes it through the existing `createTagDef`, so a typed tag
becomes a real `TagDef` instead of an untracked string. One taxonomy, free-text feel, no
regression to a feature that was offline once already.

### 1.10 — "content ported verbatim from the mockup's EXAMPLES array"

**Reality: one word could not be ported.** The ref writes *"Heard [agent] on [podcast] — **she's**
hunting locked-room mysteries"*. An agent is a real person whose pronouns this app never stores,
and the rule against guessing names **example and placeholder text explicitly**. Shipping it
verbatim would have shipped a rule violation.

**What I did:** it reads "they're", and the module **declares** the difference
(`NOTE_EXAMPLE_DIVERGENCES`, with its reason). The lock re-parses the ref on every run and permits
exactly that one divergence, refusing every other drift — so the ref stays the authority for the
words without the port carrying the fault.

**And the second pronoun in that file stays**, which is the part worth reading twice. *"the sister
who stopped believing in **her**"* is a one-line pitch for an **invented novel** — the writer's own
words about a character, the same carve-out that protects the loglines in `seeds.ts`. A regex sweep
hits both matches; only one is about a person the app is describing. The lock asserts that shape
rather than banning the word.

---

## 2 — Recon findings (Step 0)

### 0.1 — Mockup

Not in `design-refs/`. Found at `~/Downloads/noteboard-mockup.html`, 463 lines,
sha256 `acff0573f0f5007a7d75e82be3195feae14baecfe88cc9bbec6aa85a8bade8f4`. Installed to
`design-refs/noteboard-mockup.html` and committed alone as **`e975dbda`** — one file, verified
with `git show --stat`.

### 0.2 — Existing Noteboard surface

| | |
|---|---|
| Page component | `src/components/todo/TodoNoteboardPage.tsx` (371 lines) |
| Route | `/todo/noteboard` — `App.tsx:712`, via `todoPageForPath` (`lib/todoRoutes.ts:42`) |
| Page CSS | `src/components/todo/todoNoteboard.css` (87 lines) |
| Data model | `UserTask` at `users/{uid}/tasks/{id}`; a **note** is a `UserTask` with no `dueDate` and not done (`isNoteTask`, `todoBoard.ts:35`) |
| Stored fields used | `text`, `detail`, `createdAt`, `tags` (array of `TagDef` **ids**, not free text), `dueDate` |
| Colour | **not stored** — every note renders butter `#fdf6e3` |
| Tag | **not** a single free string — `tags?: string[]` referencing user `TagDef`s |
| Pinned order | **not stored** — the list is sorted `createdAt` descending |
| Writes | `addUserTask` / `updateUserTask` / `deleteUserTask` in `src/lib/db.tsx` |
| Column toggle | exists — `const [column, setColumn] = useState(false)`, local state, class `nb-grid.column`, labelled "Read as a column" |

### 0.3 — Manual task primitive (the load-bearing gate)

**A manual task exists.** Type `UserTask`; store `users/{uid}/tasks`; write path
`addUserTask({ text, dueDate, … })` in `db.tsx:2493`, which accepts `dueDate` at creation.

**Pick-up is automatic, with zero edits to either surface.**
`assembleBoardColumns` (`todoBoard.ts:517`) consumes `input.userTasks` wholesale and routes by the
card's own facts — `promoted ? "do" : "nt"` from `dueDate` + `taskDueState`. `TodoCalendarPage.tsx`
feeds the same `assembled` (`:368`) and passes `userTasks` through at `:428`. Neither filters to
query-derived families; `todoFamily.ts` is not in the path for user tasks.

**Gate verdict: not red.**
- "No manual-task concept exists" — false, it exists.
- "Would require editing `TodoCalendarPage.tsx` / `todoBoard.css` / `todoFamily.ts` / Query Centre"
  — no. A second `UserTask` carrying a `dueDate` is picked up by both surfaces untouched.

The two problems that *did* surface are schema-shaped, not surface-shaped, and are resolved in
1.4 (derived link, no field) and 1.5 (colour, rules edited-not-deployed).

### 0.4 — Receipts

`useTodoToast` is already extracted to `src/components/todo/useTodoToast.ts` and is already
imported by this page. Its docstring states it was extracted precisely so four Tasks pages could
share one toast. **No coupling, no extraction needed.**

### 0.5 — Baseline

`npx vitest run` — **364 test files, 6198 passed, 2 skipped, 0 failed** (24.3s). Fully green;
that is the bar. Playwright targets are named explicitly (`SA_E2E_BASE_URL` throws when unset —
`playwright.config.ts:52`); `.env.local` and `tests/e2e/.auth/state.json` are both present.

### 0.6 — Push state

`git log --oneline origin/main..main | wc -l` = **6** at Step 0. Not pushed.

---

## 3 — Phase by phase

Nine commits, each staged by explicit path. Every probe was written first and run against `HEAD`
to confirm it failed on its **assertions** (not merely on a missing import) before implementation.

### P0 — the mockup · `e975dbda`
`design-refs/noteboard-mockup.html`, one file, verified with `git show --stat`.

### P1 — shell and tokens · `8f11e1dd`
`src/lib/noteboard.ts` (new) · `noteboardChrome.test.tsx` (new) · `TodoNoteboardPage.tsx` ·
`todoNoteboard.css`

The band is **rehomed, not drawn** (see 1.6/1.7). Subtitle verbatim into the masthead's
`description`; tally into the tool row's `eyebrow`. `pinned` and `notes` became two lists — a count
from the filtered view would state that searching had unpinned things. One token set at the top of
the sheet, with the nine surviving chrome rules repointed onto it, because a token block nothing
reads is the "looks parameterised and isn't" fault. Five hexes read the app's own tokens; **sage is
the deliberate exception** — `index.css` locks `--sage/--sageC/--sageD` to StatusDots.

**Probe: 5 red against HEAD** (of the 8 cases as first written) **→ 9/9 green** after the token
assertion was tightened to enforce rule 8. The count is measured at three volumes and must produce three
distinct strings; a count asserted once collapses to one value and proves nothing.

### P2 — the note model · `7028e944`
`types.ts` · `db.tsx` · `firestore.rules` · `noteboard.ts` · `noteboardModel.test.tsx` (new) ·
`TodoNoteboardPage.tsx` · `todoNoteboard.css` · `todoNotesTasks.test.ts`

`colour?: NoteColour` — reusing the union that already existed. **Never sent on create**; the note
is written plain and `setUserTaskColour` follows, returning whether it landed. Absence is yellow at
the READ, so the default and the denied-write fallback are one rule. Rules **edited, not deployed**.
`todoNotesTasks.test.ts` pins the update allowlist as an exact string on purpose — updated to the
new correct list rather than loosened.

**Probe: 5 of 6 red → 6/6 green.** The default is measured across three inputs and must give three
answers, or it cannot tell a working derivation from `return "yellow"`.

### P3 — board and note card · `74f683c9`
`TodoNoteboardPage.tsx` · `todoNoteboard.css` · `noteboardCard.test.tsx` (new) ·
`tasksNoteboard.test.tsx` · `tasksViewport.test.tsx` · `todoPageSmoke.test.tsx`

Ported class for class: `.board`→`.nb-board`, `.note`→`.nb-note`, `.note-body`→`.nb-body`,
`.note-foot`→`.nb-foot`, `.note-tag`→`.nb-tag`, `.note-date`→`.nb-date`, `.ghost`→`.nb-ghost`. One
pre-wrap body; `detail` still renders for notes written under the old split. Hover is a shadow —
never a lift, which shears a card's top edge against a masonry column. The reserved corner retired
because the ⋯ joined the foot in flow; `todoBoard.css` overridden page-side, not edited.

**Probe: 7 of 8 red → 8/8 green.** The foot's **order** is read off the composed card — three
separate queries each return the right string while the elements render as one collapsed run.

### P4 — composer, edit-in-place, remove + undo · `b736ef85`
`noteboard.ts` · `db.tsx` · `TodoNoteboardPage.tsx` · `todoNoteboard.css` ·
`noteboardCompose.test.ts` (new) · `tasksNoteboard.test.tsx`

**The probe found a real pre-existing bug.** The undo re-created a removed note through
`addUserTask({ id, text, detail })`, and `addUserTask` stamps `createdAt: now` — so Undo returned
the note to the **top** of the board rather than to its slot, and dropped its tags. Nothing failed
and nothing logged. Comparing the whole ordered sequence is what caught it; "is the note present"
passes on every one of those cases. `noteRestoreFields` captures before the delete, and its
coverage is asserted against the note's **own keys** so a field added later fails the test.

One host per job: the composer pins, the card edits. An empty commit keeps the words. The
free-text `#tag` mints through the app's own `newTag`/`createTagDef`.

**Probe: 5 of 7 red → 7/7 green.**

### P5 — the tool row · `3429d7cd`
`noteboard.ts` · `TodoNoteboardPage.tsx` · `todoNoteboard.css` · `noteboardToolbar.test.tsx` (new) ·
`tasksNoteboard.test.tsx` · `tasksTags.test.tsx`

Derived chips replace the taxonomy dropdown, which offered tags the writer had defined and never
applied — a filter that can only return nothing. Chips read `pinned`, not `notes`, or they would
vanish as you used them. Board/Column segmented toggle. The empty-search line is **conditionally
rendered, never `hidden`** — the UA sheet's `[hidden]{display:none}` loses to any author display
rule.

**Probe: 6 of 7 red → 7/7 green.** The chip case seeds tags out of order, one used twice, one never
applied — three properties in one list — and reads the rendered row's order off the row.

### P6 — turn into a task · `2887de0e`
`noteboard.ts` · `todoMenu.ts` · `db.tsx` · `TodoNoteboardPage.tsx` · `todoNoteboard.css` ·
`noteboardTask.test.ts` (new) · `tasksNoteboard.test.tsx` · `tasksTags.test.tsx`

The projection, with the derived link (1.4). `give-date` retired and removed from `MenuItemId`.
**Zero edits to the To-do and Calendar surfaces** — the probe asks `assembleBoard` and
`cardActionYmd`, the real selectors, rather than re-querying the store. Tags travel, so the
retired lock's claim survives against the new mechanism.

**Probe: red (module absent) → 7/7 green.**

### P7 — the Examples drawer · `776cdea8`
`noteboard.ts` · `noteboardExamples.ts` (new) · `noteboardExamples.test.ts` (new) ·
`TodoNoteboardPage.tsx` · `todoNoteboard.css`

The data module was **generated from the ref's own `EXAMPLES` array**, and the lock re-parses that
array out of the ref on every run — "verbatim" is mechanical, not eyeballed. One declared
divergence (1.10 below). Using an example seeds and writes nothing, asserted over all nine.

**Probe: 3 of 6 red → 6/6 green.** The three that passed first time are the ref comparisons —
green because the extraction was mechanical, which is the point of doing it that way.

### P8 — sweep, measurement, and two real faults · `3531bc39`
`TodoNoteboardPage.tsx` · `todoNoteboard.css` · `noteboardCard.test.tsx` ·
`noteboardChrome.test.tsx` · `tests/e2e/noteboardLook.measure.ts` (new) ·
`noteboardShot.measure.ts` (new) · `seedNotes.mjs` (new) · two screenshots

See section 4. Sweep: 31 tokens read, **0 dangling**, 0 `var()` fallbacks on undefined tokens, no
`display:contents`, no `mix-blend-mode`, no transform on a note. Two dead things removed.

---

## 4 — The two faults the measurement found, and what each one teaches

Both are recorded here rather than only in the commit because both are **general**, and neither was
visible to any check this build had already written.

### 4.1 — Source order beat specificity, and every lock was green

`.nb-c-yellow/pink/sage` were declared **above** `.nb-note`. They land on the same element at the
same specificity (0-1-0), so the later rule wins — and `.nb-note` says
`border: 1px solid transparent`. **All three papers rendered with an invisible border.** Every rule
read correctly on its own; the Phase 3 lock asserted those exact declarations exist and passed.
Only the computed value could tell them apart. The rules moved below `.nb-note`, and a source-order
lock now keeps them there.

### 4.2 — A token DEFINED somewhere is not a token IN SCOPE where it is read

The Examples drawer, its scrim and the task popover render **outside** `.nb-scope` — they are
siblings of the page body, not children of it. At their use site every `var(--nb-*)` was undefined,
so each declaration reading one was silently dropped and **the drawer rendered fully transparent
with the board showing through its text**.

The dangling-token sweep was clean and correct, and could not have caught this: it asks whether a
definition **exists**, and the question here is whether it exists **at the use site**. Six passing
geometry measurements never looked at the drawer. **The screenshot did.**

Three things now cover it: the sweep (unchanged), a lock requiring every floating surface to carry
the scope itself, and a measurement of the drawer's computed background.

### 4.3 — A number true about the probes and false about the board

The masonry check counted columns over the seeded probe notes and reported **two** on a board that
had **three** — column one held the ghost tile and the pre-wrap pair, which the filter excluded.
True about what it measured, false about what it named. It counts every card now and asserts
exactly 3.

### Measured results (local dev build, 1440 and 1920, scrollbar 0px)

| Claim | Reading |
|---|---|
| masonry columns | 3 at x=297/660/1022 (1440) · 3 at x=297/820/1342 (1920) |
| card heights | 4 distinct over 6 seeded notes; 0px horizontal overflow |
| pre-wrap | identical characters one newline apart → **125px vs 98px** |
| hover | y 409 → 409, `transform: none`, box-shadow changed |
| three papers | 3 distinct backgrounds **and** 3 distinct borders, none transparent |
| overlap (board) | 17 text leaves, 0 intersections |
| overlap (drawer) | 27 text leaves, 0 intersections |
| drawer opacity | `rgb(253, 250, 245)`, 9 examples, first example `rgb(251, 243, 217)` |

**⚠️ What the papers measurement does not prove**, stated in the file itself: that a note *wearing*
a colour renders it. `colour` is not in the deployed ruleset, so no seeded note can carry one. It
proves the three rules resolve to three distinct fills in the real cascade with the real tokens.
The other half needs one dev rules deploy.

---

## 5 — Degraded, deviated, or left undone

Nothing in the eight phases was skipped. Five things are narrower than the instructions asked, and
each says why.

1. ~~**Note colour does not work until one dev rules deploy lands.**~~ **— DONE, 22 Aug.**
   See section 7. Colour is live on dev: `pink` is accepted, `chartreuse` is refused, and three
   notes wearing three stored colours render as three on the deployed site.

2. **The band is not built** (1.6/1.7). The page keeps the shared pinned masthead; the band's three
   pieces are rehomed. Phase 1's specified probe — the band's fill reaching the frame's inner edges
   — has no subject, so it was not written as a vacuous pass. What replaced it is asserted instead.

3. **The mockup's swatch strip is not in the kebab menu.** `PortalMenu` renders a pure leaf model
   with no custom-row slot, and adding one means editing a component the To-do board depends on.
   The swatches live in the composer. Recolouring an existing note is therefore not currently
   possible — **this is the one place the build is short of the design**, and the fix is either a
   swatch row on the card during in-place edit (cheap, page-local) or a new `MenuEntry` kind
   (better affordance, shared-component risk). Nick's call.

4. **A note that projects a task now has two rows on the To-do board** — its own ("Your note",
   PINNED) and its task ("Your task", due). This falls out of 1.1 and 1.3 together and is a real
   consequence of the projection model. Suppressing the note's card means editing `todoBoard.ts`,
   which the stated intent forbids.

5. **Three tag surfaces now exist** where the retired lock wanted one grammar: the sidebar's TAGS
   section (multi-select with counts), the Noteboard's derived chip row, and the composer's
   free-text input. All three read the same defs and the same palette, so a tag is one thing with
   one name and one colour everywhere — but the *shapes* differ, and that is worth a decision.

### Open questions for Nick

- **Does the duplicate To-do row (5.4) want fixing?** If so it is a `todoBoard.ts` change and
  should be scoped separately.
- **Where do the note colour swatches belong (5.3)?**
- **The two note stores are still unconverged.** `users/{uid}/notes` (dashboard post-its, with a
  deployed `colour` field and three colours) and `users/{uid}/tasks` (this board). The Noteboard
  now has a `colour` of its own on the second store, which makes the divergence slightly wider,
  not narrower. Converging them was well outside this scope.
- **Prod rules** are unchanged and now one further commit behind dev's file.

### Housekeeping done

The eight seeded probe notes were deleted from the dev harness account
(`node tests/e2e/seedNotes.mjs --clean`), the measurement worktree was removed, and its copies of
`.env.local` / `.env.development` / `tests/e2e/.auth/state.json` went with it. The preview server
is stopped.

---

## 6 — Baseline vs final, and the do-not-touch check

### Test counts

| | Test files | Tests |
|---|---|---|
| **Baseline** (Step 0, 10:06) | 364 passed | 6198 passed · 2 skipped · **0 failed** |
| **Final** | 370 passed · 1 failed | 6286 passed · 2 skipped · **1 failed** |

**The one failure is not mine, and it is not a regression.** `src/lib/queriesMobile.test.ts` reads
`src/components/Queries.tsx`, which another session has 178+ lines of uncommitted work in. Proven
rather than assumed: the same test **passes 9/9** in a clean worktree at my own HEAD. `tsc --noEmit`
over the whole repo is **silent**.

Running only the trees this build touches:

```
npx vitest run src/components/todo src/lib
→ 272 files, 4744 passed, 2 skipped, 0 failed
```

Seven new test files (`noteboardChrome`, `noteboardModel`, `noteboardCard`, `noteboardCompose`,
`noteboardToolbar`, `noteboardTask`, `noteboardExamples`) and one new Playwright file
(`noteboardLook.measure.ts`, 8 cases) account for the growth.

### ⚠️ Another session is working in this checkout

Discovered at Phase 1 and noted rather than halted on, per the run's rules. It committed a Calendar
pack (`55254151`, `1c0a4e20`, and more) at 10:10 and has since moved to `Queries.tsx`,
`MarkSentPopover.tsx`, `TasksPopover.tsx`, `F12Shell.tsx` and `f12.css`. This violates the house
"one active session per working tree" rule and had three consequences worth recording:

- The **baseline moved under the run** — green at 10:06, three failures minutes later, none mine.
- Every gate reading had to be **attributed** before it was believed. Each time, I confirmed the
  failing assertion named a file I had not touched.
- The geometry pass was done in a **detached worktree at my own HEAD**, which also gave it a tree
  free of their broken intermediate states.

### Do-not-touch verification

Every file across all nine commits:

```
design-refs/noteboard-mockup.html
firestore.rules
reports/noteboard/board-1440.png
reports/noteboard/drawer-1440.png
src/components/todo/TodoNoteboardPage.tsx
src/components/todo/noteboardCard.test.tsx
src/components/todo/noteboardChrome.test.tsx
src/components/todo/noteboardCompose.test.ts
src/components/todo/noteboardExamples.test.ts
src/components/todo/noteboardExamples.ts
src/components/todo/noteboardModel.test.tsx
src/components/todo/noteboardTask.test.ts
src/components/todo/noteboardToolbar.test.tsx
src/components/todo/tasksNoteboard.test.tsx
src/components/todo/tasksTags.test.tsx
src/components/todo/tasksViewport.test.tsx
src/components/todo/todoNoteboard.css
src/components/todo/todoNotesTasks.test.ts
src/components/todo/todoPageSmoke.test.tsx
src/lib/db.tsx
src/lib/noteboard.ts
src/lib/todoMenu.ts
src/types.ts
tests/e2e/noteboardLook.measure.ts
tests/e2e/noteboardShot.measure.ts
tests/e2e/seedNotes.mjs
```

Filtering that list for `TodoCalendarPage` · `todoBoard.css` · `todoFamily.ts` · `calLook` ·
`FocusFlow` · Query Centre · `StatusDot` · `MountCard`/`MountPanel` · `workspacePageGrid` ·
Analytics · Submission Packages · `#/pkg-lab` returns **nothing**. `src/lib/todoBoard.ts` was
**read** (for `isNoteTask` and `assembleBoard`) and never written. `types.ts` and `db.tsx` are
append-only: one optional field, one new function, two widened optional parameters.

Six existing lock files were edited, every one because this build retired or moved what it
asserted, and each edit states the reversal in place rather than loosening the assertion:
`tasksNoteboard`, `tasksTags`, `tasksViewport`, `todoPageSmoke`, `todoNotesTasks`, and
`src/lib/todoMenu.ts`'s `MenuItemId` union.

### Commits

`e975dbda` (ref) → `8f11e1dd` P1 → `7028e944` P2 → `74f683c9` P3 → `b736ef85` P4 → `3429d7cd` P5 →
`2887de0e` P6 → `776cdea8` P7 → `3531bc39` P8. Nothing pushed, nothing deployed.

---

## 7 — Dev deploy (22 Aug)

Asked for after the build. **Rules and hosting were deployed as two separate acts** — they have
separate blast radii, and the house rule forbids folding hosting into a rules deploy.

### Pre-flight

- `git fetch`; **0 behind** `origin/main`, 25 ahead. A behind-main deploy looks exactly like
  another stream's feature having been reverted, which has cost a session before.
- `src/` clean — the other session had committed its Query Centre work by then, so the bundle
  carries only committed code.
- `firestore.rules` grepped for what the deploy was meant to carry: the `isValidUserTask`
  allowlist (:410), the value-shape clause (:427) and the **tasks** update `affectedKeys` (:752).
  All three present. (:395 and :731 are the separate post-it `notes` store, untouched.)
- **`rulesProbe.mjs` gained a `colour` case** and was run *before* the deploy, so the change has a
  before as well as an after. Pre-deploy: a plain note create **ACCEPTED**, `colour: "pink"`
  **DENIED** — exactly as the build report predicted.

### Targets, named explicitly

`.firebaserc`'s `default` is `gen-lang-client-0801391782` — **prod**. Every command therefore named
its project. And `firebase.json`'s hosting site is `scriptally-app`, also prod, which is why the
second rules command stays `--only firestore:rules`.

Both dev databases were deployed, per the dual-DB trap:

```bash
firebase deploy --only firestore:rules --config firebase.dev.json --project scriptally-dev
firebase deploy --only firestore:rules --project scriptally-dev
```

**Verified by release `updateTime`, never by the success line** — which reads "released rules
firestore.rules to cloud.firestore" and names no database at all:

| release | ruleset before → after | updateTime |
|---|---|---|
| `cloud.firestore` (default) | `ab1a8c56` → `1cb74970` | 2026-08-22T10:03:45Z |
| `cloud.firestore/ai-studio-ae82196c…` | `ab1a8c56` → `27e75018` | 2026-08-22T10:04:05Z |

### Hosting

`npm run build:dev` — output read in full and grepped for `error|[WARNING]|css-syntax`, **not
tailed**: clean, `✓ built in 11.75s`. `assert-build-target.mjs` confirmed *"bundle targets
scriptally-dev (dev); gen-lang-client-0801391782 absent."*

```bash
firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev
```

176 files → **https://scriptally-dev.web.app**

### Verified after

The build ran between the rules deploy and the probe, so propagation had minutes rather than
seconds — an impatient probe reports a false denial, and that asymmetry looks exactly like a rule
written wrong.

- `rulesProbe.mjs`, full run: **23 attempts, every one as expected.** `colour: "pink"` flipped
  DENIED → **ACCEPTED**; `colour: "chartreuse"` is **DENIED**, so the value is bounded rather than
  free text. Nothing else moved.
- `noteboardLook.measure.ts` against **`SA_E2E_BASE_URL=dev`** (the deployed site, not a local
  preview): **9/9**, including the case that could not exist before —

  > **⚠️ a note WEARING a colour renders it.** Three notes with three stored colours:
  > yellow `rgb(251,243,217)`, pink `rgb(245,226,218)`, sage `rgb(233,237,230)`, each carrying
  > its own `nb-c-*` class, each border distinct. The cascade case proved the three RULES
  > resolve; this proves the DATA reaches them, which is the claim that matters to a writer.

  The seeder writes colour the way the app does — **plain create, then the colour as its own
  update** — because a create carrying it would be denied whole on any database whose rules
  predate the field.

The eleven probe notes were deleted afterwards (`node tests/e2e/seedNotes.mjs --clean`).

### Still Nick's

**Prod rules are unchanged** and now one commit further behind dev's file. Nothing was pushed.
