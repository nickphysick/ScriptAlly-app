# `AgentResponseGuidelines` — report only (provenance pack §5)

**Nothing renders it.** `grep -rn "AgentResponseGuidelines" src/` returns its own definition and
one comment in `AgentMaterialsEditor.tsx` citing its interaction contract. No JSX mount, no route,
no lazy import. It is the retired Contact List's "Response guidelines" card, left behind when the
agent list was rebuilt as the flip-card grid.

Its only dependency, `src/lib/agentReplyPolicy.ts` (`replyPolicyOf` / `replyPolicyWrite`), is
likewise reached from nowhere else — so a second module is dead behind it.

## What it renders

Three things, in one bordered card:

| Row | Control | Writes |
|---|---|---|
| **Usual response time** | a read-only value (`Within N weeks` / `Not stated`) that opens a number input, weeks 1–52, with **Save** and **Not stated** | `responseTimeWeeks`, or `deleteField()` |
| **If they don't reply** | a three-way radio group — *No response means no* / *They reply either way* / *Not stated* | `noResponseMeansNo` true / false / `deleteField()` |
| **Pro strip** | static copy: "Community average response times are coming to Pro — see how this agent compares with the wider field." | nothing — no data behind it |

Each write is immediate, with an undo toast carrying the previous value (including the
previous *absence*, restored as a `deleteField()`).

## What the live agent card already does

The flip-card editor (`AgentEditor.tsx`) covers **both** editable rows, so the two facts are
reachable today:

- **response time** — `#agl-weeks`, a free-text numeric field labelled *Typical response (weeks)*,
  placeholder *"Leave blank if unknown"*. Clearing it deletes the field. It also reveals a caution
  when the agent has live queries: *"changing this alters when they'll show as overdue"*.
- **if they don't reply** — a two-state switch with `nrnState`/`nrnSubtitle` supplying the
  tri-state grammar (on / off / unset, the unset label greyed and reading "Not stated.").

So the DUPLICATION is real but partial, and the two differ in ways worth deciding between rather
than picking by accident:

| | `AgentResponseGuidelines` | the live flip editor |
|---|---|---|
| response time | number input, **Save**, explicit **Not stated** button | free text, blank = unset, committed with the card |
| reply policy | three-way radio, all three states nameable | two-state switch; **unset is an origin state you cannot return to** |
| commit model | immediate, per row, with undo | buffered — Done commits, Escape discards |
| Pro strip | present, static | absent |

⚠️ **The one substantive gap is the third state.** The live switch cannot put `noResponseMeansNo`
back to *not stated* once set — the agent-list spec says so explicitly ("unstated is an ORIGIN
state, not a destination") — while this card's radio group can, through `replyPolicyWrite`. That is
the capability that dies with the component, and it is the thing to weigh.

## Not deleted

Per the pack: report only. If the intended home for an agency's stated response time and silence
policy is a card of its own — which the §1 attribution and the §4 slider both now read from — this
is a thing to wire up rather than remove, and that is Nick's call.
