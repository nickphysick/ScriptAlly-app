# Query Centre v152.2 — a calmer list, and a card you act in like a chat (desktop)

**Branch:** `query-centre-v152-2`, cut from `query-centre-v152-1` @ 2cab22c91 as pushed. It is pushed and **not merged to `main`**.
**Dev:** serves **`index-Dso0rUS3.js`**. It was built from the local integration branch `dev/…-cb2-sm1-qc1522b`, which was cut from what dev served (`MbVlloVR`, the sidebar-rail line at 55d02f701).
**Dev rules:** released `2026-11-06T19:06:15.393036Z` (ruleset `e5558701…`). **Prod is untouched:** the rules diff is below and in `rules-prod.diff`.

## 1. False premises

The recon is `RECON.md` (§0, before any edit). The twelve it found:

1. **There is no "court" grouping.** The six groups the brief calls *Action* are today's "Who it's with" (key `attention`). The option being removed is the key `action` ("Next action"), plus `none`. The new *Action* is `attention` relabelled.
2. **Removing "Next action" and "No grouping" is not just a menu change.** `action` and `none` are read by the CSV export order, `groupPhrase`/`bandToneOf`, older list components and the saved view memory. A saved `action` or `none` now reads as Action (§0 answer 1). The chip's × still gives an ungrouped list.
3. **The "queries need you" banner has no chips.** It is the "This week" summary card, and it has pills.
4. **Package grouping had no Free/Pro gate.** `PACKAGES_OPEN_TO_ALL` is true. The gate is new and plan-based (Pro or founding writer). Packages themselves stay open to everyone; only grouping by package is gated.
5. **"No reply means no" was not Queried-only.** `queryState` read it for every agent's-court status. It now applies at Queried only (§0 answer 4). That moves **two harness queries from Gone quiet to Nudge due**: `cor-pair` (Elinor Hale) and `seed-pkgq-10` (Peter Vance).
6. **There was no eight-week rule.** Gone quiet is the writer's setting (2/3/4/6/8 weeks, default 4), and a quiet query always led with Close it. Now the setting still decides when a query enters Gone quiet. 8 weeks from the reply date, or from any nudge, decides when Close it leads instead of Nudge (§0 answer 5).
7. **The row and the footer did not share one function** (`rowAct` vs `replyBox`), and their wording differed. Both now read `closeLeads` from one stamp, and L17 holds the row and the footer to the same answer.
8. **The capitals "PRIYA RAMAN" duplicate is not on any account I could read.** Not the emulator snapshot, not the live dev harness account, and not Nick's two dev accounts (all read-only). See §8.
9. **There is no "0 days since your nudge" string.** The real "0 days" sites are listed in RECON §0.9, and all of them are fixed (L7).
10. **v152.1's card journeys were not the drawer.** Record, fork, fix and details were card-local forms. Offer, Reopen and R&R "sent" left the card for the drawer. The composer now replaces all of them on the card (§2–§7). The list row's buttons still open the drawer, as before.
11. **Several fields the journeys write did not exist:** "open to more work", a Wall-of-no flag, a step-level "what they asked for", how a nudge went, the tell-later flag, and a restart date. They are added on the step (and `replyRestartedOn` on the query), with rules on dev only.
12. **The undo was a bar, not a toast.** v152.1's card saves used the drawer's app-wide `UndoBar`. The card now has its own ink toast (5.2s), with the same snapshot restore underneath.
13. **(Found later)** The bundle sweep for letter words (L12) finds "Dear" in the bundle. It comes from the Submission packages preview, which is out of this pack's scope, so the sweep is scoped to the Query Centre.

## 2. §0 answers (Nick, 6 Nov), as built

| # | Answer | Built |
|---|---|---|
| 1 | "Next action" and "No grouping" map to Action; the chip's × still ungroups | `listGroupOf` / `savedGroupOf` in `lib/qc1522.ts` (unit-locked) |
| 2 | One derived "tell agents" card per offer, replacing the per-agent cards | `offer_tell_all` in `lib/db.tsx`; the per-agent `offer_tell` no longer fires on the board. Stored: **only `tellLater: true` on the offer's step**, in both stores. The count is derived |
| 3 | Package grouping gated by plan; packages stay open | `GROUP_1522[package].pro` plus the plan predicate; Free sees the option locked with one line |
| 4 | nrmn at Queried only | `lib/queryState.ts`; the two moved queries are in §1.5 |
| 5 | The setting decides Gone quiet; 8 weeks decides whether Close it leads | `closeLeads` on the stamp, read by both the row and the footer |
| 6 | Priya: read-only check, else a case-insensitive guard | §8 |
| 7 | New fields on the step; the Wall-of-no box ticked by default; rules on dev only | `offWall` is written only when the box is **un**ticked |
| 8 | "Reopen by mistake" stores a restart date | `replyRestartedOn` (query); rules on dev only |
| 9 | Leave worktrees as they are | §10 |

