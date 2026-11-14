# Two-door import v1 — Phase 0 recon

Worktree `ScriptAlly-tdi`, branch `two-door-import`, cut from `origin/dev/srm1-plv3-qc156` @ d5f5a8015 —
the line dev serves (`index-P-Ljb31B.js`, Query Centre v156 + plans v3 + shell rail menu). `main` is NOT an
ancestor of this line (11 commits on main are not here), so the dev line still carries the pre-diet
CLAUDE.md (955 KB) and has no `docs/decisions/`; `onboarding-import.md` was read from `main`.

No STOP condition is met.

## 1. The fork
- `src/lib/captureFork.ts:19` `CaptureOption = "smart" | "template" | "byhand"`; `:22` `CAPTURE_OPTIONS`.
- `src/components/onboarding/CaptureFork.tsx:33-52` props: `onChooseFile, onDropFile, onUsePhotos,
  onDropPhotos, onUploadTemplate, onAddByHand, onBack, onNothingYet, onOpenImportDesk, onDownloadTemplate`.
  **Two props the prompt's list omits: `onBack` and `onOpenImportDesk`** (the matcher footnote's link).
  The three tiles are written out by hand at `:94-104`; `CAPTURE_OPTIONS` is read only by the test.
- Callers: `BranchB.tsx:164`, `OnbLab.tsx:143` and `:233`, `captureFork.test.tsx:32`. `ImportPage.tsx:36`
  imports `CAPTURE_PHOTOS_ACTION` only. Not restructured since 7fd445a (main) — and the dev line's copy
  is the same shape.

## 2. "Nothing yet" and "by hand"
- `onNothingYet` → `BranchB.tsx:172` `onSkip` → `Onboarding.tsx:333` `handleSkip`: creates the held
  manuscript once if one was entered (`ensureBranchBManuscript`), then `finishOnboarding` (`:323`) —
  `persistProfile({ onboardingComplete: true })`, a `signed_up` event, `onComplete()`. No post-onboarding
  tab is set, so it **lands on the dashboard**. One set-up write (the profile flag) plus the manuscript.
- `onAddByHand` → `Onboarding.tsx:419`: the manuscript, then `finishOnboarding` — also the dashboard.

## 3. The template route
- `BranchB.tsx:169` `flowRef.current?.chooseTemplate()` → `ImportFlow.tsx:520` clicks the template
  `<input data-picker="template">` (`:557-564`) → `pickTemplateFile` (`:359`) → `readTemplateFile`
  (`lib/templateImport.ts:298`) → `readTemplateBuffer` (`:303`, first sheet, `readSheetBook`) →
  `parseTemplateRows` (`:117`).
- Recognition: `parseTemplateRows` maps every heading through `TEMPLATE_HEADER_LOOKUP.get(normaliseHeader(h))`
  (`templateImport.ts:131`; both in `lib/templateColumns.ts:111-119`) and ignores anything else. **There is no
  "is this a template?" test today** — the parser reads whatever columns match. Phase 2's route function
  builds on that same lookup (every one of `TEMPLATE_HEADERS` present, nothing outside it).
- Client-side, no callable. Not a STOP.

## 4. The Smart Import route
- `pickFile` (`ImportFlow.tsx:331`): the client entitlement check is the FIRST thing (`:332`,
  `entitlement.allowed` → `blocked`), then `setScreen("confirm")` (`:344`) → `ConfirmScreen` (`:587-603`).
- The charge is server-side, inside `runSmartImport` (`:384`), which only `runMapping` calls, from the
  confirm's "Read" (`:598`). The headings check therefore goes at the top of `pickFile`, before `:332`.
- `ImportPage.tsx:204` disables "Import a spreadsheet" when `!entitlement.allowed`. Once that button is
  the only way to upload a headings file, a spent account could not reach the template route — see Phase 5.

