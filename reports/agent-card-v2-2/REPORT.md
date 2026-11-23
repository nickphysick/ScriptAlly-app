# Agent card v2.2, with Query card v168.1 — one way to edit on both cards

Branch `agent-card-v2-2` (pushed), cut from what dev served at the start
(`dev/…-mg1-pc3-laq22-qc168` @ 93fb01e24, `index-CrH8OKjv.js`). NOT merged to main.
Refs: `design-refs/query-card-v168/query-card-v168.html` (SHA256 ffb6ebdb…8f5a, unchanged) and
`design-refs/agent-card-v2-2/agent-card-v2-2.html` (SHA256 b6edfa7d…beeb, matched, enrolled).

## False premises

- **"A door to MSWL opens More with it focused" (AC10).** No door in the app asks the card for the MSWL field today
  (`finishItems` has no MSWL gap; no `openAgentCard(…, { focus: "mswl" })` caller; the inline asks never send it). The
  head does open "More contact details" by itself for a door that names mswl/social/form (built), but nothing sends one,
  so AC10 locks the two doors that exist: "+ Add email" and "+ Add a website" each land in their head field.
- **Worktree size.** CLAUDE.md says ~1.2 GB; here each is ~3.2 GB. With three worktrees the disk fell to the emulator
  guard's 20 GB floor once and refused the first baseline run (19.7 GB); my scratch leftovers were cleared and it ran.
- **The delete gate "as it stands".** It lived inside the old card's footer (`AgentCard24` `Foot`), behind its own
  "remove" link and private state: not reachable from the v2 card. It was lifted out unchanged (`RemoveConfirm`), so B6
  was **built**, not skipped (see Decisions).

## Step 0 findings

- 0.1 Dev served `index-CrH8OKjv.js` (`…-pc3-laq22-qc168`). Branch cut there. During the work dev moved twice (to
  `…-qc168-sb1`, then `…-qc168-sb1-laq23`, `index-CiirvlC9.js`, rebuilt identical); the deploy merges onto the latter.
- 0.2 Gates passed: `AgentCard262.tsx` with `OpenSec` (v2.1); `QcEdit168.tsx`; `NotesTab158` with the pencil and ⋯ and
  Log a query v2.2's `NoteArticle`/`NoteCompose`.
- 0.2a `MatChips` draws in three places: the query card's Materials group editor (v168), the step editor on Tracking,
  and the composer's send journey (`QcComposer1522`). Its mono capitals and dashed "+ ADD" are `qcv152edit.css`
  (`.qc152-mp`: 9.5px JetBrains Mono, uppercase — under the 12px floor; `.qc152-mpw.plus`: the dashed box). A `look`
  prop changes the drawing alone; versions, the sample picker and `env` are untouched. **The doubled names**: on
  Materials' reading rows the right-hand `detail` comes from `qcCardView` — for every step with recorded materials it is
  `detail: label` (`stepChips`), so on **real data every sent group's rows said their name twice**, not only the seed's.
  Only the query's own record (the query sent step without recorded materials) carries a different detail.
