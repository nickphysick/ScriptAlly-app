# Overnight run — morning note (30 Oct)

Three stages ran; all three finished. Nothing was merged to `main` and nothing touched prod. Dev now serves Stage 4: `index-4L_rFD9m.js` (from `dev/…-ppp1-pa2-8-sip1-pls1` = `ba0513b6`).

## Questions for Nick (decisions only you can make)

**Tonight's two, both held back on dev:**
1. **Should Smart email drop's phone flow go live for Pro?** It is built (paste → "{n} updates found" → tick → save with Undo) and sits behind `emailDropPhoneLive()`, which is **off** everywhere. Production never reads it, so a phone keeps today's overlay until you say. To try it on dev: in the browser's console on a phone-sized window, run `localStorage.setItem("sa.lab.emailDropPhone","1")` and reload; the account must be Pro.
   - Also: the mock says "Pro. 30 emails a month." No allowance exists in the entitlement model, so the line reads "Included with Pro." Is there a limit to state?
2. **Should the reply window store days?** No decision is needed: the edit drawer already stores a date (`writerExpectedDate`), so the wheel's weeks and days are kept exactly, with nothing rounded. A question remains only if you want the *agency's usual* reply time (`responseTimeWeeks`, weeks only) to take days too.

**From Stage 4 (the last screens):**
3. **`ManuscriptPhone.tsx` needs three buttons, and it belongs to another session.** They are:
   - "Edit" in a letter or synopsis read sheet, linking to `/manuscripts?edit=<id>`;
   - "New package" under Packages, linking to `?newpackage=1`;
   - "Make a copy" on a locked package, linking to `?copy=<id>`.

   The editor and the package flow work today from those links; only the buttons are missing.
4. **The log-a-query flow's reply question should take the new weeks/days wheel.** That was not done; the wheel is a lift candidate.
5. **The illustration spots on the error page and the matcher sheet are dashed placeholders.**
6. **Desktop parity.** Only the error page changed on the desktop (as the brief stated). Should any of the phone screens get a desktop counterpart?

**From Stage 3 (set-up and importing on phones):**
7. **Should the desktop set-up follow any of the phone picks?** These are the sentence-case labels, the navy band, the pinned foot and one question per screen.
8. **The illustration spots on the loader and the Your-list cards are empty on a phone.** The reading tip keeps its finished hawk.
9. **The model cannot supply what the boards drew in two places:**
   - a question card's "row 14 · 2 queries";
   - a live count while reading (the piles hold at 0 until the real totals arrive).
10. **On `/import` inside the app, the phone review's Back and Continue are in the flow, not pinned.** There is no set-up frame there.
11. **Only two-agent repeat sets get the three-choice form.** Three-way and reconcile sets keep their own cards.

**From Stage 1 (phone app v2): 33 open questions,** listed in full in `reports/phone-app-v2/REPORT.md` on `phone-app-v2`. The ones most worth your morning:
- (1) the two "heard back" figures that disagree;
- (17) which figure the To-do badge shows;
- (3) the founding chip showing for every writer;
- (2) Plan & billing having two homes on a phone;
- (16) 761–767px phones getting the desktop Queries page;
- (28) and (30), editing materials and the packages addresses on a phone. **Stage 4 now covers both:** the addresses land on the phone Manuscript page, and the editor and flow are built.

## The stages

| Stage | Finished | Branch · last commit | Dev before → after | Gates (whole lines) | Locks still red |
|---|---|---|---|---|---|
| 1 Phone app v2 (another session) | yes, ~04:30 | `phone-app-v2` · `8a5ea125` | … → `index-DyXfq4ti.js` (via `dev/…-ppp1-pa2-8`) | in its report | PA2-1 S1 against To-do v12's badge (its question 17) |
| 3 Set-up and importing on phones | yes, 07:03 | `setup-import-phone-v1` · `88be898e` | `index-DyXfq4ti.js` → `index-CqIrL4tO.js` (via `dev/…-ppp1-pa2-8-sip1`) | `Test Files  697 passed (697)` · `Tests  10774 passed \| 3 skipped (10777)`; tsc 0/0; build clean | none of SIP1. The walk on dev's "Just getting started" times out on the base build too (it was already red) |
| 4 The last screens on phones | yes, 08:42 | `phone-last-screens-v1` · `ba0513b6` | `index-CqIrL4tO.js` → `index-4L_rFD9m.js` (from `dev/…-ppp1-pa2-8-sip1-pls1` = `ba0513b6`) | `Test Files  697 passed (697)` · `Tests  10774 passed \| 3 skipped (10777)`; tsc 0/0; build clean | none of PLS1. IP1 P1 (1440, and 390 on the reading screen and loader) and D1 were already red on the Stage 3 base |

