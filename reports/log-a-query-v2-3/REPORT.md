# Log a query v2.3 — the four loose ends (decisions page v1)

Nick's four rulings of 23 November: one count of queries sent (D1), a small paperclip on narrow cards (D2), a held task that cannot be renamed (D3), and Escape that keeps the materials pop-up closed (D4). Dev only.

- **Branch:** `log-a-query-v2-3`, cut from the dev line `dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1-laq2-pc2-laq21-mg1-pc3-laq22-qc168` at `93fb01e24`. That base holds log-a-query-v2-2, plumage-colours-v3 and query-card-v168. The branch is NOT merged.
- **Design ref:** `design-refs/log-a-query-v2-3/`. `SHA256SUMS.txt` passes, and `decisions-v1.html` hashes to `a18fca30…24eb`.
- **Compare sheet:** `compare/index.html`.
- **Readings:** `before/readings.json` and `after/readings.json`.

## What landed, phase by phase

### Phase 1 — One count of queries sent (D1): landed (measured)

- **The count.** `queriesSent(queries, now)` in lib/dash2 is now the only derivation. It counts every logged query, dated or not, except one dated after today.
- **Who calls it.** Four surfaces:
  - the Dashboard's "{n} queries sent" (it was `sentAllTime`, dated queries only);
  - the Queries page header (it was one per row);
  - Log a query's review;
  - "Query number {n}".
- **Removed.** `sentAllTime` and v2.2's `queriesSentOf`. Nothing else used them.
- **The weekly chart** is unchanged.
- **The line under the weeks.** It appears only when the book has undated queries, and only in the Sent view. It reads "3 queries have no sent date, so they aren't in the weeks above." (one query: "1 query has no sent date, so it isn't in the weeks above."), followed by **Add the dates**. It uses the axis's small print: 12.5px, the same colour, directly under the plot. With no undated queries the card is exactly as before (shots 1 and 2).
- **"active queries"** is untouched.
- **Measured on the seeded book** (24 queries, three of them undated):

  | Surface | Before | After |
  |---|---|---|
  | Dashboard | 21 | 24 |
  | Log a query's review, including the new query | 25 | 25 |
  | "Query number" | 25 | 25 |

  The Queries page header reads 112. That is correct: it equals `queriesSent` over every query on the account, because the desktop Queries page has no per-book scope. See "For Nick".
- **Add the dates** opened `/queries?ids=…&from=No sent date`. The page showed exactly the three undated cards, under the chip "No sent date · 3".
- **Lock.** `LAQ23-1` computes each surface's figure from the expression in that surface's own source:
  - 24 queries with three undated gives 24 everywhere;
  - one more dated tomorrow still gives 24.

  It was red before the change (the Dashboard said 21) and is green after.

### Phase 2 — The materials tile on narrow cards (D2): landed (measured)

- **Files.** The change is all in pc3tile.css. `QcMatTile.tsx`'s markup and `QcCard154.tsx` are unchanged.
- **When the compact form applies.** A container query on the card, never the window: 328px of content, which is 340px outside, because the card has 6px of padding.
- **What it looks like.** The same button becomes a 24px pill on the "Sent" label's line, at its right-hand end. The paperclip (14px) and the count (13px) sit side by side. The pill joins the box's flex column, so it stays on the label's line however the box centres its lines (measured 0.1px off centre). The Sent box gives back its 64px.
- **Wider cards** keep the 44 × 50 tile.
- **Where the compact form shows:**
  - the grid at 1280 (268px cards) and 1440 (321px);
  - Responses (330px cards).
- **Where the full tile stays:**
  - the grid at 1512 (345px) and 1920 (424px);
  - Log a query's preview.
- **No Sent word cut**, measured in Chromium and WebKit at all four widths, on the grid and Responses:

  | | 1280 | 1440 | 1512 | 1920 | Responses (330px), every width |
  |---|---|---|---|---|---|
  | Before | 53 words cut on 50 cards | 4 words cut on 2 cards | none | none | none |
  | After | none | none | none | none | none |

  Population at every width: 88 grid cards, 50 of them with materials; 7 Responses cards, all with materials.
