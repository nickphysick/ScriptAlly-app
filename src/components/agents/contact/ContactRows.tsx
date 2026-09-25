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
  onOpen: (agentId: string) => void;
  onLogQuery: (agentId: string) => void;
  onAddGenres: (agentId: string) => void;
}

const Line2: React.FC<{ line: RowDateLine | null }> = ({ line }) =>
  line ? <span className={`clv-qd${line.over ? " clv-qd--over" : ""}`} data-clv="qd">{line.text}</span> : null;

const Row: React.FC<{
  x: AgentFacts;
  nowMs: number;
  genreHit: (g: string) => boolean;
  current: boolean;
  onOpen: () => void;
  onLogQuery: () => void;
  onAddGenres: () => void;
}> = ({ x, nowMs, genreHit, current, onOpen, onLogQuery, onAddGenres }) => {
  const a = x.agent;
  const yourMove = x.stand === "you";
  const line = x.q ? rowDateLine(x.q, nowMs) : null;
  /* the manuscript's genre first, ticked (§6.2) */
  const genres = [...x.genres].sort((g1, g2) => Number(genreHit(g2)) - Number(genreHit(g1)));
  const paceBits = [
    x.loc ?? "Location ?",
    a.responseTimeWeeks ? `~${a.responseTimeWeeks} wks` : null,
    x.door === "closed" ? "Closed" : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      className={`clv-row${x.pastExpected ? " clv-row--late" : ""}`}
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
      onClick={onOpen}
    >
      <span className="clv-ini" aria-hidden="true">{agentInitials(a)}</span>
      <span className="clv-rwho">
        <b>{agentPrimary(a)}</b>
        {a.agency.trim() && a.name.trim() ? <span className="clv-ragy">{a.agency}</span> : null}
        <span className="clv-rloc">{paceBits.join(" · ")}</span>
      </span>
      <span className="clv-rfit">
        {x.genres.length > 0 ? (
          <>
            <span className="clv-gch" data-clv="gch">
              {genres.map((g) => (
                <span key={g} className={genreHit(g) ? "clv-hit" : undefined}>{g}</span>
              ))}
            </span>
            {(a.mswlNotes ?? "").trim() && <span className="clv-rwish">{a.mswlNotes.trim()}</span>}
          </>
        ) : (
          <span className="clv-torn" data-clv="torn">
            <em>Genres not recorded</em>
            <span
              className="clv-mini" role="button" tabIndex={0} data-clv="mini-genres"
              onClick={(e) => { e.stopPropagation(); onAddGenres(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onAddGenres(); } }}
            >
              Add genres
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
  groups, byId, nowMs, genreHit, openId, onOpen, onLogQuery, onAddGenres,
}) => (
  <div className="clv-list" data-clv="list">
    {groups.map((g) => (
      <React.Fragment key={g.label}>
        {groups.length > 1 || g.label !== "All agents" ? (
          <div className="clv-band2" data-clv="band">
            <b>{g.label}</b>
            <i>{String(g.ids.length).padStart(2, "0")}</i>
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
              onOpen={() => onOpen(id)}
              onLogQuery={() => onLogQuery(id)}
              onAddGenres={() => onAddGenres(id)}
            />
          );
        })}
      </React.Fragment>
    ))}
  </div>
);