## 5. Questions the review asks today
Agents (`lib/reviewGate.ts:22` `AgentAsk`, `agentAsk` `:28`): `nameless` (no name, no agency), `reading`
(photos), `illegible` (photos), `no-agency` (`:34`, name and no agency, until `agencyWaived`), `mapping`.
Agents are not in a `QuestionFamily`; duplicates are their own step (`parseModel`'s clusters).
Queries (`openQueryQuestions` `:47`, first open `ReviewReasonCode` per query; families `:52-61`):
| Code | Family |
|---|---|
| ambiguous-date, ambiguous-response-date, serial-outlier, two-dates | confirm |
| no-date, unreadable-date, unreadable-response-date, missing-day | missing |
| status-direction, status-wording | status |
| crossed-out | crossed |
| mark-unclear | mark |
| check-name, needs-identifying (stripped by parseModel), check-reading, illegible-agency (moved onto the agent) | other / n/a |

## 6. The four new questions, as built today
- **Dates out of order.** `validateSmartImport` (`lib/smartImport.ts:160-169`) pushes a `dateWarnings`
  line "… — kept as given." Nothing renders it (only `smartImport.test.ts:58` reads it). Separately the
  timeline strip already refuses one kind of disorder: `stripNeed` → `"order"` when an event is dated
  before the sent date (`lib/importTimeline.ts:110-119`), button "Fix the dates first" — but only on a
  query that already gets the strip card for another reason. No reason code raises it.
- **Month-first date** (`9/22/2026`): template `parseTemplateDate` (`templateImport.ts:86`) — second number
  > 12 → `null` → `unreadable-date`, raw kept in `sentDateRaw`. The card asks "When was this sent?" with a
  blank date field. Smart Import dates are parsed by the function (out of scope).
- **Same agent twice in one file.** Already asked: `parseModel` clusters agents WITHIN the file
  (`smartImportReviewModel.ts:442-498`, `nameCompatible` / `agencyKey`, not `sameAgent`) and the review's
  duplicates step ("Possible repeats") asks remove-one / keep-both, with query reconciling. `splitDuplicates`
  (`sameAgent`) is the separate rows-already-in-the-account check. → Phase 4 card 3 is NOT built.
- **A dated event after a request, no outcome named.** Template: the "Date of last response" rides as an
  event of the row's own status (`templateImport.ts:241-258`); with a blank status it is dropped in
  silence. So "Partial Sent" + a response date becomes a dated "Partial Sent" step, and the response it
  records is never named. Nothing asks.

## 7. A date with no year
- Template: `22/9` fails both regexes → `unreadable-date`, raw kept in `sentDateRaw`
  (`templateImport.ts:224-229`); the response cell's raw is kept on its event (`raw`).
- Smart Import: the function year-anchors note dates (`TimelineEvent` comment, `types/smartImport.ts`);
  a sent date it cannot place comes as `missing-day` / `no-date` with `sentDateRaw`.
- The review model holds the raw text (`ReviewQuery.sentDateRaw`) → the no-year rule can be built.

## 8. The read screen
- `ImportOverview.tsx` is the summary on both routes (`ImportFlow.tsx:686-697`, reached from the reading
  loader's `onProceed` and from `pickTemplateFile`). It reads `summaryLead`, `readLine`, `agentsAnswerLine`,
  `queriesAnswerLine` (`reviewGate.ts:162, 171, 74, 86`) and `SUMMARY_TITLE` / `SUMMARY_PRIMARY` /
  `TIER_*` / `stepCaption` from `lib/importSummary.ts`.

## 9. `/import`
- `ImportPage.tsx:195-230` desktop: Smart import (`data-act="smart"` + `photos`), Our template
  (`download` + `upload` → `chooseTemplate`), Match your own columns (`match`). Phone:
  `ImportDoorsPhone` (`:190`) with `onUpload={chooseTemplate}`.

## 10. Other places offering a template (not changed)
- `src/components/agents/contact/ContactWays.tsx:14,34` — `/QueryHawk-pipeline-import-template.xlsx`.
- `src/components/agents/contact/ContactEmptyPage.tsx:119` — "Use our template".
- `src/components/queries/QueryEmptyCard.tsx:44` — `TEMPLATE_HREF`, the same three-tab workbook.
- `src/components/analytics/A21Empty.tsx:22` — `AN_TEMPLATE_HREF`, the same workbook.
- `src/components/import/ImportFlow.tsx:744` — the Unreadable dead end downloads `TEMPLATE_FILENAME`.
