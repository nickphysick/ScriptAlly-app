# Contact list v15 — red before green

Every new lock is run against the build before v15 (`8093d64f`, served from `/private/tmp/sa-cl14base`) and against its
named mutations (`mutation-proofs-p*.jsonl`) before its green is believed.

## Phase 1 — CL15-1, CL15-2 against 8093d64f
`2 failed · 1 passed` (the pass is sign-in). CL15-1: "population: the open header renders — no header" at both widths.
CL15-2: no drawing to measure (`img null`), at both widths. Mutations A–F each red at the assertion they name.

Pre-existing, measured on the baseline too and not this pack's: `inkShell` INK19 (one phone-width element 360 wide at
x 15 against main's 390 at 0, on routes v15 does not touch) and `pageHeaderV2` §4.5 (the switcher's add-manuscript item
is disabled for the harness account).

## Phase 2 — CL15-3 against 8093d64f
`1 failed · 1 passed` (the pass is sign-in). CL15-3: "population: the desk renders — no desk" at both widths, then the
floor ("fewer readings than it claims"). Mutations A–I each red at the assertion they name
(`mutation-proofs-p2.jsonl`): the card header at the mock's 34px (201 / 187 tall), a row repeating the stamp, every
bar solid, a Profiles stamp, a Queried press that does not filter, the stamp's padding shrunk, the desk 12 under the
header, a Profiles press that does nothing, titles in the card's colour.

Neighbours on the Phase 2 build, one worker: `contactV15` + `contactV14` + `contactV13` + `contactV11` — 40 passed.

## Phase 3 — lock 4, lock 7 (unit), CL15-5, CL15-5b (rendered)
Against 8093d64f: CL15-5 red on ten readings (the pill leaves the genre-filtered set, no mode marker, no ✕, the
v14 sentence, plain = ready); CL15-5b red on three (the v15 header's count is not there to read). The
unit locks have no baseline run: their subject (`isReady`, the three-state type) does not exist before v15.

Mutations (`mutation-proofs-p3.jsonl`), each red at the assertion it names: an agent with no genres treated as a
mismatch (lock 4); the old picker restored (lock 7); the pill using the plain Open + Not queried filter (28 rows
against a pill of 3); the mode on by default (CL15-5b: 2 rows of 37); the ✕ doing nothing; a filter change not
leaving the mode; the mode not remembered.

Neighbours on the Phase 3 build, one worker: `contactV15` + `contactV14` + `contactV13` + `contactV11` — 41 passed,
1 failed (CL13-12, the loading beat: the placeholder section 31px taller than the loaded one); fixed in the skeleton
and re-run green.

## Phase 4 — CL15-5a against 8093d64f
`1 failed · 1 passed`. CL15-5a: "population: the Ready state on the stage" at both widths (no stage, no card slot, no
panel). Mutations A–J each red at the assertion they name (`mutation-proofs-p4.jsonl`): v14's 44 gap (10 to the
panel), the panel 100 under the card, the card under the panel, the text in a well, every card "First up", the first
row tinted whatever is picked, a 120ms rise, the agency in place of "Genres not recorded", the reply time shown
below 1440, the workspace 30 under the section. A and J bite at 1512 only: below 1440 the margins are the media
rule's own.

Neighbours on the Phase 4 build, one worker: `contactV15` + `contactV14` + `contactV13` + `contactV11` — 43 passed.

## Phase 5 — CL15-6 against 8093d64f
`1 failed · 1 passed`. The fixtures put v14's own done state on the page, so the reds are readings, not a missing
subject: v14's title ("Every agent queried"), its sentence, no split line, no accounting, the Add card at 22 26 with
a 56px plus, no coming-soon panel, no request button.

Mutations A–I each red at the assertion they name (`mutation-proofs-p5.jsonl`): queried counting only the agents who
fit ("0 of your 37"), the split line without its withdrawn part, the Add card at v14's 322 minimum (the panel 390),
the Add card see-through, the prefs reader dropping the request (the press does not hold), the mismatch note shown
whatever the count, the "of your N" sentence when everyone is queried; and at unit, a past reopening date not counted
as closed, and the desk counting queries rather than agents.

Neighbours on the Phase 5 build, one worker: `contactV15` + `contactV14` + `contactV13` + `contactV11` — 44 passed.
