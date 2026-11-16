# Card offers v1: the report

Branch `card-offers-v1` (cut from `dev/…-aa1-laq11` @ 510c1cec3, the tip dev served). Reference:
`design-refs/card-offers-v1/agent-card-edit-v8.html`, SHA256 `56dff65a…92c7`, matched and enrolled in the ref manifest.

## 1. False premises and surprises (read these first)

1. **Dev wasn't on the `-aa1` branch.** It served `index-uz3iJgBA.js` from
   `dev/qc153-…-laq1-qc1534-aa1-laq11`, which is Log a query v1.1 merged on top of Add agent v1.
   - Add agent v1's code is in it, up to `a42d3aa33`.
   - Its report commit (`979bff969`) is not.
   - Card offers v1 is cut from that tip.
2. **`expectedFor` returns `{ ms, kind }` and no `source`.**
   - `cardOffers.fromWindow` asks `resolveExpectedDate` directly, with the same inputs `expectedFor` gives it, and checks for `source === "agent"`.
   - A reply restart (`replyRestartedOn`) also counts as not the window's.
   - Adding `source` to `expectedFor` would have broken the five tests that compare its result whole.
3. **The stored nudge is not the expected date.**
   - At log time, `logDefaults` writes `nudgeDate` a week after the expected date, moved off the weekend.
   - A "no response means no" agent gets no stored nudge at all.
   - With no stored nudge, the To-do's nudge comes from the window plus `NUDGE_GRACE_DAYS` (14) in `replyTask`.
   - So "move it only if it still equals the old one" is built as "only if it still sits where the old window put it" (`defaultNudgeMs(oldExpected)`).
   - The mock draws the nudge as the expected date. The offer shows the app's real nudge date instead.
4. **The agent card's panel isn't a `SidePanel`.** `AgentCardPanel262` is its own portal at z 61, under the `SidePanel` scrim's z 65.
   - So "do it through `SidePanel`" became: lift `SidePanel`'s scrim into a shared `SideScrim`, which `SidePanel` renders exactly as before, and mount the same component under the card at z 60.
   - Neither host passes the panel's `editing` prop; the card straightens through a CSS `:has()` rule.
   - The card now announces its editing state on a window event, `sa:cl262-editing`, the same way it already asks the panel to close.
5. **`alsoChanges` has three other readers:**
   - Housekeeping's reply fix (`hkAlsoFor`);
   - the saved line, via `useAgentSave` → `cardSavedLine`;
   - and `HostAgentCard`'s form, which is the same card on other pages.

   It stays for them. The card no longer renders it, and the `Also` component and its rust CSS are deleted. There was never a "page-count" line; what went is the door's "This page's counts move…", along with the genre-match, NRN, Analytics and surface lines.
6. **The mock's "Keep" and the brief's "Keep" differ.**
   - The mock pins the query to the window it was sent with. Its note says "pins that query to the window it was sent with".
   - The brief writes the old date as the writer's own (`writerExpectedWrite`).
   - Built as the brief says. §5 reports what that shows the writer.
7. **The mock closes the card when you click the dimmed page, even while only reading.** The brief says the reading dim is visual only and a row still switches the card. Built as the brief says.
8. **The mock's editing dim is .42; the app's existing action level is .45.** The brief says use the existing level, so it's .45.
9. **Partial and full wording follows the brief.** The mock only has a full, and says "Your full manuscript with Sarah…". The brief gives "Your {partial | full} request with {first}…", which covers both, so that's used.
10. **The reopening calendar covers the close offer.** Since Add agent v1, choosing Closed opens the calendar by itself, and it sits over the new close offer until it's dismissed (Escape, or a click away).
    - It isn't changed here.
    - The locks press Escape before reading the offer.
    - This wants a decision: open the calendar only on "Set a date", or place it so it doesn't cover the offer.
11. **The Query Centre's list row can disagree with the card for a "no response means no" agent.**
    - The v153 row's "reply by" reads `replyMs`, not the expected date. Olive (sent 3 Sep on 8 weeks) reads "reply by 3 Dec" in the row, where her expected date is 29 Oct.
    - The close offer's "past the date" uses `expectedFor`, the same as the card's next step and the Query Centre's own open query ("reply expected by …").
    - Left as is. Recorded because the row and the offer can disagree for such agents.
12. **The new next step applies to every card.** "Closed · No response." with "Query again" now shows for any agent whose latest query is closed with no reply, not only after this save.
13. **Some copy had no case in the mock, so the wording is mine:**
    - several open queries with one agent;
    - "You set this nudge yourself, so it stays." (a nudge the writer moved);
    - the toast for a query write that failed.
14. **A derived nudge reports what the To-do will really do.** With no stored nudge, the offer shows the To-do's own date (window plus 14 days), which can be later than "Today" after a shorter window. Nothing is written to a derived nudge.
15. **The emulator rules need `notes` on an agent.** `co1Emu.mjs` builds its fixtures from the harness account's own records, so they pass the rules.
16. **tsc runs out of its default 2 GB heap on this tree (exit 134).** Every tsc reading here was taken with `NODE_OPTIONS=--max-old-space-size=8192`.

## 2. What changed, by phase

