# Non-workspace pages v1 — overnight run report (12–13 Nov 2026)

Branch `non-workspace-v1` (pushed, not merged), cut from `origin/plan-rules-v1` at e337cc7e7.
Dev was deployed once, from `dev/clh2-nwv1`: the dev line dev was already serving (`contact-list-header-v2`, c0a7b02b9) with this branch merged in (db3179d58, pushed). Prod was not touched.

- **Bundle before:** `index-B6PH-jXy.js`
- **Bundle after:** `index-q0BEJEln.js`, confirmed served.
- **Functions created on scriptally-dev:** `redeemInviteCode`, `sendAccountEmail`, `signOutOtherDevices`, `nudgeReminders`, `weeklySummary`. No rules change was needed.

⚠️ **The last commit (c13c1c19e) is on the branch, not on dev.** It fixes three visual defects that the dev screenshots showed. Dev still serves the version before that fix.

## a. False premises found

1. **The eight design refs were not in `design-refs/`.** All eight were in `~/Downloads`, with SHA256s that match the brief. They are copied in and on the watchlist (d0e6c686e).
2. **Settings section order.** The brief gives the ref's order as You, Plan, Emails, Preferences, Your data. The ref's own `SECTIONS` array is You, Preferences, Emails, Plan, Your data. The ref's order is the one built.
3. **`redeemInviteCode`:**
   - It ran *before* the account existed and recorded the email only.
   - It never set the founding flag; only the nightly backstop did, joining on email.
   - The one setter is `markFoundingFlags` (foundingStats.ts). Redeem now runs after sign-up and calls it, over every account, so the cap still holds.
4. **The query clock has no single source today.**
   - "Reply expected", "nudge due", "check back" and "gone quiet" are computed in about thirty places with clashing constants. Examples:
     - nudge grace of 14 days (taskPrecedence)
     - close-over of 28 days (nudgeWindow)
     - check-back of 14 days, but 28 in stepSaves and wsFlows
     - a 6-week fallback in db.tsx `calcDeadline` and recordResponse
     - the main clock returns null when the agent states no window
   - Most of these sit in Query Centre and To-do code, which is do-not-touch. `workspacePrefs.clock` did not exist.
5. **"The founding pass keeps its small capitals".** The pass is a sentence-case image (since privacy page v1), and a test forbids "FOUNDING WRITER PASS". It is left as it is.
6. **ConsentBar "if nothing renders it".** `MarketingShell` mounts it, so it was not deleted. It can never show, because no `VITE_GA_MEASUREMENT_ID` is set anywhere.
7. **`sendContactMessage` is not deployed on dev** (checked with `firebase functions:list`), so Contact stays on mailto.
8. **The deletion window is 14 days in code** (`DELETION_GRACE_DAYS`). The ref says 30 everywhere. The code's 14 is shown.
9. **CLAUDE.md on main says "direct-to-main only, no branches".** The brief and the existing dev line both use branches; the brief was followed.
10. **`docs/decisions/` does not exist on the plan-rules line.** It exists on main only.

## b. Phases

| # | Phase | Outcome | Commit |
|---|---|---|---|
| 0 | Refs and baseline | Done | d0e6c686e |
| 1 | Getting in | LANDED | f15bb42cd |
| 2 | Settings | LANDED | a9117b8fe (+ 9994b17f8, c13c1c19e) |
| 3 | The query clock | PARTLY LANDED: only "goes quiet" is read through the one clock function; the other three timings are shown as fixed figures, not controls (see a.4) | 06cbc3642 |
| 4 | Plans and pricing | LANDED | ab3864570 (signed in), aa9571445 (Pricing) |
| 5 | Account follow-ups | PARTLY LANDED (see below) | 2270ed6a9 |
| 6 | Contact and terms | LANDED, with deviations (e) | 268385c65 |
| 7 | Help centre | LANDED | 2720c9f51 |
| 8 | Public sweep | LANDED | 9cf09d8fd |
| 9 | Emails (a–f) | LANDED | de702872c |

