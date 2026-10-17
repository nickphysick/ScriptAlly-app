/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactRows — the Contact list's table (v14 §5–§6; v131's grammar through shell/listTable). Letter grouping is ONE
 * panel with letter dividers; any other grouping is a powder band over each group's own panel. Every fact on a row
 * is the lib's (`agentFacts`, `rowDateLine`); a status is drawn only by `StatusDot`; missing data is the dashed slate
 * add pill, which opens the editor at that field; no colour encodes time pressure, and no row carries a coloured edge.
 *
 * ⚠️ THE PILLS DO THEIR OWN JOB AND DO NOT OPEN THE ROW: Add opens the card at the gap. There is no hover tray
 * (v18.3.3 §B): the open row's details line carries the card's one next step (a send, a nudge, Remind me…) as a link in
 * the Query status column, unless the status cell already offers it; clicking the row opens the card.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { STAGE_TRACK, discTone, stageTrack } from "../../../lib/contactStage";
import { AgentDisc, standingOf } from "../../shared/AgentDisc";
import { ListDivider, ListGroupHeader, ListPanel, type ListColumn } from "../../shell/listTable/ListTable";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { AgentFacts, ContactGroup, RowDateLine, type SortKey, rowDateLine, surnameInitial } from "../../../lib/contactList";
import { DOOR_NOT_KNOWN } from "../../../lib/agentList";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { dayMonth } from "../../../lib/dates";
import type { CardAct, CardPrimary } from "../../../lib/agentCard";
import type { AgentCardField, AgentCardTab } from "../../../lib/agentCardStore";
import { ContactPeek } from "./ContactPeek";
import { nextStep } from "../../../lib/rowActions";

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
  /** v17 §D — the surname letter this row opens, shown in the margin; null on every other row */
  letter?: string | null;
  /** v17 §D — "+ Log a query": opens the agent panel at the Log a query journey, with this agent chosen */
  onLog?: () => void;
  /** v18 §D — this row's peek is open (one row at a time: the list holds which) */
  peek?: boolean;
  /** `via` says what asked (v18.3.3 §D): the pointer's dwell or leaving, the keyboard, or focus leaving the row */
  onPeek?: (open: boolean, via: PeekVia) => void;
  /** v18 §D — a "+ Add" pill in the peek opens Edit profile on that field */
  onEdit?: (tab: AgentCardTab, focus?: AgentCardField) => void;
}> = ({ x, nowMs, genreHit, current, fresh, hideYourMove = false, focused = false, highlight = "", onOpen, onAddGenres, onAddWishlist, tray, onAct, letter = null, onLog, peek = false, onPeek, onEdit }) => {
  const track = stageTrack(x);
  const tone = discTone(x);
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
  const shut = (x.standing.kind === "none" && x.door === "closed") || x.stand === "closed";
  const weeks = typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null;
  const reopens = x.door === "closed" ? reopenDay(a.reopensOn) : null;
  const wishRef = useRef<HTMLParagraphElement>(null);
  const mq = useRef<Animation | null>(null);
  const stopMq = () => { mq.current?.cancel(); mq.current = null; };
  useEffect(() => stopMq, []);
  /* v18 §D — the peek opens after 450ms of continuous hover and closes when the pointer leaves the row. The row's main
     line height is read before it opens, so the hover tray stays on that line while the row grows. */
  const rowRef = useRef<HTMLDivElement>(null);
  const hoverT = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(hoverT.current), []);
  const openPeek = (v: boolean, via: PeekVia) => {
    const el = rowRef.current;
    if (v && el && !peek) {
      el.style.setProperty("--cl18-mh", `${el.offsetHeight}px`);
    }
    onPeek?.(v, via);
  };
  useEffect(() => { if (peek) stopMq(); }, [peek]); // eslint-disable-line react-hooks/exhaustive-deps
  /* v18.3.3 §B — the labels the Query status cell offers as actions, read from what it rendered, as the peek opens and
     before it paints, so the next step never repeats one (not even for a frame) */
  const [statusLabels, setStatusLabels] = useState<readonly string[]>([]);
  useLayoutEffect(() => {
    if (!peek || !rowRef.current) return;
    const cell = rowRef.current.querySelector<HTMLElement>(".clv-rq");
    const next = cell ? [...cell.querySelectorAll<HTMLElement>("button, a, [role='button']")].map((e) => (e.textContent ?? "").trim()).filter(Boolean) : [];
    setStatusLabels((prev) => (prev.length === next.length && prev.every((l, i) => l === next[i]) ? prev : next));
  });
  const nextLabel = nextStep(tray, statusLabels);
  /* v18.3.3 §A — once open (before paint): the details line sits 16 under the agent block. Its margin cannot change the
     main track (the line is in row 2), so one read of where it would sit settles it. */
  useLayoutEffect(() => {
    const el = rowRef.current;
    if (!peek || !el) return;
    const line = el.querySelector<HTMLElement>(".cl1833-pk"), who = el.querySelector<HTMLElement>(".clv-rwn") ?? el.querySelector<HTMLElement>(".clv-rwho");
    if (!line || !who) return;
    const m0 = parseFloat(getComputedStyle(line).marginTop) || 0;
    const mt = Math.max(2, m0 + (who.getBoundingClientRect().bottom + 16 - line.getBoundingClientRect().top));
    el.style.setProperty("--cl1833-mt", `${Math.round(mt * 100) / 100}px`);
  }, [peek]);
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
      ref={rowRef}
      role="button"
      tabIndex={0}
      data-peek={peek ? "" : undefined}
      data-first-letter={letter ? "" : undefined}
      aria-expanded={onPeek ? peek : undefined}
      className={`clv-row${fresh ? " clv-row--new" : ""}${focused ? " kf" : ""}`}
      data-clv="row"
      /* flip.ts's own default selector — the FLIP and the save-notice scroll both find rows by it */
      data-agent-card={a.id}
      /* v16 §C: the surname's initial — what a letter tab scrolls to in the ungrouped list */
      data-initial={surnameInitial(a)}
      data-cl17-letter={letter ?? undefined}
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
        /* v18.3.3 §B/§C — the contact details and the next step answer their own clicks; empty space still opens the card */
        if ((e.target as HTMLElement).closest('[data-cl183="peek-pill"], [data-cl1833="next"]')) return;
        window.clearTimeout(hoverT.current); if (peek) onPeek?.(false, "click"); onOpen(e.currentTarget.getBoundingClientRect());
      }}
      onMouseEnter={() => {
        stopMq(); if (!peek) mq.current = startMarquee(wishRef.current);
        window.clearTimeout(hoverT.current); if (onPeek) hoverT.current = window.setTimeout(() => openPeek(true, "pointer"), 450);
      }}
      onMouseLeave={() => { stopMq(); window.clearTimeout(hoverT.current); if (peek) openPeek(false, "pointer"); }}
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
      {/* v17 §D — the surname letter, in the margin of the first row of each letter (the ungrouped A to Z list) */}
      {letter ? <span className="cl17-ml" data-cl17="margin-letter" aria-hidden="true">{letter}</span> : null}
      <span className="clv-rwho">
        <AgentDisc initials={agentInitials(a)} standing={standingOf(tone)} className="clv-ini" attrs={{ "data-cl17": "disc" }} />
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
        {x.door === "unknown"
          ? <small data-clv="door-unknown" title="Whether they are open to queries is not known">{DOOR_NOT_KNOWN}</small>
          : <small>{x.door === "open" ? "Open to queries" : reopens ? `Closed till ${reopens}` : "Closed to queries"}</small>}
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
      {/* v18.3.2 A — NOTHING IN THE ROW HIDES ON HOVER: the hover tray over the Query status cell is gone. A row with its
          peek closed shows no actions; they live on the peek's line (B). */}
      {peek ? (
        <ContactPeek agent={a} onEdit={(tab, focus) => onEdit?.(tab, focus)}
          next={nextLabel ? (
            /* v18.3.3 §B — the next step: the status's own primary action as a link, styled as the status cell's
               "+ Log a query" (it IS that class), running the handler the tray's button ran */
            <button type="button" className="cl17-log cl1833-next" data-cl1833="next"
              onClick={(e) => { e.stopPropagation(); onAct(tray.act); }} onKeyDown={(e) => e.stopPropagation()}>{nextLabel}</button>
          ) : null} />
      ) : null}
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

