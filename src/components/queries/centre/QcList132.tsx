/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "YOUR QUERIES" — THE LIST (Query Centre v132 §3; ref design-refs/query-centre/query-centre-v132.html
 * `#ws .body`). One sticky label row for the whole panel, court-coloured group bands that fold, flat
 * rows, a "What you sent" cell of a 112px package slot and four material tiles, and styled popups in
 * place of native titles.
 *
 * ⚠️ THE LABELS ARE THE SHARED `ListLabels` + `useStuckPast` (`shell/listTable`), dressed for this
 * page under `.qcw-list`; they lift only while stuck. Labels and rows read ONE grid (`--qcw-cols`).
 *
 * ⚠️ EVERY WORD A ROW SAYS COMES FROM `lib/qcRowLines` (pure, unit-tested): the stand line, the next
 * move, and the cell — whose tiles light from the package EDITION that went (§0.4).
 *
 * ⚠️ THE TRAY IS ABSOLUTE INSIDE THE NEXT-MOVE CELL and is limited to that 284px column, so it can
 * never overlap the "What you sent" cell (W8). Its contents are unchanged: the action · Edit · Close,
 * and a closed row gets Edit only.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StatusDot } from "../../StatusDot";
import { Mark } from "../QueryCard";
import { ListLabels, useStuckPast, type ListColumn } from "../../shell/listTable/ListTable";
import type { SubmissionPackage } from "../../../types";
import type { ListGroup, GroupBy } from "../../../lib/qcCalView";
import type { QcRow, QcSort } from "../../../lib/qcSummary";
import type { ComingUp } from "../../../lib/qcComingUp";
import { nextLine, sentCell, standLine } from "../../../lib/qcRowLines";
import { STAGE_NAME } from "../../../lib/qcSummary";
import "./qcvList132.css";

type Tone = "you" | "quiet" | "waiting" | "closed";
const URGENCY_TONE: Record<string, Tone> = { you: "you", quiet: "quiet", waiting: "waiting", closed: "closed", rest: "waiting" };

const ICON = {
  pen: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 2.5l3 3-7.5 7.5H3v-3z" /><path d="M9 4l3 3" /></svg>,
  clock: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></svg>,
  glass: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2h8M4 14h8M5 2c0 4 6 4 6 6s-6 2-6 6M11 2c0 4-6 4-6 6s6 2 6 6" /></svg>,
  box: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><rect x="2" y="3" width="12" height="3" rx="1" /><path d="M3 6v7h10V6M6.5 9h3" /></svg>,
  pkg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M3 8l9-4 9 4-9 4z" /><path d="M3 8v8l9 4 9-4V8" /><path d="M12 12v8" /></svg>,
};
const TONE_ICON: Record<Tone, React.ReactNode> = { you: ICON.pen, quiet: ICON.clock, waiting: ICON.glass, closed: ICON.box };

