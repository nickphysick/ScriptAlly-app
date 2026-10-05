# Retired by Agent card v1

Every removal this build makes, named, with what replaced it — the house rule that a replacement is
SWAPPED rather than added, and that a retired lock says where its claim went. Phase by phase.

## Phase 3 (5 Oct) — the editor replaces the pop-up's edit face and the v11 add card

**Components deleted** (the agent card's editor, `card/AgentCardEditor.tsx` + `card/cardInputs.tsx`,
is the only agent editor and the add card at once):

- `contact/ContactProfile.tsx` — the v11 pop-up. Its VIEW face had already become the card's quick
  view (P2); its EDIT face is replaced by the tabbed editor.
- `contact/ContactAgentForm.tsx` — the form both faces shared. Its laws moved with it: the location
  law (a cleared city or country is DELETED, never `""` — `cardPatch` + `saveAgentEdits`' new
  null-deletes), the wishlist stamp (`mswlCheckedAt` written with any wishlist edit), the reply
  time's origin rule, and the Escape bug its "+ Other" genre input carried (stopPropagation under a
  capture listener), now impossible by construction (every popup is a layer on the one stack).
- `contact/ContactAddCard.tsx` — the v11 add card, with the two pieces it parked and rendered
  nowhere (`FromLinkTag`, `FilledCountLine`). The editor opened empty is the add card now (three
  tabs; a note needs an agent). Its laws moved: one create path through `addAgent`, and a born agent
  OMITS what the writer did not state — which here also means the mock's three pre-ticked
  materials, its UK and its Email are NOT pre-answered (see `emptyCardDraft`).
- `AgentCountryPicker.tsx` — its only importer was the form. The card's country is six quick picks
  and a searchable "Other…" list (`CountryField`), on the picker's own contract: it emits a
  canonical ISO code through `normaliseCountry`, never typed text.

**CSS deleted** — 129 rules of `contactV11.css` (the pop-up, the shared form, the picker's portal
dress, the add card), found by a sweep of the classes ONLY the four files emitted and verified in
both directions on the post-edit file (every targeted rule gone, all 185 others byte-identical),
plus `@keyframes clv-pulse`, the orphaned `.clv-gch .clv-d`, and the two band tokens
(`--clv-band-rose`, `--clv-band-taupe`) whose last reader was the pop-up's band. What stays in that
block is the list's: the after-add ring on a new row.

**Locks retired, by name:**

- `contactV11.measure.ts` — **"the editor (the old form, until Agent card v1 P3): 520 wide, and the
  picker wears the portal dress (§11.6)"**. Its claims moved to `agentCardV1.measure.ts` phase 3:
  the editor's width and height by the mock's ruler, at 1440 and 1280; the country control is quick
  picks plus a list, all on `:root` tokens, so there is no portal dress left to wear.
- `contactAdd.test.ts` — **"FILL IN is deliberately not rendered: the card renders the link FIELD"**
  and **"FromLinkTag and FilledCountLine exist … and are rendered NOWHERE"**: the card that parked
  them is deleted; the retargeted suite asserts the editor's paste field sorts a link and fetches
  nothing, and that the two parked pieces are gone rather than merely unrendered.

**Rewritten against the card, not weakened** (a note at each site):

