# Retire the old "Add an agent" pop-up — report

Nick's ruling: retire the centred pop-up (`AddAgentFocusForm`) from the whole app; every way of adding an agent opens
the slide-in agent drawer in its add mode. Branch `retire-add-agent-modal`.

## False premises

1. **The log-a-query flows never opened the pop-up.**
   - The log drawer (`LogJourney`) had its own inline "+ Add "X" as a new agent" sub-card.
   - The Query Centre's `QueryLogSheet` is dead code: `DRAWER_LIVE.log` is true, so `openCreate` returns early and the
     sheet can never open.
   - The log drawer's sub-card now opens the agent drawer as well, with the prefill and hand-back the pack describes.
     The dead sheet is left as it was, and deleting it is a separate follow-up.
2. **Discover has no add-a-new-agent form.** It adds agents from its own list (key `a`, "Added X to your contact
   list"), which is a different door, and it is unchanged.
3. **"The sidebar" has no add door.** The capture menu ("Log a query" split button, with "Add an agent") sits in the
   top bar (`SidebarCapture placement="bar"`).
4. **The top-nav mega-menu (`lib/topNav.ts`) is not mounted.** Its "Add an agent" is parked code; it would now reach
   the drawer anyway.
5. **The Dashboard header's "Add an agent" is hidden below 1440px** by design (`dash58.css`), so there is no header
   door at 1280.
6. **Why the pop-up survived v18.3:** the drawer's frame (`AgentPanelNew`) was mounted only inside the Contact list
   page. Off `/agents`, `App.tsx`'s "Add an agent" interception had nowhere to open the drawer, so it fell back to the
   pop-up. The fix is one app-level frame.

## Base

`6a7a0715` (`dev/…-qc1401-hr1-hs1`), which dev served as `index-D5wjLmfX.js`; a local build reproduced that hash
exactly. Baseline: Vitest 9157 passed, with only `functions/src/email.test.ts` red.

## Part A — every route, and what it does now

| Door | Where | Before | After |
|---|---|---|---|
| Dashboard header "Add an agent" (≥1440) | `Dash58Header.tsx:55` → `Dash58.tsx:534` | pop-up | drawer |
| Dashboard empty-account Agents door | `Dash60Left.tsx:82` via `Dash58.tsx:546` | centred new-agent card | drawer |
| Dashboard "Log a query" door with no agents | `Dash58.tsx:484` | centred card | drawer |
| Dashboard empty to-do panel "Add an agent" | `Dash58List.tsx:127` → `Dash58.tsx:584` | pop-up | drawer |
| Dashboard Getting started "Add an agent to your contact list" | `lib/dashList.ts:450` | pop-up | drawer |
| Top bar "Log a query" menu → Add an agent | `SidebarCapture.tsx` → `railNav.ts` `invokeCapture` | pop-up | drawer |
| Search palette (⌘K) "Add an agent" | `lib/searchPalette.ts:108` | pop-up | drawer |
| Import page dead ends "Add by hand" | `ImportPage.tsx:209` → `ImportFlow.tsx` → `DeadEnd.tsx` | pop-up | drawer (routed; see below) |
| `handleNavigate` "Add an agent" interception | `App.tsx:375` | `/agents` → its own event; elsewhere → pop-up | the drawer on every route; one path |
| Contact list "+ Add an agent" (header, empty page, next-step card) | `AgentList.tsx` | drawer | drawer, unchanged |
| Log a query "+ Add "X" as a new agent" | `LogJourney.tsx` | inline sub-card | drawer over the log drawer, name prefilled, new agent selected after save |

**Checked with no add door:**
- keyboard shortcuts and the shortcuts sheet;
- Housekeeping, and help articles;
- onboarding: its "add by hand" finishes onboarding and lands on the Dashboard;
- `?add=agent`-style deep links: none exist;
- manuscripts: nothing.

## What changed

- **Part B (`13527aa8`):**
  - **One frame.** `AgentPanelNew` is mounted once, by `AgentCardHost` (app level). The Contact list no longer mounts
    its own; a layout effect there keeps its old behaviour on `/agents`.
  - **The opener.** `openNewAgentCard` accepts `prefill`, `onCreated` and `over: "drawer"`. The new
    `completeNewAgent(id)` closes the session, emits "added", then hands the id back once. Focus returns to the element
    that opened it.
  - **Over the log drawer.** `EscapeRaise` puts the editor above the drawer's Escape layer, and the panel sits over the
    drawer.
  - **Confirmation.** Off `/agents`, a save shows "Added {name} to your contact list".
- **Part C (`3761224d`):** `AddAgentFocusForm.tsx`, its Lottie asset, its mount and state in `App.tsx`, and the 30
  rules in `forms.css` that only it used are deleted. The grep:

  ```
  $ grep -rn "AddAgentFocusForm\|BUILDING YOUR LIST\|The right agent is out there" src
  (no output)
  $ grep -rn "AddAgentFocusForm\|BUILDING YOUR LIST\|The right agent is out there" dist     # production and dev builds
  (no output)
  ```

## Couldn't route or verify

- **The Import page's "Add by hand" dead ends** are routed through the same interception, but they couldn't be made to
  render. A junk file uploaded to the template tile read "We've read your file. 0 rows… It all read cleanly" and
  offered "Bring it in", with no dead end. That looks like a separate import bug.
- **`QueryLogSheet`'s add** is unchanged, because it can't be reached (false premise 1).

## Existing faults found (the same on the base; not fixed)

- **On `/agents` the panel doesn't switch to the new agent's profile after an add,** which v18.3 says it should. The
  likely cause is that the agent arrives through the local snapshot before the "added" event sets `addedInPanel`. The
  fix is about one line; it was left alone because `/agents` behaviour was to stay identical.
- **The editor shows "A name or an agency is needed" in red as soon as it opens.**
- **With a prefilled name, the editor's foot uses Housekeeping's "Carried over…" wording,** which reads oddly from Log
  a query.
- **Opened from Log a query, the panel lies over the drawer from its top edge (y≈8),** not under the top bar as on
  other pages (`shots/query-centre-log-*.png`).

## Locks (ADD1, `tests/e2e/add1.measure.ts`, commit `22f5f4d6`)

Each lock was red on the base build and red under its named mutation (a `src` edit made from a path-derived backup,
then restored), then green. A2 and A3 make real saves: the test account is Free and over the 5-agent cap, so the lock
sets its plan to Pro through the admin API on scriptally-dev only and restores "Free" after every run (read back:
"Free"). Every `zzadd1-` agent and its activity is deleted in the same run; the account ends at 52 agents, as it
started.

| Lock | Base | Mutation | Green |
|---|---|---|---|
| A1 every route opens the drawer (header ≥1440, top-bar capture on Dashboard / Query Centre / Discover, palette, Contact list, log picker) | 47/71: the pop-up, and no panel from the log picker | 68/71: the Dashboard door opens the centred card | 71/71 |
| A2 stays put | 12/20: the pop-up opened | 14/20: the URL went to `/agents` | 20/20: URL fixed, total 52→53 with no reload, toast |
| A3 hand-back to Log a query | 12/22: only the inline sub-card | 20/22: `onCreated` not called | 22/22 |
| A4 gone from the bundle | 2/5: all three strings in `index-D5wjLmfX.js` | 2/6: the component re-imported | 6/6 |

A2 and A3's base runs are red because the pop-up appears instead of the panel, so the base's own save path was never
exercised.

## L1 (each file alone; the same reds on the base build count as pre-existing)

- **Green:** contactV19 15/15, contactV191 9/9, contactV192 9/9, contactV183 16/16, contactV18, qcV140 15/15, qcV1384
  and qcV1386.
- **Re-run after sign-in quota failures:** contactV19, qcV140, contactV183 (its guide-count checks depend on the shared
  guide state) and qcV1386 (pin button not found on the first run). Each was green on the re-run.
- **Red, the same on both builds:** qcV1381 F1; qcV1382 C1/D1; qcV1383 F1; qcV1385 A1, A2, B1, B2, C2, E1, F1/F2, G1;
  qcV138 A1, A2, B1, C1, E2, E3, G1. These come from later Query Centre packs, not from this change.
- **qcV138 E1** is red on this branch only, and it is the known date-dependent "1 day over" check.
- **contactV19 C3** went over its timing once ("✓ Copied" lasted 1610ms against 1400 ±200) and passed on re-run.
- No lock needed re-pointing.

## Shots

`reports/retire-add-agent-modal/shots/`: the drawer opened from the Dashboard, the Query Centre (Log a query's picker)
and Discover (the top-bar capture), at 1512 and 1280.

## Deploy

_Filled in below._
