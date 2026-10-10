# Onboarding v5, part 1 — report

Branch `onb-v5-setup`, own worktree, cut from `origin/landing-colours-v2` (it exists and is not in
`origin/main`, so one dev deploy carries both packs). One commit per phase, plus one follow-up
(§1.1). Not merged. Deployed to dev from the branch; prod untouched.

## 1. False premises

1. **Phase 2 has two commits, and the first is broken on its own.** `1603cf87` carries phase 2's
   message and only its two deletions: its `git add` named a directory the same change had just
   deleted, the add was refused, and `git add -u` staged the deletions alone. `3b3d8608` is the
   rest, unchanged. The tree is whole from there; nothing was amended.
2. **`dash58.css` is not on this base.** §0.5 says to follow its pattern; the file does not exist
   here. I followed the pattern as CLAUDE.md records it: a heading takes two classes and
   `!important`; body text needs only a class; a child span inherits.
3. **`defaultImport` has two values, not three.** `importDefaultForStage` returns `smart` or
   `byhand`. The ring has three because "Use the template" sets it to `template`. K1 rings each of
   the three.
4. **The mock's panel words are not the Words table's.** The mock draws "One hundred writers…" and
   three bullets; the table says `FOUNDING_GET_LEAD` and the four `FOUNDING_GETS`. The table won.
5. **The harness's "signed in" test was satisfied by the sign-in page.** It was "a `.ws-window` is
   attached", and the frame reuses that class on purpose. `ensureSignedIn` returned at once on the
   sign-in screen. Re-pointed to `#ws-sidebar` / `.ws-work` in `measure.ts`, `auth.setup.ts` and
   `manuscriptsV21.measure.ts`.
6. **`browser.newContext()` is not a cold session.** It inherits the project's saved state, so the
   first A4 signed in from it and stayed green with the submit renamed. A4 passes an explicitly
   empty state now and asserts the sign-in screen is up first.
7. **The app carries a beta strip above its shell; the frame starts at y 0.** F1 compares
   vertical positions from each shell's own top edge, not the viewport's.
8. **"Brought across" could never be reached.** `shouldHandOver` is true whenever a query was
   imported, so the done screen's non-handover card only ever showed the nothing-imported half.
   The unreachable half went with `OnboardingCard`'s callers.
9. **The unreadable-file screen downloads a different template from the fork.** It has always
   fetched `/QueryHawk-pipeline-import-template.xlsx`; the fork's button calls
   `downloadTemplate("QueryHawk-template.xlsx")`. Left as built (no behaviour change), for Nick.
10. **Port 4621 belonged to another session's preview.** My baseline run was pointed at it for one
    attempt and was stopped before any reading was taken; the baseline was re-run on its own port
    after checking the served bundle hash.

## 2. §0 recon

**0.1 Base.** `origin/landing-colours-v2` (`a09eb163`).

**0.2 Screens.**

| Screen | Component | Framed by, before | Converted in |
|---|---|---|---|
| Sign-up, sign-in, reset request, reset sent | `Auth` | its own split card under `OnboardingHeader` | P1 frame, P2 content |
| Invite gate on / off | `Auth` (flag) | same | P2 |
| Welcome | `WelcomeStageScreen` (`Onboarding.tsx`) | `OnboardingCard` in a fixed overlay | P1, P3 |
| Readiness; details (not yet querying / still writing) | `BranchA` | `OnboardingCard` | P3 |
| Book | `BranchB` `book` | `OnboardingCard` | P3 |
| Your list | `BranchB` `pipeline` → `CaptureFork` | `OnboardingCard` | P4 |
| Confirm (free, Pro) | `BranchB` `confirm` → `ConfirmScreen` | `OnboardingCard` | P4 |
| Blocked (free used, Pro month used) | `BranchB` `blocked` → `UsedFree`, `UsedProMonth` | `OnboardingCard` | P5 |
| Nothing imported | `BranchB` `done` → `NothingImported` | `OnboardingCard` | P5 |
| File couldn't be read | `BranchB` `fallback` → `Unreadable` | `OnboardingCard` | P5 |
| Step didn't load | `BranchB` (unhandled) → `Unloaded` | `OnboardingCard` | P5 |
| Reading loader, overview, review, importing, handover | part 2's | their own layers / `OnboardingCard` | not converted |

