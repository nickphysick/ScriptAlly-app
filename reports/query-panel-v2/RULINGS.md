# Query panel v2 — the rulings of 12 Oct

On `query-panel-v2`, one commit each. Ruling 3 is **not built**: two of its four controls did something the
ruling does not describe, so I stopped there as instructed. See "Ruling 3" below.

## False premises

1. **QC137 C4 (ruling 5): nothing in the row wrapped, and v1 changed nothing in it.** The stage line is
   `nowrap` at 1280 and every row is 73 tall on main, on v1 and here. C4 rounded each child's centre and counted
   the distinct values; near a half pixel the dot, the word and the stamp rounded apart and one line read as
   two. It came and went with how many rows sat above on the shared account, and was green again on the same
   builds it had failed on. The fix is in the lock. The row is untouched.
2. **The correction-desk suites (ruling 7) were red before the panel existed.** All five are in the red
   backlog. Three measure desks that no longer open at all.
3. **"Keep tracking", "Remind me later" and "Set send date" were never on the v1 panel.** My first report listed
   them as removed by the stand card. Only "Set a date" was wired there. The other three lived in the old
   three-column pane, which nothing renders.

## What landed

| Ruling | Commit | Result |
| --- | --- | --- |
| 1 · "No word from {first} yet" | `6fa530ee` | Heading "No word from {first} yet", figure "{n} days past your date". Also changed: two lines of the nudge journey's "when you save" list said "overdue"; they say "past its date". **Kept:** "Record a late reply" and the response journey's "LATE REPLY" note, the action you ruled stays in v1. Say if those should change too |
| 2 · the real italic | `9b599182` | Loaded by the app alone (`lib/appItalic`), when the workspace mounts. No public page loads it; `index.html` is unchanged. One variable file covers 400 and 600: the Latin one is 130KB, fetched on first use. Lock V11 |
| 4 · the stepper | `edcc9e20` | In the panel: numbered circles, the current step's name alone, on one line. Every step carries its name as `aria-label` and `title`. Lock V12 |
| 5 · QC137 C4 | `273d4b56` | The lock asks whether the centres agree within 6px. Still red under its own mutation ("4 lines", rows 96 to 172 tall) |
| 6 · P3 | `0e793bc8` | `clickRow` waits for the panel to carry the clicked row's id. **5 runs, 5 greens** |
| 7 · desk suites | `15e2c5e2` | `qcMove` re-pointed: 3 of 3 pass against the panel. See below for the other four |

### New locks

| Lock | Green | Mutation | Red |
| --- | --- | --- | --- |
| V11 italics | the stand card's italic span computes Source Serif 4 italic; 1 or more italic faces of that family are loaded | the italic's stylesheet refused on the network | "0 of 0 italic face(s) loaded · 2 upright loaded" |
| V12 stepper | at 1512 and 1280, across every reachable step of every footer action and the correction: one name drawn, one line, inside the panel; every step named | every name drawn and allowed to wrap | "names drawn: The response \| Check and save"; "Check and save" 2 lines |
| V5 (extended) | no "late" or "overdue" in the panel's text, on every query opened | covered by the unit sweep over every state | |

### Ruling 7 in full

- **`qcMove`** (move an entry to another query, from the fork): its route went through an Edit / Delete menu
  that was retired when the dots began opening the fork directly. Re-pointed at the panel's ledger. 3 of 3 pass.
- **`moveEntry`**: the same claim as `qcMove`'s first case, entered through the old three-column list
  (`.f12-row`). Not re-pointed; `qcMove` covers it. I suggest retiring it.
- **`deskBounds`, `deskPaint`, `drawer3`**: they press "Record response", "Mark sent" and "Nudge" and wait for a
  desk beside the query. Those three desks stopped opening on 27 Sep, when the action drawer went live, so
  there is nothing of theirs to point at the panel. `drawer3` §1 measures the old drawer's stage block.
  Not changed. I suggest retiring all three.
- **No real failure of the panel** came out of the five.

**A side effect to know about.** Running `qcMove` re-seeds the correction fixture, which dates its queries from
today. That moved rows other locks had captured: V10's history month, and feed drawer B6's baseline (one more
reply and one more day in its window). V10 now treats a history row's month as a month; B6's baseline is
re-captured against the v1 build (`833986dc`). B6 will drift again whenever `qcMove` runs on a later day.

## The three added states

| State | Heading | Figure | Paragraph | Shot |
| --- | --- | --- | --- | --- |
| With the agent, no reply date recorded | Waiting on {first} | none | No reply date is recorded for this query. | `shots/state-no-reply-date-1512.png` |
| Withdrawn | You withdrew it | the date it closed | This query is closed. It stays here, and in your figures. | `shots/state-withdrawn-1512.png` |
| Signed | You signed with {first} | the date | This query is closed. It stays here, and in your figures. | `shots/state-signed-1512.png` |

"This query is closed" reads oddly on a signed query. Say what you would rather it said.

## Ruling 3: what each control did, and why I stopped

| Control | Where it showed | What it did |
| --- | --- | --- |
| **Set a date** | With the agent, when the agency states no reply window | Opened a weeks slider in place (default 6, up to 16) and wrote your own expected-reply date on the query, with an Undo toast. Wired on the v1 panel |
| **Set send date** | With the agent, a window stated, but **no date recorded for when you sent it** ("No send date recorded, so this window can't be measured") | Opened the editor for the query's **sent** date. Old three-column pane only |
| **Keep tracking** | On the "consider closing" offer (silence means no and the window has passed, or nudges unanswered) | Wrote `closureOfferDismissed` on the query and said "Still tracking this query". Its whole effect was to hide that offer from then on. Old pane only |
| **Remind me later** | On the "what next" offer (past the window, no nudge lately, no reminder set) | Added a to-do "Nudge {agent}" for two weeks' time and said so. The offer then hid while the reminder stood. Old pane only |

- **Set a date** matches the ruling.
- **Set send date does not.** The ruling places it on "a request with no send-by date". It never set a send-by
  date: it set the date the query was **sent**, for a query with the agent. Do you want (a) the old control,
  on a query with the agent and no sent date, or (b) a new control that sets the send-by date on a request?
- **Keep tracking does not fit as it stands.** It dismissed an offer the panel no longer draws. On the
  over-a-year card, what should pressing it change: hide the "Closing it keeps your reply rate honest" sentence
  and these links for good, and stop Close being the primary button?
- **Remind me later** fits. I would hide the link while a reminder stands, so it cannot add two.

## Deploy

Dev had moved a third time: the Comparable titles v26.1 session deployed `dev/…-comps26-1` at `858aa4c0`
(`index-D2MP5Ba8.js`), which was not built on my last integration, so **Query panel v2 was off dev from about
15:34**. I merged onto that as **`dev/query-panel-v1-onb9-tip-onb9-comps26-1-qp2`**, now at **`5f9a1292`**, and
deployed it. **Dev serves `index-Qpey2I_I.js`.**

On that build: tsc and both builds clean; Vitest 8,685 passed, 3 skipped, the same one file failing to load.
QP2 V1 to V12 pass; QP1 11 pass; QC137 13 pass (C4 included); feed drawer v2 4 pass; the journeys 3 pass;
delete entry 8 pass; `qcMove` 3 pass. In the first full run V10, B6 and QP1 P7 were red for the shared-account
reasons above (P7 was one 10-minute click wait; it passed alone); all three passed after the fixes.

The next session to deploy to dev should base its integration on that branch.
