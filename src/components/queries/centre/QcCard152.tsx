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
import { STATE_BAND, type QueryState } from "../../../lib/queryState";
import { STAGE_COLOURS, STAGE_INK, bandBackground, quietBackground, stageOf } from "../../../lib/stageColours";
import { isQuietCard } from "../../../lib/qc154";
import {
  askChips, buildThread, dayLabel, materialGroups, replyBox, viaKind,
  type ReplyAct, type ThreadChip, type ThreadItem, type ThreadStepIn,
} from "../../../lib/qcThread152";
import "./qcv152card.css";
import "./qcv1522card.css";
import "./qcv153thread.css";
import { band1522, footer1522, type FootAct, type FootCtx } from "../../../lib/qcFoot1522";
import { waitWords } from "../../../lib/qc1522";
import { PopCtx, useOutsideClose } from "./QcEdit152";
import { Bubble, StepGlyph, chipIcon } from "./QcBubble152";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import {
  AgentEditPane, ASK_POOL, Ed, EdMenu, EditStrip, LeaveAsk, METHODS, MenuItem, NotesEditPane, SaveBar, useEditLayer,
  type CardEditData, type CardEdits,
} from "./QcCardEdit152";
import "./qcv152inplace.css";
/* Stage colours v1 — last, so the stage colours sit over every earlier layer of the card */
import "./sc1card.css";
/* Query card v158 — the Agent, Materials and Notes tab bodies */
import "./qcv158.css";
import { AgentTab158 } from "./QcAgent158";
import { MaterialsTab158 } from "./QcMaterials158";

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
  /** To-do list v53 (D8) — the To-do desk's dress, opt-in (the Query Centre passes none): the book as one row; typing dots
   *  where the new step will go; the step being checked (a soft pulsing ring and "Checking"); the step just logged
   *  (a "Logged" stamp); a send of several things as "your materials" with a paperclip */
  desk?: { bookRow?: boolean; typing?: boolean; checkKey?: string | null; stampKey?: string | null; clip?: { key: string; items: string[]; version: string | null } | null };
  /** Log a query v1.1 — editing in place: the pencil's edit mode (the agent, the agent's details, the notes) */
  editData?: CardEditData;
  onSaveEdits?: (e: CardEdits) => Promise<boolean>;
  /** Record a response v1, Phase 5 — the grid is behind the dim now, so the band carries ‹ › through the set the card was
   *  opened from (the ← → keys' set). Absent, or a set of one: no arrows. */
  stepCard?: { at: number; of: number; go: (d: 1 | -1) => void } | null;
  /** Record a response v1 — opened from an agent's card, which this card replaced: the band's way back to it */
  backTo?: { label: string; onBack: () => void } | null;
}

const PEN = <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.5 2.5l3 3L6 13H3v-3z" /></svg>;
const ARW = <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" /></svg>;
const CLOCK = <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="M8 4.6V8l2.3 1.4" /></svg>;
const CLIP = <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M10.5 4.5 5.8 9.2a1.6 1.6 0 0 0 2.3 2.3l5-5a3 3 0 0 0-4.3-4.3L3.6 7.4a4.2 4.2 0 0 0 6 6l3.4-3.4" /></svg>;
const BOOK = <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5f5a53" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 5.5c2.8-1.3 5.8-1.3 8.5.6 2.7-1.9 5.7-1.9 8.5-.6v13c-2.8-1.3-5.8-1.3-8.5.6-2.7-1.9-5.7-1.9-8.5-.6z" /><path d="M12 6.1v13" /></svg>;

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
const PREV = <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" /></svg>;
const NEXT = <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" /></svg>;

export const FOLD_OVER = 5;
export const FOLD_KEEP = 3;

