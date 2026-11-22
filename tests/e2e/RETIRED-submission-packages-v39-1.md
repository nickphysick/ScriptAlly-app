# Retired and rewritten by Submission packages v39.1 (28 Oct)

Nothing was deleted. Six v39-era assertions described things v39.1 deliberately changes, so they were rewritten;
each rewritten half was proved red by its own break (reports/submission-packages-v39-1/mutation-proofs.txt).

| Suite · lock | Was | Now | Why |
|---|---|---|---|
| pk39 L3 | exactly one label is ringed, and it is the selected one | no label is ringed; exactly one is selected (pk391 L3 owns the bar) | Part C: the ring, glow and lift are gone; the selected label has a 3px bar |
| pk39 L4 | the cards are 28 ± 1 apart | 24 ± 1 | Part E |
| pk39 L4 | exactly one stage indicator (`data-pk39="stage"`) | exactly one status pill (`data-pk39="status"`) and no stage | Part C retired the stage dots |
| pk26 PK26-W | the builder is 48 in from the sheet | the builder shares the header card's inset | Part A: one width, the Contact list card's |
| pk38 L8 | the New package *dialog* (`.p6-pdlg`) opens | the New package *drawer* (`[data-pk391="pd"]`) opens | Part H |
| pk38 L8 | two named mono labels allowed | four: v39's two, plus "Your packages" (Part B) and the drawer form's field labels (the ref's computed `.pd-f > span`) | Part B and the ref |

Breaks strengthened (each was being out-ranked by v39.1's new rules and stayed green): pk38 `L8`, pk39 `L4` (now also
plants a stage element), pk39 `L3` (now also rings the selected label), pk26 `PK26-W` (now the builder's own margin).
