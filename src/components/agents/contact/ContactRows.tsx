/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactRows — the Contact list's table (v14 §5–§6; v131's grammar through shell/listTable). Letter grouping is ONE
 * panel with letter dividers; any other grouping is a powder band over each group's own panel. Every fact on a row
 * is the lib's (`agentFacts`, `rowDateLine`); a status is drawn only by `StatusDot`; missing data is the dashed slate
 * add pill, which opens the editor at that field; no colour encodes time pressure, and no row carries a coloured edge.
 *
 * ⚠️ THE PILLS DO THEIR OWN JOB AND DO NOT OPEN THE ROW: Add opens the card at the gap. The hover tray offers the
 * card's own next step (Log a query, Remind me, a send, a nudge…) beside Open card.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ListDivider, ListGroupHeader, ListPanel, type ListColumn } from "../../shell/listTable/ListTable";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { AgentFacts, ContactGroup, RowDateLine, type SortKey, rowDateLine } from "../../../lib/contactList";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { dayMonth } from "../../../lib/dates";
import type { CardAct, CardPrimary } from "../../../lib/agentCard";

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

/** v14 §6 — the Contact list's four columns, v131's table grammar: Agent · What they want · Replies · Query status */
export const CONTACT_COLS = "minmax(200px, 1.3fr) minmax(0, 2fr) 120px minmax(170px, 1fr)";

/** "1 Nov" — a reopening date as the replies column names it (the one short-month formatter, lib/dates) */
const reopenDay = (iso: string | undefined): string | null => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? dayMonth(t) : null;
};

/**
 * v14 §6 — THE WISHLIST MARQUEE. One line; when it does not fit it fades at the right edge, and on row hover
 * it scrolls to its end and back at ~28px a second after a 0.5s pause. ⚠️ Run by the Web Animations API, never a
 * CSS keyframe reading a custom property: a `var()` inside `@keyframes` fails silently in this setup (house rule).
 * Off under reduced motion. The overflow is measured on hover, so a resize never leaves a stale distance.
 */
function startMarquee(p: HTMLElement | null): Animation | null {
  if (!p || typeof window === "undefined") return null;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return null;
  const sp = p.querySelector<HTMLElement>(".clv-mq");
  if (!sp || typeof sp.animate !== "function") return null;
  const over = sp.scrollWidth - p.clientWidth;
  if (over <= 2) return null;
  const dist = over + 6;
  return sp.animate([{ transform: "translateX(0)" }, { transform: `translateX(${-dist}px)` }], {
    duration: Math.max(3000, (dist / 28) * 1000), delay: 500, iterations: Infinity, direction: "alternate", easing: "linear",
  });
}

/** §7.3 — the Find text marked (#f6dccd) in a row's name and agency; case-insensitive, every match */
export function Marked({ text, q }: { text: string; q: string }) {
  const n = q.trim();
  if (!n) return <>{text}</>;
  const out: React.ReactNode[] = [];
  const low = text.toLowerCase(), k = n.toLowerCase();
  let i = 0;
  for (let j = low.indexOf(k); j >= 0; j = low.indexOf(k, i)) {
    if (j > i) out.push(text.slice(i, j));
    out.push(<mark key={j} className="clv-mark">{text.slice(j, j + n.length)}</mark>);
    i = j + n.length;
  }
  if (i < text.length) out.push(text.slice(i));
  return <>{out}</>;
}

/** the dashed slate link pill (§6) — "+ Add their wishlist" / "+ Add genres"; it opens the editor at that field */
const AddPill: React.FC<{ probe: string; label: string; onPress: () => void }> = ({ probe, label, onPress }) => (
  <span
    className="clv-miss" role="button" tabIndex={0} data-clv={probe}
    onClick={(e) => { e.stopPropagation(); onPress(); }}
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onPress(); } }}
  >
    {label}
  </span>
);

