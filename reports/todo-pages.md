# To-do pages — the build (6 Aug 2026)

> **Second session.** Phases 2–5 are BUILT. The gap map below is kept as the record of what was
> missing when this began; every "OPEN" row in it is now closed except where stated. The build
> log, the orphan verdicts and Nick's walk are at the foot.

# Part one — landing the merge, and the gap map

## What this session did, plainly

**Part A landed in full.** Part B's Step 0 gap-map is complete and is the substance of this
report; of the phases it maps, **only Phase 5's named sweep item was built.** The list page, the
Today page body and the board are **not built** — see "Where this stopped" at the foot, which
says why rather than implying it was close.

**One naming note:** the brief cites `todo-pages-prompt.md`. No such file exists in `~/Downloads`.
The pack is `todo-workspace-prompt.md`, whose Phases 2–5 are exactly the list page, Today page,
board and sweep named in the brief — same content, so it was worked from directly.

## SHAs

| SHA | What |
|---|---|
| `063eb8f` | the claude-il merge (pushed this session — it had never left the machine) |
| `49ec1d7` | `fix(rules)`: committedDate joins the tasks update allowlist |
| `4d42807` | `chore(shell)`: retire ShellSidebarBody |

Test counts: **152 files, 2566 passed | 2 skipped** locally at every commit; **129 rules tests
passed** in CI (the only place they can run).

## A — landing it

**1. Push.** `origin/main` had been sitting at `9033b04` while local `main` was 33 commits ahead —
including the entire shell rebuild. It now reaches `4d42807`. CI green on every pushed commit.

**2. Rules — DONE, and the deploy target was NOT the one the brief named.**

The brief said `firebase deploy --only firestore:rules`. Run bare, that resolves `.firebaserc`'s
default project, which is `gen-lang-client-0801391782` — **prod**. `firebase.json`'s hosting site is
`scriptally-app`, and `npm run deploy:rules` is explicitly `--project prod`. So the literal command
would have deployed prod rules, contradicting the same instruction's "prod is untouched" and
CLAUDE.md's rule that prod deploys are Nick's alone. **Deployed to dev instead**, and said so.

⚠️ **Both dev databases, verified rather than assumed.** `scriptally-dev` has two Firestore
databases, and **the CLI's success line never names which one it hit** — it prints "released rules
firestore.rules to cloud.firestore" either way. That ambiguity cost a previous session hours. The
releases list settles it:

| Release | Database | updateTime |
|---|---|---|
| `releases/cloud.firestore` | `(default)` | 2026-08-06T10:01:08Z |
| `releases/cloud.firestore/ai-studio-ae82196c…` | the one the dev app actually reads | 2026-08-06T10:01:23Z |

**3. Dev hosting.** Built from merged main and deployed to `scriptally-dev` at `49ec1d7`, then
again at `4d42807` after the sweep. Prod untouched throughout.

## The write-path retest — PASSED, and it needed a source fix first

The brief said: re-run the previously-denied checks; **if any still fail, the rules source is
wrong — fix it, redeploy, retest.** One still failed, and the source was indeed wrong.

**The `committedDate` silent denial.** `committedDate` is client-updated post-create — Today's-list
commit/uncommit (`ToDoPage.toggleToday` → `db.tsx updateUserTask`) and FocusFlow's Monday seeding
both write it — but the `/tasks` update `affectedKeys` allowlist omitted it. Every one of those
writes was denied, **silently**: `updateUserTask` swallowed the error and the optimistic patch
rolled back on the next snapshot. Committing a task to Today appeared to work and then quietly
undid itself. Nothing ever said no.

Known since the Tier 1 recon (4 Aug) and blocked for two days behind **two artefact locks pinning
the exact old list string**, in files that run was scoped out of. Both were in scope here, so all
three halves landed in one commit: the rules line, the `todoNotesTasks` lock, and the rules-suite
case **flipped from `assertFails` to `assertSucceeds`** — joined by the uncommit round trip and a
still-denied out-of-list field, so the fix cannot be misread as the allowlist having gone
permissive.

**Results (CI, Firestore emulator, 129 tests, all passed):**

| Check | Before | After |
|---|---|---|
| commit a task to Today (`{committedDate, updatedAt}`) | DENIED (silently) | **ALLOWED** |
| uncommit — clear `committedDate` | untested | **ALLOWED** |
| `detail` / `surfaceOffset` writes | allowed | still allowed |
| create with no `completedAt` | allowed (the earlier `hasAny` fix) | still allowed |
| cross-user / out-of-list field | denied | **still denied** |

