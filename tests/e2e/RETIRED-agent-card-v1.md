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
