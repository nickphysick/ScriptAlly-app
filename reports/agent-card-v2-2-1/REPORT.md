# Agent card v2.2.1 and Query card v168.2 — five small fixes from Nick's rulings (24 Nov 2026)

Branch `agent-card-v2-2-1` (pushed, not merged), cut from the line dev served
(`dev/…-laq23-acv22-rar2` @ 57ba47c65, `index-N01SII2_.js`). Dev now serves **`index-DV1b7uNl.js`**, built from
`dev/…-acv22-rar2-acv221` @ 679e13f9b.

## False premises

1. **The bubble's material tip opens on click (or keyboard), not on hover.** L19 presses each material.
2. **The head's saved message never said "MSWL".** A head save reads "Saved contact details for {first}". The field's
   name (`FIELD_NAME.mswl`) is only used to count a save's changes. It now says "wishlist page" all the same.
3. **There is one journey that draws materials, not several.** Only the composer's "send" journey (Mark the partial /
   full / revision sent) uses `MatChips`. The step editor was already fixed by v168.1.

## Step 0 findings

- **0.1 — the dev line.** Dev served `index-N01SII2_.js` from `…-acv22-rar2`. That line holds `RemoveConfirm`
  (`src/components/agents/contact/AgentCard24.tsx`; the brief's path omits `contact/`), `acv22.measure.ts`, and qc168
  L15–L17. The STOP gate passed.
- **0.2 — mono capitals and sizes under 12px in `MatChips`.** The base rule `.qc152 .qc152-mp` (qcv152edit.css) drew
  9.5px mono capitals; v168.1 overrode it only inside the step editor. The composer's send journey still drew them, and
  the × was 10px. These other rules on the card are not `MatChips` and were left alone; listed for Nick:
  - the composer's agent initials (`.qc1522-ag .av`, 9px mono);
  - the older v149 card's piece, chip and label rules (`qcv149card.css` `.qc149c-piece`, `-mc`, `-ch`, `-k`, `-gs`).
- **0.3 — `stepChips` and the readers of `detail`.**
  - `stepChips` set `detail: label`. So did the composer's draft chips (`QcComposer1522`).
  - Reader 1: the bubble's tip, `tip.show(el, c.detail, c.label)`. An empty detail would draw the label as a bold head
    over an empty line.
  - Reader 2: the Materials rows (`QcMaterials158`). An empty detail draws nothing (`c.detail && …`).
  - Nothing else reads a chip's detail. The PDF export's `event.detail` is a different type.
- **0.4 — `RemoveConfirm` and its doors.**
  - The old words: "Remove {name}? This deletes {n} query/queries and their history. Type their name to confirm." With
    no queries: "… This can't be undone." The buttons were "Keep" and "Remove".
  - Doors: the v2 card's band ⋯ "Delete this agent" (already "Delete"), and the old card's footer link (`FOOT_WORD.remove`
    = "Remove").
  - Not this gate: the older `AgentQuickView` has its own delete confirm. It still says "Type their name to confirm".
    Listed for Nick, not changed.
- **0.5 — "More contact details".**
  - "MSWL" and "Social" sat at different heights because the pills sheet gives `.aap-f` a 20px top margin, and 2px to
    a first child. So Social sat 18px lower, measured at 242 against 260.
  - Every other place "MSWL" is shown to the writer is under "For Nick to rule".

## Phases

| Phase | Commit | Files |
|---|---|---|
| 1 · The journeys' chips | 6bf5905a4 | `qcv152edit.css` (base chip rule: serif 14px, no transform, × 14px), `qcv168.css` (v168.1's step-editor override deleted) |
| 2 · A material's name is saved once | cbb6d94c2 | `qcCardView.ts` (`detail: ""`), `QcComposer1522.tsx` (draft chips), `QcCard152.tsx` (a tip with no detail shows the label alone), `QcMaterials158.tsx` (comment; the guard stays) |
| 3 · The delete confirm | 37886b3df | `AgentCard24.tsx` `RemoveConfirm` (the words, "Keep {first}" / "Delete", group and field labels), `lib/contactV24.ts` (`FOOT_WORD.remove` = "Delete") |
| 4 · More contact details lines up | 824ba11f5 | `acv22.css` (every field in More starts at the same top), `AgentCard262Edit.tsx` ("Wishlist page"; `FIELD_NAME.mswl` "wishlist page") |
| 5 · The ruling | 3a6829a8e | `docs/decisions/agent-card.md` (the 24 Nov ruling; the 21 Nov line points to it) |
| 6 · Locks | 679e13f9b | `qc168.measure.ts`, `acv22.measure.ts`, `seedQc168.mjs` (Bram's partial asked for), `seedAcv22.mjs` (Vera with three queries), ledgers, frames |

What each phase changes:

- **Phase 1.** Nothing moves except the chip words, which are now larger. Shape, order and logic are unchanged.
- **Phase 2.** Stored data is not rewritten. A recorded material's label already carries what adds something (a
  length, a version).
- **Phase 3.** In the field's label, "Type {name} to confirm" replaces "Type the agent's name". Everything else is as
  the brief worded it.

## Locks

Each went RED under its own mutation only, then GREEN. Ledgers: `reports/query-card-v168/ledger/{mutant,after}-L18|L19.json`
and `reports/agent-card-v2-2/ledger/{mutant,after}-AC15|AC16.json`.

