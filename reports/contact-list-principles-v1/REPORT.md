# Contact list principles v1 — report

Branch `cl-principles-v1`, cut from `dev/…-qc154-qc1541-pa4` @ 936411db3 (the branch dev served, `index-CzLH0sbg.js`).
Reference `design-refs/contact-list-principles-v1/contact-list-principles-v1.html`, SHA256 2069e37e…dd6604 (matches, enrolled in
`design-refs/.refhashes.json`).

## False premises

1. **"The rust postmark stamp (the log flow's confirm)".** The log flow's confirm (`laq-stamp`, QcLogStages) is navy, a
   double-bordered rectangle reading "Logged". The rust round postmark exists as phone v4's `Stamp` (V4Parts), and its
   sheet applies below 768px only. Phase 3 reuses that component and draws it on the desktop in contactPrinciples.css.
2. **"Undo removes the agent through the existing delete path".** `deleteAgent` writes a compensating "You deleted …"
   record and leaves the AGENT_ADDED row, which breaks the house rule that an Undo deletes what the action created. The
   existing undo for an add is `undoAgentAdd` (lib/scoutStore; Scout and phone v3 use it). It removes the agent and its
   AGENT_ADDED row and nothing else. That is the one used.
3. **"Open/closed is remembered the same way the rail already remembers its sections (remembered per user?)".** Nothing
   is remembered per user. The rail's sections are component state, kept only while the page stays mounted. More
   filters is held the same way. A reload drops the page's filters, so "opening the page with one applied" is
   the dashboard's `?status=` link. CLP6 locks that path.
4. **"Can't load" had no state at all.** An agents read error marked the collection loaded and empty, so the page drew
   the blank account's first-run page, as if nothing were on file. db.tsx now reports the agents listener's standing and can
   re-subscribe it.
5. **Rows were already focusable** (`tabIndex 0`, Enter/Space open the card), and **Agent fit already saved on the
   click with "Agent fit: {words}" and Undo**. What was missing: ↑ ↓, the focus ring, focus back on Esc, and the snackbar
   not stacking (base CLP8: 3 snackbars).
6. **200% zoom on a 1440 window is a 720px viewport, which is the phone app (below 768px), not this page.** The fold is a
   container query on the page's content column (`.agl-inner` under 1000px). It shows at a desktop window of about 1090px or
   narrower (content 912px at 1000, 720px at 808), so 200% on a 1920–2160 window or a split screen. Content is 1352px at 1440
   and 1192px at 1280, so the columns stand there (CLP13).
7. **Card offers v1 is not on dev** (branch `card-offers-v1` in `ScriptAlly-co1`, not an ancestor of the dev branch). There
   are no CO suites on this line to run.
8. **The snackbar is the app's toast** (`ToastProvider`), reused as told. Its Undo chip is 9px mono capitals and its body
   13px Inter, so it does not match the mock's 15px typewriter snackbar. It is app-wide, so it was not restyled here.
9. **The run's harness kills all motion** (`measure.ts` KILL_MOTION on every page it opens), so CLP14 read nothing on
   today's code (base green). CLP14 now removes that style first and is proved by its mutation.

## What changed, by phase

