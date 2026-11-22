# Log a query v1.1 — match the design, the track, and editing in place

Branch `log-a-query-v1-1`, cut from `origin/log-a-query-v1` (4604aa5c7). Pushed, not merged. On dev from
`dev/…-laq1-qc1534-aa1-laq11`: see "Dev" at the end.

## False premises

1. **The reference's "Query Centre slip, as built (v153.3)" is not the built slip.** Measured in the same browser: the
   built head band pads 10/14 (ref 14/14/14/16), its seal is 40px (ref 46), the name 19px (ref 18.5), the current track
   node 34px (ref 40), the stage word 16px (ref 15.5), a fact pads 10/12 (ref 9/12). So the preview slip is ~20px
   shorter than the reference's, and everything under it on the check and the celebration sits ~20px higher. The slip
   is out of bounds ("the Query Centre list and slip styling"), so it is unchanged. The fidelity suite places the
   slip's box (x, y, w) exactly and treats its height as content.
2. **The reference's "FlowHead, as built" is not the built FlowHead.** Built: padding 20/20/18/26, line 16px/1.5.
   Reference: 18/18/8/24, line 15.5px/1.45. The reference's values apply in this flow only (`.laq .flh`); Adding new
   agent and Recording response keep the FlowHead as it is.
3. **"The existing 504px rule under 1400px" is the query card's rule, not the log panel's.** The log panel was
   SidePanel's 520 (560 above 1440) on a borrowed `.qc149f` surface. It now takes the card's sizes: 540, and 504 at 1400
   and under.
