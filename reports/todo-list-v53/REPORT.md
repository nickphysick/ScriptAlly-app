# To-do list v53 — the desk fits the window, finishing a task, and the card

Desktop only. Branch `todo-list-v53` (pushed), cut from the branch dev was serving when the run began,
`dev/qc153-tl1-ww2-qc1531-qc1532` @ `888078e7f` (its `build:dev` reproduced the served `index-B6biPmmz.js`).
Not merged to `main`. Dev serves **`index-DtjKHDsx.js`** from `dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1-td53`
(see §8). Prod untouched.

Refs: `design-refs/todo-list-v53/todo-desk-v13.html` (sha256 `5b01aab0…161e`) and `todo-complete-v1.html`
(`1fadbea6…80f3`), both matching the brief, both enrolled in `design-refs/.refhashes.json`.

## 1. False premises

1. **The base header is not v52's slim navy header.** Workspace width v2 had already replaced it with a light title row:
   the book's name (or "To-do list"), a late pill, a to-do pill and "+ Add a task". D2 replaces that row.
2. **The app has no gone-quiet glyph.** Full and partial are `StatusDot`, and the nudge is `NUDGE_MARK` (QcBubble152).
   Gone quiet uses the mock's dotted grey ring (`QUIET_MARK`, WsControls). It isn't a status, so `StatusDot` is still
   the only status glyph.
3. **The app has no post icon** for D9's send-method mark. The envelope is QcCard152's, and the form is the agent
   card's (`IC255.form`). Post is a small parcel drawn for this pass.
4. **There is no agent note under the To-do's card on the base.** D8 asks to keep it as it is, so there was nothing to
   keep, and Their policy is not built (as ruled).
5. **The desktop can call `showUndoBar`, but it draws the query drawer's bar:** bottom-left, a mono line and an 8s ring.
   That is not the mock's navy snackbar. The To-do page's own toast became the snackbar, and the drawer's bar is
   unchanged.
6. **The preview card is `inert`** (v51.1's read-only rule), so no hover inside it can fire. The paperclip's list is
   opened by hovering the card's column over the chip, and drawn over the page, so it can't be cut off.
7. **Not every kind can end on "Check it, then log it".** Two kinds never log on the desk:
   - the writer's own task, which has no questions and finishes with Mark done;
   - door tasks ("What does {first} want sent?", and "other"), which finish on the card they open.

   Every kind that logs ends on the check step: send, R&R, offer, nudge, Gone quiet, the materials batch, and both
   fix kinds. L4 says so.
8. **The phone shares the card and the copy.** Its task screen renders `PreviewQueryCard` and reads `mentorLine` and
   the flows, so:
   - D9's wording and stamps reach the phone's card sheet, as D9 says they reach every use of the one card;
   - D12's two corrected lines reach the phone's hawk.

   Everything else on the phone is unchanged. Without a `mode`, the sheet keeps v52's drawing (its dashed draft,
   its book). TDP1 and L14 hold it.
9. **The To-do's card and the Query Centre's card can show different steps for one query.** The preview builds its
   history from the global activity feed and the Query Centre's card doesn't. This predates v53. On the emulator
   fixture, the To-do card shows an old "Full sent · 21 Aug" step from feed residue that the Query Centre's card leaves
   out. L13 therefore asserts that every message the Query Centre draws appears on the To-do's card in the same words,
   with the same stamp.
