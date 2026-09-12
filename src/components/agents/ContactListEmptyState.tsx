/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list — the feature-led empty state (blank account, zero agents; empty-states pack,
 * Phase 3; ref `design-refs/scriptally-empty-states-v3-feature-led.html`, the Contact list screen).
 *
 * ⚠️ THIS REPLACES THE EDITORIAL SIX-ROW PAGE, AND WHAT IT REPLACES IS DELETED HERE. Three sections
 * went: the `cle-stages` trio of dashed illustrator plates, the "What makes a strong agent record?"
 * band, and its six numbered rows with their six drawn scenes. The pack names the band explicitly
 * ("section 2 replaces it"); the stages went because the ref draws no equivalent and keeping them
 * would put a three-plate section inside a four-block structure that has no slot for it.
 *
 * ⚠️ THE STAGES CARRIED THREE NAMED ILLUSTRATOR COMMISSIONS — `agent-stage-add`,
 * `agent-stage-discover`, `agent-stage-track` — and deleting them retires those briefs. That is a
 * real cost and it is Nick's to reverse: the whole previous page is one `git show` away and is named
 * in the run report. Nothing else in the repo referenced those slot names.
 *
 * ⚠️ IT IS A PARALLEL IMPLEMENTATION OF THE QUERY CENTRE'S GRAMMAR, NOT A SHARED ONE, and that is
 * this file's own standing precedent — it was written as a deliberate near-copy of `comps.css` with
 * the note "the day the two pages should differ, they differ by a value, not by a mechanism". The
 * two pages sit under different token layers (`.aglist`'s `--agl-*` against the Query Centre's
 * `--n*` ramp) and a shared primitive would have to be parameterised over both, which is the
 * coupling the marketing tier's `MobileSheet` rejection already argued against.
 *
 * ⚠️ THE COPY LIVES IN EXPORTED CONSTANTS, NOT IN THE JSX — the reason the previous version gave,
 * unchanged: a sentence in two places is two sentences the day one is edited, and a lock can only
 * read what it can name. The ref is normative and its punctuation is part of it.
 *
 * ⚠️ NO STAR RATINGS IN ANY ILLUSTRATION HERE. The live agent card's rating is a separate question
 * and is deliberately untouched; what the pack forbids is a drawn one, and the retired
 * `PersonalisationArt` carried a `★` (a bookmark metaphor, not a rating) which goes with it.
 *
 * ⚠️ THE ILLUSTRATIONS ARE DRAWN MARKUP AND SAY SO — a dashed "Example" pill on every plate, at
 * full opacity. Same pattern as the Query Centre's, deliberately NOT the dashboard's faded one.
 *
 * ⚠️ THE SAMPLE RECORD IS ONE PERSON PER SECTION, WHICH THE PREVIOUS VERSION ALSO INSISTED ON.
 * Amara Osei is the complete record; Aisha Kapoor is the incomplete one. A third name inside either
 * section would break the only idea the section has.
 *
 * ⚠️ NO ROUTER HOOK HERE. The page is handed `onNavigate`'s narrowed results — `onAddAgent` and
 * `onDiscover` — so Discover is reached the way `railNav` reaches it. A `useNavigate` inside this
 * component would be a second way to one route, and the bridge is the one that also clears the
 * global search query.
 */
import React from "react";
import { Plus } from "lucide-react";
import "./contactListEmpty.css";
import { StatusDot } from "../StatusDot";
import { QueryStatus } from "../../types";

/* ────────────────────────────── copy ────────────────────────────── */

export const CLE_HERO = {
  heading: "These are the people who will champion your words.",
  lede: "One card per agent — what they want, what they ask for, and everything you've sent them.",
  cta: "Add your first agent",
  discoverLink: "Find agents in Discover",
  importLink: "Import a spreadsheet",
  caveat: "one agent is a start — not a campaign",
} as const;

/** the ref's `.ill .under` note beside the complete card */
export const CLE_HERO_NOTE = "↖ six segments, one per field — sage once the record's complete";

export interface CleRow {
  key: "gaps" | "next";
  heading: string;
  sub: string;
  caveat: string;
  band: "sage" | "plain";
  /** the ref's `.row.flip` — `order` on two grid children, never a second markup order */
  flip: boolean;
}

