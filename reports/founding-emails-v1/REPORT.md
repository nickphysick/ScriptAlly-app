# Founding emails v1, phone hero tweak, launch check (1 Nov 2026)

Ref: `design-refs/founding-emails-v1.html` ("Proposed" is the oracle).

## Decision 2: case (b)

**Case (b) applies: the softened wording, with no promotion built.** Step 0.3, answered from the code
(`functions/src/waitlistStore.ts` `unsubscribeById`, and the emulator case "a released number goes to the
next writer to confirm"):

When a founding writer unsubscribes, their founding number goes onto `freedNumbers` on the counter and the
count drops by one. **Nobody on the waiting list is moved into the place, numbered or emailed.** The freed
number goes to whoever confirms NEXT, whether or not they were ever on the waiting list. So:
- `FOUNDING_FULL` reads "All fifty founding places have gone, so you're on the waiting list, in the order
  people confirmed."
- Email 3's note panel reads "**You're on the list in the order people confirmed.** If anything changes,
  you'll hear from me."

Building promotion (moving the next waiting writer in and sending them email 2) is a cap/ledger change for
Nick.

**Two things this raises, both left as they are (outside this job's allowed edits):**
1. **`/welcome`'s "waiting" state still promises what (b) withdrew.** Its lede reads "If a founding place
   frees up, it's offered to the next writer in line, and we'll tell you by email." (`welcomeCopy.ts` line 88).
   It should get the same softening, but the brief forbids touching sign-up states other than
   `FOUNDING_FULL`.
2. **A writer who signs up after the fifty have gone never gets email 3.** At join time they are written
   `waiting` with no verify token, so no confirm email is sent and there is no click. Email 3 only reaches
   writers whose confirmation lands after the cap filled, as the brief specifies ("sent from the confirm
   handler"). The page itself tells the late joiner they are on the waiting list.

## Baseline vs final

| | Baseline (21ae9907) | Final (433c319b) |
|---|---|---|
| tsc (app, functions) | 0, 0 | 0, 0 |
| Vitest | 653 files · 9,983 passed · 3 skipped | 654 files · 9,997 passed · 3 skipped |
| Functions emulator (`npm run test:functions`) | 46 passed | 49 passed (+3 EM cases) |
| Production build log | clean | clean |
| LW / PERF / SPLIT / landing-only locks (prod build) | 49 passed, 17 skipped (SPLIT-5 had no reference, SPLIT-4 skipped) | **69 passed, 1 skipped** (SPLIT-4), with SPLIT-5 run (§Launch check) |

## Commits

| | |
|---|---|
| `21ae9907` | Split v1: SPLIT-4 skipped, Phase 5 deferred, "Found, not fixed" in that report |
| `0b027d3e` | The pack (the ref and the email bird; both SHA256s match), ref enrolled in the watchlist |
| `c9b969bb` | Phase 1: the three emails |
| `94c5e302` | Phase 2: the ticket's bird sits inside its stub |
| `433c319b` | Phase 3: the phone hero is its content's height |
| (this commit) | the report |

## What changed

**The emails** (`functions/src/emailCopy.ts`, `emailTemplates.ts`):
- One shell for all three, as the ref draws it: cream ground, the 30px logo and "QueryHawk", the white card,
  the typewriter heading over its navy rule, serif body, navy button, blush note panel, rust ✓ ticks, and
  the footer under the card.
- The pass on emails 2 and 3 is a blush stub with the bird in its own table cell, wholly inside the stub.
- Built for Gmail, Apple Mail and Outlook:
  - tables and inline styles only;
  - no SVG, class, flex or absolute positioning, and no rgba (every translucent ink is precomputed as hex
    on its ground);
  - every font names its fallback (Courier New, Georgia, cursive);
  - an Outlook-only table pins the 560px column.
- Images are PNG with width, height and empty alt: the logo (`/images/email/queryhawk-logo-60.png`, 60px
  for 2×, 7.9 KB, added) and the pack's `founding-pass-bird-email.png`.
- **Email 3 is new.** It is sent from the confirm handler only on the `waiting` transition, through the
  pure `emailAfterVerify` (`waitlistModel.ts`): verified → email 2, waiting → email 3, `already` → nothing.
  A second click, or a mail scanner's prefetch, never sends again.
- Sender, reply-to, links, tokens, expiry and the unsubscribe mechanics are unchanged.

**Deliberate deviations from the ref:**
1. **The images come from the configured public origin, not a hard-coded `queryhawk.net`.** On prod that
   origin is `https://queryhawk.net` (`WAITLIST_PUBLIC_URL` in prod's functions env); on dev it is the dev
   site. A hard-coded host would have shown broken images in every dev email until a prod deploy carried
   the files. EM-1 asserts `https://queryhawk.net/images/….png` under the prod configuration.
2. **The verify URL is still printed, small and muted, under the button.** The ref drops it. It stays
   because some clients and security gateways strip or rewrite buttons, and an unreachable link loses a
   founding place. It adds no words.
3. **The pass's big line and "of 50" sit side by side on a desktop, and "of 50" drops below on a 375px
   phone.** The bird's cell is 40% of the card (the bird capped at 170px), so a phone keeps room for
   "No. 14".

**The ticket** (`FoundingTicket.tsx`, `waitlist.css`):
- The bird is 150px wide, 10px in from the right and 6px up from the bottom of a 112px stub.
- With the places gone the stub reads "All fifty taken" on two lines, clear of the bird. Before, it showed
  the label alone; the ref's "Places gone" state shows the line.

**The phone hero** (`LandingPhone.tsx`, `waitlist.css`):
- The measured min-height hook is deleted, along with `margin-top: auto` on the form.
- Every value is the brief's. Measured gaps, all as asked: sub-line 20, link 12, form 26, hawk at 206, the
  Birds-eye section 50px in, the window 46px under the rule.
- The hawk's branch passes behind the right of the email field. That follows from the brief's own
  coordinates.

## Locks, red then green

| Lock | Red (named break) | Green |
|---|---|---|
| EM-1 verbatim, both parts | `Founding Writer` capitalised in email 1's lead → "confirm HTML: Thanks for putting…" | 3 emails × subject, preheader, every string, HTML and text |
| EM-1 images | bird path to `.webp` → "not to match /\.webp/"; height removed → "to match /height=/" | every `<img>`: `https://queryhawk.net/images/….png?v=<md5>`, width, height, `alt=""`; each file exists and its version is its md5 |
| EM-2 stored number | welcome built from the cap → "welcome HTML: No. 14" | unit: 1, 14, 50. Emulator: three writers confirmed at 0/13/49 of 50 store 1/14/50, and the subject reads that stored number |
| EM-3 send once | `already` mapped to email 3 → unit "already: expected 'waiting' to be null"; emulator "exactly one email 3: got 2" | cap lowered to 2 of 2: first confirm `waiting` → one email 3; second click `already` → none; a `verified` writer never gets email 3 |
| EM-4 (b) | old `FOUNDING_FULL` → "not to match /email you if a place opens/"; ref note in email 3 → red | neither the sign-up copy nor email 3 says "email you if a place opens" or "straight away" |
| EM-5 ticket bird | Phase 1 build (the 230px bird hanging over the edge) → "top edge inside", 4 of 4 | 390 and 430, numbered and places-gone: the bird's box inside the stub; "All fifty taken" ends at x=176, the bird starts at 214 |
| LW-7 (replaced) | Phase 2 build → "the drawer has no min-height (659px)" / "(747px)" | 390×844: heading 581–656, hawk's head 669–746, date row 702–746, all inside 844. 430×932: the same, with 186px clear below the date row |
| LW-12 (re-pointed) | | full: "Founding writer passAll fifty taken", no number |

The EM unit locks are in `functions/src/foundingEmails.test.ts` and the emulator halves are in
`waitlist.emulator.spec.ts` ("founding emails v1"). EM-5 is in `tests/e2e/foundingTicket.public.ts`. Each
lock's strings are typed from the brief, not imported from `emailCopy`.

## The emails

- `emails/{confirm,welcome,waiting}-web.png`: at 680px, with the images loaded from dev.
- `emails/{confirm,welcome,waiting}-375.png`: at 375px.
- `emails/*.html`, `emails/*.txt`: the exact message (prod configuration), HTML and text.

**"As received on dev": not done.** It needs a real inbox and no address was given. **Nick: send me an
address you can read, and I'll sign up on dev, confirm, and capture emails 1 and 2 as they arrive.**
- Email 3 on dev needs the dev cap lowered to the current count, a console edit of `counters/waitlist.cap`,
  which I'd put back afterwards.
- The waiting-list path itself is exercised against the emulator with the cap lowered (EM-3).

## The ticket and the first screen

- `shots/ticket-390-numbered.png`, `shots/ticket-390-places-gone.png`
- `shots/first-screen-390.png`, `shots/first-screen-430.png`
- `shots/landing-local-{390,430,1440}.png`: the whole page, production build served locally.
- `shots/landing-dev-{390,430,1440}.png`: the whole page on dev after the deploy.

## Launch check

**1. Locks and suites.**
- **Production build served locally:** LW, PERF, SPLIT, landing-only and EM-5 give 69 passed, 1 skipped
  (SPLIT-4). Vitest 9,997 passed; emulator 49 passed; tsc clean.
  - **SPLIT-5 was run against this commit built through App's own landing-only branch** (main.tsx forced
    to AppRoot). That isolates the split from this job's intended changes. All 16 pages: nothing moved,
    at most 68 pixels different.
- **On dev after the deploy:** 36 passed, 1 failed. The failure is **PERF-5 at desktop, and it predates
  this job.**
  - Nine letter spans in one word of the card render about 5px narrower on dev.
  - The previous dev build (`4cd0a3f0`), built locally, fails identically.
  - Whole-app builds of `main` (before and after this job) pass.
  - So the cause is CSS from the dev branch's other unmerged work. `main`, which prod deploys, is
    unaffected. Left as is: it is not something this job touched.
- **On the dev branch:** Vitest 10,971 passed, emulator 55 passed.

**2. End to end on dev:** waiting on an address (see "The emails"). The deployed function and its email
images are live on dev (`/images/email/queryhawk-logo-60.png` and `/images/founding-pass-bird-email.png`
are served as `image/png`; `/api/waitlist` answers `{"visible":true,"cap":50,"count":2}`).

**3. Screenshots:** `shots/landing-*`.

**4. Sharing check (report only; nothing changed).**

| | What a pasted link shows today | Suggestion |
|---|---|---|
| `<title>` (static) | "QueryHawk: Query With Confidence". Crawlers and tabs read this before JS runs | Stale: the hero says "Hunting for a literary agent? No more winging it." Suggest "QueryHawk: No more winging it", matching og:title |
| Landing's runtime title | "QueryHawk — Take control of your querying journey" (`DOCUMENT_TITLE`) | A third wording. Suggest the same as above, so the tab doesn't change after load |
| meta description | "QueryHawk — the literary querying companion … query with confidence." | Old tagline. Suggest og:description's wording |
| og:title / twitter:title | "QueryHawk: No more winging it" | Good |
| og:description | "Track every query, agent and reply in one place. Fifty founding writer places: QueryHawk Pro, free for your whole querying campaign." | Good. The site now says "entire querying campaign"; optional |
| og:image / twitter:image | `https://queryhawk.net/og-image.jpg`, 1200×630, 94 KB, served 200, with alt text | On brand (hawk in glasses at a card index, "No more winging it.", "Fifty founding writer places"). No `twitter:image:alt` (minor) |
| og:url, locale, card | `https://queryhawk.net/`, `en_GB`, `summary_large_image` | Good |
| Favicon | `favicon.png` 32×32, `favicon.ico` 32×32, `apple-touch-icon.png` 180×180 | Good |
| theme-color | `#e7e0d5` (beige) | Safari tints its bar beige over a navy nav. Suggest `#1b2433` |
| manifest | `start_url: /dashboard` | On the landing-only site `/dashboard` redirects to `/`; harmless, but `/` is truer |

**5. Go-live list for Nick.**
1. **Prod deploys from `release/live-1`** (the `ScriptAlly-live` worktree), which `main` now fully
   contains. Bring it up to `main` first:
   ```bash
   git -C /Users/nickphysick/ScriptAlly-live merge --ff-only origin/main
   ```
   Prod's functions env file (`functions/.env.gen-lang-client-0801391782`, `WAITLIST_PUBLIC_URL=https://queryhawk.net`)
   exists only in that worktree, so deploy functions from there.
2. **In the console first:**
   - set `counters/waitlist.cap` to **50** on prod (it was still 100 on 25 Oct);
   - confirm the `RESEND_API_KEY` and `WAITLIST_IP_SALT` secrets exist on prod (the `waitlist` function
     already deploys with them, so they should);
   - App Check stays in monitor mode with no prod key (`VITE_APP_CHECK_SITE_KEY` is empty on purpose). A
     reCAPTCHA Enterprise key for queryhawk.net is only needed when you decide to enforce.
3. **Hosting first, so the email images are on queryhawk.net before any new email is sent** (the
   `/api/waitlist` rewrite and the function already exist):
   ```bash
   cd /Users/nickphysick/ScriptAlly-live && npm run build:prod && firebase deploy --only hosting --project prod
   ```
4. **Then the function** (Node 22, which `release/live-1` already has):
   ```bash
   cd /Users/nickphysick/ScriptAlly-live && firebase deploy --only functions:waitlist --project prod
   ```
5. **Testing each email from prod:**
   - Email 1: sign up on queryhawk.net with your own address.
   - Email 2: click its link. This takes a founding place: the next free number, which you can give back
     with the unsubscribe link.
   - Email 3 needs the cap full. Don't do that on prod: test it on dev with the cap lowered, as above.

## Dev

https://scriptally-dev.web.app now serves `index-CWZnyJ4o.js`, built from
`dev/…-wl2-perf1-fe1` (`f59937ce`, `main` merged onto the dev chain with no conflicts, and pushed). The
`waitlist` function was redeployed to dev first.
