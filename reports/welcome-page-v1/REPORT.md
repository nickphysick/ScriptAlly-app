# Welcome page v1, the phone drawer, and the email note and sign-off (2 Nov)

Refs: `design-refs/welcome-page-v1.html` (the oracle for `/welcome`), `design-refs/founding-emails-v2.html`
(wording only). Both SHA256s match the prompt; both are enrolled in the design-ref watchlist.

## Baseline vs final

| | Baseline (75075a22 + pack b8e35c17) | Final (main 3d4124a2) |
|---|---|---|
| tsc (app, functions) | 0, 0 | 0, 0 |
| Vitest | 655 files · 10,012 passed · 3 skipped | 655 files · 10,015 passed · 3 skipped |
| Functions emulator (`npm run test:functions`) | 49 passed | 49 passed |
| Production build log | clean | clean |
| Public locks (LW, PERF, SPLIT, EM-5, WEL) on the production build | 53 passed, 17 skipped (+ the welcome suite, which needs an emulator) | **82 passed, 33 skipped** |
| Welcome suite on the emulator (real verify links, opt-in) | 16 passed | **16 passed** |

The 33 skips are the baseline's 17 (SPLIT-5 needs a reference build, SPLIT-4 is skipped by decision) and the
16 real-link welcome cases, which are opt-in since another session's commit `56a58004` and were run separately.

Vitest went from 10,012 to 10,018 at Phase 2 (four new EM-1 cases and two from that other session's
commit), then to 10,015, because the rewritten welcome unit test has fewer cases than the old one.

## Commits

| | |
|---|---|
| `b8e35c17` | The pack (two refs, enrolled) |
| `826079c5` | Phase 1: the phone drawer reaches 75% of the screen |
| `f1572cb3` | Phase 2: the email note, a typed sign-off, the pass label in sentence case |
| `3d4124a2` | Phase 3: /welcome rebuilt to the ref |
| (this commit) | the report |

## Phase 1: the phone drawer

- The drawer has `min-height: calc(75svh − the 60px bar)`. Measured on dev with the live counter showing:

  | Screen | Drawer bottom | Share |
  |---|---|---|
  | 375×667 | 669.3 (content-height) | — |
  | 390×844 | 633.0 | 75.0% |
  | 430×932 | 699.0 | 75.0% |

- The spare height goes equally above the strap, the sub-line group and the sign-up (three auto margins: 25px
  each at 430). Today's gaps are padding underneath them, so they are the minimum.
- "No more winging it." is 42px, line-height 1.05, one line at 375, 390 and 430.
- The hawk is 170px wide, 4px from the right edge, his feet level with the foot of "See what it does" (0px
  out at all three). He touches neither the sub-line nor the link.
- **One addition the brief didn't ask for:** the sub-line group is at least the hawk's height plus 6px, with
  the sub-line and link at its foot. He is taller than those two together, and at 375 (no spare height) his
  head covered the strap's full stop. With this he clears the strap at every width. It also means the
  visible gap above the sub-line is larger than the gaps above the strap and the sign-up; the shared part is
  equal.
- The sub-line's measure stops 10px short of the hawk (`calc(100% − 160px)`), so it now wraps to three lines.

Phone first screens: `phone/phone-375.png`, `phone-390.png`, `phone-430.png`; readings in `phone/readings.txt`.

## Phase 2: the emails

- Email 2's note is the three new paragraphs, word for word.
- "Nick" in emails 2 and 3 is typed: Special Elite, falling back to Courier New, 26px, ink #1c130f. Caveat is
  gone from the emails.
- The pass label is "Founding writer pass" in sentence case, in the serif at 600, #7a3420, in both emails'
  HTML and text parts ("Founding writer pass: No. 14 of 50"), and on the landing page's ticket (14px).

Email 2 as rendered from the deployed code: `email/email2-welcome-640.png` and `-375.png` (also the HTML and
text). Email 3: `email/email3-waiting-*`. These are drawn without web fonts, which is what Gmail does, so the
typewriter shows as Courier.

**Email 2 as received on dev:** sent. `nick.physick+qh-welcome@googlemail.com` signed up on dev after the deploy
(2 Nov, 10:41 UTC) and Nick clicked the confirm link: the record was confirmed as founding writer No. 3, so dev
sent the new welcome ("You're in: founding writer No. 3") to that address. The record and its rate-limit
entry were then deleted and the counter put back to cap 50 with 2 confirmed, so dev is as it was.

## Phase 3: /welcome

Screenshots on dev, every state, at 390×844 and 1440×900, full page: `welcome/<state>-<width>.png`.

- **Chrome:** on /welcome the bar is the logo alone, as plain text rather than a button. The footer is the
  logo and "© 2026 QueryHawk · Made in the UK, for writers · Privacy". Every other page is unchanged.