export const CLE_ROWS: readonly CleRow[] = [
  {
    key: "gaps",
    heading: "Fill the gaps.",
    sub: "Six fields make a strong record. Anything missing becomes a button, not a blank.",
    caveat: "their own words are the best opening line you'll get",
    band: "sage",
    flip: false,
  },
  {
    key: "next",
    heading: "Who's next?",
    sub: "Your history with every agent sits on their card — and idle ones are the ones still to send to.",
    caveat: "group by court to see at a glance who's waiting on whom",
    band: "plain",
    flip: true,
  },
];

export const CLE_CLOSING = {
  heading: "Add the first name.",
  sub: "One is enough to log a query against.",
  cta: "Add your first agent",
  link: "Find agents in Discover",
} as const;

export const CLE_EXAMPLE_TAG = "Example";

/**
 * The completeness rail.
 *
 * ⚠️ SIX SEGMENTS BECAUSE THE COPY SAYS SIX FIELDS, AND THE TWO READ ONE CONSTANT. The ref draws
 * six `<i>` and writes "Six fields make a strong record" beside them; a rail of five under that
 * sentence is the drawn-count-disagrees-with-the-words fault in its smallest form.
 */
export const CLE_RAIL_SEGMENTS = 6;

/** the complete record — the hero's card */
export const CLE_CARD_FULL = {
  pill: "Active queries",
  initials: "AO",
  name: "Amara Osei",
  agency: "Osei Literary",
  meta: "London · ~8 weeks · Email",
  historyLabel: "Your history",
  historyStatus: QueryStatus.QUERIED,
  historyBook: "The Backpack on the Seat",
  historyWhen: " · queried 04 Sep",
  wishlistLabel: "Wishlist",
  wishlist: "Big-hearted fantasy with a found family at its core — voice first, always.",
  materialsLabel: "Materials wanted",
  materials: "Query · synopsis (1pg) · first three chapters, pasted in body.",
  primary: "Log query",
  secondary: "View website",
} as const;

/** the incomplete record — "Fill the gaps." */
export const CLE_CARD_GAPS = {
  pill: "Idle",
  /** ⚠️ TWO OF SIX, AND THE REF DRAWS EXACTLY TWO FILLED SEGMENTS. The card states three empty
   *  fields below, which is what the other four segments are. */
  filled: 2,
  initials: "AK",
  name: "Aisha Kapoor",
  agency: "The Lantern Agency",
  meta: "Edinburgh · Form",
  historyLabel: "Your history",
  historyEmpty: "Nothing sent yet.",
  wishlistLabel: "Wishlist",
  /* ⚠️ NO GENDERED PRONOUN FOR AN AGENT — the house law, and the ref breaks it. Its buttons read
     "Add her wishlist" about a name this app stores no pronouns for; on a real record that is a
     50% error rate about a real person. "their" is the neutral form the rest of the app uses. */
  wishlistAdd: "Add their wishlist",
  wishlistHint: "Copy it from their agency page or #MSWL.",
  materialsLabel: "Materials wanted",
  materialsAdd: "Add from their site",
  primary: "Log query",
  secondary: "View website",
} as const;

/**
 * The grouped mini-cards — "Who's next?".
 *
 * ⚠️ EACH HEADING'S COUNT IS ITS OWN LIST'S LENGTH, never typed beside it. The ref heads its last
 * group "Idle · 3" and draws TWO cards under it — a drawn count that disagrees with what is drawn,
 * on a page whose whole argument is that the numbers are real. Deriving it means the picture reads
 * "Idle · 2" and cannot be wrong; adding a third card is one entry here if Nick wants the 3.
 */
export const CLE_GROUPS: readonly {
  key: string;
  name: string;
  cards: readonly { who: string; line: string; status?: QueryStatus; band: "sage" | "pink" | "slate" }[];
}[] = [
  {
    key: "agent",
    name: "With the agent",
    cards: [
      { who: "Amara Osei", line: "Queried · day 7", status: QueryStatus.QUERIED, band: "sage" },
      { who: "Aisha Kapoor", line: "Partial sent · day 18", status: QueryStatus.PARTIAL_SENT, band: "sage" },
    ],
  },
  {
    key: "you",
    name: "With you",
    cards: [
      { who: "Daniel O'Rourke", line: "Full requested", status: QueryStatus.FULL_REQUESTED, band: "pink" },
      { who: "Rosa Bellamy", line: "Offer · decide by Fri", status: QueryStatus.OFFER, band: "slate" },
    ],
  },
  {
    key: "idle",
    name: "Idle",
    cards: [
      { who: "Jo Hartley", line: "Hartley & Co · ~10 weeks", band: "pink" },
      { who: "Penhallow Literary", line: "Agent not specified", band: "pink" },
    ],
  },
];

