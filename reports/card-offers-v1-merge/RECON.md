# Card offers v1 merge: Phase 0 recon

Taken 16 Nov 2026. Nothing was changed during it.

## False premises found here

1. **The agent card is not a `SidePanel`.** The prompt says to keep both sides in `SidePanel`, including the focus handling from overnight fixes v1 for "Agent card open, viewing" and "editing". But the Contact list's card renders in `AgentCardPanel262`, which is its own portal. It is not a `SidePanel`, on either side.
   - On the served line, `AgentCardPanel262` is byte-identical to the base. It has no focus handling at all: overnight fixes v1 put `useDrawerFocus` on `SidePanel`, `DrawerShell` and `HalfDrawer` only.
   - Card offers v1 lifted `SidePanel`'s scrim into a shared `SideScrim` and mounts it under the card at three levels.
   - So the combined behaviour (M1 to M3) is not "keep both": neither side has focus handling on the agent card. It has to be added in the merge, by putting `useDrawerFocus` on `AgentCardPanel262`: modal only while a section is being edited. The prompt spells out that behaviour exactly, so it is built to that spec, not guessed.
2. **"Expect `AgentCard262Edit`, their CSS, `contactEdit.ts`" to be changed on both sides.** Not so. Only six files changed on both sides (below). `AgentCard262Edit.tsx` and `contactV262.css` changed on card offers only. `contactEdit.ts` changed on neither.
3. **The original Phase 5 was never finished.** The untracked report's section 7 reads "(Filled in below.)" and nothing follows. There is no `shots/` folder: none of the screens §6 lists exist. There was no `-co1` dev deploy.

## 1. Is a session live in `ScriptAlly-co1`?

No.
- `git worktree list`: `/Users/nickphysick/ScriptAlly-co1 97e7fa693 [card-offers-v1]`.
- No node, vite, vitest, playwright or java process has its working directory there.
- No file there was modified in the last 30 minutes. The two strays date from 11 Nov: `cl262.measure.ts` at 12:40 and `REPORT.md` at 12:18.
- `worktree-claim status` lists no claim on it.

## 2. The branch

- `git status --porcelain`: ` M tests/e2e/cl262.measure.ts`, `?? reports/card-offers-v1/REPORT.md`.
- Branch `card-offers-v1`, tip `97e7fa6937fe081b8a4563b580bf07751ac0ee9e`. It is not on origin.
- Cut from `origin/dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1-td53-cl27-td54-cl27b-yn1-laq1-qc1534-aa1-laq11` @ `510c1cec3` (reflog: "Created from …").
- `510c1cec3` is an ancestor of the served tip, which is 271 commits past it.
- Its own commits since the base:
  - `70d83b004`: Phase 1, the offer engine (cardOffers), CO1–CO7
  - `d60f024db`: Phase 2, the offers on the card, CO8–CO12
  - `f8e371c38`: Phase 3, what Save does, CO13–CO16
  - `97e7fa693`: Phase 4, the page dims behind the card; + Website / + Email land in the field, CO17–CO20

## 3. The two stray files

- **`tests/e2e/cl262.measure.ts`** (+7 −2): a re-point of cl262's "another row asks" check for Phase 4's action dim.
  - While a section is edited, the scrim covers the row, so Playwright's `locator.click()` would wait for a covered element.
  - The edit clicks the pointer at the row's place instead, and the check also requires the row to have had a box.
  - Whether it passes as it stands is not known yet: it is a rendered e2e check, run in Phase 3.
- **`reports/card-offers-v1/REPORT.md`**: the original build's report.
  - It claims Phases 1 to 4 with commits, plus Phase 5 "(this commit)".
  - Section by section, against the original prompt:
    - the offer engine: claimed and committed (Phase 1);
    - the offers on the card: claimed and committed (Phase 2);
    - what Save does: claimed and committed (Phase 3);
    - dimming and "+ Website" / "+ Email": claimed and committed (Phase 4);
    - verify: claimed but not done. The lock readings are in `mutation-proofs.txt`, but the screens don't exist and section 7 (the runs, the dev deploy) is empty.

## 4. The design ref

Present: `design-refs/card-offers-v1/agent-card-edit-v8.html`, SHA256 `56dff65aa6bce2b83a4159ab0ca90d0f7fe65d0596583074965c30392d6592c7`. It matches, and it is in `.refhashes.json`.

## 5. Locks CO1 to CO20

All twenty exist on the branch:
- CO1–CO7 are in `src/lib/cardOffers.test.ts`;
- CO8–CO20 are in `tests/e2e/cardOffersV1.measure.ts`.

`reports/card-offers-v1/mutation-proofs.txt` (committed) records a red reading for every one:
- CO1–CO7: a named source mutation, exit 1.
- CO8–CO12: `CO_MUTATE`, in the page.
- CO13, CO15, CO16: the other choice in the page, plus a source break.
- CO14: a source break only.
- CO17–CO19: in the page.
- CO20: a source break.

The green readings are claimed in the report's table. They are re-read on the merge branch in Phase 3.

## 6. The served line and the overlap

- Dev serves `index-D4Q6OPP0.js`, read from https://scriptally-dev.web.app/ on 16 Nov.
- That is `dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align-pk43-wsh1-wsh11-onf1`, tip `cdcc004ca`. Dev has not moved.
- Since `510c1cec3`, card offers changed 21 files and the served line changed 2,302.

Changed on both sides:

| File | Card offers | Served line |
|---|---|---|
| `src/components/shell/SidePanel.tsx` | lifts the scrim into an exported `SideScrim` (off · light · action), which owns `body.spanel-dim` with a toggle | counts dims across panels instead of toggling (Log a query v1.2); an `onScrim` prop; `useDrawerFocus` with modal = dim, and `aria-modal` (overnight fixes v1) |
| `src/components/agents/AgentList.tsx` | `onSave` passes the offer plan through, and the toast says what the save did | the Contact list QC layout, header v2 and principles rebuilds (+148 −93); the card's save toast untouched |
| `src/components/agents/card/HostAgentCard.tsx` | the same `onSave` and toast change for the card on other pages | `completeNewAgent(agentId, "handoff")` |
| `src/components/agents/contact/AgentCard262.tsx` | the offers, the editing event, the save plan, + Website / + Email focus | one CSS import (`contactPrinciples.css`) |
| `tests/e2e/addAgentV1.measure.ts` | AA10 re-pointed from the Also box to the offers | one line |
| `design-refs/.refhashes.json` | the card-offers ref | other refs enrolled |

Changed on card offers only:
- `AgentCard24.tsx`, `AgentCard262Edit.tsx`, `AgentCardPanel262.tsx`, `contactV262.css`
- `sidePanel.css`, `useAgentSave.ts`
- `agentCardSave.ts`, `cardOffers.ts` plus its test, `contactCard262.ts`
- the e2e `cardOffersV1.measure.ts`, `cl262.measure.ts`, `co1Emu.mjs`
- the ref and `mutation-proofs.txt`

`contactEdit.ts` changed on neither side.
