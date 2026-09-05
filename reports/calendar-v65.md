# Calendar v65 — run report (§A · §B · §C · §D · §F built; **§E stopped, and why**)

Refs (Phase 0, all four verified before anything was read):

| ref | sha256 | title |
|---|---|---|
| `timeline-v65.html` | `981b360d6b76…` | ScriptAlly — Calendar v65 · design of record |
| `action-journey.html` | `b363147c683b…` | ScriptAlly — the action journey |
| `bar-hover-states.html` | `212c494a2791…` | ScriptAlly — bar hover states |
| `hover-card-by-type.html` | `f0ffe9a727a3…` | ScriptAlly — hover card C by bar type |

All four arrived in `~/Downloads` rather than `design-refs/`; each was hash- and title-checked
there, copied in, and **enrolled on the watchlist** (`3adf6538` — 29 refs guarded). Commits
`55ef8c4c` → `d43d532c`. Deployed to dev at `d43d532c`, served hash `index-2EEV90zD.js` verified
against the build. Screenshots in `reports/cal-v65/`.

---

## ⚠️ §E IS NOT BUILT, AND BUILDING IT AS WRITTEN WOULD HAVE BROKEN TWO LAWS

§E asks for "a single modal component, `openAction(kind, subject, prefill)`, called identically"
from five entry points. Two independent findings stopped it. Both are decisions for you.

### 1 · The four kinds already exist, on the surface §E would wire them to

Query Centre has **`NudgeDesk` · `MarkSentDesk` · `RespondDesk` · `MarkClosedDesk`** — §E's four
kinds, in an in-flow "desk grammar", committed and **actively being refined** (`b8dd92c7`
drawer-3 §§1–3, `7a5da5e2`, `8dfa6131`, `f2c5eb55` — all within the last few commits on `main`).
They are not sketches: `RespondDesk`'s own header reads *"A COMPACT RENDERING OVER THE EXISTING
MODEL, NEVER A SECOND ONE"*, and `MarkClosedDesk`'s says its save *"goes through the ONE response
primitive, which the old menu's direct `updateQueryStatus` never did"*.

Building a new modal for the same four verbs would make a **fifth** implementation of the app's
four most important writes (QC's desks, To-do's `FocusFlow` journeys, and mine) — which is
precisely what §E's own lock forbids ("one component in one module"), committed in §E's name. And
wiring it into Query Centre would give that page two ways to record one response.

**The decision is which existing implementation becomes the shared one:**

- **(a) The desks become the component.** They already share the model and the save primitives;
  what they do not share is a modal chassis or a mount outside QC. The Calendar and To-do would
  mount them. Cost: their bodies are styled for an in-flow desk, and the files belong to a live
  session.
- **(b) The sheet replaces the desks everywhere.** Honest to the pack and to `action-journey.html`,
  and it means rewriting another session's actively-edited surface — a cross-session act.

What I did instead of guessing: **built the seam and left it empty and honest.** Every action door
on the Calendar — the bar's button, the card's action, all six drawer rows — calls one function,
`requestAction(kind, subject)`, which today answers with the press receipt and **writes nothing**.
No fake commit, no half-journey; one function to fill when you have ruled.

### 2 · §E's materials picker contradicts three standing laws

§E names the picker's contents: *Query letter · Synopsis · First three chapters · First 50 pages ·
Full manuscript · Revised manuscript · Author bio · Comparable titles*. The repo says otherwise, at
the value, with reasons:

- **`PACKAGE_MATERIALS` is deliberately TWO** (Query letter, Synopsis) and says so: *"TWO, NOT
  THREE. Sample pages is retired as a material type (D9): a package is a covering letter, a
  synopsis and a VERSION, and the portion that actually went is the agency's decision, recorded on
  the query."*
- **Full manuscript and Author bio are excluded from BOTH material surfaces** — CLAUDE.md's law of
  11 Aug, with *"a standing instruction not to reinstate"*, reached independently by the model and
  the design (*"which is why this is a law and not a judgement call"*).
- **A fixed "First 50 pages" / "First three chapters" option contradicts the unit-unknown rule**:
  `ComponentType.SAMPLE_PAGES` reads *"Opening sample", never "Sample pages"*, because three
  different units map to one artefact and a fixed label *"asserts a unit the data does not carry"*.

So the pack's literal list would have reinstated two materials the app deliberately dropped and
invented a unit the record cannot state. The compatible reading of §E's own words — *"the Query
Centre's materials picker **by identity**"* — is the app's own request-derived rows
(`materialRowsFromAgent`, which is what `MarkSentDesk` already pre-fills from). That is what the
sheet should use; it is not what the bracketed list says. **Flagged, not resolved.**

---

## What was built

### §A — the read gestures shed their machinery (`e0f540e4`, −682 lines)

Retired entirely: the hover tip (element, bind-once effect, and every `data-tip` a bar carried —
nothing advertises a tooltip that no longer exists); the hover-widen and its apparatus (the fit
pass slims to the sliver hide alone — `--exp`/`--hx`, `data-tight`, `data-nodetail`, `data-tier`
all served the v54 widen and the v40 ladder); and the legacy task pane — the work split, the
collapsed day column, the workspace's read/know columns, the `TaskPane` session, `FocusFlow`'s
mount and four imports. The CSS went with the render (`.tl-split`, `.tl-col*`, `.tl-ws*`,
`.tl-read*`, `.tl-know`, `.cal-flow`'s scoping and three media steps) — a rule with no subject is
how the next reader is misled.

**One near-miss, recorded:** a comment-walk-back in my own excision script ate `.tl-xhlab`'s tail
and a reduced-motion block's close. Caught by a brace-balance check, restored from HEAD. The same
shape ate `dragWindow`, the toast timeout and the density state in §B — caught by `tsc`. Both are
the "verify a removal against the post-edit FILE, never the diff" rule earning its keep twice.

### §B — hover is lift and reveal, nothing else (`d4cbd3f8`)

Bar lifts +2/−2 (**measured: `matrix(1,0,0,1,0,-43)` → `(…,2,-45)`**); its OWN action fades in,
paired by segment key (the page sets `.on` and publishes `data-for`/`data-seg` — CSS cannot match
one sibling's attribute to another's); the symbol wakes to ink; a ghost goes to full opacity and
**moves nothing**. Identical in both densities — the v64 compact peek is retired wholesale, its
job reassigned to §C's click card. Hover never writes, navigates or mounts (asserted: tip, pill,
peek and pane all 0 on hover *and* on click).

