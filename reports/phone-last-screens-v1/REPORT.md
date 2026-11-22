# The last screens on phones v1 — report

Branch `phone-last-screens-v1`, worktree `/Users/nickphysick/ScriptAlly-pls`. Built overnight on 30 Oct as Stage 4 of the conductor run.
- **Brief:** `prompts/4-cc-prompt-phone-last-screens-v1.md`.
- **Ref:** `design-refs/phone-last-screens-v1/` (MANIFEST `4a819d11…cf6e2`, 13/13 OK).
- **Picks:** Nick's picks were loaded (1B–10B, 11A, 12A).

## False premises

1. **Smart email drop is already mounted and reachable for Pro.** `PasteEmailFlow` sits in App.tsx for Pro accounts and opens from QueryPicker's "Paste the email instead". `PasteEmailButton` is the part mounted nowhere. No new door was added: the phone flow renders inside the existing one, behind a switch that is off (see Open items).
2. **The edit drawer never opens on a phone.** On a phone, Edit edited inside the card (`QcQueryCard149`, `onSaveEdits`). 9B now opens the new page, and every save on it is the drawer's own `commitQueryEdits`.
3. **The reply window is not stored as weeks.** The drawer writes the writer's expected date (`writerExpectedDate`, a date at noon). The wheel's weeks and days are therefore stored exactly (sent date + n days) and nothing is rounded. The open question about days in the reply window answers itself (L7 measured 11 weeks 3 days → 27 Oct, stored exactly).
4. **Materials are plain text.** `ManuscriptVersion.contentDraft` is a string, printed as text everywhere. A bold, italic, list or quote control would produce characters the rest of the app shows literally, so the editor's bar shows the word count only.
5. **There is no monthly email allowance.** The mock's "Pro. 30 emails a month." has nothing behind it in the entitlement model, so the line reads "Included with Pro."
6. **The phone's material rows are in `ManuscriptPhone.tsx`.** That is a `Manuscript*` file, owned by another session, so the rows' own Edit, New package and Make a copy buttons are a STOP (exact change below). The editor and the flow open from deep links instead.
7. **Its Packages and Versions headings carry no id.** `PhoneSectionLanding` finds them by the lists they head, without editing the page.
8. **5B was already true on this base.** `/todo/calendar` redirects to `/todo`, and the phone To-do page shows the week band. L4 asserts it.
9. **The feedback panel cannot open from the error page.** It lives in the shell, and the shell is gone when the boundary shows. "Tell us what happened" therefore links to `/contact`.

## Base and shared parts

- **Base:** cut from `88be898e`, the tip of `setup-import-phone-v1` (Stage 3), as the conductor directed. That base holds phone app v2 through Part 8.
- **Reused:**
  - `useIsMobile`, `MobileSheet`, `showUndoBar` and the `.pa-snack` snackbar, `PhoneDisc`, `takeSnapshot`/`restoreSnapshot`, `openQueryDrawer` for Close, and the existing `deleteQueryWithUndo`;
  - Stage 3's `StepFoot`/`PhonePin`, which pin the dead ends' actions;
  - the package model `usePackagesModel` (`saveMaterial`, `newVersionDraft`, `savePackage`, `dupDraft`, `matSplit`);
  - the drawer's `commitQueryEdits` and its option lists, which are now exported rather than copied.
