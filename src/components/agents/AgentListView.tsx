/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The LIST view — the same agents, as a table (design authority: contact-list-v5.html).
 *
 * ⚠️ IT SCROLLS SIDEWAYS RATHER THAN CRUSHING ITS COLUMNS. Below the ref's minimum the table
 * keeps its widths and the wrapper scrolls; the alternative is eight columns squeezing until the
 * location wraps to three lines and the genres become one chip and a `+4`. A table that has
 * stopped being readable has not degraded gracefully, it has stopped being a table.
 *
 * ⚠️ AND THERE IS NO DOOR COLUMN. A closed row is greyed, which carries it — a column stating
 * "Open to queries" seven times down a list of eight is a column of one word repeated.
 */
import React from "react";
import { Contact, Pencil } from "lucide-react";
import { Agent, Query } from "../../types";
import { agentInitials, agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import { countryName, flagFor } from "../../lib/territory";
import { agentCardDims, contactMetaLine, isDoorOpen } from "../../lib/agentList";
import { isGenreMatch } from "../../lib/genreMatch";
import { MaterialSlots } from "./MaterialSlots";
import { AddSlot, SlotField } from "./AddSlot";
import "flag-icons/css/flag-icons.min.css";

/** The chips shown inline; the rest are counted. A row is a glance, not the record. */
const ROW_GENRES = 2;

export const AgentListView: React.FC<{
  agents: Agent[];
  queries: Query[];
  matchGenre: string | null;
  onOpen: (agentId: string) => void;
  onEdit: (agentId: string) => void;
  /** The contact button — the view owns the anchoring, so it hands back the element and the id. */
  onPeek: (agentId: string, trigger: HTMLElement | null) => void;
  peekId: string | null;
  /** An empty cell's slot was pressed. Phase 4 gives four fields a popover; the rest escalate. */
  onAdd: (agentId: string, field: SlotField) => void;
  /**
   * ⚠️ SLOTS STAND DOWN WHILE THE DRAWER IS EDITING. Two editors on one record is two writers,
   * and the drawer already owns the dirty-confirmation logic.
   */
  slotsInert: boolean;
}> = ({ agents, queries, matchGenre, onOpen, onEdit, onPeek, peekId, onAdd, slotsInert }) => (
  <div className="agl-listwrap">
    <div className="agl-list" role="table">
      <div className="agl-lhead" role="row">
        <span role="columnheader">Agent</span>
        <span role="columnheader">Email</span>
        <span role="columnheader">Submissions page</span>
        <span role="columnheader">Location</span>
        <span role="columnheader">Genres sought</span>
        <span role="columnheader">Materials required</span>
        <span role="columnheader">Response</span>
        <span role="columnheader"><span className="agl-sr">Actions</span></span>
      </div>
      {agents.map((a) => {
        const site = (a.website || "").trim();
        const flag = flagFor(a.country);
        const city = (a.city || "").trim();
        const country = countryName(a.country);
        const name = agentPrimary(a);
        /* the same predicate the card dims on — a closed door with a live query never greys */
        const dim = agentCardDims(a, queries);
        const weeks = a.responseTimeWeeks;
        return (
          <div
            key={a.id}
            className={`agl-lrow${dim ? " s-dim" : ""}${isDoorOpen(a) ? "" : " s-shut"}`}
            role="row"
            tabIndex={0}
            onClick={() => onOpen(a.id)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onOpen(a.id); } }}
          >
            <div className="agl-lnm" role="cell">
              <span className="agl-av agl-av-sm">
                {a.image ? <img src={a.image} alt="" /> : <span className="ini">{agentInitials(a)}</span>}
              </span>
              <span className="agl-lnmtx">
                <b>{name}</b>
                <i>{agentSecondary(a)}</i>
              </span>
            </div>
            <div className="agl-ellip" role="cell">
              {a.email ? a.email : <AddSlot field="email" onOpen={(f) => onAdd(a.id, f)} disabled={slotsInert} />}
            </div>
            <div role="cell">
              {site
                ? <a className="agl-lk" href={/^https?:\/\//i.test(site) ? site : `https://${site}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{site}</a>
                : <AddSlot field="website" onOpen={(f) => onAdd(a.id, f)} disabled={slotsInert} />}
            </div>
            <div className="agl-lloc" role="cell">
              {flag && <span className={`fl ${flag}`} aria-hidden="true" />}
              {city || country
                ? <span>{city || country}{city && country && <small>{country}</small>}</span>
                : <AddSlot field="location" onOpen={(f) => onAdd(a.id, f)} disabled={slotsInert} />}
            </div>
            <div className="agl-chips" role="cell">
              {/* ⚠️ GENRES HAD NO EMPTY BRANCH AT ALL — an agent with none rendered an empty chip
                  row, which states nothing and cannot be acted on. It is the one cell whose gap
                  was invisible rather than merely wordy. */}
              {a.genres.length ? (
                <>
                  {a.genres.slice(0, ROW_GENRES).map((g) => (
                    <span className={`agl-chip${isGenreMatch(g, matchGenre) ? " agl-chip-match" : ""}`} key={g}>{g}</span>
                  ))}
                  {a.genres.length > ROW_GENRES && <span className="agl-chip">+{a.genres.length - ROW_GENRES}</span>}
                </>
              ) : (
                <AddSlot field="genres" onOpen={(f) => onAdd(a.id, f)} disabled={slotsInert} />
              )}
            </div>
            <div role="cell"><MaterialSlots agent={a} /></div>
            {/* the same words as the card, through the same derivation — never a second phrasing */}
            <div className="agl-lwks" role="cell">{weeks && weeks > 0 ? `~${weeks} wks` : contactMetaLine(a).slice(-1)[0]}</div>
            <div className="agl-lacts" role="cell">
              <button
                type="button"
                className={`agl-cbtn${peekId === a.id ? " on" : ""}`}
                data-peek-trigger
                aria-label={`Contact details for ${name}`}
                aria-pressed={peekId === a.id}
                onClick={(e) => { e.stopPropagation(); onPeek(a.id, e.currentTarget); }}
              >
                <Contact width={13} height={13} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="agl-cbtn"
                aria-label={`Edit ${name}`}
                onClick={(e) => { e.stopPropagation(); onEdit(a.id); }}
              >
                <Pencil width={12} height={12} aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