- **Card height.** Every grid card is one height in both forms.
- **Pop-up placement.** It opens fully in view from the compact form on the first and last rows, with no layout shift.
- **Focus and hit area.** A solid 2px focus ring; the hit area is 37 × 24.
- **The pill keeps everything the tile had:** the same accessible name ("N materials") and the same `data-qc1533` / `data-pc3` hooks.
- **qc154 M1:** green at 1440, as the brief asked, and at 1920.
- **pc3 locks:**
  - PC3-7's size locks are now scoped to wide cards, and their population is asserted.
  - The new PC3-13 checks the compact form at 1280; it is green in Chromium and WebKit.
  - pc3card.test.tsx has 5 new Vitest locks.

### Phase 3 — Escape and the materials pop-up (D4): landed (measured)

- **The cause, as expected:** Escape put focus back on the tile, and the tile's focus handler opened the pop-up again at once. It only happened when the pop-up was opened by hover, because the tile was not focused yet.
- **The fix.** Every open and close now goes through one pure function, `tileNext`. Escape closes the pop-up and mutes hover and focus. The mute ends when:
  - the pointer leaves and comes back;
  - focus leaves and returns;
  - or the tile is clicked or pressed.
- **The next Escape** is the surface's own: in Log a query it is the leave check (measured).
- **Measured in the browser:**

  | Surface | Opened by | Before | After |
  |---|---|---|---|
  | Queries page | hover | came back | stays closed |
  | Responses | hover | came back | stays closed |
  | Log a query's preview | hover | came back | stays closed |
  | All three | focus or click | closed | stays closed, tile keeps focus |
- **Vitest LAQ23-3** (7 tests, through `tileNext`): red before, green after.

### Phase 4 — The held task cannot be renamed (D3): landed (measured)

- **Recognition.** `isHeldSendTask` recognises the task as the app's own, open or done.
- **On the To-do desk** (`WsOwnTask`, the desktop desk and the phone task screen), its title is words, not a field, and there is no Unlink. The link to the agent is how the task is known.
- **As built:** ticking, the due date, steps, notes, deleting and "I've sent it".
- **No Firestore rules change.**
- **If the agent's name changes:** the task keeps the words it was written with and is still recognised, because recognition is by the words' start ("Send your query to "). I chose this over having the words follow the name.
- **Measured:** after a reload the words are still fixed, and "I've sent it" is still there.
- **Vitest LAQ23-4** (red before, green after) checks:
  - the desk for the held task, an ordinary task and a renamed one;
  - that the button survives a reload;
  - a census of every writer of a task's title (`LAQ23-4b`). A new writer turns it red.
- **Tasks renamed before this change** are ordinary tasks and are left alone. I could not say whether any exist on dev, because checking would mean reading live Firestore, which the brief forbids.

### Phase 5 — cl251 B3: not fixed here (red on the base)

- **On my base:** red before any change. It is still red on the branch, for the same reason.
- **First red commit:** `6afc9555b` "Add agent v1 — Phase 5: retire the long form" (9 Nov, on main). It removed the `data-cl252="edit-mode"` and `data-cl252="sec"` hooks B3 reads, and did not re-point the check.
- **Owner:** the Add agent / Contact list workstream.
- **How I found the commit:** by searching the git history for when the hooks left the source (`git log -S`), not by running B3 on each commit.

## Step 0 — the answers

**0.1 Disk.** 34 GB free at the start (27 GB later).

**0.2 What dev serves.** The dev line above at `93fb01e24`, serving `index-CrH8OKjv.js`. Each named branch is in it apart from its own final report commit.

**0.3 Design ref.** Hashes verified.

**0.4 Baseline:**
- tsc: clean.
- Build: clean.
- Vitest: 13,310 passed and 5 timed out. The 5 are four source-walking test files (statusMarksV3Sources ×2, stageColours, ql24, plansPageV3) that ran past 5 seconds while another session's e2e run held the machine. They are not failures of the code.

**0.5a Every count of queries sent:**

