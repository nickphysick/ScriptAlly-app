# Overnight run — peripheral pages, capture fork, beta readiness

**16–17 Aug 2026 · 15 commits on `main`, unpushed · `main` is healthy.**

---

## 1 · Summary

All fifteen phases across the three packs ran. Nothing was skipped, nothing halted, and no phase
hit a stop condition. `main` is green: tsc 0 errors, production build passes, **5,346 tests passing
(306 files)** against a **5,204/296** baseline — 142 new tests, none removed.

Pack A shipped the four peripheral pages: a shared document shell and a single footer replacing
three that disagreed with each other, `/about`, `/contact` with a working transport, the real
privacy and terms copy behind a working-draft ribbon, and a lock that checks every public link
resolves. Pack B rebuilt the capture step as three peers, added a template column contract and a
local parser that spends no Smart Import taster, and fixed a response undercount in the derivation
engine. Pack C added the beta strip and the feedback dock, corrected an export that promised more
than it delivered, and built an invite gate that is deliberately not switched on.

**Three faults were found that were not on the list** — the alternating bands on `/about` were not
alternating (measured, not inferred), the data export sent three of the six collections the privacy
policy names, and `BETA_MODE` shipping true would have closed signup rather than gated it.

**Nothing was deployed.** `firestore.rules` changed three times and three new Cloud Functions were
written; all of it is waiting for you.

---

## 2 · NEEDS NICK

### Decisions

| # | Question | Why it needs you |
|---|---|---|
| 1 | **Which support address is real — `hello@scriptally.ink` or `support@scriptally.com`?** | The app published BOTH. `HelpCentre.tsx` had the `.com`; the legal copy names the `.ink` as the controller's contact for a UK GDPR request. I unified on `.ink` because that is the one a legal document now publishes, and it must work. If the `.ink` mailbox does not exist, this is urgent. One constant: `SUPPORT_EMAIL` in `src/lib/companyInfo.ts`. |
| 2 | **Two import templates now exist.** | `public/ScriptAlly-pipeline-import-template.xlsx` is a three-tab workbook (Instructions / Agents / Queries) with per-stage date columns, linked from the landing page and the Queries empty state, and it goes through Smart Import. The new one is a single flat sheet, generated from `TEMPLATE_COLUMNS`, parsed locally. The brief specified the flat contract; I did not retire the old file. Which survives is yours. |
| 3 | **`/help` exists and has real content.** | The brief anticipated it being empty. It is not — `HelpCentre.tsx` is a populated page. My recommendation stands: fold it into Contact eventually, since Contact now carries the "ways in" that Help duplicates. Not actioned. |
| 4 | **The privacy policy promises deletion within [30] days and nothing enforces it.** | Reported, not resolved, per the brief. See §9. |
| 5 | **Google sign-in still creates accounts without an invite code.** | The gate is real on the Create-account route; a visitor on the Sign-in tab can still get in with Google, because Google sign-in creates an account when none exists. Closing it needs a `beforeUserCreated` blocking Auth trigger. Not built. |

### Bracketed legal placeholders still outstanding

All five render on the page, brackets and all, and all five live in **`src/lib/companyInfo.ts`** —
one file to fill in.

| Constant | Renders as | Appears in |
|---|---|---|
| `LEGAL_ENTITY_NAME` | `[LEGAL ENTITY NAME]` | Privacy §1, Terms §1, Contact service line |
| `REGISTERED_ADDRESS` | `[REGISTERED / TRADING ADDRESS]` | Privacy §1, Terms §1, Contact service line |
| `ICO_REGISTRATION_NOTE` | `[ICO registration number: pending.]` | Privacy §1 |
| `DATA_REGION` | `[europe-west2 — London]` | Privacy §5 — **verify against the live project** |
| `DELETION_WINDOW_DAYS` | `[30]` | Privacy §7 |

`LEGAL_LAST_UPDATED` is `15 Aug 2026`, taken from the refs. Update it when the copy is reviewed.

### Flags — what each one does