| Phase | Commit | What |
|---|---|---|
| 0 | dceb96f83 | Reference enrolled; `tests/e2e/clp1.measure.ts` (CLP1–14); base readings |
| 1 | 7fde0fe89 | Open is an outline; the title is `clHeadline`'s sentence (typewriter 36px, "need you" rust), the count line beneath it; `onFileTitle` deleted |
| 2 | a6bf77ba5 | Agency line 14px serif; faded text #6b6058, headings #5b4f47, no opacity on text; A–Z disabled .45; rail counts 13px, Reset 32px tall; More filters |
| 3 | c3f13fd60 | After Done: panel closes, row into view, powder tint, rust postmark, "{Name} added to your list" + Undo (`undoAgentAdd`) → "{Name} removed"; Agent fit on the page's one channel, 5s, never stacks; `undoneMessage` on the toast; the "added" event carries `how` |
| 4 | 8a4c7a16c | ↑ ↓ between rows (clear of the pinned headings), 2px navy ring, focus back to the row on close; card (`.cl262-card` only): headings 15px serif 600, agency 14px serif, chips 14px typewriter, status chip sentence case, meta lines 13px serif, stars 26×26 |
| 5 | 1187d6485 | Loading (skeleton rows; SheetSkeleton deleted), can't load (`agentsRead` / `retryAgents`), no matches (named filters, Clear, Just remove), day one panel; content under 1000px folds the rail above and stacks the header; reduced motion |
| 6 | (this commit) | Count line as the mock (no rules, italic serif, typewriter numbers); headline `text-wrap: balance`; the no-matches sentence names the genre plainly; CL26-H1 / CL27-H1 / CL27-R1·R2 re-pointed; screenshots; this report |

Choices the prompt left open:
- No matches with three or more filters reads "Three filters together left nobody. Take one off, or clear them all." (the
  mock gives the two-filter line only). Find counts as a filter and is named first.
- Day one's line beneath, "Add a few more and QueryHawk can start suggesting who to query next.", is the mock's word for word.
  The nearest thing in the code that suggests is the log flow's Agent-fit ordering and the Scout. Nick to confirm the claim stands.
- The stars sit 26px apart (gap 0), as the mock draws them; the glyph is unchanged.
- An add finished through the finish screen's edit doors (a hand-off) still opens the panel (v18.3 §D). Only Done gets the
  postmark and snackbar.

## Nothing scoped away from the landing page

The landing page does not use the card's sheet. `agentPaperCard.css` is shared with Housekeeping, the comps page and
ContactSheet24, so it is not edited. Every card rule is under `.cl262-card` (AgentCard262), doubled to win over
contactV262.css in any bundle order. Every page rule is under `.cl27`, and nothing names `.qc151` (CLP3).

## Locks (emulator, `npm run e2e:emu`)

| Lock | Red before | Green after |
|---|---|---|
| CLP1 one filled button | base 0/4 (Open filled navy) · mutation 0/4 | 4/4 |
| CLP2 headline, five cases | base 0/14 ("53 agents on file") · mutation 12/14 | 14/14 |
| CLP3 Query Centre title unchanged | mutation (inline 36px) 3/4 | 4/4 |
| CLP4 agency line | base 0/3 (11px, uppercase, mono) · mutation 1/3 | 3/3 |
| CLP5 contrast ≥ 4.5:1 | mutation 6/7 (Not queried at .5 ink) | 7/7 |
| CLP6 More filters | base 0/3 (four sections, no row) | 6/6 |
| CLP7 add feedback + Undo | base 2/6 (row out of view, no tint, stamp or snackbar) | 8/8 |
| CLP8 fit snackbar, Undo, no stacking | base 3/4 (3 snackbars) | 5/5 (restores the rating) |
| CLP9 keyboard | base 5/7 (↓ did nothing, no ring) · mutation 6/7 | 7/7 |
| CLP10 stars ≥ 24×24 | base 1/6 (18.3×16.4) · mutation 1/6 | 6/6 |
| CLP11 no uppercase mono < 12px | mutation 0/1; first green run found the card's 10.5px "Added" line | 1/1 |
| CLP12 every state | base: no state rendered (the run timed out waiting) · mutation 5/10 | 10/10 |
| CLP13 under 1000px | base 4/6 (rail beside, sticky) · mutation 5/7 | 7/7 |
| CLP14 reduced motion | mutation 1/2 (base was vacuous, premise 9) | 2/2 |

Ledgers: `ledger/` (base-*, mut-*, and the green runs).

## The page's checklist

