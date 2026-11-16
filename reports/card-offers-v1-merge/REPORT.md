# Card offers v1: rescue, push and merge onto dev

Done 16 Nov 2026. Dev now serves Card offers v1 on top of the line it served before.
- Nothing went to `main` or prod. Functions were not deployed.
- The Phase 0 recon is in `RECON.md`.

## 1. False premises

1. **The agent card is not a `SidePanel`.** The prompt asked for `SidePanel` to keep both sides: the served line's focus handling (overnight fixes v1) and card offers' dim levels.
   - The Contact list's card is rendered by `AgentCardPanel262`, its own portal, and that is not a `SidePanel` on either side.
   - On the served line it was byte-identical to the base, with no focus handling at all: overnight fixes v1 only covered `SidePanel`, `DrawerShell` and `HalfDrawer`.
   - So the behaviour in "Agent card open, viewing" and "a section being edited" didn't exist on either side.
   - It is added in the merge's second commit, `a7153a89d`, exactly as the prompt specifies (M1–M3). It touches no file outside the agent card.
2. **Only six files changed on both sides, not the agent card's whole set.**
   - `AgentCard262Edit.tsx` and `contactV262.css` changed on card offers only.
   - `contactEdit.ts` changed on neither side.
   - Three files actually conflicted (§3).
3. **The original build's Phase 5 was never finished.**
   - Its report's section 7 read "(Filled in below.)" with nothing after it.
   - None of the screens it listed existed.
   - There was no `-co1` dev deploy.
   - All three are done here.
4. **Screenshots are on the emulator, not dev data.** The scenarios need the four `co1` agents (Sarah, Olive, Fiona, Nell) in a known state. Making them on dev would have meant writing to the shared dev database, which the brief doesn't ask for. The emulator build is the same tree dev now serves.
5. **M3 was green before the change.** Contact list principles v1 already returns focus to the card's row on close, in `AgentList.tsx`. So M3 was made stronger: it also checks focus was inside the card before closing. Its mutation then breaks both restores (§4).

## 2. What was rescued

The `ScriptAlly-co1` worktree was not live: no processes, no file touched since 11 Nov, no claim.

