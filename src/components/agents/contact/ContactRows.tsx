/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactRows — the group bands and the profile-first rows (v11 §6). Every fact on a row is the
 * lib's (`agentFacts`, `rowDateLine`); a status is drawn only by `StatusDot`; missing data is
 * the torn slip with its action, never a dashed error box; and no colour encodes time pressure —
 * a past date is the ink edge and the bold date line, both ink.
 *
 * ⚠️ THE MINIS DO THEIR OWN JOB AND DO NOT OPEN THE ROW (§6.2): LOG QUERY opens the log flow
 * pre-filled; ADD GENRES opens the profile at Genres. REMIND ME (closed to submissions) arrives
 * with the Housekeeping phase's reminder mechanism — an absent control, per the house rule,
 * rather than a dead one.
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { AgentFacts, ContactGroup, RowDateLine, rowDateLine } from "../../../lib/contactList";
import { STAGE_NAME } from "../../../lib/qcSummary";

export interface ContactRowsProps {
  groups: ContactGroup[];
  byId: Map<string, AgentFacts>;
  nowMs: number;
  /** the manuscript's genre, matched — the ticked chip comes first */
  genreHit: (g: string) => boolean;
  openId: string | null;
  /** the just-added agent — its row wears the 2.4s ring (§8.4) */
  newId?: string | null;
  /** the row's own box rides with the open, so the agent card grows out of it (Agent card v1 §2) */
  onOpen: (agentId: string, from?: DOMRect) => void;
  onLogQuery: (agentId: string) => void;
  onAddGenres: (agentId: string) => void;
  /** the wishlist torn slip's door — the profile at its wishlist section (v12 §6) */
  onAddWishlist: (agentId: string) => void;
}

const Line2: React.FC<{ line: RowDateLine | null }> = ({ line }) =>
  line ? <span className={`clv-qd${line.over ? " clv-qd--over" : ""}`} data-clv="qd">{line.text}</span> : null;

