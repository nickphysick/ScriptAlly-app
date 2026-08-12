# Prospect-to-user funnel — read-only reconnaissance

**Scope:** everything a brand-new prospect meets from cold URL to their first useful signed-in
screen. Read-only. Nothing in this repo was modified except this file.

**Repo state at recon**

- `git status`: clean — "On branch main / Your branch is up to date with 'origin/main' / nothing to commit, working tree clean"
- `git rev-list --count HEAD..main` = 0 (level with `main`)
- HEAD = `4ee7799b6df3ca66602a608f87bebafacbea1bdb`
- `git log --oneline -5`:
  ```
  4ee7799 feat(shell): the header's working state becomes a strip, not a smaller card
  55712b2 docs(design-refs): the three refs behind the consolidated header spec
  0356bf0 feat(shell): widths become relationships — every cap in the workspace is retired
  282f508 fix(dashboard): markup and stylesheet were from different generations — all three symptoms
  4fd7925 fix(dashboard): the urgent dedupe comes back — and eleven locks with it
  ```

**Visual-language key** (used throughout)

| Code | System |
|---|---|
| a | legacy pre-Form-11 bare hexes (and raw Tailwind `stone-`/`red-` utilities) |
| b | Form 11 parchment/burgundy mount (parchment `#fdfaf5` + paper texture + inset burgundy rim + sage band + pink primary) |
| c | printed-card (white fill, ink hairline, offset shadow, dark-ink primary) |
| d | current app shell grammar (warm ground `--ws-ground: #f7f4ee`, white content window, Playfair heads) |
| e | its own one-off system (named per screen) |

---

# Part A — per-screen inventory

## A0. Holding page (`holding/index.html`)

- **Route / trigger** — served only when `firebase.holding.json` is the deploy config. That config has no `"site"` key, so it targets the invoked project's **default** hosting site. It is not part of the app bundle.
- **File(s)** — `holding/index.html` (193 lines, self-contained: inline `<style>`, inline `<script>`, two PNGs).
- **Entry and exit** — entry is a cold domain hit. Exits: `<a class="login" href="https://scriptally-app.web.app">Founders log in</a>` (line 125) — a hardcoded `.web.app` host, not a domain; and the waitlist "join" button.
- **Branching** — none. One static page.
- **Visual language** — (e) its own token block: `:root{--white:#ffffff;--clay:#DCE0D9;--parch:#fdf9f5;...--burg:#7c3a2a;--ink:#3a322c}` (line 10ff). Body font is **Inter** (`body{font-family:'Inter',system-ui,sans-serif;background:var(--white)}`) — the app uses Source Sans Pro everywhere else. Shares the burgundy/sage/pink family but nothing else.
- **Copy faults** — none observed.
- **Mobile** — cannot be summarised from the grep performed; the file carries its own inline CSS and was not read in full for breakpoints. Recorded as **not verified**.
- **⚠️ Dead button:** the waitlist form is a stub. Line 186–191:
  ```
  /* PLACEHOLDER — replace with real /api/waitlist wiring on deploy (GET count, POST email) */
  var CAP=100,CURRENT=0;
  document.getElementById('join').addEventListener('click',function(){/* real POST wired on deploy */});
  ```
  The counter is hardcoded to `0 / 100` and the Join click handler has an empty body. The `waitlist` Cloud Function exists and the rewrite exists (`firebase.holding.json`), but the page never calls it.

## A1. Marketing chrome — `MarketingShell`

- **Route / trigger** — wraps `/` and `/pricing` for **everyone**, signed in or out (`src/App.tsx:514-529`, `tierForPath` → `"marketing"`).
- **File(s)** — `src/marketing/MarketingShell.tsx`, `src/marketing/marketingNav.ts`, `src/marketing/marketing.css`.
- **Entry and exit** — brand → `/`; Features → in-page scroll on `/`, else navigate home; Pricing → `/pricing`; **Log in** → sets `window.location.hash = "#/login"`; primary CTA → `#/signup`. Signed in: "Open dashboard" + avatar chip, never an auto-redirect.
- **Branching** — `marketingNavState(user)`: `nav.mode === "anon"` decides signup-CTA vs dashboard-CTA; `nav.showLogIn` gates the ghost log-in.
- **Visual language** — (e) `mk-`. `.mk-scope { --mk-desk:#f2ede7; --mk-card:#fffefb; --mk-head:#5d4037; --mk-burg:#7c3a2a }` (marketing.css:14-31); `.mk-btn { background:#ffffff; border:1px solid var(--mk-bd) /* #ded3c2 */; color:var(--mk-head) }`. Own token copy, declared because marketing renders outside the `.t-capp`/`.t-bold`/`.t-edn` theme classes.
- **Copy faults** — none in the chrome.
- **Mobile** — `@media (max-width: 720px) { .mk-nav { padding:14px 22px; gap:18px } .mk-links { display:none } }` (marketing.css:145). **Features and Pricing nav links disappear below 720px**; the only remaining paths to `/pricing` there are the hero's "See pricing" and the footer link.

## A2. Landing — `/`