**Found by the lock before it shipped: THREE `.tl-p:hover` rules.** §B's 2px lift was rendering as
the v37 block's `scale(1.004)` two hundred lines below it, through a clean build. The pass owns
every declaration of the selector now: one rule, base transform restated in full, and the hover
**shadow** retired with its token — a shadow change is "something else changing".

### §C — the click card, by type (`c70e0497`)

`src/lib/cardC.ts` — pure, over day-floats, **unit-locked against the ref's own eight worked
examples** (16 cases): the gauge's two regimes (a modest overrun ≤¼ window **overhangs** in rose —
the ref's 8% sample; a long silence **rescales** to sent→today and fills sand past the expected
mark — the ref's 22/78), elapsed-with-today-at-tip where no end is named, no today marker on
finished stages or closed rows; counter one always the eyebrow's number, two and three per the
by-type table, **a dash where the data cannot say**. Nudge counts are real (counted from the
activity feed's `NUDGE_SENT`). Proved red by moving the regime threshold.

The card is a page-layer overlay (portal to body, z46, 320px, the ref's hairline/radius/shadow):
band with the app's own `StatusDot`, `Open ›` and `✕`; name and agency; fact and eyebrow; gauge;
three counters; last note; the action with its Caveat lateness. Same bar again, elsewhere, Escape
or a scroll closes it; **a bar's action button never opens it** (the sheet path is direct); one at
a time; flips upward when out of room. **Seven distinct card branches exercised on the fixture in
one run.**

**Two faults the first probe caught:** the payload read the *window-clamped* start, so a request
from last year said "45 days since request" beside a 29-month tail (the gauge is its own axis and
owes the window nothing); and a silence with no named end drew an empty right label under a full
bar. The fill tone is **kind-driven** — a quiet card keeps its status band and still fills sand.

### §D — the drawer (`3b4a0ef9`, `65d90b46`)

420px from the right; View / Actions; footer to Query Centre. View states the **journey ending at
a single "now" rung**, built from the same nodes the board's ghosts are drawn from. Actions leads
with the primary deed (outlined, Caveat lateness when urgent) then the pack's set. Landing tab
follows urgency with the rose "1"; Esc and click-away close; opening it closes the card.

**⚠️ The board now isolates its own z ladder.** `.tl-rail` is z50 so it outranks the rows and the
today line *inside* the board; without `isolation: isolate` on the boardpane that 50 competed at
page level and **painted the date row and group bars straight across the drawer's left edge** —
measured, then fixed at the source rather than by inflating the drawer.

**A lock fault, named:** my helper picked "calm" rows by `.owes` — `some(sg.owed)` — while the
board and the drawer both read `owed || quiet`, the two arms of `calSectionOf`'s `isUrgent`. It
handed the calm case a row the board itself calls Urgent, and the failure read as a landing-tab
bug. It picks by the **Urgent group** now: the partition the reader sees. The landing rule is
asserted on **both** classes and was proved red by making every drawer land on View.

### §F — the sidebar's cards (`d43d532c`)

Group, Filter and Sort each a white card (hairline, 10px) on the page cream; a control's options
unfold **inside** its card — the open row squares its foot, the options continue it with no border
between them. Folded into the existing panel lock rather than given a second one: §F changed the
panel's form, not its behaviour.

---

## Locks

New: `calHover65` (4), `calCard65` (4), `calDrawer65` (5), `src/lib/cardC.test.ts` (16).
Retargeted by v65's own retirements: `calDens64`'s peek case → a **retirement with its successor
named** (the card asserted present, in compact, over the same bar — "the peek is gone" alone would
pass on a board where the click had stopped working too); `paneCommit`'s FocusFlow-caller case →
the To-do page is the caller now, **and the Calendar's absence is asserted too**; `calFrame63`'s
panel case gains §F's card assertions; the Caveat census grows from one site to three (bar's deed,
card's lateness, drawer's primary — all the action's hand).

Full board green: 43 measurement cases across the v63/v64/v65 files in one run, plus the four
files above. `tsc` clean, production build clean, full Vitest green except three cases in
`taskPanePort.test.tsx` — another session's live `TaskPane.tsx` edit, provenance established by
reading rather than by moving.

---

## Debts and flags

- **§E, both findings above.** The seam (`requestAction`) is one function, waiting.
- **The §D commit message is damaged** and was left rather than amended: backticks in the heredoc
  were shell-evaluated, so it lost `requestAction`, `.tl-rail`, `isolation: isolate`, `.owes`,
  `some(sg.owed)` and `owed || quiet`. `--amend` rewrites whatever ref is at HEAD in a shared
  checkout; the remedy was a follow-up commit (`65d90b46`), and every later commit went through
  `git commit -F`.
- **A To-do row tick and a QC card button are unwired** — both wait on the §E ruling.
- The focus band below the board survives (the v65 ref keeps `data-focus="on"`), but its "Open the
  task" button went with the pane; the band is now read-only until §E lands.
