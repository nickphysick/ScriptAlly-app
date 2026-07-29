# Agent list — card, grid and editor fixes — run report

**Branch:** `claude-il` · **Date:** 29 Jul 2026 · Follows `reports/agent-card-visual.md`.
Eight items from Nick's browser pass; the blocking bug ran first.

## Commits + gates

Every commit passed `tsc --noEmit`, `vite build` and the full Vitest suite.

| Phase | SHA | Suite |
|---|---|---|
| 1 — validation trap | `dc7b917` | 1725 |
| 2 — closed-card front | `82f0c6b` | 1726 |
| 3 — grid and copy | `308509d` | 1726 |
| 4 — editor | `63f5d4e` | **1729** |

## ⚠️ The validation trap — the divergence was not where the pack expected

**The editor's create and edit paths never disagreed: they share one `onDone` and one
`validateDraft`.** The trap came from the validator itself, which required **both** fields as two
separate blocking checks:

```ts
if (!d.name.trim())   return { msg: "Agent name is required." };
if (!d.agency.trim()) return { msg: "Agency is required." };
```

That contradicts the app's own model — the card renders "Agent not specified" beneath the agency,
the Firestore `isValidAgent` rule accepts either, and Penhallow Literary exists in exactly that
state. So an agency-only record could be *created by import* but never *re-saved by hand*: it
could not be saved and could not be reverted.

**The real divergence was a THIRD path.** `AddAgentFocusForm` — the capture flow behind "Add an
agent" — carries its own validation, and it required the **name alone**, with a comment
explicitly claiming "the rule admits name-or-agency" while doing the opposite. Both paths now
state the one rule; the error copy is *"Give this record an agent name or an agency."*

Four tests: agency-only saves · agent-name-only saves · both empty blocked · an existing
agency-only record re-saves untouched.

## Shared strings — none were

`metaTokens` is the single source for the card's meta line and has no consumer outside
`AgentCard`. "Submissions page" appeared twice: the card's **button** (now "View website") and
the editor's **field label**, which stays — it names a specific URL. Flagging as asked: with the
button reading "View website", the field label may now read oddly next to it; it is a one-word
change if you want them aligned.

The card component is **not** shared with Discover or the Contact list. `grep` hits
`SmartImportReview.tsx`, but that declares its own local `AgentCard` — a different component of
the same name.

## Abandoned drafts were not persisting

The new-agent card is a local `stub` held in `newAgent` state; nothing is written until the first
valid Done calls `addAgent`. Escape already cleared it. So the bug was **discoverability, not
leakage** — there was simply no visible way out. The new `×` sits beside the tick, and
`draftDirty` decides whether to confirm: deliberately generous, counting any typed text, a picked
genre or star, the no-reply switch once stated either way, any material row, or a jotted note.

## The closed card

The ink `Closed` pill is gone — the hatch and the stamp already say it. The body is not rendered
when the door is closed **and** nothing of yours is live, leaving the name, agency and
response-time meta; an active query still renders in full. Hush and dim share **one** derivation
(`agentCardDims`), so they cannot drift apart.

**The stamp needed no repositioning** — the pack expected it "floating at the top-right", but it
was already `inset: 0` and flex-centred over the whole face, so it stays centred as the card
shortens. A 210px floor keeps a hushed card from reading as a stub.

## The ~400px card at three columns

Reported rather than judged, since I cannot see it: at the 1240px cap with an 18px gap, three
columns give **≈ 401px** per card ((1240 − 36) / 3). That is roughly 50% wider than the previous
auto-fill floor of 268px, so the meta line, the wishlist tags and the materials line all gain
considerable room — and on a *hushed* card, 400px of width against a 210px floor may read wide
and empty. **If it is too wide, the fix is lowering the content max-width, not a fourth column**
— the grid is now fixed at three precisely so width follows the cap.

## Needs a browser check

1. **Card height when the body is hidden** — the 210px floor against a 400px width; does the
   hushed card read as complete or as a wide, empty band?
2. **Stamp centring** in the shortened card.
3. **Three-column reflow** at ~1100 (two up) and ~700 (one up), and whether ~400px reads right.
4. **Discard confirmation** — the popover's placement under the `×`, and that a clean card
   discards with no prompt.
5. **Social empty state** — Add reveals a focused input; Cancel returns to rest; removing the
   last handle returns to rest.
6. **The two full-width editor rows** — the no-reply toggle sitting right with its helper beneath.
