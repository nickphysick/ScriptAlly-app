# Dashboard v105 — the founding card becomes a press ID

Branch `dashboard-v105`, cut from `dashboard-v93` at 1450f329 (v93 is not merged to `main`). Refs: `design-refs/dashboard-v105/`, 12 files, every hash checked against the pack's list and enrolled in `.refhashes.json`.

## 1. False premises (§0)

1. **0.2 — no account carries a founding number.** The waitlist is keyed by `sha256(normalised email)` and never linked to an account.
   - **Stopped and reported. Nick ruled (27 Oct):** show "No. 0NN" only where the waitlist proves a place, by email join. Everyone else's strip reads "FOUNDING WRITER" with no number. Built that way.
   - **What counts as a place:** a waitlist entry with `status: "verified"` and a whole, positive `position`. `joinedAt` is that entry's `verifiedAt`, falling back to `createdAt`. Pending, waiting and unsubscribed entries prove nothing.
   - **On dev, nobody has one.** There are 78 accounts and 3 waitlist entries; 2 are verified, and the one account that matches by email holds an *unsubscribed* entry with no position. So every dev writer sees "FOUNDING WRITER". The locks seed the number through the stats aid. Prod has not been checked.
2. **The stats doc only existed for writers who had sent feedback**, so an egg-stage writer had nowhere to carry a number. The recompute now also writes a doc for any account that holds a proven place. This adds to v93's recompute; nothing else in it changed. The pack said "only add fields", and this extends the population as well, which is the flag.
3. **The callable's kind strings use a straight apostrophe** ("Something's broken"); the pack writes curly ones. The chips *show* the curly label and *send* the callable's own string, because the function refuses anything else.
4. **0.3 — no `foundingSeenTier` existed.** The users allowlist is `hasOnly([...])`. The field was added there and to `isValidUser` as an integer 0–5.
5. **The ref's slide 1 is not centred.** A stray `padding-right: 60px` from another variant in the cumulative sheet puts the three discs 30px left of centre and top-aligned. Built centred.
6. **"Height below about 230" decides more than the ranks strip.** At 1366×768 the card is 377×194 and cannot hold the photo as well as the buttons. Below 230 tall the photo moves into the strip (as below 330 wide). Below 200 tall the line under the headline also gives way.
7. **At 370 wide the strip cannot hold name + number + ⓘ on one line** (it needs about 394px of 326). Below 460 wide the name sits over the number. On a 250px card (1100×800) the number is 8.5px with tighter tracking, or it ran under the ⓘ. That fault was found by measurement.

## 2. Per part

