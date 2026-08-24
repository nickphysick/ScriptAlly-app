/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list — the editorial empty state (blank account, zero agents).
 *
 * ⚠️ IT IS THE COMPARABLE TITLES PAGE'S GRAMMAR, NOT A SECOND ONE. Structure, measures, block
 * rhythm and the dashed placeholder plate are `compsMarketing.tsx` + `comps.css` verbatim in
 * intent: two measures that deliberately do NOT align (1060 for copy, 1240 for the three-across
 * stages), 96px between blocks, a 4:3 dashed plate carrying the illustrator's brief, `flip` as
 * `order` on two grid children and never a second markup order. Anything that reads as a
 * near-copy of a `ct-` rule is that on purpose; the day the two pages should differ, they differ
 * by a value, not by a mechanism.
 *
 * ⚠️ THE COPY LIVES IN EXPORTED CONSTANTS, NOT IN THE JSX. Same reason as `noteboardEmptyState`:
 * a sentence in two places is two sentences the day one is edited, and a lock can only read what
 * it can name. `body` is a SEGMENT LIST rather than a string because four of the six rows carry
 * mid-sentence emphasis — a plain string would have forced the emphasis into the JSX, which is
 * exactly where copy stops being lockable.
 *
 * ⚠️ EMPHASIS IS WEIGHT AND VALUE, NEVER HUE. `<strong>` steps the body's soft ink up to the
 * page's full ink at 600; it does not change colour. The house law forbids colour-shifted
 * emphasis inside a heading, and the reason it gives — a sentence that changes colour reads as
 * two things — applies to a paragraph the same way.
 *
 * ⚠️ THE ILLUSTRATIONS ARE BUILT FROM THE PAGE'S OWN FURNITURE, and the sample record is ONE
 * record. Amara Osei of Osei Literary, London, appears in all six: the section is a single agent
 * record being assembled field by field, so a second name in row four would break the only idea
 * the six rows share. The three STAGE plates are named dashed placeholders at the ref's
 * dimensions — no stock art, no generated images, no emoji; the names are the illustrator's brief.
 *
 * ⚠️ NO ROUTER HOOK HERE. The page is handed `onNavigate` — App.tsx's bridge — and Discover is
 * reached as `("agents", "Discover new agents")`, the same call `railNav` makes. A `useNavigate`
 * inside this component would be a second way to reach one route, and the bridge is the one that
 * also clears the global search query.
 */
import React from "react";
import { Plus } from "lucide-react";
import "./contactListEmpty.css";

/* ────────────────────────────── copy ────────────────────────────── */

/** A run of body copy: plain text, or a span the row emphasises. */
export type CleSeg = string | { em: string };

export const CLE_HERO = {
  heading: "These are the people who will champion your words.",
  body:
    "Grow your list. Gather all the detail you can. This is the data that everything is built on — " +
    "the bedrock of your campaign. The right agent is out there, so let's get them on file.",
  cta: "Add your first agent",
} as const;

export interface CleStage {
  /** The illustrator's brief — rendered in the plate, and the name the artwork ships under. */
  slot: string;
  label: string;
  heading: string;
  body: string;
}

export const CLE_STAGES: readonly CleStage[] = [
  {
    slot: "agent-stage-add",
    label: "Stage one",
    heading: "Add agents from your own research",
    body:
      "Record the agents already on your radar — from acknowledgements pages, wishlists, and pitch " +
      "events — with their agency, genres, and submission guidelines.",
  },
  {
    slot: "agent-stage-discover",
    label: "Stage two",
    heading: "Discover agents who match your manuscript",
    body:
      "Discover reads your manuscript's genre and comps and surfaces open agents representing books " +
      "like yours — each with their wishlist shown.",
  },
  {
    slot: "agent-stage-track",
    label: "Stage three",
    heading: "Query them and follow every response",
    body:
      "Send queries straight from your list, watch statuses move from Queried to Offer, and get a " +
      "nudge when it's time to follow up.",
  },
];

/** ⚠️ NO SUBHEADING UNDER IT, DELIBERATELY (the brief's own instruction) — the six rows are the
 *  explanation, and a standfirst saying the same thing is a second voice for one idea. */
export const CLE_RECORD_HEADING = "What makes a strong agent record?";

export interface CleRow {
  n: string;
  title: string;
  body: readonly CleSeg[];
  /** copy on the right */
  flip: boolean;
  Art: React.FC;
}

