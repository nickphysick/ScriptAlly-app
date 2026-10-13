# Retired and re-pointed by Contact list v16 (12 Oct)

Contact list v16 makes the list the page: the desk, the next-step section, the banner, the list's title bar and
its hawk, and the A to Z rail are removed; the header is the title panel; a row opens the agent panel, not the
centred agent card. Each lock below is `test.skip` in place with a one-line note, or re-pointed with a comment at
the line.

## Retired (the subject is gone)

| Suite | Case | Held now by |
|---|---|---|
| contactV15 | CL15-3 · desk presses | CL16 B1, B2 (the strip filters) |
| contactV15 | CL15-5 · pill = section = rows | nothing: the next-step section and its pill are gone |
| contactV15 | CL15-5a · layout | nothing: the next-step section is gone |
| contactV15 | CL15-5b · load state | headerPanelV2 P6 (the header) and CL13-12 (the strip and first row) |
| contactV15 | CL15-6 · all queried | nothing: the next-step section is gone |
| contactV151 | CL15.1-B · band, ready | nothing: the band is gone |
| contactV151 | CL15.1-B · band, all queried | nothing: the band is gone |
| contactV152 | CL15.2-K5 · tuck, ready | nothing |
| contactV152 | CL15.2-K5–K7 · all queried | nothing |
| contactV152 | CL15.2-K8 · banner | CL16 C1 (no banner) |
| contactV152 | CL15.2-K9 · copy | CL16 A1 (the two buttons), C1 (no title bar) |
| contactV14 | CL14-1 · order | CL16 C1 |
| contactV14 | CL14-3 · next step | nothing |
| contactV14 | CL14-5 · workspace | CL16 C1, C2 |
| contactV14 | CL14-6 · pills | CL16 B2 |
| contactV14 | CL14-12 · rail | CL16 D2 (the letter tabs never pin) |
| contactV13 | CL13-10, the agent card's half and the under-1100 chip | CL16 F5, G1 |
| contactV11 | Escape and the backdrop return a CLEAN editor to the quick view (§11.6) | CL16 F5 (Escape in the panel's editor) |
| contactV11 | §11.7 write half | **nothing rendered** (see below) |
| contactV11 | §11.7's third leg | **nothing rendered** (see below) |
| contactV11 | Log query, door 2 (the card docks) | CL16 F5 |
| headerPanelV2 | A1 A2 A3 A4 A5 A6 · the Query Centre and Contact list panels | CL16 A1 |
| headerPanelV2 | C1 · every badge is a solid white disc | nothing: the desk's badges are gone |
| headerPanelV2 | D1 D2 D3 D4 D8, D5, D6, D7 · the Contact list's badge cards | nothing: the desk is gone |
| headerV3 | H3 "N is the three kinds of agent added up", H5 "the hidden sentence" for /agents | CL16 B1 (the strip's cells add up) |

Already skipped before v16 and left so: CL15-1, CL15.1-HD, CL15.2-K1–K4, CL15.3-N1–N5, CL15.3-N6.

### Two gaps this leaves

`§11.7 write half` and `§11.7's third leg` drove a SAVE through the centred card opened from a row, and read the
card's quick view afterwards. The editor and its save are unchanged and now run inside the agent panel; the
read-only half (`§11.7 — the reply-time note is live…`) is re-pointed there and green. The two writing halves are
not re-pointed. Nothing rendered now holds "save says what else moved" or "a window crossing today moves the row".

The dock chip's peek (`proveDockPeek`) was only ever proved on a card opened from an /agents row. The card still
docks from its other doors (the Dashboard, the query panel's Agent tab); no rendered lock holds the peek there.

## Re-pointed (the claim stands, the subject moved)

- `cl13Lib.openContacts`: clears `sa.contactList.v4` and `sa.contactFull`; the default grouping is "none".
- contactV11: the default list draws no band; the lab's new row states its own initial; "+ Add an agent" case no
  longer presses "View all agents"; the index strip case asks for the letter grouping first and reads the landing
  from CL16 C4; the reply-time note case opens the editor in the agent panel.
- contactV13: CL13-12 (the strip is `[data-cl16="strip"]`; no perched art; the title has no painted-over shape),
  CL13-13 (step 1 rings the strip; step 2 is "Add agents"), CL13-14 (the column is the strip's).
- contactV14: CL14-7 (folds at 1512 as well, as the v16 reference draws), CL14-8 (opens ungrouped; the headings
  sort; the letter tabs are drawn under every grouping), CL14-9 (the v4 key and v16's defaults), CL14-11 (the
  headings pin under the bar and filter row; no divider when ungrouped), CL14-15 (runs at 1920, where the chip
  it presses is on the row), CL14-16 (the guide's v16 steps).
- headerV3: `/agents` moved from the NUMBER routes to the TITLE routes; the subline population floor is 4.
- headerPanelV2: the floor counts the six P ledgers (320).
- qcV137 E1: the lip baseline's `/agents` title offset re-captured (57.0, was 69.4).
