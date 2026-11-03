# Landing waitlist clarity v1: report (2 Nov)

Ref: `design-refs/landing-waitlist-clarity-v1.html`. The sha256 was checked before use:
`4eb1fa7e…6f70`. It is committed and enrolled in the ref-hash guard.

Work is on branch **`release/live-1-wlc`**, cut from `release/live-1` at `456efbac`. I didn't commit
to `release/live-1` itself, because it is checked out in `~/ScriptAlly-live`; the same pattern was
used for the confirm-link fix. **Nothing went to prod.** Dev runs the same commits, ported onto
dev's own line (see §Dev).

## False premises

1. **"Confirming from the email has been landing on a Firebase error page", as a fault still to find.**
   - It was found and fixed before this run: `456efbac` "Confirm link fix" is already on
     `release/live-1`, and its report is `reports/confirm-link/REPORT.md`.
   - Prod already serves the fix: `https://queryhawk.net/welcome?v=verified` returns 200, not
     Firebase's 404.
   - The cause was hosting, not the function or its environment. My STALE-1 catch-all regex matched
     only short paths under Firebase's whole-path matching.
   - Dev still had the 404 until this run's dev deploy; it is fixed there now.
2. **"`link()` may be returning null because `WAITLIST_PUBLIC_URL` is unset."**
   - Prod's functions environment has `WAITLIST_PUBLIC_URL=https://queryhawk.net`. I read this from
     the untracked `functions/.env.gen-lang-client-0801391782` in `~/ScriptAlly-live`.
   - The confirm-link report read the same value from the deployed revision.
3. **"Phone founding section in context" (ref shot 3.1).**
   - That screenshot in the ref is a broken capture: the top half is blank and the nav sits halfway
     down the image.
   - The phone founding card was checked against the live layout, and the desktop band against ref
     shot 3.2.
4. **"The next section gets ~30px extra top margin."**
   - The ref's in-context phone shot puts the Birds-eye heading 87px under the hero's foot. That is
     58px more than before, not 30.
   - I matched the shot, to the pixel. The hero's foot (753.5) and the heading (840.5) are identical
     to the ref's.
5. **"Leave the confirm email's wording as it is" and "rename every user-facing 'waiting list'" collide.**
   - The confirm email says "you'll go on the waiting list instead".
   - The confirm-email instruction is the more specific one, so that sentence is unchanged and flagged
     in §Phase 5.

Nothing from this brief had landed before this run. `git log`, plus a grep for "reserve list",
"Join the waitlist" and the new heading, came up empty.

## Baseline (release/live-1 @ 456efbac) and every phase's gates

| | tsc | functions tsc | build (errors/warnings) | Vitest |
|---|---|---|---|---|
| Baseline | 0 | 0 | 0 | 659 files · 10,069 passed · 3 skipped |
| Phase 1 | 0 | 0 | 0 | 660 · 10,075 · 3 |
| Phase 2 | 0 | 0 | 0 | 660 · 10,080 · 3 |
| Phase 3 | 0 | 0 | 0 | 660 · 10,085 · 3 |
| Phase 4 | 0 | 0 | 0 | 662 · 10,094 · 3 |
| Phase 5 | 0 | 0 | 0 | 662 · 10,098 · 3 |

The e2e runs were against a local build.

## Phase 1: phone hero (`a58d4984`)

- The block (`HeroFounding`, shared with the desktop) holds:
  - the heading "We're looking for founding writers";
  - three ticks on the existing `.mk-dtick` disc;
  - a full-width blush "Join the waitlist" button;
  - `HeroPlaces variant="hero"`: the same live count, count-down and loading hold, with "**37** of 50
    places left".
- The heading is an **h2** where the ref draws an h3, so the heading order doesn't skip a level. It
  looks the same.
- "See what it does" is now a 48px cream circle with a navy chevron, straddling the hero's foot. It
  keeps `href="#mk-be-h"` and `aria-label="See what it does"`.
- Below 375px the heading wraps onto two balanced lines; it overflowed by 15px at 360. The ref only
  draws 390.
- Red → green: WLC-1 had six cases, all red (`expected null to be truthy`, `…to match /<button
  type="button" class="mk-wl-fjoin">…/`, `position:\s*absolute`…), then green.
- e2e: LW-7 now ends at the founding block and holds the chevron on the foot (±1px) and on the first
  screen. PRIV-5 is retired with the hero form.

## Phase 2: desktop hero (`6011d0c7`)

- After `.mk-dh-sub` come the heading, the stacked ticks, a 56px navy pill (`--mk-navy`), and a 420px
  places bar (rust on blush).
- The nav pass button reads "Join the waitlist".
- The fold was checked at 1440×900. The card ends at 748, so the band below starts above the fold
  and the Birds-eye heading is on screen. No spacing needed tightening.