**Phase 5, what landed:** sign out of other devices, change email, the sign-in link and the reset going through the branded path, and the founding unsubscribe page in the ref's words.

**Phase 5, what was not built:**
- **"Cancel the change"**: a Firebase verify link that has been sent cannot be withdrawn.
- **The no-sign-in "app emails" toggle page**: it needs a signed-token endpoint.
- **"That was a mistake, put me back"**: it needs a waitlist-store change, which is do-not-touch.

Non-founding emails link to Settings › Emails, which needs sign-in.

Phases 6, 7, 8 and 9a–d,f were built by three subagents in the same worktree, with disjoint files. Their reports are folded in below. I committed their work after reading those reports.

## c. Baseline against final

| Gate | Baseline | Final |
|---|---|---|
| tsc (app, 4 GB heap; 2 GB runs out of memory) | 0 errors | 0 errors |
| tsc (functions) | 0 | 0 |
| Vitest | 3 failed / 12,060 passed | 3 failed / 12,372 passed (the full suite on the merged dev tree) |
| Functions emulator | 1 failed / 81 | 1 failed / 91 |
| Production build | clean | clean (no lab names) |
| Design-ref check | 1,151 | 1,159 unchanged (1,161 on the dev merge) |

- **Vitest on the branch:** the run before 9994b17f8 had 5 failed. The two extra were fixed in that commit and re-run green.
- **The three Vitest reds** are the baseline guard scans over old e2e scripts: emuGuard cb21Emu.sh, and firestoreTarget ×2.
- **The one emulator red** is the baseline foundingStats `counted:false` case.

## d. Locks, each with the break that turned it red

Every break was restored exactly; mine were checked with `scratchpad/mut.py`, the agents' with `cmp`.

**Phase 1**
- No string literal says "invite code". Break: a literal added to beta.ts.
- The link's code is kept and never asked for again. Break: removed `keepCode(c)` on "ok".
- An expired link holds the place and offers a fresh one. Break: changed the expired copy.
- Sign-in never consults the gate. Break: `gateOn()` inside `onSignin`.
- The invite screen has no code field. Break: injected an `au-code` input.
- Emulator spec: check, fresh and redeem, including the founding flag set through the setter and single use. No mutation run (heavy).

**Phase 2**
- Each email toggle round-trips and Undo restores it. Breaks: Undo writes `on`; the weekly patch drops sibling keys.
- "Finished querying" writes only `notifyPrefs`. Break: it also wrote `scheduledDeletion`.
- At most one filled button per section. Break: two primaries injected.
- The headline counts what is on. Break: dropped news from the count.

**Phase 3**
- With no stored prefs, nothing moves. Break: legacy default 4 → 6.
- The v153.3 quiet window is honoured. Break: the legacy fallback removed.
- The defaults are today's constants. Break: `replyWeeks: 10`.
- Changing "goes quiet" changes only the quiet value. Break: check-back driven by the quiet value.
- The server's reminder clock equals the app's. Break: server nudge 2 → 1.

**Phase 4**
- No buy control with the flag off. Break: `PLANS_ON_SALE = true`.
- The columns agree with `canUse`. Break: Comparable titles made a Free row.
- The trial state's own headline line. Break: the days-left line dropped.
- The stale-claim sweep. Break: "No trial clock." inserted.

**Phase 5**
- This device signs back in. Break: token not used.
- Nothing calls `updateEmail`. Break: `updateEmail` in `startEmailChange`.
- Revoke before mint. Break: the order swapped.

**Phase 6**
- A failed send keeps the draft. Break: the reducer reset the draft.
- The ribbon is present. Break: `false &&`.
- Privacy is byte-identical. Breaks: an extra root class; a full stop removed.

**Phase 7**
- Draft URL shows not-found. Break: no draft filter.
- Empty-search state. Break: button deleted.
- Search finds a word in the body. Break: title and lede only.
- Signed out renders. Break: empty render when signed out.
- The App branch sits before the gate. Break: condition rewritten.