4. **The step editor "as on dev" and the reference's port of it differ in four places.** Dev's ✎ Edit pill is
   12.5px/500 navy (ref 13px/400 #5b4f47), its Save is 14.5px (ref 14px), its date is a white pill (ref navy), and it
   hides the other messages' ✎ Edit while a step is open (the ref keeps them). The reference wins on look: the first
   three now match it. The fourth is behaviour and stays as dev has it (the one exemption in F-edit, recorded).
5. **"How to submit" cannot be free text.** It is the agent's `submissionMethod`, which the app and the rules treat as
   one of Email, Online Form, Query Manager or Post. In edit mode it is an editable value with our menu, not a text line.
6. **The retired details composer could not save two of its own choices.** It offered "QueryManager" and "Other" as
   how the query went; the rules accept only `Email`, `Online Form`, `Query Manager` and `Post`, so those saves were
   refused. The Query sent step's How offers the four the rules accept.
7. **The step editor writes the step, not the query's `dateSent`.** Changing the Query sent step's date moves the
   step (its activity) and leaves `dateSent` as it was. That is `planStepEdit` as on dev, unchanged here; LQE5 measures
   the step. Whether `dateSent` should follow is a question for Nick (open).
8. **ref-metrics.json records no footer on the celebration.** The reference draws it as `.yay-acts` with `.cf`'s own
   values inline; the suite compares the app's footer with that element, read live.
9. **The Contact list's row does not show an agent's reply time** (Contact list v26/27). LQE4 reads it on the agent's
   Contact list card instead ("replies in about 12 weeks").

## Step 0 — why v1 looked different

Ref against v1 at 1440×860, every key of `ref-metrics.json`, six states: **62 keys out**
(`reports/log-a-query-v1-1/fidelity-v1.json`). The causes, by part:

| Part | Delta (v1 → ref) | Cause (selector · file) |
|---|---|---|
| inner box (frame) | padding 10/13 → 0; radius 9 → 14; 13px → 16px; ink #3a1c14 → #1c130f; 10px margin under it | `.qls-in` in `queries/queryLogSheet.css` (the old log sheet, still imported by Queries.tsx): v1 named its classes `qls-*`, which that sheet styles globally |
| FlowHead inset in a white margin (x +14, y +11, w −48) | the inner box's 10/13 padding | same `.qls-in` |
| type and rows larger/smaller, brown ink (body, search, rows, footer: 13px #3a1c14) | inherited from the inner box | same `.qls-in` (`font-size: 13px; color: #3a1c14`) |
| panel 520 wide | 540 | `.spanel` `min(520px, …)` at ≤1440 in `shell/sidePanel.css`; the 7px mat and 20px corners came from `.spanel.qsp:has(> .spanel-own > .qc149f)` in `qcv149card.css` |
| panel 746 tall | 760 | SidePanel's top/bottom insets; the reference card is `clamp(640, 100vh − 32, 760)` |
| FlowHead padding 20/20/14/26 | 18/18/8/24 | `flowHead.css` + v1's `.qls .flh { padding-bottom: 14px }` |
| line 16px/24 | 15.5px/22.5 | `.flh p.flh-l` in `flowHead.css` (`!important`) |
| track | (v1 had a stepper strip) | Phase 2 |
| also from the old sheet | `.qls { gap: 14px }`, `.qls-pop { position: fixed }`, `.qls-hint`, `.qls-sum` | same file, same prefix |

`brand.tsx` and the qc152 card sizing were not causes here: the flow already handed fonts back with `inherit`, and the
card's sizing only applies to the query card.

## Step 0 — today's editing (before this pass)

- **"Query details" composer** (`QcComposer1522`, `case "details"`): one door, the band's pencil (`onPencil152` →
  `open1522("details")`). It edited the agent (a native `<select>`), how it went (Email/QueryManager/Post/Other), the
  package (a native `<select>`) and a note. Save: `planDetails1522` (agentId, sendMethod, the package fields) on the
  page's batched writer, plus `addJournalEntry` for the note.
- **Tracking's step editor** (`QcStepEdit1522`, "✎ Edit" beside each message): When (our calendar), Materials / Asked
  for (chips, × and + Add), Their words on the agent's steps, Delete this step, Cancel, Save. **No How and no Package on
  the Query sent step.** Save: `planStepEdit` (the step's date and pieces, the words), one snapshot, Undo in the toast.
- **Materials tab Edit links** (`onEditMats`): opened a materials-only composer (`j: "mats"`), not the step editor.
  "+ Add something you sent" did the same for the query step.
- **What was sent, corrected**: `lib/queryActions/sentCorrect.ts` `sentCorrectionFields` (the drawer's EditJourney and
  the v149 card's edit mode). The v152 card used `planDetails1522`'s lighter package fields instead.
- **Agent tab "+ Add …"** (`onAgentField`): opens the agent card's editor at that field (`openAgentCard`); it saves
  through `lib/agentCardSave.commitCardSave` (snapshot, `commitAgentEdits` with the reply-time fan-out, the
  data-quality flag).
- **Notes** (`journalEntries`): created by the Notes tab (`NotesPane`, on blur, `addJournalEntry`) and by the details
  composer; `updateJournalEntry` / `deleteJournalEntry` exist in the db layer but the card offered neither.
- **The list's "Add date"** opened the card's old v149 edit mode, which carries two native `<select>`s.

## Per phase

**Phase 1 — logging fidelity** (`0578264fd`). The prefix is `laq-`; the borrowed classes are gone; the panel is the
reference card (540/504, 7px mat, 20px corners, the 1px #d9c8ba inner line at 14, 760 tall at 860, centred); the
FlowHead flush to the frame. `tests/e2e/laqFidelity.measure.ts` opens the reference (file://) and the app and reads
every key: red on v1 (62 keys), green after.

**Phase 2 — the track** (`8eaa29456`). Five nodes, the reference's `.ltrk`: finished = navy ✓ button (Tab, Enter) with
the answer beneath; current = 40px ringed disc; the rest faint and not focusable. LAQ9 in `laqV1.measure.ts`: each
node's state on every stage, Tab and Enter, and the return to the check. Gates for this commit were run on a clean
checkout of it (two file-scanning tests timed out under load there and pass alone).

**Phase 3 — editing in place** (`a683aed11`). The details composer, its `<select>`s and CSS, and the materials-only
composer are removed. Edit mode (`QcCardEdit152` + `qcv152inplace.css`) is a layer over `QcCard152`: the dashed navy
frame, the editing strip, the cool wash, the navy save bar; the agent (header), the agent's details (Agent tab), notes;
dotted underlines with our anchored menus; inline text on a dashed rule; rust dots on changed values and tabs; the
leave check; double-click entry. The Query sent step's editor gains How and Package. `laqEdit.measure.ts` LQE1–LQE7
and F-edit; unit `qcCardEdit152.test.ts`.

**Phase 4 — screens and runs** (`093400d40`). One run of every suite on a fresh emulator: **17 passed** —
laqFidelity **311 values** (F-log six states, F-edit five), laqV1 **89 checks** (LAQ1–LAQ9), laqEdit **35 checks**
(LQE1–LQE7), the screens. Every write put back in the same run; the fixture checked afterwards.

## Side by side and diffs (`side-by-side/`, ref left, build right, diff third)

| Screen | Mismatch | What differs |
|---|---|---|
| 01 agent | 5.09% | the harness's agents (38 ready, other names) in place of the ref's four |
| 02 sent | 2.62% | the agent's name in the track and line |
| 03 materials | 5.93% | the harness's packages and their parts |
| 04 materials, pieces | 3.58% | the harness's letters, synopses and versions |
| 05 how | 3.09% | the agent's name and which method is "from their card" |
| 06 check | 8.69% | names and dates, and the preview slip ~20px shorter (false premise 1) |
| 07 back to Sent from the track | 2.21% | the answers under the track |
| 08 celebration | 8.36% | names, numbers, the reply window, and the slip (false premise 1) |
| 09 batch check | 12.07% | as 06, plus the batch toast (still up in the build's shot) and the paperclip's popover under the pointer |
| 10–14 editing | (no gate) | the reference card is a redraw: the card body (book block, chips, height 700 against 780) is the app's own |

On every screen two small artefacts add to the count: the shell behind the panel's top-right corner (the reference
sits on a cream page) and the dev build's "BG LAB" chip at the bottom right. None is a style difference: the fidelity
suite holds every measured part of 01–09 to the reference within 1px and its exact styles.

## Save path per editable field

| Field | Where | Save |
|---|---|---|
| The query's date and pieces | Query sent step editor | `planStepEdit` (as on dev), one snapshot, Undo |
| How it went, the package | Query sent step editor | `planDetails1522`'s fields, merged into the step's plan: one write, one Undo |
| Any other step's date, pieces, their words, delete | step editor | `planStepEdit` / `planFix` (unchanged) |
| The agent the query is to | edit mode, header | `planDetails1522` (the old details save), `commitPlan` |
| Reply time, no reply means no, asks for, how to submit, wishlist, email, website | edit mode, Agent tab | `commitCardSave` (the agent card's path: snapshot, reply-time fan-out, data-quality flag); a wishlist edit stamps `mswlCheckedAt` as the agent editor does |
| Notes | edit mode, Notes tab | `updateJournalEntry` / `deleteJournalEntry` / `addJournalEntry` |

Edit mode's Save toasts "Changes saved" with no Undo (the reference draws none, and an Undo that put back only some of
the three writes would mislead).

## Not done, and why

- The preview slip's height (false premise 1): the slip is out of bounds.
- Whether `dateSent` should follow the Query sent step's date (false premise 7): a decision, not a fix.
- The Contact list's own host for the log flow (`AgentCardPanel24`) was not re-measured against the reference; it
  takes the new inner frame and type, and its panel shell is its own.
- The red-first proof for F-edit was the first full run (deltas on the pill, Save, reply option), recorded in the
  commit messages, not as a separate file; F-log's red proof is `fidelity-v1.json`.
- Pixel diffs under 2% would need a fixture account holding the reference's own agents, packages and counts.

## Dev

https://scriptally-dev.web.app serves `index-uz3iJgBA.js`, built from
`dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1-td53-cl27-td54-cl27b-yn1-laq1-qc1534-aa1-laq11` (pushed): the line
dev was serving (`…-laq1-qc1534-aa1` @ e284e8515, `index-BQXN6Mzy.js`: Log a query v1, Query Centre v153.4, Add agent
v1) with this branch merged in. Two conflicts, both prop lists beside To-do v53's new `desk` prop on the card; both
kept. On that merged line the three suites ran green on the emulator (14 passed) before the deploy, and its Vitest
shows only the known guard failures. Hosting only; prod untouched.