| Part | SHA | What landed |
|---|---|---|
| A | ec067fea | `foundingNo`/`joinedAt` (email join) and `lastSentAt` on `foundingStats`; `users.foundingSeenTier` (rules + type); `cardTier` |
| B | e1d713b9 | `Dash105Founding`: the ID strip, idle, compose, sent, the steps by size; `lib/foundingCard`; `foundingArt` (the ref's SVG) |
| C | cc880df3 | the hatch and the rank-up, once per new rank; the Dashboard's writer; the dev seen-rank aid |
| D | dddb2826 | `Dash105How`, the slides; v93's card, panel, sheet, `foundingCopy` and `ringFraction` deleted; the laptop row rule moved |
| E | (this commit) | the shots, the hatch frames, this report, the CLAUDE.md lines |

### Each lock: red, then green

Every e2e red is in `mutation-proofs.jsonl`, and every ledger is in `ledger/`.

| Lock | RED | GREEN |
|---|---|---|
| A1 (unit) | `TypeError: (0 , placeFrom) is not a function`, `(0 , lastSentAt) is not a function`, `(0 , cardTier) is not a function`; 10 failed | 36/36 |
| A1 (emulator) | `expected undefined to match object { contributions: +0, tier: null, …(1) }` (no doc for a placed writer), and the `lastSentAt` case | 41/41 |
| A2 (rules) | `the owner writes an integer 0–5` failed against v93's rules. **Range check dropped:** `refuses anything else` failed | 225/225 |
| B1 | v93: `B1 · 1440x900 egg population — null` | 30 readings: the name, "FOUNDING WRITER · No. 023" or "FOUNDING WRITER", the ⓘ in the strip, no How it works link in the body |
| B2 | v93: `Cannot read properties of undefined (reading 'querySelector')`. `B2-all-colour`: `egg colour heads — 6 of 6` | the photo, label, colour heads and one current, at egg / hatching / Fledgling / Mentor |
| B3 | v93: `locator.click: Test timeout` (no card) | the question, placeholder and kind sent per kind (confusing via the chip); Send disabled when empty or whitespace; a refusal keeps the text with the line; ✕ keeps the text; the Compact card opens the panel preset to the kind |
| B4 | v93: timeout. `B4-no-crack`: `the crack is drawn (dashoffset 0) — 60px` | the copy at tier 0 and tier 4, with the first name; dashoffset 0 after 1.5s and under reduced motion |
| C1 | v93: `locator.getAttribute: Test timeout`. `C1-no-end-state`: `reduced motion: the end state … "bird":0` | the real write (absent → 1), a reload shows idle at Fledgling, a skipped rank celebrates the highest (4), the words, the timeline at 0.5s and 2.8s, reduced motion's end state, the account put back (absent) |
| D1 | v93: `locator.click: Test timeout`. `D1-dim-inert`: `dim: closes, focus back on the ⓘ — {"open":true…}` | three slides, centred and 520 wide, the dots, Back/Next/Got it, arrows, Tab trapped (0 of 12 leave), closing by Esc, the dim layer, ✕ and Got it with focus back on the ⓘ, reopening at slide 1, v93's panel gone |
| S1 | `S1-no-steps`: `1100x800 idle-egg every box inside the card — div.d105-photo…`. `S1-number-under-info`: `em.d105-no × svg (16.0×4.4)` (the overlap check catches the number under the ⓘ) | every state at all seven sizes: idle ×5, write ×3 and sent ×2 for two tiers, and the celebration ×3. Inside the card, nothing scrolls, no text cut, nothing overlapping |
| S2 | `S2-green`: `d105-strip rgb(92, 138, 79)`. `S2-squeeze`: `the labels whole — [… "whole":false …]` | no green, no "Nick", and at 370px the three labels whole |
| unit `foundingCard` | v93: `Cannot find module './foundingCard'` | 9/9 |

**Also green on the final build:**
- DB93 A1–A3 and C6 (the laptop rows, from their rule's new home).
- DB71, all eight. F3 and L2 were re-pointed; F3's floor is 103, because the photo now moves into the strip on short cards.
- DB77 A1–A4 and D1; DB58 F1–F3, H1, R2, A1–A2, L1.

**Faults found and fixed during the build:**
- **Aid-supplied stats wrote a real rank (Part C, fixed in D).** Suites that seed a tier through the stats aid made the card celebrate for real and write that rank to the harness account. It wrote 4 once and 2 once; C1 caught both and put the account back. A rank worked out from aid-supplied stats is now recorded in the page and never written. Only C1 asks for the real write.
- **The flying crack escaped the box (fixed in D).** About 1s into the hatch, the egg-top's crack escaped the rounded art box in Chrome despite `overflow: hidden`. A `clip-path` with the same radius holds it.

## 3. Baseline vs final

| Gate | Baseline (1450f329) | Final |
|---|---|---|
| tsc (root, functions) | clean, clean | clean, clean |
| `vite build` / `build:dev` | clean / clean | clean / clean |
| Vitest | 646 files · 9,935 passed · 3 skipped | 646 files · 9,943 passed · 3 skipped (after Part B: 647 · 9,955; Part D deleted `foundingCopy.test.ts` and the ring tests) |
| Rules emulator | 4 files · 222 passed | 4 files · 225 passed |
| Functions emulator | 2 files · 39 passed | 2 files · 41 passed |
| Dashboard e2e (dashV105/93/71/77/58) | — | 29 passed (the v105 suite: B1–B4, C1, D1, S1, S2; and the kept DB93/71/77/58 locks). B1, B2 and D1 also green against deployed dev |

One Vitest run after Part A timed out on a whole-source sweep (`marketingLinks.test.tsx`) at a load average of 22. It passes on its own (15/15) and on every later full run.

## 4. Shots

`shots/`:
- `card-{idle-egg,idle-hatching,idle-fledgling,idle-mentor,write-like,write-dont,write-idea,sent-0,sent-1,hatch,rankup}-1440x900.png`;
- the idle egg at 1100×800, 1280×650, 1366×768 and 1920×1080;
- `how-1/2/3.png`;
- the hatch as six frames, `hatch-frame-{1..6}-{0,600,1050,1400,1800,2600}ms.png`.

**What each size shows:**
- **1440 (370×290):** name over number, the 84×96 photo, the buttons across the body with the icon above the label, the heads above the note.
- **1366 (377×194):** the head in the strip, one-line headline, buttons in a row, heads only.
- **1280×650 (332×128):** the strip and three round buttons that open the sidebar's panel.
- **1100 (250×212):** the head in the strip, two-line labels.

## 5. For Nick

- **Retired v93 locks:** DB93 C1, C2·C3, C4·C7 (Part B) and C5 (Part D), and `dashV93Shots`. Also deleted, unreachable after the panel went: `Dash93Founding.tsx`, `dash93.css` (its one live rule moved unchanged), `lib/foundingCopy` (+ test) and `ringFraction`. All listed in `tests/e2e/RETIRED-dashboard-v105.md`.
- **No founding writer on dev has a number.** The email join finds one account, and its entry is unsubscribed. Prod hasn't been checked. If real founders signed up with the email they joined the waitlist with, they'll match; if not, they'll see "FOUNDING WRITER".
- **The prize-draw line still needs terms before launch.** It appears on the card ("Top contributors enter a weekly prize draw…") and on slide 3 ("Each week our top contributors are entered into a prize draw…"). Nothing runs a draw.
- **Every existing writer at Fledgling or above sees one celebration on first load**, because nobody has a `foundingSeenTier` yet. That is the rule as written; say if you want existing ranks marked seen instead.
- **Dev:**
  - **Rules** (`foundingSeenTier`) went live at 22:35:53Z on 27 Oct, from the v93 stack plus this branch.
  - **The two `foundingStats` functions** were deployed from the same source.
  - **Hosting:** `dev/…-cl253-db93-cl254-cl255-db105` (`0023e2d0`) serves `index-DYV2msSU.js`. That is the Contact list v25.5 stack another session deployed tonight, plus this branch; its rules equal what was already live.
  - **Prod:** untouched.
  - **Nothing pushed:** the branch and the dev stack branch are local.
- **The CLAUDE.md entry is three lines, not one.** The pack's line, plus two warnings: where the number comes from, and that the e2e helper must default the seen-rank aid or a lock will write to the account.