/* ───────────────────────── the sample record ─────────────────────────
 * ⚠️ ONE AGENT, SIX ROWS. The identity block is a component rather than six copies, so the name,
 * the agency and the initials cannot drift apart between illustrations.
 * ⚠️ AND EVERY VALUE IS INVENTED. No real agent, no real agency, no real submission address —
 * `oseiliterary.co.uk` is not a domain anybody holds, and it must stay that way.
 * ⚠️ NO GENDERED PRONOUN REACHES THE READER. The app never stores an agent's pronouns, so the
 * illustrations say "the agent" or address the writer; the two microcopy lines that name a person
 * ("How to reach them", "From their MSWL") use they/them. */
const SAMPLE = { initials: "AO", name: "Amara Osei", agency: "Osei Literary", city: "London" } as const;

/* ───────────────────────── illustration atoms ───────────────────────── */

const Micro: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="cle-micro">{children}</div>
);

const Chip: React.FC<{ children: React.ReactNode; hot?: boolean }> = ({ children, hot }) => (
  <span className={`cle-chip${hot ? " cle-chip--hot" : ""}`}>{children}</span>
);

/**
 * ⚠️ THE TWO PILLS DEPICT REAL PAGE STATES AND ARE STILL ILLUSTRATION. Sage = a standing the app
 * really draws; sand = a nudge really falling due. They carry no live value and must never be
 * mistaken for the real components — which is why they are `aria-hidden` along with the rest of
 * each card and why nothing here imports `StatusDot`.
 */
const Pill: React.FC<{ tone: "sage" | "sand"; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`cle-pill cle-pill--${tone}`}>
    <span className="cle-pill-dot" />
    {children}
  </span>
);

/** The floating record card the six scenes are built from. */
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`cle-card${className ? ` ${className}` : ""}`}>{children}</div>
);

const Identity: React.FC = () => (
  <div className="cle-ident">
    <span className="cle-ident-mono">{SAMPLE.initials}</span>
    <span className="cle-ident-txt">
      <span className="cle-ident-name">{SAMPLE.name}</span>
      <Micro>{`${SAMPLE.agency} · ${SAMPLE.city}`}</Micro>
    </span>
  </div>
);

/* ─────────────────────────── the six scenes ─────────────────────────── */

const GenresArt: React.FC = () => (
  <div className="cle-art cle-art--genres">
    <Card className="cle-card--tilt-a">
      <Identity />
      <div className="cle-chips">
        <Chip hot>Crime</Chip>
        <Chip>Literary thriller</Chip>
        <Chip>Book club fiction</Chip>
      </div>
    </Card>
    <span className="cle-badge">
      <Pill tone="sage">Strong fit</Pill>
    </span>
  </div>
);

const MaterialsArt: React.FC = () => (
  <div className="cle-art">
    <Card className="cle-card--tilt-b">
      <Micro>Send with your query</Micro>
      <div className="cle-chips">
        <Chip hot>Query letter</Chip>
        <Chip>Synopsis · 1 pg</Chip>
        <Chip>First three chapters</Chip>
      </div>
      <p className="cle-cardnote">Pasted in the body — no attachments.</p>
    </Card>
  </div>
);

const WishlistArt: React.FC = () => (
  <div className="cle-art">
    <Card className="cle-card--tilt-c cle-card--quote">
      <span className="cle-quotemark" aria-hidden="true">&ldquo;</span>
      <p className="cle-quote">
        Crime rooted in a real place — towns that have lost something. Give me two men with a grudge
        and a reason to go home.
      </p>
      <Micro>From their MSWL · updated Mar</Micro>
    </Card>
  </div>
);

const ResponseArt: React.FC = () => (
  <div className="cle-art">
    <Card className="cle-card--tilt-d">
      <div className="cle-kv">
        <span className="cle-kv-k">Responds within</span>
        <span className="cle-kv-v">8–10 weeks</span>
      </div>
      <div className="cle-kv cle-kv--last">
        <span className="cle-kv-k">Worth chasing</span>
        <span className="cle-kv-v">yes · once, politely</span>
      </div>
      <div className="cle-pillrow">
        <Pill tone="sand">Nudge due · ~11 Aug</Pill>
      </div>
    </Card>
  </div>
);

/* ⚠️ THE GLYPHS ARE TEXT AND THEREFORE `aria-hidden` ON THE TILE, not in the row's label. A "✉"
   read aloud before an address is noise; the address itself is the content. */