## 3. Commits (`query-centre-v152-2`)

| Commit | What |
|---|---|
| deabd7665 | the design refs |
| 401526413 | §1 a calmer list: the Group menu, header fills, banner, divider, sticky corner, rows, "0 days" and waits |
| fb45975cb | the rules for the new step fields and the reply restart |
| d89386f84 | §5 a pass kept off the Wall of no |
| ff23f8191 | §6.1 one "tell the other agents" card, and the duplicate-agent guard |
| e41f20901 | §2–§7 the card: bands, footer, composer, replies, offer, reopen, edit in place |
| 80b3df19f | locks L1–L17, their source mutations, and the card screens |
| ae1406604 | the v152.1 locks this pack changes, re-pointed; stale mutations retired |
| (this) | the report, the v152.1 L1/L2/L9/L12 re-points, ledgers and screens |

On the integration branch only: the merge (717fe06a6), and `offer_tell_all` copy in `src/lib/todoWs.ts` (b6ce3bdf7). To-do v51's `OTHER_WORDS` table is on that line and not in this base. Its type requires an entry per task type, so the merge did not type-check until that entry was added.

## 4. Locks: red, then green

The suite is `tests/e2e/qc1522.measure.ts` (emulator, `demo-scriptally`), at 1280 × 800 and 1512 × 900. Ledgers are in `ledger/`.

**Green:** all 17 locks green at both widths in one run (35/35 with setup, 25 min, 7 Nov; `ledger/L*-1280.json`, `ledger/L*-1512.json`).

**Red first.** Each lock was run against a named break. Page breaks inject CSS through `QC1522_MUTATE`; source breaks are edits to `src/`, built and run by `qc1522Mutate.sh` and restored from a path-named backup. The ledgers are `ledger/mut-*.json`.

| Lock | Break | Red reading |
|---|---|---|
| L1 Group menu | "No grouping" put back in `GROUP_1522` | `["Status","Action","Package","No grouping"]` on Pro and Free |
| L2 headers | offer header filled navy, white title | fill rgb(42,58,82), title ink white |
| L3 banner | old pink on the banner art | "no old pink in the banner — 1" |
| L4 divider | border under Showing | `border: 1px solid` |
| L5 sticky corner | header cell transparent | corners outside the arc read [255,255,255] |
| L6 rows | a "Gone quiet" tag on the row | "no Gone quiet in any row — 37" |
| L7 zero | `waitWords(0)` → "0 days later" | "sameday: the card never says 0 days" (see below: this lock was vacuous until the `sameday` fixture) |
| L8 bands | card band sand with ink text | nudge, agent and rr bands "not navy" and "not white text" |
| L9 waits | the wait drawn as a pill (`qc152-w`) | "no pill or hairline wait" on seven (6), passed (3), rr (3) |
| L10 composer | a "See what changes" step before saving | 1 failed (one tap no longer saves) |
| L11 Escape | closes without asking | 1 failed (no discard strip) |
| L12 never writes | offer note prefilled "Thank you for the offer, but" | "offer: no field starts with prose" |
| L13 replies | a sixth chip, "You nudged" | "exactly the five replies", "no step of yours offered" |
| L14 offer | Done enabled with agents left | "Done waits for every agent", "Done still waits with one left" |
| L15 reopen | the mistaken pass left on | the pass is still there; nothing new on the thread, 4 → 4 |
| L16 edit in place | the whole history becomes the form | "only that bubble is replaced — 4 → 0" |
| L17 close rule | `closeLeads` swapped | quiet row leads Close it; nudged leads Nudge; 8+ weeks lead Nudge (4 rows) |

