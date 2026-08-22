# Calendar — drag, expected dates, month jump, feed + two fixes

**Session:** `calendar` · 22 Aug 2026, overnight, unattended.
Ref: `design-refs/calendar-proposals-v6.html` (four of its seven proposals built; the toggle strip
is demo chrome and ships nowhere).

> # ⛔ NOT DEPLOYED — condition 4 of the standing rule.
>
> **Everything else passed.** `tsc` **0 in owned files**, own suites green, production and dev
> builds exit 0 with the target guard naming `scriptally-dev` and the prod id absent, and the full
> Phase 6 acceptance passed at **1000 / 1440 / 1920** against a local preview.
>
> **What failed:** the noteboard session is mid-edit and **five of its source files are
> uncommitted**, including the shared `src/types.ts`:
>
> ```
>  M src/components/todo/TodoNoteboardPage.tsx      M src/lib/noteboard.ts
>  M src/components/todo/todoNoteboard.css          M src/types.ts
> ?? src/components/todo/noteboardExamplePapers.test.tsx
> ```
>
> Their in-flight state also accounts for the tree's only red (`todoPageSmoke` — the Noteboard's
> own render smoke) and both `tsc` errors (`TodoNoteboardPage.tsx`). **The calendar work is
> committed, measured and ready.** `npm run build:dev && firebase deploy --only hosting --config
> firebase.dev.json --project scriptally-dev` once they have committed — or now, if you are content
> to carry their in-flight state.

---

## What landed

| Phase | Commit | What |
|---|---|---|
| 1 | `7e0f3b58` · `0e3cea64` | the v6 ref · the two fixes |
| 2 | `a672371e` | drag your own tasks |
| 3 | `bd10cb66` | expected dates |
| 4 | `409e4490` | the month jump |
| 5 | — | **not built — blocked at question 2** (below) |
| 6 | `3c7149aa` | the acceptance |

**The cushion is untouched: 4 / 4 / 4 at 1280 / 1440 / 1920**, `data-fold-short` absent in every
state measured. The peek is portalled; the new pills are the same box as every other pill.

---

## Phase 5 — the calendar feed: **blocked, and the blocker is question 2**

The pack said stop if any answer is uncertain. Answers:

| | |
|---|---|
| **1. Blaze + functions v2?** | Functions exist (`functions/src/`, twenty modules) and `firebase.json` declares them. **Not conclusively established from the repo alone** — nothing in the tree proves the billing plan. |
| **2. What authenticates the feed?** | **NOTHING EXISTS.** A sweep for `icsToken\|feedToken\|calendarToken\|shareToken\|apiToken\|publicToken` across `src/`, `functions/src/` and `firestore.rules` returns **zero matches**. There is no per-user, revocable, non-uid secret anywhere in this app. |
| **3. Rules change needed?** | Moot once 2 fails — but yes, almost certainly: a feed endpoint reading a user's queries needs either a rules path for the token document or an admin-SDK read, and **rules are not mine**. |

**So nothing was built.** Question 2 is the pack's own stop condition, and it is the right one:
inventing a public-facing auth token unattended is exactly the kind of decision that looks small at
3am and is a security surface forever.

**The design question for you, stated so it can be answered rather than re-derived:**
an ICS subscriber sends no credentials, so the URL *is* the credential. That means a
high-entropy per-user token, stored somewhere the feed can read it, **revocable** (so a leaked
calendar URL can be cut off without changing the account), and **not the uid** (which is public by
design and appears in the client bundle). The open choices are where it lives (a field on the user
doc vs its own collection), who mints it (a callable vs a rules-guarded client write), what
revocation looks like in the UI, and whether one token covers the whole feed or one per manuscript.
None of those is a code question.

---

## FLAGS FOR NICK

**1. Deployed —** no; condition 4. See the top.

**2. The feed —** not buildable tonight; blocked at question 2, with the design question above.