**Phase 9**
- The twelve verbatim. Breaks: a sign-in word changed; "reserve list" → "waiting list".
- Image rules. Break: heading in the typewriter face.
- Sender split. Break: invite → account sender.
- The account path never reveals an account. Breaks: unpadded unknown; `known:false`.
- The invite dry run writes and sends nothing. Break: the live path called first.
- A refusal is never routed round to Firebase. Break: the pass-through deleted.
- The reminder planner (empty weekly, flag). Breaks: the empty-weekly guard removed; flag defaults on.
- Emulator: a seeded writer — flag off sends 0, flag on sends exactly one nudge (two queries bundled) and one weekly.

**On dev:** the existing e2e account signed in with the gate armed, at 1440 and 390.

## e. Deviations from a ref, with reasons

**Phase 1**
- The invite screen draws no pass: FoundingTicket is do-not-touch, and no static pass component exists.
- No "You're in." card: App hands over to onboarding the moment the account exists.
- The not-found page has no "Search QueryHawk" button: the app has no global search to open.
- The used and unknown code outcomes are told apart, as the ref shows. The old gate merged them on purpose so the form could not be used to test codes; see g.

**Phase 2**
- The theme switcher and the Sign out card are removed; the ref draws neither. Sign out stays in the account menu.
- No "Your notes and rank" button.
- "Once we launch" drops the Early Bird sentence: no Early Bird exists in code.
- The deletion window reads the code's 14 days.

**Phase 3**
- The three timings are shown, not stepped (see b).
- The "goes quiet" options are today's 2, 3, 4, 6 and 8 weeks, not the ref's 4, 6, 8 and 12.

**Phase 4**
- No purchase is stated: no bought date, receipt or renewal toggle.
- The Pro state is plain.
- The "How long will you need?" estimate card is not built.
- The Pricing trial answer drops "with no card needed": an existing lock rules that phrase out.
- Pricing keeps its own tiers; the ref's Pricing tab draws no side-by-side table.

**Phase 5**
- The pending email-change panel is reworded (only the new address confirms).
- No "Cancel the change".

