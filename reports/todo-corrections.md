# To-do corrections pass — Nick's dev walk of `ffc1f45` (6 Aug 2026)

Eight faults, three of them law violations. Every fix landed **with the test that should have
caught it**; the two investigations are at the top, because their answers matter more than the
repairs.

> ⚠️ **The ref was not available.** `todo-fix85.html` is not in `~/Downloads` (only `todo-fix80`
> and `todo-fix84`), so `design-refs/todo-pages-corrected.html` was not created and the corrected
> appearance came from the brief's prose, which specifies all eight concretely. Anywhere the ref
> would have overruled a judgement — exact spacing, the sweep card's face, the bench row's
> geometry — that judgement is mine and should be checked on the walk.

## SHAs

| SHA | Fixes | Note |
|---|---|---|
| `a0cb634` | **1 + 2** | Paired: both are the same fault in `todoColumns` — a column reading a source the count does not. |
| `32682f5` | **3** | |
| `56cae1e` | **4 + 5** | Paired: both are the board card's own template. |
| `7bf8316` | **6 + 7 + 8** | Paired: Today's chrome and its neighbour column. |

**Tests: 158 files, 2605 passed | 2 skipped** (from 155/2583). Three new lock files;
~20 existing cases retargeted to the corrected surfaces, none loosened.

---

## Investigation A — why the column==source invariant passed while the page disagreed with itself

**It was asserting the derivation against a fixture built to satisfy that derivation.** Not the
wrong selector, and not quite the wrong fixture — a fixture whose *shape* only the tested code
accepted.

The old case built a flag as `{queryId, snoozedUntil}` with **no `taskType`**. My column matched
flags loosely (`queryId ?? agentId`); the real suppression path matches through
`flagMatchesTask`, which **requires `taskType` to match first**. So in the test the flag did not
suppress anything: the card stayed in the board's lanes, my column found it there, green.

In the app the flag is complete, so the engine (`db.tsx:838`) drops the task **before the board is
assembled**, and `assembleBoard` does the same for user cards. By the time a column sees the
board, everything snoozed has already gone — **the column was structurally incapable of ever
finding one.** Meanwhile the LISTS row and the chip strip count the FLAGS, and said 1.

**The fix:** the flags are the source for both. `snoozedCards` rebuilds the card a sleeping flag is
hiding, from the flag's own `taskType` + record. **The replacement tests start from an EMPTY lane
set** — proving the column no longer depends on lanes at all — and assert its length against the
*count's* own predicate.

## Investigation B — how Phase 2 passed its header-contract tests while the live page kept the old chrome

**Two causes, compounding.**

**1. A view-scoped render path.** Phase 2 rewrote `renderLedger()` — the **rows** view — and
nothing else. The default view is `cards`, which Phase 4 then pointed at the board. So the three
group cards were only ever reachable by switching views, and the page's own chrome (header,
control line, side container) sat *above* the branch, outside Phase 2's scope entirely. The side
container was built in Phase 1 and mounted only on Today; this page never received it.

**2. Tests that asserted SOURCE PRESENCE, not the rendered page.** Every Phase 2 assertion read a
string *inside* `renderLedger`, which existed and was correct. A source-string test cannot see
that the function it reads is unreachable by default, and cannot see what the page renders above
the branch that function lives in. **It proved the code was written; it could not prove it was
reached.**

**The tripwire:** `todoListChrome.test.ts` slices the page to everything **before the view switch**
and asserts the chrome there — the shape of test that would have failed on the walk's first look.
It caught two real subtleties while being written: the header is *called* in the chrome but
*defined* below it (so call and copy are asserted separately), and `renderHero` legitimately still
carries the old wording because it is dormant behind a red gate.

---

## Per fix — cause, and the test added

**1. The Snoozed split.** Cause above. Tests: the column built from an empty lane set; column
length == the count's predicate; an expired flag yields nothing.

**2. The partition doesn't sum.** Housekeeping is **counted by members** (`hkGapCount` sums them)
and **rendered by rule group** — so fifteen members existed in the count with no card, and nothing
unfolded them because there was nothing to unfold. The count matching the Wish lists facet was the
tell. Resolved per the ref: a group renders as **one sweep card carrying its n-of-m**, and the card
**accounts for** its members (`cardWeight` = 1, or `sweepOf` for a sweep). Members inside a sweep
are removed from the flat lane set so they cannot be counted twice the other way. Tests:
`columnWeight(todo)+today+snoozed === the actionable badge`; the sweep's weight; the no-double-count
case.