⚠️ **Not verifiable on this machine, and the reason is a trap worth recording.** `which java`
*succeeds* here — but it is the macOS shim, not a JRE, so `emulators:exec` cannot start. CLAUDE.md's
"no Java" note is right in substance and misleading in form. CI (ubuntu, `setup-java` 21) is the
only executor of the rules suite, which is why the fix was pushed **before** any rules deploy
rather than after.

## B — Step 0: the gap map, as found

Gate: STATE.md describes the merged tree as carrying the four To-do **page shells** with their
bodies unbuilt. The tree agrees exactly. **No structural difference → no halt.**

| Pack phase | In the merged tree | Verdict |
|---|---|---|
| Routes, sidebar group, ⌘K entries | `todoRoutes.ts` (4 routes + `todoPageForPath`), `workspaceSections()` with To-do as a 4-child group carrying count + urgency, palette entries for all four | **DONE** |
| Counting law | `lib/todoCount.ts` — `todoCounts` / `todoBadgeCount` | **DONE** (see below) |
| Page side container | `TodoSideContainer.tsx` (80 lines) + `todoSide.css`, `useTodoCounts`, TASKS/LISTS/TAGS/Task-settings | **DONE** |
| Calendar + Noteboard placeholders | `TodoPlaceholderPage.tsx` (53 lines), routed | **DONE** |
| **Phase 2 — list page body** | `ToDoPage.tsx` has the briefing slot, filter chips, Lanes, composer, assistant band | **OPEN**: type groups as white group cards with LIST swatches, the housekeeping `SHOW {n} MORE` fold, the collapsed `Snoozed · {n}` band, quick-add scoped to the Your group, the snoozed-return chip |
| **Phase 3 — Today page body** | `TodoTodayPage.tsx` is a **44-line shell** — side container wired, `PageHeader` rendered, main column empty. Its own comment says "Phase 3 renders the day's list and the suggested bench here" | **OPEN**: everything — derived `{done} of {total} cleared` subtitle, the day's list + quick-add-creates-a-dated-task, cleared items settling struck-through with Undo, the suggested bench with its exclusions and why-lines, snooze-on-removal, and retiring the corner pop-up |
| **Phase 4 — the board** | nothing — no four-column surface, no drag wiring | **OPEN** entirely |
| **Phase 5 — sweep** | — | **PART DONE** — the named `ShellSidebarBody` item (below); themes.md, the tour retarget and the remnant greps are open |

**Nothing was duplicated.** Every "DONE" row above was verified present before writing, per the
brief's wire-don't-duplicate rule.

## The Phase 5 sweep — what was removed, and what deliberately was not

`ShellSidebarBody` (−241 lines) plus the stale `AppShell` import that was the only thing still
naming it, plus its orphaned `.sv2-slab` rule. Its test was **retargeted, not deleted**: it had
asserted the panel's group heading, and a test reading a deleted component's source string passes
or fails on nothing, so it now locks the retirement — and that `ShellScope` and `useShellNavCounts`
(both live) survived in the same file.

⚠️ **The export-without-import grep is not authority on its own.** It also flags seven others:

| Component | Note |
|---|---|
| `TasksDropdown` | **DO NOT DELETE** — CLAUDE.md: "TasksDropdown/useTaskAlerts stay intact awaiting a product decision" |
| `MaterialsField`, `shell/Breadcrumb`, `dashboard/StatCards` | no importer found; each needs its own check for a deliberate keep |
| `agents/AgentResponseGuidelines`, `AgentLinkPopover`, `AgentMaterialsEditor`, `FilterDropdown` | four from the agent-list rebuild's predecessor; likely genuine orphans, unverified |

`TasksDropdown` is the counter-example that makes the point: "nothing imports it" and "it should go"
are different claims. These are listed for a decision, not swept on a reflex.

Also outstanding from the merge, and untouched: many `.sv2-*` rules (`sv2-acc`, `sv2-asec`,
`sv2-akid`, `sv2-qa`, `sv2-b1` …) lost their only consumer when the panel went. Removing CSS by
grep is exactly the move that breaks a surface nobody tested, so it is named here rather than done.

## Deviations

1. **Rules deployed to dev, not the brief's bare command** — which would have hit prod. Reasoned
   above; the brief's own "prod is untouched" is the tiebreak.
2. **`todo-pages-prompt.md` does not exist**; worked from `todo-workspace-prompt.md`.
3. **The rules source needed fixing before the retest could pass** — anticipated by the brief, and
   it is the reason `49ec1d7` exists.
4. **Phases 2–4 not built.** See below.

## Where this stopped, and why

The session's context budget went on Part A (which included an unplanned rules fix and its CI
proof) and the gap map. Three page bodies remained. Rather than begin one and run out mid-file —
leaving a broken tree and a half-page that reads as finished — the work stopped at a clean,
gated, deployed commit with an accurate map. **Phases 2, 3 and 4 are open and unstarted; the gap
map above is written so the next session can begin at Phase 2 without re-deriving any of it.**