/* ──────────────────────────── the drawn examples ──────────────────────────── */

const Tag: React.FC = () => <span className="cle-tag">{CLE_EXAMPLE_TAG}</span>;

/** the ref's `.rail` — six segments, all sage when the record is complete */
const Rail: React.FC<{ filled?: number }> = ({ filled }) => (
  <div className={`cle-rail${filled === undefined ? " complete" : ""}`} aria-hidden="true">
    {Array.from({ length: CLE_RAIL_SEGMENTS }, (_, i) => (
      <i key={i} className={filled !== undefined && i < filled ? "on" : undefined} />
    ))}
  </div>
);

const CardFull: React.FC = () => {
  const c = CLE_CARD_FULL;
  return (
    <div className="cle-rc">
      <div className="cle-rc-head cle-rc-head--sage">
        <span className="cle-rc-pill">{c.pill}</span>
        <span className="cle-rc-edit" aria-hidden="true">✎</span>
      </div>
      <Rail />
      <div className="cle-rc-bd">
        <div className="cle-rc-who">
          <span className="cle-rc-av">{c.initials}</span>
          <span>
            <span className="cle-rc-nm">{c.name}</span>
            <span className="cle-rc-ag">{c.agency}</span>
            <span className="cle-rc-meta">{c.meta}</span>
          </span>
        </div>
        <div className="cle-rc-sec">
          <span className="cle-rc-sl">{c.historyLabel}</span>
          <span className="cle-rc-sv cle-sd">
            <StatusDot status={c.historyStatus} overrideSize={13} decorative />
            <em>{c.historyBook}</em>{c.historyWhen}
          </span>
        </div>
        <div className="cle-rc-sec">
          <span className="cle-rc-sl">{c.wishlistLabel}</span>
          <span className="cle-rc-sv">{c.wishlist}</span>
        </div>
        <div className="cle-rc-sec">
          <span className="cle-rc-sl">{c.materialsLabel}</span>
          <span className="cle-rc-sv">{c.materials}</span>
        </div>
      </div>
      <div className="cle-rc-ft">
        <span className="cle-b1">➤ {c.primary}</span>
        <span className="cle-b2">{c.secondary}</span>
      </div>
    </div>
  );
};

const CardGaps: React.FC = () => {
  const c = CLE_CARD_GAPS;
  return (
    <div className="cle-rc">
      <div className="cle-rc-head cle-rc-head--pink">
        <span className="cle-rc-pill">{c.pill}</span>
        <span className="cle-rc-edit" aria-hidden="true">✎</span>
      </div>
      <Rail filled={c.filled} />
      <div className="cle-rc-bd">
        <div className="cle-rc-who">
          <span className="cle-rc-av">{c.initials}</span>
          <span>
            <span className="cle-rc-nm">{c.name}</span>
            <span className="cle-rc-ag">{c.agency}</span>
            <span className="cle-rc-meta">{c.meta}</span>
          </span>
        </div>
        <div className="cle-rc-sec">
          <span className="cle-rc-sl">{c.historyLabel}</span>
          <span className="cle-rc-hint">{c.historyEmpty}</span>
        </div>
        <div className="cle-rc-sec">
          <span className="cle-rc-sl">{c.wishlistLabel}</span>
          {/* ⚠️ DASHED, WHICH ON A CARD MEANS "not stated yet" — the same grammar the live card's
              own add-inline slots use. It is a picture of that control, not the control. */}
          <span className="cle-add">＋ {c.wishlistAdd}</span>
          <span className="cle-rc-hint">{c.wishlistHint}</span>
        </div>
        <div className="cle-rc-sec">
          <span className="cle-rc-sl">{c.materialsLabel}</span>
          <span className="cle-add">＋ {c.materialsAdd}</span>
        </div>
      </div>
      <div className="cle-rc-ft">
        <span className="cle-b1">➤ {c.primary}</span>
        <span className="cle-b2">{c.secondary}</span>
      </div>
    </div>
  );
};