**0.3 Shell parts.** None can be mounted as it is outside `WorkspaceShell` except `FolderTab`,
which is a standalone component and is mounted as it is. The brand row, the sidebar, the bar, the
sheet and the foot are markup inside `WorkspaceShell`, so `SetupFrame` reuses their **classes** in
the shell's own nesting. No shell file was edited. The manuscript card (`BarSwitcher`) is a
switcher with a menu; set-up draws a plain card in its dress instead.

**0.4 Tokens.** All thirteen are declared at `:root` (index.css, primitives.css, headerPanel.css,
framedCard.css) and the bundle is one stylesheet, so each resolves on these screens. T1 resolves
the 30 tokens `onboarding.css` reads on all 22 lab screens.

**0.5 Forced faces.** `brand.tsx` forces the brand serif on bare h1/h2/h3 with `!important` and
names `p, span, div, button` as the body sans. Every heading here is two classes plus
`!important`; the pick-list's value span inherits.

**0.6 Harness.** `auth.setup.ts`: `#au-email`, `#au-pw`, the "Sign in" submit, `/^Skip/`,
`/^Continue/` inside `.sa-onb-card`. `measure.ts`: `SHELL`. `manuscriptsV21.measure.ts`: `.ws-window`.
All re-pointed in the commit that changed what they read (§1.5; `.sa-onb-card` → `.sf-sheet` in P3).

**0.7 A place to measure.** `#/contact-lab` (gated on `MODE`, served by `build:dev`) was the only
build-served lab. `#/onb-lab` is added on the same gate.

**0.8 The drawing.** `/images/off-the-ground.png`, 1200 × 1200, 271 KB. Reused; no new art.

**0.9 What the fork promises.** No drop was handled before this pack: the zone handled a click only.
It handles a drop now. **Nothing enforces 5 MB**: I found no size check in `smartImport*.ts` or
`templateImport.ts`. The words still say "up to 5 MB". Not changed (it would be a behaviour change
outside the four named). For Nick.

**0.10 Locks.** See §4.

## 3. Deleted, phase by phase

- **P1:** `OnboardingHeader.tsx`, `OnboardingSpine.tsx`, the `.ob-head*` / `.ob-sp*` rules,
  `Onboarding`'s fixed overlay and its inline keyframe.
- **P2:** `auth/LoginDashboardPreview.tsx`, `auth/auth.css`, `QuillMark`, `BannerIcon`, the brand
  lockup, the feature column, the segmented control, the field icons, the reset tick ring, and the
  "Already have an account? Sign in" line under the sign-up card (the tab does that now).
- **P3:** the welcome's inline label and `CenterWrap`'s centring; the still-writing note on the
  details screen; `BrandInput` from the manuscript fields (a plain input in the same dress).
- **P4:** `capturePrimaryLabel`, `primaryLabel`, `tags` and the `fit` kind, `TEMPLATE_STEPS`,
  `TEMPLATE_TASTER_NOTE`, `HAND_NOTE`, the reveal markup, `Aside`.
- **P5:** `SelectRow`, `BookMotif`, `TemplateNote`, `EscapeHatch`, BranchB's three icons,
  `onUpgrade` and its `plans` hatch in `Onboarding.tsx`, the `stepLabel` / `stepIndex` props, and
  five tokens with no reader: `onbGround`, `onbOptionSelectedFill`, `onbOptionRest`,
  `onbOptionEdge`, `onbFaint`.

**Survives, with a reader:** `OnboardingCard`, `InboxMotif`, the three `FONT_*` constants and
twelve `onb*` tokens — all read only by `HandoverScreen` (part 2). `ScriptAllyLogo` has no reader
in the journey; it is still used by the app. `stepOfLabel`, `subStepLabel` and `subStepFor` in
`lib/onboardingSpine.ts` now have no component reader, only their unit tests; the lib was left
whole because the pack says its rules stand.

## 4. Retired or rewritten locks