/* ── the popup: one fixed element, placed 10px above its target, clamped 8px inside the window ── */
interface Tip { el: HTMLElement; title: string; line: string }
function useTip(rootRef: React.RefObject<HTMLElement | null>) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number; ax: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "");
  const show = useCallback((el: HTMLElement) => {
    const title = el.dataset.tip ?? "", line = el.dataset.tl ?? "";
    if (!title) return;
    setTip({ el, title, line });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  /* place it once its own size is known */
  useEffect(() => {
    if (!tip || !boxRef.current) { setPos(null); return; }
    const r = tip.el.getBoundingClientRect(), b = boxRef.current;
    const w = b.offsetWidth, h = b.offsetHeight;
    const x = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    setPos({ x, y: Math.max(8, r.top - h - 10), ax: r.left + r.width / 2 - x });
  }, [tip]);
  /* tied to the target for assistive technology while it shows */
  useEffect(() => {
    if (!tip) return undefined;
    tip.el.setAttribute("aria-describedby", id);
    return () => tip.el.removeAttribute("aria-describedby");
  }, [tip, id]);
  /* hides on scroll (any scroller) and on Escape */
  useEffect(() => {
    if (!tip) return undefined;
    const off = () => setTip(null);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setTip(null); };
    window.addEventListener("scroll", off, true);
    window.addEventListener("keydown", key, true);
    return () => { window.removeEventListener("scroll", off, true); window.removeEventListener("keydown", key, true); };
  }, [tip]);
  const handlers = {
    onMouseOver: (e: React.MouseEvent) => { const el = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]"); if (el && rootRef.current?.contains(el)) show(el); else if (tip) hide(); },
    onMouseLeave: hide,
    onFocus: (e: React.FocusEvent) => { const el = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]"); if (el) show(el); },
    onBlur: hide,
  };
  /* ⚠️ PORTALLED: `.qcv-page` is a size container (layout containment), which would make it the
     containing block for a fixed popup inside it. */
  const node = tip && typeof document !== "undefined" ? createPortal((
    <div ref={boxRef} id={id} role="tooltip" className={`qcw-tip${pos ? " on" : ""}`} data-qcv="tip"
      style={{ left: pos?.x ?? -9999, top: pos?.y ?? -9999, ["--ax" as string]: `${pos?.ax ?? 0}px` }}>
      <b>{tip.title}</b><span>{tip.line}</span>
    </div>
  ), document.body) : null;
  return { handlers, node };
}

/* ── the "What you sent" cell ── */
const SentCell132: React.FC<{ row: QcRow; pkg: SubmissionPackage | null; nowMs: number; onAdd: () => void; onPackage: () => void }> = ({ row, pkg, nowMs, onAdd, onPackage }) => {
  const m = sentCell(row, pkg, nowMs);
  return (
    <div className="qcw-mats" data-qcv="sent" data-slot={m.slot.kind} data-known={m.known ? "true" : "false"}>
      {m.slot.kind === "package" ? (
        <button type="button" className="qcw-pkg qcw-pkg--on" data-qcv="row-pkg" data-tip={m.slot.title} data-tl={m.slot.line}
          onClick={(e) => { e.stopPropagation(); onPackage(); }}>
          {ICON.pkg}<span>{m.slot.name}</span>
        </button>
      ) : m.slot.kind === "add" ? (
        <button type="button" className="qcw-pkg qcw-pkg--add" data-qcv="row-add" data-tip={m.slot.title} data-tl={m.slot.line}
          onClick={(e) => { e.stopPropagation(); onAdd(); }}>
          <span>+ Add</span>
        </button>
      ) : (
        <span className="qcw-pkg qcw-pkg--none" data-qcv="row-pkg-none" aria-hidden="true" />
      )}
      <i className="qcw-sep" aria-hidden="true" />
      {m.tiles.map((t) => (
        <span key={t.kind} className={`qcw-tile${t.state === "sent" ? " on" : ""}`} data-qcv="sent-tile" data-kind={t.kind} data-state={t.state}
          tabIndex={0} role="img" aria-label={`${t.name}: ${t.line}`} data-tip={t.name} data-tl={t.line}>
          <Mark kind={t.kind} />
        </span>
      ))}
    </div>
  );
};