**Two locks were weaker than they looked, found by these runs:**
- **L7 was vacuous for its own break.** `waitWords(0)` → "0 days later" stayed green, because no card L7 opened had two steps on one day. A new fixture, `sameday` (a partial asked for and sent on the same day), is now among the cards L7 opens, and L7 requires that card to read "Same day" first. Red under the break; green without it.
- **L14 only checked Undo on the offer and the fixture sibling.** Accept withdraws every other open query on the manuscript (the harness's own `seed-query-ms2-a` and `-b` too). L14 now snapshots every listed sibling before accepting and requires each back after Undo.

**The v152.1 suite (`qc1521.measure.ts`, L18 in the brief).** v152.2 changes four of its readings, re-pointed with the reason at each:
- **L1:** the Queried status header is now the §1.2 whisper, `mix(#f2ebe0 32%, #fff)`. It is painted on the cell's `::before`; the cell itself paints the page colour for the rounded corners. The lock compares against a probe element painted with the reference's own literal.
- **L2 and L9:** the bubble titles are now "You withdrew it" and "You told N agents about the offer".
- **L12:** an agent already told starts ticked and is not newly told. The lock ticks only the others, and expects that count less the refused sibling.
- **L4:** an undated gap is blank, not "—".
- **L8, L10, L13:** retired; their forms are deleted. Their successors are named at each skip (QC1522 L8/L13/L14/L17 and `qcFoot1522.test.ts`).

**Result:** all of v152.1's remaining locks green at both widths (17 passed, 6 skipped as retired, then L12 again after the cap fix, 3 passed).

**Two defects found by the runs, and fixed (0489fb214):**
- **A told count over 30 was clamped to 30**, by the write and by the rules. Now 500 in both.
- **A refused Undo was silent.** The toast ran `void t.undo()`. The card now logs the error and says "Couldn't undo that. Nothing was changed."

**The emulator logs.** The disk filled twice during this pack (34 GB, then 38 GB of emulator debug logs). The diagnosis is in `emulator-log-diagnosis.md`. There were no rules denials. The emulator kept the Listen channels of finished test pages open and fanned every later write out to them. That is classified as the harness: no app loop, idle or inside a test. `main`'s emulator guard is merged in (a8a7b625c), and this pack's four runners now go through it.

## 5. Screens

`screens/`: 45 screens, each at **1280** (`-1280.png`) and **1512** (`-1512.png`), numbered after the refs in `design-refs/query-centre-v152-2/screens` (01–76). Made by `tests/e2e/qc1522Shots.measure.ts` over the `q152-` fixtures, which it seeds and removes in the same run.

- **List:** 01 top · 02 Action groups · 03 Group menu · 04 by status · 05 by package · 06 the menu on Free · 07 sticky header.
- **Offer:** 10 card · 11 choices · 12 tell the agents · 13 Deciding plus the to-do · 14 accept · 15 accepted · 16 decline.
- **Mark sent:** 20–23. **Nudge:** 30–32. **What did they say?:** 40–47.
- **Close:** 50 quiet, not nudged · 51 close with the tip · 52 closed with Undo · 53–54 quiet after a nudge.
- **Reopen:** 60–63. **Edit in place, details, materials:** 70–76.

## 6. Rules diff (prod: Nick's to deploy)

`rules-prod.diff`. Dev has had exactly this since 19:06 UTC; the deployed ruleset diffs against what dev had before (55d02f701) by these lines only.
- **Query:** `replyRestartedOn` (string ≤ 32) in `isValidQuery` and the query update allowlist.
- **Nested activity log:** `openToMore` (bool), `offWall` (bool), `askedFor` (string ≤ 80), `sentVia` (string ≤ 32) and `tellLater` (bool), all optional.
- **Feed (`activities`) update allowlist:** `tellLater`, so the offer step's feed twin can carry the flag.
- **`toldCount` ceiling 30 → 500** (nested log). The Tell list can tick more than 30 agents; at 30 the step said "You told 30 agents" after 55 were ticked (found by v152.1 L12; the write's clamp moved with it).

⚠️ **Until prod has these, a card save that writes one of the new fields fails as a whole on prod** (the nested allowlist is `hasOnly`). That covers a pass with "open to more", a pass kept off the wall, "Something else", a nudge, "Do it later", and a reopen by mistake. This only matters once the card ships to prod.

## 7. The To-do link

"Do it later" or "Do the rest later" on the offer, or accepting with "add a to-do" ticked:
1. **marks** every agent not yet told: `offerRefQueryId` = the offer, `offerTold: false`;
2. **sets** `tellLater: true` on the offer's step, in the nested log and on its feed twin.

The board derives **one** card per offer, `offer_tell_all` (`lib/db.tsx`): "Tell 6 agents about Tom Ellery's offer · answer by 9 Oct", or "Tell 6 agents you've signed with Tom Ellery" once accepted. To-do v51's workspace (on dev, not in this base) titles it "Tell the other agents about Tom Ellery's offer" and keeps the count on the card. It counts the siblings still `offerTold === false`, is dated by the offer's answer-by date, and **completes itself at 0**. Nothing else is stored: no count, no task document. Ticking agents off on the card (Tell them) lowers the count; the last one clears the card. Undo removes the flag and the marks with the rest of the snapshot.

## 8. Priya: cause and fix

**Not reproduced.** I read, read-only:
- the emulator snapshot;
- the live dev harness account (`LS4ymFF…`);
- Nick's two dev accounts (`FDjI8ah…`, `45OnYeR…`).

None has a capitals "PRIYA RAMAN" beside a "Priya Raman", and none has an agent with an empty agency of that name. The pair exists only in import fixtures, and current import code title-cases and merges it (`nameCase`, the case-insensitive `sameAgent`).

**Guard added (§0 answer 6):** `addAgent` now merges a new agent into an existing one when the import's own rule, `sameAgent`, says they are one: the same name ignoring case and spaces, and the same agency or either side giving none. It returns the existing agent's id and writes nothing (ff23f8191). An add that carries an explicit id (an import that has already decided) is written as asked. The bug is reported as unreproduced: if it was ever real, its source is upstream of the import paths read here.

## 9. Dev bundle

**`index-Dso0rUS3.js`** on https://scriptally-dev.web.app, from `dev/qc1511-…-qc1522b` (local). I checked that dev was serving `index-MbVlloVR.js` (sidebar-rail-v1, 55d02f701) immediately before cutting, and cut from that.

Gates on the integration branch:
- tsc: clean.
- Build: clean.
- Vitest: every red is outside this pack. `functions/*` and the streamed `smartImportCore` test fail because the scratch worktree has no `functions/node_modules`. `firestoreTarget`'s census lists e2e files from the other merged branches; the baseline already had 2 of these.

On `query-centre-v152-2`:
- tsc: clean.
- Build: clean.
- Vitest: no worse than baseline (the 2 `firestoreTarget` fails).

## 10. Left undone, and known

- **⚠️ DEV DOES NOT HAVE 0489fb214 OR THE MERGE OF `main`.** The told-count cap and the refused-Undo message are not on dev, and neither are dev's rules for `toldCount ≤ 500`. By 7 Nov another session had deployed over `index-Dso0rUS3.js`: dev serves `index-D4-_I14k.js`, from a line I did not build. I did not deploy over it. The redeploy needs that line named first.

- **The phone's offer journey** (drawer, ≤760px, out of scope) still marks siblings, but it no longer raises per-agent To-do cards; the derived `offer_tell_all` only appears with `tellLater`. A phone accept therefore creates no to-do.
- **The deadline hint copy** on the request reply was left as it was.
- **`deleteText`** (the delete confirm) does not name the "reply overdue since" clause.
- **`replyRestartedOn` adds a field to the query.** Queries already near the rules' field ceiling (`seed-pkgq-4` is at it) will refuse a reopen by mistake. The save fails, says so, and writes nothing.
- **`rulesProbe.mjs` does not list the new fields,** so it was not run for them. I checked the dev deploy by its release `updateTime` and by the e2e saves.
- **The phone window question stays open** (as asked).
- **Worktrees, left as they are:**
  - primary `ScriptAlly-app` (main, 68 dirty);
  - `wt-emu` (detached, 65 dirty);
  - `ScriptAlly-cb21` (corkboard-v2-1, 5 dirty);
  - `ScriptAlly-db22` (dashboard-v2-2, 5 dirty);
  - `ScriptAlly-live` (release/live-1, 1 dirty);
  - `ScriptAlly-rsp6` (responses-v6, 20 dirty);
  - `ScriptAlly-qc1522` (this, clean apart from the report);
  - the scratch integration worktree, which I removed (the branch stays local).
- **The emulator was shared mid-run.** Another session's emulators took the hub port partway through the mutation run, so eight mutations ran in a second pass.
