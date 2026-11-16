# Record a response v1 — report (16 Nov 2026)

On desktop, one journey records a response: the query card and its composer, reached from every door. "Who replied?" is drawn in the card's own frame, and every slide-out dims the desk.

## False premises (read these first)

1. **The activity feed drawer is never mounted on the desktop.** `Dash58Feed` is imported only for its glyphs; the dashboard's feed is the inline `F1Feed` rail, and nothing claims the right panel as `"feed"`. Its wash was still given the .45 scrim (`dash58.css`), but R8 cannot measure it.
2. **The Birds-eye drawer is drawn only under 768px.** On the desktop, Birds-eye is a list view (`QcBirds150`). The drawer's dim was still set to .45 with an inert page, but R8 cannot measure it on the desktop.
3. **Premise (e) was true, but incomplete.** `SidePanel` dimmed only with `dim`, and Card offers v1 had also given the agent card a third, *light* level (.16, page live). Decision 3 retires that level: the agent card dims at .45 whenever it is out. **This edits a Card offers file** (`AgentCardPanel262.tsx`); its now-unread card-editing listener is removed.
4. **The dashboard's Next up rows never reached the old form.** `dashList` gives them `{ mode: "resp" }`, but "Open task" calls `viewTask`, which opens the card in view mode only. `run()` was re-pointed anyway.
5. **The v152 card had no "← Back to {first}".** Only the old fallback card (`QcOpenCard`) drew it, and `openQueryPanelFromAgent` had no callers. It is now on the v152 band, and it reopens the agent card.
6. **The To-do desk had a second response writer** that the brief did not name: the quiet flow's "They did reply" tiles saved through `recordQueryResponse`.
7. **Premises a–d and f held as written.** The census adds a ⌘K search-palette door (through `invokeCapture`), and its desktop-dead rows are listed below.

## Base tip

- Cut from `dev/…-wsh11-onf1-co1` @ `ba5242436`. Dev was serving it as `index-BEFE4y63.js`, and it contains cdcc004c and v152.2's composer.
- While this was built, dev moved to `dev/msp1-st2` @ `ea5eb11c9` (Manuscript spine v1 + Shell tabs v2 on top of `…-co1`), served as `index-C5jv0Em7.js`. The deploy is that line plus this branch.

## Step 0 — reference, baseline, worktrees

- **Reference:** the SHA256 matched. It came from `~/Downloads/record-a-response-v1-pack.zip` and was enrolled in Phase 1.
- **Baseline before any edit:** tsc 0 errors, which needed `--max-old-space-size=4096` (the default 2 GB heap ran out on this machine). Build clean. Vitest 12,612 passed, 3 failed: `src/test/emuGuard.test.ts` (1) and `src/test/firestoreTarget.test.ts` (2), both scanning `tests/` scripts. Every phase ended baseline-equal.
- **Disk:** 46 GB free at the start.
- **Worktrees:** six existed besides the primary, all in use by other sessions today. They were left alone.

## Doors — before and after

| Door | Before | After |
|---|---|---|
| Shell menu, sidebar capture, ⌘K palette (App `handleNavigate`) | QueryPicker in the panel, then the old stepped form (off Queries); `QcWhoReplied149` (on Queries) | `openResponse()`: "Who replied?" in the card frame, then the composer |
| Analytics header and collapsed bar | QueryPicker in the panel / standalone drawer | `openResponse()` |
| Responses header | QueryPicker in the panel | `openResponse()` |
| Responses card act / answer panel primary | Old stepped form in the RspPanel slot | The query's card + composer (in the answer panel's place) |
| Query Centre header | `QcWhoReplied149` → composer | The new picker → composer |
| Card footer: Record a response / Reopen | Composer | Composer (unchanged); "{first} replied" added on nudge-due and gone-quiet |
| Birds-eye (desktop list) row, trays, any `stepRow({mode:"resp"})` | Old stepped form in the panel slot | Composer (`stepRow` routes resp to `respondOn`) |
| Bulk "Record a response" | stepRow (dead on desktop: the bar renders only `!qcDesk`) | Each ticked query's card and composer in turn |
| Desk verb, correction fork's "what happened next" | Drawer / panel slot (fallback card only) | Composer |
| Agent quick view (`AgentCardHost`) | Standalone drawer + dock chip | The query card in the agent card's place, "← Back to {first}"; no dock |
| Agent panel card (`HostAgentCard`), Contact list card (`AgentList`) | Standalone drawer | The same |
| To-do desk "They did reply" | Inline tiles + `recordQueryResponse` (pass/full/offer); partial → standalone drawer | "Record what {first} said →" → card + composer; the phone keeps the tiles |
| Dashboard `run()` resp request | Drawer (never reached, see premise 4) | `openResponse({ from: "dashboard" })` |
| Parked chip Resume / Finish it for a parked resp | Old journey | Card + composer (`openResponse`) |
| Practice query (Pip) | Old stepped form + `practiceRespond` | **Unchanged — open item 1** |
| Phone (`qmPhone`) everywhere | PhoneFlowShell + old journey | Unchanged (nothing subscribes, so `openResponse` opens the drawer journey) |
| Dead on desktop, left alone | QcList138 trays, AgentCard24, ToDoPage/useTaskPaneSession (`drawerDoorForTask` never returns resp), TopNavShell, legacy modals | — |

## Caller contracts (Phase 2)

