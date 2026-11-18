# Submission packages v62 — report

Branch `submission-packages-v62`, cut from `query-card-v158` (aafbe6163, what dev served: `index-AOAzoFjK.js`).
Not merged to main; prod untouched. Mock pack: `~/Downloads/submission-packages-v62-pack.zip`, all 15 SHA-256 sums OK.

## 1. Section 4 answers (given before any page code)

1. **Where it lives.** `/queries/packages` (`/manuscripts/packages` redirects with its query string), `src/components/SubmissionPackages.tsx`, data from `usePk26Model`. Shared parts: `WorkspacePageGrid`, `shell/OpenHeader` (navy header), `shell/SlimBar`, `useOverlay`, the escape stack, the toast. Below 768px the app shows a different page, `packages/phone/PackagesPhone` (see §3).
2. **A package stores** name, manuscript, user, `createdDate`, `status` (Active/Retired), `retiredAt`; the pieces `queryLetterVersionId`, `synopsisVersionId`, `bookVersionId` (and the legacy `samplePagesVersionId`); `note`, `noteEditedAt`, `firstSentAt`, `copiedFromId`, `edition`/`editions[]`, `otherMaterials` + `extraIds`, `icon`, `colour`.
3. **Copied from:** yes — `copiedFromId`, set on create only (the rules keep it out of updates).
4. **Queries:** each records `{how: "package", packageId, edition}` (`sentRecordOf`); `creditedTo` lists them; Analytics rows give agent, agency, sent date, status.
5. **Status history:** yes — Analytics rows' `reachedRequest`/`reachedOffer`/`stageMs`, from the activity log.
6. **First sent:** yes — `firstSentAt`, and the earliest credited query's send date (used first).
7. **Extras:** the writer's own named extras on the manuscript (`PackageExtra`). "Author bio" / "Pitch sheet" are sample names. Files on extras are not live.
8. **Synopsis:** `ManuscriptVersion` documents of type SYNOPSIS; a writer can have many.
9. **Founding band:** `Pk41Banner`, shown when the plan came from the founding offer and `todoPrefs.packages.foundingNoteHidden` is not set — a per-user flag on the user document already existed. Non-founding writers saw no band and no Pro tag.
10. **How it works** opened `Pk42HowItWorks` (an animated four-station pop-up).
11. **Agent preview:** yes, the builder's (v39.3, `lib/packagesV393`): a Contact-list agent not yet queried for the book "(example)", the subject, "Dear {first name},", the opening of the letter's stored text. Kept as it was.

## 2. The status mapping for §6.2 (`lib/packagesV62.ts`)

- **Sent** — every query logged with the package, all editions, withdrawn included.
- **Replied** — the query has ever reached Partial Requested, Partial Sent, Full Requested, Full Sent, Revise & Resubmit, Resubmitted, Offer or Signed (now or in its history), or it is Rejected / has a Rejected rung. Not: Queried, No Response, Withdrawn with nothing before.
- **Asked to read more** — the same request set (R&R and Resubmitted included, as Analytics puts them at the full stage).
- **Rule 3:** "later rejected" = asked and now Rejected; "a request still open" = now Partial Requested, Partial Sent, Full Requested, Full Sent, Revise & Resubmit or Resubmitted.
- Thresholds in one place: `VERDICT_MIN_REPLIES = 4`, `WORKING_SHARE = 0.5`.

## 3. Not built as drawn, and what was done instead

- **The 420px phone screen (13).** Below 768px the app routes this address to `PackagesPhone`, a separate phone page, not this one. It is not changed here (its own design line). The desktop page is measured down to 768 (P8) and its CSS also stacks at 900 as drawn. **Open for Nick:** whether the phone page should follow v62.
- **Retire** has no control in the mock. It is in the Edit drawer: "Retire this package", on a sent package that is not in use (the page's only way to retire; there is still no un-retire, as before).
- **Choosing a piece also offers creating one** ("+ Write or paste a new query letter", "+ Save a new version", "+ Write or paste a new synopsis") and, for letters and synopses, "Put away ({n})" → Open → the material drawer's "Bring it back". The mock's lists have neither; without them a writer could not add a synopsis or bring back a put-away one anywhere in the app.
- **Other extras: "+ Add one".** The extras feature that exists today lets a writer name a new extra; the mock shows only existing chips. Kept (one chip that becomes a text field).
- **The "Log a query with it" button** (old builder) is not on the v62 page; Log a query is reached from its usual doors. laqV12's V12-2 is skipped.
- **The icon picker** shows all twelve icons the app has (the mock draws six).
- **Header right block** shows only when a finished package goes out with new queries. On the harness's three manuscripts none does (seed-ms-1's stored active package id names a package that no longer exists; the others store none), so the Change picker is held by unit code only, not by a screen.
- **A brand new package is never made the one for new queries** (only finished ones can be, §6.1). When the piece that finishes a package lands and the manuscript has none going out, that package becomes it — the old page made the first package active at once.
- **How it works** is v62's storyboard (`Pk62How`); `Pk42HowItWorks` is kept and unmounted, as asked (it lives at `src/components/packages/v42/Pk42HowItWorks.tsx`). Its "Show the founding writer note" link is gone: "Got it" now hides the note for good.

## 4. Copy changed to stay true (old → new)

- Sent package, empty required row: "Not chosen yet" → **"Not recorded"** (it can no longer be chosen; "Not recorded" is the app's word for a package that went out with no version).
- Sent with it, sent package with no version: "No sample yet" → **"No sample recorded"**.
- Who got it uses the app's status words (`statusWords`: "Partial requested", "Passed", "Queried", …), not the mock's sentences.

## 5. Deleted (replaced in this change)

Pk26Builder, Pk393Builder, Pk39Labels, Pk38Drawer, Pk26Dialog, Pk41Results, Pk42Empty, PkTile, Pk43Header/List/GoingOut/Slim/DayOne, pk392.css, pk393.css, and the e2e files that measured them — listed in `tests/e2e/RETIRED-submission-packages-v62.md`.

## 6. Measured (emulator, `npm run e2e:emu -- tests/e2e/pk62.measure.ts`): 12/12 passed

P1 everyday (one aria-current row, What came back with one StatusDot per query, no "%", no green painted) · P2 retired via the table and Enter (read-only, retired lock line) · P3 an unsent package (no What came back, its foot, dashes) · P4 day one · P5 How it works (focus on Got it, Tab trapped, Escape returns focus) · P6 New package drawer (focus on Name, Escape returns focus) · P7 a piece list as a radio group · P8 no sideways scroll at 1280, 900, 800, 768. Readings: `readings.json`; screens: `shots/`.
Not measured on screen: the first-visit note and Pro tag (the harness account is not on the founding basis in the emulator; held by the unit smoke), the Change picker (see §3).

## 7. Branch and dev

- Branch: `submission-packages-v62` (a2e5e4ab3), pushed. Not merged to main.
- Dev was serving `index-BcOc9gsY.js` from `query-card-v158-1` when this deployed, so v62 was merged onto it as
  `dev/qc1581-pk62` (987e479ec, pushed) and that was deployed: https://scriptally-dev.web.app serves
  **`index-D36ukT_K.js`** (checked after the deploy). Hosting only; no rules or functions.
- Full unit suite on the branch: 12,873 passed; 2 failing cases in `src/test/firestoreTarget.test.ts` name 23 e2e scripts
  this branch does not modify (e.g. `tests/e2e/cl251Agents.mjs`); not investigated here.
