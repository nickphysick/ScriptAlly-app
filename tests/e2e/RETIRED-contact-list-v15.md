# Retired by Contact list v15

Each entry names what retired, why, and where its claim lives now (if anywhere).

## Phase 1 — the open header (v15 §2)

| Suite | Case | Why | Now |
|---|---|---|---|
| `contactV13.measure.ts` | CL13-1 · band | The band (v14's compact hero card, its disc, its living sentence) is replaced by the page-local open header | CL15-1 (header), CL15-2 (headroom) |
| `contactV13.measure.ts` | CL13-2 · rhythm (band → strip → next-step section) | The band is gone; the rhythm under the header is the desk's and the section's | CL14-1 for now; the v15 desk and section locks (Phases 2 and 4) |
| `livingHeadersV3.measure.ts` | the Contact list's row in `PAGES` (LH1–LH7 for `/agents`) | The populated header is no longer a living header: the count is the title and the line is fixed | CL15-1. The **empty** state still draws the shared living header and is held by contactV13 CL13-14 |
| `livingHeadersV3.measure.ts` | LH9 · the Contact list filtered to nothing keeps its hero | The same | CL14-14 (the dead end) |
| `src/lib/livingHeaders.test.ts` | "the Contact list's two lines", and the Contact list's rows in LH9 and LH12 | `contactHeaderCopy` is deleted with the header it fed | — |
| `src/lib/contactList.test.ts` | "the facts sentence" | `heroFacts` is deleted; its one reader was the living header | — |

**Repointed, not retired:** CL13-12 (the loading header is the open header), CL14-1 (the header is v15's open header, not v131's card), `pageHeaderV2` §4 / §4.4 / §4.6 and `quietBar` Q8 (`/agents` is in the new `OWN_HEADER_ROUTES` register, exempt by name; §4.6's add door reads the header's own buttons).

**Deleted (their only reader was the band):** `CONTACT_BAND_DISC`, the `.clv-bdisc` rules, `contactHeaderCopy` / `ContactCopyContext` (`lib/livingHeaders`), `heroFacts` / `HeroFacts` (`lib/contactList`). `/images/contact-archivist.png` stays: the marketing Contact page reads it.
