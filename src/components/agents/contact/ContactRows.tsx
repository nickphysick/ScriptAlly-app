/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactRows — the group bands and the profile-first rows (v11 §6). Every fact on a row is the
 * lib's (`agentFacts`, `rowDateLine`); a status is drawn only by `StatusDot`; missing data is
 * the torn slip with its action, never a dashed error box; and no colour encodes time pressure —
 * a past date is the ink edge and the bold date line, both ink.
 *
 * ⚠️ THE MINIS DO THEIR OWN JOB AND DO NOT OPEN THE ROW (§6.2): ADD opens the card at the gap.
 * v13 §6: the v11 "Log query" mini retired into the hover tray, which offers the card's own next
 * step (Log a query, Remind me, a send, a nudge…) beside Open card.
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { AgentFacts, ContactGroup, RowDateLine, rowDateLine } from "../../../lib/contactList";
import { QcRow, STAGE_NAME } from "../../../lib/qcSummary";
import type { CardAct, CardPrimary } from "../../../lib/agentCard";

/**
 * v13 §6 — the row's 6px left edge is the query's state colour, deep (the mock's `EDGE` map): an
 * offer, your move (which includes an agent's-court query past its date — the page's union), a
 * Queried query still with the agent, a later stage with the agent, a close; nothing for a
 * never-queried agent, whatever their door says. The colour is `--state-*-deep`, read by the sheet.
 */
export type RowEdge = "you" | "agent" | "queried" | "offer" | "closed" | "none";
export function rowEdge(x: Pick<AgentFacts, "stand">, q: Pick<QcRow, "court" | "status"> | null): RowEdge {
  if (x.stand === "none") return "none";
  if (q && q.court === "offer") return "offer";
  if (x.stand === "you") return "you";
  if (x.stand === "closed") return "closed";
  return q && q.status === QueryStatus.QUERIED ? "queried" : "agent";
}

export interface ContactRowsProps {
  groups: ContactGroup[];
  /** v13 §5: while the list is filtered, each heading reads "n of m" — m from this map (a group's
   *  size over every agent); absent, the heading counts its own rows */
  totals?: ReadonlyMap<string, number> | null;
  byId: Map<string, AgentFacts>;
  nowMs: number;
  /** the manuscript's genre, matched — the ticked chip comes first */
  genreHit: (g: string) => boolean;
  openId: string | null;
  /** v14 §4: under Status and Action grouping the YOUR MOVE tag is hidden — the heading already says it */
  hideYourMove?: boolean;
  /** the just-added agent — its row wears the 2.4s ring (§8.4) */
  newId?: string | null;
  /** the row's own box rides with the open, so the agent card grows out of it (Agent card v1 §2) */
  onOpen: (agentId: string, from?: DOMRect) => void;
  onAddGenres: (agentId: string) => void;
  /** the wishlist torn slip's door — the profile at its wishlist section (v12 §6) */
  onAddWishlist: (agentId: string) => void;
  /** v13 §6 — the hover tray's next step: the card's own primary (`primaryFor`), so the row and the
   *  card cannot offer different verbs. A ghost primary (a way OUT, not a next step) is not offered. */
  trayFor: (x: AgentFacts) => CardPrimary;
  /** the tray's step, straight to its journey without the card */
  onAct: (agentId: string, act: CardAct) => void;
}

const Line2: React.FC<{ line: RowDateLine | null }> = ({ line }) =>
  line ? <span className={`clv-qd${line.over ? " clv-qd--over" : ""}`} data-clv="qd">{line.text}</span> : null;

const Row: React.FC<{
  x: AgentFacts;
  nowMs: number;
  genreHit: (g: string) => boolean;
  current: boolean;
  fresh: boolean;
  hideYourMove?: boolean;
  onOpen: (from: DOMRect) => void;
  onAddGenres: () => void;
  onAddWishlist: () => void;
  tray: CardPrimary;
  onAct: (act: CardAct) => void;
}> = ({ x, nowMs, genreHit, current, fresh, hideYourMove = false, onOpen, onAddGenres, onAddWishlist, tray, onAct }) => {
  const a = x.agent;
  const yourMove = x.stand === "you" && !hideYourMove;
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
    /* ⚠️ A div WITH role=button, NOT A <button> (v13 P4): the row holds real controls now — the torn
       slips' Add and the tray's two buttons — and a button may not contain another interactive
       element. Enter and Space open it, as a button's would; a key on a control inside it is that
       control's. */
    <div
      role="button"
      tabIndex={0}
      className={`clv-row${fresh ? " clv-row--new" : ""}`}
      data-clv="row"
      /* flip.ts's own default selector — the FLIP and the save-notice scroll both find rows by it */
      data-agent-card={a.id}
      data-edge={rowEdge(x, x.q)}
      data-stand={x.stand}
      data-door={x.door}
      data-status={x.statusKey}
      data-rating={x.rating ?? "none"}
      data-loc={x.loc ?? ""}
      data-genres={x.genres.join("|")}
      aria-current={current || undefined}
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return; // a control inside the row answers its own keys
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(e.currentTarget.getBoundingClientRect()); }
      }}
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
            <span className="clv-ql clv-ql--none">{x.door === "open" ? "Not queried yet" : "Closed to queries"}</span>
            {x.door === "open" && <span className="clv-qd">Open to queries</span>}
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
      {/* v13 §6 — THE HOVER TRAY (the mock's .tray): the next step, then Open card, over the query
          column on hover or keyboard focus. */}
      <span className="clv-rtray" data-cl13="tray">
        {!tray.ghost && (
          <TrayBtn primary probe="tray-act" label={tray.label} onPress={() => onAct(tray.act)} />
        )}
        <TrayBtn probe="tray-open" label="Open card" onPress={(r) => onOpen(r)} />
      </span>
    </div>
  );
};

const TrayBtn: React.FC<{ primary?: boolean; probe: string; label: string; onPress: (rowRect: DOMRect) => void }> = ({ primary, probe, label, onPress }) => (
  <button
    type="button" className={`clv-trb${primary ? " p" : ""}`} data-cl13={probe}
    onClick={(e) => {
      e.stopPropagation();
      const row = e.currentTarget.closest<HTMLElement>('[data-clv="row"]');
      onPress((row ?? e.currentTarget).getBoundingClientRect());
    }}
  >
    {label}
  </button>
);

export const ContactRows: React.FC<ContactRowsProps> = ({
  groups, totals = null, byId, nowMs, genreHit, openId, hideYourMove = false, newId = null, onOpen, onAddGenres, onAddWishlist, trayFor, onAct,
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
            <small data-cl13="gcount">{totals ? `${g.ids.length} of ${totals.get(g.label) ?? g.ids.length}` : `${g.ids.length} ${g.ids.length === 1 ? "agent" : "agents"}`}</small>
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
              hideYourMove={hideYourMove}
              onOpen={(from) => onOpen(id, from)}
              tray={trayFor(x)}
              onAct={(act) => onAct(id, act)}
              onAddGenres={() => onAddGenres(id)}
              onAddWishlist={() => onAddWishlist(id)}
            />
          );
        })}
      </React.Fragment>
    ))}
  </div>
);
