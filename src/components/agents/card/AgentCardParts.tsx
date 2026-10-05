/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent card's shared BLOCKS (Contact list v13 §1.4, ruling Q2): the identity (initials and
 * name), genres sought, the wishlist, materials requested and the torn slip that stands in for any
 * of them. The quick view (`AgentQuickView`) and the carousel's card (`AgentCarouselCard`) both
 * render these and nothing else for those parts, so the two cannot drift: one markup, one set of
 * class names, one set of `.ac .acq-*` rules in agentCard.css.
 *
 * ⚠️ THESE ARE BLOCKS, NOT A CARD. They hold no state, register no Escape layer and bind no keys —
 * the quick view keeps all of that, which is why a carousel of eight cards does not put eight
 * Escape handlers on the stack.
 */
import React from "react";
import type { Agent } from "../../../types";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import type { MatChip } from "../../../lib/agentCard";

/**
 * The probe namespace a block's own markers carry. The quick view's are `data-ac` (the agent card's
 * suites read them, many unscoped); a carousel card's are `data-cl13-blk`, so eight cards on the
 * Contact list can never answer a probe meant for the one open card. Markup is otherwise identical.
 */
export type Probe = "ac" | "cl13";
const mark = (p: Probe, v: string) => (p === "ac" ? { "data-ac": v } : { "data-cl13-blk": v });

/* the mock's own marks — line drawings in the ink, inheriting the link's colour */
export const ICO = {
  web: <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><circle cx="7" cy="7" r="5.5" /><path d="M1.5 7h11M7 1.5c2 2 2 9 0 11M7 1.5c-2 2-2 9 0 11" /></svg>,
  mail: <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><rect x="1.5" y="3" width="11" height="8" rx="1" /><path d="M1.5 3.5l5.5 4 5.5-4" /></svg>,
  list: <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M4 3.5h8M4 7h8M4 10.5h8" /><circle cx="1.8" cy="3.5" r=".6" /><circle cx="1.8" cy="7" r=".6" /><circle cx="1.8" cy="10.5" r=".6" /></svg>,
  ql: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><rect x="2.5" y="1.5" width="9" height="11" rx="1" /><path d="M4.5 4.5h5M4.5 7h5M4.5 9.5h3" /></svg>,
  syn: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M3 1.5h5.5L11 4v8.5H3z" /><path d="M8.5 1.5V4H11" /></svg>,
  smp: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M4.5 3.5h7v9h-7z" /><path d="M2.5 10.5v-9h7" /></svg>,
  oth: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M7 2.5v9M2.5 7h9" /></svg>,
  pen: <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M9.5 2l2.5 2.5L5 11.5 2 12l.5-3z" /></svg>,
};

/** A missing part: what is missing, and the door to add it. */
export const Torn: React.FC<{ text: string; clv: string; onAdd: () => void; probe?: Probe }> = ({ text, clv, onAdd, probe = "ac" }) => (
  <span className="ac-torn" {...mark(probe, clv)}>
    {text} <button type="button" className="ac-mini" onClick={onAdd}>Add</button>
  </span>
);

/** The initials disc and the name, with whatever lines the host puts under it. `headingId` only
 *  where there is one card on the page (the quick view's `ac-name`); a carousel of cards passes none,
 *  so the document never holds two of an id. */
export const CardIdentity: React.FC<{
  agent: Agent; headingId?: string; className?: string; pulse?: boolean; probe?: Probe; children?: React.ReactNode;
}> = ({ agent, headingId, className, pulse, probe = "ac", children }) => (
  <div className={`acq-head${className ? ` ${className}` : ""}${pulse ? " ac-pulse" : ""}`} {...mark(probe, "head")}>
    <span className="acq-ini" aria-hidden="true">{agentInitials(agent)}</span>
    <div className="acq-id">
      <h3 id={headingId}>{agentPrimary(agent)}</h3>
      {children}
    </div>
  </div>
);

/** Genres sought: the manuscript's genre ticked (`hit`), or the torn slip. */
export const GenresBlock: React.FC<{
  genres: string[]; genreHit: (g: string) => boolean; onAdd: () => void; pulse?: boolean; probe?: Probe;
}> = ({ genres, genreHit, onAdd, pulse, probe = "ac" }) => (
  <div className={`acq-s${pulse ? " ac-pulse" : ""}`} {...mark(probe, "s-genres")}>
    <h4 className="acq-lab">Genres sought</h4>
    {genres.length ? (
      <div className="acq-gch">
        {genres.map((g) => <span key={g} className={genreHit(g) ? "hit" : undefined}>{g}</span>)}
      </div>
    ) : <Torn text="Not recorded" clv="torn-genres" onAdd={onAdd} probe={probe} />}
  </div>
);

/** The manuscript wishlist, with an optional stamp in the label (the quick view's "checked Aug"). */
export const WishlistBlock: React.FC<{ wish: string; stamp?: React.ReactNode; onAdd: () => void; probe?: Probe }> = ({ wish, stamp, onAdd, probe = "ac" }) => (
  <div className="acq-s" {...mark(probe, "s-wishlist")}>
    <h4 className="acq-lab">
      Manuscript wishlist
      {wish ? stamp : null}
    </h4>
    {wish ? <p className="acq-wish">{wish}</p> : <Torn text="No wishlist yet" clv="torn-wishlist" onAdd={onAdd} probe={probe} />}
  </div>
);

/** Materials requested: what they want you to send, or the torn slip. */
export const MaterialsBlock: React.FC<{ mats: MatChip[]; label?: string; onAdd: () => void; probe?: Probe }> = ({ mats, label = "Materials requested", onAdd, probe = "ac" }) => (
  <div className="acq-s" {...mark(probe, "s-materials")}>
    <h4 className="acq-lab">{label}</h4>
    {mats.length ? (
      <div className="acq-mats">
        {mats.map((m) => <span key={`${m.kind}-${m.label}`} className="acq-mat">{ICO[m.kind]}{m.label}</span>)}
      </div>
    ) : <Torn text="Not recorded" clv="torn-materials" onAdd={onAdd} probe={probe} />}
  </div>
);