- `contactV11.measure.ts`: the Escape cascade (a CLEAN editor goes back to the quick view, a dirty
  one ASKS — the backdrop too, which used to be inert and now never discards in silence); §11.7's
  reply note (the stepper, the also box, the foot's count — the v11 footer's "Saving also updates…"
  is the mock's "N changes · also changes N things elsewhere"); §11.7's write half and third leg
  (the card has no road back to Unknown — decision 9 — so both restore THROUGH THE STORE, the third
  leg including the deadline the fan-out rewrote on each of the agent's queries); the add card
  (§11.9's "a name AND an agency" is the card's "a name OR an agency" — the rules have always
  accepted either; a record with neither still cannot be added); the free cap; the after-add ring;
  §11.8's bare REMIND ME (the editor on Submissions, the door focused); v12 P1's add door and
  §10.7's way-add.
- `pageHeaderV2.measure.ts` §4.6 and `switcherV2.measure.ts` S5: the add door opens the card's
  editor empty, name focused; S5's modal is the card, its ✕ the band's.
- `agentCardV1.measure.ts`: P1's "one Escape stack" (the country list, not the old picker); P2's
  "E opens the editor" and "a torn slip and '+ Website'…" (the editor now opens ON the door's tab
  with the field focused).
- `quickAdd.test.ts`: the href renderers (the quick view and `agentCard.ts`; the editor shows a
  cleaned domain as text, never a link) and the typed-genre law (the card's new-genre path through
  `commitTypedGenre` over every source, then `addPersonalGenre`).

## Phase 4 (5 Oct) — save, undo, Also changes and delete

**Retired, swapped not added:**

- `AgentList`'s `undoSave` (`updateAgent(prev)`) — it restored by MERGING, so a field the save added
  (a first `mswlCheckedAt`, a `reopensOn`, a rating) survived the Undo; it logged an activity the
  save never logged (the house undo rule forbids compensating entries); and it left every deadline
  the reply-time fan-out had moved where the save put it. The list's notice now offers the card's
  OWN Undo — one closure, run once from either place — and that Undo is a snapshot
  (`lib/agentCardSnapshot`, on the drawer's `planRestore`): the agent, its queries and its task
  flags read before the save and put back whole. No snapshot, no Undo.
- `contactEdit.alsoSummary` and `contactEdit.savedLine` — the v11 pop-up's footer and saved line,
  which unioned surfaces into a sentence. The card counts what moves instead, in the mock's words:
  the editor's foot ("N changes · also changes N things elsewhere") and its saved line
  (`cardSavedLine`: "Saved. N expected-reply dates moved.", from the dry run's own `moved` count).

**Locks rewritten:** `contactV11.measure.ts`'s §11.7 write half asserted the v11 saved line ("Also
updated …"); the fixture is never queried, so the card's line moves no date and says only
"Saved." — asserted as that, and as never claiming a date moved.

## Phase 5 (5 Oct) — hand-off, docking, parking and reload; decision 8 app-wide

**Retired, swapped not added:**

- **The drawer's own Escape listener** (`DrawerShell`'s `window` capture handler). Two capture
  listeners on one target are resolved by registration order; the drawer is now a layer on the one
  stack (`useEscapeLayer(open, …, ESC_LEVEL.drawer)`), which outranks a docked card by level. Its
  cascade is unchanged in order — the open calendar, the open ask, the leave bar — and ends in
  decision 8 rather than in a discard.
- **The backdrop's shake** (`.qad-drawer.is-shake`, `@keyframes qadShake`, the `shake` state). With
  answers the backdrop PARKS now (decision 8); with none it cancels, as before.
- **`JourneyView.guardDiscard`** (Log a query's "ask once an agent is chosen"). Decision 8 asks on
  ✕ for ANY journey with answers, read from `dirty` alone — one rule instead of one journey's flag.
  And the agent a DOOR brings (the card, a Contact-list row) is no longer an answer: Log a query
  opened from the card with nothing touched cancels on Escape rather than parking an untouched
  journey (`pickAgent(a, byDoor)`).
- **"Discard this query? What you've entered will be lost. · Keep editing · Discard"** — the ask is
  the mock's now: "Discard this? Nothing has been saved yet. · Keep going · Discard".
- **The foot's Cancel once anything is answered** — it reads "Finish later" and parks; ✕ in the
  header still asks before discarding. Cancel returns when nothing is answered.
- **The dock chip's old dress** (ink, bottom-left, not clickable). It sits BESIDE the drawer as the
  mock draws it — white, the initials, the name, a status line, "Back to card" — and a click parks
  with answers or cancels without. Hidden at 768 and below, where the drawer is the whole screen and
  "← name" in its header is the way back.
- **The card closing on a hand-off** (`closeAgentCard(); openQueryDrawer(…)` in the host's
  `onAct`). The card docks instead — `onDock` from the drawer says when it steps aside and when it
  comes back, on save, cancel, park or a failed save alike — and a save brings it back pulsing.

**Locks rewritten (decision 8 changed what Escape means on a drawer with answers — it parks):**
the eight sites the plan named, each `Escape` → `Discard` pair now `✕` → `Discard`:
`qaJourneys.measure.ts` (D1), `qaLocks.measure.ts` (H4's two), `packagesJourney.measure.ts` (LP1,
LP2, LP3, AGAIN) and `qaSnapshot.measure.ts` (the empty manuscript) — and a NINTH the plan did not
list: `qaV11.measure.ts`'s mobile sheet walk, which answers steps on its way to the review and then
pressed Escape expecting the drawer gone (it would park, and the next journey would meet the clash).

**Corrected after the first full run:** four of those sites, `packagesJourney` LP1, LP2 and LP3
and `qaSnapshot` H12, close a drawer that has NO answers. Pressing Next does not count as an
answer, so ✕ closes them outright and no Discard is offered: the first rewrite waited for one for
three minutes. (LP2 and LP3 looked green in that run only because the file is serial: after LP1
failed they did not run.) Those four now press ✕, press Discard only if it is offered, and then
assert two things: the drawer is gone, and no chip is parked. The sites whose drawers DO carry
answers keep the strict ✕ → Discard, which proves the ask: D1, H4's two and AGAIN, all measured
green that way. A tenth site is `qaShots.measure.ts`'s own `discard` helper, which pressed Escape
and would now park a drawer that has answers. It takes the same ✕ pattern. (qaShots also needs
`design-refs/` served on 127.0.0.1:4610. That step is environmental, not something this pass
changed.)

**Rewritten against the dock, not weakened:** `contactV11.measure.ts`'s "Log query opens the query
drawer on this page" door 2 asserted the card was GONE behind the drawer ("two asking surfaces at
once"). The card docks now — mounted, stepped aside, out of reach and out of sight — so the case
requires exactly that (`.is-docked`, the card hidden) and lock 7 holds the rest.

## Phase 6 (5 Oct) — EditAgentDrawer retires

**Deleted:** `src/components/EditAgentDrawer.tsx` (681 lines) and `src/components/EditAgentHost.tsx`
(its app-level host, the `useOpenEditAgent` hook and its context). The agent card is the only agent
editor now. Swept for their EXCLUSIVE helpers: `Form11Drawer`'s `BlockNote` and `OkIcon` had no
other importer and go with them; `AlertIcon` stays (`ConfirmGuard` uses it), as do the rest of
`Form11Drawer` (the Edit Query drawer's shell) and every form primitive the drawer shared with
`AddAgentFocusForm` (`CountryCombobox`, `FitStars`, `SOCIAL_PLATFORMS`, the materials encoder). No
stylesheet carried `.ea-` rules; the drawer styled itself inline.

**Repointed openers:**
- `Dashboard.tsx` — the `data_quality_poor` action → `openAgentCard(id, { ...dataNeedTarget(needs),
  from: "task" })`: the editor on the tab and field of the agent's FIRST gap, the quick view when
  none is left. The card resolves the task flag when a save leaves no gap (since P4), as the host
  did. ⚠️ **This door renders nowhere:** `TaskPanelCard` sits under `renderTasksSidebarWidget`, which
  nothing calls, so the task panel cannot be opened on the live dashboard. It is repointed rather
  than left importing a deleted file. Its half of lock 10 is a source lock, and the dead cluster is
  flagged for its own pass.
- `Queries.tsx` — the open query's Agent tab, "Edit agent ›" → `openAgentCard(id, { from: "qc" })`,
  the quick view over the Query Centre, whose ⋯ offers "Open in Contact list" (built in P2).
- `App.tsx` — `#/drawer-lab` loses its agent half; the Edit Query drawer's half stays.

**What the old drawer had that the card does not** (all as §8 rules): social handles are preserved
untouched on save (the card's patch writes `socials` only when the MSWL link changes, keeping every
other entry in place); the legacy `notes` string shows read-only as "Earlier note" (since P3); the
"Queries to {name}" list is the card's history; the guided data-quality walkthrough is opening at
the field; in-memory parked drafts are superseded by the dirty-close ask.

**Locks:** `agentCardRetire.test.ts` (the files gone, no import of either or of the hook, both doors'
wiring, `dataNeedTarget` derived through `agentDataQualityNeeds` and agreeing with Housekeeping's
`GAP_TARGET`, now exported for the comparison) and `agentCardV1.measure.ts` phase 6 (the Query
Centre's Edit agent opens the card for that query's agent, `from: "qc"`, over `/queries`, the quick
view rather than the editor, and no Form 11 drawer beside it).