| Flag | File | Ships as | Flipping it |
|---|---|---|---|
| `LEGAL_COPY_REVIEWED` | `src/marketing/legalCopy.ts` | `false` | `true` removes the working-draft ribbon from both legal pages and changes nothing else — no copy, no geometry, no route. **Do not set until a lawyer has read both.** |
| `CONTACT_TRANSPORT` | `src/lib/contactTransport.ts` | `"mailto"` | `"function"` sends through `sendContactMessage` instead of opening the mail client. Needs that function deployed. |
| `BETA_MODE` | `src/lib/beta.ts` | `true` | `false` removes the beta strip and the feedback dock. Safe either way. |
| `INVITE_GATE_ENABLED` | `src/lib/beta.ts` | `false` | `true` requires an invite code at signup. **Do not set until the function is deployed AND codes are seeded** — see §3. |
| `ACCOUNT_DELETION_ENABLED` | `src/lib/dataExport.ts` | `false` | `true` arms the confirm button — **and nothing is behind it.** No purge is written. This is the review gate; the deletion path has to be written first. |

**`ACCOUNT_DELETION_ENABLED` is ready for your review in the sense that the UI, the typed-email
confirm and the gating logic are complete and tested. It is NOT ready to switch on**, and switching
it on today would arm a button with no implementation. Per the standing rule in the brief, no
destructive code was written and none was executed.

---

## 3 · DEPLOY COMMANDS

**`firestore.rules` changed three times this run** (contact, beta feedback, invite codes). A
hosting-only deploy would ship a UI whose writes are silently denied.

**Dev — rules and hosting together:**

```bash
npm run build:dev && firebase deploy --only firestore:rules,hosting --config firebase.dev.json --project scriptally-dev
```

Then, per the dual-database note in `CLAUDE.md`, deploy the dev rules a second time with the plain
config and verify by release `updateTime` rather than the success line:

```bash
firebase deploy --only firestore:rules --project scriptally-dev
```

**Functions — three new, none deployed.** They are independent; deploy what you want live:

```bash
firebase deploy --only functions:sendContactMessage,functions:sendBetaFeedback,functions:redeemInviteCode --project scriptally-dev
```

**Order matters for the invite gate.** Deploy the function and the rules, seed at least one code,
redeem it end to end, and only then set `INVITE_GATE_ENABLED = true`. Seeding a code is one document:

```
inviteCodes/{CODE} = { issuedToEmail: "…", createdAt: <timestamp> }
```

`usedAt` and `usedBy` absent means unused. The collection is denied to every client including the
admin UID — seed it from the console or the Admin SDK.

**Prod is yours alone and nothing here was run against it.**

---

## 4 · BLOCKED register

**No phase was skipped.** Two ran differently from the brief's expectation, and both were
pre-authorised decisions rather than blocks:

| Phase | What happened |
|---|---|
| **B2 / B3** | The brief said to skip these if the template already parsed locally. It did not — `runSmartImport` calls the `smartImportMap` callable, so the template went through Anthropic and spent the taster. Both phases ran as written, which was the expected case. |
| **C1** | Skipped. A password-reset path already exists in `Auth.tsx` (`sendReset`, a `view === "reset"` branch, and privacy-preserving copy that does not reveal whether an account exists). Nothing to build. |

Two things were deliberately **not built** and are flagged rather than blocked:

- **A `beforeUserCreated` blocking trigger** for the Google sign-in hole in the invite gate.
- **The account-deletion purge**, per the brief's standing rule on destructive code.

---

## 5 · DECISIONS TAKEN

### Section 1 rows invoked

- **"The template exists but routes through Smart Import → run B2 and B3."** Confirmed by reading
  `src/lib/smartImport.ts`; both ran.
- **"A password reset UI path already exists → skip C1."** It does; skipped.
- **"Account deletion partially exists → build the UI and the confirm, do NOT wire the purge."**
  More existed than expected — see §6. UI corrected, purge not written.
- **"No broad export helpers → single JSON file, not a zip."** There are none; one JSON file.
- **"`/help` exists but is empty → leave it alone."** It exists and is *not* empty. Left alone,
  recommendation recorded.