| Phase | Commit | What |
|---|---|---|
| 1 | `70d83b004` | `src/lib/cardOffers.ts`: the pure engine (`cardOffers`, `offerPlan`, `saveExtras`, `offerToast`, the copy). CO1–CO7. The mock enrolled. |
| 2 | `d60f024db` | The offers on the card (`AgentCard262Edit`: `RtOffer`, `CloseOffer`, `SafeNote`, quiet lines; real radio groups). The save bar's second line. The `Also` box and its CSS deleted. CO8–CO12. cl262 J7 and AA10 re-pointed. |
| 3 | `f8e371c38` | What Save does (`commitCardSave` + `useAgentSave`): nudge moves, keep writes, closes through `saveClose(…, noreplyAnswers)`, each query write on its own after the agent's. Undo includes the closed queries' activity rows. Toasts, and the closed next step. CO13–CO16. |
| 4 | `97e7fa693` | `SideScrim` (off · light · action); the card dims the page. + Website / + Email / Fill them in land in the field. CO17–CO20. |
| 5 | (this commit) | Screens, the full runs, the report. |

## 3. The locks

Every lock went red before it was believed. The CO1–CO7 suite could not load at all without `cardOffers`. Then each lock went red again under its own named break. The breaks and the readings are in `mutation-proofs.txt`.

| Lock | Where | Green | Red under |
|---|---|---|---|
| CO1 | Vitest | the offer only for an agent-dated Queried query | rows never pushed |
| CO2 | Vitest | a passed new date → Today | `due = false` |
| CO3 | Vitest | a writer's or restarted date → no row; a writer-moved nudge stays | `fromWindow` always true |
| CO4 | Vitest | Suggested = close only when past and NRN | the NRN condition dropped |
| CO5 | Vitest | partial or full → the safe note, no options | requests treated as Queried |
| CO6 | Vitest | closing stands the rt offer down | `closesAll = false` |
| CO7 | Vitest | no line that needs no decision (and today's `alsoChanges` does produce them) | a counts line pushed |
| CO8 | rendered | 8 → 6: the offer, struck old → new; held while the thumb is held; arrow keys | offer hidden |
| CO9 | rendered | the bar's line follows each choice | line hidden |
| CO10 | rendered | Suggested on the right option, both mock cases; sand header | tag hidden |
| CO11 | rendered | powder note, navy text, no options | note hidden |
| CO12 | rendered | no rust box, no "Also changes", no rust edge | the box injected |
| CO13 | emulator + rendered | Update moves the stored nudge; the card and the Query Centre show the new date | Keep chosen instead; source: no nudge written |
| CO14 | emulator + rendered | a writer-moved nudge stays, and the offer says so | source: the writer check dropped |
| CO15 | emulator + rendered | Keep holds the old date on the card and in the Query Centre | Keep not chosen; source: keep writes nothing |
| CO16 | emulator + rendered | No Response, nudge gone, `closed_no_reply` row in the log and the feed, on the Wall of no, "Query again" | Leave it open chosen; source: the close skipped |
| CO17 | rendered | light scrim (.16, z 60, no pointer events); a row click switches the card | scrim takes pointer events |
| CO18 | rendered | the action scrim (.45) while editing; a click shows the rust guard | scrim lets clicks through |
| CO19 | rendered | the Query Centre's panel: scrim off, no `spanel-dim` | its scrim shown |
| CO20 | rendered | + Website / + Email: the cursor in that field, in view | source: `openAll()` as before |

## 4. Gates against the baseline

| Gate | Baseline (510c1cec3) | Every phase |
|---|---|---|
| tsc (8 GB heap) | 0 errors | 0 errors |
| `vite build` (prod) | clean | clean |
| `build:dev` | clean | clean |
| Vitest | 3 failed in 2 files (`emuGuard`, `firestoreTarget` ×2, the guards' existing offender lists) | the same 3. Phase 1's run also had six 5-second timeouts at load averages of 13–17; all six pass when run alone. |

## 5. The Phase 3 "Keep" decision

"Keep them as they are" writes the old expected date through `writerExpectedWrite`. It carries its own timestamp, so it wins on recency, the reply date holds, and CO15 proves it on the card and in the Query Centre. The nudge is left alone, and the old `responseDeadline` fan-out skips that query.

**What it shows the writer.**
- `nudgeState` words a writer-sourced date as **"you expect a reply by {date}"**.
- `EditQueryDrawer` shows it as the writer's own editable expected date.

Neither is true: the writer never typed that date. They chose to keep the agency's old window for one query. So this does show a date as the writer's somewhere it shouldn't.

**Proposed instead: a per-query pinned window.**
- A `pinnedWindowWeeks` field on the query, written on Keep.
- `expectedFor` reads it before the agent's weeks, so the date stays the window's and is worded as the agency's ("Sarah advised 8 weeks").
- It needs a field, a rules line (dev and prod) and one branch in `expectedFor`.

This is not built. The brief says to propose it rather than guess.

## 6. The screens

`shots/`:
- each mock scenario beside the app's, at 1440 and 1280 (`01-rt`, `02-closed`, `03-closed-old`, `04-closed-full`, `05-website`, each as `-mock-` and `-app-`);
- the save bar after each choice (`06-bar-update`, `-keep`, `-stays-open`, `-closes`);
- the per-lock shots (`co8-…` to `co20-…`).

## 7. The runs on the `-co1` branch, and the dev deploy

(Filled in below.)