| Principle | Result | Measurement |
|---|---|---|
| One filled button | pass | one navy fill among the header's buttons, at 1440 and 1280 (CLP1) |
| Type sizes | pass | agency 14px; card headings 15px; chips 14px; rail counts 13px; nothing uppercase mono under 12px in rows or card (CLP4, CLP11) |
| Targets | pass | stars 26×26 (CLP10); Reset 32px tall |
| Contrast | pass | 7 pairs ≥ 4.5:1, composited (CLP5) |
| Keyboard | pass | Tab → row, ↓/↑, Enter opens, Esc closes and focus returns (CLP9) |
| 200% / narrow | pass (see premise 6) | at 912px of content: rail above, static, no sideways scroll, no overlaps (CLP13) |
| States | pass | loading, can't load, day one, no matches (one and two filters) (CLP12) |
| Motion | pass | nothing running under reduced motion, loading and card open (CLP14) |

## Screenshots (`shots/`)

`mock-1440/1280.png` beside `page-1440/1280.png`; `state-loading/error/day1/none-1440.png`;
`feedback-added-1440.png` (tint, postmark, snackbar), `feedback-removed-1440.png`, `feedback-fit-1440.png`;
`narrow-720.png` (a 720px content column at an 808px window). They were taken before the last two CSS touches (the count
line restyle and the headline's balanced wrap); `page-*.png` were retaken on the deploy branch.

## Gates against baseline

| Gate | Baseline (936411db3) | After |
|---|---|---|
| tsc | 2 errors (functions packages missing in the worktree) | 0 |
| vite build / build:dev | clean | clean |
| Vitest | 4 failed / 7 files (functions packages missing; emuGuard; firestoreTarget ×2; one SDK ceiling) | 3 failed: emuGuard, firestoreTarget ×2 (all in the baseline) |

## Existing suites on this branch

- `cl26` and `cl27`: CL26-H1 and CL27-H1 asserted the old "N agents on file" title (Playfair 54px). They are re-pointed
  to the headline and the count line beneath it, as v27 re-pointed v26's. CL27-R1 now expects the rail's section order
  with Where they stand and Submissions after Genres, and R2 unfolds More filters before pressing them. After that, all
  pass except **CL26-H10** ("Sort: exactly the four"). The sort menu has had a fifth option, "Agent fit", since Add agent v1
  (be8dfa2db / eb6d22b95), which is before this branch. This branch does not touch sorting.
- `cl262` 25/25 and `addAgentV1` 14/14 pass. `qc1541` (the current Query Centre suite) passes.
- `qc1531` slips ×4 and `qc154` M1/M5 ×4 are red. Those locks predate later builds: v154 replaced the list the slips are read
  from, and v154.1 quietened the Queried band and dropped the 0-week streak that M1 and M5 assert. This branch changes
  nothing in the Query Centre (no file under src/components/queries; CLP3 holds its title).
- The suites' ledgers are copied to `suite-ledgers/`. Their own report folders were put back as committed.

## Dev deploy — not done, waiting on Nick

- **Served hash before:** `index-CzLH0sbg.js` at the start (`…-qc1541-pa4`). Dev moved mid-session to `index-CLC0PZ_h.js`
  (`…-pa4-qc155` @ da2a05a60, Query Centre v155). Its 8 commits touch no file this branch touches.
- **Deploy branch:** `dev/…-pa4-qc155-clp1` = that tip + `cl-principles-v1` (merge 83e9d594c, clean), local, not pushed.
- **On it:** tsc 0; both builds clean; Vitest 3 failed (the baseline's 3). CLP1–14 all green. cl262 25/25, cl27 all green,
  addAgentV1 14/14 and qc1541 all green.
- **Red on it, already red before this branch:**
  - CL26-H10, the Agent fit sort (see above).
  - qc155 S4 ×2 ("pixel-identical to the before build", "every frame box unchanged"). This is red the same way on v155's
    own tip, da2a05a60, without this branch (run on a detached checkout of it). The content column is 16px wider each side
    than v155's recorded before reading, so the reading was taken in a different setup.
- The brief says to deploy only if all of them are green, so nothing was deployed. Served hash after: unchanged, `index-CLC0PZ_h.js`.
