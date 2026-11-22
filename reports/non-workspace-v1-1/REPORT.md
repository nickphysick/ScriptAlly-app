# Non-workspace pages v1.1 — follow-up report (13 Nov 2026)

- **Branch:** `non-workspace-v1-1`, cut from `origin/non-workspace-v1` at 7b1d9fccb (c13c1c19e is in its history). Pushed, not merged.
- **Dev:** deployed once, from `dev/clh2-nwv1-clh21-ql21-nw11` (merge 94b0e2f39, pushed). That is the dev line dev was serving (`dev/clh2-nwv1-clh21-ql21`, query letters v2.1) with this branch merged in cleanly.
  - **Hosting:** `index-Jb3RX17u.js` → `index-DTvKjqCk.js`, confirmed served.
  - **Functions on scriptally-dev:**
    - created: `emailSettings`, `sendContactMessage`
    - updated: `redeemInviteCode`, `sendAccountEmail`, `nudgeReminders`, `weeklySummary`
  - **Prod:** not touched.
- **c13c1c19e's three fixes are now live on dev**, checked in the screenshots:
  - the clock's week labels are whole
  - the Emails mark is in the settings rail
  - the Plans page sits inside the settings column

## False premises

1. **The dev hosting rewrite for the email-settings page.** It turned `liveConfig.test` red: live's hosting rewrites must equal dev's, and prod's config is Nick's. The page is linked at the function's own URL instead (`EMAIL_SETTINGS_URL` in `functions/.env.scriptally-dev`), so no rewrite is needed. Before prod sends these links, Nick needs either the same env line or a `/api/email-settings` rewrite on both configs.
2. **`sendContactMessage` stores messages; it sends no email.** It writes to `contactMessages`, so "real sending" means the message reaches the database instead of the writer's mail app. Nobody is notified of a new message.
3. **The re-pointed Help e2e (helpCentreV1) still has two reds, both outside Help:**
   - HC1-C1 hangs on the Contact list's search control.
   - HC1-C3's feedback panel offers three kinds, while `FEEDBACK_KINDS` lists four.
   
   Both are in do-not-touch areas. They are reported here, not fixed.
4. **The getting-in screens still show a small-capitals "YOUR ACCOUNT" on the account frame's tab** (SetupFrame). Item 4a covered the settings-mode tabs only, as briefed.

## Items

