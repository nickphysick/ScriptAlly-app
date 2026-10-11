# Onboarding v9: stopped before Phase 1

Branch `onb-v9`, worktree `/Users/nickphysick/ScriptAlly-onb9`. No source file has been changed. The references are enrolled and the baseline is recorded.

## Why it stopped

**The stored age categories cannot hold the six drawn.** That is one of the pack's stop conditions.

| Drawn in v9 | Stored value (`AGE_CATEGORIES`, `lib/manuscripts.ts:31`) |
|---|---|
| Picture book | `Picture Book` |
| Chapter book | **none.** The nearest is `Early Reader`, a different name. |
| Middle grade | `Middle Grade` |
| Young adult | `Young Adult` |
| New adult | **none.** |
| Adult | `Adult` |

`firestore.rules` would accept the two new strings (`ageCategory` is any string up to 128 characters, line 117), so no rules change is needed. The block is the fixed list itself. It is shared: the Manuscripts page's edit dialog, the plate's inline editor and the Add-a-manuscript form all draw their choices from it, and three tables key on its values (`genreWordCountRange`, `COMMON_GENRES_BY_AGE` in `lib/genres.ts`, a label map in `lib/manuscriptPage.ts`). Adding or renaming an entry changes those pages without touching their files.

## False premises found so far

1. **The base.** The pack names `origin/import-truth`; you named `dev/…-truth-qc137` at `4a8e41b5` instead. Used. It carries onboarding parts 1–3, import-fixes and import-truth's code (`56868497`; import-truth's tip `1e5f39a3` is only a deploy note).
2. **The baseline is not all green.** One Vitest file fails to load on the base: `functions/src/email.test.ts`. Everything else passes (563 files, 8,563 tests).
3. **A manuscript can already hold several genres.** `genre` is the primary and `subGenres` is the rest (the rules allow a list of up to 20, line 170, and it is in the update allowlist). No type or rules change is needed.
4. **Genres are stored as ids from a 26-entry taxonomy** (`lib/genres.ts`), not as the pills' words. Seven of the eight pills map; one does not (table below).
5. **"Just getting started" does not reach the fork today.** It is a separate branch: the readiness question, then the manuscript details, then straight to the Contact list. The pack's walk says "each of the four journeys to the fork". See question 3.
6. **The set-up never saves the manuscript on the title step.** For the three querying journeys the details are held and written once, at the import's commit or at the end, so the free plan's one-manuscript limit cannot fire mid-flow. Lock T2 says pressing `Title TBC` "saves a manuscript". See question 4.
7. **The dashboard's header is not reusable.** `Dash58Header` is the whole header (its three buttons, the page's `h1`), and its rules read tokens declared on the dashboard's own root. I would match its type and spacing instead.
8. **Only the template path knows how many rows were read.** Smart Import does not report a row count. The summary line would be `{n} rows, read and sorted…` for a template file and `Read and sorted…` for Smart Import.
9. **"Skip for now" from the review already asks first, and already imports nothing.** It uses set-up's own question (`SkipSetupConfirm`), not the Import page's Cancel question. The pack asks for the same question as Cancel; the wording differs.
10. **A row with no status is skipped today**, with the reason "No readable status". The pack makes it `Queried` without asking. That is a value the file did not give; I will build it as ruled unless you say otherwise.

## §0 Recon

1. **Base:** `4a8e41b5`. `SetupFrame`, `ImportFlow` and the review (`SmartImportReview`, `reviewRows`) are parts 1–3's.
2. **Welcome:** `Onboarding.tsx`. Four options, stored on the user as `queryingStage`: `starting`, `early`, `deep`, `interest`. `starting` opens branch A; the other three open branch B. The stored value also sets which fork tile is suggested. The display name is `currentUser.name`.
3. **Book:** see premises 3 and 4. `genre` (primary id), `subGenres` (ids), `ageCategory` (string), `wordCount` (int ≥ 0). Rules validate type and length only.
4. **Lists and mapping:**

   | Pill | Stored id |
   |---|---|
   | Crime & thriller | **none.** `crime` and `thriller` are two genres. |
   | Literary fiction | `literary-fiction` |
   | Fantasy | `fantasy` |
   | Romance | `romance` |
   | Historical fiction | `historical-fiction` |
   | Science fiction | `science-fiction` |
   | Women's fiction | `womens-fiction` |
   | Horror | `horror` |

   Age categories: the table at the top.
5. **Agent genre matching:** yes. `lib/genreMatch.ts` (`takesBook`) drives the Contact list's fit, its next step and Discover. The longer subline can ship.
6. **Readiness:** `BranchA.tsx`, its first screen. It sets the manuscript's `status`: Drafting, Revising or Ready to query.
7. **Continue:** `SmartImportReview.tsx:661` (duplicates: never disabled), `:664` (agents: disabled only when there are no agents), `:668` (queries: disabled only when there are no queries). "Skip for now": premise 9.
8. **Flag kinds.** Agents: a name with no agency (optional today), a detail to check from the reader (optional), a duplicate set. Queries (all optional today): two dates found, a month with no day, a stray spreadsheet number, no date (Smart Import only), unreadable date, two-way date, the same two for the response date, sent-or-requested, status wording, name to check, who's this for. Passed silently: a blank date on the template path. Skipped: the no-status row. Set aside by itself: the row with no agent and no agency.
9. **Status labels** (`STAGE_NAME`): Queried · Partial requested · Partial sent · Full requested · Full sent · Revise & resubmit · Offer · Passed · Withdrawn · Closed with no reply.
10. **Row count:** premise 8.
11. **Dashboard header:** premise 7.

## Baseline

`tsc` 0 · production build 0 · `build:dev` 0 · Vitest 563 files passed and 1 failed to load (`functions/src/email.test.ts`), 8,563 tests passed, 3 skipped. Files in `baseline/`. The rendered locks have not been run yet.

## Questions

1. **Age categories.** Add `Chapter Book` and `New Adult` to the shared list, or something else? And `Early Reader`: keep it beside `Chapter Book`, or treat `Chapter book` as the new name for it?
2. **Crime & thriller.** One pill that picks both `crime` and `thriller`, two pills, or a new single genre?
3. **Just getting started.** Does it now go on to "Your book" and the fork like the others, or still end at the Contact list?
4. **Title TBC.** Write the manuscript at once, or fill the field and hold it like every other title until the flow's one write?
