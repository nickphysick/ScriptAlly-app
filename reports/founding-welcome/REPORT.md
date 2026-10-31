# Founding welcome: the report

Branch `founding-welcome`, cut from `release/live-1` at **f73a6bb1** (the live tip; still the tip
of `origin/release/live-1`, so the merge would be a fast-forward). Five commits, all pushed:

| Part | Commit | What |
|---|---|---|
| A | 1f3e347c | Founding numbers, assigned once and atomically; reserve numbers; the backfill script |
| B | 857d0523 | The confirmation link carries a reference; `GET /welcome`, `POST /welcome/answers`; the email line |
| C | 2f6d632e | The `/welcome` page, built to Direction A; the old /founders states removed |
| D | 6dd0c519 | Measured on a production build against the real function on the emulator |
| E | 18e10141 | Runbook section 10 |

**Nothing has been deployed anywhere.** Live and dev are untouched.

## False premises, first

1. **"Give each writer a number": they already had one, and it could be reissued.**
   - Confirming already stored `position` = count + 1.
   - Unsubscribing nulled it and lowered the count, so the next writer could be given a number
     someone else still held.
   - Your ruling: a newcomer takes the lowest freed number, so numbers stay 1–100. Built that way
     (`freedNumbers` on the counter).
2. **"Add the number to the welcome email": the email already said it** ("founding writer number
   23 of 100"). Your ruling: reword it rather than add a second line. It now reads **"You're
   Founding Writer No. 23."**
3. **The mock shows things the page can't honestly say:**
   - the writer's email ("Confirmed with lucy@…");
   - counts from a Smart Import ("24 queries · 19 agents read");
   - "near the top of the list".

   The page never learns the address, and the other two would be invented. Replaced with:
   - "We've sent your welcome email";
   - "Every query and agent, read";
   - nothing (the line is gone).

   "First reserve" appears only when the stored reserve number is 1.
4. **A second click on the same link replaces the first link's reference.** Found in Part D. Each
   click mints a fresh reference and only the newest works, so a tab opened from the first click
   stops showing the number when refreshed. One live reference per writer seemed right; say if
   you'd rather old ones kept working until they expire.

## §0 findings

- Live's public count is absent: nobody is confirmed on live.
- The verify transaction was already the right place to number writers. Part A added numbering to
  it rather than a second transaction.
- The email's own line was the only place the number appeared, and only on first confirmation
  (point 2 above).

## What the backfill would assign on live

**Nothing, as far as I can tell, but I couldn't prove it.**
- A live dry run needs Application Default Credentials, which this machine doesn't have.
- I didn't use the CLI token for it.
- The public counter is absent, and that matches "nobody is confirmed".

The backfill was tested end to end on the emulator: it assigns in confirmation order, and a second
run finds nothing. Section 10.3 of the runbook has you run the dry run yourself before `--apply`.

## Locks: red, then green

| Part | Lock | Red under |
|---|---|---|
| A | Emulator numbering (5) | 4 of 5 red on the base code; also red under "number read outside the transaction" and "unsubscribe keeps its number" |
| A | `foundingBackfill.test.ts` (5) | "number by id, not by time" |
| B | `welcomeModel.test.ts` (10) | All red before the code existed |
| B | Emulator welcome (5) | A number in the redirect; the payload spreading the document; an invalid tracker accepted; expiry not checked; answers stored as a map |
| C | `welcomePage.test.tsx` (25) | Unpadded number; perks shown while waiting; full page on expired/unknown; `canSend` on any one answer; no redirect; an invented number where there is none |
| D | `foundingWelcome.public.ts` (16) | The card rendered only after loading; the stamp delayed to 1.2s; motion outside the reduced-motion query; the answers' key renamed |

Each mutation turned only its own lock red. Every file was restored, and the restored build ran
16/16.

## Gates (final tree)

- tsc (root and functions): 0.
- Dev and prod builds: 0, with no error or warning lines.
- Vitest: **614 files, 9,122 passed, 3 skipped**.
- Emulator suite: 46 passed (Part B).
- The production bundle contains none of the preflight's five forbidden strings ("Log in" etc.).

## Part D readings

The test setup:
- a production build on `vite preview` at 127.0.0.1;
- the real `waitlist` function on the emulator, with an empty Resend key so no mail left;
- every state reached through the function's own `/verify` redirect.

Readings at both 1440 and 390:

- **The card doesn't move when the number lands.** With the number held back 1.5s, the layout box
  was identical before and after:
  - 1440: x 763.2, y 215.1, 448.8 × 283.0;
  - 390: x 18, y 486.4, 354 × 223.2.
- **The stamp lands by 1.5s.** Its animation ends at 1450ms and is finished at 1.5s.
- **Reduced motion:** no animations, the seal at opacity 1, and both the card and the seal at their
  final rotation.
- **The answers round-trip.** A failed send kept all three choices pressed and said "That didn't
  send — try again". The real send then stored `in-the-thick` / `11-50` / `spreadsheet`, plus
  `answeredAt`.
- **Every state:**
  - the right headline;
  - card numbers `023`, `024`, `1st`, `—` and `—`;
  - the address bar shows `/welcome` with nothing after it;
  - focus on the headline;
  - no sideways scroll;
  - no email address in the welcome.
- **Fixed during measurement:** the headline drew a focus box for every visitor. It is now locked.

Screenshots (`reports/founding-welcome/`):
- `verified-1440.png`, `verified-390.png`;
- `already-1440.png`, `already-390.png`;
- `waiting-1440.png`, `waiting-390.png`;
- `expired-1440.png`, `expired-390.png`;
- `unknown-1440.png`, `unknown-390.png`.

Readings: `partD-readings.json`.

## For you

- **The photo slot.** It shows a disc with "N". When you have a photo:
  1. put it in `public/images/`;
  2. set `FOUNDER_PHOTO` in `src/marketing/welcomeCopy.ts` to its path. Nothing else changes.
- **Not built as drawn:**
  - the four copy changes under false premise 3;
  - the reserve card's brown is the nearest existing token, `--mk-ink-hov`, under a cream wash;
  - the mock's lighter navy is `--mk-panel`, and its sage text is `--mk-sage-t`;
  - the confirmed date is on both the seal and the card's bottom line, as in the mock (one could
    go);
  - the three taps only show when the link carried a reference, since there is nowhere to send
    answers otherwise. Old `/founders?verified=` links arrive without one.
  - no "Save as image".
- **Typewriter face count.** The card's number is set in it, which makes `welcome.css` the eighth
  file outside marketing.css to name that face. It's recorded in `marketingTokens.test.ts`.
- **Your note's copy (please read; it's in your voice):**
  - verified/already: "Thank you. Really. QueryHawk started because I was tracking my own queries
    in a spreadsheet that got harder to trust with every agent I added. You've just said you'll
    help me make it something every querying writer would want."
  - waiting: "I'm sorry we couldn't hold a place this time. I'd still love to hear from you while
    you wait."
  - both, then signed "Nick, Founder, QueryHawk": "If you've got a question, an idea, or a story
    about the querying trenches, reply to your welcome email. It comes straight to me, and I read
    every one."
- **Separate job, before 30 Oct:** upgrade the functions' Node 20 runtime.

## Part F: waiting for your go

1. Merge `founding-welcome` into `release/live-1` (a fast-forward) and push. This is a git step,
   not a live write, but I won't do it until you say so.
2. Then the runbook's section 10, one command per go:
   1. hosting;
   2. `functions:waitlist`;
   3. the backfill. You run the dry run, since it needs your credentials.

   Each is followed by its verify.
