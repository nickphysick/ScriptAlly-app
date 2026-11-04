# Contact list v26.3 — answers to v26.2's three questions

4 Nov. Branch `contact-list-v26-3`, cut from the dev line carrying CL262:
`dev/qc1511-db2-title-sip-qc1512-cl26-sip11-tl1-pk41-cl262` at **efa73df9** (dev was serving its build,
`index-CJ6SyN3r.js`). Not merged to `main`.

## False premises

1. **"v26.1's row hover, if present."** There is no v26.1 on this line, and the v26 list has no row hover with a
   Log a query. Nothing to point.
2. **"The next-step box's Log a query still opens the v24 panel."** It didn't: it already called
   `openQueryDrawer({ mode: "log" })`. The only Log a query on /agents reaching the v24 panel was the **top bar's**: the
   app's navigate bridge diverted it into the Contact list's in-place log flow on /agents.

## Per part

| Part | Commit | |
|---|---|---|
| A · Remove, and getting to the query | 892c8b35 | "Remove {first} from your list" at the foot of Contact details (edit everything only): Special Elite 14, #a2452a, underlined, left-aligned under the grid. It opens the existing delete's own confirmation (type the name when there are queries; the cascade through `deleteAgent`), now one shared `RemoveConfirm` used by both cards. "Open the query →" under the next-step box for an agent with a query, opening it in the Query Centre as "See the query" did; hidden while editing. |
| B · Log a query uses the shared drawer | 0af415cd | On /agents the top bar's Log a query opens `openQueryDrawer({ mode: "log" })` in place. `ContactLogFlow`, `AgentCardPanel24` and `contactLogStore` are deleted. |
| C · Also changes stays | (this commit) | No change to the wording; CLAUDE.md now says it is shared and that shortening it is a cross-page job. |

## Decisions made

- **The closed next-step box lost its "See the query" button.** With "Open the query →" under every queried agent's
  box, a closed agent would otherwise have had two ways to the same query, one above the other.
- **Remove asks no extra question while editing.** It bypasses the discard guard: removing the agent is the stronger
  act, and the existing confirmation is the question.

## What still reaches the v24 panel

Nothing on /agents. `AgentCardPanel24` is deleted, and the v24 card component itself (`AgentCard24`) is no longer
rendered anywhere: only its shared parts are used (`useCardModel`, `Notes`, `RemoveConfirm`, `Foot`'s confirm).

## Locks

`tests/e2e/cl263.measure.ts`, at 1512 × 900 and 1280 × 800, on the emulator.

| Lock | 1512 | 1280 | Red first, by mutation |
|---|---|---|---|
| K1 remove: only in edit-everything, under Contact details, opens the existing confirmation | green | green | Remove injected at rest → "not on the card at rest" red |
| K2 open the query: only for a queried agent, opens that query, hidden while editing | green | green | the link injected for a not-queried agent → red |
| K3 log: the card's and the top bar's Log a query open the shared drawer with the agent set; no v24 panel | green | green | a v24 log panel mounted on click → "no v24 panel" red |
| L1 CL262 + CL26 (no CL261 on this line) | 45/45 with CL263 and the shots | | n/a |

Proofs: `mutation-proofs.txt`. Unit suite 11,304 passed; the 2 reds are `firestoreTarget.test.ts`, red on the base
before this pack (27 older cl25x data scripts).

## Dev shots

- `shots/13-contact-details-remove-1512.png`: Contact details with Remove.
- `shots/12-open-query-1512.png`: a queried agent's card with "Open the query →".
- `shots/K3-log-drawer-1512.png` (and `-1280`): the log drawer opened from the card, the agent set.
