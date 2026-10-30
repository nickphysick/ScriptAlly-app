# Phone app v2: the summary

QueryHawk below 768px, built to `design-refs/phone-app-v2/` in eight parts.

- Branch `phone-app-v2`, pushed. Not merged and not on prod.
- Each part has its own report in `part-N/REPORT.md`. This page gathers them.
- At 768px and up nothing changed: every part re-ran the desktop lock against its base build (pixel- and DOM-identical) and proved it red.

## What was built

| Part | What | Commits | Lock |
|---|---|---|---|
| 1 | The shell: five-slot tab bar, the navy band, the + sheet, the menu, the book switcher, the snackbar, `--pa-*` tokens, one art table | `b945303d` `3d4385a4` `5f707d05` `be8fdc7c` `4e0f911c` `459b5d96` | PA2-1 S1–S9 |
| 2 | Home: the band hero (Active / Sent), Up next, Where they stand, the founding card, Latest | `93d802c7` `e0531aba` | PA2-2 |
| 3 | Queries: five chips, rows, swipes that open journeys, the query sheet, Birds-eye | `1fba3a3e` `504f3bd5` | PA2-3 Q1–Q7 |
| 4 | Flows: every query journey in `PhoneFlowShell`; task and note; the celebration | `5d3f7688` `3280fa0c` `feba0f9c` `da0e8134` | PA2-4 F1–F9 |
| 5 | To-do and the Corkboard | `ad46c604` `cd55cabf` `ebf3be7f` | PA2-5 T1–T9 |
| 6 | Agents, Discover, the agent profile | `91499a7c` `c0be58ea` `f99ea89d` | PA2-6 A1–A7 |
| 7 | Responses and the Wall of no, Manuscript, Analytics, Streaks & goals (`/goals`) | `4a17e4eb` `0d3ba86a` `16418e8e` `c08bc3e1` `77de94f4` | PA2-7 P1–P8 |
| 8 | First run (Home, Queries), Settings, Plan & billing, Help, Import, the whole-app sweep | `97367626` `91401e53` `9b7d2b0b` `be08d69c` `cf4229cd` | PA2-8 W1–W7, R1–R3 |

**Principles that held throughout:**
- **The pages derive nothing.** Every figure is the desktop's own function over the desktop's own rows. Where the ref's sample figure disagreed, the app won, and each report lists where.
- **Nothing writes in one tap.** Swipes, ticks and verbs only open a journey. No journey's questions, guards or saves changed.

**The last gates:**
- On `phone-app-v2`: tsc 0 / 0, build clean, `Test Files 695 passed (695)` · `Tests 10763 passed | 3 skipped (10766)`.
- One regression run of every phone suite (PA2-1 to PA2-8, QM1, DM1): `37 passed`, `17 skipped`, no failures. The harness account was unchanged afterwards.

## Dev

- **Dev serves `index-DyXfq4ti.js`:** the integration `dev/pk391-qm1-pk392-calx-pk392b-td7-fv1-pk393-pa2-2-td12-ppp1-pa2-8` at `3c1e5b90`, which is what dev served before this run's last part plus `phone-app-v2` at `cf4229cd`. Hosting only; never prod.
- **Dev carries other sessions' work this branch does not:** To-do v12, Submission packages v39.1–39.3, Public pages on phones v1 and the rest of that chain.
  - Against that work, PA2-1 S1 is red: the To-do badge reads 37 where To-do v12 says 30 (question 17).
  - The sweep's one finding there, v39.3's builder, is fixed in the phone layer.
- **Each part's dev hash:**

  | Part | Dev served |
  |---|---|
  | 1 | `index-Ox21np2m.js` |
  | 2 | `index-CRHIwewp.js` |
  | 3 | `index-CArPS85T.js` |
  | 4 | `index-BkPjilRy.js` |
  | 5 | `index-D7d8tr1e.js` |
  | 6 | `index-ir44D8o3.js` |
  | 7 | `index-BZP8LJfl.js` |
  | 8 | `index-DyXfq4ti.js` |

## Every open question for Nick