| Lock | Now asserts |
|---|---|
| `captureFork.test.tsx` (rewritten) | Three tiles, no radio, one ring matching the suggestion; each tile's words; the fact line by tier; the drop's accepted types; BranchB's wiring; the confirm. |
| `onboardingCard.test.ts` › welcome renders the shared card | The welcome draws the shared step parts and no card of its own. |
| `onboardingCard.test.ts` › the ground matches the app's | The frame's ground is `--ink-shell` by token; `onbGround` is gone. |
| `onboardingCard.test.ts` › option rows select in sage (rewritten) | `SelectRow` is gone; an option row is a radio with a 2px navy ring, never `aria-pressed`. |
| `landingRoute.test.ts` › three onboarding exits | Set-up no longer writes the `plans` hatch; it still writes `agents` ×3, `import`, `queries`. |
| `onboardingHandover.test.ts` › by-hand does not render it | By-hand is handed the parent's handler directly. |
| `authPageSmoke.test.tsx` | Unedited; still green. |
| `mobileFloor.test.ts`, `onboardingSpine.test.ts`, `smartImportConfirm.test.ts`, `onboardingTail.test.ts` | Unedited; still green. `mobileFloor`'s card half now guards the handover's card only. |
| New | `accountScreens.test.tsx`, `accountInviteGate.test.tsx`, `setupScreens.test.tsx`, `deadEnds.test.tsx`. |

## 5. Locks: red, then green

All sixteen rendered locks were red on their named mutation (`mutation-proofs.txt`) and are green
at 1440 × 900, 1280 × 800 and 390 × 844 (`green-readings.txt`). W1 is the unit suites above.
A2 is a unit render with the flag mocked on (the field is drawn first, in its box) and a source
check that the handler still refuses a missing code; **no test presses submit with the gate on**,
because this repo has no DOM and the flag is a build constant.

| Lock | Mutation reading | Green reading |
|---|---|---|
| F1 | `sidebar width 260 vs the app's 248` | sidebar 248, mark 34 × 34 at 20,16, inset 8/8, radii 0/12/12/12, tab equal — all equal to `/dashboard` in the same run, at 1440 and 1280; 22 screens × 3 widths ink at the edges |
| F2 | `no old artwork` | no "ScriptAlly", one visible "QueryHawk" brand row |
| F3 | `flow A` (three rows) | 3 / 2 / 3 steps, one current, tab names it |
| F4 | `last control … 2604 vs 844` | no sidebar, brand above the tab, tab and exit on one row, last control reachable |
| A1 | preview restored | two tabs, one raised; switch keeps the email; panel `45,58,80` |
| A3 | `#au-pw` renamed | Special Elite 18 on a dashed rule at all three widths; error `162,69,42` on a solid rust rule |
| A4 | submit renamed → timeout | cold sign-in reaches the app; set-up opens on welcome in the frame; "Just getting started" shows two steps; Skip returns |
| S1 | title boxed in navy | 44 / 39.7 / 30px title first on the sheet, unboxed, no image, on seven screens |
| S2 | `aria-pressed` | radio groups of 4 and 3; 0 → 1 checked; 2px navy ring; Continue waits |
| S3 | genre a text input | labels, placeholders, 21 options equal the capture; two pick-lists |
| S4 | note always | absent → present → absent; absent on details |
| K1 | upload wired to the picker | 3 tiles, no radio, ring = suggestion ×3; 7 presses each to its own handler; a dropped `.csv` calls `pickFile` once with the first file; a `.pdf` is ignored |
| K2 | free line hard-coded | free and Pro fact lines; no "recommended" |
| K3 | read on arrival | file named twice; Change updates both; one read, on the press |
| E1 | "Upgrade to Pro" | five states × 3 widths: chip, tone, title, ≤ 480 wide, each press to its handler |
| T1 | `--onb-missing` | 30 tokens resolve on 22 screens; 19 primaries, all navy |

Red on the pre-pack build (`red-on-baseline.txt`): all sixteen. **That red is thin**: the pre-pack
build has no `#/onb-lab`, so fifteen of them fail waiting for a frame that is not there rather
than on a reading. The mutation column is the evidence that each lock can see its own fault.

Gates: tsc clean; both builds clean; Vitest 545 files, all passing (baseline 541 / 8,366).

## 6. Shots