10. **The newest dev branch needed `@sentry/react`**, which the shared `node_modules` doesn't have. I didn't install
    into the primary checkout. My worktree got a thin `node_modules`: one symlink per package in the primary's, plus
    `@sentry` 11.11.0 (the lockfile's version), installed into the scratchpad and copied in, 29 MB in all.

## 2. Step 0

1. **The desk on the base:** `TodoWorkspace`, `useWsCore` (the phone's shared core), `wsFlows`, `WsPreview`,
   `todoWs.css` and `lib/todoWs`. All of v52 is there: Start here, one question at a time with answer chips, and the
   yay screen. The header is Workspace width v2's (false premise 1).
2. **The header:** see false premise 1.
3. **The card:** `PreviewQueryCard` → `QcQueryCard149` → `QcCard152`, built by `buildCardView`. Bubble words come from
   `lib/qcThread152` (`buildThread` → `stepTitle`), dates from `dayLabel`. The thread renders every `QueryStatus`
   (queried, partial requested/sent, full requested/sent, R&R, resubmitted, offer, rejected, no response, withdrawn,
   signed) plus three non-status steps (nudge, holding reply, told other agents). The table is in §5.
4. **Query Centre v153 is on the base:** `framedSlip.css` (`.sa-slip`/`.sa-slip-in`), `lib/qc153`'s slip colours
   (`SLIP_TONE_FILL`, `ACTION_SWATCH`) and the status glyphs. Nothing needed porting. The colours are the app's values:
   - agents waiting: rose `#ecd6d2`;
   - nudges: sand `#efe7da`;
   - Gone quiet: v52's stone `#e3dbcf` fading to white;
   - housekeeping: its pale blue `#e4ebf1`.
5. **The snackbar:** see false premise 5.

**Red gate:** D9 changes the shared card's thread words, date stamps, gaps and bubble style on the Query Centre too.
That is D9's stated scope. Nothing else on the card changed for the Query Centre: the glyph, chips, quote, tint,
avatar, ✎ Edit, band and footer are as they were. The desk's dress (one-row book, dots, pulse, stamp, paperclip) is
behind an opt-in `desk` prop that the Query Centre doesn't pass. No stop.

## 3. Commits

The phases share `TodoWorkspace.tsx` and `todoWs.css`, so they landed as four commits rather than nine:

| Commit | Phases |
| --- | --- |
| `cac247b9f` | F — the shared card's thread (D9), and the `desk` dress it carries for D8 |
| `fcd5730ae` | A, B, C, D, E, G, H — the page, the tray, tiles and the rail, the check step, the card's states, finishing, the copy and dead code |
| `0c671d6ff` | I — the locks, the mutation runner, the screenshots, the retired and re-pointed older cases |
| (this commit) | the report, readings, shots, mutation proofs |

**Dead code removed:**
- Start here's render and CSS.
- The yay screen (`Yay`, its desk branch, `.tws-yay*`).
- The v52 answer chips (`.tws-ans`, `.tws-ach`).
- The summary box (`.tws-story` styles).
- The housekeeping initials tile (`.tws-hk`).
- `Flow.consequences` (the timeline replaced its only reader).

`priorityTask`, `startReason` and `doingPhrase` stay in `lib/todoWs`, because the phone reads them.

## 4. Gates against the baseline

| Gate | Baseline (`888078e7f`) | v53 |
| --- | --- | --- |
| tsc | 0 errors* | 0 errors |
| `vite build` / `build:dev` | clean, no warnings | clean, no warnings |
| Vitest | 3 failed / 11,556 passed | 3 failed / 11,561 passed (+5 new) — the same three guard tests |
| e2e (TD52, todoWs, TDP1, qc153, qc1531, qc1532) | 10 failed / 52 passed | 5 failed — every one also red on the baseline |

\* With `functions/node_modules` symlinked. Without it, tsc reports 2 missing-module errors and Vitest 4 files.

**The three Vitest failures** (on the base and on v53 alike):
- `emuGuard`: `cb21Emu.sh` starts an emulator without the guard.
- `firestoreTarget` ×2: scripts outside `fsTarget`.

The new files add no offender.

**The five e2e reds that remain** were all red on the baseline:
- TD52 L1+L4 ×2 ("at most 1320 wide").
- `todoWs` "the workspace at" ×2.
- `todoWs` "the materials batch".

**Red on the baseline, green now:**
- TD52 L14.
- TDP1 L2 ×2: its desktop reader now takes the late count from the bar.
- TDP1 L8.

The Query Centre suites qc153, qc1531 and qc1532 are green on both. The older qc152, qc1521 and qc1522 suites drive
the retired v152 list page and time out on the baseline, so they weren't compared.

**On the merged dev branch:** tsc is clean, and Vitest has 4 failed / 11,731 passed. The fourth failure,
`functions/eval/generate.test.ts` ("links-xlsx-10" fixture), comes with the dev line's Smart Import eval fixtures. It
imports nothing v53 touched.

**Retired and re-pointed older cases:** `tests/e2e/RETIRED-todo-list-v53.md`.
- Retired: TD52 L2, L3, L9, L10, L12.
- Re-pointed to v53's tray and rail: TD52 L6, L11, L15; `todoWs` "one count" and the nudge case; TDP1 L2 and L3.

## 5. D9 — the thread's words

"{first}" is the agent's first name, or "the agent" ("The agent" at the start of a sentence). Never he or she.

| Event | Words |
| --- | --- |
| Queried | You sent {first} your query |
| Partial requested | {First} asked for a partial · or {First} asked for {what they asked for} |
| Partial sent | You sent {first} your partial |
| Full requested | {First} asked for your full manuscript |
| Full sent | You sent {first} your full manuscript |
| Revise & resubmit | {First} asked you to revise and resubmit |
| Resubmitted | You sent {first} your revision |
| Offer | {First} offered |
| Rejected | {First} passed |
| No response | You closed it: no reply |
| Withdrawn | You withdrew your query · an offer declined: You turned down {first}'s offer |
| Signed | You accepted {first}'s offer |
| Nudge | You nudged {first} |
| Holding reply | {First} sent a holding reply |
| Told other agents | You told {n} agents about the offer |
| Status line (while with the agent) | Waiting for {first} · reply expected by {date} |

**Dates:**
- A day pill above each day's messages: "Today", "Yesterday", "2 April 2024".
- A stamp in each bubble's corner: "2 Apr".
- After the stamp on the writer's bubbles, an icon for how it went: envelope, form or parcel.
- No "Same day" gap. "x days later" stays.
- An undated step has no stamp and no pill.

All of this is in `lib/qcThread152` `msgTitle`, `stampOf` and `dayPill`, unit-locked. `stepTitle`, the composer's
heading, is unchanged.

## 6. D12 — the copy

Every `mentorLine` and every flow's copy was checked. Two lines claimed the hawk would watch:

| Kind | Was | Now |
| --- | --- | --- |
| send | …log it here and I'll keep an eye out for {first}'s reply. | {First} asked for your {full manuscript / partial}. Once you've sent it, log it here and I'll work out when {first}'s reply is due. |
| R&R | …log it here and I'll keep an eye out for the reply. | {First} asked you to revise and resubmit. Once you've sent the new version, log it here and I'll work out when {first}'s reply is due. |

"To hear from the others first" (the offer's "more time" answer) is the writer's own reason, not the hawk's, so it
stays. "No date" now reads "Not dated" in the Filters menu and the When grouping. Nothing new uses small uppercase
labels or green.

## 7. Locks — `tests/e2e/todoV53.measure.ts` (TD53)

**Green:** 24 cases at 1440 × 900, 1920 × 1080 and 1366 × 768, plus L13 and L14 at one size. All pass on a fresh
emulator (L8 needs the emulator and skips anywhere else).

**Red first:** each lock with its named break (`TD53_MUTATE=<lock>`, `tests/e2e/td53Mutate.sh`, 1440), on its own
assertion:

| Lock | The break | The assertion that fired |
| --- | --- | --- |
| L1 the page never scrolls | the page 80px taller | L1 · the page's scrollHeight equals its clientHeight |
| L2 the footer is pinned | the questions hug again | L2 · send at mats: the footer's bottom on the desk's |
| L3 a choice never moves on | a choice presses Next | L3 · the same step is open a second after the choice |
| L4 every kind ends on the check step (+ the save's dates) | the check step removed | L4 · send ends on the check step |
| L5 the future card is the saved card | the future pill marked | L5 · the future card is the saved card |
| L6 typing dots, no dashed bubble | a dashed bubble injected | L6 · no dashed bubble anywhere |
| L7 a nudge: three documents, snackbar, Undo, the next task | the snackbar hidden | L7 · the snackbar appears |
| L8 the milestone only when a group empties | the milestone hidden | L8 · the milestone shows when Your tasks empties |
| L9 the bar counts the groups, scrolls the tray | a part scrolls the page | L9 · quiet: the page did not scroll |
| L10 no Start here | a Start here card injected | L10 · no Start here card |
| L11 no "No date" | a row's figure reads "No date" | L11 · no 'No date' |
| L12 no he/she, the hawk never watches | "I'll keep an eye out for his reply" | L12 · send: no he/she |
| L13 the Query Centre's words and stamps | a bubble reads "Query sent" | L13 · "Query sent \| 25 Jun" is on the To-do's card… |
| L14 the phone unchanged | a rail injected on the phone | L14 · no v53 desk parts on the phone |

**Readings:**
- **L4/L5:** the send's three points (8 Nov, 31 Jan, 8 Feb) are the save's `writerExpectedDate` and `nudgeDate`. The
  future card and the saved card read the same: "WITH THE AGENT", "Full sent", "You sent Marcus your full manuscript",
  "Waiting for Marcus · reply expected by 31 Jan 2027".
- **L7:** v52's three documents, once each, and one press. The next task opens without a click.
- **L8:** the own tasks are set aside through the emulator's admin REST, and all 8 are restored exactly.

Readings are in `readings/`, proofs in `mutation-proofs.txt`.

## 8. Screenshots and the dev bundle

`shots/` (1440 × 900, emulator):
- `01-page-housekeeping-folded`
- `02-send-step-1..3`
- `03-send-check`
- `04-housekeeping-open`
- `05-logged`
- `06-snackbar`
- `07-milestone`
- `08-query-centre-card`

**Dev:** dev had moved during the run to `index-BHJBuq2a.js`, from `dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1`
(Query Centre v153.3 and crash reporting). Rebuilt, the branch's bundle differed from the served one only in Sentry's
`release` stamp (the commit it was built at). Between the served commit `e733e8f4a` and the tip, only a report, tests
and `.gitignore` change. v53 was merged on top as `dev/…-crash1-td53` @ `2ff78969c`, and `npm run deploy:dev` ran
(hosting, and the dev `smartImportMap` function the script also deploys). **Dev serves `index-DtjKHDsx.js`.**

⚠️ Pushing that branch also published the commits under it that were only local: the v153.2 dev line and
`fix/crash-reporting-v1`.

## 9. Not done, and why

- **The bar's parts are 12px tall,** under D11's 40px for clicking. D3 asks for one thin bar. The words under it are
  the full-size targets.
- **"Their policy" is not built,** as ruled.
- **Own tasks and door tasks have no check step** (false premise 7).
- **The future card's new step takes its date from the card's own history.** Where the feed holds residue, as on the
  emulator fixture, both the future card and the saved card show the residue's date (L5 holds that they agree).
- **Some new rows show "0 days waiting".** A request whose stage date is unknown takes its anchor from now in
  `lib/todoTray`. That's the board's existing figure, not changed here.