**3. Expiry copy for a passed expected date — the ruling you owe.** Today a window that has passed
simply stops rendering: no pill, no state, nothing. That is deliberate and safe, but it is not
obviously *right* — "the window I was waiting on has gone by" is arguably the most actionable thing
the calendar could say. It was not invented overnight for two reasons: the word "overdue" is banned
by the copy laws and the honest alternatives all carry a tone judgement ("window expired" is the
laws' own suggested phrase but reads as a verdict on the agent), and **dashed means provisional in
this grammar — the past is not provisional**, so an expired item cannot simply keep its pill. It
needs a phrase and a treatment, both yours.

**4. Keyboard and touch drag — unbuilt, as the pack allows.** Neither has an equivalent today. For
keyboard the shape would be: focus a task pill, a key to "pick up", arrows to move the selection,
Enter to drop — which needs a roving-tabindex model the grid does not have. Touch needs pointer
events and a long-press, since HTML5 drag does not fire on touch at all. **Both are real gaps for
real users**, not niceties; they are a pack of their own.

**5. What the record-detail reduction lost.** The expanded row dropped: the **Agent** name line (the
row header already carries it), the **Manuscript** as a labelled field (now in the context line),
**What went** (`r.detail` — the materials or the agent's quote), the **Timeline** line
(`exchangeLine` — position, elapsed days, whether the direction turned), the **Record** logged-on
date, the free-text **note**, and the second button. **The two worth asking about are `What went`
and the exchange line** — both are genuinely absent from the panel now rather than merely relocated,
though both live in the reading pane the link reaches. `exchangeLine` survives in the lib,
unit-locked, so restoring it is one line if you want it back.

**6. Cushion and cross-session.** Cushion **4 / 4 / 4**; no `data-fold-short` at any width, in
either mode, filtered or not, before or after a drop.
The noteboard session ran concurrently for the whole pack — files rewritten mid-run at 15:39, 15:41
and later — so every measurement ran in a detached worktree on port 4273 (removed at the end). Their
work is what blocks the deploy and what accounts for the tree's one red and two `tsc` errors; **all
three were attributed by reading the failing assertion and the error paths, not by file ownership.**

**Two observations that are not mine to fix:**
- **The `/todo` row for a dated card reads `Note … added 0 days ago`** rather than naming its due
  date — measured on the seeded task. Under the two-natures law a dated user card *is* a task, so
  the label looks wrong. That row belongs to the To-do page.
- **One test record could not be cleaned:** the list row has no delete affordance (the ⋯ menu is
  portalled from the board view), so the acceptance names what it leaves. **Delete by hand:
  `Harness drag mt4ijne7`, on 27 Aug.** Earlier failed runs left three more, all titled
  `Harness drag probe` (two on 25 Aug, one on 27 Aug).

---

## Deviations from the pack, each deliberate

- **`Their stated 12 weeks`, not the pack's `Her stated 12 weeks`.** The no-gendered-pronouns law
  outranks a pack's example copy — the app never stores an agent's pronouns and a wrong guess
  misgenders a real person. A lock greps the function.
- **The month jump lives in the TOOL ROW, not the title.** The pack says the month title becomes a
  control; the month is written in the subtitle, which is `TasksPageLayout`'s and typed `string` —
  read-only territory. The tool row is where month navigation already lives.
- **No reply-stated window at list level.** `resolveExpectedDate`'s fourth argument is passed
  `null`, matching every other list surface: the window an agent states inside a holding reply lives
  in the query's nested events, which only the reading pane loads, and the global feed carries no
  `replyWeeks`. Composing one from what this page holds would invent data.

---

## Findings worth keeping

> **⚠️ AN EXISTING LOCK CAUGHT A REAL FAULT IN THE DRAG'S FIRST DRAFT.** The failure toast was
> hand-authored (`"The date didn't save — check your connection…"`), and the page's standing lock
> forbids this page flashing a literal — because `saveErrorCopy(classifyWriteError(e))` is the ONE
> producer of save-failure copy in the Tasks world: permission and offline get their own true
> sentences, and no raw Firebase message ever reaches the UI.

> **⚠️ `tsc` CAUGHT THE CATCHABLE TDZ VARIANT.** `armPeek`'s deps array named `expByDay` before its
> declaration — TS2448, catchable precisely *because* a deps array shares the declaration's scope.
> The uncatchable variant (a hoisted helper reading the same const) is the one this repo has
> shipped; this was the friendly cousin.

> **⚠️ TWO OF MY OWN LOCKS COLLIDED WITH PHASE 4, AND BOTH COLLISIONS IMPROVED SOMETHING.** The
> modal-retirement lock forbids `role="dialog"` and my popover carried it — the lock won on the
> merits: a small anchored popover is not modal and traps no focus, so the role was wrong ARIA. And
> the panel click-away lock banned window-level `pointerdown` listeners *wholesale*, broader than
> its claim; it now walks every global pointerdown block and asserts none reaches `setPanelOpen` —
> the actual invariant, machine-checked, instead of a blanket ban one popover away from a false red.

> **⚠️ A FIXED PROBE TITLE REPORTED THE DRAG BROKEN WHILE IT WAS WORKING.** The probe matched "the
> first pill containing the title", so a stray from an earlier failed run was picked instead of the
> one just seeded — and a *previous* run's pill was sitting correctly on its new day, moved by the
> very code under test. Unique titles, and the population asserted at exactly one.

> **⚠️ A SAME-TICK SYNTHETIC `dragover` FINDS NO HANDLER.** `dragstart` sets the drag state and the
> cell's handler is attached conditionally on it, so the listener does not exist until React
> re-renders. A real drag never meets this — the browser repeats `dragover` every ~100ms while
> hovering. The probe waits where reality repeats.

---

**Standing gap, restated plainly:** pointer interaction inside `FocusFlow` remains unverifiable in
this harness, so **no completion write was made here and Undo stays unproven end-to-end.**