export const QcList132: React.FC<{
  groups: ListGroup[];
  groupBy: GroupBy;
  selectedId: string | null;
  onOpen: (id: string) => void;
  nowMs: number;
  coming?: ReadonlyMap<string, ComingUp>;
  packageOf?: (id: string) => SubmissionPackage | null;
  onAct?: (id: string, bucket: ComingUp["bucket"]) => void;
  onEdit?: (id: string) => void;
  onClose?: (id: string) => void;
  onAddSent?: (id: string) => void;
  onOpenPackage?: (packageId: string | null) => void;
  sort: QcSort;
  onSort?: (s: QcSort) => void;
  density?: "comfortable" | "compact";
}> = ({ groups, groupBy, selectedId, onOpen, nowMs, coming, packageOf, onAct, onEdit, onClose, onAddSent, onOpenPackage, sort, onSort, density = "comfortable" }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const stuck = useStuckPast(boxRef, labelsRef, 0);
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());
  const tip = useTip(boxRef);
  const rows = groups.flatMap((g) => g.rows);

  const col = (label: string, key: QcSort | null, align?: "end"): ListColumn => ({
    label, align,
    ...(key && onSort ? { sort: { on: sort === key, reversed: false, onPress: () => onSort(key) } } : {}),
  });
  const columns: ListColumn[] = [col("Agent", "agent"), col("Where it stands", "activity"), col("What you sent", null), col("Next move", "reply", "end")];

  const toneOf = (g: ListGroup): Tone => (groupBy === "attention" || groupBy === "none" ? URGENCY_TONE[g.key] ?? "waiting" : "waiting");
  const artOf = (g: ListGroup, tone: Tone): React.ReactNode => {
    if (groupBy === "status") { const s = g.rows[0]?.status; return s ? <StatusDot status={s} overrideSize={16} /> : ICON.glass; }
    if (groupBy === "package") return ICON.box;
    if (groupBy === "attention" || groupBy === "none") return TONE_ICON[tone];
    return ICON.pen;
  };

  const renderRow = (r: QcRow) => {
    const on = r.id === selectedId;
    const next = coming?.get(r.id) ?? null;
    const nx = nextLine(r, next, nowMs);
    const closed = r.court === "closed";
    const pkgId = r.query.sentPackageId || r.query.packageId || null;
    const pkg = pkgId ? packageOf?.(pkgId) ?? null : null;
    return (
      <div key={r.id} id={`query-row-${r.id}`} className={`qcw-row${closed ? " qcw-row--closed" : ""}`}
        data-qcv="row" data-id={r.id} data-qid={r.id} data-last={r.lastMs} data-status={r.status} data-you={r.withYou ? "true" : "false"} data-name={r.agentName}
        role="option" aria-selected={on} tabIndex={on || (!selectedId && r === rows[0]) ? 0 : -1}
        onClick={() => onOpen(r.id)}
        onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen(r.id); } }}>
        <div className="qcw-ag" data-qcv="row-agent">
          <span className={`qcw-disc${closed ? " qcw-disc--closed" : ""}`} data-qcv="row-chip" aria-hidden="true">{r.initials}</span>
          <span className="qcw-agt">
            <b data-qcv="row-name">{r.agentName}</b>
            <small data-qcv="row-agency">{r.agency}</small>
          </span>
        </div>
        <div className="qcw-st" data-qcv="row-stand">
          <div className="qcw-ws1"><StatusDot status={r.status} overrideSize={14} /><span>{STAGE_NAME[r.status]}</span>{r.withYou && <em className="qcw-ym" data-qcv="your-move-tag">YOUR MOVE</em>}</div>
          <div className="qcw-sub" data-qcv="row-standline">{standLine(r, nowMs)}</div>
        </div>
        <div className="qcw-snt" data-qcv="row-sent">
          <SentCell132 row={r} pkg={pkg} nowMs={nowMs}
            onAdd={() => (onAddSent ?? onEdit)?.(r.id)}
            onPackage={() => onOpenPackage?.(pkgId)} />
        </div>
        <div className="qcw-nx" data-qcv="row-next">
          <div className="qcw-nxt" data-qcv="row-verb">{nx.phrase}</div>
          <div className={`qcw-sub${nx.hot ? " hot" : ""}`} data-qcv="row-nextline" data-hot={nx.hot || undefined}>{nx.line}</div>
          <span className="qcw-tray" data-qcv="row-tray">
            {next && !closed && (
              <button type="button" className="qcw-pillbtn" data-qcv="row-act"
                onClick={(e) => { e.stopPropagation(); onAct?.(r.id, next.bucket); }}>{next.action}</button>
            )}
            <button type="button" className="qcw-ghost" data-qcv="row-edit"
              onClick={(e) => { e.stopPropagation(); onEdit?.(r.id); }} aria-label={`Edit the query to ${r.agentName}`}>Edit</button>
            {!closed && (
              <button type="button" className="qcw-ghost" data-qcv="row-close"
                onClick={(e) => { e.stopPropagation(); onClose?.(r.id); }} aria-label={`Close the query to ${r.agentName}`}>Close</button>
            )}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="qcv-list qcw-list" data-qcv="list" data-v="132" data-density={density} ref={boxRef} {...tip.handlers}>
      <ListLabels columns={columns} stuck={stuck} labelsRef={labelsRef} />
      {groups.map((g) => {
        const tone = toneOf(g);
        const shut = folded.has(g.key);
        const label = g.label || "All queries";
        return (
          <div key={g.key} className={`qcw-grp${shut ? " shut" : ""}`} data-qcv="grp" data-group={g.key}>
            <button type="button" className={`qcw-band qcw-band--${tone}`} data-qcv="gband" data-group={g.key} data-tone={tone}
              aria-expanded={!shut} onClick={() => setFolded((f) => { const n = new Set(f); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })}>
              <span className="qcw-gart" aria-hidden="true">{artOf(g, tone)}</span>
              <b className="qcw-gt" data-qcv="gband-t">{label}</b>
              <span className="qcw-gn" data-qcv="gband-n">{g.rows.length} {g.rows.length === 1 ? "query" : "queries"}</span>
              {g.hint && <span className="qcw-gh" data-qcv="gband-h">{g.hint}</span>}
              <span className="qcw-chev" aria-hidden="true">▾</span>
            </button>
            {!shut && (
              <div role="listbox" aria-label={`${label}: ${g.rows.length} ${g.rows.length === 1 ? "query" : "queries"}`} className="qcw-rows">
                {g.rows.map(renderRow)}
              </div>
            )}
          </div>
        );
      })}
      {tip.node}
    </div>
  );
};

