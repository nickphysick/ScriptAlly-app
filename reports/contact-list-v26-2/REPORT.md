# Contact list v26.2 — the agent card as the landing-page card, with editing on the card

4 Nov. Branch `contact-list-v26-2` (cut from the dev line at 61abbb22). Not merged to `main`. Ref:
`design-refs/contact-list-v26-2/contact-list-v26-2.html` and `screens/01–09` (hashes checked, all ten matched; enrolled
in the ref manifest).

## False premises

1. **"Reuse `AgentCardEditor`'s fields."** `AgentCardEditor` no longer exists: v25.2 deleted it. Its fields live in
   `card/cardInputs.tsx` and its draft in `card/useAgentForm.ts`, and those are what the card edits with.
2. **"Genres are toggle chips."** The editor's `GenreField` is a typeahead finder. It gained a `chips` presentation in
   place: pick from your list, and "Add your own genre" opens the existing finder. No new field type.
3. **"The band is the list header's slate."** `PAPER_BAND` is #3e5170; the brief names #5e7189. This card uses #5e7189
   through a new `band` slot. The To-do page's paper cards are unchanged.
4. **"14 from the window."** The window is the app's sheet (`.ws-window`), not the viewport. Taken from the viewport,
   the card overlapped the shell's top bar. The host measures the sheet.
5. **"The call box gives the next step."** `callBox` has only your-move, not-queried and hold kinds. `nextStep` adds
   with-the-agent ("Waiting to hear from {first}" · Record a response) and closed (the outcome · See the query) on top
   of it.
6. **Materials read "Synopsis 1pp".** The model's own words are "Synopsis · 1 page" and "Covering letter"
   (`materialWords`); the chips use those.
7. **"Paging guards the draft."** As first built, the pager was hidden while editing, so › could never be pressed and
   the guard on it was unreachable. J10 found this. The pager now stays under the save bar.

## What was built, by part

| Part | Commit | |
|---|---|---|
| A · the panel is the card | 48128bbd | `AgentCardPanel262`: no background, padding or scrim; placed from the sheet's box; −1.2° lean; arrival swing once per open; straightens while editing; ✕/Esc ask the card first |
| B · the face | 72192bc6 | `AgentCard262` over `AgentPaperCard` (new optional slots): band chip, disc with "!", meta line, links or "+ Website/+ Email", the one coloured next-step box, Profile · History · Notes, gap line, landing sections, ghost lines with one "+ Add …", four "How {first} works" tiles, the foot. Pure half in `lib/contactCard262.ts` |
| C · editing on the card | d9e0a91d | a pencil per section (one at a time, they add), the band pencil for everything plus Contact details; one draft (`useAgentForm`, now with `reset`); save bar "{n} changes · also changes {m} things elsewhere"; Also notes under the field; sage flash on save |
| D · keeping your place | 21d83000 | the anchor rule; reveal by what's needed; focus without scrolling, caret at end; the rust discard guard on ✕, Esc, ‹ ›, another row, leaving the page; ⌘/Ctrl+Enter saves |
| E · locks and records | (this commit) | CL262 J1–J11 at both sizes, mutation proofs, L1 re-points, CLAUDE.md, this report |

## Decisions made

- **MaterialsField keeps its fourth row, "Other".** The card reuses the field whole rather than forking a three-row copy.
- **The response policy has two options**, as the model does (`noResponseMeansNo` true or false). "Not known" is the
  unset state, shown on the tile, not a third button.
- **Leaving the page is guarded by `beforeunload` only.** BrowserRouter cannot block an in-app route change.
- **The anchor falls back to the first visible section** when the action is outside one (the band, the pager).
- **Opening a second section reveals it only by what it needs.** J8 accepts "kept still" or "revealed with its heading
  in view", which is the brief's rule.
- **The old card's footer links (Record, See the query, Log) and Remove are not on the new card.** The next-step box
  carries the one action. See "For Nick".