const Row: React.FC<{
  x: AgentFacts;
  nowMs: number;
  genreHit: (g: string) => boolean;
  current: boolean;
  fresh: boolean;
  hideYourMove?: boolean;
  /** §7.7 — the keyboard's focus ring is on this row (its tray shows) */
  focused?: boolean;
  /** §7.3 — the Find text, marked in the name and agency */
  highlight?: string;
  onOpen: (from: DOMRect) => void;
  onAddGenres: () => void;
  onAddWishlist: () => void;
  tray: CardPrimary;
  onAct: (act: CardAct) => void;
}> = ({ x, nowMs, genreHit, current, fresh, hideYourMove = false, focused = false, highlight = "", onOpen, onAddGenres, onAddWishlist, tray, onAct }) => {
  const a = x.agent;
  const yourMove = x.stand === "you" && !hideYourMove;
  const line = x.q ? rowDateLine(x.q, nowMs) : null;
  /* the manuscript's genres first, ticked (§6) */
  const genres = [...x.genres].sort((g1, g2) => Number(genreHit(g2)) - Number(genreHit(g1)));
  /* "Agency · London" — the agency only when the name is not itself the agency, then the place */
  const whoBits = [a.agency.trim() && a.name.trim() ? a.agency.trim() : null, x.loc].filter(Boolean);
  const wish = (a.mswlNotes ?? "").trim();
  /* §6 — a CLOSED agent: their door is shut and nothing is queried, or everything with them has closed.
     Grey disc, softer name; no coloured edge for anyone. */
  const shut = (x.standing.kind === "none" && x.door !== "open") || x.stand === "closed";
  const weeks = typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null;
  const reopens = x.door !== "open" ? reopenDay(a.reopensOn) : null;
  const wishRef = useRef<HTMLParagraphElement>(null);
  const mq = useRef<Animation | null>(null);
  const stopMq = () => { mq.current?.cancel(); mq.current = null; };
  useEffect(() => stopMq, []);
  /* the fade at the right edge says "there is more"; measured after layout and on resize */
  const [long, setLong] = useState(false);
  useLayoutEffect(() => {
    const p = wishRef.current;
    if (!p) return undefined;
    const measure = () => {
      const sp = p.querySelector<HTMLElement>(".clv-mq");
      const next = !!sp && sp.scrollWidth - p.clientWidth > 2;
      setLong((cur) => (cur === next ? cur : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(p);
    return () => ro.disconnect();
  }, [wish]);

  return (
    /* ⚠️ A div WITH role=button, NOT A <button> (v13 P4): the row holds real controls — the add pills and the
       tray's two buttons — and a button may not contain another interactive element. */
    <div
      role="button"
      tabIndex={0}
      className={`clv-row${fresh ? " clv-row--new" : ""}${focused ? " kf" : ""}`}
      data-clv="row"
      /* flip.ts's own default selector — the FLIP and the save-notice scroll both find rows by it */
      data-agent-card={a.id}
      data-shut={shut || undefined}
      data-stand={x.stand}
      data-door={x.door}
      data-status={x.statusKey}
      data-rating={x.rating ?? "none"}
      data-loc={x.loc ?? ""}
      data-genres={x.genres.join("|")}
      aria-current={current || undefined}
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      onMouseEnter={() => { stopMq(); mq.current = startMarquee(wishRef.current); }}
      onMouseLeave={stopMq}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return; // a control inside the row answers its own keys
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(e.currentTarget.getBoundingClientRect()); }
      }}
    >
      <span className="clv-rwho">
        <span className="clv-ini" aria-hidden="true">{agentInitials(a)}</span>
        <span className="clv-rwn">
          <b><Marked text={agentPrimary(a)} q={highlight} /></b>
          {whoBits.length > 0 && <i className="clv-ragy"><Marked text={whoBits.join(" · ")} q={highlight} /></i>}
        </span>
      </span>
      {/* What they want: the wishlist on ONE line, the genre chips under it */}
      <span className="clv-rfit" data-clv="dos">
        {wish ? (
          <p className={`clv-rwish${long ? " is-long" : ""}`} ref={wishRef} data-clv="wish"><span className="clv-mq">{wish}</span></p>
        ) : (
          <AddPill probe="torn-wish" label="+ Add their wishlist" onPress={onAddWishlist} />
        )}
        {x.genres.length > 0 ? (
          <span className="clv-gch" data-clv="gch">
            {genres.map((g) => (
              <span key={g} className={genreHit(g) ? "clv-hit" : undefined}>{g}</span>
            ))}
          </span>
        ) : (
          <AddPill probe="torn" label="+ Add genres" onPress={onAddGenres} />
        )}
      </span>
      {/* Replies: "~N wks" over the door */}
      <span className="clv-rrep" data-clv="rep">
        {weeks ? <b>~{weeks} wks</b> : <b className="unk">Not stated</b>}
        <small>{x.door === "open" ? "Open to queries" : reopens ? `Closed till ${reopens}` : "Closed to queries"}</small>
      </span>
      <span className="clv-rq">
        {x.standing.kind === "none" ? (
          <span className="clv-ql clv-ql--none">Not queried yet</span>
        ) : (
          <>
            <span className="clv-ql">
              {x.q && <StatusDot status={x.q.status as QueryStatus} overrideSize={11} />}
              {x.q ? STAGE_NAME[x.q.status as keyof typeof STAGE_NAME] ?? String(x.q.status) : ""}
              {yourMove && <span className="clv-ym" data-clv="ym">Your move</span>}
            </span>
            <Line2 line={line} />
          </>
        )}
      </span>
      {/* the hover tray: the next step, then Open card, over the query column on hover or keyboard focus */}
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

/** the column labels' sort control — the page's own sort state, so a label and the Sort pill cannot disagree */
export interface ContactSortControl { key: SortKey; reversed: boolean; onSort: (k: SortKey) => void; onReverse: () => void }

export const ContactRows: React.FC<ContactRowsProps & {
  byLetter?: boolean; sort?: ContactSortControl; focusId?: string | null; highlight?: string; compact?: boolean;
}> = ({
  groups, totals = null, byId, nowMs, genreHit, openId, hideYourMove = false, newId = null, onOpen, onAddGenres, onAddWishlist, trayFor, onAct,
  byLetter = true, sort, focusId = null, highlight = "", compact = false,
}) => {
  const col = (label: string, k: SortKey | null, align?: "end"): ListColumn => ({
    label, align,
    sort: k && sort ? {
      on: sort.key === k, reversed: sort.key === k && sort.reversed,
      onPress: () => (sort.key === k ? sort.onReverse() : sort.onSort(k)),
    } : undefined,
  });
  const columns = [col("Agent", "surname"), col("What they want", null), col("Replies", "reply"), col("Query status", "status", "end")];
  const countOf = (g: ContactGroup) => (totals ? `${g.ids.length} of ${totals.get(g.label) ?? g.ids.length}` : `${g.ids.length} ${g.ids.length === 1 ? "agent" : "agents"}`);
  const rowsOf = (g: ContactGroup) => g.ids.map((id) => {
    const x = byId.get(id);
    if (!x) return null;
    return (
      <Row
        key={id} x={x} nowMs={nowMs} genreHit={genreHit} current={openId === id} fresh={newId === id} hideYourMove={hideYourMove}
        focused={focusId === id} highlight={highlight}
        onOpen={(from) => onOpen(id, from)} tray={trayFor(x)} onAct={(act) => onAct(id, act)}
        onAddGenres={() => onAddGenres(id)} onAddWishlist={() => onAddWishlist(id)}
      />
    );
  });
  return (
    <div className={`clv-list${compact ? " clv-list--compact" : ""}`} data-clv="list" data-density={compact ? "compact" : "comfortable"}>
      {byLetter ? (
        /* Letter: ONE panel — the labels, then each letter's divider and its rows as siblings */
        <ListPanel cols={CONTACT_COLS} columns={columns} data-clv="panel">
          {groups.map((g) => (
            <React.Fragment key={g.label}>
              <ListDivider letter={g.label} count={countOf(g)} data-clv="band" data-letter={/^[A-Z#]$/.test(g.label) ? g.label : undefined} />
              {rowsOf(g)}
            </React.Fragment>
          ))}
        </ListPanel>
      ) : (
        /* any other grouping: a powder header over each group's own panel (§5), its labels pinning under it */
        groups.map((g) => (
          <section className="clv-grp" key={g.label} data-clv="grp">
            <ListGroupHeader tone="powder" title={g.label} count={countOf(g)} data-clv="band" />
            <ListPanel cols={CONTACT_COLS} columns={columns} stickTop={54} data-clv="panel">
              {rowsOf(g)}
            </ListPanel>
          </section>
        ))
      )}
    </div>
  );
};