- Found by screenshot: the desktop tick text rendered in Source Sans, because `brand.tsx` styles bare
  spans and the desktop has no reset. It is fixed with `font: inherit` on the span.
- Red → green: WLC-2 had four cases red, then green, plus WLC-2b.
- Re-pointed: marketingPageSmoke now expects one form (the band's) and the nav label; siteMode L2
  expects the nav label.

## Phase 3: every Join goes to one form (`d4fa1811`)

- `scrollToJoin` is now the single handler for:
  - both heroes' buttons;
  - the phone nav's "Join";
  - the desktop nav's pass button;
  - the phone join bar.
- Where it goes:
  - desktop: `.mk-claimband`, then `#mk-band-email`;
  - phone: the "Founding writer pass" card, then `#mk-close-email`.
- How it scrolls:
  - Smooth scroll, or a jump under reduced motion.
  - Focus (`preventScroll`) waits until the page is still. The scroll position and the section's
    place on screen must both hold for six frames, because the bar condenses after the scroll.
  - Any drift is corrected by an **instant** jump first. The landing sets `scroll-behavior: smooth`,
    so `"auto"` animated the correction and the field was focused mid-scroll.
- Where it lands:
  - Desktop band: flush under the bar, as the ref's shot draws it. The scroll margin is the full bar
    height, and the bar then condenses to meet the band.
  - Phone card: 16px under the bar.
- `FOUNDING_CTA` is now "Join the waitlist". It also reaches `/pricing` and `/founders`, but live
  301s both of those.
- Red → green:
  - unit WLC-3: five cases red, then green;
  - e2e `tests/e2e/waitlistClarity.public.ts`: seven cases red. Before the change the target landed
    centred, partly under the nav, and focus fired at scroll position 0. All seven are green after.
- Both landing e2e files: 40 passed.
- Seen in the harness, not traced: an instant programmatic scroll in the first ~0.5s after load was
  put back to the top. Real clicks were unaffected, and I found no `scrollTo` in our code that does it.

## Phase 4: copy (`2f3a0db1`)

- These match ref §4 word for word:
  - `FOUNDING_SENT`;
  - `welcomeSubject`;
  - `WELCOME_LEAD`;
  - the verified lede;
  - the already heading;
  - the invitation step ("We'll email you as soon as your wave opens.").
- **Beyond the table:** the welcome email's paragraph "All being well, we're talking weeks, not
  months…" is removed, under the baked decision against a "weeks, not months" line. Say if you want
  it back.
- **Kept, needs a yes or no from you:** the pass stamp on `/welcome` shows the date the writer
  confirmed (e.g. "Confirmed · 2 November 2026"). It's a record, not a promise, but the brief says
  "no dates anywhere on the welcome page". Removing it is a small change in `WelcomePage.tsx`.
- The confirm email is unchanged, and a lock holds that.
- Red → green: eight cases red, then green. Re-pointed: EM-1/EM-2, welcomeModel, W1, smoke, and the
  e2e foundingWelcome, landingOnly and welcomePage files.

## Phase 5: "reserve list" (`9c9bd378`)

**Changed:**
- `WAITING_SUBJECT` / `PREHEADER` / `PASS` / `HEADING` / `LEAD` / `NOTHING_TO_DO` and
  `UNSUBSCRIBE_NOTE_WAITING`.
- `PASS_LABEL_WAITING`, `heroCopy("waiting")` and `nextSteps("waiting")`.
- `FOUNDING_FULL`.
- **The two email images that draw the words**: `pass-waiting.png` and `heading-waiting.png`, plus
  their alt text, rebuilt with `scripts/email-images/build.mjs`. The other 52 images came out
  byte-identical.

**Deliberately left:**
- `CONFIRM_NOT_HELD`, the confirm email's "you'll go on the waiting list instead". The brief says to
  leave that email alone, so it now disagrees with the reserve email; say if it should change too.
- `legalCopy.ts`, the privacy policy's "When you join the founding writers' waiting list…". This is
  about signing up in general (now "the waitlist"), and legal copy has its own review.
- `src/lib/inviteCode.ts` "Join the waiting list": the app's sign-up screen, outside this brief.
- Comments and test names.

Red → green: WLC-5 had four cases red, then green. Re-pointed: EM-1/EM-4, images-off, landingCopy,
smoke, W1/W2/W4, and the welcomePage e2e.

## Phase 6: the confirm link, verdict

**No code fault. Prod's config is right. The fault you saw was fixed before this run, and prod serves
the fix.**

- **(a)** `WAITLIST_PUBLIC_URL=https://queryhawk.net` is set in prod's functions environment, so
  `link()` builds `https://queryhawk.net/api/waitlist/verify?token=…`.
- **(b)** `firebase.json`, the file prod deploys (site `scriptally-app`), rewrites `/api/waitlist`
  and `/api/waitlist/**` to `{functionId: waitlist, region: europe-west2}`. Both come before the
  catch-all. `firebase.holding.json` isn't what live serves.
- **(c)** The verify handler 302s to `/welcome?v=<kind>&r=<ref>`.

**End to end on the emulators.** I ran prod's own `firebase.json` hosting block, the real `waitlist`
function and Firestore, under project `demo-scriptally-wlc`, with a production landing-only build.
A test-only preload wrote the Resend POST to a file instead of sending it.

| Step | Result |
|---|---|
| Sign up through the phone page's "Join the waitlist" | "Nearly there. We've emailed you a link: click it to confirm your place on the waitlist. …" |
| Confirm email | "Confirm your founding place", link `http://127.0.0.1:5072/api/waitlist/verify?token=…` |
| Open the link | 302 → `/welcome?v=verified&r=…` → "Welcome, founding writer.", pass No. 1 of 50 |
| Welcome email | "You're on the list: founding writer No. 1" |
| Click again | "You're already on the list." |
| Cap full, second writer signs up | "All fifty founding places have gone, but we've emailed you a link: click it to join the reserve list, …" |
| …and confirms | "So close. You're first in line.", pass "Reserve list · 1st in line"; email "You're on the founding writers' reserve list" |

- The emulator's hosting matches rewrite regexes more loosely than production. So the production rule
  stays locked by `src/lib/confirmLink.test.ts` L3, from the confirm-link fix.
- Harness notes:
  - Local origins aren't on the function's allow-list, which is correct for prod, so the harness sent
    the page's POSTs as `Origin: https://queryhawk.net`.
  - The emulator's env and secret files were local and are deleted.

## Hero heights

| | Before (live) | After |
|---|---|---|
| Phone 390×844, `.mk-wl-hero`, count loaded | 661.1 | 693.7 |
| Desktop 1440×900, `.mk-dh-card` | 526.1 | 632.4 (the band still starts above the fold, at 748) |

## Screenshots (`shots/`)

| Shot | Compare with |
|---|---|
| `hero-390.png`, `chevron-390.png` (real count from the function, 37 of 50) | `ref-0.webp`: the block's heights match it exactly |
| `hero-1440.png` | `ref-2.webp` (the ref was captured 1600 wide; same layout, the band peeks in) |
| `joined-390.png`, `joined-1440.png` (after "Join the waitlist": scrolled, field focused) | `ref-3.webp` for the desktop; `ref-1.webp` is the broken capture |
| `welcome-verified-*`, `welcome-already-*`, `welcome-reserve-*` (390 and 1440) | — |
| `email-welcome-640/390.png`, `email-reserve-640/390.png` | — |
| `phone-sent.png`, `phone-full.png` (the two sign-up answers) | — |
| `before-hero-390/1440.png` (live, before) | — |

## Dev

Dev serves **`index-CNFIOSy4.js`**, deployed from
`dev/…-fe1-wel1-priv1-wlc1` @ `173881b3`, which is pushed. That branch is dev's last branch, plus a
merge of `main` (the confirm-link fix dev was missing), plus my seven commits cherry-picked cleanly,
plus one dev-line fix:

- **Main-line note:** on `main`, `MarketingShell` still uses `HERO_CTA` for the phone menu on the
  other public pages. So Phase 2's import change must keep `HERO_CTA` there.

The `waitlist` function is deployed to dev too, so dev's emails say "reserve list". On dev:

- `/welcome` returns 200;
- a missing chunk returns 404;
- verify with a bad token returns 302 to `/welcome?v=unknown`;
- the hero reads "48 of 50 places left".

The dev line's full Vitest run has two reds in `firestoreTarget.test.ts`. They list 27 e2e scripts
this work never touched, so they are older than it.

## What prod needs (yours)

From `~/ScriptAlly-live`:

```
git merge --ff-only release/live-1-wlc
npm run build:prod && node scripts/live-preflight.mjs
firebase deploy --only hosting --project prod
firebase deploy --only functions:waitlist --project prod
```

- **Hosting:** the page, plus the two rebuilt email images, which hosting serves.
- **Functions:** the email subjects and words. Until the function is redeployed, a hosting-only
  deploy shows the new "Reserve list" pass image inside an email that still says "waiting list".
  Deploy both together.

## Does any of this need to land on `main`?

Yes, if `main` is to stay the source for the next live cut. All seven commits apply cleanly onto the
dev line, which comes from `main`, as long as `MarketingShell` keeps its `HERO_CTA` import. Not done,
as asked.

## Seen in passing, not touched

- The live build's `index.html` carries Cloudflare's beacon tag directly, so it reports from any
  host serving the build, including local test runs. `main` gates analytics to queryhawk.net in code.
- The phone founding card's own places line still reads "N of 50 *founding* places left", the older
  wording; the brief keeps the card as it is.