**3. The chrome.** Cause above. Header titles the page **"To-do list"** — the same words as the
breadcrumb, because a page whose title and crumb disagree makes you check which is lying — one
line beneath, one action (the pink Add). The review pill is gone; the briefing seat already carries
the review. The side container mounts around the whole body, outside the view switch. The chip
strip is retired: its facets are the LISTS rows, its query chip is the tool row's search.

**4. Band lanes.** `offerDue` returned the literal `"OFFER"` with no reply-by and prefixed
`"OFFER · "` with one — **the right lane's fallback was the left lane's value**. It now states only
the *when*, and nothing when there is no when. Guarded at the template too (`c.due !== c.kind`).
Tests: `due !== kind` across every derived type, at both ends.

⚠️ **The second agent name is NOT traced, and I have not invented a cause.** The meta line is
`agentPrimary(ag) · ag.agency`, read from ONE record: `derivedCard` resolves the agent through the
card's own query, and `dedupeAgentCards` only ever appends a **manuscript** title. A guard test now
asserts a second agent on file never reaches the first's record — and it passes, so the code path
is clean. Two candidates remain: **the `agency` field on that record holding a co-agent's name**
(data, faithfully printed), or **a person-named manuscript** appended by the dedupe. What would
settle it: open Tom Ellery in the agent list and read his agency field.

**5. Ink border.** The CSS was innocent — base was already a hairline, `.urgent` already ink. The
**class** keyed on `warn`, which `derivedCopy` sets true for offers, fulls, stale queries and old
nudges alike: most of the board. Urgency is now the **lane** (`stream === "do"`), the same set the
counting law and the group heading call urgent. Non-urgent hairline takes the brief's `#efe8dc`.
Test: border-presence-iff-urgent.

**6. Button laws.** PageHeader gains an `ink` variant for a page's principal action on things that
already exist; pink stays with creation. Disabled at zero committed, in the house grammar. Test
asserts the disabled rule contains **no opacity** — an opacity-dimmed control looks like a live one
behind glass.

**7. Bench copy.** Header no longer leaks the guarantee; it states the bench and its pool. The
per-row line was falling through to `card.kind.toLowerCase()` — repeating the chip beside it. It is
a reason now, carrying its own evidence. Test: the line never equals the kind. The exclusion rule
is unchanged and still tested at the derivation.

**8. Empty Today column.** One muted inline link to the bench. A card there would look like work.

---

## The one thing the brief asked for that is NOT done

**The sum and column equalities assert the DERIVATION, not the rendered DOM.** The brief asks
twice for DOM-level assertions. This repo has **no jsdom** — `vitest.config.ts` is
`environment: 'node'`, and neither jsdom nor testing-library is installed (CLAUDE.md records this).
Adding one is a tooling decision with a blast radius across 158 test files, not a line of test
code, so it is flagged rather than taken unilaterally. The derivation-level tests do close the
specific holes — they now start from empty lanes and compare against the *other* surface's source,
which is what made the old ones vacuous.

## For Nick — the walk

**https://scriptally-dev.web.app**, signed in.

| # | Where | Check |
|---|---|---|
| 1 | `/todo` | The page reads **"To-do list"** with a subtitle, ONE pink Add, **no review pill**, and the **side container on the left in BOTH views**. No chip strip. |
| 2 | `/todo` side container | Click **Urgent** — only that group shows. Click **Snoozed** — the band. Click the active row again to clear. |
| 3 | `/todo` cards view | **Snoozed column now shows your snoozed item** (it said 0). Its card reads "BACK {date}". |
| 4 | `/todo` cards view | **To do + Today + Snoozed should reconcile with the badge.** Housekeeping appears as **one sweep card per rule** reading "{n} to fix" — that card stands for all n. |
| 5 | `/todo` cards view | An offer card's band reads **OFFER** on the left and either a countdown or **nothing** on the right — never "OFFER · OFFER". Check the meta line reads agent · agency; **if it still shows two people, open that agent and read the agency field** (see fix 4 above). |
| 6 | `/todo` cards view | **Only Urgent-lane cards wear the ink border.** Housekeeping and notes-lane cards are hairline. |
| 7 | `/todo/today` with nothing committed | **"Work the list" is INK and DISABLED** — paper fill, faint text, not-allowed cursor, not a faded pink. Commit one item; it should turn live. |
| 8 | `/todo/today` | Bench header reads **"Suggested for today · THE MOST PRESSING OF THE {n} REMAINING"**. Each row's right-hand line is a **reason** ("an offer is on the table", "oldest unanswered request · {n} days"), not a repeat of the kind. |
| 9 | `/todo` cards view, empty Today | One quiet line: "Nothing committed to today. — lift something from the bench". |
