# Contact list v13: report

The Contact list is now in the Query Centre v126 look: the anthracite band, the numbers strip, "Who to query next", the open banner over a slate workspace, Housekeeping v2 in a floating tab and half-screen drawer, the dock chip that shows the card, shortcuts, a loading beat, a page guide and the app footer. Nine phase commits on `main` (`5e2e4747` → Phase 8), all pushed. **Nothing is deployed** — no hosting, no functions, no rules.

## False premises

Found in the report before editing (all ruled on 5 Oct):

1. **"v126's labelled pills."** The Query Centre's list controls are icon pills with count badges and no labels; the labelled pills with a direction toggle existed only in the Birds-eye drawer, on anthracite. The banner's pills are a new dress of that model, lifted to `shell/ListPills`.
2. **"One Escape handler stack."** v126's Birds-eye drawer runs its own capture listener, not `lib/escapeStack`. The Housekeeping drawer went on the stack; the Birds-eye drawer did not move (Q1).
3. **"Lock 9 of Agent card v1."** No test carried that number. The only e2e that pressed the dock chip was "decision 8", which moved to the new chip behaviour in Phase 6.
4. **The quick view has no standing chip in its band, and no foot.** So the carousel card could not be the quick view with sections hidden; the shared blocks were extracted instead (`AgentCardParts`, Q2).
5. **The dock chip ignored its `initials` field**, and the Query Centre's chip showed the raw status string. The two cards also docked by different mechanisms (a `body.qad-docked` transform against `visibility: hidden`), so the peek needed a third state in each.
6. **"Navigate to the Query Centre and back, and both are restored" proves nothing**: `/agents` is a mounted stage page whose React state survives navigation anyway. Lock 8 proves the storage with a same-tab reload and a fresh context; the round trip is kept as an extra case.
7. **"With the agents listener held" had no hook.** A dev-only hold was added (`window.__SA_AGENTS_HOLD_MS`), absent from production builds (grepped).
8. **`updateUserProfile` cannot carry a dotted path** (typed `Partial<User>`; its optimistic spread would write a flat `"todoPrefs.x"` key locally). Phase 0 added `updateUserPaths`.
9. **"Has passed on the current manuscript" was not an existing predicate.** Added as `hasPassedOn`, with Q6's rule: Rejected, or No Response where the agent's `noResponseMeansNo` is true; Withdrawn never.
10. **Housekeeping v2 cited `screens/*-20…25`**, which are not in this pack. The v7 reference renders those states and was measured instead.
11. **The mock differs from the prompt in five places.** The mock won (session pill without the "13 to go" line; "Best place to start" as a box; figures scroll the carousel into view; keys `sa.contactList` and `sa.guide.contacts` rather than the mock's `qh.*`) — except the "See all N" tile (Q3: not built) and the dim, which follows the shared `HalfDrawer` on both pages.
12. **The deep-state tokens already existed and matched the mock**, but their comment said "never used as a fill". The comment was amended; no tokens were minted.

Found during the build:

13. **The settings-wipe fault was real and wider than one field** (Phase 0): Settings saved `{ ...todoPrefs(), ...patch }`, and `todoPrefs()` reads only the desk fields, so every desk save deleted `listView`, `noteboard`, `manuscripts` — and, from Phase 5, `contacts`.
14. **`.clv-tray` was already taken** by the Housekeeping card's tray head in the exhibit; the collision stretched the row tray to 122px (Phase 4). The row tray is `.clv-rtray`.
15. **The harness account has no offer-standing agent and no genres gap**, so CL13-6's offer branch and Housekeeping's genres gap are entered in `#/contact-lab`.

## Deviations from the mock, deliberate

- **The sticky bar's controls are not clipped.** The mock runs "Grouped: Letter ⌄" off its own bar at 1512; the build narrows the mini A–Z instead (CL13-SB asserts no control is clipped).
- **The page guide does not scroll on arrival.** It rings step 1 where it is and scrolls only once the reader steps (Next, Back, the help menu), and only to a subject out of view. An arrival scroll moved the page under the reader and under two other locks.
- **The guide sits at z 58**, under the pills' menus. At the mock's stacking it covered them and took their clicks.
- **No "See all N in the list" tile** (Q3).

## What each phase did

| Phase | Commit | What |
|---|---|---|
| 0 | `5e2e4747` | Desk settings save by leaf (`updateUserPaths`, `deskPrefPaths`); rulesProbe "desk save by leaf" |
| 1 | `965b13e3` | The band, one sentence (no reply-time clause), `--page-section-gap`; the shared header suites' band register |
| 2a | `392bd97e` | The numbers strip (`lib/contactStrip`) |
| 2b | `3d6bac97` | The carousel (`shell/Carousel`, `AgentCarouselCard` on `AgentCardParts`, `lib/contactCarousel`); figures fill it |
| 3 | `6c8c7791` | Open banner, labelled pills, filter line, sticky bar, `sa.contactList` (`shell/ListPills`, `OpenBanner`, `StickyBar`) |
| 4 | `2f9f2c9e` | Slate workspace, anthracite letter tabs, the 6px state edge, the hover tray; the rail retires |
| 5 | `1910f71d` | Housekeeping v2 in `FloatingTab` + `HalfDrawer`; one save path (`lib/agentCardSave`) |
| 6 | `23bee97e` | The dock chip shows the docked card above itself, on both docking cards |
| 7 | `a7790c8c` | Shortcuts, the loading beat (`ContactSkeleton`), the page guide |
| 8 | this commit | `AppFooter`, the empty-state check, CLAUDE.md, this report |

**The filter panel's final sections (ruling Q4):** Where you stand (Your move · With the agent · Offer · Not queried yet · Closed) · Fit for {manuscript} · Open to queries (Open now · Closed to queries · Not stated) · Query status · Genres · Location · Your rating · Profile (has gaps to fill).

## The empty state

**It needed nothing.** It is v12's page, a separate branch of the render, so none of the band, strip, carousel, list, tab or footer can reach it (CL13-14 asserts it at 1512). On the greige ground its white cards, the hawk's blush patch and the anthracite exhibit band sit as built — screenshot `empty-1512.png`. Nothing was changed.

## Verification

- **Locks:** `tests/e2e/contactV13.measure.ts` — CL13-1 to CL13-14 plus CL13-S, -B, -F, -SB, -T, -HK and -HKW, at 1512 × 900, 1440 × 900 and 1280 × 800 with no horizontal overflow.
- **Every new lock was proved red before its green:** mutation proofs in `mutation-proofs-p5.jsonl` to `-p8.jsonl`; Phases 0–4's are recorded in their commit messages. One Phase 8 mutation was a no-op, and the proofs file says why: the footer cannot reach the empty state whatever its guard says.
- **Final gates (Phase 8 files, measurement worktree):** tsc clean · production build clean · Vitest 528 files — two marketing suites timed out at 5s with a reporter RPC timeout while an e2e run loaded the machine, and pass alone (63 of 63).
- **Final e2e (Phase 8 build, one worker):** contactV13, contactV11 and agentCardV1 — **80 of 80 passed** in 12 minutes. QC126-2 re-run: red only on `a17.css` (follow-up 4).
- **Neighbours:** contactV11 and agentCardV1 rewritten where v13 changed their subject, each with a dated note; retirements in `tests/e2e/RETIRED-contact-list-v13.md`.

**Two workers on one account interfere, so these suites run at one worker.** In two of three two-worker runs, CL13-SB, CL13-HKW and (once) CL13-3 went red; every time, all of them passed alone and at one worker. The likely cause, not proved case by case: each of them depends on the shared harness account staying still while it compares or writes, and the same run includes agentCardV1's and Housekeeping's writing cases against that account on the other worker. CL13-3's "list is identical" check now names the part that differs (rows, controls, filter line, index, find) instead of only saying "list changed", so the next red explains itself.

## Follow-ups

1. **The Query Centre adopts the shared shell parts** — `OpenBanner`, `Workspace`, `ListPills` (the labelled list pills), `StickyBar`, `FloatingTab`/`HalfDrawer` (and the Birds-eye drawer onto the escape stack), `Carousel`. Until then there are two implementations, deliberately (Q1a). QC126-1 to 20 are the locks for that pass.
2. **The three other `todoPrefs` writers race** (To-do list view, Noteboard, Manuscripts tiles): they spread the whole stored map, so they do not wipe, but two writes close together can lose one. Move them to `updateUserPaths`.
3. **To-do and Housekeeping now disagree about an absent reply time.** Housekeeping v2 (decision 7) counts it as a gap until it is set or marked not stated; To-do's data-quality task still flags only the stub `0` (`agentDataQualityNeeds`). Decide whether To-do follows.
4. **QC126-2 is red on `main` for `src/components/analytics/a17.css`** (Analytics v17): three cream fills on its anthracite band, outside the register. Not this stream's; re-confirmed on the Phase 8 build.
5. **`QcCentre.tsx:86` says only the Query Centre mounts `AppFooter`.** Analytics and the Contact list do too. A comment inside the Query Centre, which this pack could not touch.
6. **The loading beat's one dependency on data:** a writer whose first carousel cards carry two rows of genres sees the carousel grow by that row when the data lands.
7. **The floating tab and the first-visit guide sit over the footer's right-hand corner** when the page is scrolled to its foot, as the Query Centre's tab does over its own footer.
8. **The contact suites are not safe at two workers** on the shared harness account (above). Either a second fixture account or a file-level `serial` mode would make that structural rather than a rule about how to invoke them.
9. **Prod Firestore rules:** the `todoPrefs.contacts` leaves are probed on dev only (they ride the existing `todoPrefs` map, so no rules change was needed there); nothing for prod.
