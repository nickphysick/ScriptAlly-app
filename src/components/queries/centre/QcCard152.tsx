/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 §2 (design-refs/query-centre-v152/, screens 04, 05, 06, 12, 14–16, 25, 26) — THE QUERY CARD'S
 * DESKTOP READING VIEW, drawn by QcQueryCard149 (the one card, Nick's ruling) when it is not on a phone: the band in
 * the query's state, the head, the book, the tabs, the TRACKING THREAD (each step a message, the waits between them),
 * the Agent and Materials tabs, Notes unchanged, and the reply box as the footer.
 *
 * ⚠️ THE CARD WRITES NOTHING. The reply box's button, the pencil and each bubble's ✎ Edit hand back to the page; the
 *    derivations are lib/qcThread152 (pure). The phone's card is QcQueryCard149's own and is not touched.
 * ⚠️ IT PORTALS WITH THE PANEL (document.body), so no page token reaches it: colours are literals and the faces are
 *    the `:root` --sp-* tokens. The tips are portalled again, to body, as fixed boxes — the panel leans, and a rotated
 *    ancestor would be the containing block of anything fixed inside it.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { STAGE_NAME, type QcRow } from "../../../lib/qcSummary";
import { STATE_BAND, STATE_HEAD, QUIET_BAND, type QueryState } from "../../../lib/queryState";
import { STATUS_FILL, statusKind } from "../../../lib/qc1512";
import {
  askChips, buildThread, dayLabel, materialsSummary, materialsTab, replyBox,
  type ReplyAct, type ThreadChip, type ThreadItem, type ThreadStepIn,
} from "../../../lib/qcThread152";
import "./qcv152card.css";
import "./qcv1522card.css";
import { band1522, footer1522, type FootAct, type FootCtx } from "../../../lib/qcFoot1522";
import { waitWords } from "../../../lib/qc1522";
import { PopCtx, useOutsideClose } from "./QcEdit152";
import { Bubble, StepGlyph, chipIcon } from "./QcBubble152";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";

export interface QcCard152Data {
  state: QueryState;
  /** the stamped reply date */
  replyMs: number | null;
  /** the offer's deadline or the send-by date */
  dueMs: number | null;
  closedMs: number | null;
  steps: ThreadStepIn[];
  agentWeeks: number | null;
  /** "no reply means no" (true), "always replies" (false), or not known */
  nrmn: boolean | null;
  /** Free accounts see no versions and no packages (the dev switch proves it) */
  free: boolean;
  queriedVia: string | null;
  asks: string[];
  sentLabels: string[];
  lastHeardMs: number | null;
  how: string | null;
  /** v152.1 §3 the footer: the quiet window (weeks) and a close's reason */
  quietWeeks?: number;
  reason?: string | null;
  nudged?: boolean;
  /** v152.2 §3.2 the footer's facts (lib/qcFoot1522) */
  foot?: Omit<FootCtx, "state" | "status" | "first" | "nowMs">;
}
export type CardTab152 = "tracking" | "agent" | "materials" | "notes";

export interface QcCard152Props {
  row: QcRow;
  nowMs: number;
  d: QcCard152Data;
  first: string | null;
  msTitle: string | null;
  bookChips: string[];
  packageName: string | null;
  wishlist: string;
  email: string;
  website: string;
  websiteHref: string | null;
  tab: CardTab152;
  onTab: (t: CardTab152) => void;
  notes: React.ReactNode;
  onClose: () => void;
  onPencil: () => void;
  onEditStep: (activityId: string | null) => void;
  onReply: (act: ReplyAct) => void;
  onAgentField: (field: "wishlist" | "email" | "website" | "method" | "reply" | "materials" | null) => void;
  onCopyEmail: () => void;
  /** §3–§4: the view the card shows — the reading card, or an editing or recording view (`editBody`) under the same
   *  band and head; any view but "read" straightens the lean (§2.1) */
  view?: "read" | "record" | "fork" | "fix" | "details";
  editBody?: React.ReactNode;
  /** Escape in an editing view: an open menu or calendar closes first, then the view steps back one level (§4.7) */
  onBack?: () => void;
  /** the step just added: its bubble slides in from its own side (§3.2) */
  freshKey?: string | null;
  /** v152.2 §3 — the composer, open at the foot in place of the footer, and the draft it shows in the thread */
  composer?: React.ReactNode;
  draft?: ThreadStepIn | null;
  /** v152.2 §2.4 — the bubble being edited in place (its activity id), and the form drawn in its place */
  editingId?: string | null;
  editNode?: React.ReactNode;
  /** v152.2 §3.1 — the undo toast */
  toast?: { msg: string; onUndo: (() => void) | null } | null;
  /** v152.2 §6.1 — the accept burst */
  burst?: number | null;
  /** v152.2 §3.2 — a footer control: its composer */
  onFoot?: (a: FootAct) => void;
  /** v152.2 §2.6 — a sending step's materials, edited in the composer (null: "+ Add something you sent", the query step) */
  onEditMats?: (activityId: string | null) => void;
}

const PEN = <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.5 2.5l3 3L6 13H3v-3z" /></svg>;
const ARW = <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" /></svg>;
const CLOCK = <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="M8 4.6V8l2.3 1.4" /></svg>;
const BOOK = <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5f5a53" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 5.5c2.8-1.3 5.8-1.3 8.5.6 2.7-1.9 5.7-1.9 8.5-.6v13c-2.8-1.3-5.8-1.3-8.5.6-2.7-1.9-5.7-1.9-8.5-.6z" /><path d="M12 6.1v13" /></svg>;
const MAIL = <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.5" /><path d="m2.5 4.5 5.5 4 5.5-4" /></svg>;
const WEB = <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" /></svg>;

/** the queries this page session has already opened: the thread builds in only the first time */
const built = new Set<string>();

/** one dark tip at a time, portalled to body (§2.4) */
function useTip() {
  const [tip, setTip] = useState<{ x: number; y: number; head: string | null; body: string } | null>(null);
  const show = (el: Element, body: string, head: string | null = null) => {
    const r = el.getBoundingClientRect();
    setTip({ x: r.left + r.width / 2, y: r.top, head, body });
  };
  const hide = () => setTip(null);
  const node = tip ? createPortal(<TipBox {...tip} />, document.body) : null;
  return { show, hide, node, on: !!tip };
}
const TipBox: React.FC<{ x: number; y: number; head: string | null; body: string }> = ({ x, y, head, body }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.max(8, Math.min(x - w / 2, window.innerWidth - w - 8));
    const top = y - h - 8 < 8 ? y + 26 : y - h - 8;
    setPos({ left, top });
  }, [x, y, head, body]);
  return (
    <div ref={ref} className="qc152-pop" role="tooltip" data-qc152="tip" style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}>
      {head ? <b>{head}</b> : null}{body}
    </div>
  );
};