- **"`BETA_MODE` has nowhere to live → one exported constant, default true."** Created in
  `src/lib/beta.ts`, default true — then split (below).
- **"A phase needs a rules change → write it, do not deploy."** Three times.
- **"The support email isn't defined anywhere → use `hello@scriptally.ink`."** It *was* defined,
  inconsistently. See decision 1.

### Judgement calls not covered by section 1

1. **Commit order inside Pack B was B2 → B3 → B1, not B1 → B2 → B3.** B1's template option has
   nowhere to upload to until B3's parser exists; committing the fork first would have left a
   button wired to nothing.
2. **The fork was extracted to its own component** (`CaptureFork.tsx`). Inside `BranchB` it was only
   reachable after driving that component through the manuscript screen, so its spec would have been
   a spec for the screen before it.
3. **`ArtSlot` was not reused** for the illustration slots. Its own docblock rejects illustration in
   page headers and its slot names are a closed union owned by the To-do workspace.
4. **`IdentityLine` was not imported** for the About sign-off. It takes an `AgentLike` and pulls
   `lib/agentDisplay` — a workspace import the marketing tier states it does not make — and a
   founder's role is not an agency. Its *law* (the hairline is its own element) was followed and
   is asserted.
5. **`companyInfo.ts` was moved to `src/lib/`** from `src/marketing/`. The Help centre needs the
   support address, and a workspace page importing from the marketing tier crosses a boundary that
   tier declares it does not.
6. **`pathFor` was exported from `App.tsx`** so the link chain could be locked end to end.
7. **The footer's copyright year is computed**, not written. It renders `© 2026` today and stays
   right in January.
8. **The About page has four illustration slots, not five.** The brief says five and then enumerates
   four (hero plus three visions); the ref draws four. Followed the ref.
9. **`INVITE_GATE_ENABLED` was split off `BETA_MODE`.** See §6.
10. **The known-issues link is not rendered** in the beta strip — there is no issues page, and a
    link to nothing teaches a beta user that the strip is decoration.
11. **The feedback receipt is the panel's own "Got it" state.** `useTodoToast` is page-scoped: the
    hook returns a toast its caller renders, so using it at shell level meant a second toast surface
    app-wide. The `onReceipt` seam is kept for the day a shell-level toast exists.
12. **Contact's "Your data" work corrected the existing section** rather than mounting the ref's
    card beside it — see §6.
13. **No data-validation dropdown in the generated template.** SheetJS's community build cannot
    write it. The xlsx carries a `Reference` sheet and the csv a comment row; the parser flags
    anything not on the list. Flagged rather than faked.

---

## 6 · WHAT WAS ALREADY THERE

This is the half of the run worth reading twice.

### The import template does **not** parse locally

`runSmartImport` (`src/lib/smartImport.ts`) calls the `smartImportMap` callable, which sends the
sheet to Anthropic. There was **no** local template path at all — the "Download our template" link
handed you a sheet whose only route back in was the one that spends your one-shot taster. B2 and B3
were both needed.

The existing template is also a **three-tab workbook**, not the flat list the brief specifies: an
Instructions sheet, an Agents sheet (9 columns) and a Queries sheet (9 columns, with separate
Partial requested / Partial sent / Full requested / Full sent dates), plus a worked Example tab.
It is richer than the new contract. See decision 2.

`ImportCsv.tsx`'s **Match Headers step is live and reachable** — a three-step flow (Input → Match
Headers → Run). Untouched, as instructed, and the fork's escape-hatch line points at it.

### Of C1–C5, two already existed and one existed more than expected

- **C1 · Password reset — EXISTS.** `Auth.tsx` has a reset view, `sendReset`, and the
  does-not-reveal-whether-an-account-exists copy. Skipped entirely.
