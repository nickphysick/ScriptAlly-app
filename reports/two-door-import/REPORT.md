# Two-door import v1 — report

Branch `two-door-import` (pushed, NOT merged), cut from `dev/srm1-plv3-qc156` @ d5f5a8015, the line dev served at
the start (`index-P-Ljb31B.js`). Ref: `design-refs/two-door-import-v1/two-door-import-v1.html` (sha256 16230090…0e38,
checked). Screens 1–3 built; screen 4 and "Finish later" not.

**Dev:** https://scriptally-dev.web.app serves **`index-BQC9KmLH.js`** from **`dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi`**
(pushed) = the served line at deploy time (shell rail menu + plans v3 + Query Centre v156 + Contact list QC layout v1 +
this build's first deploy + Query Centre v156.1) + this build's last two commits. The served hash matched the build.
Prod untouched.

## False premises — what did not match the build, and what I did instead

1. **The dev line has no `docs/decisions/`** (it predates the 11 Nov CLAUDE.md diet; its CLAUDE.md is 955 KB). I read
   `onboarding-import.md` from `main`, and brought it across verbatim with this build's section on top. Merging into
   `main` will meet an add/add on that file: take this branch's copy (main's text + the new section).
2. **The fork's props were not the eight listed.** It also had `onBack` and `onOpenImportDesk`. `onOpenImportDesk` was
   the matcher footnote's link; it went with the footnote, and so did the one set-up exit that wrote the `import`
   hatch (`Onboarding.tsx`). `App.tsx`'s reader of that hatch is left; nothing writes it now.
3. **"On your list twice" already exists.** The review's duplicates step asks it for agents within one file
   (`parseModel` clusters by `nameCompatible`/`agencyKey`, not `sameAgent`, with remove-one / keep-both and query
   reconciling). Per the prompt I did not ask twice and built no new card.
4. **"Saved as Agency unknown" would be false.** An imported agent is never written `agencyUnknown`
   (`importedAgent.ts`, not to be touched), so the app shows "No agency" for it. The line reads "Saved as No agency".
5. **"Yes, 22 Sept 2026" is refused by a lock.** `dates.test.ts` holds the app to one short-month table with "Sep". The
   card reads "Yes, 22 Sep 2026".
6. **The review is three steps, not one deck.** Duplicates → Agents → Queries, each with its own primary. I kept the
   steps; the mock's review head ("{n} questions for you · Everything else is ready…") and primaries ("Answer {n}
   questions to import" / "Import {a} agents and {q} queries") are on the Queries step, where the new cards are.
   The read screen's bar counts all three steps' questions (open duplicate sets + agent questions + query questions).
7. **"Outcome missing" can only be raised by the template route.** Smart Import's output names every event's type,
   so nothing in it says "a date happened, outcome unknown". The template parser raises it when "Date of last
   response" sits on a step the writer took (Queried, Partial Sent, Full Sent) — and, new, on a blank status, whose
   response date used to be dropped in silence. A request status with a response date (the request's date) and a
   named outcome raise nothing.
8. **`/import`'s "Import a spreadsheet" had to stop being disabled on a spent Smart Import.** Once it is the only
   way in for a headings file, disabling it would lock spent accounts out of the free route. A spent account's other
   files reach the "already used" screen, as in set-up. "Use photos" stays gated.
9. **Plain `vite build` builds only the public landing bundle** (production mode loads PublicRoot). The baseline
   used it; every later gate also ran `vite build --mode development`, which builds the app (4,028 modules).
10. **Phases 3 and 4 are one commit** (5ed9cec33): they share `reviewGate.ts`, `importRules.ts` and the review, and
    this environment cannot stage part of a file.
11. **The baseline needed `functions/node_modules`.** Without it every `functions/` test file failed to load; the
    re-run with the primary's linked is the baseline (3 pre-existing failures).
12. **Dev moved twice during the build** (Contact list QC layout, then Query Centre v156.1 stacked on my branch).
    Each deploy was guarded on the served hash inside the deploy command; the second guard stopped a deploy, and I
    merged onto the newer line instead.

## Recon, in brief (full answers with file and line: RECON.md)
- Nothing yet → `handleSkip` → `finishOnboarding` → dashboard (one write). By hand → the same.
- Template route: `chooseTemplate` → template `<input>` → `pickTemplateFile` → `readTemplateFile` →
  `parseTemplateRows`, which maps headings by `TEMPLATE_HEADER_LOOKUP.get(normaliseHeader(h))`. Client-side.
- Smart Import: `pickFile` checked the entitlement first, then `ConfirmScreen`; the charge is server-side in
  `runSmartImport`, reached only from the confirm. The headings check now runs before all of it.
- Asked before this build: agents nameless / reading / illegible / no-agency / mapping; queries by code
  (confirm, missing, status, crossed, mark families).
- Dates out of order: a `dateWarnings` line nobody rendered ("kept as given"); now deleted. Month-first dates:
  `unreadable-date`, raw kept. No year: unreadable, raw kept on the client → the rule was built.

## What was built
- **Phase 1** — two doors (`lib/captureFork.ts`, `CaptureFork.tsx`): one filled navy button ("Upload a file"), "Use
  photos" beside it, the caption and the fact line on door one; "Take me to my dashboard" on door two (calls what
  `onNothingYet` called); the quiet headings line. By-hand tile, "nothing yet" link and matcher footnote gone.
- **Phase 2** — `lib/importReadRoute.ts`: every `TEMPLATE_HEADERS` column and nothing else → the template parser, with
  no confirm, entitlement or Smart Import call; otherwise Smart Import unchanged. `chooseTemplate` and its picker deleted.