const Row: React.FC<{
  x: AgentFacts;
  nowMs: number;
  genreHit: (g: string) => boolean;
  current: boolean;
  fresh: boolean;
  onOpen: (from: DOMRect) => void;
  onLogQuery: () => void;
  onAddGenres: () => void;
  onAddWishlist: () => void;
}> = ({ x, nowMs, genreHit, current, fresh, onOpen, onLogQuery, onAddGenres, onAddWishlist }) => {
  const a = x.agent;
  const yourMove = x.stand === "you";
  const line = x.q ? rowDateLine(x.q, nowMs) : null;
  /* the manuscript's genre first, ticked (§6.2) */
  const genres = [...x.genres].sort((g1, g2) => Number(genreHit(g2)) - Number(genreHit(g1)));
  /* v12 §6 (the mock's m4 who): ONE italic line — "Agency · London" — and OMITTED when there is
     neither. The v11 paceBits line (reply weeks, the door) left the row: those facts live in
     Housekeeping, the filter and the profile. */
  const whoBits = [
    a.agency.trim() && a.name.trim() ? a.agency.trim() : null,
    x.loc,
  ].filter(Boolean);
  const wish = (a.mswlNotes ?? "").trim();

  return (
    <button
      type="button"
      className={`clv-row${x.pastExpected ? " clv-row--late" : ""}${fresh ? " clv-row--new" : ""}`}
      data-clv="row"
      /* flip.ts's own default selector — the FLIP and the save-notice scroll both find rows by it */
      data-agent-card={a.id}
      data-stand={x.stand}
      data-door={x.door}
      data-status={x.statusKey}
      data-rating={x.rating ?? "none"}
      data-loc={x.loc ?? ""}
      data-genres={x.genres.join("|")}
      aria-current={current || undefined}
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
    >
      <span className="clv-ini" aria-hidden="true">{agentInitials(a)}</span>
      <span className="clv-rwho">
        <b>{agentPrimary(a)}</b>
        {whoBits.length > 0 && <i className="clv-ragy">{whoBits.join(" · ")}</i>}
      </span>
      {/* the dossier column (m4's .dos): the wishlist OVER the chips, each with its own torn
          slip when absent — two gaps, two doors, each into the profile at its own section */}
      <span className="clv-rfit" data-clv="dos">
        {wish ? (
          <span className="clv-rwish">{wish}</span>
        ) : (
          <span className="clv-torn" data-clv="torn-wish">
            <em>No wishlist yet</em>
            <span
              className="clv-mini" role="button" tabIndex={0} data-clv="mini-wish"
              aria-label="Add a manuscript wishlist"
              onClick={(e) => { e.stopPropagation(); onAddWishlist(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onAddWishlist(); } }}
            >
              Add
            </span>
          </span>
        )}
        {x.genres.length > 0 ? (
          <span className="clv-gch" data-clv="gch">
            {genres.map((g) => (
              <span key={g} className={genreHit(g) ? "clv-hit" : undefined}>{g}</span>
            ))}
          </span>
        ) : (
          <span className="clv-torn" data-clv="torn">
            <em>Genres not recorded</em>
            <span
              className="clv-mini" role="button" tabIndex={0} data-clv="mini-genres"
              aria-label="Add genres"
              onClick={(e) => { e.stopPropagation(); onAddGenres(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onAddGenres(); } }}
            >
              Add
            </span>
          </span>
        )}
      </span>
      <span className="clv-rq">
        {x.standing.kind === "none" ? (
          <>
            <span className="clv-ql clv-ql--none">Not queried yet</span>
            {x.door === "open" && (
              <span className="clv-qd">
                <span
                  className="clv-mini" role="button" tabIndex={0} data-clv="mini-log"
                  onClick={(e) => { e.stopPropagation(); onLogQuery(); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onLogQuery(); } }}
                >
                  Log query
                </span>
              </span>
            )}
          </>
        ) : (
          <>
            <span className="clv-ql">
              {x.q && <StatusDot status={x.q.status as QueryStatus} overrideSize={13} />}
              {x.q ? STAGE_NAME[x.q.status as keyof typeof STAGE_NAME] ?? String(x.q.status) : ""}
              {yourMove && <span className="clv-ym" data-clv="ym">Your move</span>}
            </span>
            <Line2 line={line} />
          </>
        )}
      </span>
    </button>
  );
};

export const ContactRows: React.FC<ContactRowsProps> = ({
  groups, byId, nowMs, genreHit, openId, newId = null, onOpen, onLogQuery, onAddGenres, onAddWishlist,
}) => (
  <div className="clv-list" data-clv="list">
    {groups.map((g) => (
      <React.Fragment key={g.label}>
        {groups.length > 1 || g.label !== "All agents" ? (
          /* a LETTER divider carries its letter as data — the strip's click target and the
             marked-letter derivation both reach it by `[data-clv="band"][data-letter]`; only
             the letter grouping's labels are single A–Z/# characters, so no other grouping
             can wear the attribute */
          <div className="clv-band2" data-clv="band" data-letter={/^[A-Z#]$/.test(g.label) ? g.label : undefined}>
            <b>{g.label}</b>
            <i aria-hidden="true" />
            <small>{g.ids.length} {g.ids.length === 1 ? "agent" : "agents"}</small>
            {g.extra && <small>{g.extra}</small>}
          </div>
        ) : null}
        {g.ids.map((id) => {
          const x = byId.get(id);
          if (!x) return null;
          return (
            <Row
              key={id}
              x={x}
              nowMs={nowMs}
              genreHit={genreHit}
              current={openId === id}
              fresh={newId === id}
              onOpen={(from) => onOpen(id, from)}
              onLogQuery={() => onLogQuery(id)}
              onAddGenres={() => onAddGenres(id)}
              onAddWishlist={() => onAddWishlist(id)}
            />
          );
        })}
      </React.Fragment>
    ))}
  </div>
);
