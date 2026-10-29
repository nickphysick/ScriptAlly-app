# Phone app v2, Part 6 — Agents, Discover and the agent profile

Branch `phone-app-v2` (worktree `/Users/nickphysick/ScriptAlly-pa2`). Ref: `design-refs/phone-app-v2/` — screens 26–28, `agentsv.js` (`screenAgents2` at AGR B · AGD C, `agRow`, `discList` at ADC B, `ovAgentD` at AGS D), and the `.seg`, `.chips`, `.rowhd`, `.dcard`, `.ahero`, `.astats` rules. The hashes were re-verified (69 OK). Not merged, not on prod.

## False premises

1. **"Discover is `/agents/discover` … one card per verified agent."** On this base Discover is **gated off**: `DISCOVER_LIVE = false` (`lib/discoverShared.ts`). The desktop shows a coming-soon page there, and the Contact list hides every Discover link (v14 ruling Q4). A phone page showing the Scout's queue would have launched the feature on phones only. So the phone follows the gate:
   - while it is off, Discover shows the desktop's coming-soon words and its "Tell me when it's ready" button (the same one-leaf write, `notifyPrefs.discover`), with no cards and no "{n} new";
   - the cards are built and are reached, as on the desktop, through the dev review aid (`window.__SA_DV_LIVE = 1`, gated at the call site so a production build drops it).
   Flipping `DISCOVER_LIVE` turns both pages live together.
2. **"A not-known door reads Not known."** Correct, but no agent on the harness account has an unstated door, so the rule had nothing to show. A3 seeds one agent with `submissionStatus: "Unknown"` and removes it by id in the same run.
3. **"The ••• sheet holds … Fill in the gaps (Housekeeping, if it exists on the phone)."** There is no phone Housekeeping. Left out (Not done, item 2).

## What Step 0 found

- **Below 768px `/agents` rendered the desktop Contact list, squeezed.** `AgentsRoute` and `DiscoverRoute` (`agents/phone/AgentsRoutes.tsx`) now choose by width, as `TodoRoute` does.
- **The counts already exist:** `agentFacts` over `buildQcRows` for the book in scope is what the desktop Contact list reads. "{n} on your list · {m} to query" is its agents on file and not queried (A1), and never follows a chip.
- **The day on a row is the row's own `dayN`.** A first draft counted days from the send date itself and said "Day 44" where the profile said "Day 45" for the same query. Both read `dayN` now.
- **Discover's add path is the desktop's:** `io.add` → `writeDecision(decisionDoc("added"…))` → `scheduleIncrement`, with Undo calling `cancelIncrement` and `undoAdd`.

## Gates

| Gate | Before Part 6 (`b2d1a4b2`) | After |
|---|---|---|
| tsc root / functions | 0 / 0 | 0 / 0 |
| build:dev (grepped) | clean | clean |
| Vitest | 692 files · 10745 passed · 3 skipped | `Test Files 693 passed (693)` · `Tests 10748 passed \| 3 skipped (10751)` |

## Commits

| Commit | What |
|---|---|
| `91499a7c` | 6A–C in one commit: the tab, Discover and the profile share `AgentsPhone.tsx` and one stylesheet. Word helpers in `lib/agentsPhone.ts` with unit tests. |
| (this commit) | 6D — the Discover gate, locks, shots, pairs, this report. |

## ⚠️ One fault in 6A–C, found by the first peek and fixed before its commit

**The page root's class collided with a row class.** `.pa-ag` is the Queries rows' agency line, which is `nowrap`. Used as the Agents page root, it made every paragraph on the page one line, and the Discover shell grew to 2,500px wide (the round buttons and half of every card off-screen). The root is `.pa-agents`.

## Locks — PA2-6 (`tests/e2e/phoneAppV2Agents.measure.ts`)