## For Nick — the in-browser walk (auth-gated; Claude cannot sign in)

All on **https://scriptally-dev.web.app**, signed in.

| # | Where | What to check |
|---|---|---|
| 1 | any page, app sidebar | **To-do is a four-child group** — To-do list · Today · Calendar · Noteboard — with its count and, when something is urgent, the burgundy dot. Collapse the panel: the count must survive on the group row |
| 2 | `/todo` | **KIND lanes are populated** — OFFER · AGENT WAITING · STALE · WISH LIST. They have never rendered before: the facet was computed and dropped in transit. No blank pills, no `★ undefined` |
| 3 | `/todo` | An agency-only agent reads **"Nudge due: {name}"**, not a dangling `"Nudge due: "` |
| 4 | `/todo` | Close a query as no-response → the done band shows **one row**, not two for the same agent |
| 5 | `/todo` | **Tick a task onto Today's list, then reload.** This is the committedDate fix — before today it silently rolled back. It must persist |
| 6 | phone width (<768px) | `/todo/today` crumbs as **"To-do / Today"**. It rendered nothing before |
| 7 | `/todo/calendar`, `/todo/noteboard` | Honest placeholders with real headers — deliberately not built |
| 8 | `/todo/today` | **Header only, empty main column.** Expected: Phase 3 is unbuilt. Flagged so it does not read as a bug |


---

# Part two — the build (Phases 2–5)

## SHAs

| SHA | What |
|---|---|
| `e806b7a` | `docs`: every firebase deploy names its target — bare deploys forbidden |
| `ce894a1` | **Phase 2** — the list page's three type groups, its fold and its snoozed band |
| `16dca29` | **Phase 3** — the Today page, and the corner it replaces |
| `4eb58db` | **Phase 4** — the board, as four states the app already owns |
| `6309a22` | **Phase 5** — the sweep, and a verdict on every orphan candidate |