- **Built locally; lift candidates:**
  - the full-screen phone page layout three times over (`.edp`, `.eqp`, `.pmx`): band, sheet and pinned foot;
  - the weeks and days `Wheel` with its chips (it should replace the presets in the phone log-a-query flow's reply question; that was not done here);
  - `PhoneSectionLanding`.

## Gates

| Gate | Baseline (`88be898e`) | Final |
|---|---|---|
| tsc root | 0 | 0 |
| tsc functions | 0 | 0 |
| `npm run build:dev` grepped for `error\|[WARNING]` | no lines | no lines |
| Vitest | `Test Files  697 passed (697)` · `Tests  10774 passed \| 3 skipped (10777)` | `Test Files  697 passed (697)` · `Tests  10774 passed \| 3 skipped (10777)` |

## Commits

| Commit | Phase | Files |
|---|---|---|
| `711c1207` | A: account screens, dead ends, the error page | onboarding.css, DeadEnd.tsx, ErrorBoundary.tsx, errorBoundary.css (new), App.tsx (`ThrowLab`, dev only) |
| `69abc04c` | B: addresses and column matching | App.tsx, phone/PhoneSectionLanding.tsx (new), phone/pages/ImportDoorsPhone.tsx, pagesPhone.css, the PLS1 file |
| `af75ae97` | C: email drop on a phone | emailImport/EmailDropPhone.tsx, emailDropPhone.css, EmailDropLab.tsx (new), PasteEmailFlow.tsx, App.tsx |
| `e934f845` | D: editing a query | queries/phone/EditQueryPhone.tsx and editQueryPhone.css (new), Queries.tsx (the phone Edit), EditQueryDrawer.tsx (three option lists exported), PasteEmailFlow.tsx and emailDropPhone.css (portal above the sheets) |
| `1b18746b` | E: writing materials and building packages | phone/materials/* (new), App.tsx |
| (F) | F: locks, shots and the report | the PLS1 file, this report, the shots, CLAUDE.md |

## Locks — PLS1 (`tests/e2e/phoneLastScreens.measure.ts`)

These run at 390 × 844 and 360 × 780; L1 also runs at 320. L1–L3, L6 and L10 run on the lab; L4, L5 and L7–L9 run signed in.

**Final run:** `11 passed (4.5m)` (and the shots case skipped). L11 compared 18 desktop screens (9 × 1440 and 1280) against the base: DOM and pixels identical. L10 judged 6 navy and blush grounds and found none bad.

| Lock | Holds | Red-before | Red reading |
|---|---|---|---|
| L1 | account screens: one tab, no "Your account" label, no small capitals, nothing clipped, no sideways scroll, at 390, 360 and 320 (4 screens each) | sibling tab shown | `signin @390: one tab` |
| L2 | the 4 dead ends carry the band ("Step n of N") and actions pinned at the viewport's foot; each action fires ITS OWN handler, once | two actions' labels swapped | `used-free back: its own handler, once` |
| L3 | the forced error (`#/throw-lab`) shows the full-screen ink page with the Special Elite title, Reload, Go to Home (lands on /dashboard and resets the boundary) and the /contact link; the column is at most 420 at 1440 | the old cream fallback | `@390: shell ink` |
| L4 | /queries/packages, /manuscripts/comps, /manuscripts/versions and /todo/calendar land on their section or tab near the top, and back returns to the opener; the desktop route is unchanged | no redirect | `/queries/packages @390` |
| L5 | the matcher tile opens the sheet; Upload my sheet reaches the template upload (a file chooser); the matcher stays shut on a phone; the desktop tile opens the matcher | the phone tile replaced | timeout on the missing tile |
| L6 | email drop (lab): the 280px paste area, Read waits for text, 2 proposals ticked by default, untick one → "Save 1 update" → only the ticked proposal is handed to the save | save all | deep equality on what was saved |
| L7 | every section opens its step; a wheel change updates the band's date before saving; the stored `writerExpectedDate` is the drawer's value for that input (days kept); Undo puts the query back (WRITES and undoes) | the band's date frozen | `the band's date updates before saving` |
| L8 | a sent letter's edit creates exactly one new version and leaves the sent one byte-identical; an unsent one saves in place (WRITES, deletes its probes) | natural: the build before this pack | timeout: no editor |
| L9 | a phone-built package has exactly the model's fields for those picks; a locked package's copy is a new unsent package; the original is byte-identical (WRITES, deletes its probes, restores the active package) | extras skipped | `the built package's otherMaterials` |
| L10 | white on navy, ink on blush, no green or red, no image twice, over the account, dead-end, error, email-drop and matcher screens (32 grounds judged) | green eyebrow and chip | the green text listed |
| L11 | DOM and pixels identical to the base at 1440 and 1280 on 9 lab screens (the error page exempt by name) | phone rule leaking to the desktop | `screens that changed at a desktop width` |

**L10 found a real fault, now fixed:** below 768px the set-up frame's navy buttons carried the desktop's cream text (244, 238, 229) on the account screens and dead ends. `.sf .sf-btn:not(.sf-btn--line)` is white on phones. The email drop's with-you band is ink, not the mock's brown.
**L7 found one too:** the first edit page rendered inside #root under the query sheet's scrim and could not be tapped. It now portals above the sheets.
**L6's account half could not run:** the flow is Pro only and the harness account is free (the rules refuse a client plan change). The lab drives the same screens.

## The pairs

`reports/phone-last-screens-v1/pairs/` puts the board's mock-up on the left and the app on the right. The account screens and dead ends compare against the board's own "after" pictures (`today/*-after.png`). Every screen at 390 is in `after/`.

## Drawer field → section map

| Drawer field | Section |
|---|---|
| Agent reassign (`agentId`) | Agent |
| Manuscript (`manuscriptId`), Package (`packageId`, stamped when unlocked), Materials pills (`materialsWanted` via `editMaterialsUpdate`), Personalisation (`personalisationNotes`) | What you sent |
| Date sent (`dateSentMs`), Send method (`sendMethod`) | How and when |
| Response deadline (`writerExpectedDate`), If no response (`ifNoResponse` = the "No reply means no" switch) | Reply window |
| Timeline appends, edits, deletes (checked by `validateTimeline`), Rejection type (rejected and withdrawn only, as in the drawer), Agent comments | Their responses |
| Journal (`addJournalEntry`) | Notes |

No field is dropped. The switch maps on to "Mark as no response automatically". Off returns it to "Remind me to nudge", and a stored "Do nothing" is kept.

## What the materials store supports

- **Formatting:** none. Text is plain (`contentDraft`), so only the word count is drawn.
- **Versions:** `saveMaterial` edits an unsent letter or synopsis in place. A sent one (`isVersionSent`) is never rewritten: Save creates the next version under `newVersionDraft`'s name. L8 measured the sent letter byte-identical afterwards.
- **Packages:** a sent package stays locked (v40). "Make a copy" goes through `dupDraft` and creates a new package.

## STOP — the phone material rows' buttons (`ManuscriptPhone.tsx`, not edited)

What would change in that file:
1. In the read sheet of a letter or synopsis, an **Edit** button linking to `/manuscripts?edit=<v.id>`.
2. Under the Packages heading, a **New package** button linking to `/manuscripts?newpackage=1`.
3. In a locked package's read sheet, **Make a copy**, linking to `/manuscripts?copy=<p.id>`, with the locked line "Once a package goes out with a query it locks. To change it, make a copy."

## Re-run of the related suites

Ran on this build: onbV5, onbV5ImportPage (IP1), setupImportPhone (SIP1), phoneAppV2Queries and phoneAppV2Pages.
- **Result:** `47 passed`, `5 failed`, `2 skipped` before the re-points. Both phone app v2 suites passed in full.
- **Re-pointed, each with its reason at the line:**
  - onbV5 A1: below 768px it switches mode through the in-card link.
  - onbV5 E1: actions and Back are found in the pinned foot too.
  - IP1 P1 at 390: the six dead-end screens are exempt by name, because their foot moved by design.
- **After the re-points:** A1, E1 and L1 pass.
- **Already red on the Stage 3 base, and unchanged:**
  - IP1 P1 at 1440 (box x 60 → 352, the shell's left edge);
  - IP1 P1 at 390, on the reading screen, the loader and the dashboard ghost (Stage 3's and an earlier pack's changes against an older capture);
  - IP1 D1.
- **The base-build comparison was cut short.** The bundle guard reads this worktree's `dist/`, so it refused the base run once `src/` was edited. The base reds come from Stage 3's own run.
- **A real gap found while re-pointing A1:** the brief says the account card's link to the other mode "and its reverse already exists". The sign-up card had no link to sign in. Below 768px it now carries "Already have an account? Sign in" (desktop unchanged; L1 requires it).

## Dev

FILL

## Open items for Nick

1. **Whether the email drop door goes live.** The phone flow is built and behind `emailDropPhoneLive()`, which is off: production never reads it, and on a dev build it is switched on per device (localStorage `sa.lab.emailDropPhone` = "1"). Until you decide, a phone shows today's overlay.
2. **Days in the reply window.** Answered by the model: the stored value is a date, so days are kept exactly. Nothing is pending unless you want the agent's usual reply time (weeks only, `responseTimeWeeks`) to take days too.
3. **The illustration spots.** The error page and the matcher sheet show a dashed placeholder spot; no drawing was invented.
4. **Desktop parity.** None of this reaches the desktop except the error page, which is the same design centred at 420 (the one stated desktop change). The new phone screens have no desktop counterpart.
5. **The `ManuscriptPhone.tsx` buttons** listed above, for whichever session owns that file.
6. **The log-a-query flow's reply question** should take the same wheel; not done here (lift note above).

## CLAUDE.md section

Added as "The last screens on phones v1" in the branch's CLAUDE.md.

## Worktree

FILL