export interface ContactSortControl { key: SortKey; reversed: boolean; onSort: (k: SortKey) => void; onReverse: () => void }

export const ContactRows: React.FC<ContactRowsProps & {
  byLetter?: boolean; ungrouped?: boolean; sort?: ContactSortControl; focusId?: string | null; highlight?: string; compact?: boolean;
  /** v17 §D — "+ Log a query" on a row */
  onLog?: (agentId: string) => void;
  /** v18 §D — a peek's "+ Add" pill: Edit profile on that field */
  onEdit?: (agentId: string, tab: AgentCardTab, focus?: AgentCardField) => void;
}> = ({
  groups, totals = null, byId, nowMs, genreHit, openId, hideYourMove = false, newId = null, onOpen, onAddGenres, onAddWishlist, trayFor, onAct,
  byLetter = true, ungrouped = false, sort, focusId = null, highlight = "", compact = false, onLog, onEdit,
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
      if (via === "pointer") { const under = rowUnderPointer(); if (under !== undefined && under !== id) return; }
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
    const move = (e: PointerEvent) => { ptr.current = { x: e.clientX, y: e.clientY }; soon(); };
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
      on: sort.key === k, reversed: sort.key === k && sort.reversed, ariaSort: true,
      onPress: () => (sort.key === k ? sort.onReverse() : sort.onSort(k)),
    } : undefined,
  });
  const columns = [col("Agent", "surname"), col("What they want", null), col("Replies", "reply"), col("Query status", "status", "end")];
  const countOf = (g: ContactGroup) => (totals ? `${g.ids.length} of ${totals.get(g.label) ?? g.ids.length}` : `${g.ids.length} ${g.ids.length === 1 ? "agent" : "agents"}`);
  /* v17 §D — the margin letters: in the UNGROUPED list in surname order, the first row of each letter carries it.
     Grouped by letter the dividers do that job; in any other order the letters would be scattered. */
  const margin = ungrouped && (!sort || sort.key === "surname");
  let lastLetter: string | null = null;
  const rowsOf = (g: ContactGroup) => g.ids.map((id) => {
    const x = byId.get(id);
    if (!x) return null;
    const initial = surnameInitial(x.agent);
    const letter = margin && initial !== lastLetter ? initial : null;
    lastLetter = initial;
    return (
      <Row
        key={id} x={x} nowMs={nowMs} genreHit={genreHit} current={openId === id} fresh={newId === id} hideYourMove={hideYourMove}
        focused={focusId === id} highlight={highlight}
        onOpen={(from) => onOpen(id, from)} tray={trayFor(x)} onAct={(act) => onAct(id, act)}
        onAddGenres={() => onAddGenres(id)} onAddWishlist={() => onAddWishlist(id)}
        letter={letter} onLog={onLog ? () => onLog(id) : undefined}
        peek={peekId === id} onPeek={onEdit ? onPeekFor(id) : undefined}
        onEdit={onEdit ? (tab, focus) => onEdit(id, tab, focus) : undefined}
      />
    );
  });
  return (
    <div ref={listRef} className={`clv-list${compact ? " clv-list--compact" : ""}${margin ? " cl17-margin" : ""}`} data-clv="list" data-cl17-margin={margin ? "" : undefined} data-density={compact ? "compact" : "comfortable"}>
      {ungrouped ? (
        /* v16 §C — no grouping: ONE panel, the labels and then every row, no dividers */
        <ListPanel cols={CONTACT_COLS} columns={columns} data-clv="panel">
          {groups.map((g) => <React.Fragment key={g.key}>{rowsOf(g)}</React.Fragment>)}
        </ListPanel>
      ) : byLetter ? (
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
        /* any other grouping — v18.3 §E: ONE panel, ONE headings row at the top (it sticks), each group only its own
           band over its rows. Clicking a heading sorts within every group, as before. */
        <ListPanel cols={CONTACT_COLS} columns={columns} data-clv="panel">
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