- **To-do desk:** passes `onSaved` to `openResponse`. The composer's save calls `responseSaved(id)`, and the desk flashes "{first}’s reply is on the card". The task leaves the list from the data, as before.
- **Dashboard and Responses:** they had no receipt for a response. Their lists are live-derived and refresh from the write.
- **Agent quick view:** its `onSaved` set `pulseOnReturn` for the docked chip's return. Responses no longer dock, so there is nothing to pulse. "← Back" reopens the card.
- **Bulk queue:** advances when the card closes, as before. The card now stays open after a save (decision 4), so the writer closes it to move on.

## Phase 7 — what was removed, and what is left for the phone

- **Removed:**
  - `QcFlows149.tsx` (`QcWhoReplied149`) and its `.qc149f` CSS
  - the "query you had open" (`hadOpen`, QueryPicker's section, `.qad-qpick-h`)
  - the shell picker subscription and `openResponsePicker` / `subscribeResponsePicker` / `responsePickerHosted`
  - the panel's `picking` state and `PICKER_PANEL_ID`
  - `SidePanel`'s `dim` prop and the callers' flags
  - the scrim's light level
  - the bar's rise over an open panel
  - desktop parking for a response
- **Left for the phone:** `ResponseJourney`, `QueryPicker`, `saveResponse`, the drawer's response journey and PhoneFlowShell (all used by the phone and by Pip), and the To-do desk tiles' `recordQueryResponse`.
- **Left unlinked:** `RecordResponseModal` and `PASTE_RESPONSE_EVENT`, as the brief says. "Paste the email instead" is no longer reachable on the desktop.
- **Suites retargeted or retired:**
  - `qcCentre.test.tsx`: the one-host condition, retargeted
  - `tests/e2e/qc149.measure.ts` L12: retired
  - `tests/e2e/cl251.measure.ts` B2's "Who replied" reading: retired
  - `tests/e2e/cl251.shots.measure.ts` 05–08: retired

## Locks

**`src/components/queries/recordResponse1.test.tsx`** — 18 tests, all green. Each one was proved red against its reverted fix, then restored:

| Lock | Red against its reverted fix | Green |
|---|---|---|
| R1 door census (17 doors) + no unguarded drawer door | 2 red | ✓ |
| R4 closed only by searching; closed → Reopen | 2 red | ✓ |
| R5 nothing live | 1 red | ✓ |
| R6 one writer (by source: `planReply` → `commitPlan` → `responseSaved`; no door imports `saveResponse` / `recordQueryResponse`) | 1 red | ✓ |
| R7 options | 3 red | ✓ |
| F1 "{first} replied" + no ellipsis | 1 red | ✓ |
| R12 store fallback is the drawer journey | 1 red | ✓ |

**`tests/e2e/recordResponse1.measure.ts`** — emulator, harness account. 116/116 readings green:

| Lock | 1512×900 | 1280×800 |
|---|---|---|
| R1 (dashboard, Analytics, Responses, Query Centre, agent card) | 23/23 | 23/23 |
| R2 every row reachable in the panel, footer at the foot; R3 the pick; R4 closed | 15/15 | 15/15 |
| R8 scrim .45 over sidebar and bar, page inert, gone on close (query card, agent card); R9 leave | 11/11 | 11/11 |
| R10 stays open on Partial requested with Undo; the Undo restores Queried; R11 arrows | 9/9 | 9/9 |

How the measured locks deviate from the brief:
- The measured locks were run green only; I did not run the red-first readings for them. The mutation hooks (`RR_MUTATE`) are in the spec. Each run waited on the shared slot, and CLAUDE.md asks for red-first on logic locks only.
- **R12 at 390 is `fixme`:** the probe reached no phone door on the harness account. R12 is held by the Vitest lock.
- **R5** cannot run on the harness, which has live queries. It is held by the server render.
- **R6** is proved from the source, not by comparing documents.
- **R8:** feed and Birds-eye cannot be measured on the desktop (premises 1 and 2).

**Measurement fixes found along the way:**
- The dashboard's "How it works" box is a `role="dialog"` on every route, so a door's count is what the door adds.
- The agent-card door replaces the agent card.

**Screenshots** (`shots/`), each at 1512 and 1280:
- `picker-*`
- `picker-closed-search-*`
- `pick-mid-flow-*`
- `saved-*`
- `agent-card-route-*`
- `dim-query-card-*`
- `dim-agent-card-*`

Missing: no picker-empty shot (needs an account with nothing live), no To-do route shot, and no feed or Birds-eye dim shots (premises 1 and 2).

## Open items (owner: Nick to assign)

1. **The practice query (Pip) still runs the old stepped form**, saving through `practiceRespond`. Its guide walk reads the drawer's stepper to drive the guide cards, and Pip has no v152 card to carry a composer. Moving it means building Pip's card view and re-keying the walk.
2. **"Paste the email instead" (Pro) has no desktop door now.** Restyle `RecordResponseModal` and decide where it lives.
3. **R12 measured at 390:** find a phone door the probe can reach on the harness account.
4. **Lasting decisions for `docs/decisions/` on main** (query-actions / shell). This dev line predates those files, so they need writing at merge:
   - `openResponse` is the one door
   - `SidePanel` always dims
   - the scrim is one level
5. **The stale branch `dev/…-onf1-co1-rar1`** was pushed before dev moved. It is not served and can be deleted.

## Branch, deploy, nothing else

- Branch `record-a-response-v1` (pushed).
- Dev line `dev/msp1-st2-rar1` @ `e2b8007d4` (pushed): `dev/msp1-st2` @ `ea5eb11c9` merged with this branch, no conflicts.
  - Gated: tsc 0; Vitest 12,650 passed, the same 3 reds; build clean.
  - Built from a clean checkout of the pushed tip and deployed to `scriptally-dev` hosting.
  - **Dev serves `index-B8GmFPmc.js`**, the build's hash.
- Nothing went to `main`; nothing went to prod.