- 0.3 `AgentCard262`: `penFor`/`.ag-pen`, `doorOf`, `OpenSec` (its `ag-sx` cross/tick), `open` (a list: several at
  once), `cross` (discard + snackbar Undo), `tickPress`, `saveSec`, `saveAll`/`saveAllThen`/`discardThen`, `ask` and the
  guard state with `GuardBar`, `openAll`, `applyAsk`, the head (`HeadValues`, the live draft while Contact details was
  open), `p.preview` (the add journey's finish screen).
- 0.4 `EditContact`: name (+ duplicate note), agency (the agency ask; "Agency unknown"), Based in (`CountryPills` +
  city, `CityOfferBox` with `cityOffer`/`keepKey`), email (`emailOk`), website (`linkOk`), the submission link (shown
  when `formLinkLabel(method)`), MSWL (`linkOk`), Social (`SocialField`). Reading, the head shows name, agency, the place
  line (flag + city) and the contact line (email, website).
- 0.5 The card called `showToast` 14 times (copy, notes, pin, task, Corkboard, the cross); the hosts (HostAgentCard and
  the Contact list's AgentList) raised the section-saved, Agent fit and "Changes undone" snackbars. The query card's
  toast (`qc1522-toast`, `qcv1522card.css`) is already loaded by the agent card's `.qc152` root; v164's bar placing is
  not, so `acv22.css` places it (3 lines).
- 0.6 `deleteAgent` behind the old footer's `remove-confirm` (type the name when the agent has queries; `canDestroy`).
- 0.7 acv21's tick/cross/toast helpers, AC21-2a/2c/2d/2e/2f/2g, 4a–4c and acv2 AC2-9 touch what changed (below).

## Per phase (one commit each)

| Phase | Commit | Files |
|---|---|---|
| A1 Materials rows | 6b2581952 | QcEdit152 (`look`), QcCard152, QcMaterials158, qcv168.css |
| A2 a row says its name once | 06044f46f | QcMaterials158 (`sameWords`), qcv168.css, qcMaterials158.test |
| A3 L15–L17 | 7a7a1cfa5 | qc168.measure.ts, reports/query-card-v168 |
| B0 Ref in | 78a3a49be | design-refs/agent-card-v2-2/*, .refhashes.json |
| B1 The pencil | 4566de442 | AgentCard262, acv2.css, acv21.css, acv22.css (new) |
| B2 One section at a time | fb3c95f35 | AgentCard262, AgentCard262Edit (GuardBar gone), QcEdit168 (2 optional props), CSS |
| B3 The head edits in place | 785a031ec | AgentCard262 (`HeadOpen`), AgentCard262Edit (`contactHead`), acv22.css |
| B4 The saved message, in the card | 1a06dfaba | lib/agentCardToast (new), HostAgentCard, AgentList, AgentCard262, acv22.css |
| B5 Notes | 90a302e35 | QcNotes158 (`onQuoteOpen`), AgentCard262, qcNotes158.test |
| B6 ⋯ in the band | 85686b15d | AgentCard24 (`RemoveConfirm` lifted), AgentCard262, acv22.css |
| B7 Why-tips | 18e774d6f | QcCard152 (`useTip`, `useWhy` exported), AgentCard262 |
| B8 Measure | 7e73320c6 | acv22.measure.ts, seedAcv22.mjs, re-points, RETIRED-agent-card-v2-2.md, AgentCard262 hooks, acv22.css |
| re-point | 8d7bf4ba5 | acv21.measure.ts (2d, 2f, 4a, 4b, 4c), RETIRED-agent-card-v2-2.md |

## Locks — red under ONLY its own mutation, then green

Query card (`tests/e2e/qc168.measure.ts`, ledgers `reports/query-card-v168/ledger`):

| Lock | Mutation | Red reading | Green |
|---|---|---|---|
| L15 | draw the chips | 0 rows for 3 items | ✓ |
| L16 | draw the detail always | four doubled rows ("Query letter / Query letter" …) | ✓ |
| L17 | restore the mono capitals | JetBrains Mono, uppercase | ✓ |

L1–L14 re-run green with them (L1–L17 + frames, 19 passed).

Agent card (`tests/e2e/acv22.measure.ts`, ledgers `reports/agent-card-v2-2/ledger`):

| Lock | Mutation | Red reading | Green |
|---|---|---|---|
| AC1 | the pencil static | the head's name row resized on hover | ✓ |
| AC2 | allow two | wishlist and genres open together | ✓ |
| AC3 | skip the ask | no question inside the wishlist | ✓ |
| AC4 | restore the rust bar | a rust bar in every state | ✓ |
| AC5 | tick always enabled | the tick live before a change | ✓ |
| AC6 | switch to Profile | History → Profile | ✓ |
| AC7 | draw the section as well | a Contact details section in the tab | ✓ |
| AC8 | drop the city from the patch | city read back "Edinburgh" | ✓ |
| AC9 | remove the offer | no city offer | ✓ |
| AC10 | focus the name | "+ Add email" focused the name | ✓ |
| AC11 | use the snackbar | no card toast | ✓ |
| AC12 | Undo reopens clean | the head reopened with the stored values | ✓ |
| AC13 | open nothing | no gate | ✓ |
| AC14 | show them | 2 pencils on the preview | ✓ |

The measures' own findings, fixed: opening the head first grew it **99px** (AC7 allows 56): "More contact details" now
ends the email and website row and the head's fields are 30px — **52px**.

## Retired, and older locks re-pointed

`tests/e2e/RETIRED-agent-card-v2-2.md`, each with why: the 28px `.ag-pen`; several sections open; `GuardBar` (the rust
bar), Save all and the guard; the Contact details section and `EditContact`'s layout; the section's own ✕/✓; the
snackbar for the open card's messages; the gate's private copy in the old footer. Re-pointed: acv21's tick/cross/toast
helpers (the old cross silently missed and left sections open), AC21-2c, AC21-2d, AC21-2f, AC21-2g, AC21-4a, AC21-4b,
AC21-4c (they opened two sections together, pressed a tick with nothing changed, the rust bar's Discard or the
snackbar's Undo; after a tick the rim now rests, as nothing is left open), acv2 AC2-9. Retired whole: AC21-2e (its subject is gone; acv22 AC2–AC4 replace it). Part A changed no
older lock beyond adding L15–L17.

## Baseline before and after

| Gate | Before (base 93fb01e24) | After |
|---|---|---|
| tsc | clean | clean (branch and merged line) |
| Vitest | 13,315 green | 13,317 green (branch); 13,347 green (merged dev line) |
| acv2 + acv21 | all green (21) | all green on the branch after the re-points (the first branch run: 15 of 20; the five re-pointed, then green) |
| qc167 + laqV22 | QC167-10 red (passed/reopen/save) | all green on the merged dev line, QC167-10 included, with Log a query v2.3's own measure (24 passed) |
| qc168 | L1–L14 green | L1–L17 green (branch); qc168 + acv22 green on the merged dev line (32 passed) |

## Frames

Query card: `reports/query-card-v168/frames` (Chromium and WebKit; the open group is now the tab's own rows). Agent
card: `reports/agent-card-v2-2/frames` — reading, hover, a section open, the question inside it, the head open, the city
offer in the head, More open, "Changes discarded" in the card's toast, the band's ⋯, the remove gate (Chromium 11,
WebKit 8: WebKit is pressed with DOM clicks and has no hover frames).

## Dev

`dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1-laq2-pc2-laq21-mg1-pc3-laq22-qc168-sb1-laq23-acv22` @ 5e61502c6
(pushed) = the line dev served at deploy time (`…-qc168-sb1-laq23`, Log a query v2.3, `index-CiirvlC9.js`, rebuilt
identical) + this branch; no conflicts. On that merged line: tsc clean, Vitest 13,347 green, qc168 + acv22 green (32),
qc167 + laqV22 + laqV23 green (24). Deployed hosting only, from a clean checkout of the pushed tip, with the served-hash
guard in the command. Dev now serves **`index-UL5zH8Qk.js`**; its `AppRoot-C5mNRJp-.js` chunk, fetched from
scriptally-dev.web.app, contains "More contact details", "Discard your changes to", "Delete this agent", "Change it on
the query", "It changes when the query does", "The day you added", and no "Save all" (the remaining "Unsaved changes"
are other screens': the manuscript form, the query drawer, letters, packages).

## For Nick to rule

1. **The composer journeys' chips (A1)** are left as built: 9.5px JetBrains Mono capitals with the dashed "+ ADD",
   under the 12px floor. The step editor's now use the serif at 14px; the composer's could take the same rule.
2. **The doubled names (0.2a)** were real data, not the seed: every step's recorded materials set `detail` to the label.
   A2 hides a detail equal to its label; the cleaner fix is in `qcCardView` (`stepChips` need not set a detail).
3. **Based in, in the head**: with UK/Ireland/US chosen the city sits on the pills' line (the v2.2 ref's head). That
   departs from the 21 Nov two-line ruling for the section; Elsewhere keeps it (search on the pills' line, city beneath,
   280px list).
4. **B6 was built**: `RemoveConfirm` is the old footer's gate lifted out word for word; both cards draw it.
5. **Decisions I made**: v168's parts gained three optional props (CrossTick `onTickDown`, `what`; DiscardAsk `words`);
   `useTip`/`useWhy` are now exported from QcCard152 and shared; the hosts' card messages go through
   `lib/agentCardToast` (one open card listens; the snackbar is the fallback); the agent card's pencil for the fact
   boxes sits at the section's top-right corner (the boxes don't clip); MSWL and Social sit side by side under More;
   the agent's words' ⋯ "Change it on the query" opens the query card through the card's own door (it asks first if
   something is open).