- **C4 · Your data — EXISTED, INCOMPLETE.** Account settings already had a "Your data" section with
  an Export JSON button and a Danger zone whose delete control was permanently disabled with honest
  copy and a "type DELETE" confirm. Three corrections, no new surface:
  - **The export sent three of the six collections the policy names.** Manuscripts, agents and
    queries went out; submission packages, notes, activity history, manuscript versions and tasks
    did not — while privacy §2 names those records and §8 offers export as a right. A writer
    exercising a data right was handed a file called *everything* that was not. Now nine
    collections, with the list asserted against the shape.
  - **Correction had no route at all.** The policy offers access, export, correction and deletion.
    Two had surfaces; the one a writer is most likely to need had nowhere to click. Now → `/contact`.
  - **The confirm was the word `DELETE`.** Now the account email, which is the one string that
    differs per account. `deletionConfirmed` also refuses an empty account email, so a half-loaded
    user document plus an empty box cannot arm it.
- **`/help` — EXISTS with content.** Not the empty page the brief expected.
- **Email verification — NOT USED ANYWHERE.** `sendEmailVerification` and `emailVerified` appear
  nowhere in `src/` or `functions/` except one comment. Current behaviour: an account is usable the
  moment it is created, with no address check. Not added, per the brief.
- **`Auth.tsx` needed no link repointing.** It already navigates in-app via `goPublic("/terms")`,
  `goPublic("/privacy")` and "Back to site". The only `scriptally.ink` string left is decorative
  text inside a fake browser chrome in `LoginDashboardPreview.tsx`.
- **`useTodoToast` API:** `flash(msg, action?, ms?)`, `warn(msg, ms?)`, and a `toast` object the
  caller renders. Page-scoped — see decision 11.
- **`holding/` is still in the repo** (index.html + two images).

### Three faults found that were not on the list

1. **The About page's alternating bands were not alternating.** The flip modifier was applied to the
   bands whose DOM order already agreed with it — a no-op — so all three visions drew their plate on
   the left, through a green suite. **Only measurement found it.** Fixed and re-measured at 1280 and
   1920 (copy at 106 / 663, alternating, zero horizontal overflow) and at 700 (stacked, copy first on
   every band).
2. **The export gap**, above.
3. **`BETA_MODE = true` would have closed signup, not gated it.** `redeemInviteCode` is undeployed
   and no codes are seeded, so every signup would have failed with a message about a wrong code.
   Split onto `INVITE_GATE_ENABLED`, false.

### Two locks that were already wrong, and one that nearly was

- **`onboardingCard.test.ts`** asserted `aria-pressed={selected}` alone. The capture fork needs radio
  semantics, so it went red on correct code. Now asserts both shapes.
- **`queryDerivation.test.ts`** listed Partial Sent and Full Sent as "writer-only actions" that are
  not a response. **That assertion was the bug, written down** — see §1 of the B4 note below.
- A new lock forbidding `support@scriptally.com` went red on the two files whose *comments* explain
  the retirement. Comments are stripped first. (The repo's own documented trap, met twice more:
  a `class="mk-band"` split also matched `mk-bandcopy`, and an invite-code regex matched the
  `SA-XXXX-XXXX` placeholder.)

---

## 7 · GATES

| | Baseline | Final |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `npm run build` | pass | pass |
| Vitest | 296 files · 5,204 passed · 2 skipped | 306 files · 5,346 passed · 2 skipped |
| `functions` tsc | pass | pass |

Gates were run before every commit. `git status` was clean after each.

### Measurements taken

Browser-measured at `localhost:3000` on the **public** routes, which need no sign-in:

- `/about` at **1280**: bands alternate copy 106 / 663 / 106 / 663; horizontal overflow 0.
- `/about` at **1920**: 426 / 983 / 426 / 983; overflow 0.
- `/about` at **700**: every band stacks copy-before-plate; footer collapses to two columns;
  overflow 0.
- `/contact` at **1280**: honeypot off-screen at x −9999, width 1, `tabIndex -1`, `aria-hidden`;
  four fields; no phone field; an empty submit produces exactly the two field errors it should.
- `/privacy` at **1280**: ten sections labelled 01–10, one callout, two lists, draft ribbon present,
  all five bracketed placeholders on the page; overflow 0.