`shots/<screen>-1440.png` and `-390.png` for every screen and state. Each beside its reference in
`design-refs/onboarding-v5/`: `signup`, `signin`, `reset` + `reset-sent` (the ref shows both on one
sheet), `welcome`, `ready` / `ready-drafting`, `book`, `fork` / `fork-byhand` / `fork-pro`,
`confirm` / `confirm-pro`, and `used-free`, `used-pro`, `unreadable`, `nothing`, `unloaded` (the
ref's `edges` shows four on one sheet). `details` and `details-still` have no reference.
`signup-invite-on-1440.png` and `signup-invite-off-1440.png` are the gate on and off.

## 7. For Nick

**Every changed string, as it reads on screen**

- Tab group: `Your account`. Tabs: `Create account`, `Sign in`.
- Sign-up card: `Create your account` / `Let's put QueryHawk to work on organising your pipeline.`
- Sign-up panel: `FOUNDING WRITERS` / `The hunt begins.` / `You get:` / `Early access to QueryHawk` ·
  `A direct line to the founder` · `The full experience free of charge for 6 months` ·
  `Half price for as long as you need it after that`.
- Sign-in and reset panel: `FOUNDING WRITERS` / `Welcome back.` / `Sign in to pick up your querying where you left off.`
- Sign-in card: `Sign in`. Password label on sign-up: `PASSWORD · at least 8 characters`.
- Welcome: `Let's set things up around your journey.` / `No wrong answer here. It just shapes what you see first.`
- Readiness: `Where are you with it?` / `No wrong answer. It points us the right way.` / `Your manuscript is…` /
  `Still being written` · `In revision, nearly there` · `Ready to query`.
- Note: **`Still writing?`** `QueryHawk comes into its own once you're ready to query. While you finish the book, you can get a head start researching agents who'd suit it.`
- Details: `A little about it.` / `Just the essentials. You can flesh it out any time.`; still writing: `No rush at all.` / `We'll keep it safe for when you're ready`.
- Book: `The book you're querying.` / `Just the essentials. Your agents and queries attach to this, and you can flesh it out any time.`
- Fork tiles: `Smart import.` · `Our template.` · `Add by hand.`; buttons `Import a spreadsheet` ·
  `Download the template` · `Upload my sheet` · `Add an agent`; facts `Uses your one Smart Import`
  (Pro: `Uses this month's Smart Import`) · `Always free` · `Always free · Ends set-up`.
- Under the tiles: `Keep a spreadsheet with unusual columns? You can match them up yourself on the Import page once you're in.`
- Confirm: `This uses your Smart Import.` / `Nothing is saved until you've checked what we read.` /
  `The file you chose` · `Change` / `We'll read <file> and show you everything before anything is saved. You confirm what lands.` /
  free note `This is your one Smart Import. The template never uses it, so keep it for a spreadsheet you'd rather not retype.` / `Read my file`.
- Dead ends: as the Words table, verbatim; Pro's month keeps `Next Smart Import next month`.
- Every primary has no arrow; every Back reads `‹ Back` (`‹ Back to sign in` on reset).

**Shown in the mock and not built**

- The sidebar foot's "Founding writer" label (baked decision 9): the foot reads the real plan line.
- The panel's "One hundred writers…" paragraph and three bullets (§1.4).
- "28 rows" on the confirm (baked decision 11).
- The mock's 42px tab and its own sidebar spacing: the app shell's won.
- "+ Add a sub-genre", "· optional", "· primary": the built label words are kept — `add additional sub-genre`, `(optional)`, `(primary)` — because S3 holds the text sets.
- "and" in the fork heading and the terms line: the built `&` is kept.

**Decisions and open items**

1. The fork title is the built `How shall we capture your existing agents & queries?`
2. On a phone the account tabs sit in a row that scrolls sideways; the second tab's name is cut by
   the row's edge, as drawn.
3. The unreadable-file card has three controls (Back, Add by hand, Download the template). The
   table lists two actions and Phase 5 adds Back; all three are there.
4. The flock draws 280 × 280: the file is square and the limit is 280 tall. The mock's looks wider.
5. Nothing enforces "up to 5 MB" (§0.9).
6. Two different template files are served (§1.9).
7. A4's "Skip for now" writes `onboardingComplete: true` to the harness account, which already
   holds it. No other measurement writes.
8. I did not open the import steps (reading, overview, review, importing, handover) in this pack.
   They render from `BranchB` inside the new frame's sheet in their old dress; how that looks is unchecked.
