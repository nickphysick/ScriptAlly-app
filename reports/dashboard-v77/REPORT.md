# Dashboard v77 — big screens, and the founding writer card rebuilt around feedback

Branch `dashboard-v77`, cut from `dashboard-v71` at fa7a954c (v71 is not merged to `main`, so the cut is from the branch).
Refs: `design-refs/dashboard-v77/` (17 files, enrolled in `.refhashes.json`).

## 1. False premises

1. **A1's "31% of the body width" is not what the ref renders.** The ref writes `clamp(300px, 31cqw, 540px)` in a grid with no size container above it, so `cqw` falls back to the **viewport**. Measured in the ref in the same browser: chart row **540** at 1920×1080 and 2560×1440, **521** at 1680×1050. Built to the pack's text (Part A, fa2fb82d), our chart was 446 at 1920 and the founding card 273px tall, which is the Laptop layout, where C1 and the ref expect Big with three rows (ref: 366). **Fixed in the Part C commit:** the row is `clamp(300px, 31vw, 540px)`, and the hoop row takes its natural height (the ref's is 172px; ours kept v71's 200px floor). The founding card is now 365 / 413 / 346 at 1920 / 2560 / 1680. Lock A1 now asserts 31% of the window, and was red under the pack's rule (named mutation `A1-body`).
2. **"The spare height sits below" does not fully hold in the app.** The app's shell bar and the ink header panel (not to be touched) stand about 65px taller than the ref's. With the ref's 540px chart row, at 1920×1080 the columns end at y 1029 against the feed tab's top at 1038. The page's bottom padding still lets it scroll a few pixels, so the cards end 14px above the tab. DB71 L2's tall row now measures at the scroller's end, and its one-screen G1 row applies only up to 900px tall. No content is hidden under the tab.
3. **The ref's card is 440px wide; the app's right column is 250–411px on laptops** (473 at 1680). The Laptop layout as drawn overflowed by 21–50px at 1280×800 and 1100×800. The card therefore also steps by its **own width** (the variant still comes from its height): under 420px the drawing is 92px and the gaps and pills tighten; under 360 the drawing is 76px; under 330 there is no drawing; under 270 the heading is 15px. Big keeps its four pills on one row under 540px by tightening them. Measured at 11 sizes, nothing leaves the frame.
4. §0.1–0.5 held as written (base fa7a954, `.d58-page` 1640, the two-row grids, the v71 card and its pulse wiring, `betaFeedback` admin-only, the `beta.ts` copy). §0.6: two DB71 reds at baseline (the shared account's counts grew); both fixed in Part A.

## 2. Per part

| Part | SHA | What landed |
|---|---|---|
| A | fa2fb82d | the 1440/1680 cap, the Fixed shape, the stacked task card |
| A (correction) | fe29a9dd | 31% of the window, the natural hoop row, a short task item sits at the top of its cell (in the Part C commit; see below) |
| B | 4e1a89c6 | owner-read rules (deployed to dev), `useFeedbackRecord`, `sendFeedback`, the field contract comment |
| C | fe29a9dd | `Dash77Founding`, its CSS; the v71 card, its rules and the pulse wiring deleted |
| D | b9616582 | "us", not "Nick", in the dock, the help receipt and the help home |
| E | (this commit) | the shots, this report, the CLAUDE.md lines |

⚠️ **The Part A correction rides in the Part C commit**, not a commit of its own: the same stylesheet and test file carry both, and this repo cannot stage part of a file non-interactively. The commit message says so. The D1 lock is also in that commit (it lives in `dashV77.measure.ts`); Part D was committed first so the lock is green at its first commit.

Each lock's RED line, then its GREEN line (all in `reports/dashboard-v77/mutation-proofs.jsonl`; ledgers in `reports/dashboard-v77/ledger/`):

| Lock | RED | GREEN |
|---|---|---|
| A1 | `A1-fill`: chart 367.8 vs 446.4. `A1-body` (the pack's rule): 446.4 vs 540 at 1920; 520.8 vs 540 at 2560; 403.6 vs 520.8 at 1680 | 540 / 540 / 521 at the three tall sizes (±2) |
| A2 | `A2-no-stack`: card 207.0–373.8 across the cycle (spread 166.8) | spread 0.0 across all 34 items, four kinds (other, send, nudge, close) |
| A3 | `A3-fw-fixed`: hoops 936.7 · founding 858.0 | columns end together (±1); founding ≥194 |
| A4 | `A4-uncapped`: body 1542 | body and header ≤1440 (≤1680 from 2200) |
| A5 | the DB71 suite at the laptop sizes | DB71: 8 of 8 cases green (H1, L1, L2·L3·F3·G1, L4, C1–C3, C4, C5, first-use L3; F1·F2 retired) |
| B2 (rules) | admin-only read: owner get and owner list denied; loosened to any signed-in user: bob's get and list allowed | 7/7 (`tests/rules`, `-t betaFeedback`); the full rules suite 217/217 |
| B4 (unit) | no sort / changed counting Planned / no 60-character cut: one failing case each | `feedbackRecord.test.ts` 16/16 |
| C1 | `C1-no-variant`: Laptop at 1920 and 2560 | Compact at 1280×650; Laptop at 1366×768 and 1440×900; Big·3 at 1920×1080; Big·4 at 2560×1440 (five fixture docs) |
| C2 | `C2-wide-art`: kinds leave the frame, frame 141/116; and naturally, Compact write 80/74 before the tightening | idle / write / sent × 5 sizes: nothing outside the frame, no inner box scrolls |
| C3 | `C3-copy`: heading wrong, "Nick" found | every string in the copy table, exact; no "Nick"; the tooltip is drawn, not native, and read to screen readers |
| C4 | `C4-green`: Read pill hue 107, saturation 27% | every pill's background and border outside 80–170° (or ≤15% saturation) |
| C5 | code `wantsReply: false`: payload wrong. And naturally: the just-sent note sat at the bottom (Built first) | payload {kind, message, wantsReply: true, severity: "", pageName: "Dashboard"}; a failure keeps the text and shows the line; success puts the note first as Sent and the count goes 5 → 6 |
| C6 | code: stats drawn at 0: `["0 sent"]` | sent = 0: no stats, no record; changed = 0: "3 sent" |
| D1 | `D1-nick`: the dock's subhead names Nick | the open dock, the sent dock, the help receipt and the help home name no Nick |

## 3. Baseline vs final

| Gate | Baseline (fa7a954) | Final |
|---|---|---|
| tsc (root, functions) | clean, clean | clean, clean |
| `vite build` / `build:dev` | clean / clean (no warnings) | clean / clean (no warnings) |
| Vitest | 643 files · 9,899 passed · 3 skipped | 644 files · 9,915 passed · 3 skipped |
| Rules emulator | 4 files · 210 passed | 4 files · 217 passed |

(One full Vitest run in Part B exited 1 with every test passing: the reporter's `onTaskUpdate` timeout, not a failure. The final run exited 0.)

## 4. Shots, beside the refs

`reports/dashboard-v77/shots/`, made with the fixture record and the callable mocked:

| Size | Ours | Ref |
|---|---|---|
| 1280×650 | `page-1280x650-{idle,write,sent}.png` | `design-refs/dashboard-v77/shots/page-1280x650-{idle,write,sent}.png` |
| 1366×768 | `page-1366x768-{idle,write,sent}.png` | (no ref at this size) |
| 1440×900 | `page-1440x900-{idle,write,sent}.png` | `…/page-1440x900-{idle,write,sent}.png` |
| 1920×1080 | `page-1920x1080-{idle,write,sent}.png` | `…/page-1920x1080-{idle,write,sent}.png` |
| 2560×1440 | `page-2560x1440-{idle,write,sent}.png` | `…/page-2560x1440-{idle,write,sent}.png` |
| task card | `task-{nudge,close,send}-1920x1080.png` | (the ref's Tasks toggle on `page-1920x1080-idle.png`) |

Known differences: our header and shell are taller (premise 2); the harness account's task list is longer and one close item has a two-line title, so the task card is 374px against the ref's 346 at 1920.

## 5. Every user-facing "Nick" found in Part D

| Where | Was | Now |
|---|---|---|
| `src/lib/beta.ts` FEEDBACK_SUBHEAD | "Every message reaches Nick, the founder." | "Every message reaches our founder." |
| `src/lib/beta.ts` FEEDBACK_SEND | "Send to Nick" | "Tell us" |
| `src/lib/beta.ts` FEEDBACK_SIGNATURE | "— Nick, founder" | "— The QueryHawk team" |
| `HelpArticlePage.tsx` helpful receipt | "Thanks. That goes straight to Nick." | "Thanks. That goes straight to us." |
| `HelpHome.tsx` no-results link | "ask Nick" | "ask us" (`askNick` and `data-hc="ask-nick"` keep their names) |
| `App.tsx:198` | "Nick Physick" | **left**: a mock account row in the dev-only `#/shell-lab`, never shown to a writer |
| `src/marketing/**` | About / Founders copy | **left**, as ruled |
| the old card's "— Nick, founder" and "I read every note myself" | | gone with the card |

Every other hit in `src/` is a code comment, a test fixture or a lab mock.

## 6. For Nick

**Setting a status on a feedback note (Firebase console, project `scriptally-dev` or prod):** Firestore → `betaFeedback` → the document → add or edit these fields. The function never writes them.

| Field | Type | Values |
|---|---|---|
| `status` | string | `read` · `planned` · `built` · `fixed` (absent = Sent) |
| `title` | string | the short public title, up to 120 characters (absent = the first 60 characters of the message, in quotes) |
| `statusAt` | timestamp | when it reached that status (shown as "Shipped 20 Oct" / "Fixed 17 Oct"; absent = no date in the tooltip) |

"Changed QueryHawk" counts `built` + `fixed`. The writer's card reads the change live; there is nothing to deploy.

**The rules are deployed to dev.** One command, `--config firebase.dev.json --project scriptally-dev`, from a clean checkout of the current dev tip (`dev/db71-plad-db71f-cl25-lm1`) with only the `betaFeedback` line changed, so no other stream's dev rules were lost. The release's `updateTime` moved to **2026-10-26T17:02:05Z**. Prod rules are yours.

**The weekly pulse no longer has a caller in the app.** What remains is the pulse itself and its tests: `src/lib/weeklyPulse.ts`, `src/lib/weeklyPulseClient.ts` (no importer now), `functions/src/weeklyPulse.ts` + `weeklyPulseCore.ts` (exported from `functions/src/index.ts`, and not deployed on dev), the `betaPulse` rules, and the tests `src/lib/weeklyPulse.test.ts`, `functions/src/weeklyPulseCore.test.ts`, `functions/src/firestoreHandle.test.ts`, `tests/rules/firestore.rules.test.ts` and `tests/e2e/dashV59.measure.ts`. Whether any of it stays is your call.

**The fixture record.** The harness account has no feedback documents and a client cannot create one, so the locks hand the card five fixture docs through a dev-only `window.__SA_FEEDBACK_ROWS` aid in `lib/feedbackRecord.ts`. It is dead code in a production build. Adding a few real docs by hand on dev would let a lock read the live path too.