- **Also notes are the engine's own sentences** (`alsoChanges`, run through the real derivation), so they are longer
  than the mock's two short lines.
- **The tile's tail ("· checked Jun") is a small grey aside**, as in the ref.
- **The new card's wrapper carries the old `data-cl24="agent-card"` marker**, so CL255 G3/G4 (History) reach it.

## Locks

`tests/e2e/cl262.measure.ts` (helpers `cl262Lib.ts`, fixture `seedCl262.mjs`: one gappy agent, reseeded by each reader,
removed in `afterAll`). All on the emulator.

| Lock | Claim | 1512 | 1280 |
|---|---|---|---|
| J1 | no panel background or padding; #a5837b frame; band #5e7189 on every stand | green | green |
| J2 | −1.2° at rest, 0° editing, −1.2° after; paging keeps the host and replays no arrival | green | green |
| J3 | name Source Serif 600 29px; tabs Special Elite; one next box, nothing else coloured | green | green |
| J4 | ghost lines on empty sections, one "+ Add" each, no old pill; each opens its section | green | green |
| J5 | a pencil opens only its section; a second adds; the band pencil opens all + Contact | green | green |
| J6 | genre chips, no free text; one sample unit; reply 1–26; Closed reveals Reopens | green | green |
| J7 | the Also note shows and the bar's count equals its lines | green | green |
| J8 | no jump: scrolled card, step ×3, Submit by, open Materials | green | green |
| J9 | focus held over 40 typed characters; edit-all focuses Name, caret at end | green | green |
| J10 | guard on ✕, Esc, ›, another row; Discard goes on | green | green |
| J11 | save writes once, one toast, sections close, lean returns | green | green |

**Red first, by mutation** (`mutation-proofs.txt`). Each lock went red under its own break: J1 a white panel, J2 no
lean, J3 a tinted section, J4 hidden "+ Add", J5 dead pencils, J6 hidden Reopens, J7 hidden Also, J8 a scroll to the top
after every click, J9 a blur on input, J10 a hidden guard, J11 a hidden toast.

**Found by the locks and fixed:** J10 (the pager unreachable while editing; and Discard on › stalled because the list's
own leave check asked again and ignored the yes) · J8 (Playwright's own scroll-into-view was being read as the card's
jump: the harness now brings each control into view before its reading).

**L1:** CL26 13/13. CL255 G1/G2 retired (the old Profile tab; `tests/e2e/RETIRED-contact-list-v26-2.md`); G3/G4 stand.
The unit suite: 11,250 passed. The 2 reds are `firestoreTarget.test.ts`, red before this pack over 27 older e2e data
scripts (cl251–cl256), none touched here.

## Screens

Dev shots in `shots/`, beside the ref's `design-refs/contact-list-v26-2/screens/`:

| Ref | Dev |
|---|---|
| 01-card-full | 01-card-you-1512 |
| 02-card-gaps | 02-card-none-1512 |
| 03-card-history | 03-card-history-1512 |
| 04-edit-genres | 04-edit-genres-1512 |
| 05-edit-materials | 05-edit-materials-1512 |
| 06-edit-how-also | 06-edit-how-also-1512 |
| 07-edit-all | 07-edit-all-1512 |
| 08-discard-guard | 08-discard-guard-1512 |
| 09-card-1280 | 09-card-1280 |

Frame strips: `10-strip-arrival-1512` (the arrival, six frames 110ms apart) and `11-strip-edit-how-1512` ("How
{first} works" opened mid-card, then a step: the card does not move).

## For Nick

1. **Remove an agent and the footer links are not on the new card.** Do you want "Remove" in Contact details, and
   "See the query" / "Log a query" back as a quiet line under the next-step box?
2. **The Also notes are long** (the engine's sentences, listing each page they touch). The mock's are short. A shorter
   wording is a copy change to `alsoChanges`, which other surfaces read too.
3. **The log-a-query flow still opens the v24 panel** (`AgentCardPanel24`) on /agents; only browsing and editing moved.