| What | Commit |
|---|---|
| `tests/e2e/cl262.measure.ts`: "another row asks" re-pointed for the action dim (it clicks the pointer at the row's place, because the scrim covers the row) | `47b050035`. Committed as found. It passed on the merge branch at both 1512 and 1280 (J10). |
| `reports/card-offers-v1/REPORT.md`: the original report | `04af8625a` |

`card-offers-v1` is pushed. Its remote tip, `04af8625a9522f2d7a79516f5b55bf25f3329a61`, equals the local one.

## 3. The conflicts, file by file

`card-offers-v1-merge` was cut from the served tip `cdcc004ca`. The merge commit is `4f29e9703`.

| File | From the served line | From card offers |
|---|---|---|
| `design-refs/.refhashes.json` | every ref it enrolled | `card-offers-v1/agent-card-edit-v8.html` |
| `src/components/agents/AgentList.tsx` (imports only) | everything. It had dropped `commitCardSave`'s import because Housekeeping's save moved into `useHkFixes`. | the `offerToast` import. Its stale `commitCardSave` import is not kept. |
| `src/components/shell/SidePanel.tsx` | the counted dim (Log a query v1.2: two panels can dim at once); the `onScrim` prop; `useDrawerFocus` with modal = dim; `aria-modal` | `SideScrim` (off · light · action), lifted out so the agent card dims through the same element |

**How `SidePanel` combines the two.**
- `SideScrim` now holds the served line's dim count, not card offers' toggle.
  - So the agent card's scrim and any `SidePanel`'s scrim count together, and one closing can't lift `spanel-dim` while the other is still dimming.
  - Light ↔ action is one dim, not two.
- `SideScrim` takes `onScrim` and passes it through. A click does anything only at the action level.

**Auto-merged, and checked:**
- `HostAgentCard.tsx`: card offers' toast plus the served line's `"handoff"`.
- `AgentCard262.tsx`: card offers' offers plus the served line's CSS import.
- `addAgentV1.measure.ts`.

**Then `a7153a89d`, on `AgentCardPanel262` only: `useDrawerFocus(panelRef, true, { modal })`, where `modal = !leaving && (editing || cardEditing)`.**
- The scrim's level reads the same `modal`, so the dim and the trap can't disagree.
- `aria-modal` follows `modal`.
- Viewing: light dim, not modal. Focus moves in, Tab is not trapped, the page is not inert, and a row click switches the card.
- Editing: action dim, modal. Tab is held inside, the page is inert, and a scrim click is Escape, which runs the card's guard.
- The Query Centre's query panel while browsing: no scrim, not modal, unchanged (CO19, DR).

Nothing outside the agent card changes how it looks. The Contact list's suite failures are identical to the served line's, to the pixel (§6).

## 4. The locks

Every reading below was taken on `card-offers-v1-merge` against the emulator, with one worker.

| Lock | Green (merge branch) | Red reading |
|---|---|---|
| CO1–CO7 (Vitest) | in the full run: 0 failed outside the 3 pre-existing | each under its named source break (`reports/card-offers-v1/mutation-proofs.txt`, original build) |
| CO8 | 9/9 | `CO_MUTATE=CO8`, original build |
| CO9 | 7/7 | same |
| CO10 | 12/12 | same |
| CO11 | 4/4 | same |
| CO12 | 4/4 | same |
| CO13 | 6/6 | other choice + source break, original build |
| CO14 | 3/3 | source break, original build |
| CO15 | 6/6 | other choice + source break, original build |
| CO16 | 8/8 | other choice + source break, original build |
| CO17 | 5/5 | in page, original build |
| CO18 | 4/4 | same |
| CO19 | 3/3 | same |
| CO20 | 6/6 | source break, original build |
| DR1/2/3/5, DR6, DR7: query panel, Log a query, Housekeeping | all pass, on the merge branch and the served line | `DR_MUTATE=off` (overnight fixes v1 report) |
| M1 viewing | 6/6 | without the change, 5/6: focus never moved into the card. Under mutation (modal forced on), the covered row can't be clicked. |
| M2 editing | 7/7 | without the change, 3/6: the page is not inert, the card is not aria-modal, and Tab went card → body → page |
| M3 closing | 3/3 | under mutation (the hook's restore and AgentList's row restore both removed), 1/3: focus fell to BODY after ✕ and after Escape. Also red without the change: "before Escape, focus is inside the card". |

- The DR locks don't cover the agent card: overnight fixes v1 had nothing on it to lock. M1 and M2 are the DR checks for the agent card, in each of its two states.
- The readings are in `m-proofs.txt` and `ledger/`, plus `reports/card-offers-v1/ledger/`.
- Also green on the merge branch:
  - cl262 J1–J11 at 1512 and 1280. J7 is card offers' "what a reply-time change says", replacing the served line's "also changes".
  - AA1–AA14.

## 5. "Keep them as they are"

**What it writes.** The old expected date, through `writerExpectedWrite`.
- That carries its own timestamp, so it wins on recency and the reply date holds (CO15, on the card and in the Query Centre).
- The nudge is left alone, and the reply-time deadline fan-out skips that query.

**Yes, the writer can see a date they never typed.**
- `nudgeState` words a writer-sourced date as "you expect a reply by {date}".
- `EditQueryDrawer` shows it as the writer's own editable expected date.
- The writer only chose to keep the agency's old window for one query. They never typed a date.

**The original build's proposal, still not built.** A per-query `pinnedWindowWeeks`, written on Keep and read by `expectedFor` before the agent's weeks, so the date stays the agency's. It needs a field, a rules line (dev and prod) and one branch in `expectedFor`.

## 6. Gates: baseline (served tip `cdcc004ca`) against final (`df37da493`)

| Gate | Baseline | Final |
|---|---|---|
| tsc (4 GB heap) | `tsc exit=0`, 0 errors | `tsc exit=0`, 0 errors |
| `vite build` | exit 0, only the chunk-size note | exit 0, only the chunk-size note |
| `vite build --mode development` | exit 0, only the chunk-size note | exit 0, only the chunk-size note |
| Vitest, `Test Files` | `2 failed \| 871 passed \| 1 skipped (874)` | `2 failed \| 872 passed \| 1 skipped (875)` |
| Vitest, `Tests` | `3 failed \| 12590 passed \| 4 skipped (12597)` | `3 failed \| 12612 passed \| 4 skipped (12619)` |

- The same three Vitest failures appear before and after:
  - `emuGuard`: no recipe starts an emulator without the guard;
  - `firestoreTarget` ×2: the fsTarget / `.env.development` offender lists.
- Their offender lists are identical, file for file. Card offers' `co1Emu.mjs` is not among them.
- The +22 tests are CO1–CO7's suite.
- The first baseline tsc and Vitest runs failed only because `functions/node_modules` was missing in the new worktree. It was symlinked and both re-run; the figures above are the re-runs.

**The suites, on the merge branch and on the served line.** The suites were Contact list (clq11, cl262, addAgentV1), Query Centre (qc1561), To-do (todoV56), log flow (laqV13) and DR (onfDrawers).
- Merge branch: `8 failed · 1 skipped · 87 passed (19.9m)`, which includes cardOffersV1 and coMergeFocus.
- Served line: `8 failed · 1 skipped · 71 passed (16.8m)`.

**Already on the served line (8):**
- clq11 T5 at 1440 and 1717: base vs this build. The pixel counts are identical on both lines: 5037/1794 and 7864/2385.
- laqV13 V13-4: the Query Centre's slip reads " · ".
- todoV56 L10 ×4: Query Centre and Contact list "unchanged", at 1440 and 1717.
- todoV56 L11: no phone file changed. It names `ImportDoorsPhone.tsx`, from overnight fixes v1 Part 1.

**New: none.**

## 7. Served branch and bundle

| | Branch | Tip | Bundle |
|---|---|---|---|
| Before | `dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align-pk43-wsh1-wsh11-onf1` | `cdcc004ca` | `index-D4Q6OPP0.js` |
| After | `dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align-pk43-wsh1-wsh11-onf1-co1` | `ba5242436` | `index-BEFE4y63.js` |

- The served bundle was read again right before the deploy, and the deploy was guarded on it still being `D4Q6OPP0`.
- The build came from a clean checkout of the pushed tip.
- After the deploy, the served hash equalled the build's.

## 8. For Nick

**What to look at on dev.**
- Open any agent with an open query in the Contact list and edit "How they work":
  - Move the response time: the sand offer appears, and the save bar's second line follows your choice.
  - Choose Closed: Leave it open / Close it as no reply, with Suggested on the right one.
  - On an agent with a full request out: the calm note, with no options.
  - "+ Website" / "+ Email": the cursor lands in that field.
- The page dims lightly while you read the card, and more while you edit. A click on the dimmed page then asks first if you have changes.
- By keyboard, open a row with Enter:
  - Tab moves through the card and on out to the page.
  - Start editing and Tab stays inside the card.
  - Escape returns you to the row.
- Screens, mock beside app at 1440 and 1280: `shots/{rt,cq,cp,cf,web}-{mock,app}-{1440,1280}.png`.
- The save bar after each choice: `shots/bar-{update,keep,stays-open,closes}-{1440,1280}.png`.

**Decisions this needs from you.**
1. **"Keep them as they are"** shows a kept date as the writer's own (§5). Build the pinned window, or accept the wording.
2. **The reopening calendar opens over the close offer** whenever Closed is chosen (original report, premise 10). Open it only on "Set a date", or place it clear of the offer.
3. **The Query Centre row's "reply by" can disagree with the card** for a "no response means no" agent (original report, premise 11). Left as it is.
4. **Prod rules:** card offers adds no field and no rule.

**Nothing was stopped.** No merge conflict needed a judgement the prompt's rules didn't settle. The only addition outside a conflict is the agent card's focus, which the prompt specifies (§1, premise 1).