| Lock | Mutation | Red (mutant) | Green (after) |
|---|---|---|---|
| L18 | M18 (in the page): the v152 chip rule back (9.5px mono, uppercase) | fonts `JetBrains Mono`; transforms `uppercase`; sizes `[9.5, 9.5]` | Source Serif 4; transform `none`; `[14, 14]`; words "First 3 chapters · Post-R&R (T. Marsh)", "+ Add" |
| L19 | `mut168("19")`: `stepChips` sets `detail` to the label again | tips "Query letterQuery letter", "SynopsisSynopsis", … | tips "Query letter", "Synopsis", "First 3 chapters", "Full manuscript"; no head |
| AC15 | `mut168("ac15")`: the v2.2 words | "Remove Ada Quill? This deletes 1 query and their history…", "Keep" / "Remove" | exact Phase 3 words for Nell (0), Ada (1) and Vera (3); "Keep {first}" / "Delete"; Delete disabled until the name is typed; never confirmed |
| AC16 | in the page: the 2px/20px tops and "MSWL" | labels 242 / 260, fields 271 / 289, label "MSWL" | labels 240 / 240, fields 269 / 269, label "Wishlist page" |

L19's first mutant run timed out on its own dismissal (a click outside the panel closed the card). The measure now
blurs the chip. Its mutant rerun was red as above.

## Baseline, before and after

| Gate | Before | After |
|---|---|---|
| Type-check | clean | clean |
| Vitest | 13,374 passed, 4 skipped | 13,374 passed, 4 skipped |
| Build | clean | clean |
| acv2, acv21, acv22 (AC1–AC14) | green | green, plus AC15 and AC16 |
| laqV22, laqV23 | green | green |
| qc167 | green except **QC167-10** | green except **QC167-10** (red on base, as in v2.2's report) |
| qc168 L1–L17 | green except **QC168-6** (once, a read race) | green, plus L18 and L19 |

What was red, and why:

- **QC167-10, before and after.** A card stays inert under the journey.
- **QC168-6, before only.** Undo was read back before it landed. The logged readback a moment later was exact, and
  the lock passed after.
- **Seed timeouts, both runs.** The long one-command run hit `spawnSync ETIMEDOUT` in the emulator seed at the same
  place before and after (QC167-7, QC167-8, QC168-1). Playwright's failure cap then stopped the rest. qc167 and qc168
  were re-run on their own, before and after; the table gives those results.

## Frames (Chromium, 1512)

- The delete confirm for 0 queries: `reports/agent-card-v2-2/frames/chromium-1512-delete-confirm-0.png`.
- The delete confirm for 1 query: `reports/agent-card-v2-2/frames/chromium-1512-delete-confirm-1.png`.
- The delete confirm for 3 queries: `reports/agent-card-v2-2/frames/chromium-1512-delete-confirm-3.png`.
- More open: `reports/agent-card-v2-2/frames/chromium-1512-head-more-open.png`.
- One journey's chips (Mark the partial sent): `reports/query-card-v168/frames/chromium-1512-journey-send-chips.png`.

## Dev

- Served before: `index-N01SII2_.js` (`…-acv22-rar2`). My branch is that line plus six commits.
- Pushed as `dev/…-acv22-rar2-acv221` @ 679e13f9b.
- Built from a clean checkout of that pushed tip. Deployed hosting only, with `--project scriptally-dev`, guarded on
  the served hash.
- Now serves **`index-DV1b7uNl.js`**. Its `AppRoot-CQK9WLvs.js` contains "every step in them" and "Wishlist page".

## For Nick to rule

1. **"MSWL" elsewhere** (left alone, as the brief says):
   - the add-agent journey: its field label, its "Email, website, MSWL, social" hint, and its reach summary
     (`AddAgentJourney.tsx`);
   - the phone add form: the label and "Their #MSWL page" (`phone/v3/AgentsV3.tsx`);
   - the older quick view's link text (`AgentQuickView.tsx`);
   - Housekeeping's "Their agency profile or MSWL page" (`ContactHousekeeping.tsx`);
   - the wishlist hints "paste from their MSWL or agency page" (`agentPills.tsx`, `InlineEdits.tsx`);
   - the Record a response modal's placeholder;
   - the CSV import's "MSWL Notes" column;
   - a seeded corkboard example;
   - the task "Complete MSWL details for …" (`lib/db.tsx`).
2. **"They" and "their" for an agent, found in passing:**
   - `FIELD_NAME` names a field "how they take queries";
   - the older `AgentQuickView` delete confirm says "Type their name to confirm";
   - several of the "MSWL" hints above say "their".
3. **I decided the field's label** "Type {name} to confirm", for screen readers. The brief gave no words for it.
4. **I decided the composer's draft chips drop the doubled detail too**, as a saved step's do.
5. **Version names are lower-cased** in the send journey's hint ("From post-r&r (t. marsh)", `vName.toLowerCase()`).
   This is pre-existing; a name like "Post-R&R (T. Marsh)" reads wrongly.
6. **Composer initials and older chips:** the composer's agent initials (9px mono) and the older v149 card's mono chip
   rules sit outside `MatChips`. Rule whether they should follow.
