/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list — the card FACE (design authority: design-refs/contact-list-v5.html).
 *
 * Band (their door · stars · corner buttons) → identity (monogram, Playfair name, italic agency,
 * one mono line of place and pace) → Genres sought → Manuscript wishlist → footer (Log query ·
 * Submissions page · the material slots).
 *
 * ⚠️ THE BAND CARRIES THEIR DOOR NOW, AND THAT SUPERSEDES THE TWO-SYSTEMS EXCEPTION FOR COLOUR.
 * This card used to be tinted by YOUR HISTORY — sage for a live query, pink otherwise — with the
 * door written in ink as a hatch and a stamp. The v5 ref reverses it: the band is sage when their
 * door is open and grey when it is shut, and the door pill states which in words. So the hatch and
 * the rotated stamp are retired: with a pill and a fill both saying it, a third device is two too
 * many, which is the same argument that retired the ink pill in the first place.
 *
 * ⚠️ BUT THE DIM RULE KEEPS ITS CARVE-OUT, AND THE REF CANNOT OVERRULE IT — because the ref does
 * not contain the case. Its two closed agents are both terminal, so it never draws a shut door
 * over a live query, and its unconditional `.closed { opacity }` is silent rather than
 * authoritative there. `agentCardDims` holds that a card with an active query never dims whatever
 * the door is doing: an outstanding full does not matter less because the agency shut its doors.
 * That is a recorded decision with its own locks, and a mockup that never drew the case is not
 * evidence against it.
 *
 * ⚠️ NO STATUS DOTS, NO RELATIONSHIP PILL, NO HISTORY LINE. Attention and progress belong to the
 * To-do board and the Query Centre; this page is REFERENCE DATA, and a fact with two homes is two
 * facts that will eventually disagree.
 *
 * The flip structure is untouched and load-bearing: the rotor is the ONE rotating element, it
 * carries preserve-3d, and it must never gain an `overflow` property — any value flattens the 3D
 * context and mirrors the back face.
 */
