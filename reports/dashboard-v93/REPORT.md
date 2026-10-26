# Dashboard v93 — the task card's kind band, and the founding card becomes "Your contributions"

Branch `dashboard-v93`, cut from `dashboard-v77` at bc5fa4a1 (v77 is not merged to `main`). Refs: `design-refs/dashboard-v93/`, 13 files, every hash verified against the pack's list and enrolled in `.refhashes.json`.

## 1. False premises (and the §0 evidence)

**§0 evidence:**
- **0.1:** the base holds Dash77Founding, lib/feedbackRecord, lib/sendFeedback and the owner-read `betaFeedback` rule.
- **0.2:** the `Dash71Task` head is a kicker pill, the pager and the segments, and `KIND_STYLE` covers nudge, close, send and other (other uses the item's own label).
- **0.5:** no weekly question exists anywhere.

The false premises:

1. **0.3 — no account is marked as a founding writer.** The waitlist (`waitlist/`) is keyed by email and never linked to a uid. `redeemInviteCode` marks a code used against an email, before the account exists. v77's card is shown to every signed-in writer.
   - **Not a STOP:** the server can list everyone it needs. A standing ranks only writers with contributions, and every contribution is a `betaFeedback` doc carrying the verified uid. So the population is the uids on `betaFeedback`, plus anyone already holding a `foundingStats` doc.
   - The card is shown to the same writers as v77's.
2. **C5's "task 254 at 1440×900" assumes the ref's 560px column; this app's is 572 there (0.4).** With the founding card at its 290, the task card is 266.
   - DB93 C6 is locked to the rule the pack states: founding up to 290, task at least 254, the bottoms in line, 14px above the tab.
   - At 1366×768 the task card is exactly 254 and the founding card 194.
3. **The app's right column is narrower than the ref's (494px):** 370 at 1440, 377 at 1366, 332 at 1280, 250 at 1100. The ref's card at those widths overflowed by up to 36px. Both cards therefore also step by their own width; everything below is measured.
   - **Task band:** the "N OF M" text gives way under 420px of card (the arrows stay), and the title is 16px under 300px.
   - **Founding card:** the stat line leaves the column under 440px, the band title steps to 15px under 360px, and the 1100×800 card has a 56px medallion and two-line band text.
4. **A 254px task card cannot hold a close or send item's sentence as well as its reply bar or steps.** Measured on v77: 242 and 220px needed against ~146. In the short shape (≤900px tall) those two kinds drop the sentence, as v71 already does below 760px; the title, bar and steps stay whole. Nudge and housekeeping keep their sentence.
5. **Two older faults found by the new locks:**
   - The reply bar's "Expected" label ran off the card, or over "Today", when its date was near or after today (on v77, at 1366×768). It is now placed by measuring, and hidden only when the row can't hold it.
   - "Agents are waiting" and "Consider closing" were cut in the band next to "N OF M" (DB71 G1).
6. **Copy the pack doesn't give:**
   - Before the first contribution the kicker reads "FOUNDING WRITER" (no level).
   - At exactly 1 the stat line follows the ref and drops the standing.
   - The compact line is "The {Tier} · {n} contribution(s) · {toNext} more to {NextTier}", with "· n waiting" added when there are waiting notes.
7. **The ref's rust number is ink in the ref itself** (its `.so b.r` never applies to the stat line). Built as the pack says: bold and rust.

## 2. Per part

| Part | SHA | What landed |
|---|---|---|
| A | 48dafb88 | the task card's kind band, the short-shape body, the "Expected" label and band-title fixes |
| B | cf930dc9 | the contribution rules, `foundingStats` (trigger + nightly), the rules, `useFoundingStats` |
| C | 5870b1fa | `Dash93Founding` + the How it works panel, the C5 rows; v77's card and `lib/feedbackRecord` retired |
| D | (this commit) | the shots, this report, the CLAUDE.md lines |

Each lock, red then green (every red is in `reports/dashboard-v93/mutation-proofs.jsonl`; the ledgers are in `reports/dashboard-v93/ledger/`):

| Lock | RED | GREEN |
|---|---|---|
| A1 | v77: no band, title "", the kicker pill present. `A1-tint`: every kind rgb(232, 238, 246) | all four kinds visited; nudge rgb(42, 58, 82), close rgb(228, 223, 215) with ink, send rgb(162, 69, 42), other rgb(95, 117, 145); titles exact; Special Elite; the pager in the band |
| A2 | v77: no band (−1 against 46). `A2-tall`: 52 against 46 | the band 46.0 = the chart band 46.0, every kind |
| A3 | v77 at 254px: send body 175/133; nudge "Expected" outside the card. `A3-tall-body`: 152–166/145. `A3-label`: the label over "Today" | all 34 items, four kinds: inside the card, nothing scrolls, the title whole, the bar's labels apart |
| B (unit) | the module absent; no weekly cap (4 failed), `counted:false` ignored (1), a level may fall (2), a four-word floor (1); rounding to the nearest 5 rather than up survived until a 3-of-11 case was added, then failed | 20/20 |
| B (rules) | no rule: the owner and admin reads denied. Read opened to any signed-in writer: another writer's read allowed | 5/5; the full rules suite 222/222 |
| B (emulator) | the store ignoring stored peaks: "the level never falls" failed | 3/3; the emulator suite 39/39 |
| B (trigger) | — | Functions emulator, demo project: a status set on a `betaFeedback` doc wrote `foundingStats` {1, fledgling} within 1s |
| B3 (unit) | the client's Scout minimum drifted to 7: 2 failed | 7/7 |
| C1 | `C1-no-variant`: Full at 1366 and 1280 | 1440×900 Full; 1366×768 **Medium**; 1280×650 Compact; 1920×1080 and 2560×1440 Full and centred (±4) |
| C2 | naturally: 0 and 1 with waiting ran past the 290 and 194 cards; the 1100×800 card cut (via DB71 F3) | 199 readings: 6 sizes × 0/1/6/11/25 × waiting on/off, nothing outside the card, nothing scrolls or is cut; all three variants visited |
| C3 | `C3-all-colour`: 5 full-colour heads at 0, 1, 6 and 11 | full-colour heads 0/1/2/3/5; one current (none at 0); rings 0, 0.6 and 1 |
| C4 | `C4-copy`: the stat line wrong, and "Nick" found | eight cases exact (6, 11 with topPct null, 2 → "an Archivist", 1, 0, 16, 25, 6 + waiting); no "Nick" in the card or the panel; the unit table 9/9 |
| C5 | `C5-dim-inert`: the dim layer does not close it | opens 440px at the right with focus inside; closes by ✕, Esc and the dim layer; focus back on How it works; no weekly-question rows |
| C6 | `C6-fw-194` (v77's row): 194 against 290 | 1440×900 and 1512×900: founding 290, task 266; 1366×768: founding 194, task 254; bottoms equal; 14px above the tab |
| C7 | `C7-green`: rgb(92, 138, 79) | no colour with hue 80°–170° above 15% saturation in either card or the panel |

**Also green on the final build:**
- DB71: all 8 cases. C1, G1 and F3 were re-pointed; F3 caught the 1100×800 card.
- DB77: A1–A4 and D1.
- DB58 R2.
- Retired: DB77 C1–C6 and the v77 shot spec (`tests/e2e/RETIRED-dashboard-v93.md`).

## 3. Baseline vs final

| Gate | Baseline (bc5fa4a1) | Final |
|---|---|---|
| tsc (root, functions) | clean, clean | clean, clean |
| `vite build` / `build:dev` | clean / clean | clean / clean |
| Vitest | 644 files · 9,915 passed · 3 skipped | 646 files · 9,935 passed · 3 skipped |
| Rules emulator | 4 files · 217 passed | 4 files · 222 passed |
| Functions emulator | 1 file · 36 passed | 2 files · 39 passed |

Vitest's count reflects:
- **Removed:** the v77 record's 16 tests.
- **Added:**
  - the rules (20);
  - the client (7);
  - the copy (9).
- The handle lock gained a name in its list, not a case.

## 4. Shots, beside the refs

`reports/dashboard-v93/shots/` (6 contributions unless named; seeded through the dev-only aid):

| Ours | Ref |
|---|---|
| `card-1-1440x900.png` | `design-refs/dashboard-v93/shots/card-fledgling-1.png` |
| `card-6-1440x900.png` | `…/shots/card-archivist-6.png` |
| `card-11-1440x900.png` | `…/shots/card-scout-11.png` |
| `card-0-1440x900.png`, `card-25-1440x900.png` | (no ref) |
| `how-it-works-1440x900.png` | `…/shots/how-it-works-panel.png` (without the weekly-question rows) |
| `task-other-1440x900.png` | `…/shots/task-head-A.png` |
| `task-nudge/close/send-1440x900.png` | (no ref) |
| `page-{1280x650,1366x768,1440x900,1920x1080,2560x1440}.png` | (no ref at these sizes) |

**Known differences:**
- The card is 370px wide at 1440, against the ref's 494, so the stat line runs under the medallion.
- The medallion's drawings are the existing full drawings the pack names; the courier stands in for the QueryHawk.

## 5. For Nick

**How a note becomes a contribution (Firebase console → Firestore → `betaFeedback` → the doc):**

| Field | Type | Effect |
|---|---|---|
| `status` | string: `read`, `planned`, `built` or `fixed` | the note counts (if it has at least five words), up to three a week by `createdAt`; `built` adds +3 |
| `counted` | boolean, set to `false` | excludes the note (junk, repeats). Absent or `true` changes nothing |
| *(no status)* | | the note is "waiting to be read" |

The writer's card updates within seconds of the change. A level never goes down: the stored `peakTier` holds even if a status is taken back.

**On dev:**
- **Functions:** `foundingStatsOnFeedback` (the trigger) and `foundingStatsNightly` (03:00 Europe/London) are deployed to `scriptally-dev`, europe-west2.
- **Trigger retry:** the trigger needed one retry. The first attempt hit Google Cloud's first-use Eventarc permission, which took a few minutes to take effect.
- **Rules:** `foundingStats/{userId}` (owner or admin reads, no client writes) was deployed from the current dev tip (`dev/db71-plad-db71f-cl25-lm2-cl251-lm3-db77-lm4-cl252-pk40`) plus that one rule. The release's `updateTime` moved to 2026-10-26T22:41:52Z.
- **Prod:** rules and functions are yours. Prod's functions also need `functions/.env.gen-lang-client-0801391782`, as CLAUDE.md records.

**1366×768 shows the Medium variant** (a 194px card: no ladder, an 80px medallion, the same words).

**Placeholder art:** the tier heads in `public/images/founding/tiers/` are crops of existing art until the illustrator draws the five tiers.
