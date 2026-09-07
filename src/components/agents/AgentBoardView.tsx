/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The BOARD view — the same agents, in columns (design authority: contact-list-v5.html, which
 * takes the Query Centre's board grammar).
 *
 * ⚠️ NO COLUMN CONTAINERS. The columns sit on the page ground: a Playfair title, a count pill and
 * a mono sub-caption over a 2.5px underline in the group's colour, and then cards. Boxing each
 * column would draw seven frames around content that is already grouped by position, and it is
 * the Query Centre's own grammar — this page borrows it rather than inventing a second one.
 *
 * ⚠️ THERE IS NO DRAG, AND THAT IS NOT AN OMISSION. A column here is DERIVED — where an agent
 * stands is a fact about their queries — so dragging a card between columns would be asking the
 * app to change a query's status by moving a picture of it. The board reads; the Query Centre
 * writes.
 *
 * ⚠️ AND EMPTY COLUMNS RENDER WHERE THE GROUPING HAS A FIXED ORDER. The journey is a ladder, and
 * you cannot see that nothing has reached Full sent if there is no Full sent column.
 */
import React from "react";
import { Contact } from "lucide-react";
import { Agent, Query } from "../../types";
import { agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import { agentCardDims, isDoorOpen } from "../../lib/agentList";
import { AgentGroupingKey, boardColumns } from "../../lib/agentBoard";
import { isGenreMatch } from "../../lib/genreMatch";
import { flagFor, countryName } from "../../lib/territory";
import "flag-icons/css/flag-icons.min.css";

const CARD_GENRES = 2;

export const AgentBoardView: React.FC<{
  agents: Agent[];
  queries: Query[];
  grouping: AgentGroupingKey;
  matchGenre: string | null;
  onOpen: (agentId: string) => void;
  onPeek: (agentId: string, trigger: HTMLElement | null) => void;
  peekId: string | null;
}> = ({ agents, queries, grouping, matchGenre, onOpen, onPeek, peekId }) => {
  const columns = boardColumns(agents, queries, grouping);
  return (
    <div className="agl-boardwrap">
      <div className="agl-board">
        {columns.map((col) => (
          <div className="agl-col" key={col.key}>
            <div className="agl-bhead" style={{ borderBottomColor: col.accent }}>
              <div className="agl-btop">
                <span className="agl-btitle">{col.key}</span>
                <span className="agl-bcount">{col.agents.length}</span>
              </div>
              <div className="agl-bsub">{col.caption}</div>
            </div>
            {col.agents.length ? (
              col.agents.map((a) => {
                const flag = flagFor(a.country);
                const place = (a.city || "").trim() || countryName(a.country) || "";
                const weeks = a.responseTimeWeeks;
                const name = agentPrimary(a);
                return (
                  <div
                    key={a.id}
                    className={`agl-bcard${agentCardDims(a, queries) ? " s-dim" : ""}${isDoorOpen(a) ? "" : " s-shut"}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpen(a.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onOpen(a.id); } }}
                  >
                    <b>{name}</b>
                    <i>{agentSecondary(a)}</i>
                    <div className="agl-chips">
                      {a.genres.slice(0, CARD_GENRES).map((g) => (
                        <span className={`agl-chip${isGenreMatch(g, matchGenre) ? " agl-chip-match" : ""}`} key={g}>{g}</span>
                      ))}
                    </div>
                    <div className="agl-brow">
                      <span className="agl-metaline">
                        {flag && <span className={`fl ${flag}`} aria-hidden="true" />}
                        {[place, weeks && weeks > 0 ? `~${weeks} wks` : null].filter(Boolean).join(" · ")}
                      </span>
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
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="agl-colempty">Nobody here.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
