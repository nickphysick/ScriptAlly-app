/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactRows — the Contact list's table (v14 §5–§6; v131's grammar through shell/listTable). Letter grouping is ONE
 * panel with letter dividers; any other grouping is a powder band over each group's own panel. Every fact on a row
 * is the lib's (`agentFacts`, `rowDateLine`); a status is drawn only by `StatusDot`; missing data is the dashed slate
 * add pill, which opens the editor at that field; no colour encodes time pressure, and no row carries a coloured edge.
 *
 * ⚠️ THE CONTROLS IN A ROW DO THEIR OWN JOB AND DO NOT OPEN THE CARD (v19 §C/§D): the email copies, the website opens
 * in a new tab, every "Add …" opens the card at that field. There is no hover tray and no next step in the row (the
 * agent card keeps it). The open row is one strip — genres and the wishlist (ContactPeek). Clicking empty space in a
 * row opens the card.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { STAGE_TRACK, discTone, stageTrack } from "../../../lib/contactStage";
import { AgentDisc, standingOf } from "../../shared/AgentDisc";
import { ListDivider, ListGroupHeader, ListPanel, type ListColumn } from "../../shell/listTable/ListTable";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { ContactGroupMark } from "./ContactGroupMark";
import { AgentFacts, ContactGroup, type GroupKey, RowDateLine, type SortKey, rowDateLine, surnameInitial } from "../../../lib/contactList";
import { DOOR_NOT_KNOWN } from "../../../lib/agentList";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { dayMonth } from "../../../lib/dates";
import type { CardAct, CardPrimary } from "../../../lib/agentCard";
import type { AgentCardField, AgentCardTab } from "../../../lib/agentCardStore";
import { ContactPeek } from "./ContactPeek";
import { AddContact, CopyEmail, DateAdded, Website } from "./ContactCells";
import { CONTACT_FS, CONTACT_GAP, fitContactColumns, type ContactColumnFit } from "../../../lib/contactColumns";

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
  /* v19 §D — the four below are no longer read by the rows: the strip's add links open the card through `onEdit`, and
     the next step left the row (the agent card keeps it; the page's L key still reads `trayFor`). Optional, so the
     exhibit and the loading cover keep compiling unchanged. */
  onAddGenres?: (agentId: string) => void;
  onAddWishlist?: (agentId: string) => void;
  trayFor?: (x: AgentFacts) => CardPrimary;
  onAct?: (agentId: string, act: CardAct) => void;
}

const Line2: React.FC<{ line: RowDateLine | null }> = ({ line }) =>
  line ? <span className={`clv-qd${line.over ? " clv-qd--over" : ""}`} data-clv="qd">{line.text}</span> : null;

/** v19 §C — the columns before they are measured (the measurement replaces them before paint): Agent · Date added ·
 *  Website · Email · Replies · Query status */
export const CONTACT_COLS = "minmax(0, 1fr) auto auto auto auto auto";