const Groups: React.FC = () => (
  <div className="cle-grp">
    {CLE_GROUPS.map((g) => (
      <React.Fragment key={g.key}>
        {/* the count IS the list's length — see `CLE_GROUPS` */}
        <h5>{g.name} · {g.cards.length}</h5>
        <div className="cle-grp-cards">
          {g.cards.map((c) => (
            <div key={c.who} className="cle-cc">
              <span className={`cle-cc-strip cle-cc-strip--${c.band}`} aria-hidden="true" />
              <span className="cle-cc-in">
                <b>{c.who}</b>
                {c.status ? (
                  <span className="cle-sd">
                    <StatusDot status={c.status} overrideSize={11} decorative />
                    {c.line}
                  </span>
                ) : (
                  <span>{c.line}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </React.Fragment>
    ))}
  </div>
);

const ILLO: Record<CleRow["key"], React.FC> = { gaps: CardGaps, next: Groups };

/* ──────────────────────────── the page ──────────────────────────── */

export interface ContactListEmptyStateProps {
  /** The same opener the toolbar's `Add new agent` uses — one flow, two doors. */
  onAddAgent: () => void;
  /** App's navigate bridge, already narrowed to the Discover route by the caller. */
  onDiscover: () => void;
  /** The importer, reached the same way every other surface reaches it. */
  onImport?: () => void;
}

export const ContactListEmptyState: React.FC<ContactListEmptyStateProps> = ({
  onAddAgent, onDiscover, onImport,
}) => (
  <div className="cle">
    {/* ── the hero ── */}
    <section className="cle-hero">
      <div className="cle-hero-tx">
        <h2 className="cle-hero-h">{CLE_HERO.heading}</h2>
        <p className="cle-hero-p">{CLE_HERO.lede}</p>
        <div className="cle-acts">
          {/* ⚠️ `cle-hero-cta` IS KEPT BECAUSE A MEASUREMENT QUERIES IT BY NAME — `emptyStateSpacing`
              dereferences it unguarded, so renaming it would turn that spec into a CRASH rather
              than a failure, and a crash names a line number where a failure names a property. */}
          <button type="button" className="agl-btn agl-btn-dark cle-cta cle-hero-cta" onClick={onAddAgent}>
            <Plus width={14} height={14} aria-hidden="true" />
            {CLE_HERO.cta}
          </button>
          <span className="cle-links">
            <button type="button" className="cle-link" onClick={onDiscover}>{CLE_HERO.discoverLink}</button>
            {/* ⚠️ OMITTED, NOT DISABLED, when the caller wires no importer — a link that goes
                nowhere teaches a route that does not exist, which is this repo's standing rule
                about nav items with no destination. */}
            {onImport && (
              <>
                <i aria-hidden="true">·</i>
                <button type="button" className="cle-link" onClick={onImport}>{CLE_HERO.importLink}</button>
              </>
            )}
          </span>
        </div>
        <span className="cle-caveat">{CLE_HERO.caveat}</span>
      </div>
      <div className="cle-ill">
        <Tag />
        <CardFull />
        <div className="cle-under">
          <span className="cle-caveat">{CLE_HERO_NOTE}</span>
        </div>
      </div>
    </section>

    {/* ── the two feature rows ── */}
    {CLE_ROWS.map((r) => {
      const Illo = ILLO[r.key];
      return (
        <section key={r.key} className={`cle-row cle-row--${r.band}${r.flip ? " cle-row--flip" : ""}`}>
          <div className="cle-txt">
            <h3 className="cle-row-h">{r.heading}</h3>
            <p className="cle-row-p">{r.sub}</p>
            <span className="cle-caveat">{r.caveat}</span>
          </div>
          <div className="cle-ill">
            <Tag />
            <Illo />
          </div>
        </section>
      );
    })}

    {/* ── the closing ── */}
    <section className="cle-closing">
      <div>
        <h3 className="cle-close-h">{CLE_CLOSING.heading}</h3>
        <p className="cle-close-p">{CLE_CLOSING.sub}</p>
      </div>
      <div className="cle-acts cle-acts--close">
        <button type="button" className="cle-link" onClick={onDiscover}>{CLE_CLOSING.link}</button>
        <button type="button" className="agl-btn agl-btn-dark cle-cta" onClick={onAddAgent}>
          <Plus width={14} height={14} aria-hidden="true" />
          {CLE_CLOSING.cta}
        </button>
      </div>
    </section>
  </div>
);