export const QcCard152: React.FC<QcCard152Props> = (p) => {
  const { row: r, nowMs, d } = p;
  const first = p.first || "the agent";
  /* Stage colours v1 — the strip is the card's stage Band in ink (the sheen on an offer); gone quiet (the grid card's
     own test, lib/qc154 `isQuietCard`) fades that band to white. Its words are v152.2's. The card publishes its stage's
     four colours as --band / --tint / --edge / --mark for the pill, the footer disc and the draft outline. */
  const bnd = band1522(d.state, d.foot?.phase ?? null);
  const stage = stageOf(r.status);
  const quiet = stage !== "offer" && isQuietCard(r, nowMs);
  const bandBg = quiet ? quietBackground(stage) : bandBackground(stage);
  const sc = STAGE_COLOURS[stage];
  const stageVars = { ["--band" as string]: sc.band, ["--tint" as string]: sc.tint, ["--edge" as string]: sc.edge, ["--mark" as string]: sc.mark,
    ["--fdisc" as string]: quiet ? `linear-gradient(90deg, ${sc.band}, #fff)` : sc.band } as React.CSSProperties;
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
  /* v1.1 — the edit layer: the pencil, or a double-click on a value, enters it; Esc closes a menu, then asks */
  const ed = useEditLayer(p.editData, p.onSaveEdits, r.id);
  const inRef = useRef<HTMLDivElement>(null);
  useEscapeLayer(ed.on, () => {
    if (ed.open) ed.setOpen(null);
    else if (ed.leave) ed.keep();
    else ed.ask();
  }, ESC_LEVEL.pageModal);
  const queryStepId = d.steps.find((x) => x.status === QueryStatus.QUERIED && !x.kind)?.activityId ?? null;
  const openStep = (id: string | null) => { p.onTab("tracking"); p.onEditStep(id); };
  const edAgent = ed.on && ed.dr ? p.editData?.agents.find((a) => a.id === ed.dr!.agentId) ?? null : null;
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
    /* a draft keeps its dashed outline: the writer's in v152.2's stone, the agent's in the Mark of the stage it moves to */
    const col = m.side === "me" || !m.status ? "#b9ad9e" : STAGE_COLOURS[stageOf(m.status)].mark;
    return <>
      {gap != null ? <div className={`qc1522-lt ${m.side}`} data-qc1522="draft-wait">{waitWords(gap)}</div> : null}
      <Bubble side={m.side} status={m.status} kind={m.kind} title={m.title} date={m.date} dated={m.dated} tint={m.tint} grey={m.grey} initials={r.initials}
        chips={m.chips.length ? <span className="qc152-chs">{m.chips.map((c, k) => <span key={k} className="qc152-ch">{chipIcon(c.label)}{c.label}</span>)}</span> : null}
        via={m.via} quote={m.quote} follows={m.follows} nth={null} sub={m.sub} className="qc1522-draft" stamp={m.stamp} viaIcon={m.side === "me" ? viaKind(m.via) : null}
        outer={{ "data-qc152": "msg", "data-qc1522": "draft", "data-side": m.side, style: { ["--dr" as string]: col } }} />
    </>;
  })();

  const desk = p.desk ?? {};
  /* v158: no day pill above a day's first message (each bubble's stamp is its date) and no status line under the newest
     one (the footer says where the query stands); the wait between two messages is "N days later" at the side */
  const clipChip = (c: { items: string[]; version: string | null }) => (
    <span className="qc153-clip" data-qc153="clip" tabIndex={0}>{CLIP}{c.items.length}
      <span className="qc153-clippop" role="tooltip" data-qc153="clip-pop">{c.items.map((x) => <span key={x}>{x}</span>)}{c.version ? <span>{c.version}</span> : null}</span>
    </span>
  );
  /* §2.8 the fold: with more than five steps, everything before the last three sits behind one button */
  const msgIdx = thread.map((it, i) => (it.t === "msg" ? i : -1)).filter((i) => i >= 0);
  const folded = !unfold && msgIdx.length > FOLD_OVER ? msgIdx.length - FOLD_KEEP : 0;
  const shown = folded ? thread.slice(msgIdx[folded]) : thread;
  const trackingPane = (
    <div className={`qc152-th${buildId === r.id ? " build" : ""}`} data-qc152="thread" data-steps={msgIdx.length}>
      {ed.on ? <div className="qc152-trknote" data-qc152="track-note">Steps are edited one at a time: hover a message for ✎ Edit</div> : null}
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
        const clip = desk.clip && (it.activityId === desk.clip.key || it.key === desk.clip.key) ? desk.clip : null;
        const checking = !!desk.checkKey && (it.activityId === desk.checkKey || it.key === desk.checkKey);
        const stamped = !!desk.stampKey && (it.activityId === desk.stampKey || it.key === desk.stampKey);
        return (
          <React.Fragment key={it.key}>
            <Bubble side={it.side} status={it.status} kind={it.kind} title={clip ? `You sent ${first} your materials` : it.title} date={it.date} dated={it.dated}
              stamp={it.stamp} viaIcon={it.side === "me" ? viaKind(it.via) : null}
              tint={it.tint} grey={it.grey} initials={r.initials} chips={clip ? clipChip(clip) : chips(it.chips, it.key)} via={it.via} quote={it.quote} follows={it.follows} nth={it.nth} sub={it.sub}
              className={[p.freshKey && (it.activityId === p.freshKey || it.key === p.freshKey) ? "new" : "", checking ? "qc153-chk" : "", stamped ? "qc153-lgd" : ""].filter(Boolean).join(" ") || undefined}
              mark={checking ? <span className="qc153-chkw" data-qc153="checking">Checking</span> : stamped ? <span className="qc153-stamp" data-qc153="logged">Logged</span> : null}
              outer={{ "data-qc152": "msg", "data-side": it.side, "data-status": it.status ?? undefined, "data-kind": it.kind ?? undefined, "data-activity": it.activityId,
                style: { animationDelay: `${i * 45}ms` } }}
              after={<button type="button" className="qc152-fx" data-qc152="edit-step" aria-label={`Edit ${it.title}`}
                onClick={() => p.onEditStep(it.activityId ?? null)}>✎ Edit</button>} />
          </React.Fragment>
        );
      })}
      {draftNode}
      {desk.typing ? (
        /* v53 (D8): while the To-do's questions are open, the writer is "typing" where the new step will go */
        <div className="qc152-m me qc153-typing" data-qc153="typing"><div className="qc152-bx" data-qc152="bubble"><span className="qc153-dots" aria-label="Being logged"><i /><i /><i /></span></div></div>
      ) : null}
    </div>
  );

  /* §2.6 the Agent tab */
  const ask = askChips(d.asks, d.sentLabels);
  const agentStrip = (
      <div className="qc152-agq" data-qc152="agent-strip">
        <div><small>Queried</small><b>{r.sentMs != null ? dayLabel(r.sentMs, nowMs) : "Not dated"}</b><em>{d.queriedVia ?? "how not recorded"}</em></div>
        {d.free
          ? <div><small>What went</small><b>{d.sentLabels.length} {d.sentLabels.length === 1 ? "thing" : "things"}</b><em>with the query</em></div>
          : <div><small>Package</small><b>{p.packageName ?? "None"}</b><em>{d.sentLabels.length ? `${d.sentLabels.length} ${d.sentLabels.length === 1 ? "thing" : "things"} sent` : "nothing recorded"}</em></div>}
        <div><small>Last heard</small><b>{d.lastHeardMs != null ? dayLabel(d.lastHeardMs, nowMs) : "Not yet"}</b>
          <em>{d.lastHeardMs != null ? `${Math.max(0, Math.round((nowMs - d.lastHeardMs) / 86_400_000))} days ago` : r.sentMs != null ? `since ${dayLabel(r.sentMs, nowMs)}` : ""}</em></div>
      </div>
  );
  /* a double-click on a detail outside edit mode enters it (with that detail's menu open, where it has one) */
  const dbl = (k: "weeks" | "asks" | "method" | "wishlist" | "email" | "website") => p.editData ? {
    "data-ed-r": k,
    onDoubleClick: (e: React.MouseEvent<HTMLElement>) => { if (ed.on) return; ed.start(k === "asks" || k === "method" ? k : null, e.currentTarget); },
  } : {};
  /* v158 §3 — the Agent tab, facts first: three fact boxes, contact, what the agent asks for, the wishlist, two links.
     Every value is the agent's own record (lib/qcCardView); an unrecorded one is a link that opens the agent's card at it.
     Double-click on a box or row enters edit mode at that detail, as before. The agent is always named, never a pronoun. */
  const agentPane = ed.on && ed.dr ? (
    <AgentEditPane layer={ed} first={(edAgent?.name ?? p.first ?? "the agent").split(/\s+/)[0]} strip={agentStrip}
      onQueryStep={queryStepId ? () => openStep(queryStepId) : null} />
  ) : (
    <AgentTab158 first={first} nowMs={nowMs} weeks={d.agentWeeks} nrmn={d.nrmn} how={d.how} queriedVia={d.queriedVia}
      sentMs={r.sentMs ?? null} lastHeardMs={d.lastHeardMs} asks={ask} hasAsks={d.asks.length > 0}
      wishlist={p.wishlist} email={p.email} website={p.website} websiteHref={p.websiteHref ?? null}
      onCopyEmail={p.onCopyEmail} onField={p.onAgentField} onEdit={() => (p.editData ? ed.start() : p.onPencil())} dbl={dbl} />
  );

  /* v158 §4 — the Materials tab, by what each thing went with (lib/qcThread152 materialGroups). "Edit what went" opens
     the same step editor the per-block Edit opened, on the latest sent step. */
  const groups = materialGroups(d.steps, { nowMs });
  const lastSent = [...groups].reverse().find((g) => !g.pending && g.activityId)?.activityId ?? null;
  const matPane = (
    <MaterialsTab158 groups={groups} packageName={!d.free ? p.packageName ?? null : null}
      onAddSent={queryStepId ? () => openStep(queryStepId) : null} onEditWent={lastSent ? () => openStep(lastSent) : null} />
  );

  return (
    <PopCtx.Provider value={pop}>
    <div ref={rootRef} className="qc149c qcv-legacy qc152" data-qc149c="card" data-qc152="card" data-mode={view === "read" ? "view" : view} data-view={view}
      data-lean={view === "read" && !jOpen && !ed.on ? undefined : "flat"} data-id={r.id} data-state={d.state} data-j={jOpen ? "" : undefined} data-phase={d.foot?.phase ?? undefined} data-editing={ed.on ? "" : undefined}
      data-stage={stage} data-quiet={quiet ? "" : undefined} style={stageVars}>
      <div ref={inRef} className="qc152-in">
        {ed.on ? (
        <div className="qc152-band is-ed" data-qc152="band" data-edit="">
          <EditStrip n={ed.keys.length} onStop={() => ed.ask()} />
        </div>
        ) : (
        <div className="qc152-band" data-qc152="band" data-stage={stage} data-quiet={quiet ? "" : undefined} style={{ background: bandBg, color: STAGE_INK }}>
          {p.backTo ? <button type="button" className="qc152-bkto" data-qc152="back-to" onClick={p.backTo.onBack}>← {p.backTo.label}</button> : null}
          <span data-qc152="band-word">{d.foot ? bnd.word : r.status === QueryStatus.OFFER ? "OFFER" : STATE_BAND[d.state]}</span>
          {d.state !== "closed" && r.dayN != null ? <span className="qc152-day" data-qc152="day">Day {r.dayN}</span> : <span className="qc152-day" />}
          {p.stepCard && p.stepCard.of > 1 ? <>
            <button type="button" className="qc152-x" data-qc152="prev" aria-label="Previous query" title="Previous query" disabled={p.stepCard.at <= 0} onClick={() => p.stepCard!.go(-1)}>{PREV}</button>
            <button type="button" className="qc152-x" data-qc152="next" aria-label="Next query" title="Next query" disabled={p.stepCard.at >= p.stepCard.of - 1} onClick={() => p.stepCard!.go(1)}>{NEXT}</button>
          </> : null}
          <button type="button" className="qc152-x" data-qc152="pencil" aria-label="Edit this query" title="Edit this query"
            onClick={() => (p.editData ? ed.start() : p.onPencil())}>{PEN}</button>
          <button type="button" className="qc152-x" data-qc149c="close" aria-label="Close the query" title="Close" onClick={p.onClose}>✕</button>
        </div>
        )}
        <div className="qc152-agent">
          <span className="qc152-disc" aria-hidden="true">{r.initials}</span>
          <div className="qc152-who">{p.editData ? (
            <Ed k="agent" layer={ed} changed={ed.keys.includes("agent")} label="The agent this query is to"><span className="qc152-nm qcv-open-nm" data-qc149c="name">{edAgent?.name ?? r.agentName}</span></Ed>
          ) : <div className="qc152-nm qcv-open-nm" data-qc149c="name">{r.agentName}</div>}<div className="qc152-ag">{((edAgent ? edAgent.agency : r.agency) || "").toUpperCase()}</div></div>
          <span className="qc152-pill" data-qc152="pill" data-stage={stage}><span className="qc152-cap"><StatusDot status={r.status} overrideSize={17} tone="ink" decorative /></span><span>{STAGE_NAME[r.status]}</span></span>
        </div>
        {view !== "read" ? p.editBody : <>
        {desk.bookRow ? (
          /* v53 (D8): the To-do card's book is one row — its height goes to Tracking */
          <div className="qc153-bkrow" data-qc152="book" data-qc153="book-row"><span>Querying</span><b>{p.msTitle ?? "No manuscript"}</b></div>
        ) : (
        <div className="qc152-ms" data-qc152="book">
          <span className="qc152-bk" aria-hidden="true">{BOOK}</span>
          <div><small>QUERYING</small><b>{p.msTitle ?? "No manuscript"}</b>
            {p.bookChips.length ? <div className="qc152-bkc">{p.bookChips.map((c) => <span key={c}>{c}</span>)}</div> : null}</div>
        </div>
        )}
        <div className="qc152-tabs" role="tablist" aria-label="The query">
          {(["tracking", "agent", "materials", "notes"] as const).map((t) => (
            <button key={t} type="button" role="tab" data-qc152="tab" data-tab={t} aria-selected={p.tab === t} onClick={() => p.onTab(t)}>
              {t === "tracking" ? "Tracking" : t === "agent" ? "Agent" : t === "materials" ? "Materials" : "Notes"}
              {ed.on && ((t === "agent" && ed.keys.some((k) => k !== "agent" && k !== "notes")) || (t === "notes" && ed.keys.includes("notes")))
                ? <span className="qc152-dot" data-qc152="tab-dot" aria-label="unsaved changes" /> : null}
            </button>
          ))}
        </div>
        <div ref={bodyRef} className={`qc152-body${p.toast ? " qc1522-tpad" : ""}`} data-qc152="body" role="tabpanel">
          {p.tab === "tracking" ? trackingPane : p.tab === "agent" ? agentPane : p.tab === "materials" ? matPane : <div className="qc152-notes">{ed.on && ed.dr && p.editData ? <NotesEditPane layer={ed} data={p.editData} /> : p.notes}</div>}
        </div>
        {ed.on ? <SaveBar keys={ed.keys} nudge={ed.nudge} busy={ed.busy} onCancel={() => ed.ask()} onSave={() => void ed.save()} />
          : p.composer ? p.composer : d.foot ? (() => {
          /* v152.2 §3.2 — the footer: two lines, the button, and the quieter link */
          const ft = footer1522({ ...d.foot, state: d.state, status: r.status, first, nowMs });
          return (
            <div className={`qc152-rb${ft.late ? " late" : ""}`} data-qc152="reply" data-qc1522="footer" data-act={ft.button?.act ?? "none"} data-icon={ft.icon.k}>
              <div className="qc152-rf" data-qc152="reply-field">
                {ft.icon.k === "clock" ? <span className="qc152-fc" data-qc152="foot-icon" aria-hidden="true">{CLOCK}</span>
                  : ft.icon.k === "ring" ? <span className="qc152-fr" data-qc152="foot-icon" style={{ ["--p" as string]: String(ft.icon.p) }} aria-hidden="true" />
                  : <span className={`qc152-fg${ft.icon.k === "grey" ? " grey" : ""}`} data-qc152="foot-icon" aria-hidden="true">{StepGlyph({ status: ft.icon.status, kind: null })}</span>}
                <div className="qc152-rft"><b data-qc152="reply-lead">{ft.lead}</b><span data-qc152="reply-sub">{ft.sub}</span></div>
              </div>
              {ft.button ? <button type="button" className={`qc152-rbtn ${ft.button.tone === "navy" ? "nv" : "gh"}`} data-qc152="reply-btn" data-tone={ft.button.tone} data-act={ft.button.act} onClick={() => p.onFoot?.(ft.button!.act)}>{ft.button.label}{ft.button.tone === "navy" ? ARW : null}</button> : null}
              {ft.link ? <button type="button" className="qc1522-flink" data-qc1522="foot-link" data-act={ft.link.act} onClick={() => p.onFoot?.(ft.link!.act)}>{ft.link.label}</button> : null}
              {ft.replied ? <button type="button" className="qc1522-flink" data-qc1522="foot-replied" data-act="resp" onClick={() => p.onFoot?.("resp")}>{ft.replied.label}</button> : null}
            </div>
          );
        })() : (
        <div className={`qc152-rb${box.late ? " late" : ""}`} data-qc152="reply" data-act={box.act} data-icon={box.icon.k}>
          <div className="qc152-rf" data-qc152="reply-field">
            {box.icon.k === "ring" ? <span className="qc152-fr" data-qc152="foot-icon" style={{ ["--p" as string]: String(box.icon.p) }} aria-hidden="true" />
              : box.icon.k === "clock" ? <span className="qc152-fc" data-qc152="foot-icon" aria-hidden="true">{CLOCK}</span>
              : <span className={`qc152-fg${box.icon.k === "grey" ? " grey" : ""}`} data-qc152="foot-icon" aria-hidden="true">{StepGlyph({ status: box.icon.status, kind: null })}</span>}
            <div className="qc152-rft"><b data-qc152="reply-lead">{box.lead}</b><span data-qc152="reply-sub">{box.sub}</span></div>
          </div>
          {box.second ? <button type="button" className="qc152-rbtn gh sm" data-qc152="reply-second" onClick={() => p.onReply(box.second!.act)}>{box.second.label}</button> : null}
          <button type="button" className={`qc152-rbtn ${box.tone === "navy" ? "nv" : "gh"}`} data-qc152="reply-btn" data-tone={box.tone} onClick={() => p.onReply(box.act)}>{box.button}{ARW}</button>
        </div>
        )}
        </>}
        {ed.on && ed.leave ? <LeaveAsk n={ed.keys.length} busy={ed.busy} onLose={ed.lose} onKeep={ed.keep} onSave={() => void ed.save()} /> : null}
        {ed.on && ed.open && ed.dr && p.editData ? (
          <EdMenu root={inRef.current} anchor={ed.anchor} onClose={() => ed.setOpen(null)}>
            {ed.open === "agent" ? <>
              <div className="ph">Who’s this query to?</div>
              {p.editData.agents.map((a) => <MenuItem key={a.id} data={a.id} on={ed.dr!.agentId === a.id} label={a.name} sub={a.agency} onPick={() => { ed.setAgent(a.id); ed.setOpen(null); }} />)}
              <div className="pf">Moves this query to another agent. Their details come with them.</div>
            </> : ed.open === "asks" ? <>
              <div className="ph">What they ask for</div>
              {[...new Set([...ASK_POOL, ...ed.dr.details.asks])].map((a) => {
                const on = ed.dr!.details.asks.includes(a);
                return <MenuItem key={a} data={a} on={on} label={a} onPick={() => ed.patch({ asks: on ? ed.dr!.details.asks.filter((x) => x !== a) : [...ed.dr!.details.asks, a] })} />;
              })}
              <div className="pf">Tick as many as apply.</div>
            </> : ed.open === "method" ? <>
              <div className="ph">How they take queries</div>
              {METHODS.map((m) => <MenuItem key={m.v} data={m.v} on={ed.dr!.details.method === m.v} label={m.label} onPick={() => { ed.patch({ method: m.v }); ed.setOpen(null); }} />)}
            </> : null}
          </EdMenu>
        ) : null}
        {p.toast ? <div className="qc1522-toast" role="status" data-qc1522="toast"><span>{p.toast.msg}</span>{p.toast.onUndo ? <button type="button" data-qc1522="undo" onClick={p.toast.onUndo}>Undo</button> : null}</div> : null}
        {p.burst ? <div key={p.burst} className="qc1522-burst" aria-hidden="true" data-qc1522="burst">{Array.from({ length: 46 }, (_, k) => <i key={k} style={{ left: `${(k * 37) % 100}%`, background: ["#f2ebe0", "#f3d3c6", "#d3dce7", "#cbd9be"][k % 4], animationDelay: `${(k % 7) * 0.08}s` }} />)}</div> : null}
      </div>
      {tip.node}
    </div>
    </PopCtx.Provider>
  );
};
