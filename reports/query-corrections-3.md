# Query Centre — correction pass 3

Run of 5 Sep 2026 · ref `design-refs/query-panel-v7-agent-tab-dedup.html` (sha256 be01f5a9…, verified, committed `70a8155f`, **enrolled** — surgically via `--update <path>` so the manifest gained exactly one line; the v6 ref stays unenrolled under its standing quiet-window deferral). Commits `70a8155f → 9b0c31f7 → 8dfa6131` + the harness/report commit carrying this file. Gate at each: tsc 0 · production build clean (whole log) · full Vitest 0 failed (7,362 passed at 8dfa6131).

---

## False premises and surprises, first

1. **"Its top bound is the drawer's top (below the app masthead)" — the drawer's top is `0`.** Measured before fixing: `.qpn` is a full-height takeover (`position: fixed; top: 0; bottom: 0`), so the brief's literal bound (`drawer.top + 12` = 12) is exactly today's viewport clamp and changes nothing. The INTENT — the desk must clear the app masthead — binds to the content window: `.ws-window`'s top (110 at 1440 and 2560, measured; re-read at place time because dismissing the beta strip moves it) + 12. The harness asserts the intent bound, plus `drawer.top === 0` so the premise stays measured, plus the literal bound (satisfied trivially).
2. **Item 2's suspected cause was close but the mechanism subtler.** Not a `?q=`-keyed chooser: an ANCHORED popover whose `useFixedMenu` trigger ref survived only in the dead `GRID_IS_THE_PAGE = false` browsing branch. The live drawer's "Mark closed" opened the state with **no trigger mounted**, `menuStyle` came back empty, and a `position:`-less div rendered **in normal flow** at its mount point — the inline block under the hero. A fixed popover with no anchor doesn't misplace; it stops being fixed.
3. **The blank-qty screenshot was the RECORDED branch, not the absent one.** The absent branch was already correct (previous run's JSON: qty "10", no label, on cor-move-a). The broken branch: a recorded quantity that **parses to zero** — the journey's own payload stamps `"0"` on request rungs, and `parseQty` of prose is 0 — so `formatQty(0)` rendered `""` while `"0" === "0"` kept "as asked" on. Zero and absent now take the same branch: unit default, no label.
4. **The v7 facts line names two fields `Agent` does not have.** "role" and "est. year" exist in the ref's mockup data only — no `role`/`established` on the model. The line renders the segments that exist (flag + place, door pill right); the missing ones are absent, not invented, with the lock asserting exactly that.
5. **No rules emulator on this machine** (no Java runtime), so §0's "rules emulator probe" ran against LIVE dev instead — the same field-by-field instrument that found the gap, red before and green after, with the unknown-key refusal asserted to survive the widening.

## §0 · Rules — authorised, applied, deployed *(commit 9b0c31f7 — rules alone)*

**The first do-not-touch edit of this stream's runs**, under the pass's explicit authorisation, scoped to finding 1 exactly: `isValidActivityNested` gains `materialsType` / `materialsQuantity` / `fullVersionSent` / `feedbackType` in `hasOnly`, each with a size-capped string validator in the file's own idiom. Nothing else in the file.

- **BEFORE** (live probe): base ten-field shape ACCEPTED · each of the three extras DENIED · an unknown key DENIED.
- Deployed `--only firestore:rules --config firebase.dev.json --project scriptally-dev`; 30s wait.
- **AFTER**: all three ACCEPTED · **the unknown key still DENIED** (the refusal survives the widening).
- **The R&R substitution repaid**: the harness's post-save scene now records a **partial** — green against the served `620ccb85` bundle, the account probed clean immediately after (status, both stores, no orphans).
- Prod untouched; the same file reaches prod on Nick's next `npm run deploy:rules`.

Two residue incidents from the repayment run, both cleaned and both now foreclosed: the earlier 8/8 run's Undo was still **in flight when its test ended** (the rung delete had landed; the status revert and feed-twin delete died with the page) — cor-move-b sat at Revise & Resubmit with a feed orphan the reseed's same-id sweep could never find. Deleted by hand, reseeded, and the test now **polls the card's own status back to Queried** after the press — the whole undo, observed, not just its first write.

## §1 · The desk clears the masthead *(commit 8dfa6131)*

Clamp bounds in `CorrectionDesk.place()`: `minTop = .ws-window top + 12` (viewport fallback for a windowless host), `maxTop` unchanged against the viewport foot. The notch clamps along the card's own edge (`10 … h − 26`): a bar anchor above the card's reachable top gets the nearest point rather than a notch floating off the card — the button-centre equality now holds for anchors the card can reach (the ⋯/rung case), which the harness keeps asserting via the pseudo-element's computed position against the button's own rect.

## §2 · Mark closed joins the desk *(commit 8dfa6131)*

Retired whole: the `isCloseMenuOpen` state, its `useFixedMenu` cluster, the in-flow mount, the dead-branch trigger attributes, and `RibbonMenuItem` (orphaned — its only render was this menu). **`MarkClosedDesk`** is the fourth verb: three reason cards with real `StatusDot`s (Rejected · Withdrawn · No Response), date (max today), optional note, the brief's derived line (`Status becomes **Closed** — {reason}.` + the nudge-retired clause only when a future nudge exists), the ghost through the one `proposedAny` channel, Escape/notch/focus from the shared host. **One `recordQueryResponse`** with the primitive's own reason mapping (rejected → rejected; withdrawn/no-response → the close path + `closingReason`) and the receipt's Undo — where the old menu wrote status bare through `updateQueryStatus`. Both live openers (the top bar's Mark closed, the closure offer's) notch the desk to their own button and take the accent ring. Below md the nudge modal's "close instead" hands to the more-sheet, which already carries the close rows.

**Cascade rule applied**: `RibbonMenuItem` deleted with its only caller; the first surgical cut over-reached (a `rfind` back-anchor swallowed 143 lines of unrelated helpers — caught by tsc naming six lost symbols, reverted, re-cut on the component's own banner). The mobile sheet's direct `updateQueryStatus` close rows are pre-existing and out of scope — reported, not touched.

## §3 · Honest quantities *(commit 8dfa6131)*

`askedN = parseQty(recorded)`; `askedN > 0` is the only recorded-ask branch — the field pre-fills with the figure and "as asked" tracks it; zero/unparseable/absent all take the unit default with no label. Locked at the seed (both halves of the brief's assert) and rendered in the harness (cor-move-a records no figure → default `10`, no label).

## §4 · The Agent tab drops its hero *(commit 8dfa6131)*

The tab opens on `.qat-facts` — flag + place, door pill right (`Open/Closed … submissions`, the two-systems vocabulary) — then acts, tiles, wishlist, asks-for, history, links, all unchanged. The hero's markup, its CSS (`.qat-hero/.qat-av/.qat-nm/.qat-ag/.qat-loc`) and the monogram helper went together. The kickers keep their first-name form ("Priya asks for") — a name-part, not the identity row. Locks: the tab's own markup never contains the full name; the facts line invents nothing; the drawer-level name-count is the harness's (exactly 1 with the Agent tab active).

## §5 · Data, not code — for Nick

- **`Sent —`** on Priya Raman's header: [Queries.tsx:5963](src/components/Queries.tsx:5963) renders `dateSent ? fmtShortISO(dateSent) : "—"` — the query document has **no `dateSent`**. The em-dash is the honest absent-date rendering.
- **`Dear PRIYA,`**: `nudgeDraft` takes `agentName.split(" ")[0]` verbatim — the record stores the name upper-case (`PRIYA RAMAN`). No casing transform exists in the path, and none was added.

## Red-then-green ledger

Every new lock proved red by mutation and restored green: the zero-guard reverted (§3) · a panel verb deadened (§2's both-anchors count) · a bare `updateQueryStatus` in closed's save (§2) · the full name sneaking back into the tab (§4). Along the way, two of my own instruments failed honestly and were fixed as found: a lock's comment-strip was half-applied (block comments only — a `//` line matched `recordQueryResponse` and inflated a count) and a first-match slice needed re-anchoring when `saveDeskClosed` became a second legitimate caller of the primitive.

## The harness — 9/9 (`reports/query-corrections-3.json`, shots in `reports/query-respond-nudge-shots/`)

| claim | 1440 | 1920 |
|---|---|---|
| **drawer top (the premise, measured)** | **0** | **0** |
| desk top vs window top + 12 | **122 = 110 + 12** | 122 = 110 + 12 |
| desk bottom inside the foot margin | 423.9 ≤ 888 | same |
| bar-anchored notch | clamped to the edge's top (140) — the button (30) is above the reachable card | same |
| in-flow "Close this query as…" block | **absent** | absent |
| quick-filter row top | 167 | 167 |
| Agent tab: full name in the drawer | **exactly 1** (the header's) | — |
| closed desk: reasons | Rejected · Withdrawn · No Response (real dots, sheet grammar) | — |
| closed desk: ghost on choosing | 1 (`Query withdrawn · 5 SEPT`, waiting rung gone) | — |
| closed desk: derived | `Status becomes Closed — Withdrawn.` | — |
| mark-sent (no recorded figure) | qty `10`, "as asked" absent | same |
| post-save (PARTIAL, new rules) | 1 real rung → 2, pulse 1, Undo polls the status home | — |

One visual nit caught by the shot, not the probes (the composed-render family): the closed cards' title and sub ran inline — the component used `<b>/<i>` where the sheet's grammar styles `<u>/<s>` as blocks. Aligned and re-shot.

## NOT RUN, with cause

- **The 2560 clamp reading** ran at 1440 + 1920 (the harness's standing widths) rather than 1440 + 2560; the BEFORE measurement covered 2560 directly (drawer 0 · card 12 · window 110 — identical to 1440, because every input to the clamp is viewport-height-independent). The bound is not width-sensitive; noted rather than re-run at a third width.
- **A committed Mark closed save end-to-end** — the desk scene proves cards/ghost/derived and cancels; the write path is the same `recordQueryResponse` close branch the §2 unit locks pin, and §0's probe already proved that branch's rungs land. Committing a close on the fixture and undoing it adds churn without a new claim.

## Calendar v65 — routing note

The v65 interactions pack arrived mid-run. All four Phase-0 refs are in `~/Downloads` and **match their stated hashes** (981b360d6b76 · b363147c683b · 212c494a2791 · f0ffe9a727a3) — no hard stop. It is the calendar stream's pack (v64 baseline, timeline refs); this session is the Query Centre stream and did not start it.
