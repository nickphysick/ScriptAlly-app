# Retired by To-do list v5.2

Each line names what was retired, by which part, and why. The rest of each file stands and still runs.

| Where | What | Part | Why |
|---|---|---|---|
| `todoV5Shots.measure.ts` | shot **05 · filtered to To chase** (`[data-td5="card-row"][data-k="chase"]`) | A | The populated header's counts card is replaced by the calendar card; the counts rows no longer exist on a populated page. v5.2's screens replace it. |
| `todoV5Shots.measure.ts` | shot **06 · just the desk** (`[data-td5="focus"]`) | E | "Just the desk" is retired: the button, its state (`focusMode`) and the desk-only layout (`.td5-sheet[data-focus]`, `.td5-focusbtn`). The pin replaces it; TD52 E1/E2. |
| `todoV5.measure.ts` | **TD5 A1** (the title's n is the badge) | F | The populated h1 now says what's urgent ("33 overdue · …", TD52 F1); the tray's count lives in the navy row and the "In your tray" tab. |
| `todoV5.measure.ts` | **TD5 A2** (the counts card: rows sum to n, a press filters) | A | The counts card leaves the populated header; its successor is the calendar card's today panel (TD52 A3). |
| `todoV5.measure.ts` | **TD5 B1** (the Cleared ring's arc) | A | The ring leaves the populated header with the counts card. |
| `todoV5.measure.ts` | inside **TD5 D2**'s `sendFromDesk`: "cleared +1" and the ring's proportion | A | Retargeted, not retired: the save's evidence is the slip, which the case still asserts with an exact Undo. |
| `todoV51.measure.ts` | inside **TD5 I4** and **I5**: n read from the h1 | F | Retargeted to the "In your tray" tab's count (the same unfiltered n). |

**Red on the base build too, not caused by v5.2:** TD5 E2 — "sent: the same documents written, field by field": the desk's write carries `lastSentLabel` and the panel's does not (measured on fb25648a's build, 27/28 there as here).
| `qcV138.measure.ts` D1 | a recorded note (not an assertion) read `[data-td5="card-row"]` on /todo | I | Re-pointed to the calendar card's today rows and mix bar. |
| `todoV5.measure.ts` C2 | "art breaks out" | D | **Kept, unchanged:** it reads the TRAY bands' drawings, which still break out; v5.1 has no desk-head art assertion to retire (the pack expected one). |
| `todoV51.measure.ts` E2 | — | — | **Red on the base build too** (see above), not retired. |