| Surface | What it counts |
|---|---|
| Dashboard, Sent view | dated queries, not future-dated (before this branch) |
| Queries page header, collapsed bar, "That's all n" | every query in scope, dated or not |
| Log a query's review and "Query number" | every query (v2.2) |
| How it's going; Analytics (desktop, "all"); Manuscript page "{n} queries sent for this book" (desktop and phone) | every query |
| Analytics phone, 90-day window | dated queries |
| Profile phone; Responses tally | by status |
| Versions; Query letters | by version or letter, leaving out Withdrawn |
| Packages; Comps | by credited query or letter |
| `accountHeaderFacts.sentCount` (dated only) | rendered nowhere |

Only the first four rows were in scope. The rest are unchanged and already count every query, or count by their own rule.

**0.5b Queries with no sent date.**
- On the seeded book, the three are `laq2-mi01q` to `laq2-mi03q`, made undated by the seed (`seedLaq22.mjs`). On the harness account they are the only three undated queries out of 112.
- **How real ones arise:** only through import.
  - Smart Import and CSV/template import keep a row with a blank, unreadable or ambiguous date, undated.
  - Email import gives a sent date only to a dated Queried rung.
  - An old stored value that cannot be parsed also reads as undated.
- **Today's Log a query cannot produce one:** its "when" step is required, and future days are disabled. The phone's older journey defaults to today, and its date picker blocks future dates.
- **No editor clears a sent date.**
- **A future sent date can still be entered:**
  - the Queries page "Date sent" pop-over has `max=today`, but Save does not check it;
  - the phone's "How and when" step has no `max`;
  - imports have no future-date guard.

**0.5c Undated queries on the Queries page.**
- **No filter, sort or Housekeeping item shows only undated queries.**
- **The shortest existing route** is the page's ids door, `/queries?ids=…&from=…`, which shows only those queries under a removable chip. "Add the dates" uses it.
- **A proper route would need** an undated filter in the Filter panel, plus a way to open a card straight at its sent date.
- **How a missing date is added today:**
  - On the phone card, "Add date" writes it.
  - On the desktop card, the date is edited through the Queried step's pencil. The recon read that this path does not write `dateSent` (`qc152Write`/`qc1522Write` have no `dateSent`).
  - The "Date sent" pop-over looks reachable only from older card layouts.
  - **⚠️ Unchecked:** I did not confirm in the running app whether dating the Queried step on the desktop card clears a query from the undated line. If it doesn't, "Add the dates" leads somewhere the writer cannot finish the job. See "For Nick".

**0.5d The tile on narrow cards.** See Phase 2's table. In short: on the base the grid had 53 words cut at 1280 and 4 at 1440, none at 1512 or 1920; Responses had none.

**0.5e Escape on the pop-up.** Reproduced as expected on all three surfaces (Phase 3).

**0.5f The held task.**
- **Recognition:** by its words (`heldSendDoor`: open, linked to an agent and a book, no query, words starting "Send your query to ").
- **Where any task title could be edited:**
  - the To-do page's own-task desk, on desktop and the phone task screen (`WsOwnTask`);
  - the Noteboard (undated notes only);
  - two places that cannot be reached: the old unrouted To-do page, and a phone composer that nothing opens with a task.
- **How the app's own tasks avoid renaming.** Nudge, quiet, send, offer and the rest are derived from the queries and never stored, so they have no title to edit. Every stored task was renamable until now.

**0.5g cl251 B3.** Red on the base. See Phase 5.

## Gates