Every gate equals its baseline. SIP1 S1–S11 and PLS1 L1–L11 each pass, and each was proved red first.

## Not done, and why (all three stages)

- **Stage 4:**
  - **The rows' Edit, New package and Make a copy buttons.** `ManuscriptPhone.tsx` is a `Manuscript*` file, which is a STOP; the deep links work.
  - **The log-a-query flow's reply wheel.** Not reached; a lift note is in the report.
  - **L6's account-writing half (save and Undo on the harness account).** The flow is Pro only and the harness account is free; the rules refuse a client plan change. The lab drives the same screens.
  - **No formatting bar in the letter editor.** Materials are plain text; only the word count is shown.
- **Stage 3:**
  - **The in-app `/import` review's pinned buttons.** There is no set-up frame there.
  - **The question card's row number and query count.** They are not in the model.
  - **Three-way and reconcile repeat sets.** They keep their own cards.
- **Stage 1:** see its report's "Every open question" (33 items, grouped as rulings, model changes, phone forms not yet designed, and housekeeping).

## What to tap through on dev, on a real phone (https://scriptally-dev.web.app)

1. Sign out, then **Sign in** and **Create account**: one tab only, sentence-case labels, white on the navy buttons.
2. **Set-up from scratch** (a new account):
   - the navy band, "Step n of N";
   - Welcome's four options above the pinned Continue;
   - Your list's short cards.
3. **Import a sheet:**
   - the reading screen's falling slips and two piles;
   - the review's "Review: repeats / agents / queries";
   - swipe a ready row left for "Don't import";
   - "Answer this" for one question per screen;
   - the full-screen navy loader.
4. **A dead end**, for example a file that cannot be read: the band, with actions pinned at the bottom.
5. **Queries:** open a query, tap •••, then Edit.
   - Open each of the six sections.
   - In Reply window, use the wheel; watch the band's date move, Save, then Undo.
6. **Addresses:**
   - `/queries/packages` lands on Manuscript → Packages, and back returns you;
   - `/manuscripts/comps` and `/manuscripts/versions` land on their sections;
   - `/todo/calendar` lands on To-do.
7. **Import → "Match your own columns"**: the sheet with its two doors.
8. **Materials:**
   - open `/manuscripts?edit=<a letter's id>` (a sent letter says it will save as the next version);
   - `/manuscripts?newpackage=1` walks name → letter → synopsis → sample pages → extras → check.
9. **The error page:** on a dev build, `#/throw-lab`, then Go to Home.

## Deviations

- **Stage 4 base:** cut from Stage 3's tip (`88be898e`), as the conductor directed, not from prompt 4's own rule.
- **Stage 3 base:** what dev served at 05:15 (`3c1e5b90`), which already held phone app v2 Part 8 and Public pages on phones.
- **No resumes and no rebuilds after dev moved.** Dev served my own builds throughout (checked before each deploy).
- **Stage 3 Phase F tightened Welcome on phones.** Its fourth option sat under the pinned foot.
- **Stage 4 L10 found a colour-law fault and it was fixed:** cream text on the set-up frame's navy buttons, below 768px.
- **Stage 4 L7 found a stacking fault and it was fixed:** the edit page sat under the query sheet's scrim.
- **Stage 4 also found that the sign-up card had no way back to sign in** once the sibling tab was hidden. It now carries "Already have an account? Sign in", on phones only.

## Worktrees

- **Removed:** `../ScriptAlly-sip` (Stage 3) and `../ScriptAlly-pls` (Stage 4). Both previews stopped. No other session's worktree existed besides the primary checkout.
- **Primary checkout:** untouched (`main` `587a0a7f`). Its tracked report images changed before tonight; that is another session's dirt, left alone.

## Times

| Stage | Started | Finished |
|---|---|---|
| Conductor | 29 Oct 23:12 | 08:42 |
| 1 (watched, not run) | before 23:12 | ~04:30 |
| 3 | 05:15 | 07:03 |
| 4 | 07:03 | 08:42 |