### What was NOT measured, and why it matters

**Everything in Pack C is code + unit verified, not measured.** The workspace is auth-gated, so the
browser pane cannot reach it, and the Playwright harness opens the *deployed* dev site, which does
not carry any of tonight's work. In particular:

> **The beta strip's claim that it takes no part in the page grid's arithmetic is structural, not
> measured.** The assertion is that the strip is mounted outside `.wpg` — which source can answer,
> and which is what makes the pixel claim true — but the pixels themselves have not been checked.
> **Worth one pass with `npm run e2e` after the dev deploy**, at two widths, on a page with a
> collapsing header.

Pack B's onboarding fork is likewise unmeasured — same gate.

---

## 8 · COMMITS

| Hash | Phase | |
|---|---|---|
| `107d1d8` | A1 | design refs (six files) |
| `e347c81` | A2 | shared document shell + one footer |
| `6263a85` | A3 | `/about` |
| `05036b0` | A4 | `/contact` + `sendContactMessage` + rules |
| `6d32f81` | A5 | real privacy and terms copy |
| `ef53760` | A6 | link wiring, one support address |
| `7be528d` | B2 | template column contract |
| `9853abe` | B3 | local template parser |
| `536c710` | B1 | the three-way capture fork |
| `94831db` | B4 | sent-status response fix |
| `2c07955` | C2 | beta strip |
| `4eae23e` | C3 | feedback dock + `sendBetaFeedback` + rules |
| `097f60a` | C4 | export widened, correction route, email confirm |
| `360513d` | C5 | invite gate + `redeemInviteCode` + rules |
| `bb4544a` | C5 | invite gate split onto its own flag |

**One caveat on `2c07955`:** it mounts the feedback dock, whose file lands in `4eae23e`. Both live in
`AppShell.tsx` and splitting the mount across two commits was unavoidable, so **`2c07955` alone does
not build.** The tip is green and every other commit is self-contained. Recorded here rather than
left to be discovered by a bisect.

---

## 9 · DISAGREEMENTS FOUND

Places where the privacy policy's promises and the code's behaviour do not match. **None of these
were resolved by changing the policy** — the wording is the refs' and is verbatim.

1. **Deletion within [30] days — no mechanism exists.** Privacy §7 states it; nothing in this repo
   deletes a user's records, and `ACCOUNT_DELETION_ENABLED` is false. The gap is recorded in
   `companyInfo.ts`, `legalCopy.ts` and `dataExport.ts`. **This is the largest of the four.**
2. **Export completeness — fixed tonight, and the policy was right first.** §2 named six collections
   and the export sent three. The code now matches the promise.
3. **"No third-party analytics … which is why you won't find a cookie banner here" (§6)** is true
   today and is only true while it stays true. `marketingPageSmoke.test.tsx` now asserts the section
   and the claim, so a tracker cannot arrive without something going red — but nothing stops a
   tracker being added *and* the assertion updated in the same pass. Worth remembering.
4. **Two published support addresses** — the policy names one as the route for a UK GDPR request
   while the Help centre named another. Unified tonight; the underlying question is decision 1.
5. **Invite gate completeness.** Not a policy disagreement, but the same family: the word "gate"
   over-describes what is built while Google sign-in can still create an account from the Sign-in
   tab.

---

## 10 · SUGGESTED ORDER FOR THE MORNING

1. Read §2 and answer decision 1 — it is the only one that could be sending mail nowhere.
2. Deploy dev rules + hosting together (§3). Everything visible works at that point except the two
   function-backed paths.
3. Walk `/about`, `/contact`, `/privacy`, `/terms` and the footer on dev.
4. Deploy the three functions when you want the contact form and the feedback dock live, then flip
   `CONTACT_TRANSPORT` to `"function"` if you prefer it to `mailto`.
5. Run `npm run e2e` once, and check the beta strip against a collapsing header (§7).
6. Leave `INVITE_GATE_ENABLED` and `ACCOUNT_DELETION_ENABLED` alone until you have read §2.