| # | Item | Outcome | Commit |
|---|---|---|---|
| 1 | Terms wording restored | LANDED | f7fa478b2 |
| 2 | One message for a code that doesn't work | LANDED | 47d00bfe0 (with 7a: same file) |
| 3 | Clock timeline labels | LANDED, measured | bdc92e82d |
| 4 | Small visual fixes | LANDED, measured | 4a 0462ece5c, 4b 872b56ade, 4c 9525f6bda |
| 5 | Account leftovers | LANDED | 5a e0a05b26e; 5b 6c233d84b + e15ac2bc7 |
| 6 | Contact on real sending | LANDED | 1b0de1bff |
| 7 | Housekeeping | LANDED (7c's e2e has two reds outside Help, see above) | 7a in 47d00bfe0; 7b 09411c13c; 7c ef251b549, 19128dfab, 463a1b1fc |

Two subagents built items 1, 6 and 7b, and items 2, 5b and 7a. Both were cut off once by an API error and resumed. I ran their emulator specs, broke their emulator locks, and committed their work. The agent that built Help in v1 re-pointed the Help e2e spec.

## Baseline against final

| Gate | Baseline | Final |
|---|---|---|
| tsc, app | 0 errors | 0 |
| tsc, functions | 0 | 0 |
| Vitest | 3 failed / 12,255 | 3 failed / 12,423 (on the merged dev tree) |
| Functions emulator | 1 failed / 91 | 1 failed / 107 |
| Production build | clean | clean |
| Design refs | — | unchanged |

- **The 3 Vitest failures** are the same baseline ones: emuGuard, and firestoreTarget ×2.
- **The 1 emulator failure** is the same baseline one: foundingStats `counted:false`.
- **Vitest along the way:** the branch's own full run before the last commit showed 5 failed. The 2 extra were `liveConfig`; e15ac2bc7 fixed them.

## Locks, each with the break that turned it red

1. **Terms.** The rendered Terms equal plan-rules-v1's, section by section: 10 of 10 compared, plus the lede, the ribbon and the date. Break: one word in §8.
2. **One message for a code.** Breaks:
   - Used and unknown render byte-identical pages: `readCodeStatus` maps "used" elsewhere.
   - There is no "Sign in instead" variant: a button added to the error.
   - The server's words are the client's: one word changed.
   - Emulator, byte-identical answers for used, unknown, used-past-link and malformed codes: "used" returned for a used code.
3. **Clock labels** (`nw11.measure.ts`, measured boxes). At 1440, 1280 and 390, for every "goes quiet" option: no two labels within 16px, and no week label clipped. Break: the v1 stylesheet, red at all three widths. (A first 390 run failed at the narrow width because of a spec fault; the spec now signs in wide first.)
4. **Small visual fixes:**
   - **4a.** Settings and Plans tabs both read as a plain name (barPageName). Break: "Account" put back.
   - **4b.** "Preferences" has at least 4px clear each side, current and not; all labels are one size; the rail is 80px. Before the fix it had 0.6px clear (1.3px when not current). Break: the old stylesheet.
   - **4c.** The not-found heading is Special Elite. Break: the old stylesheet.
5. **Account leftovers:**
   - **5a.** The pending email-change panel ends with "Changed your mind? Ignore that email and nothing changes." and holds no button. Break: the sentence removed.
   - **5b.** Breaks:
     - An expired token is refused: the expiry check removed.
     - A tampered or re-keyed token is refused: the signature compare removed.
     - Each writer's own token appears only in their own links: every writer given one token.
     - The page's defaults and map match Settings': a server default flipped.
     - The headline counts what is on: news left out of the count.
     - Emulator, a valid token changes exactly that account and an expired one changes nothing: the expiry check dropped.
     - The `EMAIL_SETTINGS_URL` override wins (unit).
6. **Contact.** Breaks:
   - A failed send keeps everything and offers the mail app: the offer not drawn, and the reducer clearing the message.
   - The callable is tried first; the mail app only on failure: throw before calling.
   - Emulator delivery: the uid dropped.
7. **Housekeeping.** Breaks:
   - **7a, emulator.** The 2nd call in 10 minutes and the 6th in a day send nothing and answer identically: the 10-minute gap dropped.
   - **7c.** The badge and the Help home read one list: `HELP_NEWS` given its own list.

## Restored Terms sentences now out of date

These are listed for the legal read and not fixed. `LEGAL_COPY_REVIEWED` is still false.

- **§7, Fees.** "QueryHawk is currently free to use. A paid Pro tier is planned…"
  - Pro is already priced: 1, 3, 6 or 12 months, rolling monthly at £7.99, and Pricing states it.
  - Nothing is said of founding writers being free, or of new accounts having 14 days of Pro and then Free.
  - "These terms will be updated before any payment is taken" is still true: no payment path exists.
- **§9.** "deleted as described in the privacy policy." Privacy says 30 days, but the code's window is 14 (`DELETION_GRACE_DAYS`), and no purge job exists.
- **§6.** "each of these features gives you a review step" is an old claim, not checked feature by feature.
- **§10.** "we'll tell you in the app or by email": no in-app notice mechanism exists.

## Choices made

- **Item 2's sentence.** It is the old gate's sentence with "founder's code": "That founder's code isn't one of ours, or it's already been used. Check the email we sent, or ask us to look it up."
- **Item 2, no timing difference.** A malformed code reads a placeholder doc, so every refusal costs one read.
- **Item 7a.** "Five a day" is a rolling 24 hours. Over the limit, the answer is `{ok:true}`: nothing is sent and the link's date is not pushed on.
- **Item 5b, the page:**
  - It is an HTTPS function with plain HTML. The hosting CSP allows no inline script, so each switch is a submit button.
  - The token is base64url(uid).expiry.HMAC-SHA256, keyed with the existing `WAITLIST_IP_SALT` secret behind a domain prefix. It lasts 60 days.
  - ⚠️ The "Turn off …" links act on GET, as the ref draws them. A mail scanner that prefetches links could switch an email off.
  - Nudge and weekly also send a one-click `List-Unsubscribe` header.
  - The confirm-new-address email and the old-address notice carry no token: one address isn't confirmed yet, and the other may not be the writer's.
  - Words written:
    - "Your emails from QueryHawk."
    - "These are the emails we send to {email}."
    - "{Label} is/are on/off."
    - "This link doesn't work any more."
    - "Links to your email settings last 60 days. Sign in to change your emails in Settings."
    - "Something went wrong." / "Nothing was changed. Please try the link again in a moment."
- **Item 1, layout:**
  - The old lede sits in the navy drawer under the date (one `.mk-pv-lede` rule).
  - The old mono eyebrow "Legal · Terms" is not drawn, under the no-small-uppercase-labels rule.
  - The tab title stays "Terms of Service — QueryHawk".
- **Item 6.** The failure offers "Open it in your mail app" as a link, so the page keeps one filled button. Nothing opens the mail app on its own.
- **Item 3.** Below 600px the clock stands upright, because four 92px labels cannot sit in a row at 390.
- **Item 4b.** The settings rail items take the rail's own 4px either side (76px inside the unchanged 80px rail). The label keeps its size and letter-spacing.
- **Item 7c.** `WHATS_NEW` is now the ref's two entries, in the ref's order, and `HELP_NEWS` reads it. The three October entries are gone.

## Artefacts

- `baseline/`, `final/`: gate logs
- `functions-emu.txt`: the emulator pass
- `e2e-*.txt`: the e2e runs, including `e2e-break.txt` (the CSS break run)
- `shots/`: dev at 1440 and 390, `index-DTvKjqCk.js`:
  - Settings › Preferences
  - Settings › Emails
  - Plans
  - not-found
  - Terms
  - Contact
  - the code screen with a bad code
  - the app-emails page's bad-link screen (a valid token cannot be minted without reading the secret, so the switches were not shot)