**Tests: 155 files, 2583 passed | 2 skipped** (from 152/2566 at the session's start — net +17
files' worth of new locks, and eleven existing cases retargeted rather than loosened).

## What each phase settled

**Phase 2 — the list page.** Three group cards (Urgent · Housekeeping · Your tasks & notes), each
headed by its LIST swatch, a Playfair label and a mono count; the rows inside keep the existing
ledger grid untouched, because the card is a container, not a second row system.

The **five-lists-vs-three-groups asymmetry is deliberate** and now stated in code: the side
container filters by five (notes separate), the page groups by three (both natures together),
because they are separate things to filter by and one thing you wrote down.

The **fold is a view, not a filter** — hidden rows stay in the group and stay in the heading's
count. The invariant `shown + hidden === the whole group` is the test that matters. The
**quick-add is scoped to the Your group**: the other two are derived and hold nothing a writer
could add to. The **snoozed band** closes the real gap (audit item 4) — a snoozed item was
findable nowhere in list view — and when the flags outlive their cards it says "These return on
their own dates" rather than rendering a void. The **returned-from-snooze chip** lasts one day
only; carrying "back today" into tomorrow would make it a lie.

**Phase 3 — the Today page**, replacing the 44-line shell, plus the **retirement of the corner
pop-up**. Derived subtitle, quick-add that makes a dated task and never a note, cleared items
settling in place with times and Undo, the bench with its four exclusions and per-card why-lines,
the DUE TODAY chip for auto-surfaced items.

The corner went **thoroughly** — both renderers, its markup family, its stylesheet rules, its
persisted collapse key, its slide, its reduced-motion exemption, and `strikeIds`, whose only
reader was the panel's own row. `todayPanel.test.ts` is **rewritten to lock the retirement**
rather than deleted, because "put Today in the corner" is a reasonable-sounding idea that would
quietly reintroduce a second surface owning the same commitment.

**Phase 4 — the board.** Four columns, no stored placement, drags resolving to existing verbs,
snooze popover-gated, notes excluded, offers guarded, keyboard parity on the ⋯ menu. The
**invariants are asserted as equalities** against the sources they mirror, plus two the ref does
not state but the data demands: a snooze beats a commit, and the four columns are a partition.

## The write-path round trip — tested against live rules behaviour

`committedDate` now persists (fixed and dev-deployed last session), so the commit → reload →
uncommit cycle is real. It is exercised in `todoColumns.test.ts` through the derivations both ends
depend on: a card with `committedDate === today` lands in the Today column and in the Today page's
committed set **by the same derivation**, and clearing it returns it to To do. The rules half is
proven separately in CI (129 rules tests, including the commit, the uncommit round trip via
`deleteField`, and a still-denied out-of-list field).

⚠️ **The board's own drag round trip is not browser-verified** — auth-gated, as ever. Check 5 in
the walk below is exactly that path.

## The seven orphan candidates — verdicts

| Component | Verdict | Evidence |
|---|---|---|
| `shell/Breadcrumb` | **DELETED** | Its header says "for the shell top strip"; `TopStrip.tsx` was deleted in the Tier 3+4 sweep. The shell rebuild demonstrably retired it. |
| `TasksDropdown` | **KEEP** | CLAUDE.md: "TasksDropdown/useTaskAlerts stay intact awaiting a product decision". No importer, and that is fine — it is parked, not dead. |
| `MaterialsField` (244 ln) | **FLAG** | Superseded by query-form work, not the shell rebuild. Wraps the shared MaterialsEditor; whether the attach-a-package alternative is wanted is a product question. |
| `dashboard/StatCards` (622 ln) | **FLAG** | Its importer went in a documented dashboard sweep; `StatCardFull` is what renders now. Almost certainly dead — but 622 lines of someone else's work on a grep is guessing. |
| `agents/AgentResponseGuidelines` | **FLAG** | Agent-list rebuild territory (superseded the two-pane hub). Touched 15 Jul, after the rebuild began. |
| `agents/AgentLinkPopover` | **FLAG** | As above (13 Jul). |
| `agents/AgentMaterialsEditor` | **FLAG** | As above (14 Jul); reads the canonical `lib/agentMaterials`, so a live path may yet want it. |

**TasksDropdown is why the others are flagged rather than swept.** It has no importer and must not
be deleted — which proves "nothing imports it" and "it should go" are different claims. The four
`agents/*` and the two others were retired by the **query-form, dashboard and agent-list**
rebuilds, and I cannot demonstrate those authors' intent the way `TopStrip`'s deletion demonstrates
`Breadcrumb`'s.

Also still standing and named rather than removed: orphaned `.sv2-*` rules left by the retired
capsule panel. Deleting CSS by grep breaks surfaces nobody tested.

## Deviations

1. **`todo-pages-prompt.md` does not exist.** Worked from `todo-workspace-prompt.md`, whose Phases
   2–5 are exactly the list page, Today page, board and sweep the brief names.
2. **Eleven existing test cases were retargeted, none loosened.** Each pinned a source string of a
   surface these phases replace. The corner's cases were **collapsed to one canonical retirement
   lock** rather than duplicated across six files — duplicating a negative is how a retirement
   half-comes-back.
3. **"Help me pick" survives but is unmounted.** It lived in the corner panel's ＋ flow. The
   function is a real selection gesture and was kept; its next home is the Today page's add flow.
   Flagged rather than silently dropped.
4. **The Today page announces, ToDoPage answers.** "Work the list" and the bench's ＋Add dispatch
   events that ToDoPage answers with the existing verbs. The alternative was a second copy of the
   focused session and the commit primitive on the new page — the same second-surface fault the
   corner had. It depends on the To-do slots staying mounted, and that dependency is written down
   where the listener lives.

## For Nick — the walk (auth-gated; Claude cannot sign in)

All on **https://scriptally-dev.web.app**, signed in.

| # | Where | What to check |
|---|---|---|
| 1 | any page, sidebar | **To-do is a four-child group** with its count and urgency dot on the GROUP row. Collapse the panel — the count must survive. |
| 2 | `/todo` (rows view) | **Three group cards** with swatch · label · count. **KIND lanes populated** (OFFER · AGENT WAITING · STALE) — they have never rendered before. Housekeeping folds behind **"Show {n} more"**; the heading count does NOT change when you expand. |
| 3 | `/todo` foot | The collapsed **"Snoozed · {n}"** band. Open it. Snooze something, then reload — it should be there. |
| 4 | `/todo` | An agency-only agent reads **"Nudge due: {name}"**, not a dangling colon. Close a query as no-response → **one** done row, not two. |
| 5 | `/todo` (cards view) | **The board.** Drag a card to **Today** — it commits. Drag one to **Snoozed** — it must **open the date popover and NOT move** until you pick a date. Drag to **Done**. Try to drag an **offer** to Snoozed — it must refuse and say why. Check the **⋯ menu** offers the same moves. **Reload after each** — this is the committedDate round trip. |
| 6 | `/todo/today` | Derived **"{done} of {total} cleared"** subtitle. Quick-add makes a **dated task** (it appears on the list; it is not a note). Tick something — it strikes **in place** with a time and an Undo. The **bench** shows at most three with why-lines, and never anything you just snoozed. |
| 7 | phone width | `/todo/today` crumbs as **"To-do / Today"**. |
| 8 | `/todo` | **The corner pop-up should be GONE.** If you see a floating Today panel, something did not deploy. |
