# Contact list — the editorial empty state

`/agents`, blank account. Replaces the dashed box ("Your agent list starts here.") with a full
editorial page modelled on the Comparable titles intro, and suppresses the toolbar while there is
nothing on file. On `main`, **undeployed**.

## What landed

| | |
|---|---|
| `src/components/agents/ContactListEmptyState.tsx` | the page — hero, three stage plates, six feature rows, closing. Copy in exported constants. |
| `src/components/agents/contactListEmpty.css` | page-scoped styles under `.cle`, reading the page's own `--agl-*` tokens. |
| `src/lib/agentList.ts` | `contactListState` — the pure loading/blank/list gate. |
| `src/components/agents/AgentList.tsx` | mounts it; toolbar suppressed; the old welcome branch deleted. |
| `src/components/agents/ContactListLab.tsx` + `App.tsx` | `#/contact-lab`, DEV-only. |
| `src/lib/db.tsx` | `DbContext` exported for the labs. |
| `contactListEmptyState.test.tsx` · `agentsPageSmoke.test.tsx` · `contactEmpty.measure.ts` | 28 + 9 unit, 1 measured. |

## Decisions worth Nick's eye

**1. It is written in the house style, not in the brief's Tailwind.** The brief supplied Tailwind
arbitrary-value classes (`text-[rgba(58,50,44,0.62)]`) and asked, in the same breath, to reuse
Comparable titles' structure and to prefer token names over literal hex. Those two pull apart,
because this repo has no `tailwind.config` — Tailwind v4 with an `@theme` block — and every
comparable page (`comps.css`, `agentList.css`, `discover.css`) is a page-scoped stylesheet with
`--xx-*` tokens and semantic class names. The layout, spacing, copy and illustrations are the
brief's; the mechanism is the page's.

**2. Two of the brief's seven Form 11 colours do not exist in the app, and were NOT introduced.**

| brief | app | used |
|---|---|---|
| `--burgundy #72243E` | *nothing* | `--agl-burg #7c3a2a` — which the brief itself lists separately as "rust" |
| `--soft-pink #f8ece6` | *nothing* | `--agl-pink #f5e2da` — the app-wide CTA fill, four points away |
| cream / parchment / ink / clay | present under `--agl-*` | the token |

`#72243E` is a true burgundy against `#7c3a2a`'s brick, so this is a visible choice, not a rounding.
It paints the eyebrow numerals, the handwritten closing line, the monogram and the chip ink. Adding
it would put a second burgundy on a page whose every other accent is the first one — the shape that
produced the standing "four near-identical Pro blues" finding. **One token (`--cle-accent`) if you
want the darker one.**

**3. The band keeps its surface change, which Comparable titles retired.** Comps dropped its
`.ct-stages-band` when the stages moved to the *top* of the page — *"a wash that made sense as a
closing section reads as a header treatment there"*. Here the band **is** the closing section, which
is the case that note sanctions.

**4. No per-theme block, because the Agent list has none.** `agentList.css` carries one token set on
`.aglist` and no `.t-capp`/`.t-bold`/`.t-edn` override in 1,014 lines. Verified in the lab: the page
renders identically in all three, which is the page's existing claim rather than a new one.

**5. A DEV-only lab was added, and it was the only way to see this page.** The blank state exists
only on an account with no agents; the dev harness account has sixteen, so `/agents` can never show
it, and the alternatives were emptying somebody's data or creating a throwaway account.
`#/contact-lab` mounts **the real `AgentList`** over a stub db — a data substitution, not a
reconstruction of the page's chrome — which needed `DbContext` exported from `lib/db.tsx`. Three
data states and the theme toggle. **One line in `App.tsx` if you would rather not carry it.**

**6. The `agentsPageSmoke` toolbar assertion was retargeted, and the law is unchanged.** It asserted
`Filters` on the *empty* account, which is now the opposite of the spec. `Filters` moved to the
seeded render; the blank account's tripwire is the empty state's own copy. Both states still prove
they produce chrome rather than being a shell that failed to crash.

## The gate

`contactListState({ collectionsReady, agentCount, adding })` → `settling | blank | list`, in
`lib/agentList.ts`, five cases locked.

- **`collectionsReady` is an input** because `agents.length === 0` means "loading **or** empty" —
  without it the first-run page paints for a beat on every refresh.
- **`adding` is an input** because `onAddAgent` mints an *unsaved* stub that lives in the grid and
  not in `agents`. A blank account that has just pressed "Add your first agent" still has
  `agentCount === 0`; without this clause the new card is created, focused and scrolled to **behind
  the page that offered it**. Proven on the running page, not only in the unit: click the hero CTA
  and the reading is `cle: 0, toolbar: 1, cards: 1`.

## Measured — `contactEmpty.measure.ts`, real page, three widths

Precondition asserted first (`.cle:1 .agl-toolbar:0 cards:0`); scrollbar reported **0px — OVERLAY**,
so a classic-scrollbar question is not answered here.

| | 1440 | 768 | 375 |
|---|---|---|---|
| horizontal overflow (scroller · doc · body) | 0 · 0 · 0 | 0 · 0 · 0 | 0 · 0 · 0 |
| row order | `L R L R L R` | copy-first ×6 | copy-first ×6 |
| text-over-text (64 leaves) | 0 | 0 | 0 |

Focus rings: hero `solid 3px #f5efe7` (the page's own treatment, on its dark button), closing
`solid 2px #7c3a2a`, Discover link `solid 2px #7c3a2a`.

### ⚠️ The overlap check's first result was a fault in the check, not the page

Two "overlaps" — the agent's name against the agency line beneath it. `getBoundingClientRect()`
returns an **axis-aligned** box, and both sit inside a card at `rotate(-1.2deg)`: a 159px-wide line
reports **24.77px** of height against a **21.45px** line box, because 159 × sin(1.2°) = 3.33px.
`offsetHeight` reported the honest 21. Nothing was touching on screen. The scan now neutralises the
decorative tilts first — the claim is about layout, and text inside one card cannot collide with
text in the same card *because of* a tilt they both share.

Two more probe traps, both silent: `fullPage` screenshots this page as a viewport shot (the scroll
is inside `.wpg-scroll`, not the document), and a locator shot of the 6,000px `.cle` stitches a
white band where the content is. The frames come from scrolling the real scroller.

## Open / flagged

- The brief's `#72243E` and `#f8ece6` — see decision 2.
- **The rows are airy.** `min-height: 280px` on the art column with `align-items: center` (the
  brief's value) means a short card leaves ~150px inside its own row, on top of the 96px between
  rows. It reads as generous rather than broken, but it is the number to turn if it reads as sparse.
- Every `#/…-lab` route is stripped from **any** build — `import.meta.env.DEV` follows `NODE_ENV`,
  not `--mode`. `#/contact-lab` is reachable on `npx vite` only, and so is this measurement.