/** "1 Nov" — a reopening date as the replies column names it (the one short-month formatter, lib/dates) */
const reopenDay = (iso: string | undefined): string | null => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? dayMonth(t) : null;
};

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
  /** v17 §D — "+ Log a query": opens the agent panel at the Log a query journey, with this agent chosen */
  onLog?: () => void;
  /** v18 §D — this row's peek is open (one row at a time: the list holds which) */
  peek?: boolean;
  /** `via` says what asked (v18.3.3 §D): the pointer's dwell or leaving, the keyboard, or focus leaving the row */
  onPeek?: (open: boolean, via: PeekVia) => void;
  /** v18 §D — a "+ Add" pill in the peek opens Edit profile on that field */
  onEdit?: (tab: AgentCardTab, focus?: AgentCardField) => void;
  /** v19 §C — website and email share one column, stacked (they do not both fit side by side) */
  stacked?: boolean;
  /** v19 §H — the list's register of each row's dwell: when a held hover lets go with the pointer already on a row, the
   *  list starts that row's dwell (its mouseenter came while hover was held) */
  dwellers?: Map<string, () => void>;
}> = ({ x, nowMs, genreHit, current, fresh, hideYourMove = false, focused = false, highlight = "", onOpen, onLog, peek = false, onPeek, onEdit, stacked = false, dwellers }) => {
  const track = stageTrack(x);
  const tone = discTone(x);
  const a = x.agent;
  const yourMove = x.stand === "you" && !hideYourMove;
  const line = x.q ? rowDateLine(x.q, nowMs) : null;
  /* the manuscript's genres first, ticked (§6) */
  const genres = [...x.genres].sort((g1, g2) => Number(genreHit(g2)) - Number(genreHit(g1)));
  /* "Agency · London" — the agency only when the name is not itself the agency, then the place */
  const whoBits = [a.agency.trim() && a.name.trim() ? a.agency.trim() : null, x.loc].filter(Boolean);
  /* §6 — a CLOSED agent: their door is shut and nothing is queried, or everything with them has closed.
     Grey disc, softer name; no coloured edge for anyone. */
  const shut = (x.standing.kind === "none" && x.door === "closed") || x.stand === "closed";
  const weeks = typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null;
  const reopens = x.door === "closed" ? reopenDay(a.reopensOn) : null;
  /* v18 §D — the peek opens after 450ms of continuous hover and closes when the pointer leaves the row. The row's main
     line height is read before it opens, so the hover tray stays on that line while the row grows. */
  const rowRef = useRef<HTMLDivElement>(null);
  const hoverT = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(hoverT.current), []);
  /* v19 §D — the height the row has as the strip starts to open (mid-close, that is where it is now), and the main
     line's own height, which a close shrinks back to */
  const startH = useRef(0);
  const mainH = useRef(0);
  const openPeek = (v: boolean, via: PeekVia) => {
    const el = rowRef.current;
    if (v && el && !peek) {
      startH.current = el.getBoundingClientRect().height;
      if (!shown) mainH.current = startH.current;
      el.style.setProperty("--cl18-mh", `${el.offsetHeight}px`);
    }
    onPeek?.(v, via);
  };
  /* v19 §D — THE STRIP'S MOTION. Opening: the row's height grows over 300ms (cubic-bezier(.2,.8,.2,1)), `overflow:
     hidden` only while it animates; the strip fades in from −6px over 260ms, 60ms in. Closing: the strip STAYS while the
     height shrinks over 220ms (cubic-bezier(.4,0,.2,1)) and fades over 160ms, then leaves. `shown` holds the strip
     through the close; `data-peek` (what the list's "always closes" controller decides) drops at once. No other row
     moves except by this height. Instant under reduced motion. Web Animations, so no keyframe reads a custom property. */
  const [shown, setShown] = useState(peek);
  if (peek && !shown) setShown(true);
  const strip = peek || shown;
  const stripRef = useRef<HTMLDivElement>(null);
  const anims = useRef<Animation[]>([]);
  const stopAnims = () => { for (const k of anims.current) k.cancel(); anims.current = []; if (rowRef.current) rowRef.current.style.overflow = ""; };
  useEffect(() => stopAnims, []); // eslint-disable-line react-hooks/exhaustive-deps
  const wasPeek = useRef(peek);
  useLayoutEffect(() => {
    const el = rowRef.current, was = wasPeek.current;
    wasPeek.current = peek;
    if (!el || was === peek) return;
    const still = typeof el.animate !== "function" || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (peek) {
      stopAnims();
      if (still) return;
      const to = el.getBoundingClientRect().height, from = startH.current || mainH.current || to;
      el.style.overflow = "hidden";
      const grow = el.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" });
      grow.onfinish = () => { el.style.overflow = ""; };
      anims.current = [grow];
      const st = stripRef.current;
      if (st) anims.current.push(st.animate([{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }],
        { duration: 260, delay: 60, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
      return;
    }
    if (still) { stopAnims(); setShown(false); return; }
    const from = el.getBoundingClientRect().height, to = mainH.current || from;
    for (const k of anims.current) k.cancel();
    el.style.overflow = "hidden";
    const shrink = el.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 220, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
    shrink.onfinish = () => setShown(false);
    anims.current = [shrink];
    const st = stripRef.current;
    if (st) anims.current.push(st.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease", fill: "forwards" }));
  }, [peek]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!dwellers) return undefined;
    const id = a.id;
    const fn = () => { window.clearTimeout(hoverT.current); if (onPeek) hoverT.current = window.setTimeout(() => openPeek(true, "pointer"), 450); };
    dwellers.set(id, fn);
    return () => { if (dwellers.get(id) === fn) dwellers.delete(id); };
  });
  /* the strip has left: put the row's own height back */
  useLayoutEffect(() => { if (!strip) stopAnims(); }, [strip]); // eslint-disable-line react-hooks/exhaustive-deps

  const email = (a.email ?? "").trim(), site = (a.website ?? "").trim();
  const webCell = site ? <Website url={site} /> : <AddContact kind="website" onPress={() => onEdit?.("who", "website")} />;
  const mailCell = email ? <CopyEmail email={email} /> : <AddContact kind="email" onPress={() => onEdit?.("who", "email")} />;
  return (
    /* ⚠️ A div WITH role=button, NOT A <button> (v13 P4): the row holds real controls — the add pills and the
       tray's two buttons — and a button may not contain another interactive element. */
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      data-peek={peek ? "" : undefined}
      data-cl19-open={strip ? "" : undefined}
      aria-expanded={onPeek ? peek : undefined}
      className={`clv-row${fresh ? " clv-row--new" : ""}${focused ? " kf" : ""}`}
      data-clv="row"
      /* flip.ts's own default selector — the FLIP and the save-notice scroll both find rows by it */
      data-agent-card={a.id}
      /* v16 §C: the surname's initial — what a letter tab scrolls to in the ungrouped list */
      data-initial={surnameInitial(a)}
      data-disc={tone}
      data-shut={shut || undefined}
      data-stand={x.stand}
      data-door={x.door}
      data-status={x.statusKey}
      data-rating={x.rating ?? "none"}
      data-loc={x.loc ?? ""}
      data-genres={x.genres.join("|")}
      aria-current={current || undefined}
      /* v18 §D: opening the agent closes this row's peek (and any peek still waiting to open) */
      onClick={(e) => {
        /* v19 §C/§D — the contact cells and the strip's add links answer their own clicks; empty space still opens the card */
        if ((e.target as HTMLElement).closest('.cl19-c [data-cl19], [data-cl19="strip"] [role="button"]')) return;
        window.clearTimeout(hoverT.current); if (peek) onPeek?.(false, "click"); onOpen(e.currentTarget.getBoundingClientRect());
      }}
      onMouseEnter={() => {
        window.clearTimeout(hoverT.current); if (onPeek) hoverT.current = window.setTimeout(() => openPeek(true, "pointer"), 450);
      }}
      onMouseLeave={() => { window.clearTimeout(hoverT.current); if (peek) openPeek(false, "pointer"); }}
      /* v18.3.3 §D — a row opened from the keyboard closes when focus leaves it (the list ignores this for a row the
         pointer opened, which closes when the pointer leaves) */
      onBlur={(e) => { if (peek && !e.currentTarget.contains(e.relatedTarget as Node | null)) openPeek(false, "focus"); }}
      onKeyDown={(e) => {
        /* v18.3.3 §D — Escape closes an open row from anywhere inside it, and focus goes back to the row */
        if (e.key === "Escape" && peek) { e.preventDefault(); e.stopPropagation(); openPeek(false, "key"); e.currentTarget.focus(); return; }
        if (e.target !== e.currentTarget) return; // a control inside the row answers its own keys
        /* v18 §D: Space toggles the peek; Enter still opens the agent panel */
        if (e.key === " " && onPeek) { e.preventDefault(); openPeek(!peek, "key"); return; }
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(e.currentTarget.getBoundingClientRect()); }
      }}
    >
      <span className="clv-rwho">
        <AgentDisc initials={agentInitials(a)} standing={standingOf(tone)} className="clv-ini" attrs={{ "data-cl17": "disc" }} />
        <span className="clv-rwn">
          <b><Marked text={agentPrimary(a)} q={highlight} /></b>
          {whoBits.length > 0 && <i className="clv-ragy"><Marked text={whoBits.join(" · ")} q={highlight} /></i>}
        </span>
      </span>
      {/* v19 §C — Date added, then Website and Email: two columns, or one stacked column when they do not both fit.
          Each answers its own click; none opens the card. A missing one is "Add …", the card at that field. */}
      <span className="cl19-c cl19-cd"><DateAdded agent={a} /></span>
      {stacked ? (
        <span className="cl19-c cl19-cs" data-cl19="contacts">{webCell}{mailCell}</span>
      ) : (
        <>
          <span className="cl19-c cl19-cw">{webCell}</span>
          <span className="cl19-c cl19-ce">{mailCell}</span>
        </>
      )}
      {/* Replies: "~N wks" over the door */}
      <span className="clv-rrep" data-clv="rep">
        {weeks ? <b>~{weeks} wks</b> : <b className="unk">Not stated</b>}
        {/* v19.2 §B — an open agent's door goes unsaid (it is true of nearly every row); a closed one says so in
            rust, with the reopening date when it is known. "Not known" stays: it is not a claim that they are open. */}
        {x.door === "unknown"
          ? <small data-clv="door-unknown" title="Whether they are open to queries is not known">{DOOR_NOT_KNOWN}</small>
          : x.door === "closed"
            ? <em className="cl192-shut" data-cl192="rep-closed">{reopens ? `Closed till ${reopens}` : "Closed to queries"}</em>
            : null}
      </span>
      {/* v17 §D — QUERY STATUS. A queried agent: the stage, a four-bar track of how far it got, then the date. An
          agent not queried yet: "+ Log a query" (the panel's journey), or why not if they are closed to queries. */}
      <span className="clv-rq cl17-rq" data-cl17="status">
        {x.standing.kind === "none" ? (
          x.door === "closed" ? (
            <span className="cl17-shut" data-cl17="status-shut">{reopens ? `Closed till ${reopens}` : "Closed to queries"}</span>
          ) : (
            <button type="button" className="cl17-log" data-cl17="log" onClick={(e) => { e.stopPropagation(); onLog?.(); }}
              onKeyDown={(e) => e.stopPropagation()}>+ Log a query</button>
          )
        ) : (
          <>
            <span className="clv-ql" data-cl17="stage">
              {x.q && <StatusDot status={x.q.status as QueryStatus} overrideSize={11} />}
              {x.q ? STAGE_NAME[x.q.status as keyof typeof STAGE_NAME] ?? String(x.q.status) : ""}
            </span>
            {track ? (
              <span className="cl17-track" data-cl17="track" data-closed={track.closed || undefined} aria-hidden="true">
                {STAGE_TRACK.map((name, i) => <i key={name} title={name} data-on={!track.closed && i < track.filled ? "" : undefined} />)}
              </span>
            ) : null}
            <span className="cl17-dl" data-cl17="date-line">
              {yourMove && <span className="clv-ym" data-clv="ym">Your move</span>}
              <Line2 line={line} />
            </span>
          </>
        )}
      </span>
      {/* v19 §D — the open row: one strip under the main line (genres · divider · wishlist), cream since v19.1 §G */}
      {strip ? <ContactPeek agent={a} genres={genres} genreHit={genreHit} onEdit={(tab, focus) => onEdit?.(tab, focus)} stripRef={stripRef} /> : null}
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
/** v18.3.3 §D — what asked a row's peek to open or close */
export type PeekVia = "pointer" | "key" | "focus" | "click";

/** v19 §E — THE STRONG BAND: 50 tall, powder #e6edf6, a 2px navy rule on top and a 1px rule beneath; the group's mark,
 *  its name in the typewriter at 19px and a navy pill counting the rows showing ("1 agent" / "N agents"). */
export const ContactGroupBand: React.FC<{ groupKey: GroupKey; g: ContactGroup }> = ({ groupKey, g }) => {
  const n = g.ids.length;
  const isLetter = groupKey === "letter";
  return (
    <div className="cl19-gb" data-cl19="gband" data-clv="band" data-gkey={g.key ?? g.label}
      data-letter={isLetter && /^[A-Z#]$/.test(g.label) ? g.label : undefined}>
      {isLetter ? null : <ContactGroupMark groupKey={groupKey} gkey={g.key ?? g.label} label={g.label} size={22} />}
      <b className="cl19-gbl" data-cl19="gband-label">{g.label}</b>
      <em className="cl19-gbn" data-cl19="gband-count" data-cl13="gcount">{n} {n === 1 ? "agent" : "agents"}</em>
    </div>
  );
};

export interface ContactSortControl { key: SortKey; reversed: boolean; onSort: (k: SortKey) => void; onReverse: () => void }

export const ContactRows: React.FC<ContactRowsProps & {
  byLetter?: boolean; ungrouped?: boolean;
  /** v19 §E — the page's grouping. Given, every grouping draws the strong band (ContactGroupBand) over its own section;
   *  absent (the exhibit), the older dividers and powder bands stay as they were. */
  groupKey?: GroupKey;
  sort?: ContactSortControl; focusId?: string | null; highlight?: string; compact?: boolean;
  /** v17 §D — "+ Log a query" on a row */
  onLog?: (agentId: string) => void;
  /** v18 §D — a peek's "+ Add" pill: Edit profile on that field */
  onEdit?: (agentId: string, tab: AgentCardTab, focus?: AgentCardField) => void;
  /** v19 §H — THE ARRIVAL: a new `key` (the list's load, and every grouping, sort, filter, search, clearing and pin) plays
   *  the one arrival once the list is fully built, before it is painted; `before` runs first (the page puts back a
   *  remembered scroll there, so the rows that animate are the rows on screen). Absent (the loading cover, the exhibit),
   *  nothing arrives. */
  arrival?: { key: string; before?: () => void };
}> = ({
  groups, totals = null, byId, nowMs, genreHit, openId, hideYourMove = false, newId = null, onOpen,
  byLetter = true, ungrouped = false, groupKey, sort, focusId = null, highlight = "", compact = false, onLog, onEdit, arrival,
}) => {
  /* v18 §D — one peek at a time */
  const [peekId, setPeekId] = useState<string | null>(null);
  /* v18.3.3 §D — AN OPEN ROW ALWAYS CLOSES. A row the pointer opened stays open only while the pointer is over it; one
     the keyboard opened, only while focus is inside it. Events alone cannot promise that (a scroll moves the row out
     from under a still pointer and sends no mouseleave), so the list RE-CHECKS: it keeps the last pointer position and,
     on every scroll, resize and pointer move, asks the document what is under it. */
  const listRef = useRef<HTMLDivElement>(null);
  const peekRef = useRef<{ id: string; via: PeekVia } | null>(null);
  const ptr = useRef<{ x: number; y: number } | null>(null);
  /* v19 §H — HOVER IS HELD AFTER A CHANGE UNTIL THE POINTER MOVES. `held` is set by the arrival with the pointer's
     position then (null when the list has never seen it: the first move only records where it is); a move of more than
     2px from there lets go. While held the list wears `data-hover-hold` (no hover wash) and no dwell opens a row. */
  const held = useRef(false);
  const heldAt = useRef<{ x: number; y: number } | null>(null);
  const dwellers = useRef(new Map<string, () => void>());
  const releaseHold = () => {
    held.current = false; heldAt.current = null; listRef.current?.removeAttribute("data-hover-hold");
    const under = rowUnderPointer();
    if (under) dwellers.current.get(under)?.();
  };
  const rowUnderPointer = (): string | null | undefined => {
    const p = ptr.current;
    if (!p) return undefined; // no pointer known: nothing to judge by
    const el = document.elementFromPoint(p.x, p.y)?.closest<HTMLElement>('[data-clv="row"]');
    return el && listRef.current?.contains(el) ? el.dataset.agentCard ?? null : null;
  };
  const setPeek = (next: { id: string; via: PeekVia } | null) => { peekRef.current = next; setPeekId(next?.id ?? null); };
  const onPeekFor = (id: string) => (open: boolean, via: PeekVia) => {
    const cur = peekRef.current;
    if (open) {
      /* a dwell's open lands only if the pointer is still on that row — a scroll, a leave or a blur since the timer
         was set means it is not the intended row any more */
      if (via === "pointer") {
        /* v19 §H — after a change, a row under a still pointer does not open: hover waits for the pointer to move */
        if (held.current) return;
        const under = rowUnderPointer(); if (under !== undefined && under !== id) return;
      }
      setPeek({ id, via });
      return;
    }
    if (!cur || cur.id !== id) return;
    /* the pointer leaving does not close a row the keyboard opened, nor focus leaving one the pointer opened */
    if ((via === "pointer" && cur.via === "key") || (via === "focus" && cur.via === "pointer")) return;
    setPeek(null);
  };
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const cur = peekRef.current;
      if (!cur || cur.via !== "pointer") return;
      if (rowUnderPointer() !== cur.id) setPeek(null);
    };
    const soon = () => { if (!raf) raf = requestAnimationFrame(check); };
    const move = (e: PointerEvent) => {
      ptr.current = { x: e.clientX, y: e.clientY };
      if (held.current) {
        const at = heldAt.current;
        if (!at || at.x < 0) heldAt.current = { x: e.clientX, y: e.clientY };
        else if (Math.abs(e.clientX - at.x) > 2 || Math.abs(e.clientY - at.y) > 2) releaseHold();
      }
      soon();
    };
    const gone = () => { ptr.current = { x: -1, y: -1 }; if (peekRef.current?.via === "pointer") setPeek(null); };
    const out = (e: PointerEvent | MouseEvent) => { if (!e.relatedTarget) gone(); };
    const blur = () => { if (peekRef.current) setPeek(null); };
    window.addEventListener("pointermove", move, { capture: true, passive: true });
    window.addEventListener("scroll", soon, { capture: true, passive: true });
    window.addEventListener("resize", soon, { passive: true });
    window.addEventListener("blur", blur);
    document.addEventListener("pointerout", out);
    document.documentElement.addEventListener("mouseleave", gone);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move, { capture: true });
      window.removeEventListener("scroll", soon, { capture: true });
      window.removeEventListener("resize", soon);
      window.removeEventListener("blur", blur);
      document.removeEventListener("pointerout", out);
      document.documentElement.removeEventListener("mouseleave", gone);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const col = (label: string, k: SortKey | null, align?: "end"): ListColumn => ({
    label, align,
    sort: k && sort ? {
      on: sort.key === k, reversed: sort.key === k && sort.reversed, ariaSort: true, idleMark: true,
      onPress: () => (sort.key === k ? sort.onReverse() : sort.onSort(k)),
    } : undefined,
  });
  /* v19 §C, v19.1 §D — the columns' widths: Agent by its own rule (230–330), the rest each as wide as its longest entry
     (or heading), the spare shared between the gaps; website and email stack when they do not both fit. Measured
     before paint and on every resize; the decision is the lib's. */
  const [fit, setFit] = useState<ContactColumnFit>({ stacked: false, fs: CONTACT_FS, count: 6, gap: CONTACT_GAP, cols: "minmax(0, 1fr) auto auto auto auto auto" });
  const fitRef = useRef(fit);
  fitRef.current = fit;
  /** v19 §H — true while a measurement has just asked for new columns: the arrival waits for the re-render that applies
   *  them, so the list it starts from is the finished one */
  const fitBusy = useRef(false);
  const measure = () => {
    fitBusy.current = false;
    const root = listRef.current;
    const labels = root?.querySelector<HTMLElement>(".lt-labels");
    if (!root || !labels || labels.clientWidth === 0) return;
    const rows = [...root.querySelectorAll<HTMLElement>('[data-clv="row"]')];
    if (!rows.length) return;
    const cs = getComputedStyle(labels);
    const avail = labels.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const range = document.createRange();
    const textW = (el: Element | null) => { if (!el) return 0; range.selectNodeContents(el); return range.getBoundingClientRect().width; };
    const head = (name: string) => textW(labels.querySelector(`[data-lt-col="${name}"]`));
    /* the headings are one monospaced face: a missing heading's width is its length in that face's advance */
    const rep = labels.querySelector('[data-lt-col="Replies"]');
    const adv = rep ? textW(rep) / Math.max(1, (rep.textContent ?? "").length) : 7.8;
    const mono = (t: string) => t.length * adv;
    const maxOf = (sel: string, w: (e: HTMLElement) => number) => rows.reduce((m, r) => Math.max(m, ...[...r.querySelectorAll<HTMLElement>(sel)].map(w), 0), 0);
    const fsNow = fitRef.current.fs;
    const norm = (e: HTMLElement) => e.getBoundingClientRect().width * (CONTACT_FS / fsNow);
    const raw = (e: HTMLElement) => e.getBoundingClientRect().width;
    /* the text after the icon: the box less the icon and its gap (measured), normalised to 15px */
    const text = (e: HTMLElement) => {
      const b = e.getBoundingClientRect(), ic = e.querySelector(".cl19-ci")?.getBoundingClientRect();
      return (b.right - (ic ? ic.right + 6 : b.left)) * (CONTACT_FS / fsNow);
    };
    const who = maxOf(".clv-rwho", (e) => {
      const disc = e.querySelector<HTMLElement>(".clv-ini")?.getBoundingClientRect().width ?? 40;
      /* the agency · location line ellipsises when its column is narrow, so its range would read the clipped width:
         its scrollWidth is the whole line */
      const agy = e.querySelector<HTMLElement>(".clv-ragy");
      return disc + 11 + Math.max(textW(e.querySelector(".clv-rwn b")), agy ? Math.max(textW(agy), agy.scrollWidth) : 0);
    });
    const next = fitContactColumns({
      avail, gap: CONTACT_GAP, agent: who, agentHead: head("Agent"),
      date: maxOf('.cl19-cd [data-cl19="date"]', norm), dateHead: head("Date added"),
      /* v19.1 §B — a value's TEXT at 15px (the lib adds its icon, which does not scale); v19.1 §A — a missing one's
         "+ Add" link, at its fixed 14px */
      web: maxOf('[data-cl19="website"]', text), webHead: mono("Website"), webAdd: maxOf('[data-cl19="add-website"]', raw),
      email: maxOf('[data-cl19="email"]', text), emailHead: mono("Email"), emailAdd: maxOf('[data-cl19="add-email"]', raw),
      bothHead: mono("Website and email"),
      replies: Math.max(maxOf(".clv-rrep > *", (e) => e.getBoundingClientRect().width), head("Replies")),
      status: Math.max(maxOf(".clv-rq > *", (e) => e.getBoundingClientRect().width), head("Query status")),
    });
    const cur = fitRef.current;
    if (next.cols !== cur.cols || next.stacked !== cur.stacked || next.fs !== cur.fs || next.gap !== cur.gap) { fitBusy.current = true; setFit(next); }
  };
  useLayoutEffect(measure);
  /* ── v19 §H — THE ARRIVAL. Every list change (load, grouping, sort, filter, search, clearing, pinning) lands the same
     way: the list is FULLY BUILT before its first paint (the columns are fitted in the layout pass above, and this waits
     for the re-render that applies them — nothing is decorated a frame later), then the rows ON SCREEN arrive top-down,
     each from translateY(−8px) and opacity 0 to rest over 300ms on cubic-bezier(.2,.8,.2,1), 24ms apart, the stagger
     capped at the 18th row; the group bands fade only, over 220ms (a transform on a sticky element flickers). Rows off
     screen do not animate. A row still arriving from the change before keeps its animation rather than starting again
     (typing in Find would otherwise blink the list on every key). `fill: backwards` only, so once the arrival ends
     nothing holds a style and nothing moves. Reduced motion: no animation; the list appears in place. Web Animations,
     so no keyframe reads a custom property. ── */
  const arriving = useRef(new WeakMap<Element, Animation>());
  const arrivedKey = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!arrival || fitBusy.current || arrivedKey.current === arrival.key) return;
    arrivedKey.current = arrival.key;
    arrival.before?.();
    const root = listRef.current;
    if (!root) return;
    /* every row closed, and hover held until the pointer moves */
    if (peekRef.current) setPeek(null);
    held.current = true;
    heldAt.current = ptr.current ? { ...ptr.current } : null;
    root.setAttribute("data-hover-hold", "");
    if (typeof root.animate !== "function" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const sc = root.closest<HTMLElement>(".wpg-scroll");
    const view = sc ? sc.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    let i = 0;
    for (const el of root.querySelectorAll<HTMLElement>('[data-clv="row"], [data-clv="band"]')) {
      const b = el.getBoundingClientRect();
      if (b.height === 0 || b.bottom <= view.top) continue;
      if (b.top >= view.bottom) break;
      const band = el.dataset.clv === "band";
      const delay = Math.min(i, 17) * 24;
      i += 1;
      const was = arriving.current.get(el);
      if (was && was.playState === "running") continue;
      arriving.current.set(el, band
        ? el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay, easing: "ease", fill: "backwards" })
        : el.animate([{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "none" }],
          { duration: 300, delay, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
    }
  });
  useEffect(() => {
    const root = listRef.current;
    if (!root || typeof ResizeObserver === "undefined") return undefined;
    let raf = 0;
    const ro = new ResizeObserver(() => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; measure(); }); });
    ro.observe(root);
    void document.fonts?.ready.then(() => measure());
    return () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const columns = [
    col("Agent", "surname"), col("Date added", "added"),
    ...(fit.stacked ? [col("Website and email", null)] : [col("Website", null), col("Email", null)]),
    col("Replies", "reply"), col("Query status", "status", "end"),
  ];
  const countOf = (g: ContactGroup) => (totals ? `${g.ids.length} of ${totals.get(g.label) ?? g.ids.length}` : `${g.ids.length} ${g.ids.length === 1 ? "agent" : "agents"}`);
  /* v19 §C — the v17 margin letters are retired (the mock draws none; the toolbar's A to Z row does their job) */
  const rowsOf = (g: ContactGroup) => g.ids.map((id) => {
    const x = byId.get(id);
    if (!x) return null;
    return (
      <Row
        key={id} x={x} nowMs={nowMs} genreHit={genreHit} current={openId === id} fresh={newId === id} hideYourMove={hideYourMove}
        focused={focusId === id} highlight={highlight}
        onOpen={(from) => onOpen(id, from)}
        onLog={onLog ? () => onLog(id) : undefined}
        peek={peekId === id} onPeek={onEdit ? onPeekFor(id) : undefined}
        onEdit={onEdit ? (tab, focus) => onEdit(id, tab, focus) : undefined}
        stacked={fit.stacked} dwellers={dwellers.current}
      />
    );
  });
  return (
    <div ref={listRef} className={`clv-list${compact ? " clv-list--compact" : ""}`} data-clv="list" data-density={compact ? "compact" : "comfortable"}
      data-cl19-stacked={fit.stacked ? "" : undefined} style={{ "--cl19-fs": `${fit.fs}px`, "--cl19-gap": `${fit.gap}px` } as React.CSSProperties}>
      {ungrouped ? (
        /* v16 §C — no grouping: ONE panel, the labels and then every row, no dividers */
        <ListPanel cols={fit.cols} columns={columns} data-clv="panel">
          {groups.map((g) => <React.Fragment key={g.key}>{rowsOf(g)}</React.Fragment>)}
        </ListPanel>
      ) : groupKey ? (
        /* v19 §E — every grouping (Letter included): ONE panel, ONE headings row at the top (it sticks), each group a
           section opening on its strong band, which sticks under the headings until its section leaves. The count is
           the rows showing. No other divider is drawn. */
        <ListPanel cols={fit.cols} columns={columns} data-clv="panel">
          {groups.map((g) => (
            <section className="clv-grp cl19-grp-s" key={g.key ?? g.label} data-clv="grp" data-cl19="group-section" data-gkey={g.key ?? g.label}>
              <ContactGroupBand groupKey={groupKey} g={g} />
              {rowsOf(g)}
            </section>
          ))}
        </ListPanel>
      ) : byLetter ? (
        /* Letter: ONE panel — the labels, then each letter's divider and its rows as siblings */
        <ListPanel cols={fit.cols} columns={columns} data-clv="panel">
          {groups.map((g) => (
            <React.Fragment key={g.label}>
              <ListDivider letter={g.label} count={countOf(g)} data-clv="band" data-letter={/^[A-Z#]$/.test(g.label) ? g.label : undefined} />
              {rowsOf(g)}
            </React.Fragment>
          ))}
        </ListPanel>
      ) : (
        /* any other grouping — v18.3 §E: ONE panel, ONE headings row at the top (it sticks), each group only its own
           band over its rows. Clicking a heading sorts within every group, as before. */
        <ListPanel cols={fit.cols} columns={columns} data-clv="panel">
          {groups.map((g) => (
            <section className="clv-grp" key={g.label} data-clv="grp">
              <ListGroupHeader tone="powder" title={g.label} count={countOf(g)} data-clv="band" />
              {rowsOf(g)}
            </section>
          ))}
        </ListPanel>
      )}
    </div>
  );
};