/** v152.1 §2.8 — a thread with more than five steps folds its earliest into one button; the last three always show */
export const FOLD_OVER = 5;
export const FOLD_KEEP = 3;

export const QcCard152: React.FC<QcCard152Props> = (p) => {
  const { row: r, nowMs, d } = p;
  const first = p.first || "the agent";
  /* v152.2 §2.1 — every band is navy with white text, except Gone quiet and Closed */
  const bnd = band1522(d.state, d.foot?.phase ?? null, QUIET_BAND);
  const head = { fg: bnd.dark ? "#ffffff" : STATE_HEAD[d.state].fg === "#ffffff" ? "#1c130f" : STATE_HEAD[d.state].fg };
  const bandBg = bnd.bg;
  const dark = bnd.dark;
  const jOpen = !!p.composer || !!p.editingId;
  const tip = useTip();
  const view = p.view ?? "read";
  const rootRef = useRef<HTMLDivElement>(null);
  const [popOpen, setPopOpen] = useState<string | null>(null);
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => { setRootEl(rootRef.current); }, []);
  const pop = { root: rootEl, open: popOpen, setOpen: setPopOpen };
  useOutsideClose(pop);
  useEffect(() => { setPopOpen(null); }, [view, r.id]);
  /* ONE Escape handler for the editing views: the open popover first, then one level back */
  useEscapeLayer(view !== "read", () => { if (popOpen) setPopOpen(null); else p.onBack?.(); }, ESC_LEVEL.pageModal);
  const bodyRef = useRef<HTMLDivElement>(null);
  const thread: ThreadItem[] = buildThread(d.steps, { first, nowMs, state: d.state, replyMs: d.replyMs, agentWeeks: d.agentWeeks });
  const box = replyBox({ state: d.state, status: r.status, first, nowMs, dueMs: d.dueMs, replyMs: d.replyMs, closedMs: d.closedMs, steps: d.steps, quietWeeks: d.quietWeeks, reason: d.reason ?? null, nudged: d.nudged });
  const [buildId, setBuildId] = useState<string | null>(null);
  /* §2.8 the fold opens for this card only, and folds again when the card reopens */
  const [unfold, setUnfold] = useState(false);
  useEffect(() => { setUnfold(false); }, [r.id]);
  useLayoutEffect(() => { if (!built.has(r.id)) { built.add(r.id); setBuildId(r.id); } else setBuildId(null); }, [r.id]);

  /* the thread opens scrolled to the end, on every query and every return to Tracking */
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el && p.tab === "tracking") el.scrollTop = el.scrollHeight;
    else if (el) el.scrollTop = 0;
  }, [r.id, p.tab, thread.length, !!p.composer, p.draft?.status, p.draft?.kind]);
  useEffect(() => { tip.hide(); }, [r.id, p.tab]); // eslint-disable-line react-hooks/exhaustive-deps

  /* a chip's tip closes on any click elsewhere */
  useEffect(() => {
    if (!tip.on) return undefined;
    const off = (e: MouseEvent) => { if (!(e.target as Element).closest?.(".qc152-ch")) tip.hide(); };
    document.addEventListener("click", off);
    return () => document.removeEventListener("click", off);
  }, [tip.on]); // eslint-disable-line react-hooks/exhaustive-deps

  const chips = (cs: ThreadChip[], key: string) => cs.length ? (
    <span className="qc152-chs" data-qc152="chips">
      {cs.map((c, i) => (
        <button key={`${key}-${i}`} type="button" className="qc152-ch" data-qc152="chip"
          onClick={(e) => { e.stopPropagation(); tip.show(e.currentTarget, c.detail, c.label); }}
          onBlur={() => tip.hide()}>{chipIcon(c.label)}{c.label}</button>
      ))}
    </span>
  ) : null;

  /* v152.2 §3.1 — the draft: the same derivation as a real step, after its own wait line, with a dashed edge in its colour */
  const draftNode = (() => {
    if (!p.draft) return null;
    const all = buildThread([...d.steps, p.draft], { first, nowMs, state: d.state, replyMs: d.replyMs, agentWeeks: d.agentWeeks });
    const at = all.findIndex((x) => x.t === "msg" && x.key === "__draft");
    const m = all[at];
    if (!m || m.t !== "msg") return null;
    const prevMs = [...d.steps].filter((x) => x.ms != null).map((x) => x.ms!).sort((a, b) => a - b).pop() ?? null;
    const gap = prevMs != null && p.draft.ms != null ? Math.max(0, Math.round((new Date(p.draft.ms).setHours(0, 0, 0, 0) - new Date(prevMs).setHours(0, 0, 0, 0)) / 86_400_000)) : null;
    const col = m.side === "me" ? "#b9ad9e"
      : m.status === QueryStatus.PARTIAL_REQUESTED ? "#e3b8a8" : m.status === QueryStatus.FULL_REQUESTED || m.status === QueryStatus.REVISE_RESUBMIT ? "#a9bdd3"
      : m.status === QueryStatus.OFFER ? "#a9c094" : "#b9ad9e";
    return <>
      {gap != null ? <div className={`qc1522-lt ${m.side}`} data-qc1522="draft-wait">{waitWords(gap)}</div> : null}
      <Bubble side={m.side} status={m.status} kind={m.kind} title={m.title} date={m.date} dated={m.dated} tint={m.tint} grey={m.grey} initials={r.initials}
        chips={m.chips.length ? <span className="qc152-chs">{m.chips.map((c, k) => <span key={k} className="qc152-ch">{chipIcon(c.label)}{c.label}</span>)}</span> : null}
        via={m.via} quote={m.quote} follows={m.follows} nth={null} sub={m.sub} className="qc1522-draft"
        outer={{ "data-qc152": "msg", "data-qc1522": "draft", "data-side": m.side, style: { ["--dr" as string]: col } }} />
    </>;
  })();

  /* §2.8 the fold: with more than five steps, everything before the last three sits behind one button */
  const msgIdx = thread.map((it, i) => (it.t === "msg" ? i : -1)).filter((i) => i >= 0);
  const folded = !unfold && msgIdx.length > FOLD_OVER ? msgIdx.length - FOLD_KEEP : 0;
  const shown = folded ? thread.slice(msgIdx[folded]) : thread;
  const trackingPane = (
    <div className={`qc152-th${buildId === r.id ? " build" : ""}`} data-qc152="thread" data-steps={msgIdx.length}>
      {folded ? (
        <button type="button" className="qc152-coll" data-qc152="fold" onClick={() => setUnfold(true)}>{folded} earlier {folded === 1 ? "step" : "steps"} · show</button>
      ) : null}
      {shown.map((it, i) => {
        if (it.t === "wait") {
          /* v152.2 §2.2 — one italic line on the side of the next message; never a pill or a hairline */
          if (folded && i === 0) return null;
          return <div key={it.key} className={`qc1522-lt ${it.side}`} data-qc152="wait" data-qc1522="wait" data-side={it.side} data-label={it.label} title={it.tip ?? undefined}>{it.label}</div>;
        }
        if (p.editingId && it.activityId === p.editingId && p.editNode) return <React.Fragment key={it.key}>{p.editNode}</React.Fragment>;
        return (
          <Bubble key={it.key} side={it.side} status={it.status} kind={it.kind} title={it.title} date={it.date} dated={it.dated}
            tint={it.tint} grey={it.grey} initials={r.initials} chips={chips(it.chips, it.key)} via={it.via} quote={it.quote} follows={it.follows} nth={it.nth} sub={it.sub}
            className={p.freshKey && (it.activityId === p.freshKey || it.key === p.freshKey) ? "new" : undefined}
            outer={{ "data-qc152": "msg", "data-side": it.side, "data-status": it.status ?? undefined, "data-kind": it.kind ?? undefined, "data-activity": it.activityId,
              style: { animationDelay: `${i * 45}ms` } }}
            after={<button type="button" className="qc152-fx" data-qc152="edit-step" aria-label={`Edit ${it.title}`}
              onClick={() => p.onEditStep(it.activityId ?? null)}>✎ Edit</button>} />
        );
      })}
      {draftNode}
    </div>
  );

  /* §2.6 the Agent tab */
  const ask = askChips(d.asks, d.sentLabels);
  const lk = (v: string, icon: React.ReactNode, field: "email" | "website", label: string, href?: string | null) => v
    ? (href ? <a className="qc152-lk" href={href} target="_blank" rel="noreferrer" data-qc152="link">{icon}{v}</a>
      : <button type="button" className="qc152-lk" data-qc152="link" onClick={field === "email" ? p.onCopyEmail : undefined}>{icon}{v}</button>)
    : <button type="button" className="qc152-lk miss" data-qc152="add" data-k={field} onClick={() => p.onAgentField(field)}>+ {label}</button>;
  const agentPane = (
    <div className="qc152-agt" data-qc152="agent-pane">
      <div className="qc152-agq" data-qc152="agent-strip">
        <div><small>Queried</small><b>{r.sentMs != null ? dayLabel(r.sentMs, nowMs) : "Not dated"}</b><em>{d.queriedVia ?? "how not recorded"}</em></div>
        {d.free
          ? <div><small>What went</small><b>{d.sentLabels.length} {d.sentLabels.length === 1 ? "thing" : "things"}</b><em>with the query</em></div>
          : <div><small>Package</small><b>{p.packageName ?? "None"}</b><em>{d.sentLabels.length ? `${d.sentLabels.length} ${d.sentLabels.length === 1 ? "thing" : "things"} sent` : "nothing recorded"}</em></div>}
        <div><small>Last heard</small><b>{d.lastHeardMs != null ? dayLabel(d.lastHeardMs, nowMs) : "Not yet"}</b>
          <em>{d.lastHeardMs != null ? `${Math.max(0, Math.round((nowMs - d.lastHeardMs) / 86_400_000))} days ago` : r.sentMs != null ? `since ${dayLabel(r.sentMs, nowMs)}` : ""}</em></div>
      </div>
      <dl className="qc152-agf">
        <dt>Replies in</dt>
        <dd data-qc152="reply-in">{d.agentWeeks != null ? <>About <b>{d.agentWeeks} {d.agentWeeks === 1 ? "week" : "weeks"}</b></> : <button type="button" className="qc152-lk miss" data-qc152="add" data-k="reply" onClick={() => p.onAgentField("reply")}>+ Add reply time</button>}
          {d.nrmn === true ? " · no reply means no" : d.nrmn === false ? " · always replies" : ""}</dd>
        <dt>Asks for</dt>
        <dd data-qc152="asks">{d.asks.length ? <>
          <span className="qc152-askc">{ask.chips.map((c) => <i key={c.label} className={c.sent ? "ok" : "no"} data-qc152="ask" data-sent={c.sent ? "" : undefined}>{c.label}</i>)}</span>
          {ask.missing.length ? <span className="qc152-fitn" data-qc152="ask-missing">You didn’t send {ask.missing.map((x) => x.toLowerCase()).join(", ")}</span>
            : <span className="qc152-fity" data-qc152="ask-all">✓ You sent everything {first} asks for</span>}
        </> : <button type="button" className="qc152-lk miss" data-qc152="add" data-k="asks" onClick={() => p.onAgentField("materials")}>+ Add what {first} asks for</button>}</dd>
        <dt>How to submit</dt>
        <dd>{d.how ?? <button type="button" className="qc152-lk miss" data-qc152="add" data-k="method" onClick={() => p.onAgentField("method")}>+ Add how {first} takes queries</button>}</dd>
        <dt>Wishlist</dt>
        <dd>{p.wishlist ? <q data-qc152="wishlist">{p.wishlist}</q> : <button type="button" className="qc152-lk miss" data-qc152="add" data-k="wishlist" onClick={() => p.onAgentField("wishlist")}>+ Add {first}’s wishlist</button>}</dd>
        <dt>Contact</dt>
        <dd className="qc152-lks">{lk(p.email, MAIL, "email", "Email")}{lk(p.website.replace(/^https?:\/\//, "").replace(/\/$/, ""), WEB, "website", "Website", p.websiteHref)}</dd>
      </dl>
      <button type="button" className="qc152-open" data-qc152="open-agent" onClick={() => p.onAgentField(null)}>✎ Open {first}’s card</button>
    </div>
  );

  /* §2.7 the Materials tab */
  const mt = materialsTab(d.steps, { first, nowMs, dueMs: d.dueMs, writerTurn: d.state === "materials" });
  const matPane = (
    <div className="qc152-mtl" data-qc152="materials-pane">
      <p className="qc152-msum" data-qc152="mat-summary">{materialsSummary(mt.summary, first)}</p>
      <ol>
        {mt.blocks.map((b) => (
          <li key={b.key} className={b.request ? "rq" : undefined} data-qc152="mat-block" data-request={b.request ? "" : undefined}>
            <span className="qc152-mg"><StatusDot status={b.status} overrideSize={18} decorative /></span>
            <div>
              <div className="qc152-mh"><b>{b.title}{b.pkg && !d.free && p.packageName ? <> <span className="qc152-pkc" data-qc152="pkg-chip">{p.packageName}</span></> : null}</b><span>{b.date}</span></div>
              <div className="qc152-mc">{b.chips.length ? b.chips.map((c, i) => <i key={i}>{c.label}</i>) : <em>Nothing recorded</em>}</div>
              {b.note ? <p>{b.note}</p> : null}
              {b.request ? null : <button type="button" className="qc152-mfx" data-qc152="mat-edit" onClick={() => (p.onEditMats ? p.onEditMats(b.activityId ?? null) : p.onEditStep(b.activityId ?? null))}>Edit</button>}
            </div>
          </li>
        ))}
      </ol>
      {p.onEditMats ? <button type="button" className="qc1522-lk qc1522-madd" data-qc1522="add-sent" onClick={() => p.onEditMats!(null)}>+ Add something you sent</button> : null}
    </div>
  );

  return (
    <PopCtx.Provider value={pop}>
    <div ref={rootRef} className="qc149c qcv-legacy qc152" data-qc149c="card" data-qc152="card" data-mode={view === "read" ? "view" : view} data-view={view}
      data-lean={view === "read" && !jOpen ? undefined : "flat"} data-id={r.id} data-state={d.state} data-j={jOpen ? "" : undefined} data-phase={d.foot?.phase ?? undefined}>
      <div className="qc152-in">
        <div className={`qc152-band${dark ? " dk" : ""}`} data-qc152="band" style={{ background: bandBg, color: head.fg }}>
          <span data-qc152="band-word">{d.foot ? bnd.word : r.status === QueryStatus.OFFER ? "OFFER" : STATE_BAND[d.state]}</span>
          {d.state !== "closed" && r.dayN != null ? <span className="qc152-day" data-qc152="day">Day {r.dayN}</span> : <span className="qc152-day" />}
          <button type="button" className="qc152-x" data-qc152="pencil" aria-label="Edit this query" title="Edit this query" onClick={p.onPencil}>{PEN}</button>
          <button type="button" className="qc152-x" data-qc149c="close" aria-label="Close the query" title="Close" onClick={p.onClose}>✕</button>
        </div>
        <div className="qc152-agent">
          <span className="qc152-disc" aria-hidden="true">{r.initials}</span>
          <div className="qc152-who"><div className="qc152-nm qcv-open-nm" data-qc149c="name">{r.agentName}</div><div className="qc152-ag">{(r.agency || "").toUpperCase()}</div></div>
          <span className="qc152-pill" data-qc152="pill"><span className="qc152-cap" style={{ background: STATUS_FILL[statusKind(r.status)] }}><StatusDot status={r.status} overrideSize={17} decorative /></span><span>{STAGE_NAME[r.status]}</span></span>
        </div>
        {view !== "read" ? p.editBody : <>
        <div className="qc152-ms" data-qc152="book">
          <span className="qc152-bk" aria-hidden="true">{BOOK}</span>
          <div><small>QUERYING</small><b>{p.msTitle ?? "No manuscript"}</b>
            {p.bookChips.length ? <div className="qc152-bkc">{p.bookChips.map((c) => <span key={c}>{c}</span>)}</div> : null}</div>
        </div>
        <div className="qc152-tabs" role="tablist" aria-label="The query">
          {(["tracking", "agent", "materials", "notes"] as const).map((t) => (
            <button key={t} type="button" role="tab" data-qc152="tab" data-tab={t} aria-selected={p.tab === t} onClick={() => p.onTab(t)}>
              {t === "tracking" ? "Tracking" : t === "agent" ? "Agent" : t === "materials" ? "Materials" : "Notes"}
            </button>
          ))}
        </div>
        <div ref={bodyRef} className={`qc152-body${p.toast ? " qc1522-tpad" : ""}`} data-qc152="body" role="tabpanel">
          {p.tab === "tracking" ? trackingPane : p.tab === "agent" ? agentPane : p.tab === "materials" ? matPane : <div className="qc152-notes">{p.notes}</div>}
        </div>
        {p.composer ? p.composer : d.foot ? (() => {
          /* v152.2 §3.2 — the footer: two lines, the button, and the quieter link */
          const ft = footer1522({ ...d.foot, state: d.state, status: r.status, first, nowMs });
          return (
            <div className={`qc152-rb${ft.late ? " late" : ""}`} data-qc152="reply" data-qc1522="footer" data-act={ft.button?.act ?? "none"} data-icon={ft.icon.k}>
              <div className="qc152-rf" data-qc152="reply-field">
                {ft.icon.k === "clock" ? <span className="qc152-fc" data-qc152="foot-icon" aria-hidden="true">{CLOCK}</span>
                  : ft.icon.k === "ring" ? <span className="qc152-fr" data-qc152="foot-icon" style={{ ["--p" as string]: String(ft.icon.p) }} aria-hidden="true" />
                  : <span className={`qc152-fg${ft.icon.k === "grey" ? " grey" : ""}`} data-qc152="foot-icon" style={ft.icon.k === "stage" ? { background: ft.icon.tint } : undefined} aria-hidden="true">{StepGlyph({ status: ft.icon.status, kind: null })}</span>}
                <div className="qc152-rft"><b data-qc152="reply-lead">{ft.lead}</b><span data-qc152="reply-sub">{ft.sub}</span></div>
              </div>
              {ft.button ? <button type="button" className={`qc152-rbtn ${ft.button.tone === "navy" ? "nv" : "gh"}`} data-qc152="reply-btn" data-tone={ft.button.tone} data-act={ft.button.act} onClick={() => p.onFoot?.(ft.button!.act)}>{ft.button.label}{ft.button.tone === "navy" ? ARW : null}</button> : null}
              {ft.link ? <button type="button" className="qc1522-flink" data-qc1522="foot-link" data-act={ft.link.act} onClick={() => p.onFoot?.(ft.link!.act)}>{ft.link.label}</button> : null}
            </div>
          );
        })() : (
        <div className={`qc152-rb${box.late ? " late" : ""}`} data-qc152="reply" data-act={box.act} data-icon={box.icon.k}>
          <div className="qc152-rf" data-qc152="reply-field">
            {box.icon.k === "ring" ? <span className="qc152-fr" data-qc152="foot-icon" style={{ ["--p" as string]: String(box.icon.p) }} aria-hidden="true" />
              : box.icon.k === "clock" ? <span className="qc152-fc" data-qc152="foot-icon" aria-hidden="true">{CLOCK}</span>
              : <span className={`qc152-fg${box.icon.k === "grey" ? " grey" : ""}`} data-qc152="foot-icon" style={box.icon.k === "stage" ? { background: box.icon.tint } : undefined} aria-hidden="true">{StepGlyph({ status: box.icon.status, kind: null })}</span>}
            <div className="qc152-rft"><b data-qc152="reply-lead">{box.lead}</b><span data-qc152="reply-sub">{box.sub}</span></div>
          </div>
          {box.second ? <button type="button" className="qc152-rbtn gh sm" data-qc152="reply-second" onClick={() => p.onReply(box.second!.act)}>{box.second.label}</button> : null}
          <button type="button" className={`qc152-rbtn ${box.tone === "navy" ? "nv" : "gh"}`} data-qc152="reply-btn" data-tone={box.tone} onClick={() => p.onReply(box.act)}>{box.button}{ARW}</button>
        </div>
        )}
        </>}
        {p.toast ? <div className="qc1522-toast" role="status" data-qc1522="toast"><span>{p.toast.msg}</span>{p.toast.onUndo ? <button type="button" data-qc1522="undo" onClick={p.toast.onUndo}>Undo</button> : null}</div> : null}
        {p.burst ? <div key={p.burst} className="qc1522-burst" aria-hidden="true" data-qc1522="burst">{Array.from({ length: 46 }, (_, k) => <i key={k} style={{ left: `${(k * 37) % 100}%`, background: ["#f2ebe0", "#f3d3c6", "#d3dce7", "#cbd9be"][k % 4], animationDelay: `${(k % 7) * 0.08}s` }} />)}</div> : null}
      </div>
      {tip.node}
    </div>
    </PopCtx.Provider>
  );
};