const ContactLine: React.FC<{ glyph: string; children: React.ReactNode }> = ({ glyph, children }) => (
  <div className="cle-cline">
    <span className="cle-cline-g" aria-hidden="true">{glyph}</span>
    <span className="cle-cline-t">{children}</span>
  </div>
);

const ContactArt: React.FC = () => (
  <div className="cle-art">
    <Card className="cle-card--tilt-e">
      <Micro>How to reach them</Micro>
      <div className="cle-clines">
        <ContactLine glyph="✉"><span className="cle-mono">submissions@oseiliterary.co.uk</span></ContactLine>
        <ContactLine glyph="⌘"><span className="cle-mono">oseiliterary.co.uk</span></ContactLine>
        <ContactLine glyph="◎">London, UK</ContactLine>
        <ContactLine glyph="☍">
          <span className="cle-socials">
            {["@amaraosei", "bsky", "in"].map((s) => (
              <span className="cle-social" key={s}>{s}</span>
            ))}
          </span>
        </ContactLine>
      </div>
    </Card>
  </div>
);

const PersonalisationArt: React.FC = () => (
  <div className="cle-art cle-art--stack">
    <Card className="cle-card--tilt-f cle-card--behind">
      <Identity />
    </Card>
    <Card className="cle-card--tilt-g cle-card--note">
      <Micro>
        <span className="cle-star" aria-hidden="true">★</span> Your note
      </Micro>
      <p className="cle-hand">
        Repped Dead Weight — same post-industrial setting as mine. Said on the Bookseller podcast
        they read openings twice.
      </p>
    </Card>
  </div>
);

/* ──────────────────────────── the six rows ──────────────────────────── */

export const CLE_ROWS: readonly CleRow[] = [
  {
    n: "01",
    title: "Genres sought",
    flip: false,
    Art: GenresArt,
    body: [
      "What they actually represent, in their words — not the agency's blurb. This is ",
      { em: "the first filter" },
      " on whether your manuscript belongs on their desk at all, and it powers how Discover matches agents to your book.",
    ],
  },
  {
    n: "02",
    title: "Materials requested",
    flip: true,
    Art: MaterialsArt,
    body: [
      "Exactly what they ask for, and ",
      { em: "exactly how they want it sent" },
      " — synopsis length, how many chapters, pasted or attached. Record it here and your submission package is built to their rules before you write a word.",
    ],
  },
  {
    n: "03",
    title: "Manuscript wish list",
    flip: false,
    Art: WishlistArt,
    body: [
      "The stories they're openly asking for. ",
      { em: "Match a line of your book to a line of their wish list" },
      " and the opening of your query letter writes itself. Paste it in exactly as they wrote it — the wording matters.",
    ],
  },
  {
    n: "04",
    title: "Response policy",
    flip: true,
    Art: ResponseArt,
    body: [
      "How long they take, and whether it's worth chasing if you hear nothing back. Record it once and ScriptAlly ",
      { em: "sets your nudge dates for you" },
      " — so you follow up when it's polite, and never chase too early.",
    ],
  },
  {
    n: "05",
    title: "Contact details",
    flip: false,
    Art: ContactArt,
    body: [
      "Where they are and how to reach them — ",
      { em: "the submission address, the agency site, and the accounts they post from" },
      ". Their socials are usually where a wish list is announced first, so keep them to hand.",
    ],
  },
  {
    n: "06",
    title: "Personalisation notes",
    flip: true,
    Art: PersonalisationArt,
    body: [
      "Anything from their profile you can use to set yourself apart — a client you admire, an interview, a shared reference. ",
      { em: "Two specific sentences beat a generic page." },
      " Star the detail now; it becomes your opening line later.",
    ],
  },
];

export const CLE_CLOSING = {
  note: "one record like this is worth ten names on a list",
  cta: "Add your first agent",
  link: "Find agents in Discover",
} as const;

/** Flattened copy — what a reader actually reads, for locks and for nothing else. */
export const cleRowText = (row: CleRow): string =>
  row.body.map((s) => (typeof s === "string" ? s : s.em)).join("");

/* ──────────────────────────── the page ──────────────────────────── */