**Phase 6** (agent)
- The Contact header stays light; the ref draws it navy.
- No large tick on the sent panel.
- The landing footer keeps its reduced link set.
- Field labels are sentence case at 14.5px.
- A name is now required and messages need at least 10 characters (the ref's rule).
- ConsentBar is kept.

**Phase 7** (agent)
- Only "Add an agent" is published, so only the Agents subject shows.
- The overdue card, the ring link, Related and "People often ask" are hidden because they would point at drafts.
- No category page: the ref has none.
- Rank claims are dropped.
- Signed out hides "Did this help?" and "Show me".
- "New in QueryHawk" is hard-coded as `HELP_NEWS`; the Help-menu badge still counts the old `WHATS_NEW`.

**Phase 9** (agent)
- Headings are in the serif, not the typewriter face (EM-7 forbids live typewriter text).
- Action links use Firebase's own handler URL.
- The invite link is `/join/<CODE>`.

**Known visual gaps**
- The not-found heading renders in the serif: the brand stylesheet forces h1 with `!important`.
- The phone Settings still shows its own "doesn't send these emails yet" note: the phone shell is do-not-touch.
- tests/e2e/helpCentreV1.measure.ts still pins the old Help page.

## f. Words I had to write

**Getting in**
- "We couldn't check your code just now. Try again in a moment."
- "Checking your founder's code…"
- A sign-in link opened on another device:
  - "Finish signing in"
  - "You opened the sign-in link on a different device or browser. Tell us the address it was sent to."
- "That sign-in link has been used or has run out. Ask for a new one below."
- "That isn't the address the link was sent to. Try the one you asked us to send it to."

**Settings**
- Pro headline: "You're on Pro. Everything's included." / "Every QueryHawk feature, for as long as your plan runs."
- Trial line: "You have N days of Pro left." (also on Plans)
- The You headline when no country is set: "{name}."
- Time zone: "Chosen by you."
- Smart Import: "Used." / "Once on every plan. You haven't used yours yet."

**Plans**
- "No. Plans aren't on sale yet." (the charge question, for non-founding accounts while not on sale)
- Pro card: "Pro" / "Every QueryHawk feature."

**Change email**
- "Your password", and "Enter your password, so we know it's you."
- "We'll send a confirmation to the new address. Nothing changes until you confirm it there."
- Pending: "We've emailed {new}. Your sign-in changes once you've confirmed it from there, and we'll let {old} know when it has."

**Contact** (agent)
- "Over to your mail app."
- "Your message should be open there, ready to send. Once it's sent, we'll reply to {email} within two working days."
- "If nothing opened, email us at hello@queryhawk.net."

**Help** (agent)
- "Start"
- "{Page} guide: {n} of {total} done"
- "Up next: {next}."
- Signed-out not-found: "Go to the Help centre" and "QueryHawk home"

**Emails** (agent)
- Several nudges at once:
  - subject "Nudges are due: A and B"
  - heading "Nudges to A and B are due."
  - preview "Two replies were expected by now. The dates are inside."
- The weekly summary's variants: counts and number words, "And nothing due this week.", "Partial requested by", "An offer from", "Send the partial".
- The masked address `m•••@domain`
- "Sign in first."

## g. Decisions waiting for Nick

1. **Clock defaults.** Today's are kept so nothing moves: nudge 2 weeks after the reply date (the ref says 1), quiet after 4 weeks (the ref says 6). The reply window of 8 and the check-back of 2 match the ref.
2. **Rewiring the clock.** Should the ~30 clock copies be put on `lib/queryClock` in a later full-lane pass? That would make the three fixed figures into controls.
3. **Terms, every changed sentence** (ref wording taken; `LEGAL_COPY_REVIEWED` is still false):
   - **Title:** "Terms of Service" → "Terms".
   - **Date:** → "12 November 2026". It is a literal now; `companyInfo.ts`'s `LEGAL_LAST_UPDATED`, `LEGAL_ENTITY_NAME` and `REGISTERED_ADDRESS` are read by nothing.
   - **Eyebrow and lede:** both removed; replaced by "The short version", the ref's four ticks.
   - **§1:** "an agreement between you and [LEGAL ENTITY NAME] of [ADDRESS]" → "between you and QueryHawk, which is run by Nick in London, UK". The privacy sentence is kept. Added "In plain words: this is the deal between you and QueryHawk."
   - **§2:**
     - Rewritten to: "QueryHawk helps you record the literary agents you approach, what you sent, and what came back, and reminds you when something needs you." + "It does not contact agents for you, and it cannot promise any agent will reply or offer representation."
     - The early-access callout is removed.
     - Added "In plain words".
   - **§3:** now "Keep your sign-in details to yourself, and tell us if you think someone else has used your account." ⚠️ This drops the 16+ age requirement and the account-responsibility sentence. Privacy still says 16+.
   - **§4:** now "Your manuscripts, query letters, notes and records remain yours. You give us permission to store and display them to you so the service can work, and for nothing else." The "we do not use your content to train AI models" line moves to §6 as "Nothing you store is used to train any model."
   - **§5:** the three bullets and the suspension sentence → "Use QueryHawk for your own querying. Don't try to break it, copy it wholesale, or use it to send unsolicited messages."
   - **§6:** heading "AI-assisted features" → "Automated features". Body → "Smart Import and Smart email drop read what you give them and file it in your records. Nothing you store is used to train any model." Plus "In plain words: automation does the admin. It never writes for you."
   - **§7:** "Fees" → "Plans and fees". Body → the founding line, plus "After launch, new accounts begin with 14 days of Pro and then continue on the Free plan. Paid plans run for 1, 3, 6 or 12 months and then roll on to monthly until you stop them. We remind you a week before a plan ends." Plus "nothing is charged unless you choose a plan".
   - **§8:** ⚠️ the "as is" clause, the liability carve-outs, the £100 / twelve-month cap and "keep your own copies" are all REMOVED. Now: "We work hard to keep QueryHawk running and your records safe, but we can't promise it will never be unavailable." This is a substantive legal change.
   - **§9:** → "You can take a copy of your data or delete your account from Settings › Your data. Deletion has a 14-day window in which you can change your mind." (The ref says 30.) Note: the purge itself is not built.
   - **§10:** "in the app or by email" → "by email". The nations clause is dropped: "governed by the law of England and Wales". The questions line is removed.
4. **Contact sending.** Contact is NOT on real sending. `sendContactMessage` is undeployed on dev; the transport is mailto.
5. **Founder's codes: used and unknown are now distinguishable** (the ref's three outcomes). Codes are random; is that oracle acceptable?
6. **Firebase console (dev):** enable the Email-link sign-in provider. Without it, "Email me a sign-in link instead" fails.
7. **Prod env, before any prod functions deploy:**
   - `APP_PUBLIC_URL` (dev's is set in `functions/.env.scriptally-dev`).
   - Leave `REMINDER_EMAILS` unset until the nudge and weekly emails should go.
8. **The fresh-link invite has no rate limit.** Anyone holding a code can trigger repeated invites to its owner.
9. **Sign-out-everywhere** relies on the Functions service account being allowed to mint custom tokens (signBlob). If dev refuses, the button reports an error. It was not exercised tonight, so that no real sessions were revoked.
10. **ConsentBar:** remove the MarketingShell mount, `ConsentBar.tsx`, `consentBar.css` and the `staleChunk.test` entry?
11. **Copy that describes behaviour not yet built:**
    - "We remind you a week before a plan ends" (Pricing, Plans, Terms): no sender is built, by the brief.
    - "Passkeys and two-step verification are coming after launch": existing copy, kept.
12. **Google on the sign-in tab still creates an account** when none exists. A `beforeUserCreated` trigger would close that.
13. **A redeem that fails after the account is created** leaves a trial account (the code is kept for the next sign-in).

## h. Do-not-touch areas read through or changed by one line

- **App.tsx** (Phases 1 and 7):
  - the redeem-after-sign-in effect
  - /join and /signin-link sent to the Dashboard once signed in
  - an unknown path → NotFoundCard in AppShell (was a Dashboard redirect)
  - the signed-out Help branch
- **foundingStats.ts:** `listAllUsers` exported, so redeem can call the one setter over every account.
- **queryState.ts:** `quietWeeksOf` / `QUIET_WEEKS_PATH` now read and write through `lib/queryClock`. Every Query Centre, To-do and phone quiet reader is unchanged and goes through it.
- **types.ts:** `workspacePrefs.clock` added (the brief names this field).
- **WorkspaceShell.tsx:** /plans counts as settings mode, with Plan lit.
- **SidebarRail.tsx:** the Emails mark added; the dead security and tasks marks removed.
- **AccountMenu.tsx / InkAccountMenu.tsx:** the task-settings row now points at /account/preferences.
- **Phone PageRoutes.tsx:** desktop /plans no longer wraps the page in the 860px column.
- **Phone v4 `Stamp`:** imported, read-only, for the settings stamp.
- **Contact list `contactPrinciples.css`:** imported for the stamp's desktop style, read-only.
- **Phone links into Help drafts** fall back to /help through `articleHref` / `LIVE_ARTICLES`. No phone file was changed for this.
- **functions/src/inviteCode.ts:** rewritten, as Phase 1 requires. `waitlistStore.ts` and `waitlistModel.ts` are untouched.

## Artefacts

- **Baseline and final logs:** `baseline/`, `final/`
- **Emails:** `emails/`, all twelve as .html, .txt and screenshots at 600 and 375; `emails/invites-dry-run/`
- **Dev screenshots:** `shots/`, 1440 and 390, signed in (`in-*`) and signed out (`out-*`), taken on `index-q0BEJEln.js`
