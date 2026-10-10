# Import fixtures

Built by `node tests/fixtures/import/build.mjs`. Names are invented.

- `template-iso.csv` — the QueryHawk template with five queries dated `YYYY-MM-DD`. Exercises: a text ISO date arrives as written.
- `template-iso.xlsx` — the same five rows with their dates as real Excel date cells (format `m/d/yy`). Exercises: a date cell is read from its value, not its display text.
- `template-dmy.csv` — five rows dated `DD/MM/YYYY`. `23/04/2026` can only be read one way; `03/05/2026` is ambiguous. Exercises: the ambiguous date is asked about.
- `template-mixed.csv` — one unreadable date (`sometime in May`), one blank date, one row with no agent and no agency, one named agent with no agency. Exercises: the date question, undated records, the nameless row's count, the agency label.
- `smart-messy.xlsx` — a writer's own sheet with two real date cells, three text dates and one bare serial number. Exercises: what Smart Import is sent.