import React from "react";
import { Contact, Pencil, Send } from "lucide-react";
import { Agent, Query } from "../../types";
import { agentInitials, agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import { flagFor } from "../../lib/territory";
import "flag-icons/css/flag-icons.min.css";
import { agentCardDims, contactMetaLine, isDoorOpen } from "../../lib/agentList";
import { isGenreMatch } from "../../lib/genreMatch";
import { attachDrift, hasMoreToRead } from "../../lib/mswlDrift";
import { hrefFor } from "../../lib/quickAdd";
import { MaterialSlots } from "./MaterialSlots";

/** The empty wishlist reads as a fact about their site, never as a fault of yours. */
export const WISHLIST_EMPTY = "Nothing recorded — check their site.";

/** Display-only amber stars. Per amendment A an UNRATED agent shows NO stars — never five hollow. */
const Stars: React.FC<{ rating?: number; size?: number }> = ({ rating, size = 11 }) => {
  if (!rating || rating < 1) return null;
  return (
    <span className="agl-stars" aria-label={`${rating} of 5 — fit`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9L12 2.6z"
            fill={i <= rating ? "#BA7517" : "none"}
            stroke={i <= rating ? "#BA7517" : "#c9bda9"}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
};

interface AgentCardProps {
  agent: Agent;
  /** True while this card's back face is showing (one at a time — the parent enforces it). */
  peeked?: boolean;
  /** The back face's contents — the contact peek, mounted only while peeked. */
  back?: React.ReactNode;
  queries: Query[];
  /**
   * The genre to tint, already normalised by `matchGenre` — null when there is no manuscript in
   * scope or it records no genre. A null means "no claim", and every chip renders plain.
   */
  matchGenre: string | null;
  /** Opens the drawer on this agent, in READ mode — the card body's own click. */
  onOpen: (agentId: string) => void;
  /** Opens the drawer on Contact in EDIT mode — the pencil. */
  onEdit: (agentId: string) => void;
  /** Turns the card over to the contact peek (or back). */
  onPeek: (agentId: string) => void;
  /** Log a query against this agent — preselects them in the focus form. */
  onLogQuery: (agent: Agent) => void;
  /** Load-stagger delay, set by the grid (the row depends on the live column count). */
  style?: React.CSSProperties;
  /** Motion state driven by the grid: arriving, leaving, or settled for a FLIP measurement. */
  motionClass?: string;
}

/**
 * The wishlist, and the only part of this card that moves.
 *
 * ⚠️ THE BOX IS `flex: 1; min-height: 0` AND IT CLIPS — never a pixel height. A fixed height is
 * what let a long wishlist paint straight through the footer: the text overflowed a box that had
 * been told how tall to be instead of how much room it may take, and the card had no way to
 * notice. The card body clips too, as a second line of defence, so a mistake here is contained
 * rather than published.
 *
 * ⚠️ AND THE FADE IS TIED TO THE SAME ANSWER AS THE DRIFT. Both ask `hasMoreToRead`, so a card
 * can never show a "there is more" fade over a wishlist that will not move — one derivation, two
 * consumers, rather than two rules that agree until they do not.
 */
const Wishlist: React.FC<{ text: string; hostRef: React.RefObject<HTMLDivElement | null> }> = ({ text, hostRef }) => {
  const boxRef = React.useRef<HTMLParagraphElement>(null);
  const [more, setMore] = React.useState(false);

  React.useEffect(() => {
    const el = boxRef.current;
    const host = hostRef.current;
    if (!el || !host) return undefined;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const sync = () => setMore(hasMoreToRead(el.scrollHeight, el.clientHeight));
    sync();
    /* the element's own box changes with the column; its CONTENT changes only by re-render, so
       observing the box is the right question here rather than the scroller trap */
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    ro?.observe(el);
    const detach = attachDrift(el, host, reduced);
    return () => { ro?.disconnect(); detach(); };
  }, [text, hostRef]);

  return (
    <div className={`agl-mswlwrap${more ? " agl-more" : ""}`}>
      <p className="agl-mswl" ref={boxRef}>{text}</p>
    </div>
  );
};

export const AgentCard: React.FC<AgentCardProps> = ({
  agent, queries, matchGenre, onOpen, onEdit, onPeek, onLogQuery, peeked = false, back, style, motionClass,
}) => {
  const open = isDoorOpen(agent);
  /* THE DIM — closed door AND nothing of yours live. See the header: the ref draws neither half
     of this case, so the app's own rule stands. */
  const dim = agentCardDims(agent, queries);
  const cardClasses = `${open ? "s-open" : "s-shut"}${dim ? " s-dim" : ""}`;
  const website = (agent.website || "").trim();
  const flagClass = flagFor(agent.country);
  const meta = contactMetaLine(agent);
  const mswl = (agent.mswlNotes || "").trim();
  const hostRef = React.useRef<HTMLDivElement>(null);
  const name = agentPrimary(agent);

  return (
    <div className={`agl-scene ${cardClasses}${motionClass ? ` ${motionClass}` : ""}`} style={style} data-agent-card={agent.id}>
      <div className={`agl-rotor${peeked ? " flipped" : ""}`} ref={hostRef}>
        <div className="agl-facef">
          <div className="agl-acard">
            {/* THEIR DOOR — the fill and the pill say the same thing, in colour and in words. */}
            <div className="agl-band">
              <span className="agl-doorpill">{open ? "Open to queries" : "Closed to queries"}</span>
              <span className="agl-sp" />
              <Stars rating={agent.starRating} />
              {/* THE CORNER — contact first, then the pencil. The contact button turns the card
                  over; the pencil goes straight to the drawer's Contact tab in edit. */}
              <button
                type="button"
                className={`agl-cbtn${peeked ? " on" : ""}`}
                onClick={(e) => { e.stopPropagation(); onPeek(agent.id); }}
                title={`Contact details for ${name}`}
                aria-label={`Contact details for ${name}`}
                aria-pressed={peeked}
              >
                <Contact width={13} height={13} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="agl-cbtn"
                onClick={(e) => { e.stopPropagation(); onEdit(agent.id); }}
                title={`Edit ${name}`}
                aria-label={`Edit ${name}`}
              >
                <Pencil width={12} height={12} aria-hidden="true" />
              </button>
            </div>

            <div className="agl-body" onClick={() => onOpen(agent.id)} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(agent.id); } }}>
              <div className="agl-who">
                <div className="agl-av">
                  {agent.image ? <img src={agent.image} alt="" /> : <div className="ini">{agentInitials(agent)}</div>}
                </div>
                <div className="agl-whotx">
                  <div className="agl-name">{name}</div>
                  <div className="agl-agency">{agentSecondary(agent)}</div>
                  {/* place and pace, on one mono line. A missing location contributes no token
                      rather than an empty one — see `contactMetaLine`. */}
                  <div className="agl-loc">
                    {flagClass && <span className={`fl ${flagClass}`} aria-hidden="true" />}
                    <span className="agl-metaline">{meta.join(" · ")}</span>
                  </div>
                </div>
              </div>

              <div className="agl-sect">
                <span className="agl-slab">Genres sought</span>
                <div className="agl-chips">
                  {agent.genres.length ? (
                    agent.genres.map((g) => (
                      <span className={`agl-chip${isGenreMatch(g, matchGenre) ? " agl-chip-match" : ""}`} key={g}>{g}</span>
                    ))
                  ) : (
                    <span className="agl-absent">No genres recorded.</span>
                  )}
                </div>
              </div>

              <div className="agl-sect agl-wish">
                <span className="agl-slab">Manuscript wishlist</span>
                {mswl ? <Wishlist text={mswl} hostRef={hostRef} /> : <p className="agl-absent">{WISHLIST_EMPTY}</p>}
              </div>
            </div>

            <div className="agl-foot">
              {open ? (
                <button type="button" className="agl-btn agl-btn-dark" onClick={() => onLogQuery(agent)}>
                  <Send width={12} height={12} aria-hidden="true" />
                  Log query
                </button>
              ) : (
                /* the full disabled grammar — paper fill, hairline, faint text, not-allowed */
                <button type="button" className="agl-btn" disabled title="Closed for submissions at the moment">
                  Log query
                </button>
              )}
              <button
                type="button"
                className="agl-btn agl-btn-ghost"
                disabled={!website}
                title={website ? `Open ${website}` : "No submissions page on file"}
                onClick={() => {
                  const href = hrefFor(website);
                  if (href) window.open(href, "_blank", "noopener,noreferrer");
                }}
              >
                Submissions page
              </button>
              <span className="agl-sp" />
              <MaterialSlots agent={agent} />
            </div>
          </div>
        </div>
        {/* ⚠️ BACK FACE — THE CONTACT PEEK, AND NEVER AGAIN AN EDITOR. It is read-only by
            construction: `contactPeek.test.tsx` asserts the rendered back face contains no input,
            textarea, select or form control at all. An editor here was a form you could only
            reach by turning a card over, on a face that cannot be scrolled to. */}
        <div className="agl-faceb" aria-hidden={!peeked}>{peeked ? back : null}</div>
      </div>
    </div>
  );
};
