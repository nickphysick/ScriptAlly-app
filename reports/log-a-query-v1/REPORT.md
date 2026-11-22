# Log a query v1 — report

Branch `log-a-query-v1`, cut from `origin/query-centre-v153-3`. Not merged. Ref: `design-refs/log-a-query-v1/` (hashes checked, all 21 OK).

## False premises

1. **The ref was not in `design-refs/`.** It arrived as `~/Downloads/log-a-query-v1-pack.zip`. Unzipped in the scratchpad, `SHA256SUMS.txt` checked (21/21 OK), then copied in and committed with Phase 1.
2. **"The count n is … the old form's `nth`."** `QcLogFlow149` had no count. `nth` lives in Queries.tsx's old create draft, as this book's queries (every status) + 1. That is what the journey uses.
3. **"Reuse the landing odometer if it can be shared."** It cannot: it is digit wheels written as `innerHTML` inside `HeroCard`'s effect, not a component. The celebration matches the ref's own two-number roll instead.
4. **"Extend `LogAnswers` with sample `{ unit, amt, bookVersionId }`" through an unchanged payload.** `LogPlan` records the book version by **name** (`pieceV.bookVersion`), never an id. The answer carries the id; the plan gets its name. No new payload field.
5. **Packages carry a sample size in the ref.** In the app a package states no sample size (`packages.ts`). A package that tests a book version sends the agent's own ask as the portion, else 3 chapters (the old form's default).
6. **The Adding new agent hand-back exists.** `openNewAgentCard({ onCreated })` already hands the new id back (the drawer's LogJourney uses it). The old `QcLogFlow149` never offered it. "+ Add {Name} as a new agent" now opens that panel with the name prefilled and lands on Sent when it saves.
7. **"Add only that" for the slip's `preview` prop.** Dropping click-to-open and the CTA was not enough. The slip's layout rules hang off the list's root classes (`.qc151.qc153`), so the preview sits under those classes and is fitted to the drawer in `qcLogStages.css`. Its "No reply window" / "Not on their card" words also need the prop, because `logDefaults` gives an agent with no window an 8-week house date, so the real slip would print a reply date.
8. **⚠️ That 8-week house date is still saved.** The preview says "No reply window", but the saved query (and so the list and the card afterwards) carries `writerExpectedDate` 8 weeks on, as the old form did. The save is unchanged by instruction. Nick's call whether the preview or the save should give way.
9. **Three celebration lines are not exhaustive.** A reply date already passed but not yet Gone quiet ("Nudge due" by the app's rule) would read "expect something by {a past date}". A fourth line says the window has passed: "{First}'s reply window passed on {date}, so it's already worth a nudge."
10. **Mount sites.** `ContactLogFlow` is mounted by `AgentList.tsx`. There are no other callers. Both sites now render one shared host, `LogStagesHost`, replacing two hand-mirrored `onSaveLog`s.

## Base and gates

| Gate | Baseline (base branch, before any edit) | Final |
|---|---|---|
| tsc | 2 errors, both `functions/` (no `functions/node_modules` in a fresh worktree). The default heap ran out; it needs `--max-old-space-size=8192`. | 0 errors (with `functions/node_modules` linked) |
| Dev build | clean | clean (only the chunk-size note) |
| Vitest | 4 failed tests in 7 files (11,504 passed) | 4 failed tests in 3 files (11,561 passed), none touching this work: `emuGuard` and `firestoreTarget` (the same `cl25x` files as the baseline), and `functions/eval/generate`, which failed to import before `functions/node_modules` was linked and now runs and fails on stale fixtures |

## Phases

| Phase | Commit | What landed | Measured |
|---|---|---|---|
| 1 | `5e58b4385` | Stage machine, stepper, big rows, footer, Agent stage; `lib/queryActions/logStages` (answers → `LogPlan`, preview from `logPayload`); `LogStagesHost` mounted by both sites | unit `logStages.test.ts`; Agent stage rendered (screen 01) |
| 2 | `5b47e1823` | Sent + inline calendar, Materials (packages, pieces, our menus flipping up and kept in the panel), How, ↑ ↓ ↵ | screens 04–09 |
| 3 | `7b7754847` | The check, the real `QcSlip153` preview (+ the `preview` prop), note, Log and start another, batch carry-over | screen 10, 12, 17, 18 |
| 4 | `e5a9b91dc` | Stamp, bump, celebration, odometer, milestones, confetti (Web Animations), reduced motion, Undo, footer | screens 13, 14, 16 |
| 5 | `0591fbbac` | `QcLogFlow149` and its dead CSS deleted; `QcWhoReplied149` untouched; the e2e cases that walked the old flow re-pointed | swept classes against every component first |
| 6 | (see git log) | `laqV1.measure.ts` LAQ1–LAQ8, fixes found by measuring | below |

## Phase 6 — measured on the rendered page (emulator, 1440×860)

`tests/e2e/laqV1.measure.ts`, 49 checks against a floor of 45, all green. `readings.json` holds the readings.

- **LAQ1** no `<select>`, no date input, and the agent search as the only text field, on every stage.
- **LAQ2** every day after today disabled, today and before pickable, next month disabled; picking a day moves on.
- **LAQ3** the stepper shows first name, the day, the package name or "N pieces", and the method.
- **LAQ4** a done segment returns to its stage; answering it lands straight back on the check, other answers kept.
- **LAQ5** the real slip on the check, not a control (`role=group`, no tab stop), tagged Preview, with its paperclip tab.
- **LAQ6** Log and start another: the "{First} logged · Undo" toast, the batch line, the next agent skipping Sent and Materials with them carried, the toast's Undo returning to the first query's check.
- **LAQ7** the book padded to 24 (closed queries, `seedLaq.mjs`, removed in the same run): the check says "Your 25th query", the odometer reads 25, the milestone reads exactly "Twenty-five queries. That takes some nerve."
- **LAQ8** reduced motion: headline whole at once, no cursor, no confetti, no animation running in the panel.

**Proved red first** (`mutation-proofs.json`): eight mutations, one per claim, each turned the suite red on its own assertion: a native `<select>` on Sent (LAQ1), future days pickable (LAQ2), no skip back to the check (LAQ4), the stepper hiding the materials answer (LAQ3), no preview slip (LAQ5), the date not carried (LAQ6), the 25th milestone missing (LAQ7), typing under reduced motion (LAQ8). Source restored from path-named backups after each.

**Every write is undone in the same run**, and the book is checked back at 14 queries after every run. A safety net (`seedLaq.mjs --clean-today`) removes any query on the harness book dated today, and says so if it finds one.

## Side by side

`side-by-side/*.png`: ref left, build right, for screens 01, 04, 05, 06, 07, 09, 10, 13, 14, 16, 17 and 19. The build's panel is 20px narrower than the ref's card, so a long name ("Alasdair Crewe") truncates on the slip. The "BG LAB" chip is a dev-only overlay.

## Could not do, or did differently

- **Screen 19 (no packages):** the harness book has packages. The build's "no packages" view is the same pieces view as screen 07, which is what the pair shows. The no-packages default itself is covered by code (`showPkgs` is false with no packages).
- **The machine was under heavy memory pressure** (9 GB of swap used, load 7–14, other sessions building). A single emulator write took 3s and a log took 5–40s. That is the old flow's save path, unchanged. The Log button now reads "Logging…" while the save is in flight, because the stamp (a claim that the query landed) waits for it. That label is not in the ref.
- **`qc149.measure.ts` and `cl251.measure.ts` were already red on this base.** Their openers wait for `.qc138-sheet [data-qcv='row']`, which v153 no longer renders. Their log-flow cases are re-pointed to the stages but not run green.
- **Playwright:** another session moved the shared `node_modules` to Playwright 1.65 mid-run. Installing its headless browser also removed the older cached builds (chromium-1234, webkit-2336), so a worktree still pinning the old Playwright will need `npx playwright install`.
- **Undo leaves no note behind:** the snapshot does not hold `journalEntries`, so Undo also deletes the note it wrote.
