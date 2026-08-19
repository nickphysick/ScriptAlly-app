# To-do follow-up run — report

**Baseline:** 322 files · **5667 passed** · 2 skipped · **0 failed**.
Follows `todo-overnight-report.md` (`f4726e9`, `3749fce`, `c4eef53`, `632c2ba`, `cba5323`).

---

## ⚠️ Premises in THIS brief that turned out false

The last brief's premises were wrong about the page. This one is much closer — but three things
were not as described, and one of them is the same shape as last time.

1. **`design-refs/todo-materials-contract.html` does not exist.** Named as "the visual contract",
   absent from the repo. This is the **fourth** time a named mockup has been missing in this project
   (CLAUDE.md already records *"the specified `design-refs/` dir was ABSENT again"*). Two recent
   candidates exist under other names — `132-materials.html` ("materials interaction", 17 Aug) and
   `158-notes-materials.html` (18 Aug). I took layout intent from the brief's own prose and values
   from the live stylesheet, which is what the brief says to do when they differ.
2. **Phase C's `materialLabel` already existed** — as a *passthrough returning the raw stored
   string*. Its name described the string's shape rather than its job, which is very likely why a
   reader concluded no display map existed. Renamed to `materialToken`; `materialLabel` is now the
   display map.
3. **The architecture Phase C asks for was already in place.** `materials.ts` declares itself the
   single formatter every screen routes through, so "covering letter" reached the query detail, the
   timeline, the CSV export and the editor by changing **one return**.

Also worth correcting: **`exclusive_expiring`**, cited in `cardJourney`'s note as a live kind that
would have hit the send fall-through, now survives **only in test fixtures**. And
**`response_overdue`** is compared twice in `Dashboard.tsx` but is never produced by the engine — a
dead comparison, named here, not fixed.

---

## What landed

### `4732c0b` — Phase A: make task completion explicit per journey
*landed (code + unit + measured at 1440×900), +11 tests*

- `completionVia`'s default was `"mark-sent"` — **a status write**. Every task type ever added
  shipped with a write attached until someone opted out. Two kinds had already reached it that way
  and each was closed **by hand**.
- `TASK_TYPES` census + `TaskType` union; the switch is exhaustive and closes on the house idiom
  `const unhandled: never`. **Verified by adding a member and watching tsc fail**, then reverting.
- **No write changed.** `mark-sent` is now exactly the three kinds that are really sends — the same
  three `sendSpecFor` recognises and the same three `getPrimaryAction` answers "mark-sent" for
  (probed directly). Everything else that reached it was already a no-op.
- **What did change is visible:** an offer card drew a tick that silently refused, because
  `quickDone` re-checks the status. *A second mechanism is not a fix.* Measured: ticks now appear on
  exactly the three sends, two closes and four user notes; offer 0, materials 0, sweep 0.
- Third-door audit: 11 other switch/map defaults over task or journey type. **None writes** — they
  return copy, `null`, or a bucket. `cardJourney`'s `return "send"` is the same *shape*, guarded
  downstream by `isSendTask`; reported, not changed.
- `CLAUDE.md`: a default branch may not perform a write.

### `16a32be` — Phase B: exclude closed queries
*landed (code + unit + measured), +2 tests*

- **Measured on the page: the bulk card went from "19 queries" to "10 queries."** Nine were closed.
- ⚠️ **`isTerminalStatus`, not `queryBucket` — and they genuinely disagree.** `queryBucket` files an
  **Offer** under "closed" because no action is owed; that is right for a filter pill and wrong
  here. Reusing the nearest-looking derivation would have silently dropped every offer. Locked as a
  reconciliation between the two.

### `c856fdd` — Phase C: display labels without a rename
*landed (code + unit + measured), +16 tests*

- `materialToken` (comparison) vs `materialLabel` (display) — opposite jobs, no longer one name.
- **Nothing stored moved**, and the diff proves it: `MAT_OPTS[0]` unchanged, `types.ts` untouched,
  both seed files untouched.
- ⚠️ **Measuring found a site the sweep missed.** After routing the naming constants, `/agents` read
  12 "covering letter" and 0 tokens — and `/queries` still rendered **one raw token**. Four display
  sites in `Queries.tsx` were still hard-coding it. Now zero raw tokens on all three routes.
- ⚠️ **One site deliberately left:** `Queries.tsx:1795` builds a persisted **activity description**.
  Relabelling would make new entries read "Covering letter attached" while every existing one says
  "Query letter attached". The brief says anything persisted stays. **Open call for the morning.**
- Out of scope, recorded: marketing copy, the Help centre's "Query Letter Variants" feature name,
  and Comparable titles' "Query letter line" — those name a feature or a pitch line, not a material.
- The `createFrames` fixture was regenerated through its own flag and the diff read: exactly three
  label spans, nothing structural.

---

## Choices this brief did not cover

1. Took materials design intent from the brief's prose (the named mockup is absent).
2. Left the persisted activity description at `Queries.tsx:1795` on the token (above).
3. Phase A returns `"none"` for `offer_received`, removing a tick that could never write. Behaviour
   preserving in every write sense; visible in that one affordance disappears.
4. `TASK_TYPES` omits `exclusive_expiring` — a census states what the app can produce.
