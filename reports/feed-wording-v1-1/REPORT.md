# Feed wording v1.1: rulings, one voice, links and icons

Branch `feed-wording-v1`, tip 786ac229e, pushed. Dev line `dev/…-laqdoor-fw11`, tip 8a26b1f3e plus this report, pushed and
deployed to dev. `main` and prod are untouched.

## False premises (read first)

1. **Dev is not built from a line that carries controls-entry-v1.** Dev hosting served
   `dev/…-laqdoor` at **51245eb7a**: a clean dev build of that commit gives `index-DQIDPfLr.js`, the served bundle.
   controls-entry-v1's tip (4ab6ea7cf) builds `index-CH1uFFYG.js`, and it sits on the older `…-laqunk` line. Only dev's
   **rules** came from controls-entry-v1: the live ruleset (0d1f1704, released 24 Nov 16:45) is byte for byte its
   `firestore.rules`. So the new dev line is laqdoor plus this pack. controls-entry-v1's code is **not** on it, but its
   rules are, in the one combined file.
2. **The design refs were not in the repo.** They came in `~/Downloads/feed-wording-v1-1-pack.zip`. Both hashes match the
   brief, and both refs are committed in Part 1.
3. **A "told other agents" feed row carries no count.** The count was only in its description, and the feed never reads
   a description back. The told step now writes `toldCount` on its feed row, and keeps it there on an edit
   (`lib/qc152Write`; the write library, not the Query Centre's UI). A told row written before this has no count, so it
   reads its stored words, as built.
4. **A housekeeping row does not say which agent it is about.** Links must resolve from an id, never a name, so the
   rows now carry `subjectId` (written at add, update and delete). Rows written before v1.1, including v1's own, carry
   no id, so their names are plain text. An Added row is still linked through its `act-added-agent-{id}` id.
5. **The Manuscripts shelf cannot take the links.** Its activity card is mounted nowhere: nothing calls
   `manuscriptActivity` or renders `<ActivityCard>`. Its query rows are also `<button>`s, which a link cannot sit
   inside. Left unchanged.
6. **The feed drawer is mounted nowhere either** (no `<Dash58Feed>`). It drew the gear on housekeeping rows and the bell
   on every status-less row. It now draws the same icons and the same links through the shared renderer, so it is
   ready if it comes back.
7. **The rules check held no feed exceptions** (`audits/consistency-v2/exceptions.json`), so none was removed.
8. **The ref's sub-line differs from v1's.** v1 put the deadline ("Send by 26 Nov") in the collapsed card's sub-line.
   The ref shows the agency, or the title in italic where the sentence already gives the agency. I built the ref's;
   the deadline is still a figure on the open card. Every card now shows its time, whatever its day, because the day
   heading sits above it.
9. **The two populations of small rows.** Housekeeping rows are quiet lines at 14 (the brief), so the "identical
   across small rows" lock compares the non-housekeeping rows. Quiet lines are checked separately: 14, muted, and the
   same time style.
10. **`/agents?agent={id}` loses its parameter once it lands.** The Contact list selects the agent and then removes
    `?agent=`. The journey checks the landing by the agent's card opening.
11. **A collapsed card says the first name; the open card's top says the full name.** That follows the brief
    ("(full name, semibold)") and the ref's `rowhl`. v1's wording table is unchanged.
12. **Found and fixed on the rendered page:** the new row link's class `df1-go` was already the "Your next task"
    button's class, a navy fill, so every query row drew a navy bar over its sentence. Renamed `df1-rowgo` (b5f5fd463),
    and every other new class name was checked against `src/`.

## Refs, as found

| Ref | SHA256 | Matches |
|---|---|---|
| `design-refs/feed-type-v1/feed-type-v1.html` | `5a8328b94defe0952d0f3859b2c932cbeec0a60501589ca51df69b3f3ed167e6` | yes |
| `design-refs/feed-icons-v1/feed-icons-v1.json` | `2d61b39fa48963fae4a27d3c66a718e60ad1cf67b97cb58fe8b76720339d3d1b` | yes |

## Commits

| Part | Commit | What |
|---|---|---|
| 1 | 997b19c90 | No line cap; Unknown reads "You updated [X]'s details"; Others told and Offer call sentences; `toldCount` carried; the Owed line in v1's report; the refs |
| 2 | 8d93ff094 | One voice: Source Serif 16 / 1.35 sentences in runs, 14 sub-lines, Mono 12 times under the sentence, the open card starts with its own row, quiet housekeeping lines, the small outline Open query, small fixes |
| 3 | 417281028 | Names are links (`subjectId`, `FeedSeg.to`, `shared/FeedSay`); the collapsed card is a container; a query row opens its query |
| 3 fix | b5f5fd463 | The row link's class collided with "Your next task" (above) |
| 4 | d642bcd63 | `shared/FeedIcon` (the JSON's drawings, byte for byte), `lib/feedIcon`; the gear is gone; search's Add a manuscript |
| 5 | 786ac229e | `tests/e2e/feedWordingV11.measure.ts`, ledgers and pictures |
| 6 | 8a26b1f3e (dev line) | The combined rules file on `dev/…-laqdoor-fw11` |

## Locks, each red first

| Lock | Where | Red first |
|---|---|---|
| Part 1: told (count, 1 / many, carried not parsed), call (title / none), Unknown, no line cap, the write and the rules | `src/lib/feedWordingV11.test.ts` | 10 of 11 failed on the unchanged code (the 11th guards Open and Closed) |
| Part 2 source: sentence, sub-line and time rules, quiet lines, one outline, the small button, nothing under 12, Special Elite only on figures and labels, no disc | same file | 10 of 10 failed against 997b19c90 (`FW11_REF=997b19c90`) |
| Part 3: links by the event's id (two agents share a name), a gone or id-less agent is plain text, titles, sweep, import, row click, several-queries row, the writes, the rules, the renderer, no link in a button | same file | 9 of 13 failed against 8d93ff094's code. The 4 that held are guards: population, plain text, the writers passing the whole agent, the new renderer |
| Part 4: the 13 drawings against the JSON, viewBox and stroke, 12 event types → their key, no gear, search | `src/components/shared/FeedIcon.test.ts` | 15 of 33 failed against 417281028's code. The 18 drawing checks compare a new file with the JSON; changing one character of `agent_added` turned its check red |
| FW1: the longest agency-only headline ("{agency} asked you to revise and resubmit") shows in full, 4 layouts | `tests/e2e/feedWordingV11.measure.ts` | `FW11_MUTATE=E` (the two-line cap back): 4 red checks, every layout |
| FW2: one style for sentences, sub-lines and times across small rows, collapsed cards and open tops; nothing under 12; Special Elite; colours | same | `FW11_MUTATE=2` (the old sizes, typewriter headline): 12 red checks |
| FW3: hrefs, the deleted agent, no link in a button, name click vs card click, focus hand-over; the journey (Enter on a name, a title, a query row) | same | `FW11_MUTATE=3` (links stripped): 4 red checks |
| FW4: 11 event types each draw their own key, population per type; no gear; ink, quiet and rust | same | `FW11_MUTATE=4` (the gear back): 26 red checks |

Clean emulator run, both feed specs: **17 passed**, plus 2 skipped (the pictures, run only on request). v1's FW-J and
FW-E, the latter now a whole-text lock, are green.

## Before and after (same seed; before = v1 tip dcac40b53)

`before-1280x800.png`, `after-1280x800.png`, `before-1512x900.png`, `after-1512x900.png` in this folder. Each holds the
open card's foot, the collapsed card and three or more housekeeping rows. At 1280 × 800 the feed column is about 400 px
tall, so it holds the open card's last row (Open query), the collapsed card and three quiet lines. The hawk overlaps the
column's bottom right, as built (out of scope). `long-*.png` shows the agency-only headline whole in all four layouts.

## Event types left without an icon

- **Offer Accepted from the To-do board.** It carries no status and is not in the brief's table, so it keeps the bell,
  as built.
- **Holding Reply / Agent Reply.** Mapped to `holding_reply`, but their rows still drop at `feedPill` (left alone).

## The dev line, and how it was proved

- Candidates built with `npm run build:dev` in a clean scratch checkout:
  - controls-entry-v1 4ab6ea7cf → `index-CH1uFFYG.js`
  - `…-laqdoor` 51245eb7a → **`index-DQIDPfLr.js`, the served bundle**
- Dev's live hosting release was 24 Nov 15:26:40. 51245eb7a (15:17) is the last commit on that line before the
  release, and the line's tip 822966fba adds no shipped file (`git diff --stat 51245eb7a 822966fba`: docs, a report,
  `scripts/`, `src/test/`, a spec).
- `feed-wording-v1` is cut from 822966fba, so it sits on top with nothing to merge. New line:
  `dev/main-material-icons-v1-…-laqunk-aa215-laqdoor-fw11`.
- Gates on the combined line: tsc 0 errors; build clean; Vitest **0 failed / 13,608 passed** (this pack's baseline:
  0 failed / 13,543); rules suite 255 passed.

## Rules

- **Dev:** `rules-dev.diff` here is the live ruleset (controls-entry-v1's) → the combined file. **28 lines added, none
  removed or changed**: the feed wording keys on both activity validators, `subjectId` in the nested allowlist,
  `toldCount` in the feed update allowlist. The combined file is a three-way merge (base 822966fba). All four
  conflicts were both sides adding at one place; both were kept.
- **Deployed:** ruleset 5294dad5, released 20:34:09Z, byte for byte the dev line's file.
- **`rulesProbe.mjs`:** two results differ from the probe's expectation, both in the package rules, which this pack
  does not touch: "package create, NO letter" and "SENT: clear firstSentAt" are accepted. They come from
  controls-entry-v1's rules as they were.
- **A live check of this pack's keys on dev:** create with `toldCount` and `subjectId` accepted; the told edit's
  `toldCount` update accepted; `toldCount` 0 and a numeric `subjectId` denied; the probe row deleted.
- **Prod:** `reports/feed-wording-v1/rules-prod.diff` is regenerated against prod's live ruleset (9de9d4d0, released
  18 Oct) → this branch's file: +292 / −39. Nearly all of it is other packs' rules that have not reached prod; this
  pack's hunks are the ones commented "Feed wording v1" and "Feed wording v1.1". They go out before this code reaches
  prod (Nick).

## Dev

https://scriptally-dev.web.app serves `index-e4fcj4k2.js`, built from 8a26b1f3e and confirmed against the build.

## Owed

- **Nick:** prod rules (`rules-prod.diff`) before the code reaches prod.
- The Holding Reply / Agent Reply row: its pill, the sentence (built) and its icon (`holding_reply`, built) once
  controls-entry-v1 is on the dev line. controls-entry-v1's hosting must go out on top of `…-laqdoor-fw11`; its rules
  are already there.
- Offer Accepted's icon: no key in the table (above).
- Rows written before v1.1 have no `subjectId` and so no link, and told rows written before have no count.
- The two package-rule probe results above, for whoever owns those rules.
