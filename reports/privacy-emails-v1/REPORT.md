# Privacy page v1 + on-brand emails — report (2 Nov 2026)

**Dev:** https://scriptally-dev.web.app/privacy, served as `index-CsR4jnjZ.js`. It was deployed from branch `dev/…-wel1-priv1`, which is main @ 6437e0ba merged into the chain dev was already serving (`index-DakCloIu.js`, 6df63a9c). `functions:waitlist` was redeployed to dev with the new emails. **Prod is untouched.**

## Commits (main)

| Commit | What |
|---|---|
| 59a6dd73 | The pack: two refs and two supplied images |
| 692fa056 | Phase 1: /privacy built to the ref |
| 99dc8e9b | Addendum B: the desktop hero card's shadow fades out instead of stopping in a line |
| 6311e4ef | Phase 2: the emails carry the brand in images |
| 6437e0ba | Copy addendum: waiting-list wording, the AI lead |

## Baseline vs final

| Gate | Baseline (3d4124a2) | Final (6437e0ba) |
|---|---|---|
| tsc (app / functions) | 0 / 0 | 0 / 0 |
| Vitest | 10,015 passed | 10,030 passed |
| Emulator e2e | 49 | 49 |
| Public e2e | 82 passed, 33 skipped | 92 passed, 33 skipped |
| Production build warnings | none | none |

On the dev branch after the merge, tsc and the dev build are clean. Vitest gives 11,002 passed with 2 failed. Both failures are the known `firestoreTarget` cases about the dev chain's own cl25x scripts; they are red before this merge too.

## Locks (each one shown failing before it passed)

| Lock | Holds | Red on |
|---|---|---|
| PRIV-1 | The ribbon is off /privacy; no `[…]` placeholders; the short version is there | 3d4124a2 and the `PRIV1`/`PRIV1b` mutations |
| PRIV-2 | The AI section opens with the navy callout, and its lead is blush | `PRIV2` |
| PRIV-3 | "Who we are" uses the addendum's wording; no surname on the page, in share tags or in emails | `PRIV3` |
| PRIV-4 | A contents link lands its section just under the bar, at both widths | `PRIV4`/`PRIV4b` |
| HERO-1 | Under the desktop card, the centre and side columns fade smoothly, with shadow 2px below the card (1440×900 at DPR 2) | main before 99dc8e9b |
| EM-1 | The three emails' words, in order (now reading image alts in place) | the copy before each change |
| EM-6 | Every `<img>` has a width, a height and alt text, and points at an image that exists | removed attributes |
| EM-7 | The welcome email uses `pass-NN` for 1–50 and falls back (logged) outside that range | a fixed pass |
| EM-8 | Each committed image matches its source (see below) | `EM_MUTATE=EM8` (pass-14 drawn as "No. 15": 0.86%, red at the 0.1% bar) |
| Images-off order | With images off, each email reads in its intended order | swapped alts |

The copy addendum's updated assertions failed on 6311e4ef in five places, then passed on 6437e0ba.

## Things found

- **Firestore region:** the prod database `ai-studio-ae82196c-…` is in **europe-west2**, checked with `firebase firestore:databases:get`. The page says "London (europe-west2)".
- **Terms still has its placeholders.** It keeps the ribbon, `[LEGAL ENTITY NAME]` and `[REGISTERED / TRADING ADDRESS]`. Only Privacy lost the ribbon.
- **⚠️ The Cloudflare sentence isn't true yet.** queryhawk.net is not behind Cloudflare and serves no analytics beacon today. Don't publish /privacy to prod until Cloudflare analytics is live, or drop the sentence.
- **Smart Import accepts csv/xlsx/xls only.** The page's bullet says "spreadsheet or notes"; you chose to keep the ref's wording.
- **The two supplied images can't match their template within 1%.** pass-pending and heading-confirm were rasterised by a different renderer, so every glyph edge differs: 2.84% and 4.30% of pixels.
  - So build.mjs takes their pixels from your originals (`scripts/email-images/supplied/`) and only quantises them. Those two match their originals within 1%.
  - Every ink box in the templates is aligned to the supplied art to within a pixel. EM-8 holds the template within 5% of it, so it can't drift.
  - The 54 generated images re-render identically (0.00%), so they're held to 0.1%. At 1%, a wrong pass number (0.86%) would slip through.
- **Image sizes:** 56 PNG-8 files, the largest 42.7 KB (pass-pending), all under 60 KB.
- **"What you get" and "What happens next"** in the emails are now plain serif subheadings, not small capitals, to fit the no-capitals rule.

## Copy addendum sweep

I searched for "tell you straight", "wanting in", "first in line" and "next in line":

- "tell you straight" and "wanting in" were in the waiting email's old heading and last line; both replaced.
- "first in line" is left in one place: /welcome's waiting heading for reserve No. 1 ("So close. You're first in line."). It states a position, not a promise.
- "next in line" is left only in the in-app Contact list (`ContactNextStep.tsx`), which is out of scope. The 2(a) "offered to the next writer in line" sentences on /welcome stay behind `PLACES_OFFERED_ON = false` and are not drawn.

## Pictures

- /privacy: `privacy/privacy-{1440,390}-{top,ai}.png`
- Emails, as Gmail shows them and with images off, at 640 and 375: `emails/{1-confirm,2-welcome-14,3-waiting}-{gmail,images-off}-{640,375}.png`, with the HTML and plain text of each
- Hero shadow, before and after: `hero/{before,after}/card-{bottom,corner-left,corner-right}.png`