- **The drawer:** text left and the pass right on desktop; the pass above the text below 1000px.
- **The pass:** the landing ticket, larger. It rises in, then the stamp lands; under reduced motion both are
  at rest. The number line and the stamp's date line keep their height while the lookup is on its way, so
  the pass doesn't move when the number arrives (the real-link suite caught a 14px jump from the date line,
  and it's fixed).
- **States:** verified and already show the note, three steps, the landing's four perks word for word, the
  taps (with a reference), get ready (beside the Smart Import picture) and the close. Waiting shows the
  waiting note, two steps (step 2 dropped under 2(b)), the taps and the close. Expired and unknown show only
  the drawer, with the fresh-link form and the ghost pass.
- **Mechanics unchanged:** `v` and `r` read once then stripped; `fetchWelcome`; `postAnswers`; the taps only
  with a reference; the fresh-link form keeps source `founders-hero`; no number is ever estimated, and none
  is shown if the lookup fails.
- **Retired:** `FoundingCard.tsx` (only the old page imported it), the drawn Peek previews, and the old
  welcome sheet's rules. `--mk-stone` is also deleted: its last reader was that sheet, so its value lock now
  asserts it's gone. `welcome.css` names no font any more (it reads the tier's tokens), so it leaves the
  face-owner list.

### Choices the brief didn't settle

1. **Waiting with no number:** step 1 reads "On the waiting list, in the order writers confirmed." The brief
   only gives the numbered form.
2. **A pass with no number** keeps its number line empty rather than showing a dash; the stamp shows without
   a date.
3. **"See you soon"** is the typewriter face, as the brief asks (the ref draws it handwritten), in rust at
   34px. The size and colour are my choice.
4. **A short state's page ground** is the first band's colour, so expired and unknown show no oat strip
   between the drawer and the footer.
5. **The ref's drawer insets** (content 1120 wide, padding 64) are kept, so on desktop the hero text starts
   to the right of the bar's logo, as in the ref.

## Locks, each proved red first

| Lock | Red on | Green on |
|---|---|---|
| LW-7 (replaced) | `b8e35c17` at all three sizes; LW7 (floor removed, red at 430 only: at 390 the content alone already reaches 624px, inside ±2%); LW7b (floor binds at 375); LW7c (strap wraps); LW7d (hawk onto the link); LW7e (sub-line under the hawk) | 3/3 |
| EM-1 (updated) | the emails before Phase 2: 8 failures (note, sign-off ×2, label ×2, EM-2 text ×3) | 252/252 functions unit |
| EM-5 (label added) | today's capitals; EM5b puts them back | 4/4 |
| WEL-1 copy verbatim, no capitals | `b8e35c17`; WEL1 (capitals on the label); WEL1b (old heading wording) | 10/10 |
| WEL-2 only Privacy | `b8e35c17` (the old footer's mailto); WEL2 (an About link); WEL2b (the logo as a button) | 2/2 |
| WEL-3 stored number; failed lookup shows none | `b8e35c17`; WEL3 (the number changed on the page) | 2/2 |
| WEL-4 fledgling inside the stub | `b8e35c17`; WEL4 (bird hung over the edge) | 10/10 |
| WEL-5 reduced motion at rest | `b8e35c17`; WEL5 (stamp animates under reduce) | 2/2 |
| WEL-6 waiting copy is 2(b) | `b8e35c17`; WEL6 (the 2(a) sentence put back) | 2/2 |

WEL locks: `tests/e2e/welcomePage.public.ts` (the lookup is mocked; no emulator needed). The real verify
links: `tests/e2e/foundingWelcome.public.ts`, retargeted at the pass (`SA_E2E_FUNCTIONS=1`, emulator).

## Dev

https://scriptally-dev.web.app serves `index-DakCloIu.js`. That's `dev/…-wl2-perf1-fe1-wel1` (`6df63a9c`,
pushed): `main` merged onto the branch dev was serving. Before the deploy, I checked that the old branch
rebuilt to the live bundle (only the build date differed). The `waitlist` function was redeployed to dev
from the same checkout. Prod is untouched.

### Found on the dev branch, not fixed

- `src/test/firestoreTarget.test.ts` (from the other session's commit `b3b1cd67`) fails 2 cases on the dev
  branch, because five dev-chain-only Contact list scripts (`tests/e2e/cl251Agents.mjs`, `cl252Data.mjs` …
  `cl255Data.mjs`) create a Firebase app without going through `fsTarget`. They aren't on `main`, so `main`
  passes. It's test tooling, not the deployed site; it belongs to whoever merges those branches.
- Merging `main` into the dev chain conflicted on `CLAUDE.md` (both sides added sections; I kept both) and
  on three test files the dev chain had deleted and `main` had edited (kept deleted).
- My push to `main` also published the other session's two commits (`b3b1cd67`, `56a58004`), which were
  already on local `main` beneath mine.