- **Route / trigger** — `path === "/"` in the marketing branch; rendered for signed-in and signed-out alike.
- **File(s)** — `src/marketing/Landing.tsx`, `Hero.tsx`, `DashboardDemo.tsx`, `FormPeek.tsx`, `FeatureRows.tsx`, `CtaBand.tsx`, `landingCopy.ts`, `demoTimeline.ts`, `marketing.css`.
- **Entry and exit** — entry: cold URL, or the wordmark from any tier. Exits: every "start" CTA sets `#/signup`; "See pricing" → `/pricing`; the import row's link downloads `/ScriptAlly-pipeline-import-template.xlsx`; the email row's link → `/pricing`.
- **Branching** — none in the page itself. `DashboardDemo` branches on `prefers-reduced-motion` (`applyStaticTableau` vs the two-act timeline). Copy is static (`FEATURE_ROWS`, 7 rows).
- **Visual language** — (e) `mk-`. `.mk-featband { background: var(--mk-parch) /* #fdfaf5 */; border-top:1px solid var(--mk-hair) /* #e7ddd2 */ }`; `.mk-hcopy h1 { font-family:"Playfair Display"; font-size:52px; font-weight:500; color:var(--mk-head) /* #5d4037 */ }`; `.mk-tlink { color: var(--mk-burg) /* #7c3a2a */; border-bottom:1px solid rgba(124,58,42,.35) }`.
- **Copy faults**
  - Five text-links promise explanatory destinations and land on the signup screen instead: `See how tracking works`, `About the agent list`, `See a query's story`, `More on materials`, `How email drop works` — all fall through `Landing.tsx:42` to `openSignup()`. (The file's own docblock records this as deliberate: *"the remaining row text-links point at sign-up (the app is the explainer)"*. It is still a link that does not do what it says.)
  - Footer `Privacy` and `Terms` are rendered as `<span>` — inert, not links (`Landing.tsx:57-58`).
  - "Built for UK querying" (`HERO_NOTE`) — a positioning claim; nothing in the funnel code enforces or contradicts it, so it is not a code-checkable fault.
- **Mobile** — real handling, described in the CSS as a "responsive baseline (presentable, not pixel-designed)":
  - `@media (max-width:1080px)`: hero grid → 1 column, form strip → 1 column, feature rows → 1 column with `.mk-flip` order swapped, page padding 26px.
  - `@media (max-width:560px)`: `.mk-hcopy h1 { font-size:38px }` and `.mk-fv { transform: scale(.82); transform-origin: top left }`.
  - The `DashboardDemo` is a fixed 1180px replica scaled by `containerWidth / 1180` and re-measured, so it does not overflow. Below 560px the feature visuals are **scaled, not reflowed** — `transform: scale(.82)` leaves the original box size in layout, so whitespace to the right of each visual is expected.

## A3. Pricing — `/pricing`

- **Route / trigger** — `path === "/pricing"` inside the marketing branch (`App.tsx:526`). **Public.**
- **File(s)** — `src/components/Pricing.tsx` (284 lines).
- **Entry and exit** — entry: nav "Pricing", hero "See pricing", footer "Pricing", landing's email-row link, and `handleNavigate("pricing")` from `AccountSettings`. Exit: the plan toggle button; otherwise the marketing nav.
- **Branching** — `if (!currentUser) return null;` (line 34); then `isPro = currentUser.plan === UserPlan.PRO` swaps the button between "Activate Pro account now" and "Switch to Sandbox"; `simulatedSuccess` shows a 4-second banner.
- **Visual language** — (a). `bg-[#F5F0EA]`, `bg-[#e8b4a8]/35 text-[#7c3a2a]`, `bg-gradient-to-r from-[#BA7517] to-[#7c3a2a]`, plus raw `stone-100`/`stone-200` utilities. No Form 11 mount, no `--ws-*`, no `mk-`.
- **⚠️ Structural fault 1 — blank page for the visitor it is aimed at.** `/pricing` is a public marketing route, but `Pricing` returns `null` when there is no user. A logged-out prospect clicking "See pricing" gets the marketing nav above an empty body. The route's own smoke test does not catch it: `marketingPageSmoke.test.tsx:37` renders `<Pricing />` under `dbMock()`, which supplies `currentUser: SMOKE_USER` (`src/test/pageSmoke.tsx:74`), so the logged-out branch is never exercised — despite that file's docblock reading *"These two routes are PUBLIC: a crash here is the only one in the app a logged-out stranger can meet."*
- **⚠️ Structural fault 2 — a free self-upgrade on a public route.** `handleUpgradeToggle` calls `upgradeToPro()` (`src/lib/db.tsx:1065`), which writes `plan: UserPlan.PRO, subscriptionStatus: "active"` straight to the user doc. `firestore.rules:487` includes `'plan'` in the user-update allowlist and `isValidUser` only checks `data.plan == 'Free' || data.plan == 'Pro'` (rules line 59), so the write is permitted. This is the opposite of the sibling page's stated law — `PlansPage.tsx:9` says *"do not wire upgradeToPro here (it would hollow out every plan gate in the app)."*
- **Copy faults** — machine-voiced throughout, and one string states the page's own nature to the public:
  - "Configure unlimited active manuscripts & synopsis drafts"
  - "Track custom submittal pitch package files variations"
  - "Unlimited agents list base entries"
  - "Detailed response notifications timelines"
  - "Interactive CSV data backups & downloads"
  - "This pricing dashboard page demonstrates of the ScriptAlly application gating capabilities. You can instantly transition your current user account between the **Free Sandbox** mode and **Pro tier** with simulated triggers!" (grammatically broken; also names the free upgrade explicitly)
  - Button labels "Activate Pro account now" / "Switch to Sandbox".
- **Mobile** — Tailwind responsive utilities only (`px-4 md:px-8`, `max-w-4xl mx-auto`). Partial: it will not overflow, but nothing is designed below `md`.

## A4. Auth — create account (default) and sign in

- **Route / trigger** — two paths.
  1. Marketing tier: `hash === "#/login" | "#/signin"` → `<Auth initialMode="login" />`; `hash === "#/signup"` → `<Auth initialMode="signup" />` (`App.tsx:516-523`). With a hash set and a user present, `<Navigate to="/dashboard" replace />`.
  2. Any non-marketing path with no user: `#/login`/`#/signin` → sign-in mode, **everything else defaults to `initialMode="signup"`** (`App.tsx:534-537`). A logged-out deep link to `/queries` shows Create account and keeps its URL.
- **File(s)** — `src/components/Auth.tsx`, `src/components/auth/auth.css`, `src/components/auth/LoginDashboardPreview.tsx`, `src/lib/authActions.ts`.
- **Entry and exit** — entry: any landing CTA, the nav pair, a deep link, or a sign-out. Exit on success is implicit: `onAuthStateChanged` fires and `App` swaps the screen. `signup()` also sets `sessionStorage["scriptally_new_signup"] = "true"` (`db.tsx:1047`), which is one of the two onboarding triggers.
- **Branching** — `mode` (`signin`|`signup`) drives the H1 (`"Welcome back"` vs `"Take the eerie out of query"`), the name field, the password autocomplete, the min-length rule (8 chars, signup only), the Google button label, and the "Forgot?" link's `visibility`. `view` (`auth`|`reset`) swaps the whole left column. `banner.offerReset` appends a "Reset your password" action to sign-in errors only. The Terms line renders on signup only (`view === "auth" && !isSignin`).
- **Visual language** — (b) Form 11, implemented as a page-scoped sheet rather than the shared chrome: `--parchment:#fdfaf5; --burgundy:#7c3a2a; --pink:#f5e2da; --pink-bd:#e8c8bc; --frame: rgba(124,58,42,0.28)` (auth.css:15-18); `.split-card { background: var(--parchment); border-radius:16px; padding:6px }` with `.frame { border:1px solid var(--frame); border-radius:12px }` — the 6px inset burgundy rim. Primary is the pink trio (`.b-primary { background: var(--pink); color: var(--burgundy); border:0.5px solid var(--pink-bd) }`), i.e. Form 11, **not** the printed-card dark-ink primary.
- **Copy faults**
  - The nav pill reads `Founding Members open` — unconditional, hardcoded, with no data behind it (`Auth.tsx:138`). The only waitlist/cap machinery in the repo lives in the holding page + `functions/src/waitlist.ts` and this screen does not read either.
  - `Back to site` → `https://scriptally.ink` (hardcoded external, `Auth.tsx:139`).
  - Terms and Privacy → `https://scriptally.ink/terms` and `https://scriptally.ink/privacy` (`Auth.tsx:299`). **No such pages exist in this repo** — see Part C.
- **Mobile** — real handling, three breakpoints:
  - `@media (max-width:920px)`: `.frame { grid-template-columns:1fr; min-height:0 }`, `.col-feature { display:none }` (the whole right-hand feature panel + dashboard preview is dropped), `.col-form { padding:34px 30px }`.
  - `@media (max-width:560px)`: `.scene { padding:24px 14px }`, `.nav-pill { display:none }` (the Founding-Members pill goes).
  - Base `.frame` is `grid-template-columns: 436px 1fr; min-height: 640px` — fine, since the media query removes both.

## A5. Auth — password reset (request + confirmation)

- **Route / trigger** — in-place view switch: the "Forgot?" link (sign-in only) or the error banner's "Reset your password". No URL change.
- **File(s)** — same as A4; `sendReset` in `src/lib/authActions.ts`.
- **Entry and exit** — entry pre-fills `resetEmail` from whatever is in the email field. Exit: "← Back to sign in" from either sub-state.
- **Branching** — `resetSent` swaps the form for the confirmation. `sendReset` swallows `auth/user-not-found` deliberately (privacy), so the confirmation is always neutral: *"If an account exists for **{email}**, a reset link is on its way. It expires in an hour."*
- **Visual language** — (b), inherited.
- **Copy faults** — "It expires in an hour" is a claim about Firebase's link TTL that nothing in this repo sets or verifies. Firebase's default password-reset link lifetime is a console/project setting: **cannot verify from repo**.
- **Mobile** — inherits A4's breakpoints.

## A6. Google sign-in

- **Route / trigger** — the `g-btn` on either Auth mode. No screen of its own (popup).
- **File(s)** — `src/lib/authActions.ts:48` (`signInWithGoogle`), consumed by `Auth.tsx:86`.
- **Entry and exit** — `signInWithPopup` with `prompt: "select_account"`. Success unmounts the screen via the auth listener. `auth/popup-closed-by-user` and `auth/cancelled-popup-request` return silently; other codes surface in the banner.
- **Branching** — `googleBusy` swaps the label to "Connecting to Google…".
- **⚠️ Asymmetry with email signup:** `signInWithGoogle` does **not** set `sessionStorage["scriptally_new_signup"]`. A brand-new Google user still reaches onboarding, but by the other trigger — the auth listener creates the user doc with `onboardingComplete: false` (`db.tsx:439`), and `App.tsx:540` gates on `currentUser.onboardingComplete === false || freshSignupFlag`. Both roads work; they work for different reasons.
- **Visual language** — n/a (browser popup). The button itself is (b).
- **Copy faults** — none.
- **Mobile** — n/a.

## A7. Boot splash

- **Route / trigger** — `!authReady` (`App.tsx:482-507`), before every tier branch.
- **File(s)** — inline in `App.tsx`.
- **Entry and exit** — shows until Firebase Auth resolves **and** the user doc loads (`setAuthReady(true)` fires inside the user-doc `onSnapshot`, `db.tsx:453`).
- **Branching** — none.
- **Visual language** — (a) bare hexes: `background:"#F5F0EA"`, Playfair 22px in `#7c3a2a` at `opacity:0.45`.
- **Copy faults** — none (the wordmark only).
- **Mobile** — `position: fixed; inset: 0` flex-centred. Fine at any width.

## A8. Onboarding — welcome / querying-stage (step 0)

- **Route / trigger** — `currentUser.onboardingComplete === false || sessionStorage["scriptally_new_signup"] === "true"` → `<Onboarding>` renders **outside every shell**, before the workspace branch (`App.tsx:539-560`).
- **File(s)** — `src/components/Onboarding.tsx` (`WelcomeStageScreen`, `StageCard`, `ModalCard`).
- **Entry and exit** — entry from signup/first sign-in, or a resumed session (`localStorage["scriptally_onboarding_progress_{uid}"]`, normalised by `normalizeStep` — anything that is not 5 or 6 resumes at 0). Exits: Continue → the "Understood" beat → a branch; "Skip this step" → `handleStageSkip`.
- **Branching**
  - `STAGE_OPTIONS` (4): `starting` · `early` · `deep` · `interest`.
  - `STAGE_TO_BRANCH`: `starting → "A"`, `early|deep|interest → "B"`.
  - `STAGE_TO_JOURNEY`: `starting → "starting"`, all three others → `"querying"`.
  - Continue writes `queryingStage` and `journeyStage` as two separate non-blocking `updateUserProfile` calls (`persistProfile`, deliberately never awaited — see the affectedKeys note in the code).
  - `handleStageSkip`: if a Branch-B manuscript draft is held (`b2DraftRef.current`), create it once then finish with `journeyStage:"querying"`; otherwise finish with `journeyStage:"exploring"` (this is the only route to "Branch C").
  - Selecting a stage that is **not** Branch B calls `forgetB2Draft()`.
- **Visual language** — (a). `C = { bg:"#F5F0EA", card:"#FFFDF9", border:"#EBDCD3", burgundy:"#7c3a2a", dusty:"#c9a89e" }` (Onboarding.tsx:26-46). `ModalCard` is `borderRadius:20`, `0.5px solid #EBDCD3`, `boxShadow:"0 8px 40px rgba(58,28,20,0.12)"` with a 3px accent bar — **no paper texture and no inset burgundy rim**, i.e. it is not the Form 11 mount that the next screen wears. The welcome screen alone carries a sage header band (`linear-gradient(135deg,#dce0d9,#d0d6cc)`) with an "S" monogram chip rather than the real wordmark.
- **Copy faults** — none observed on this screen.
- **Mobile** — **none.** `Onboarding.tsx` and `chrome.tsx` contain zero `@media` rules and no `innerWidth`/`matchMedia`. The overlay is `position:fixed; inset:0; overflowY:auto` and the card is `width:100%; maxWidth:500` inside `padding:"32px 16px"`, so it will not overflow horizontally — but nothing about type scale, spacing or the sage band changes below 768px.

## A9. Onboarding — "Understood" beat

- **Route / trigger** — `flow === "understood"`; a `setTimeout` of **1200ms** then enters the mapped branch (`Onboarding.tsx:1008-1012`).
- **File(s)** — `src/components/onboarding/chrome.tsx` (`CreamUnderstood`).
- **Entry and exit** — entered only from step 0's Continue. No exit control — it is timed and unskippable (Back is not rendered).
- **Branching** — none; the destination was decided upstream.
- **Visual language** — (e) a cream one-off used nowhere else: `background:"#FDF9F4"`, `borderRadius:24`, a `linear-gradient(90deg,#d9b6ad,#c79a93)` top bar, `maxWidth:560`, three pulsing burgundy dots. Neither the (a) ModalCard nor the (b) Form11Card.
- **Copy faults** — none. ("Understood." / "Setting things up around where you are — one moment.")
- **Mobile** — none (no media queries; `maxWidth:560` inside a 16px-padded centre wrap).

## A10. Branch A — A2 readiness

- **Route / trigger** — `flow === "A"`, `screen === "readiness"`.
- **File(s)** — `src/components/onboarding/BranchA.tsx`, `chrome.tsx` (`Form11Card`, `SelectRow`, `BookMotif`).
- **Entry and exit** — entry from the Understood beat. Back (`onExit`) → step 0. Skip → `handleSkip`. Continue → A3 (requires a selection).
- **Branching** — three `READINESS` rows writing `ManuscriptStatus.DRAFTING` / `REVISING` / `READY_TO_QUERY`. `stillWriting = status === DRAFTING` decides the whole of A3.
- **Visual language** — (b). `Form11Card`: `background:"#fdfaf5"` + `PAPER_TEXTURE` data-URI, `position:absolute; inset:6; border:1px solid rgba(124,58,42,0.28)` inset rim, sage band `linear-gradient(135deg,#dce0d9 0%,#d0d6cc 100%)`, primary `background:"#f5e2da"; color:"#7c3a2a"; border:"0.5px solid #e8c8bc"`.
- **Copy faults** — none.
- **Mobile** — none (`maxWidth:440`, no media queries).
- **Note:** `Form11Card` renders **5 progress dots** (`DOT_TOTAL = 5`) and Branch A only ever passes `dotIndex={1}` — so the dot row never advances within the branch and implies a five-step flow that does not exist.

## A11. Branch A — A3a details / A3b still-writing

- **Route / trigger** — `flow === "A"`, `screen === "details"`.
- **File(s)** — `BranchA.tsx`, `ManuscriptFields.tsx`.
- **Entry and exit** — Back → readiness. A3a Continue → `handleBranchASaveReady` → writes the manuscript, then `setFlow(null); goTo(5)` (the legacy agents screen). A3b "Save & explore agents →" → `handleBranchAStillWriting` → writes as Drafting, sets `sessionStorage["scriptally_post_onboarding_tab"]="agents"`, then finishes onboarding (skipping step 5 and step 6 entirely).
- **Branching** — `stillWriting` swaps: title ("No rush at all" vs "A little about it"), sub-copy, the primary label, `titleOptional`, `showStrapline`, `showWordCount`, the sage helper note, and **validation**: A3a requires a title and a genre; A3b requires nothing.
- **Visual language** — (b), same `Form11Card`. Fields come from `BrandInput`/`BrandDropdown` in `src/components/forms`.
- **Copy faults** — none observed. The A3b helper note ("ScriptAlly comes into its own once you're ready to query…") is a positioning statement, not a checkable claim.
- **Mobile** — none. `ManuscriptFields` uses `flex` with `minWidth:0` on the paired age/genre row, so it will compress rather than overflow, but there is no breakpoint and one row pins `minWidth:180`.

## A12. Branch B — B2 "The book you're querying"

- **Route / trigger** — `flow === "B"`, `screen === "book"`.
- **File(s)** — `src/components/onboarding/BranchB.tsx`, `ManuscriptFields.tsx`.
- **Entry and exit** — Back (`onExit`) → step 0. Continue → validates title + genre, calls `onSaveBook` and advances to `pipeline`.
- **Branching** — `initialBook` pre-fills on re-entry. **Nothing is written here**: `handleBranchBSaveBook` holds the fields in `b2Draft` + `b2DraftRef` and returns `true`. The single manuscript write is deferred to `ensureBranchBManuscript()` (idempotent via `b2IdCache`) so the Free-tier one-manuscript cap can never fire mid-flow.
- **Visual language** — (b), `Form11Card`.
- **Copy faults** — none.
- **Mobile** — none.

## A13. Branch B — B3 "Bring it across" (the pipeline step)

- **Route / trigger** — `screen === "pipeline"`.
- **File(s)** — `BranchB.tsx`.
- **Entry and exit** — Back → `book`. Three exits: the hero upload box / "Choose a file →" opens the hidden `<input type="file" accept=".csv,.xlsx,.xls">`; "Add them by hand →" → `onAddByHand` (creates the held manuscript, then `goTo(5)`); the escape hatch "Map your own columns in the Import desk →" → `onOpenImportDesk` (creates the manuscript, sets `scriptally_post_onboarding_tab = "import"`, finishes onboarding). A template link downloads `/ScriptAlly-pipeline-import-template.xlsx`.
- **Branching** — `importOption` is seeded from `defaultImport`, which `Onboarding.tsx:1196` computes as `queryingStage === "early" ? "byhand" : "smart"` — so "A few queries out" pre-selects manual, "Deep in it" and "Had some interest" pre-select Smart Import. This is the **only** downstream use of `queryingStage`, and it reads the local state, not the persisted field.
- **Visual language** — (b), `Form11Card`, plus a dashed upload hero (`1.5px dashed #7c3a2a` when selected, `#f8ece6` fill).
- **Copy faults** — none observed.
- **Mobile** — none.

## A14. Branch B — the entitlement confirm step

- **Route / trigger** — `screen === "confirm"`, reached from `pickFile` when `entitlement.allowed` is true.
- **File(s)** — `BranchB.tsx:322-348`, `src/lib/useSmartImportEntitlement.ts` → `src/lib/smartImportEntitlement.ts`.
- **Entry and exit** — Back clears `pendingFile` → `pipeline`. "Read my file →" → `runMapping(pendingFile)`.
- **Branching** — `isPro = entitlement.tier === "pro"` swaps the sub-line ("One per month on Pro" vs "Your one free Smart Import") and the body paragraph.
- **⚠️ Structural fault — the filename is never shown here.** Line 338 reads:
  ```
  {fileName ? <>We'll read <strong>{fileName}</strong> and show you everything </> : <>We'll read your file and show you everything </>}
  ```
  but `setFileName` is only called inside `runMapping` (line 156), which this screen's own primary button triggers. `pickFile` (145-153) sets `pendingFile` and nothing else. **`fileName` is therefore always `""` on the confirm screen, so the generic branch always renders** — on the one screen whose whole job is confirming *which* file is about to spend a one-shot entitlement.
- **Visual language** — (b), `Form11Card` with `primaryFilled` (solid burgundy `#7c3a2a` primary rather than the pink).
- **Copy faults** — the fault above is structural, not wording. The wording itself is accurate.
- **Mobile** — none.

## A15. Branch B — blocked (entitlement spent)

- **Route / trigger** — `screen === "blocked"`, from the client pre-check in `pickFile` or from a structured `HttpsError` with `details.reason` of `free_used` / `pro_month_used` thrown by `runSmartImport`.
- **File(s)** — `BranchB.tsx:352-385`.
- **Entry and exit** — Back → `pipeline`. Primary: `free_used` → `onUpgrade` (sets `scriptally_post_onboarding_tab = "plans"` and finishes onboarding) or `onAddByHand` if `onUpgrade` is absent; `pro_month_used` → `onAddByHand`. `free_used` also renders a secondary "Add them by hand instead".
- **Branching** — `isFreeUsed` swaps title, sub, primary label, `primaryFilled`, the body paragraph and the secondary button. `nextAvailable` formats to `en-GB` in UTC, falling back to the literal string `"next month"`.
- **Visual language** — (b), `Form11Card`.
- **Copy faults** — none. The two states are correctly distinguished.
- **Mobile** — none.

## A16. Branch B — extraction wait (`ScatterSettleLoader`)

- **Route / trigger** — `screen === "reading"`, set at the top of `runMapping`.
- **File(s)** — `src/components/onboarding/ScatterSettleLoader.tsx`, `SheenWave.tsx`, `StatusDot.tsx`, `SmartImportReview.tsx` (`OnbNav`).
- **Entry and exit** — `onProceed` → `overview`; `onTimeout` → `fallback`. Cards come from `sampleRawRecords(file)` (display only, never the extraction path) paired by index with the validated result once `extractComplete`.
- **Branching** — `complete = extractComplete && !!validated` flips scatter → snap-and-crystallise. `prefers-reduced-motion` (checked via `matchMedia` at line 84) drops the drift, sparks and fly-in and shows the clean stack. Cards without a matching result render `{ messy }` only.
- **Visual language** — (e) a bespoke full-viewport loader, sharing `OnbNav` with the review shell. Fixed-pixel scatter geometry: offsets up to `dx: ±332, dy: ±178` from the stage centre.
- **Copy faults** — the status text is documented as rotating "honestly through read → parse → match → tidy" and the bar eases to ~78% without parking — no fake percentage.
- **Mobile** — **none.** No width media query. The `SCATTER` table is absolute pixel offsets spanning roughly 700px either side of centre; below ~1400px the scattered cards will sit off-screen.

## A17. Branch B — `ImportOverview` ("Here's what we found")

- **Route / trigger** — `screen === "overview" && validated`.
- **File(s)** — `src/components/onboarding/ImportOverview.tsx`, `src/lib/smartImportReviewModel.ts` (`parseModel`, `reviewTallies`), `SmartImportReview.tsx` (`ReviewShell`).
- **Entry and exit** — "Skip setup" (foot left) → `onSkip`; primary → `setScreen("review")`.
- **Branching** — `allClear = t.agents.fix === 0 && t.agents.sharpen === 0 && t.queries.sharpen === 0` swaps the Caveat line **and** the primary label ("Bring it in →" vs "Let's work through it →"). The sharpen/fix tiers render only when non-zero. `agentFixDesc` / `agentSharpenDesc` are computed from live counts.
- **Visual language** — (e) the "review window" system: `.sa-rv-root { background:#f2ede7 }`, `.sa-rv-window { background:#fff; border:1px solid #ddd2c0; border-radius:22px }` with a **burgundy inset frame** `::after { inset:7px; border:1px solid rgba(124,58,42,.3) }` and an animated pink→sage rim. Close cousin of (b) — parchment cards `#fdfaf5`, burgundy rim, sage/pink accents — but a distinct full-viewport chassis.
- **Copy faults** — **a claim the code can't back.** Line 98-101:
  ```
  {allClear ? "It all read cleanly — your history's ready to come straight in."
            : "Most of it's ready to go. A couple of agents need a quick fix first — and a handful of queries are chances to sharpen."}
  ```
  The non-clear branch is chosen whenever **any** of the three counts is non-zero. With `agents.fix === 0` and `agents.sharpen === 0` but `queries.sharpen > 0`, the writer is told "a couple of agents need a quick fix first" while the Agents column shows zero of both non-ready tiers. Same for the reverse case ("a handful of queries" when `queries.sharpen === 0`).
  - The file's docblock is also stale relative to its own code: it says *"Agents have a blocking 'A quick fix' tier (gold: missing agency or a duplicate group)"*, while line 74 records the current rule — *"A missing agency is now an optional sharpen"* — and `SmartImportReview`'s `agentTierOf` returns `"sharpen"` unconditionally. Not user-visible.
- **Mobile** — none of its own. Its column grid is a hardcoded `gridTemplateColumns:"1fr 1fr"` at `padding:"32px 40px"`; only `ReviewShell`'s `@media(max-width:880px){ .sa-rv-grid{grid-template-columns:1fr} }` applies, and `ImportOverview` does not use `.sa-rv-grid`.

## A18. Smart Import review — duplicates stage

- **Route / trigger** — `SmartImportReview` opens on `screen === "duplicates"` when `hadDuplicates` (any parsed agent has an unresolved `mergeWith` cluster); otherwise it opens on `agents`.
- **File(s)** — `src/components/onboarding/SmartImportReview.tsx` (3012 lines), `ReconcileCard.tsx`, `smartImportReviewModel.ts`.
- **Entry and exit** — Back → the host's `onBack` (→ `pipeline`). "Review all agents →" is **always enabled** — the code comments it as *"the deliberate 'don't trap people' skip; unresolved clusters carry through"*. `hadDuplicates` is fixed for the session so the stage stays reachable again from Agents' Back even after every cluster is resolved.
- **Branching** — per-cluster `reconciled[leaderId]` swaps the generic resolved-merge bar for the `ReconcileCard`'s own sorted state (`collapsed` | `split`). `snapRef` / `reconcileSnapRef` hold pre-resolution snapshots for Undo. Empty state: *"No duplicates to review."*
- **Visual language** — (e) review window, as A17.
- **Copy faults** — see the FAQ contradiction in Part B item 5; `DUP_FAQS` itself is internally consistent.
- **Mobile** — `@media(max-width:880px){ .sa-rv-grid{ grid-template-columns:1fr } }` collapses the 1fr/340px main+sidebar split. `COMPACT_BP = 1000` swaps the margin post-it notes for an inline fallback via `matchMedia`. So: **partial** — the two-column chassis reflows, but nothing below that is designed for narrow screens.

## A19. Smart Import review — agents stage

- **Route / trigger** — `screen === "agents"`.
- **File(s)** — as A18, plus `FocusOverlay`, `AgentFixPanel`, `GuidanceBanner`, `FaqList`, `CoachmarkIntro`.
- **Entry and exit** — Back → duplicates (when `hadDuplicates`) or the host. Forward → queries. A skip modal (`showSkipModal`) guards `onSkip`.
- **Branching** — `agentTierOf` returns `"sharpen"` unconditionally — **every agent flag is advisory; nothing blocks**. `seedUnidentifiedSetAside` auto-sets-aside agents with neither name nor agency before review begins. `statusOf(a)` drives `captured` vs needs-a-look. `a.agencyWaived` marks "use the name as primary". `baselineRef` is re-captured on leaving the duplicates stage so "Reset all changes" scopes to this stage only.
- **Visual language** — (e) review window.
- **Copy faults** — **two strings on this one screen contradict each other** (detail in Part B item 5): `AgentFixPanel` says *"…or carry on without one; nothing's lost, and you can add it any time"*, while `FAQ_ITEMS` says *"Is the agency name required?" → "Yes — every agent needs at least an agency, even when the person's name is blank."*
- **Mobile** — as A18 (partial).

## A20. Smart Import review — queries stage

- **Route / trigger** — `screen === "queries"`.
- **File(s)** — as A19, plus `QueryReasonPanel`.
- **Entry and exit** — Back → agents. Import → `modelToResult` → the host's `onImport` → `handleImport`.
- **Branching** — `queryStatusOf(q)` ∈ `captured` | `needs-check`; `tierOf` is `"sharpen"` for every query (never blocking). `q.reasons` (typed, resolvable) drive the focus overlay's panels. `queriesBaselineRef` scopes this stage's Reset.
- **Visual language** — (e) review window.
- **Copy faults** — the queries FAQ is consistent with the code (*"We'll never guess a date for you"* matches the undated handling; *"Can a query have no agent?" → "No"* matches the model).
- **Mobile** — as A18 (partial).

## A21. Branch B — commit (`ImportingLoader`) and outcome

- **Route / trigger** — `screen === "importing"` the instant Import is pressed; `screen === "done"` when the commit lands nothing.
- **File(s)** — `src/components/onboarding/ImportingLoader.tsx`, `src/components/dashboard/DashboardSkeleton.tsx`, `src/lib/smartImportCommit.ts`.
- **Entry and exit** — `handleImport` runs `onEnsureManuscript()` (the single deferred manuscript write) then `Promise.all([commitSmartImport(...), delay(5000)])`. Three outcomes:
  1. manuscript couldn't be created → `commitError` set, back to `review`;
  2. `committed.queriesImported === 0` → `screen = "done"` with the honest "That didn't work" state (never a false success, never auto-skipped);
  3. success → `importComplete = true`, the loader plays its completion beat and calls `onProceed` → `onImportComplete(outcome)` → `finishOnboarding()`.
  A thrown commit sets `commitError` and returns to `review`.
- **Branching** — `complete` flips the loader's rings/disc/tick. The `done` screen branches on `ok = outcome.queriesImported > 0` for title, sub, primary label and destination; skipped rows and `outcome.errors` render conditionally (first 4 + "…and N more").
- **Visual language** — (e) bespoke loader on `OnbNav`, handing off to `DashboardSkeleton`; the `done` screen returns to (b) `Form11Card`. **The flow changes visual language twice in three screens** — review window (e) → loader (e, different) → Form 11 card (b).
- **Copy faults** — the cycling status lines are explicitly decorative and the code says so; there is no fake percentage. No faults.
- **Mobile** — none in the loader (`@media(prefers-reduced-motion:reduce)` only). The `done` screen inherits Form11Card's lack of breakpoints.

## A22. Branch B — mapping fallback

- **Route / trigger** — the default return of `BranchB` — reached when `runSmartImport` throws anything that is not an entitlement block, or via `ScatterSettleLoader`'s `onTimeout`.
- **File(s)** — `BranchB.tsx:501-538`.
- **Entry and exit** — Back → `pipeline`; primary downloads the template; "Add them by hand" → `onAddByHand`; escape hatch → `onOpenImportDesk`.
- **Branching** — none; it is one static layout.
- **Visual language** — (b), `Form11Card`.
- **Copy faults** — none. *"We couldn't read that one automatically — use the template or add them by hand."*
- **Mobile** — none.
- **Note:** this is also the render for any unhandled `screen` value (it is the function's fall-through `return`), so e.g. `screen === "overview"` with `validated === null` lands here silently.

## A23. `ImportTidyAnimation` — **unreachable**

- **Route / trigger** — `screen === "tidying"` (`BranchB.tsx:424`). `"tidying"` appears in the `B3Screen` union (line 59) and in that one guard. **`setScreen("tidying")` is never called anywhere.** `runMapping` goes `reading → overview` directly.
- **File(s)** — `src/components/onboarding/ImportTidyAnimation.tsx` (98 lines) + `ImportTidyAnimation.test.ts`, both live and tested, neither reachable.

## A24. Onboarding step 5 — "Now let's add your agents"

- **Route / trigger** — `!flow && step === 5`. Reached from Branch A3a's save and from Branch B's "Add them by hand". Also restorable from `localStorage` (`normalizeStep` keeps 5 and 6).
- **File(s)** — `Onboarding.tsx` (`Screen5Agents`, `SelectableCard`, `FormField`, `InputField`, `ModalFooter`).
- **Entry and exit** — Back → `goTo(0)` (the welcome screen, **not** the branch that led here). Skip (top-right) → `handleSkip`. "Go to my dashboard →" → `handleScreen5Continue` → `goTo(6)`.
- **Branching** — `option` ∈ `"add"` | `"import"` | `"skip"` | `null`; the primary is disabled until one is chosen. `"add"` reveals a four-field form via a `motion.div` animating `maxHeight: 300`; `"import"` reveals a dashed CSV box (`maxHeight: 160`). Only `option === "add" && name.trim()` writes an agent.
- **Visual language** — (a), the same `C`-token `ModalCard` as step 0 — no paper texture, no inset rim, no sage band. **This is the third distinct visual language a Branch-A user meets in four screens** (a welcome → b Form 11 ×2 → a again).
- **Copy faults**
  - The eyebrow reads **"Step 2 of 2"** while `ProgressDots currentStep={5}` lights the **4th of 5** dots. Two progress claims on one screen, neither matching the other or the flow.
  - The import card's tag reads "CSV import · recommended for migrators" beside two buttons that do not import (below).
- **Structural faults** — see Part B items 1, 2 and 6. All three live on this screen.
- **Mobile** — none. The `maxHeight: 300` reveal is a fixed pixel clamp over four stacked `FormField`s; on a narrow viewport where any label or input wraps, the last field is clipped with no scroll.

## A25. Onboarding step 6 — "You're all set"

- **Route / trigger** — `!flow && step === 6`, only from step 5's Continue. `localStorage` progress is cleared on entry (`Onboarding.tsx:1153`).
- **File(s)** — `Onboarding.tsx` (`Screen6Complete`).
- **Entry and exit** — one exit: "Open my dashboard →" → `handleSkip` (which creates a held Branch-B manuscript if one exists, then `finishOnboarding`). **No Back, no Skip.**
- **Branching** — the three summary rows fall back to a placeholder when absent: `manuscriptTitle || undefined`, `agentCount > 0 ? String(agentCount) : undefined`, and a fixed `"Waiting for you →"` for "First query". Absent rows render italic `"Not added"` / the placeholder. `ProgressDots` is **not** rendered on this screen.
- **Visual language** — (a), `ModalCard` again.
- **Copy faults** — see Part B item 4. The prose block asserts an outcome the summary block immediately contradicts.
- **Mobile** — none.

## A26. "Branch C" (exploring) — no screen

- **Route / trigger** — `handleStageSkip` from step 0's "Skip this step", or `handleSkip` from any branch's "Skip setup".
- **Behaviour** — no screen of its own. `finishOnboarding` clears the progress key, fires `persistProfile({journeyStage})` and `persistProfile({onboardingComplete: true})` (both non-blocking), then calls `onComplete()`, which awaits `updateUserProfile({onboardingComplete: true})` and reads/clears `sessionStorage["scriptally_post_onboarding_tab"]`.
- **Branching** — `journeyStage` is `"querying"` if a Branch-B manuscript draft is held, `"exploring"` otherwise; `handleSkip` (the branch-level skip) passes no `journeyStage` at all, so it writes only `onboardingComplete`.

## A27. First post-onboarding screen — `/dashboard`

- **Route / trigger** — the default destination. `App.tsx:552-556` reads `sessionStorage["scriptally_post_onboarding_tab"]` and, if set, navigates there instead — the three producers are `"agents"` (Branch A3b), `"import"` (Branch B escape hatch) and `"plans"` (Branch B free-used upgrade).
- **File(s)** — `src/components/Dashboard.tsx` → `src/components/dashboard/OneScreenDashboard.tsx` + `OneScreenChart` / `OneScreenTasks` / `OneScreenAuthor` / `OneScreenCounters` / `OneScreenRail` / `OneScreenCommunity` / `OneScreenPro` / `OneScreenSkeleton`, `oneScreen.css`, `src/lib/oneScreen.ts`.
- **Entry and exit** — mounted inside `AppShell` as a `StagePage active layout="fill"`. Exits are the shell (rail, capsule bar, quick actions).
- **Branching**
  - `runStage(queries, manuscripts, now)` → `"day-one"` (no manuscript and no sends) | `"early-days"` (a manuscript but no sends, or ≤14 days from the first send) | `"settled"`. Two stages are computed: an **account** stage for the greeting and a **scoped** stage for the chart and tasks card.
  - `useSkeleton(loading)` drives a cover that is on from the first paint and outlives `loading`; the one-time entrance stagger is skipped when the cover was shown.
  - Empty states: `"Send your first query"` (`OneScreenChart.tsx:324`, `WhatsLivePanel.tsx:325`), `"The story starts with your first query."` (`OneScreenRail.tsx:479`).
- **Visual language** — (d). `--ws-ground: #f7f4ee` and `--ws-edge: #e9e2d7` (`src/index.css:80-81`); `.ws-work { background:#ffffff }`; `.os-card { background:#fffdf9; border-radius:15px; box-shadow: 0 1px 2px rgba(58,28,20,.04), 0 5px 18px rgba(58,28,20,.06) }` with the rim as an `::after` ring; `h1` is Playfair 700 at 46px in plain ink.
- **Copy faults** — none found in the first-run strings. `"Hello, {firstName}"` falls back to `"there"`.
- **Mobile** — real handling: `oneScreen.css` carries breakpoints at 1360, 1240, 1200, 1024 and 640px plus a `max-height: 680px` case, and the wider shell has a mobile pass (`mobileShell.css`, `BottomTabBar`, `MobileSheet`). **Yes.**

## A28. First-run tour (post-onboarding)

- **Route / trigger** — auto-runs 700ms after load when `tourAutoRuns(currentUser?.tourCompletedAt, wideEnough())` — i.e. `tourCompletedAt` absent **and** `window.innerWidth > 1024`. Replayable from a "Take the tour" chip whose visibility is `tourChipShows(accountCreatedAt, now, wideEnough)` — derived from the Firebase auth account's `metadata.creationTime` (7 days), never a stored flag.
- **File(s)** — `src/components/dashboard/OneScreenTour.tsx`, `oneScreenTour.css`, `src/lib/oneScreen.ts`.
- **Entry and exit** — six steps (`TOUR_STEPS`), the last one centred with no target. Both finish and skip write `tourCompletedAt`; skip additionally writes `tourDismissed: true`.
- **Branching** — suppressed entirely below `TOUR_BREAKPOINT = 1024`, for both auto-run and the chip.
- **Visual language** — (d)-consistent (a spotlight hole cut by a 9999px box-shadow; the spotlit card stays live in the page).
- **Copy faults** — none.
- **Mobile** — deliberately absent below 1024px. A phone-first prospect never sees the tour and there is no substitute.
- **Note:** the code comment at `OneScreenDashboard.tsx:125-126` says the write is *"silently denied until the firestore.rules revision deploys"*. In the committed rules file `tourCompletedAt` and `tourDismissed` are both in `isValidUser` and in the update allowlist, so that comment is stale **against the file**. Deployed state: **cannot verify from repo.**

## A29. `/import` — the Import desk (`ImportCsv`)

In scope because Branch B's escape hatch routes here (`scriptally_post_onboarding_tab = "import"`), and because the rail links it.

- **Route / trigger** — `routeKey === "import"` → `<StagePage active contentVariant="read"><ImportCsv/></StagePage>` (`App.tsx:713-715`).
- **File(s)** — `src/components/ImportCsv.tsx` (~1500 lines), `src/components/shell/PageHeader.tsx`.
- **Entry and exit** — a `PageHeader variant="full"`, then two sub-tabs: **"A. CSV Import Wizard"** (3 steps: Source CSV → mapping → import) and **"B. Live Database Grid Viewer"**.
- **Branching** — `subTab` ∈ `"wizard"` | `"grids"`; `step` 1–3; `importType` selects which entity a row becomes (manuscript / agent / query / activity / **user**); `confirmReset` / `isResetting` / `resetSuccess` gate the wipe panel; `isCleaning` / `cleanStats` gate the dedupe panel.
- **Visual language** — (a), and the most mixed on the funnel: `bg-[#F5F0EA]`, `border-[#EBDCD3]`, `bg-[#7c3a2a] text-white` alongside raw `bg-stone-50 border-stone-200`, `bg-red-600`, `bg-amber-50 text-amber-600`, `bg-green-50/50 text-green-800`. It sits under a (d) `PageHeader`, so the header and the body are visibly different systems.
- **Copy faults** — machine-voiced throughout:
  - "Transition your legacy rows, agent tracker templates, or Zite export data CSV sheets straight into your synchronized database without losing historical pitch timelines." ("Zite" appears nowhere else in the repo.)
  - "Deduplicate & Sanitize Repository Rows" / "Database Sanitize Successful!" (US spelling, twice)
  - "Wipe All Data & Recreate Sample Data … provisions a pristine set of fresh premium sample data. This is great for getting a fully populated environment immediately!"
  - "Database Successfully Wiped & Reconstructed!"
  - "A. CSV Import Wizard" / "B. Live Database Grid Viewer"
  - The `PageHeader` description is flagged in-file as `/* PROVISIONAL copy (flyouts P3) — listed for Nick's review */`.
- **Structural faults** — see Part B item 8 (the wipe button) and Part C (the `plan` column).
- **Mobile** — Tailwind utilities (`flex-col md:flex-row`, `max-w-4xl mx-auto px-4`). **Partial** — it stacks, but the grid viewer's tables are unhandled.

## A30. `/plans` — `PlansPage`

In scope because Branch B's `onUpgrade` routes here from the free-used blocked state.

- **Route / trigger** — `routeKey === "plans"` (`App.tsx:703-707`), inside `.sv2-focuscol`. Also reachable dev-only at `#/plans`.
- **File(s)** — `src/components/PlansPage.tsx`.
- **Entry and exit** — presentational only. **No plan-selection control exists**: each card's foot states "coming soon" (the `ComingSoonPill` pattern) because no payment path exists.
- **Branching** — none; it takes no plan input at all.
- **Visual language** — (b). `MountPanel` + `designTokens` (`parchment`, `sageBandGradient`, `pinkBandGradient`, `burgundy`, `headingInk`), Playfair 19px band titles with a 3px burgundy rule.
- **Copy faults** — none. The price is stated as display copy and the docblock says so.
- **⚠️ Direct contradiction with A3:** this page refuses to wire `upgradeToPro` on principle ("it would hollow out every plan gate in the app") while `/pricing` — the public route the landing points at — wires exactly that.
- **Mobile** — inherits `.sv2-focuscol` from the shell; not separately handled here.

## A31. Legal / footer surfaces

- **Terms and Privacy pages: absent.** There is no route, no component and no static file for either. Every reference is an outbound link or an inert span:
  | Where | Target | Status |
  |---|---|---|
  | `src/components/Auth.tsx:299` (signup only) | `https://scriptally.ink/terms` | external; no such page in this repo |
  | `src/components/Auth.tsx:299` (signup only) | `https://scriptally.ink/privacy` | external; no such page in this repo |
  | `src/marketing/Landing.tsx:57` | — | `<span>Privacy</span>`, **inert** |
  | `src/marketing/Landing.tsx:58` | — | `<span>Terms</span>`, **inert** |
  Both hosting configs rewrite `**` → `/index.html`, so `https://scriptally.ink/terms` would resolve to whichever app is on that domain rather than to a terms page. Whether `scriptally.ink` currently points at the app site, the holding site, or nothing: **cannot verify from repo.**
- **Back-to-site links**
  | Where | Target |
  |---|---|
  | `src/components/Auth.tsx:139` | `https://scriptally.ink` (hardcoded) |
  | `holding/index.html:125` | `https://scriptally-app.web.app` (hardcoded `.web.app` host) |
  | `MarketingShell` brand + `Landing` footer brand | `onNavigate("landing")` → `/` (in-app) |
- The landing footer deliberately carries **no Help link** — `Landing.tsx`'s docblock records that `/help` is a workspace route which dead-ended a logged-out visitor on the signup screen.

---

# Part B — status of previously identified faults

### 1. Onboarding step 5 buttons wired to the wrong handler — **STILL PRESENT**

`src/components/Onboarding.tsx:739` and `:747`. Both buttons inside the CSV reveal call `onSkip`:

```
<button onClick={onSkip} …><Download size={12} /> Download template</button>
<button onClick={onSkip} …><Upload size={12} /> Upload my spreadsheet</button>
```

`onSkip` is `handleSkip` (`Onboarding.tsx:1254`), which creates any held Branch-B manuscript and calls `finishOnboarding()`. So pressing **Download template** downloads nothing and silently ends onboarding; pressing **Upload my spreadsheet** opens no file picker and silently ends onboarding. Both land the user on the dashboard with no explanation. Original commit `4da282a feat: first-time user onboarding flow`; never changed since.

### 2. Onboarding fields captured but discarded on submit — **STILL PRESENT**

`Screen5Agents` maintains four fields:

```
const [agentEmail, setAgentEmail] = useState("");     // :641
const [agentGenres, setAgentGenres] = useState("");   // :642
```

but hands back only two:

```
const handleContinue = () => { onContinue(agentName, agentAgency, option); };   // :644-646
```

and the writer hardcodes them empty:

```
await addAgent({ name: name.trim(), agency: agency.trim(), email: "", website: "", genres: [], … });   // :1130-1144
```

The labels say "Email (optional)" and "Genres (optional)", which reads as *optional to provide*, not *discarded on submit*.

### 3. Confirm screen never rendering the picked filename — **STILL PRESENT**

`src/components/onboarding/BranchB.tsx`. `pickFile` (145-153) stores `pendingFile` and never touches `fileName`; `setFileName(file.name)` is at line 156, the first statement of `runMapping`, which is what the confirm screen's primary button calls. The ternary at line 338 therefore always takes its else branch. Introduced with the screen itself — `git log -S "pendingFile"` returns one commit, `f5bd5ae feat(smart-import): server-enforced entitlement gate (free-once / Pro-monthly)`.

### 4. Step 6 asserting outcomes that may be false — **STILL PRESENT**

`src/components/Onboarding.tsx:824-828`, rendered unconditionally:

```
<ModalTitle style={{ textAlign: "center" }}>You're all set, let's do this.</ModalTitle>
<p …>Your manuscript is ready and your agents are on file.<br />
  <em …>One step closer to yes.</em></p>
```

A user who chose "I'll add agents as I go" (or whose `addAgent` threw — the catch only `console.error`s, line 1146) reaches this screen with `agentCount === 0`. The summary block twelve lines below then prints *"Agents added — Not added"*, so the page contradicts itself in one view. Likewise a Branch-B user reaching step 5 via "Add them by hand" has a manuscript, but a user restored from `localStorage` at step 5 with an empty `manuscriptTitle` is told their manuscript is ready while the summary reads *"Manuscript — Not added"*.

Note the summary rows themselves are correct: they omit rather than assert (`row.value ? … : row.placeholder || "Not added"`). The fault is confined to the prose.

### 5. Onboarding FAQ contradicting the code on agency requirements — **STILL PRESENT**

Three separate places, one of them on the same screen as its own contradiction.

- `src/components/onboarding/SmartImportReview.tsx` `FAQ_ITEMS` (agents stage, ~line 2566):
  > "Is the agency name required?" → **"Yes — every agent needs at least an agency, even when the person's name is blank."**
- `SmartImportReview.tsx` `BANNER.agents.faqs[0]` (~line 1407):
  > "Why does an agent need an agency?" → **"We file agents under their agency, so each record needs one — the name's optional. Add it via Make changes, or remove the record."**
- Against, on the **same agents screen**, `AgentFixPanel`'s own body copy:
  > "We don't have an agency for this one. Add it to sharpen this record — **or carry on without one; nothing's lost**, and you can add it any time."

And against the code:
- `agentTierOf = (_a: ReviewAgent): "fix" | "sharpen" => "sharpen"` with the comment *"every agent flag (missing agency, mapping) is an OPTIONAL sharpen — never a blocking fix"*.
- `AgentFixPanel` offers `onPatch({ agencyWaived: true })` as an explicit route through with no agency.
- `ImportOverview.tsx:74`: *"A missing agency is now an optional sharpen."*
- `agentAgencyLine` / `agentPrimary` (`src/lib/agentDisplay.ts`) exist precisely to render agency-less agents, and the project's own record is that validity is **name OR agency**.

`FAQ_ITEMS`'s neighbouring entry compounds it: *"What if I don't have the agent's name?" → "Leave the name blank and we'll track them by agency only."* — the mirror case is answered, and the agency case is answered the opposite way.

### 6. Hardcoded agent defaults injected during onboarding — **STILL PRESENT**

`src/components/Onboarding.tsx:1130-1144`:

```
await addAgent({
  name: name.trim(), agency: agency.trim(), email: "", website: "", genres: [], mswlNotes: "",
  starRating: 3,
  submissionStatus: SubmissionStatus.OPEN,
  responseTimeWeeks: 12,
  noResponseMeansNo: false,
  submissionMethod: SubmissionMethod.EMAIL,
  materialsWanted: ["Query Letter"],
  notes: "",
});
```

Six invented facts: a 3-star rating, a 12-week response time, an OPEN submission status, `noResponseMeansNo: false`, an EMAIL submission method, and a materials list of `["Query Letter"]`. This is the direct opposite of the agent-list law recorded in `CLAUDE.md` — *"ABSENCE IS A FIRST-CLASS STATE for `starRating`, `responseTimeWeeks` and `noResponseMeansNo`… New agents are born with all three OMITTED"* — so a user's very first agent is created in a state the rest of the app treats as impossible for a new agent. `starRating: 3` also feeds the agent list's `DEFAULT_AGENT_SORT` (star rating) as a real rating.

### 7. `journeyStage` written but never read — **STILL PRESENT, still stored**

Every occurrence in the repo:

```
src/types.ts:25                 journeyStage?: "starting" | "querying" | "exploring";
src/components/Onboarding.tsx:991   persistProfile({ journeyStage: STAGE_TO_JOURNEY[queryingStage] });
src/components/Onboarding.tsx:1001  await finishOnboarding({ journeyStage: "querying" });
src/components/Onboarding.tsx:1004  await finishOnboarding({ journeyStage: "exploring" });
src/components/Onboarding.tsx:1109  if (extra?.journeyStage) persistProfile({ journeyStage: extra.journeyStage });
firestore.rules:73                  validation clause
firestore.rules:487                 update allowlist
```

No component, hook, selector or function anywhere reads `currentUser.journeyStage`. It is **not** derived; it is a stored, allowlisted, rules-validated, write-only field.

`queryingStage` is in the same position. It is persisted at `Onboarding.tsx:990`, and the only downstream consumer — `defaultImport={queryingStage === "early" ? "byhand" : "smart"}` (`:1196`) — reads the component's **local state**, not `currentUser.queryingStage`. Nothing ever reads the stored value.

### 8. Destructive wipe/reset button exposed to all users in the funnel — **STILL PRESENT**

`src/components/ImportCsv.tsx:765-820`, on the `/import` route, with **no plan gate, no admin gate and no `import.meta.env.DEV` gate** (`grep "import.meta.env.DEV" src/components/ImportCsv.tsx` returns nothing).

The panel is titled "Wipe All Data & Recreate Sample Data"; the button reads "Wipe & Recreate Data" and, after one in-page confirm, "Yes, Wipe & Reset!". It calls `wipeAndResetDatabase()` (`src/lib/db.tsx:2670`), which deletes every document in nine subcollections — `manuscripts, versions, packages, agents, queries, activities, journalEntries, notes, dismissedTasks` — and then calls `seedUserDatabase(uid)`, replacing the user's own data with the demo seed set. There is no typed confirmation, no undo, and the guard is a single `setConfirmReset(true)` toggle.

`/import` is in `WORKSPACE_PATHS`, is linked from the rail, and is a **direct onboarding exit**: Branch B's escape hatch sets `scriptally_post_onboarding_tab = "import"` and finishes onboarding straight onto this page.

The same page also exposes "Deduplicate Data" (`cleanDuplicates()`), which merges and deletes records across the whole account with no confirm step at all.

### 9. Auth screen pre-filled with real credentials or demo/sandbox quick-login buttons — **FIXED**

The current `src/components/Auth.tsx` has empty initial state for every field (`useState("")` ×4), `noValidate` forms with explicit validation, and no demo or quick-login control. Fixed in sequence:

- `563cc40 chore: remove demo-mode buttons and login auto-registration`
- `15599c5 fix: require a typed password at sign-in/sign-up (no default)`
- `d020491 fix: show auth screen on logout and app load instead of defaulting to offline sandbox`

and the component was then rebuilt wholesale at `d5478e5 feat(auth): split-screen sign in / sign up on the Form 11 aesthetic`.

### 10. `#/pkg-lab` route still registered — **STILL PRESENT (DEV-gated)**

`src/App.tsx:476-478`:

```
// Dev-only Package Workshop review surface (landing + empty/full workshop over stubs, no auth). TEMP.
if (hash === "#/pkg-lab" && import.meta.env.DEV) {
  return <PkgLab />;
}
```

`src/components/packages/PkgLab.tsx` exists. It was removed once and deliberately reinstated: `caedee2 chore(workshop): retire old builder, host workshop, swap live route, remove pkg-lab (Phase D.2)` → `1dbd7ce feat(workshop): FR1 — landing as the zero-package state` ("re-add the DEV-only #/pkg-lab harness for eyeballing it without auth"). It is unreachable in a production build.

**Related, and not on the original list:** `#/notes-scan` (`App.tsx:426-428`) is registered **without** the DEV gate, by explicit decision recorded in the code (*"Deliberately NOT DEV-gated: the numbers that matter come from a PRODUCTION build"*). In production, a signed-in user visiting `#/notes-scan` replaces the entire app with `<NotesStoreScan />`. The comment also marks it `⚠️ TEMPORARY … DELETE this branch with the component`.

The full dev-hash census in `App.tsx`: `#/status-dots`, `#/plans`, `#/import-review-dupes`, `#/import-review`, `#/import-loader`, `#/scatter-loader`, `#/reconcile-card`, `#/notes-lab`, `#/diary-lab`, `#/drawer-lab`, `#/reading-pane-lab`, `#/shell-lab`, `#/pkg-lab` — all DEV-gated — plus the ungated `#/notes-scan`.

---

# Part C — infrastructure facts

## Hosting configs

| Config | `site` | `public` | Rewrites | Notes |
|---|---|---|---|---|
| `firebase.json` | `scriptally-app` | `dist` | `** → /index.html` | also carries `functions` (source `functions`, predeploy build), `firestore` pinned to database **`ai-studio-ae82196c-c59e-40b9-b209-9fb02f67ade6`** with `firestore.rules`, and emulator config |
| `firebase.dev.json` | `scriptally-dev` | `dist` | `** → /index.html` | `firestore` pinned to **`(default)`**; adds no-store cache headers for `**` and immutable 1-year headers for `/assets/**`. No `functions` block. |
| `firebase.holding.json` | **absent** | `holding` | `/api/waitlist → function waitlist (europe-west2)`, then `** → /index.html` | no `site` key, so it deploys to the invoked project's **default** hosting site |

**Do they coexist or overwrite?** They coexist. `firebase.json` names `scriptally-app` explicitly and `firebase.holding.json` names no site, so it lands on the project's default site — a different site on the same project. Deploying one cannot overwrite the other. `firebase.dev.json` targets a different project entirely.

**What serves `/`.** For the app site, `dist` with `** → /index.html`, so `/` is the SPA and `tierForPath("/")` returns `"marketing"` → `MarketingShell` + `Landing`. For the holding site, `holding/index.html`.

## Project targeting

`.firebaserc`:

```
{ "projects": { "default": "gen-lang-client-0801391782", "prod": "gen-lang-client-0801391782", "dev": "scriptally-dev" } }
```

**`default` is PROD.** A `firebase deploy` without `--project` resolves to `gen-lang-client-0801391782`. Which project the local build points at at runtime is a build-time env question — **cannot verify from repo** which config a given `dist/` was built with.

## Smart Import functions

Present in `functions/src/`. `functions/src/index.ts` exports five:

```
smartImportMap · extractFromEmail · suggestComps · assistAgentData · waitlist
```

- **Model string:** `MODEL = "claude-sonnet-4-6"`, defined in `functions/src/emailImportCore.ts:54` and re-used by `smartImport.ts` (`import { MODEL } from "./emailImportCore"`, line 22; consumed at line 138). The same literal is separately declared in `assistAgentDataCore.ts:16` and `suggestCompsCore.ts:19`.
- **API-key secret:** `const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY")` in all four AI functions, bound per-function via `{ secrets: [ANTHROPIC_API_KEY], region: "europe-west2", … }` and read as `new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })`. Each file states the key lives only in Functions, never in the browser.
- `assistAgentData.ts:13` carries an in-file marker: *"⚠️ NOT DEPLOYED. Before this can go live, Nick must (1) confirm the ANTHROPIC_API_KEY rotation…"*.
- **Deployed state cannot be verified from the repo.**

## Firestore rules — funnel-relevant fields

`firestore.rules`, `isValidUser` (lines 55-95) and the user-update allowlist (line 487).

| Field | In `isValidUser`? | In update allowlist? |
|---|---|---|
| `onboardingComplete` | yes — absent-or-bool (line 71) | yes |
| `queryingStage` | yes — absent-or-string ≤32 (line 72) | yes |
| `journeyStage` | yes — absent-or-string ≤32 (line 73) | yes |
| `hasSeenTour` | yes — absent-or-bool (line 79) | yes |
| `tourSeenAt` | yes — absent-or-string ≤64 | yes |
| `tourCompletedAt` / `tourDismissed` | yes | yes |
| `plan` | yes — `'Free' \| 'Pro'` only (line 59) | **yes** |
| `homeCountry` | yes — absent-or-string ≤64 | yes |

Two consequences for the funnel:

1. **A client can set its own plan.** `plan` is allowlisted and only value-checked, so `updateUserProfile({ plan: 'Pro' })` is permitted by the rules. Two client paths reach it: `Pricing`'s "Activate Pro account now" (A3) and `ImportCsv`'s `importType === "user"` branch, which maps any CSV column matching `["plan","user plan","account level","level","tier","plan tier"]` and writes `UserPlan.PRO` when the cell contains "pro" (`ImportCsv.tsx:597-604`), alongside `trialStartDate` and `subscriptionStatus`.
2. **Nothing in the committed rules is flagged as needing a deploy for the funnel.** Every field the funnel writes is present in the file. Two in-code comments claim otherwise and are stale against the file: `OneScreenDashboard.tsx:125` on `tourCompletedAt`, and `Onboarding.tsx:977-981`'s general warning about silent denials (which is a correct general rule, not a claim about a specific field). **Whether the committed rules are the deployed rules cannot be verified from the repo** — and note the dual-database split above (`firebase.json` pins the `ai-studio-…` database, `firebase.dev.json` pins `(default)`).

## Terms and Privacy

No route, no component, no static file. See A31 for the four references and their targets.

## Waitlist / email capture

- **Server:** `functions/src/waitlist.ts` — an HTTP `onRequest` (not a callable), `region: "europe-west2"`, `timeoutSeconds: 30`, `memory: "256MiB"`. `GET → { count, cap }`; `POST { email } → { ok, position, count, cap, alreadyJoined? }`. `DEFAULT_CAP = 100`, `MAX_EMAIL_CHARS = 254`, a single-line email regex. Writes via the Admin SDK, which bypasses rules — the file notes `waitlist/` and `counters/` are explicitly denied to all clients.
- **Storage:** `counters/waitlist` (a `{count, cap}` doc) and `waitlist/{sha256(normalisedEmail)}` — a deterministic doc id so the same address cannot double-insert.
- **Transport:** the same-origin rewrite `/api/waitlist → waitlist` in `firebase.holding.json` only. Nothing in `src/` calls it.
- **⚠️ The only client is a stub.** `holding/index.html`'s Join handler is empty and the counter is hardcoded to `0` (see A0). So the function exists, the rewrite exists, and no live page posts to it.
- The file's own follow-up note: *"NOT built here — recommended next defence: App Check + rate-limiting to harden this public endpoint against abuse/inflation."*

## Other infrastructure facts touching the funnel

- **New users are not seeded.** `seedUserDatabase(uid)` has exactly one caller, `wipeAndResetDatabase` (`db.tsx:2697`). Signup creates a bare user doc.
- **Every new user is written as `subscriptionStatus: "trialing"`** with `trialStartDate = new Date().toISOString()` (`db.tsx:436-438`). No funnel surface mentions or acts on a trial.
- **`/queries/analytics` is unreachable.** `App.tsx:593` computes `queriesAnalytics` and line 643 mounts `<QueryAnalytics/>`, but `/queries/analytics` is not in `WORKSPACE_PATHS`, so line 568's guard redirects it to `/dashboard` first. Outside the funnel, recorded in passing.

---

# Part D — funnel walk

**Cold URL.** A prospect who reaches `scriptally.ink` lands on whichever site that domain points at — the repo cannot say which. If it is the holding site, they meet a single self-contained page in its own visual system (Inter body type, its own `--clay`/`--parch` tokens), read the manifesto, and hit a **Join** button whose click handler is an empty function beside a counter hardcoded to `0 / 100`. The one working exit is "Founders log in", pointing at the literal host `https://scriptally-app.web.app`. If instead the domain points at the app site, they land on the real landing at `/`.

**The landing.** `/` is the strongest screen in the funnel: a fixed 1180px dashboard replica scaled to its container with a two-act cursor choreography, a Form 11 pair peeking beneath it, and seven alternating feature rows on a parchment band — all in the `mk-` system, which is the marketing tier's own token copy. Every primary CTA sets `#/signup`. Five of the seven feature rows also carry a secondary text-link — "See how tracking works", "About the agent list", "See a query's story", "More on materials", "How email drop works" — and **all five go to the signup screen**, which is a deliberate decision recorded in the file and still a link that does not do what it says. The footer's **Privacy and Terms are `<span>`s, not links.** Below 720px the nav's Features and Pricing links vanish.

**Pricing.** "See pricing" navigates to `/pricing`, a public marketing route rendering a component that opens `if (!currentUser) return null;`. **A logged-out prospect gets the marketing nav above an empty page** — the single worst dead end in the funnel, and one the route's own smoke test cannot see because the test's db mock always supplies a user. A *signed-in* visitor to the same URL gets something worse: a developer sandbox in the legacy bare-hex language, listing features in machine voice ("Track custom submittal pitch package files variations"), offering an **"Activate Pro account now"** button that writes `plan: Pro` directly to their user doc for free, and a notice explaining that they can "instantly transition your current user account between the Free Sandbox mode and Pro tier with simulated triggers!". `/plans`, the app-side sibling, refuses to wire that same call on the stated grounds that it "would hollow out every plan gate in the app".

**Signup.** Any start CTA sets `#/signup` and `App` swaps in `Auth`. This is a genuinely finished screen: split card, 6px inset burgundy rim on parchment, Google sign-in, real client-side validation, a privacy-preserving reset flow. It wears Form 11 (b) rather than the marketing `mk-` system, so the language changes at the moment of commitment. Two claims sit on it that nothing backs: a hardcoded **"Founding Members open"** pill with no data behind it, and Terms/Privacy links to `https://scriptally.ink/terms` and `/privacy` — **pages that do not exist in this repo**, and which, given both hosting configs rewrite `**` to `/index.html`, would serve an app shell rather than a document. It is also the only funnel screen with proper breakpoints of its own (920px drops the feature panel, 560px tightens the scene).

**Onboarding, step 0.** `signup()` sets `scriptally_new_signup`, the user doc is created with `onboardingComplete: false`, and `Onboarding` takes over the whole viewport at `z-index: 9999`, outside every shell. The welcome card asks where you are in your querying journey — four options, a sage header band, an "S" monogram chip standing in for the wordmark. **The visual language has changed again**: this card is the legacy `C`-token `ModalCard`, with no paper texture and no inset rim. The answer writes two profile fields, `queryingStage` and `journeyStage`, **neither of which is ever read back from the profile by anything in the app**.

**The branch.** A 1200ms cream "Understood" beat — a third distinct card style, used on this one screen — then the flow forks. "Just getting started" goes to Branch A; the other three go to Branch B. Both branches are the strongest-built part of the funnel and both wear the real Form 11 mount (parchment + paper texture + 6px burgundy rim + sage band). Branch A asks readiness, then a details form whose validation loosens if you are still writing, and exits either to the agents step or — for "still writing" — straight past the rest of onboarding into the agent database. Branch B holds the manuscript in memory rather than writing it, precisely so the Free-tier cap can never fire mid-flow, and offers Smart Import as the hero with a pre-selection driven by the stage answered at step 0.

**Smart Import.** Choosing a file opens a confirm screen whose entire purpose is to name the file about to spend a one-shot entitlement — and which **never shows the filename**, because `setFileName` runs inside the function this screen's button calls. Past that, the flow is well built and honest: a scatter-and-settle loader showing the writer's own raw cells crystallising into real `StatusDot`s; an overview tallying agents and queries by population; a three-stage review (duplicates → agents → queries) where nothing blocks and the proceed button always works. The visual language changes again here — a full-viewport white "review window" with a burgundy inset frame and an animated rim, a fourth system. The overview's Caveat line **claims "a couple of agents need a quick fix first" whenever any of the three counts is non-zero**, including when the agents column shows zero of both non-ready tiers. And on the agents stage two strings contradict each other in one view: the inline fix panel says *"carry on without one; nothing's lost"*, the FAQ margin note says *"Yes — every agent needs at least an agency"*. The code agrees with the panel. Committing runs a real 5-second floor beside the real write, refuses to route on a false success, and reports exactly what landed.

**The legacy tail.** Branch A's "ready to query" path and Branch B's "add them by hand" both drop out of Form 11 and back into the step-0 card style for **step 5**. This screen carries three of the funnel's structural faults at once. Its eyebrow says "Step 2 of 2" while its dot row lights the fourth of five. Choosing "Bring my existing list" reveals a dashed box with **two dead buttons** — "Download template" downloads nothing and "Upload my spreadsheet" opens no picker; both call `onSkip`, which ends onboarding and drops the user on the dashboard with no explanation. Choosing "Add an agent now" reveals four fields of which **two are silently discarded** — email and genres are typed, held, and never passed to `addAgent`, which writes `email: ""` and `genres: []`. And the agent that is created is stamped with six invented facts: 3 stars, 12 weeks, open, email, `["Query Letter"]`, `noResponseMeansNo: false` — the exact opposite of the absence-is-a-first-class-state law the agent list is built on. Back from this screen returns to the welcome card, not to the branch that led here.

**Step 6.** "You're all set, let's do this." and, unconditionally, *"Your manuscript is ready and your agents are on file."* — twelve lines above a summary block that may read *"Agents added — Not added"*. There is no Back and no Skip. The button ends onboarding.

**The dashboard.** The first useful signed-in screen is the one-screen dashboard, and it is the only screen in the funnel wearing the current app shell grammar: `--ws-ground: #f7f4ee`, a white content window, Playfair 700 at 46px, cards on `#fffdf9` with an `::after` rim. It has real first-run modelling (`runStage` distinguishes day-one from early-days from settled, at both account and manuscript scope), real empty states, a skeleton cover that outlives the loading flag, and a six-step spotlight tour that auto-runs once and is replayable for the account's first seven days. The tour is **suppressed entirely below 1024px**, with no substitute, so a phone-first arrival never gets an orientation pass.

**Two side doors off onboarding.** Branch B's escape hatch — "Map your own columns in the Import desk →" — ends onboarding and lands the user on `/import`. That page is the oldest surface in the funnel: legacy hexes mixed with raw Tailwind `stone`/`red`/`amber`/`green` utilities under a modern `PageHeader`, sub-tabs labelled "A. CSV Import Wizard" and "B. Live Database Grid Viewer", copy about "Zite export data CSV sheets" and "Deduplicate & Sanitize Repository Rows", and — ungated by plan, admin or DEV — a red panel titled **"Wipe All Data & Recreate Sample Data"** whose one-click-confirm button deletes every document in nine subcollections and replaces them with demo seed data. It also contains a CSV importer that will write `plan: Pro` to the user's own profile from a spreadsheet column. The second side door is `onUpgrade` from the spent-entitlement state, which lands on `/plans` — an honest, well-built, Form 11 page that correctly sells nothing because no payment path exists.

## Screen census

| Screen | Visual language | Structural faults | Mobile |
|---|---|---|---|
| Holding page | (e) own — Inter, own `:root` | 1 (dead Join button, hardcoded counter) | not verified |
| Marketing chrome | (e) `mk-` | 0 | yes (720px) |
| Landing `/` | (e) `mk-` | 2 (5 links → signup; inert Privacy/Terms) | yes (1080 / 560px) |
| Pricing `/pricing` | (a) legacy hexes | 2 (null render logged out; free self-upgrade) | partial |
| Auth — signup / sign in | (b) Form 11, page-scoped sheet | 1 (Terms/Privacy → non-existent pages) | yes (920 / 560px) |
| Auth — reset | (b) | 0 | yes (inherited) |
| Boot splash | (a) bare hexes | 0 | n/a |
| Onboarding step 0 | (a) `C`-token ModalCard | 0 | none |
| "Understood" beat | (e) cream one-off | 0 | none |
| Branch A2 readiness | (b) Form 11 | 1 (5 dots, index never advances) | none |
| Branch A3a / A3b | (b) Form 11 | 0 | none |
| Branch B2 book | (b) Form 11 | 0 | none |
| Branch B3 pipeline | (b) Form 11 | 0 | none |
| Branch B confirm | (b) Form 11 | 1 (filename never rendered) | none |
| Branch B blocked | (b) Form 11 | 0 | none |
| Scatter loader | (e) bespoke loader | 1 (fixed ±332px scatter, no breakpoint) | none |
| Import overview | (e) review window | 1 (fix/sharpen claim not gated on its count) | none |
| Review — duplicates | (e) review window | 0 | partial (880 / 1000px) |
| Review — agents | (e) review window | 1 (FAQ contradicts panel + code) | partial |
| Review — queries | (e) review window | 0 | partial |
| Importing loader + outcome | (e) loader → (b) Form 11 | 0 | none |
| Mapping fallback | (b) Form 11 | 1 (also the silent catch-all render) | none |
| `ImportTidyAnimation` | — | 1 (unreachable: `"tidying"` never set) | n/a |
| Onboarding step 5 agents | (a) `C`-token ModalCard | 4 (2 dead buttons; 2 discarded fields; hardcoded defaults; two disagreeing progress claims) | none |
| Onboarding step 6 complete | (a) `C`-token ModalCard | 1 (asserts outcomes the summary denies) | none |
| Dashboard `/dashboard` | (d) app shell | 0 | yes |
| First-run tour | (d) | 1 (absent below 1024px, no substitute) | none by design |
| `/import` (onboarding exit) | (a) legacy + raw Tailwind, (d) header | 2 (ungated wipe; CSV-settable `plan`) | partial |
| `/plans` (onboarding exit) | (b) Form 11 | 0 | inherited |
| Terms / Privacy | — | absent | n/a |