const Body: React.FC<{ segs: readonly CleSeg[] }> = ({ segs }) => (
  <>
    {segs.map((s, i) =>
      typeof s === "string" ? (
        <React.Fragment key={i}>{s}</React.Fragment>
      ) : (
        <strong key={i}>{s.em}</strong>
      ),
    )}
  </>
);

export interface ContactListEmptyStateProps {
  /** The same opener the toolbar's `Add new agent` uses — one flow, two doors. */
  onAddAgent: () => void;
  /** App's navigate bridge, already narrowed to the Discover route by the caller. */
  onDiscover: () => void;
}

export const ContactListEmptyState: React.FC<ContactListEmptyStateProps> = ({ onAddAgent, onDiscover }) => (
  <div className="cle">
    {/* ⚠️ NO TOP PADDING ON THE HERO. The workspace grid already pays the gap under the masthead
        (`--wpg-gap`), and a page that pads its own first row adds to it rather than replacing it —
        measured elsewhere as 92px and 154px against a 70px token. The gap is the grid's alone. */}
    <section className="cle-hero">
      <h2 className="cle-hero-h">{CLE_HERO.heading}</h2>
      <p className="cle-hero-p">{CLE_HERO.body}</p>
      <button type="button" className="agl-btn agl-btn-dark cle-hero-cta" onClick={onAddAgent}>
        <Plus width={14} height={14} aria-hidden="true" />
        {CLE_HERO.cta}
      </button>
    </section>

    {/* ⚠️ THE WIDER MEASURE, DELIBERATELY (comps §1). A three-across grid of plates needs 1240;
        the copy blocks cap at 1060. The left edges therefore do not align down the page — that is
        intended, and unifying them is the thing not to "fix". */}
    <section className="cle-stages" aria-labelledby="cle-stages-h">
      <h3 className="cle-sr-only" id="cle-stages-h">How the contact list works</h3>
      <div className="cle-stages-grid">
        {CLE_STAGES.map((s) => (
          <div className="cle-stage" key={s.slot}>
            <div className="cle-slot"><span>{s.slot}</span></div>
            <span className="cle-lbl">{s.label}</span>
            <h4>{s.heading}</h4>
            <p>{s.body}</p>
          </div>
        ))}
      </div>
    </section>

    {/* ⚠️ A SURFACE CHANGE IS ALLOWED HERE AND WAS RETIRED ON COMPS FOR A REASON THAT DOES NOT
        APPLY. Comps dropped its band when the stages moved to the TOP of the page — "a wash that
        made sense as a closing section reads as a header treatment there". This band IS the
        closing section, which is the case that note sanctions. */}
    <section className="cle-band" aria-labelledby="cle-band-h">
      <div className="cle-band-inner">
        <h2 className="cle-band-h" id="cle-band-h">{CLE_RECORD_HEADING}</h2>

        {CLE_ROWS.map((row) => (
          /* ⚠️ `flip` REORDERS THE GRID'S CHILDREN AND NOTHING ELSE — `order` on the two children,
             never `direction: rtl` (which inverts punctuation and the scrollbar) and never a second
             markup order (which is the duplication the copy constants exist to prevent). Below the
             breakpoint every row puts its copy first; see the stylesheet. */
          <div className={`cle-row${row.flip ? " flip" : ""}`} key={row.n}>
            <div className="cle-row-l">
              <div className="cle-eyebrow">
                <b>{row.n}</b> / {String(CLE_ROWS.length).padStart(2, "0")}
              </div>
              <h3 className="cle-row-h">{row.title}</h3>
              <p className="cle-row-p"><Body segs={row.body} /></p>
            </div>
            {/* ⚠️ THE SCENE IS DECORATION AND LEAVES THE ACCESSIBILITY TREE WHOLE. Every word in it
                is either restated in the copy beside it or is invented sample data; narrating
                "AO Amara Osei Osei Literary London Crime Literary thriller…" six times is how an
                explanatory page becomes unusable with a screen reader. */}
            <div className="cle-row-art" aria-hidden="true">
              <row.Art />
            </div>
          </div>
        ))}

        <div className="cle-close">
          <span className="cle-close-note">{CLE_CLOSING.note}</span>
          <div className="cle-close-acts">
            <button type="button" className="cle-btn-pink" onClick={onAddAgent}>
              <Plus width={14} height={14} aria-hidden="true" />
              {CLE_CLOSING.cta}
            </button>
            <button type="button" className="cle-close-link" onClick={onDiscover}>
              {CLE_CLOSING.link}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
);