/** The list while loading: the labels, one band and five comfortable rows, in the real classes. */
export const QcList132Skeleton: React.FC = () => (
  <div className="qcv-list qcw-list" data-qcv="list" data-v="132" data-sk="true" aria-hidden="true">
    <ListLabels columns={[{ label: "Agent" }, { label: "Where it stands" }, { label: "What you sent" }, { label: "Next move", align: "end" }]} stuck={false} />
    <div className="qcw-grp">
      <div className="qcw-band qcw-band--waiting" data-qcv="sk-gband">
        <span className="qcw-gart" />
        <span className="qcv-sk" style={{ width: 140, height: 16 }} />
      </div>
      <div className="qcw-rows">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="qcw-row qcw-row--sk" data-qcv="sk-row">
            <div className="qcw-ag"><span className="qcw-disc qcv-sk" /><span className="qcw-agt"><span className="qcv-sk" style={{ width: "62%", height: 16, display: "block" }} /><span className="qcv-sk" style={{ width: "44%", height: 12, display: "block", marginTop: 6 }} /></span></div>
            <div className="qcw-st"><span className="qcv-sk" style={{ width: "58%", height: 16, display: "block" }} /><span className="qcv-sk" style={{ width: "72%", height: 10, display: "block", marginTop: 8 }} /></div>
            <div className="qcw-snt"><div className="qcw-mats"><span className="qcw-pkg qcw-pkg--none" /><i className="qcw-sep" />{[0, 1, 2, 3].map((k) => <span key={k} className="qcw-tile" />)}</div></div>
            <div className="qcw-nx"><span className="qcv-sk" style={{ width: 110, height: 16, display: "block" }} /><span className="qcv-sk" style={{ width: 130, height: 10, display: "block", marginTop: 8 }} /></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
