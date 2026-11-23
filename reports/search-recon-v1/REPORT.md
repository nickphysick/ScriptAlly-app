# Search recon v1 — why search says "Not queried" for an agent with a live query

23 Nov 2026 · read-only · branch `search-recon-v1` off the dev line `…-laq21-mg1-pc3` @ `89df401ee` (dev serves `index-BoV5x3Ge.js`) · no `src/` edits, no deploy.

## 0. False premises first

1. **"Search disagrees with the app" — it disagrees with the Query Centre, and agrees with the Contact list.** Search's agent row, the Contact list's standing and the agent card all read *the shell's book* (`scriptally_active_manuscript_id`). The Query Centre does not: it opens on **every** manuscript (`qcScope` starts `null`) and never reads the shell's book. On Noah Bright the Contact list says "Not queried" too (table §3, column "Contact list"). The odd one out is the Query Centre's scope, not search alone.
2. **"His Offer card is on the Query Centre, so he has a live query on the book in hand" — he has one query, on a different book.** Noah's only query (`seed-query-12`, Offer) is on *The Smoke Test* (`seed-ms-1`). With nothing stored, the shell's book is *Murphy's Day Out* (`cv25-ms`) — see 3.
3. **"The active book is the most recently created" — on this account it is the first by document id.** `resolveScopedManuscript` falls back to the newest `createdDate`; **none of the seven seed manuscripts has one** (they carry `statusChangedDate`), and `db.tsx` subscribes with no `orderBy`, so the fallback is array order = document-id order, and `cv25-ms` sorts first. The live account is the seed's source (harness.json is its 2 Nov copy), so the same holds on dev unless the switcher has stored a choice in that browser.
4. **"It is this agent only" — it is 34 of the 48 queried agents** on the default book (§3), and up to 48 of 48 on another.
5. **Not the cause, checked:** `padLiveQueries` (the QC's dev-only padding) is inert unless a `window.__SA_QC_*` flag is set, so the card is a real query, not a padded copy.

## 1. The two code paths

**Search (the agent row's chip, "Not queried", and its peek)**
- `src/components/shell/usePalette.tsx:101–113` — on opening, `resolveScopedManuscript(manuscripts, localStorage["scriptally_active_manuscript_id"])`, then `buildCorpus({ agents, queries, … })` with `corpusSources(…)` supplying `activeManuscriptId` (`src/lib/searchSources.ts:122`).
- `src/lib/searchPalette.ts:637–638` — `activeQueryOf`: for each query **on the active manuscript only**, the **first one in array order** per agent (`!activeQueryOf.has(q.agentId)`). No live-over-closed rule, no stage order.
- `searchPalette.ts:657–666` — the row's `status: q?.status`, the peek's `queriedLine`, and the second action ("Open the query" vs "Log a query to …").
- `src/components/shell/SearchDesk.tsx:258` — `it.status ? <StatusChip …/> : <span>Not queried</span>`; `:305` the peek's "Not queried for {book}."
- Records read: `users/{uid}/agents`, `users/{uid}/queries` (fields `agentId`, `manuscriptId`, `status`), `users/{uid}/manuscripts` (`id`, `title`, `createdDate`), and the localStorage key. Query rows carry their own `status`; activities are not read for an agent row.

**Query Centre (the Offer card)**
- `src/components/Queries.tsx:2649` — `qcRows = buildQcRows(queries, agents, activities, now)` (`src/lib/qcSummary.ts:170`): one row per query, every manuscript, status from the stored query, history from `activities`.
- `Queries.tsx:2547` — `const [qcScope, setQcScope] = useState<string | null>(null)`; `:3986` `qcScoped = … inScope(r, qcScope)`; `qcSummary.ts:494` `inScope = manuscriptId == null || row.manuscriptId === manuscriptId`. **`null` is every book.** Only the page's own scope picker (`pickQcScope`, `:4198`) changes it; the shell's key is never read here.
- Records read: `users/{uid}/queries` (whole docs), `agents`, `activities`, `manuscripts` (titles for the scope list).

**For comparison — the Contact list** (`src/lib/contactList.ts:68–83, 160–173`): `agentRows(rows, agentId, scopedMs)` then `standingQuery` — the furthest-along *live* query, else the latest close. Same book scope as search, but a stated rule for which query speaks.

## 2. Why they disagree for Noah Bright — reproduced

Seed (`tests/emulator-seed/harness.json`): agent `seed-agent-12` Noah Bright (Bright Literary); one query `seed-query-12`, **Offer**, `manuscriptId: seed-ms-1` (*The Smoke Test*), sent 10 Jun 2026. Manuscripts in document-id order: `cv25-ms`, `cv25-ms-empty`, `db60-pre`, `msv12-ms`, `seed-ms-1`, `seed-ms-2`, `thin-ms` — no `createdDate` on any.

With no stored choice the shell's book resolves to `cv25-ms`; `activeQueryOf` has nothing for Noah there; the row says "Not queried". The Query Centre, scoped to every book, draws his Offer card.

**Rendered on the emulators** (`tests/e2e/searchRecon.measure.ts`, `npm run e2e:emu` through the slot, 1512×950, Chromium; 2 passed; readings in `repro.json`):

| | Stored book | Query Centre | Search row, right | Search peek | Second action |
|---|---|---|---|---|---|
| Arrival | none (`null`) → Murphy's Day Out, shown on the rail's spine | Noah's Offer card: "Offer · Sent 10 Jun · 166 days ago · Answer the offer" | **Not queried** | "Not queried for Murphy's Day Out." | **Log a query to Noah** |
| Key set to `seed-ms-1` | The Smoke Test | (same card) | **Offer** | "Queried 10 Jun for The Smoke Test" | Open the query |

`search-default-book.png`: the same results list shows the agent row "Not queried" and, directly under it, the task **"Answer Noah's offer"**. Search's own task group knows about the offer; its agent row does not. The second action invites the writer to log a second query to an agent who has made an offer. The key was put back to `null` afterwards; nothing was written to Firestore.

The seed lacks nothing: it reproduces as is.

## 3. A class, not one agent — every seed agent through both paths

`reports/search-recon-v1/bothPaths.ts` runs the real `buildCorpus`, `buildQcRows`, `resolveScopedManuscript` and `standingQuery` over the seed (53 agents, 205 queries), once with nothing stored and once per stored book. Full output: `both-paths.json`.

| Shell's book | Agents with any query | **A**: search "Not queried", QC shows cards | **B**: search names a different query than the Contact list's standing |
|---|---|---|---|
| none stored → Murphy's Day Out (`cv25-ms`) | 48 | **34** | 0 |
| Murphy's Day Out (`cv25-ms-empty`) | 48 | 48 | 0 |
| DB60 Pre-query | 48 | 48 | 0 |
| Harbour of Glass | 48 | 42 | 0 |
| **The Smoke Test** (Noah's) | 48 | 24 | **7** |
| The Quiet Second | 48 | 46 | 0 |
| The Quiet Fixture | 48 | 44 | **1** |

In class A, search and the Contact list agree on every row (both book-scoped); only the Query Centre differs.

**Class A on the default book (34):** Mira Kovic, Douglas Renner, Edda Voss, Theo Abara, Sun-hee Park, Rosa Quintana (all Harbour of Glass); Wren Calloway, Imogen Rackham, Imogen Vale, Tobias Hark, Tamsin Probewell, Elinor Hale, Peter Vance, Iris Kwan, **Noah Bright**, Tom Ellery, Marcus Reed, Priya Nair, Joan Whitfield, Sam Okoro, Rachel Lin, David Marsh, Ana Duarte, Bea Halloran, Rufus Oyelaran, Alasdair Crewe, Wren Ashcombe, Cormac Bligh, Ottoline Frayn, Hester Blaine (The Smoke Test); Tobias Quint, Rosalind Vale, Devendra Rao, Imogen Farr (The Quiet Fixture). Live among them: an Offer (Noah), a Revise & Resubmit (Iris Kwan), Full sents and requests.

**Class B — a second defect, on the agent's own book.** Where an agent has several queries on the book, search takes the first in document-id order. The Contact list takes the furthest-along live one.

| Book | Agent | Search shows | Contact list's standing | Their queries on that book |
|---|---|---|---|---|
| The Smoke Test | Peter Vance | Partial Sent | Full Sent | Partial Sent, Full Sent |
| The Smoke Test | Tom Ellery | **Rejected** | Queried | Rejected, Queried, Rejected, Queried |
| The Smoke Test | Marcus Reed | Partial Requested | Full Requested | Partial Requested, Full Requested, Rejected, Queried |
| The Smoke Test | Priya Nair | Queried | Partial Sent | Queried, Partial Sent, Rejected, Queried |
| The Smoke Test | Joan Whitfield | **Rejected** | Queried | Rejected, Rejected, Withdrawn, Queried |
| The Smoke Test | Rachel Lin | Queried | Partial Requested | Queried, Queried, Partial Requested |
| The Smoke Test | David Marsh | **Rejected** | Partial Sent | Rejected, Partial Requested, Partial Sent |
| The Quiet Fixture | Devendra Rao | Queried | Partial Sent | Queried, Partial Sent |

Three of them show a closed status for an agent with a live query on the very book in hand. "Open the query" then opens the closed one. Document-id order is what a fresh read gives; nothing guarantees it, so this pick is arbitrary in any case.

## 4. The smallest fix — options, none applied

Two decisions, because there are two defects. **B is a bug whatever is decided about A.**

**For A (the scope split):**
- **A1 — search follows the Query Centre: every book.** The agent row's chip is the agent's standing across all manuscripts; the peek names the book (`Queried 10 Jun for The Smoke Test`). Files: `src/lib/searchPalette.ts` (drop the `activeManuscriptId` filter in `activeQueryOf`, carry the query's book title into `queriedLine`), `src/lib/searchSources.ts` (manuscript titles by id), `SearchDesk.tsx:305` copy ("Not queried for {book}" → "Not queried"). Locks: `searchPalette.test.ts` — an agent whose only query is on another book gets its status and the book's name; an agent with none reads "Not queried". It leaves search disagreeing with the Contact list and the agent card, which stay book-scoped.
- **A2 — book first, then any book (smallest honest change).** Keep the shell's book. When the agent has nothing on it but has queries elsewhere, the row says so instead of "Not queried": e.g. "Not queried for Murphy's Day Out" and, in the peek, "Queried for The Smoke Test · Offer". "Not queried" is kept for an agent with no query at all, the existing term. Files: `searchPalette.ts` (a second map, `anyQueryOf`, and a field on the agent item/peek), `SearchDesk.tsx:258/305` (the right-hand cell and the peek line). Locks: `searchPalette.test.ts` for the three cases (on this book / elsewhere only / none); one rendered check in a search measure for Noah on the seed. Copy needs your wording.
- **A3 — the Query Centre follows the shell's book.** `qcScope` initialised from the shell's key. Files: `Queries.tsx` (initial state + a reader of the key), the QC decisions doc. Largest blast radius: the page's headline counts, Birds-eye and every QC measurement would change, and Noah's card would vanish from the default view. Not recommended as the fix for this.
- **A4 — make the fallback mean what its comment says.** Independent of A1–A3: manuscripts without `createdDate` make "the most recently created" mean "the first id". Either backfill `createdDate` from the earliest of `statusChangedDate` / the first query's send (a data change: rules and import touch it, so full lane), or fall back on `statusChangedDate` in `mostRecentlyCreated`. Files: `src/lib/shellSidebar.ts` and its test. This changes which book every book-scoped page opens on, so it is your ruling, not a quiet fix.

**For B (which query speaks for the agent):**
- **B1 — search uses `standingQuery`.** Build `qcRows` once (the same `buildQcRows` the QC uses, or a light row with `court` and `lastMs`), and pick each agent's query with `standingQuery(agentRows(rows, agentId, bookId))` from `src/lib/contactList.ts`, the rule the Contact list already states. Files: `src/lib/searchPalette.ts` (replace the first-in-order loop), `src/lib/searchSources.ts` or `usePalette.tsx` (pass the rows, already built for `rows`/state words). Locks: `searchPalette.test.ts` — an agent with a Rejected then a Queried query on the book shows Queried; a Partial Sent and a Full Sent shows Full Sent; reversing the input order changes nothing (the red-first mutation is the current first-wins loop).
- **B2 — the narrowest patch:** keep the loop but prefer a live query over a closed one, then the later stage. Smaller, but a second statement of a rule that already exists — the repo's rule is one rule, stated once. Not recommended over B1.

**Recommendation:** B1 with A2. It fixes the wrong statuses, keeps search's book scope (the same as the Contact list and the agent card), and stops calling an agent "Not queried" when they have an offer. A4 is worth a separate ruling.

## 5. Rulings wanted

- **R1.** A1, A2 or A3 for the scope split (and A2's words, if A2).
- **R2.** B1 (recommended) or B2.
- **R3.** A4: should the shell's default book be the first by id on accounts without `createdDate`?

## Files

- `bothPaths.ts` — the both-paths table (run: `npx vite-node reports/search-recon-v1/bothPaths.ts`).
- `both-paths.json` — its output.
- `tests/e2e/searchRecon.measure.ts` — the rendered reproduction (read-only; it puts the localStorage key back). ⚠️ It asserts TODAY'S behaviour ("Not queried"), so it is a reproduction, not a lock: it lives on this branch only, and a fix turns it into the red-first proof (invert its middle assertion) rather than merging it as it stands.
- `repro.json`, `search-default-book.png`, `search-smoke-test-book.png` — its readings and frames.
