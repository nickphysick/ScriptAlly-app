# Import review, set-up layout, dashboard loading and the import's feed event (v1) — report

20 October 2026 · branch `import-review-feed-v1` (tip in the commit that adds this report), cut from the dev integration `…-hc1-sil2-wf1-qc141-silf` (`d984dc9c`) · **not merged to `main`** (its base is not on `main`) · deployed to dev (hosting only) as `…-qc141-silf-irf1`, serving `index-C2WQubzs.js` · design refs `design-refs/onboarding/import-review-v1/` (commit 1).

## False premises — read first

1. **Nothing is set aside automatically any more.** Since onboarding v9 a row with no agent and no agency is *asked about* on the agents step and leaves only when the writer presses "Remove this row". So "rows set aside automatically keep their current wording" described no rows. Ruled (ii): that row's reason in the skipped-rows notice is now **"You chose not to import this"**, and rows marked "Don't import" stay out of the notice, as before.
2. **The reply-time slider never saved its 6 weeks.** It *showed* 6 on a file with no reply times, but the model held `null`, `modelToResult` passed `null`, and `importedAgentDoc` leaves the field off the agent. Same for the other two: an untouched Open/Closed is saved as `Unknown` (the rules require the field; it is the "not known" value), and an untouched Agent fit writes nothing. **No value was being invented.** Per your note, the control changed anyway, because the 6 implied a fact the file didn't give.
3. **The feed line was dropped one step earlier than `if (!who)`.** It was a `Status Changed` with no status and no `eventKey`, so `feedPill` found no tag and the row went at `if (!pill) continue`. It would also have hit `if (!who)` and been classed as housekeeping (no query). It also had `manuscriptId: ""`.
4. **The dashboard has no "with agents · with you · closed" card.** Ruled: the event uses the Query Centre's own counting (`tileCourt`, which `deskSections` counts with). On a desktop the Query Centre (v141) shows a different "where it stands" grouping; **its three `deskSections` courts render only below 768px**, which is where the live check reads them.
5. **The rules would deny a new `activityType`, but not a new `eventKey`.** The event is an existing type with `eventKey: "imported"`, and extra fields pass on create. **No rules change, dev or prod.**
6. **Copy the prompt didn't give, and what I did instead:**
   - **The details link while the panel is open** reads "Close details" (the design's own label). "Done" closes the panel too.
   - **The query rows' panel** keeps its own sentence, "Add what you remember and your timeline stays accurate.". The prompt's foot sentence names the Contact list, which is untrue for a query.
   - **The column matcher** can write more than one event: one per manuscript its rows went into. That is one in the usual run, and rows with no manuscript share an unscoped event. An agents-only matcher run writes one event tied to no manuscript.
7. **The ready list's per-row "Ready" chip is gone** (the design draws none; the band says it).

## Base branch, and why

Dev served `index-CdPbB1Bc.js`. Building `…-qc141-silf` (`d984dc9c`) reproduced exactly that hash, so that was the base. It holds the dashboard with "Agents on file" and "What's on the list today?", the wording fixes, QC v141 and Smart Import loader v2. Nothing newer had been pushed when I deployed, so the dev integration is this branch's tip: no merge was needed, and the branch is pushed as `…-silf-irf1`.

## Step 0 answers

- **(a)** The ways a row is left out: the ✕ on the agents and queries rows; "Remove this one" on the duplicates step; "Remove this row" in the deck. All are excluded from the commit. Only "Remove this row" rows reached the skipped-rows notice, and they did so with "Row has no agent name or agency to identify it".
- **(b)** The reply time. `reviewRows.tsx`: `<WeekSlider value={agent.weeks ?? 6} …/>`. Then `smartImportReviewModel.ts` `responseTimeWeeks: a.weeks` (null when untouched). Then `smartImportCommit.ts` `responseTimeWeeks: a.responseTimeWeeks`. Then `importedAgent.ts` `...(weeks !== undefined ? { responseTimeWeeks: weeks } : {})` with `weeks` undefined for null. **Not saved.**
- **(c)** Open/Closed starts `submissionsOpen: null` → `submissionStatus: null` → `"Unknown"`. Agent fit starts `rating: 0` → `starRating: null` → omitted. **Neither invents a value.**
- **(d) Dashboard cards that rendered real text over empty data while loading:**
  - Agents hoop: "of 0 queried", "0 Querying", "0 ready to query →".
  - Closed hoop: its legend labels.
  - "Agents on file" door: "0 ON FILE" and its copy.
  - "No queries yet" door: title, heading and drawing.
  - Lift tiles: titles and copy.

  The chart had its own pulse skeleton, and the panel had its own bars.
- **(e)** As false premise 3.
- **(f)** As false premise 5.

## The parts

| Part | Status |
|---|---|
| A · the review list | **landed (measured)** — lab IRF-A at 1440, and the dev walk |
| B · set-up centred, ack lead on one line | **landed (measured at 1280 / 1512 / 1920)** — lab IRF-B, and the dev walk at 1440 |
| C · one loading state | **landed (measured)** — IRF-C signed in, pre-query and querying, and the dev walk |
| D · the import's feed event | **landed (code + unit), measured on dev for Smart Import.** The template import and the column matcher are covered by unit tests only, not walked live. |

**A.**
- "Ready to import" is the navy band with the sage tick, the "{n} ready" chip in sage, and "{n} not importing".
- "Don't import" is a labelled pill. It sets the row aside through the same path (`applyAgentRemoval`, `removedReason: "Removed by you"`).
- The row stays in its place on `#f8f5f0` with "Won't be imported" and Undo. The toast and the tray are retired.
- A query left out because its agent was left out shows in place too, and its Undo brings the agent back.
- The panel:
  - It sits under the row, inset 82px, on paper.
  - The name is said once: "AGENCY ONLY" rows alone get an "Agent name" field. The "Referenced by agency only" placeholder and link are gone.
  - Website, genre pills with "+ Add a genre", and "Taking queries?" with neither chosen (press again to un-choose; the note becomes "From you").
  - "Typically replies in: Not set" with a −/+ stepper (6 weeks to start, 1–26) and "Clear".
  - The slider and Agent fit are gone. The foot has the sentence and Done.
- After a change the row reads "✓ DETAILS ADDED" and "Edit details".

**Found by looking at the dev screenshot, after every lock was green:** "Set a reply time" spread across the top of the panel. Its class, `im-ghost`, was already the onboarding ghost container (`position: absolute; inset: 0`). It is `im-ghostbtn` now. IRF-A gained the geometry its attribute reads couldn't see: every control inside its field, and the door's note under its control. Both fail against the build with the collision (`red-base/irf-a-geometry-before-fix.json`).

**B.**
- `.sf-col`, `.o9-solo` and `.o9-welv` are centred. Below 900px and on the account screens nothing changes.
- The ack passage's column is the card's width. Each beat keeps its own measure in its own units: 60ch of the 18.5px serif, and 30em on the 27px lead. The old 60ch sat on the container, so it was 60ch of 16px.
- **IRF-B found one more:** on the confirm step the 1140px card row sat inside the 1280px column, left of its centre. The confirm column now takes the row's width.

**C.**
- Every card carries `d58-skcard`: the doors, the snapshot, the hoops, the chart, the list's focus card, the lift tiles and the founding-writer panel.
- Each card shows its real frame and band, the band plain grey with a shimmer, and nothing inside. The contents stay laid out, so each box keeps its loaded size.
- The section titles beside the cards get the existing grey bar. The header's buttons and the feed tab stay.
- `OneScreenPanel` gains an optional `skeletonClass`; every other caller keeps its own skeleton.

**D.**
- `lib/importEvent.ts` holds the event and the one write all three routes call. The feed renders it as its own card (`feedFamily` `import`), counted as one thing you did and never "From agents".
- The end line gains "Your imported queries keep their own dates…" only when the window holds an import.
- The matcher also removes its leftover "Agent added" rows.
- No backfill.

## What the review hands the import — field by field

**Nothing changed.**
- V4 passes against its existing capture, byte for byte, with only its selector re-pointed to the same control.
- On dev, all 7 imported agents have `responseTimeWeeks` absent, `submissionStatus: "Unknown"` and `starRating` absent.

## Proof

- **Unit:** `importReviewV1.test.tsx` (11; 9 fail against the base, the 2 import-truth cases are guards that pass on both) and `importEvent.test.ts` (20; two named breaks fail it, the singular and "with you" counted as "with agents"). Re-points carry their reason at the line.
- **Rendered:** `tests/e2e/importReviewFeed.measure.ts`, six cases, 105 readings, all green on the branch build (`ledger/`).
  - Against the base build: IRF-B and IRF-C fail on assertions, and IRF-A times out waiting for the Undo the base doesn't have (`red-base/`).
  - Each lock's named in-page break fails it (`mutation-proofs.txt`).
- **Existing suites:** `onbV5Import` + `onbV9`: 133 tests. 6 are red on the base too (P1 ×2, H2 ×2, N3, R1) and are not mine. 5 changed by design and were re-pointed (V5 ×3, the in-place Undo; G3, the notice reason; V4, the selector).
- **Not run:** `importFixes.measure.ts` (a dev walk on its fixture account). `reviewDrive.ts`, which it uses, was re-pointed to read a ready row as ready.

## The dev walk (`dev-walk.json`, `dev-shots/`)

A fresh account signed up on dev (`index-C2WQubzs.js`), walked set-up and Smart-imported `ScriptAlly-import-test-set-2.xlsx`:

1. `1-ack-centred-1440.png`: the step 118px from either side of the sheet's content, the lead on one line.
2. `2-review-dont-import-and-details-1440.png`: Priya Anand set to "Don't import" in place, and Thornfield & Drake's panel open. The header reads "1 NOT IMPORTING · 7 READY".
3. `3-dashboard-loading-1440.png` / `4-dashboard-loaded-1440.png`: 5 cards, all `d58-skcard`, none rendering anything.
4. `5-feed-1440.png`: "You imported your list: 7 agents and 7 queries for Import Test Book.", with "2 WITH AGENTS · 3 WITH YOU · 1 CLOSED", "SMART IMPORT", and 2 things you did. The 7th query is in no group (Withdrawn or Signed).
5. `6-query-centre-courts-414.png`: the Query Centre's courts read **you 3 · agents 2 · closed 1, equal to the feed's groups.**

The feed held one import event and no leftover "Agent added" rows. **Both test accounts were removed afterwards**, data and sign-ins (an earlier walk, before the `im-ghostbtn` fix, made the first). Each walk spent one Smart Import call.

## For prod (Nick)

**Hosting only.** No rules change and no functions change: the event uses an existing activity type and an `eventKey`, which the rules already accept. Merging is yours: this branch sits on the dev integration, not on `main`.

## Worktree

`wt-irf` and the base build's `wt-irfbase` are removed, and their preview servers stopped.