**Rulings on product and words:**
1. **Two "heard back" figures disagree** (Part 7). Analytics' % counts Withdrawn and Signed; Responses' "of 51" does not. Which denominator?
2. **Plan & billing has two homes on a phone,** `/plans` (the phone page) and `/account/plan` (the desktop section) (Part 8).
3. **The founding chip shows for every writer;** the app has no founding flag (Parts 1, 8).
4. **The Versions Pro strip says "Included for founding writers during the beta"** (the ref's sentence). Nothing gates versions today, so it is a claim the product must keep (Part 7).
5. **Notifications shows the app's three settings, not the ref's four.** Reply windows and Founding news would be new settings (Part 8).
6. **Discover is "coming soon" on phones too** (it follows `DISCOVER_LIVE`). Phones first would be a ruling (Part 6).
7. **The book switcher's one-manuscript footnote** shows beside accounts that already hold several (Part 1).
8. **Ink on blush is `#1f2633`, not the ref's `#111`:** the colour law won (Part 1).
9. **The Corkboard's pin is navy, not the ref's terracotta,** under the no-red law. Should it be an exception like the celebration's stamp? (Part 5)

**Rulings that would change a model:**

10. **Home's hero has Active and Sent only.** Replies and Requests have no dated series; adding one is a new derivation (Part 2).
11. **Add an agent is not a flow,** because the agent card is the only agent editor (Part 4).
12. **The task flow has no "No date" or "This weekend"** (the composer's model) (Part 4).
13. **Log asks "when" and "how" on one step,** where the ref asks two questions (Part 4).
14. **A single choice advances by measuring the step's controls.** Steps that mix kinds keep Continue (Part 4).
15. **`quickDone`'s Undo leaves an own task's `updatedAt` moved,** on desktop and phone alike (Part 5).
16. **Phones from 761 to 767px get the desktop Queries page:** `useQm1Phone` is ≤760, the shell <768 (Part 3).
17. **Which figure the To-do badge shows.** It is the tray's overdue + today; To-do v12 leads with "Needs you now", a different number (Parts 3, 5).

**Phone forms not yet designed:**

18. **The band's search opens the shell palette;** `PhoneSearch` is unreachable (Parts 1, 2).
19. **The menu's Analytics, Materials, Discover and Feedback tiles carry no line** (Part 1).
20. **The ••• on a query is a sheet,** not the ref's popover (Part 3).
21. **The parked-journey chip sits under an open query sheet** (Part 3).
22. **The query card's own Edit mode and the agent card's editor are not phone-styled.** The sweep visits routes, not those two in-sheet editors (Parts 4, 6).
23. **Housekeeping across several agents opens the first agent's card** (Part 5).
24. **The phone note has no tags and no "make it a task"** (Part 5).
25. **The profile's ••• has no "Fill in the gaps",** and its "+ Add" rows open the agent card at the tab (Part 6).
26. **The Scout's spot is an icon awaiting a drawing** (Part 6).
27. **`/goals` on a computer goes to the dashboard** (Part 7).
28. **Editing materials and building packages stay on a computer** ("Edit on a computer"); there is no cover upload (Part 7).
29. **The weekly-goal sheet is the dashboard's modal,** unstyled for a phone (Part 7).
30. **Submission packages, Comparable titles and Versions are reachable on a phone only by address.** The phone layer makes them lawful; a phone layout needs their own files, two of them Manuscripts-owned (Part 8).
31. **Help's per-guide "Restart" and "turn guides off" are not on the phone** (Part 8).

**Housekeeping:**

32. **The old PWA icon files in `public/` are unreferenced** (Part 1).
33. **One build hash of Part 1E was never explained** (`index-FcVcgpa3.js` once, `index-sgvSamcD.js` thereafter) (Part 1).

## Worktree

Both worktrees (`/Users/nickphysick/ScriptAlly-pa2` and `/Users/nickphysick/ScriptAlly-pa2-int`) were removed, and their previews stopped. `phone-app-v2` and the integration branch are pushed. No other session's worktrees exist besides the primary checkout.