- **Phase 3** — `lib/importRules.ts` on both routes after `parseModel`; "We've read your file" (`ImportOverview`).
- **Phase 4** — the deck's "Dates out of order", "Date to confirm" and "Outcome missing" cards; the strip's order
  check widened; the new primaries and head.
- **Phase 5** — `/import`: two tiles + the quiet line.
- **Phase 6** — locks, dev deploy, walk.

**Outcome labels (the mock's four → the app's statuses):** Passed → `Rejected` · No response → `No Response` ·
Offer → `Offer` · Withdrawn → `Withdrawn`. Labels are the strip's and the crossed-out card's existing ones.

**No-year rule:** built. A sent or response date written with no year ("22/9", "22 Sep") is read by `readTypedDate`
as the most recent past occurrence; its question goes and it is counted under "Dates with no year".

## Other places that offer a template (recon 10; not changed)
`ContactWays.tsx:14,34` and `ContactEmptyPage.tsx:119` (Contact list), `QueryEmptyCard.tsx:44` (Query Centre),
`A21Empty.tsx:22` (Analytics) — all the three-tab `QueryHawk-pipeline-import-template.xlsx`; `ImportFlow.tsx`'s
Unreadable card (`TEMPLATE_FILENAME`). Also left: the phone's `ImportDoorsPhone` still shows "Upload my sheet",
which now opens the one picker.

## Gates
| | Baseline (d5f5a8015) | Final (two-door-import) |
|---|---|---|
| tsc | 0 errors | 0 errors |
| build (landing) | clean | clean |
| build (app, `--mode development`) | — | clean |
| Vitest | 3 failed (emuGuard 1, firestoreTarget 2) | 3 failed, the same 3 (full run at b35ab88f3 found 5 more of this build's own — `dates.test`, `sheetReaders.snapshot` — fixed at 384e82dae and re-run green; see final-vitest.txt) |

## Locks
Red first: the unit locks' modules did not exist before Phases 2–3 (`importReadRoute`, `importRules`), so their suites
could not load. **No separate base build was run for the page locks:** there were already six worktrees besides the
primary, over CLAUDE.md's five. Each page lock's break restores the base's behaviour instead (three tiles, a template
picker, the Smart Import route, keep-as-given, the uncounted question).

| Lock | Green | Under its mutation | Readings |
|---|---|---|---|
| D1 two tiles, one filled navy button | ✓ | `threetiles` ✘ (3 tiles) | e2e-green.txt, e2e-D1-mutated-threetiles.txt |
| D2 no template-only picker (fork, /import) | ✓ (after hardening) | `tplpicker` ✘ | e2e-D2-*.txt — its first break run passed: the lock only counted pickers by `accept` and missed one named "template"; it now refuses any `data-picker="template"` |
| H1 headings → "headings"; messy / renamed → "smart" | ✓ | `alwayssmart` ✘ 2 | unit-H1-mutated-alwayssmart.txt |
| H2 no callable request, no ConfirmScreen | ✓ | `callsmart` ✘ (read screen never opens) | e2e-H2-mutated-callsmart.txt |
| R1 each rule: input → saved → count; 0 draws no line | ✓ | `nosettle` ✘ 11 | unit-R1-mutated-nosettle.txt |
| R2 dates overrule the status | ✓ | `statuswins` ✘ 2 | unit-R2-mutated-statuswins.txt |
| Q1 out-of-order button disabled until in order; model holds the fix | ✓ | `keepasgiven` ✘ | e2e-Q1-mutated-keepasgiven.txt |
| Q2 each card opens/closes the gate; primary 3 → 2 → 1 → Import 6 and 6 | ✓ | `gateopen` ✘ (the outcome card never reaches the deck) | e2e-Q2-mutated-gateopen.txt |
| Q3 agency / sent date not asked; nameless / two-way still are | ✓ | `askagency` ✘ | unit-Q3-mutated-askagency.txt |
| S1 (v9) sage only on the mark | ✓ | — | e2e-S1.txt — its sage sweep unchanged; its words for the old summary re-pointed |

Page breaks: `TDI_MUTATE=threetiles|tplpicker`. Source breaks: `node scripts/tdi-mutate.mjs apply <name>` / `restore`.

## The walk on dev (template-dmy.csv only)
`tests/e2e/twoDoorWalk.measure.ts` on `index-BQC9KmLH.js`, empty fixture account, `walk-*.png`:
1-doors (two doors, quiet line) → 2-read (headings line, "Requests added 1", "Response times not in your file 5",
"2 questions for you") → 3-review (Jamal Carter's two-way date, then Marianne Webb's outcome) → 3-review-answered
("Import 5 agents and 5 queries") → 4-dashboard ("5 queries imported"). No `smartImportMap` request; no confirm
screen; five queries written; the account restored to 0 documents (walk-readings.jsonl).

## Left unproven (needs a live Smart Import run, which this build does not make)
- The rules on a real Smart Import result: status from dates, out-of-order dates, and no-year dates in its raw text.
- "Date to confirm" on a Smart Import date (only the template's `unreadable-date` was exercised live).
- The read screen's Smart Import line on a real read.

## Not re-run, and known to hold superseded assertions
`onbV9.measure.ts` beyond S1 (its G locks ask about agencies and missing dates), `onbV9Walk.measure.ts` (the old
summary's words), `onbV5Import.measure.ts`, `onbV5.measure.ts` K1 (three tiles), `importTruth.measure.ts`, and
`onbV5ImportPage.measure.ts` (re-pointed to two tiles, not run). They describe rulings this build reverses.