| Lock | Claim | Mutation | Red reading |
|---|---|---|---|
| A1 | the band's two counts equal the desktop Contact list's agents on file and not queried, for the same stored book; the To query chip shows exactly those rows and the band does not follow it | `a1-every-book` (scope dropped) | `{"onlist":54,"toq":6} vs {"total":54,"none":30}` |
| A2 | not queried leads with the dotted ring, queried with the status glyph; the facts are the record's; no dash and no "Unknown" | `a2-dash` | `["—","By email"] vs ["By email"]` |
| A3 | a door nobody stated reads "Not known", never Open | `a3-open-unknown` | `"Open to submissions" vs "Not known"` |
| A4 | gate off: coming-soon, no cards, no "{n} new", and the desktop agrees; live: the slate band, the Scout's order (the desktop Discover's queue), Add writes and Undo puts the account back exactly | `a4-reverse`, `a4-gate-off`, `a4-no-undo` | the order: `ca-diane-osei,… vs ca-helena-marsh,…`; gate: the coming-soon face never came; Undo: `the account has been changed` |
| A5 | the profile's three facts are the record's and the query's; the foot names the agent, and "Log a query" opens the log flow with that agent chosen and writes nothing | `a5-no-agent` | `the foot opens the log flow with Imogen Vale already chosen — ""` |
| A6 | the colour laws (white on the navy head) and no image twice, list, profile and Discover | CSS `ink-head` | `text on navy is not white: div.pa-aname "Imogen Vale" (rgb(31, 38, 51))` |
| A7 | the desktop untouched: PA2-1 S9, now including `/agents/discover`, at 1512 and 1280 | CSS `desk-bar` | `head 317161 px vs base-to-base 0 px` |

- **A5's first form was vacuous, and its mutation showed it.** It looked for the agent's name anywhere in the flow, and the log flow's picker lists every agent, so the name was always there. It stayed green with the agent removed from the call. It now reads the live card's chosen name (`[data-pf="live-name"]`), and the same mutant is red.
- **`a4-no-undo` left three documents:** `agents/agent-03r890jk3`, `activities/act-added-agent-agent-03r890jk3` and `scoutDecisions/ca-diane-osei`. Each was shown, then deleted by id; the account then matched the list taken before the part's writing runs. The mutant kept `cancelIncrement`, so the community catalogue's count was not touched.
- **A7:** `/agents` and `/agents/discover` are pixel-identical (0 px) and DOM-identical to the base at both widths. Ledgers: `ledger/a7-desktop.json`, `ledger/a7-desktop.mut-desk-bar.json`.

**Final green on this build:** PA2-6 `5 passed` (both sizes, both pages, with setup; it wrote and undid) · PA2-5 `5` · PA2-4 `4` · PA2-3 `3` · PA2-2 `3` · PA2-1 `10 passed, 2 skipped` · QM1 `1 passed, 10 skipped` · DM1 `3 passed, 5 skipped`. The account matched the list taken before the part's writing runs (the one listed difference, `queries/seed-pkgq-1`, is key order only, as in every part).

## Where the app overrode the ref

| Item | Ref | App |
|---|---|---|
| Discover | a live list of cards | coming soon while `DISCOVER_LIVE` is off (false premise 1) |
| counts | 21 · 5 | 53 · 29 on the harness account (the Contact list's own) |
| the Scout's spot | an illustration | the binoculars icon: the art table has no Scout drawing for the phone (Not done, item 3) |
| a reply-time fact | "6–8 weeks", "No reply means no" | the record holds one number of weeks; "no reply means no" is not shown as a row fact |
| Discover facts | reply · route · a recent signing | reply and route; community agents carry no signing field |
| the door on a card | "Open until 30 Nov" | "Open to submissions" / "Closed to submissions" / "Not known"; a community agent carries no reopening date |

## Pairs

`pairs/` holds 26, 27 and 28 beside the ref at 390 × 844 and 360 × 780. 27 pairs the live face, reached through the dev aid; the gate-off face is shot `27-discover-soon-*`.

## Dev

(filled in after the deploy)

## Not done, and why — for Nick

1. **Discover is coming soon on phones too.** That follows the existing gate. If phones should get the Scout before the desktop does, that is a ruling, not a fix.
2. **No "Fill in the gaps" in the profile's ••• sheet.** There is no phone Housekeeping. Edit and Remove both open the agent card (the only agent editor), whose phone styling is Part 8's.
3. **The Scout's spot is an icon.** It needs a phone drawing in `phoneArt.ts`.
4. **The profile's "+ Add" rows open the agent card** at the right tab rather than an inline editor. That is the "only one agent editor" rule.

## Worktree

Kept for Parts 7–8.
