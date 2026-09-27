# Query actions v1 — Decisions I made

Where the recon forced a choice the brief did not settle, the reading closest to the mock was taken
and recorded here.

1. **The mock's header "×" and the query card's close button collided.** The drawer's own × is the
   only close control drawn in the header; the Query Centre card DOCKS (fades and scales to the chip)
   while the drawer is open, via one body class, so its close button is never on top of the quill.
2. **Scrim: the recorded decision beats the mock** (as the brief says). With answers entered the
   scrim SHAKES the drawer; with nothing entered it closes. "Answers entered" = any touched field,
   or an agent chosen.
3. **The review's rust verdict uses each journey's own participle** ("before this can be closed /
   saved / accepted"). The mock says "logged" in every flow — a shortcut its own report calls out
   (MOCK-SPEC §6.5); the brief's §A template is "N things to fix before this can be ___".
4. **Fonts: the mock's stack, READ from the shell's `:root` tokens** (`--sp-type`, `--sp-serif`,
   `--sp-mono`) rather than named, so the marketing font lock counts no new owner. Source Serif 4 is
   already loaded app-wide.
5. **The title is a `div role="heading"`, not an `<h2>`** — `brand.tsx` forces every h1–h3 into the
   brand serif with `!important`. Likewise a 0-1-0 reset returns bare elements to their parent's face
   (brand.tsx names `p, span, div, button…` as the body sans at 0-0-1).
6. **A manuscript states no chapter count.** Chapters are estimated at 2,000 words each for the
   sample control's conversions only (the brief's worked examples — 10 pages → 1 chapter, 3 chapters
   → 6,000 words — hold at that rate for any book). Nothing stored claims a chapter count.
7. **An agent with no stated reply time** gets 6 / 8 / 12-week chips, 8 as the default, and the
   writer's chosen date is then stored as `writerExpectedDate` (a writer claim). Where the agent does
   state a window and the writer keeps "Their usual", nothing is stored — the derivation answers it.
8. **A package states no sample size** (the packages session: `samplePagesVersionId` is always
   `""`). A package card sets the letter and the synopsis; the sample stays the agent's ask or the
   writer's own. "Matches ‹agent›" therefore compares the letter and synopsis only.
9. **"Close it" in D1 writes `responseDeadline`** — the app's existing auto-close fires from that
   field and only that field, so the writer's choice writes it and no other choice does.
10. **Resubmitted's glyph collapses onto Full Sent's drawing.** The brief's "the sent family's mark
    with R&R's ring" composes to a dashed ring round a full centre, which IS Full Requested's
    drawing — a mark saying the agent is asking when the writer has answered. Following the closed
    set's precedent, the drawing collapses and the accessible name says which. Signed is the Offer
    document with a filled centre, as the brief says.
11. **Signed takes no Query Centre tile**, like Withdrawn: the writer's own act, not an outcome an
    agent produced, and counting it in the Closed fan beside passes would misname it.
12. **"They've stopped taking queries" closes as Withdrawn with `closingReason: agent_closed`** (K6),
    through an additive `closeAs` / `closingToken` on `recordQueryResponse`; every older caller omits
    them and writes exactly what it wrote before.
13. **Withdrawal counting.** No surface counts withdrawals on their own; Analytics' only bucket that
    includes them is "Pass or withdrawn — the agent passed, or you withdrew". A declined offer moves
    to the Offer outcome (it was an offer received). A withdrawal on accepting an offer stays in that
    bucket, because "you withdrew" is literally true of it.
14. **`response_overdue` (brief K3) does not exist** as a task type; nothing was invented for it.
15. **The five new task types' doors.** `offer_tell` hangs on the OTHER agent's query (so its card
    names the right agent) and opens the OFFERING query's journey at The others; `withdraw_tell` and
    `signed_tell` open D7's "told" variant (one step, "I've told …", which sets `withdrawTold`);
    `agent_recheck` has no drawer journey and keeps the board's own route to the agent.
16. **D7's Delete-entry keeps the existing guarded delete** (it already has a dependency guard and
    an undo); Edit routes to the drawer. **"Delete query" IS built** on the Query Centre card's footer,
    behind the mock's inline ink confirm ("Delete this whole query? — Keep / Delete"), and its Undo
    restores every document by snapshot (query, its log, its feed rows, its task flags) — locked
    byte-identical. The mock's inline confirm for a single ENTRY is not built.
17. **The mock's "+ Add 'X' as a new agent" writes the agent immediately** (it is a Contact-list
    record, not part of the query); the query's undo does not remove the agent.
18. **Late reply records the reply FIRST, then removes the no-reply closure** — see CLAUDE.md; the
    closure's heal id makes the opposite order lose a race.