- **tsc:** clean.
- **Build:** clean.
- **Full Vitest:** 13,341 passed and 1 timed out. The timeout is `marketingLinks.test.tsx`'s source walk under machine load; run alone it passes 15 of 15. The four files that timed out in the baseline pass alone (62 of 62). So the branch is no worse than the baseline.
- **e2e:emu:**
  - laqV23 V23-D, DW, E, S and T: all green.
  - pc3 PC3-1 to 13: green.
  - qc154 M1 at 1440 and 1920: green.
  - laqV2, laqV21 and laqV22: green.
  - cl251 B1: green; B3 red (see Phase 5).
  - **PC3-W (WebKit): red on the base, not caused by this branch.** In WebKit the pop-up does not open on mouse hover (PC3-8W, PC3-8RW, PC3-13W's hover rows, PC3-11W's Full chip).
    - I reran it with the pre-Phase-3 tile code swapped in, and it failed exactly the same way.
    - My CSS only reaches cards of 340px or less, and these are 345px.
    - It passed in plumage-colours-v3's own run, so something between that run and this base changed it, possibly query-card-v168.
    - Everything else in PC3-W (sizes, the compact form, keyboard open and Escape) is green in WebKit.

## Decisions I took

1. **The line under the weeks shows in the Sent view only.** The weeks it refers to are the Sent bars. The brief says the sent card; the chart card toggles between Active, Sent and How it's going.
2. **The Queries page header counts its own scope.** On desktop that scope is every manuscript, since the desktop page has no book picker. So it agrees with the Dashboard only on an account with one book. It is the same function, called over a different scope.
3. **"Add the dates" uses `queriesForIds`**, the existing door, with the chip label "No sent date". No new filter or page.
4. **The compact threshold is 340px outside (328px of content).** The widest card that needed more room needed 331px. Responses' 330px cards therefore take the pill too.
5. **The pill's fill is 20px inside its 24px hit area**, so it ends above the value's line.
6. **When the held task's agent is renamed, the task keeps its old words.** It is still recognised by the prefix, and no stored text changes.
7. **The held task's agent cannot be unlinked**, because unlinking would lose the "I've sent it" button. Not stated in the brief.
8. **Escape from a hover still puts focus on the tile**, as it did before. The pop-up now stays closed.

## For Nick to rule on

1. **Where "Add the dates" goes.** Today it opens the Queries page showing only the undated queries. A proper route would be an undated filter in the Filter panel, and opening a card straight at its sent date. More pressing: the recon found the desktop card's date edit may not set the sent date at all. That needs checking before the link is trusted.
2. **How undated queries arise, and whether to stop them.** Only imports make them, and only when the date is blank or unreadable. Imports, the Queries page date pop-over and the phone's edit step can also store a future sent date. Options: ask for a date at import, or put a date step in the card.
3. **The Queries page header's scope.** On desktop it counts every manuscript, while the Dashboard counts the active book. On the test account that is 112 against 24, the same rule over different queries.
4. **cl251 B3's owner.** The Add agent / Contact list workstream, since `6afc9555b`.
5. **PC3-W's WebKit hover reds.** They predate this branch; worth a look by whoever owns query-card-v168 or the grid card.

## Branches, commits, dev

**Branch:** `log-a-query-v2-3`, pushed, NOT merged. Commits, on top of `93fb01e24`:

| Commit | What |
|---|---|
| `bc50e5cca` | Step 0: the ref pack, the recon spec and its readings |
| `9b7ff00d0` | Phase 1: one count |
| `410a7414e` | Phase 2: the compact tile |
| `902440e06` | Phase 3: Escape |
| `6396ecb1a` | Phase 4: the held task |
| `30944d06f` | Phase 2 fix: content-box width; the pill in the box's flow |
| `684bcf2f6` | Measured: specs, readings, the compare sheet, the decisions |
| (next) | This report |

**Dev:**
- Dev line `dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1-laq2-pc2-laq21-mg1-pc3-laq22-qc168-sb1-laq23` at `8c4a33470`. It is this branch merged onto what dev served when I deployed: `…-qc168-sb1`, `index-k1Jk5tzr.js`, which adds Search standing B1 on top of my base.
- On the merged line, tsc and 1,438 tests across the touched areas are green.
- Deployed to https://scriptally-dev.web.app, which serves `index-CiirvlC9.js`; I checked that against the build.

**To back it out:** redeploy `…-qc168-sb1` (`b22c1bc7d`, `index-k1Jk5tzr.js`).

**Worktrees:** the base worktree and the deploy worktree are removed. `ScriptAlly-laq23` is removed after this report is pushed.
