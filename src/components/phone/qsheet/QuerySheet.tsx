/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone query sheet v1 (design-refs/phone-query-sheet-v1) — THE ONE QUERY SHEET ON THE PHONE. Every phone door to a query
 * (a Queries row, a Today card, a search result, a Birds-eye bar, Birds-eye's long-press "Open query") opens this, over
 * the screen it came from, through the one store call (`openV3Query`) and the one host (V3Layer). It replaces v4's
 * full-screen page and Birds-eye v3's timeline sheet.
 *
 *   - HEIGHTS (ref `HALF` 430 / `FULL`, `bindGrab`): it opens at half height (430 of 784), the screen behind dimmed; the
 *     handle drags it to full (52px from the top), back to half, and further down closes it; a tap on the handle toggles
 *     half and full; a tap on the dim closes it. Heights are CSS (dvh, the safe areas); a drag only follows the finger.
 *   - THE DESKTOP CARD, made for the width: the strip in the stage colour (the track, the stage's name, ⋯, ×); the seal,
 *     the name in Special Elite, the agency in italics and "Day N"; the book on one line; the tabs Tracking · Agent ·
 *     Materials · Notes, underlined, sticking under the strip; the footer pinned: the status line over the button.
 *   - EVERY VALUE IS THE DESKTOP CARD'S OWN DERIVATION: `buildCardView` (desk: true), `buildThread`, `footer1522` (the
 *     button's label and its solid or outline tone), and the desktop's own Agent, Materials and Notes tabs.
 *   - ⋯: Log a nudge (the existing nudge flow), Close this query (open queries), Move to another agent (the desktop's
 *     save, planDetails1522, one snapshot, Undo) and Delete this query (the desktop's confirm, no Undo).
 * ⚠️ NOTHING HERE DERIVES A STATUS OR A DATE OF ITS OWN: the desktop's builders do; this draws.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { useQueryLog } from "../../todo/ws/WsPreview";
import { buildCardView } from "../../queries/centre/qcCardView";
import { askChips, buildThread, materialGroups } from "../../../lib/qcThread152";
import { footer1522, type Foot1522, type FootAct } from "../../../lib/qcFoot1522";
import { packagesUnlocked } from "../../../lib/entitlements";
import { bandInk, statusBand } from "../../../lib/stageColours";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { fieldDay } from "../../queries/centre/QcQueryCard149";
import { commitPlan } from "../../../lib/qc152Write";
import { planDetails1522 } from "../../../lib/qc1522Write";
import { restoreSnapshot } from "../../../lib/queryActions/snapshot";
import { agentPrimary } from "../../../lib/agentDisplay";
import { QueryStatus, type Query } from "../../../types";
import { useToast } from "../../toast/ToastProvider";
import { NotesTab158, quotesOf } from "../../queries/centre/QcNotes158";
import { V3Glyph } from "../v3/V3Parts";
import { StepEditSheet } from "./StepEditSheet";
import { QueryJourney, type PqjKind } from "./QueryJourney";
import { closeV3, openV3, showV3Snack, type V3Overlay } from "../v3/v3Store";
import { useV3Data } from "../v3/V3Provider";
import { runAct } from "../v4/acts";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { trackStage } from "./track";
import "../../queries/centre/qcv158.css";
import "../../queries/centre/qcv152card.css";
import "../../queries/centre/qcv1522card.css";
import "./querySheet.css";

export type PqsTab = "tracking" | "agent" | "materials" | "notes";
const TABS: [PqsTab, string][] = [["tracking", "Tracking"], ["agent", "Agent"], ["materials", "Materials"], ["notes", "Notes"]];
/** the ref's half height, as a share of its 784px screen */
export const PQS_HALF = 430 / 784;
/** full height leaves this much above the sheet */
export const PQS_TOP = 52;

/** what a footer or menu act opens on the phone (§C): the desktop's journeys over the sheet; a nudge is the existing
 *  nudge flow, and "tell the others" the existing offer flow that holds the tell list (as on the desktop) */
export const ACT_JOURNEY: Record<FootAct, PqjKind | "nudge" | "tell"> = {
  sent: "send", close: "close", offer: "offer", resp: "resp", reopen: "reopen", nudge: "nudge", tell: "tell",
};
const ARCHIVIST = "/images/archivist-head.png";

const CLOSED = new Set<QueryStatus>([QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN, QueryStatus.SIGNED]);
const initials = (name: string): string => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

/** the four-node track in the strip (queried, partial, full, offer), the current node on a white disc */
const TRACK: QueryStatus[] = [QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.OFFER];
const Track: React.FC<{ status: string }> = ({ status }) => {
  const at = trackStage(status);
  return (
    <span className="pqs-trk" data-pqs="track" data-stage={at} aria-label={at >= 0 ? `Stage ${at + 1} of 4` : "Closed"}>
      {TRACK.map((st, k) => (
        <React.Fragment key={st}>
          {k ? <i className={`ln${at >= 0 && k <= at ? "" : " fut"}`} /> : null}
          <span className={`nd${k === at ? " cur" : at >= 0 && k > at ? " fut" : at < 0 ? " fut" : ""}`}>
            <V3Glyph status={k === at ? status : st} size={k === at ? 20 : 16} label={false} />
          </span>
        </React.Fragment>
      ))}
    </span>
  );
};

const Ic = {
  more: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></svg>,
  x: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  book: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z M12 6v13.5" /></svg>,
  clip: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6" /></svg>,
  arrow: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>,
  pen: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z M14 6l4 4" /></svg>,
  doc: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6" /></svg>,
};
/** a pencil: always shown on the phone (there is no hover), each on one editable thing (v168's one way to edit) */
const Pen: React.FC<{ label: string; onClick: () => void; k: string }> = ({ label, onClick, k }) => (
  <button type="button" className="pqs-pen" aria-label={label} data-pqs="pen" data-k={k} onClick={(e) => { e.stopPropagation(); onClick(); }}>{Ic.pen}</button>
);

export interface QuerySheetProps {
  id: string;
  /** a door that opens straight into a journey (Birds-eye's long press) */
  j?: PqjKind | null;
  /** a door that opens straight into a dates edit (Birds-eye's Edit dates: the latest step's editor; Add send-by date:
   *  the desktop's Edit journey, whose save is sendByFields) */
  edit?: "dates" | "sendby" | null;
  /** the tab to open on */
  tab?: PqsTab;
}

export const QuerySheet: React.FC<QuerySheetProps> = ({ id, j: j0 = null, edit: edit0 = null, tab: tab0 = "tracking" }) => {
  const v = useV3Data();
  const db = useScriptAllyDb();
  const { showConfirm } = useToast();
  const { currentUser, agents, manuscripts, packages, queries, journalEntries } = db;
  const vq = v.byId.get(id) ?? null;
  const nowMs = v.now;
  const q = (vq?.row.query as Query | undefined) ?? null;
  const ag = q ? agents.find((a) => a.id === q.agentId) ?? null : null;
  const ms = q ? manuscripts.find((m) => m.id === q.manuscriptId) ?? null : null;
  const log = useQueryLog(currentUser?.id ?? null, id);
  const view = useMemo(() => (vq && q ? buildCardView({ row: vq.row, q, ag, ms, events: log, packages: packages ?? [], queries, manuscripts, nowMs, quietWeeks: v.quietWeeks, desk: true, free: !packagesUnlocked(db.entitlement) }) : null),
    [vq, q, ag, ms, log, packages, queries, manuscripts, nowMs, v.quietWeeks, db.entitlement]);
  const d = view?.v152 ?? null;
  const first = view?.first ?? "the agent";
  const thread = useMemo(() => (d ? buildThread(d.steps, { first, nowMs, state: d.state, replyMs: d.replyMs, agentWeeks: d.agentWeeks }) : []), [d, first, nowMs]);
  const foot: Foot1522 | null = useMemo(() => (d && vq ? footer1522({ ...(d.foot as NonNullable<typeof d.foot>), state: d.state, status: String(vq.row.status), first, nowMs }) : null), [d, vq, first, nowMs]);

  /* ── heights: half, full, or shut (drag, tap, dim) ── */
  const [h, setH] = useState<"half" | "full">(j0 ? "full" : "half");
  const [shut, setShut] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const close = useCallback(() => { setShut(true); setTimeout(() => closeV3(), 280); }, []);
  /* ── a journey over the sheet (§C): the sheet rises to full, then steps back; Cancel brings it forward at the height
     it was; a save drops the journey, the sheet comes forward updated, the new bubble animates in, the toast shows ── */
  const [jr, setJr] = useState<PqjKind | null>(j0);
  const before = useRef<"half" | "full">("half");
  const back = jr != null;
  const [newKey, setNewKey] = useState(false);
  const [toast, setToast] = useState<{ msg: string; undo: () => Promise<void>; n: number } | null>(null);
  const openJ = (k: PqjKind) => { before.current = h; setMenu(null); setH("full"); setJr(k); };
  const closeJ = () => { setJr(null); setH(before.current); };
  useEffect(() => { if (j0) { before.current = "half"; setH("full"); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast((x) => (x && x.n === toast.n ? null : x)), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);
  const act = (a: FootAct) => {
    const k = ACT_JOURNEY[a];
    if (k === "nudge") { runAct("nudge", id); return; }
    if (k === "tell") { runAct("offer", id); return; }
    openJ(k);
  };
  const grab = (e: React.PointerEvent) => {
    const el = sheet.current;
    if (!el) return;
    const y0 = e.clientY, h0 = el.offsetHeight, top = window.innerHeight;
    const half = top * PQS_HALF, full = top - PQS_TOP;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => setDrag(Math.max(80, Math.min(full, h0 - (ev.clientY - y0))));
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      const dy = ev.clientY - y0, hh = h0 - dy;
      setDrag(null);
      if (Math.abs(dy) < 6) { setH((x) => (x === "full" ? "half" : "full")); return; }
      if (hh < half * 0.7) { close(); return; }
      setH(hh > (half + full) / 2 ? "full" : "half");
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  /* ── tabs ── */
  const [tab, setTab] = useState<PqsTab>(tab0);
  useEffect(() => { setTab(tab0); }, [tab0, id]);
  const body = useRef<HTMLDivElement>(null);
  /* a new bubble: Tracking scrolls to it */
  useEffect(() => { if (newKey && body.current) body.current.scrollTop = body.current.scrollHeight; }, [newKey, thread.length]);
  useEffect(() => { if (!newKey) return undefined; const t = window.setTimeout(() => setNewKey(false), 1200); return () => window.clearTimeout(t); }, [newKey]);

  /* ── a step edited (the desktop's step editor, as a sheet over this one) ── */
  const [edit, setEdit] = useState<string | null>(null);
  /* a door into the dates edit: the latest dated step's editor (the dates a query carries live on its steps) */
  const datesFor = useRef(edit0);
  useEffect(() => { if (edit0 === "sendby") { datesFor.current = null; openQueryDrawer({ mode: "edit", queryId: id }); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (datesFor.current !== "dates" || !d) return;
    const latest = [...d.steps].filter((x) => x.activityId && !x.kind && x.ms != null).sort((a, b) => (a.ms ?? 0) - (b.ms ?? 0)).pop();
    datesFor.current = null;
    if (latest?.activityId) setEdit(latest.activityId);
  }, [d]);

  /* ── ⋯ ── */
  const [menu, setMenu] = useState<null | "menu" | "move">(null);
  const closed = vq?.court === "closed";
  const move = async (agentId: string) => {
    if (!currentUser || !q) return;
    setMenu(null);
    const to = agents.find((a) => a.id === agentId);
    try {
      const snap = await commitPlan(currentUser.id, planDetails1522(q, { agentId, method: q.sendMethod ?? "", pkg: null, pkgChanged: false }));
      showV3Snack({ msg: `Moved to ${to ? agentPrimary(to) || "another agent" : "another agent"}`, undo: async () => { await restoreSnapshot(snap); } });
    } catch { showV3Snack({ msg: "Couldn't move it. Nothing was changed." }); }
  };
  const askDelete = () => {
    if (!q) return;
    setMenu(null);
    const evCount = log.length;
    showConfirm({
      title: "Delete this query?", danger: true, confirmLabel: "Delete query", cancelLabel: "Keep it",
      body: (<p style={{ margin: 0 }}>This permanently deletes your query to <b>{vq?.row.agentName}</b>{ms?.title ? <> for <b>{ms.title}</b></> : null}
        {evCount > 0 ? <>, along with its <b>{evCount} tracking event{evCount > 1 ? "s" : ""}</b></> : <>, along with its tracking history</>}. <b>This can’t be undone.</b></p>),
      onConfirm: () => { closeV3(); void db.deleteQuery(q.id); },
    });
  };

  if (!vq || !q || !view || !d) return null;
  const status = String(vq.row.status);
  const agency = vq.row.agency && vq.row.agency !== "No agency" ? vq.row.agency : "";
  const name = vq.row.agentName;
  const genre = (ms?.genre ?? "").trim();
  const lastMsg = [...thread].reverse().find((t) => t.t === "msg");

  /* the desktop's own tabs, fed exactly as QcCard152 feeds them */
  const asks = askChips(d.asks, d.sentLabels);
  const openAgentCard = () => { if (ag) openV3({ type: "agent", id: ag.id, back: { type: "query", id } } as V3Overlay); };
  const notes = journalEntries.filter((j) => j.queryId === q.id)
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
    .map((j) => ({ id: j.id, text: j.entryText, ms: j.createdAt ? new Date(j.createdAt as string).getTime() : null, pinned: !!(j as { pinned?: boolean }).pinned }));
  const today = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };

  const pane = tab === "tracking" ? (
    <div className="pqs-th" data-pqs="thread" data-msgs={thread.filter((t) => t.t === "msg").length}>
      {thread.map((t) => t.t === "wait" ? (
        <div key={t.key} className={`pqs-gap${t.side === "me" ? " r" : ""}`} data-pqs="wait">{t.label}</div>
      ) : (
        <div key={t.key} className={`pqs-bub ${t.side === "them" ? "them" : "me"}${newKey && t === lastMsg ? " new" : ""}`} data-pqs="bubble" data-side={t.side} data-status={t.status ?? undefined}
          style={t.side === "them" ? { background: t.status ? statusBand(t.status) : undefined, color: bandInk(t.status) } : undefined}>
          {t.side === "them" ? <span className="who" aria-hidden="true">{initials(name)}</span> : null}
          <span className="gd"><V3Glyph status={t.status ?? null} size={18} label={false} /></span>
          <span className="tx">
            <b>{t.title}</b>
            {t.chips.length ? <span className="mt">{Ic.clip}{t.chips.map((c) => c.label).join(" · ")}</span> : t.sub ? <span className="mt">{t.sub}</span> : null}
            {t.quote ? <q>{t.quote}</q> : null}
          </span>
          <time className="ts">{t.date}</time>
          {t.activityId ? <Pen k="step" label={`Edit “${t.title}”`} onClick={() => setEdit(t.activityId!)} /> : null}
        </div>
      ))}
    </div>
  ) : tab === "agent" ? (
    /* the desktop's Agent tab (QcAgent158), reshaped for the width as the ref draws it: two by two, what the agent asks
       for, and the way to their card. Every value is the desktop's (lib/qcCardView); each pencil opens the phone's agent
       card over this sheet, where those details are edited on the phone */
    <div data-pqs="agent">
      <div className="pqs-tiles" data-pqs="tiles">
        <div className="pqs-tile" data-k="weeks"><small>Reply time</small><b>{d.agentWeeks != null ? `${d.agentWeeks} ${d.agentWeeks === 1 ? "week" : "weeks"}` : "Not known"}</b><Pen k="weeks" label={`Edit ${first}’s reply time`} onClick={openAgentCard} /></div>
        <div className="pqs-tile" data-k="policy"><small>Their policy</small><b>{d.nrmn === true ? "No reply means no" : d.nrmn === false ? "Replies to all" : "Not known"}</b><Pen k="policy" label={`Edit ${first}’s policy`} onClick={openAgentCard} /></div>
        <div className="pqs-tile" data-k="heard"><small>Last heard</small><b>{d.lastHeardMs != null ? fieldDay(d.lastHeardMs) : "Not yet"}</b></div>
        <div className="pqs-tile" data-k="yours"><small>Your queries</small><b>{(() => { const n = view.toAgent.filter((x) => !CLOSED.has(x.status as QueryStatus)).length; return `${n} with them`; })()}</b></div>
      </div>
      {asks.chips.length ? <>
        <p className="pqs-sec">What {first} asks for</p>
        <div className="pqs-lst" data-pqs="asks">
          {asks.chips.map((c) => <div key={c.label} className="li" data-sent={c.sent ? "1" : "0"}><span className="mi">{Ic.doc}</span><span className="lt">{c.label}</span><Pen k="ask" label={`Edit what ${first} asks for`} onClick={openAgentCard} /></div>)}
        </div>
      </> : null}
      {ag ? <button type="button" className="pqs-lnk" data-pqs="agent-card" onClick={openAgentCard}>Open {first}’s agent card {Ic.arrow}</button> : null}
    </div>
  ) : tab === "materials" ? (
    /* the desktop's Materials tab (lib/qcThread152 materialGroups): grouped by what each thing went with, a ghost bar
       where nothing has gone yet; each sent group's pencil opens its step's editor (that step's own save) */
    <div data-pqs="materials">
      {materialGroups(d.steps, { nowMs }).map((g) => (
        <section key={g.key} data-pqs="mat-group" data-kind={g.kind} data-pending={g.pending ? "1" : "0"}>
          <p className="pqs-sec">{g.heading}</p>
          <div className="pqs-lst">
            {g.items.length ? g.items.map((c) => (
              <div key={c.label} className="li"><span className="mi">{Ic.doc}</span><span className="lt">{c.label}</span>
                {g.activityId && !g.pending ? <Pen k="mat" label={`Edit what went with ${g.heading.toLowerCase()}`} onClick={() => setEdit(g.activityId!)} /> : null}</div>
            )) : (
              <button type="button" className="li ghost" data-pqs="mat-ghost" aria-label={g.pending ? "Log what went" : "Nothing yet"} onClick={() => { if (g.pending) act("sent"); }}>
                <span className="mi" /><span className="gb" /><span className="gb s" />
              </button>
            )}
          </div>
        </section>
      ))}
    </div>
  ) : (
    <div className="qc152 qc152-notes pqs-desk" data-pqs="notes">
      <NotesTab158 first={first} nowMs={nowMs} resetKey={q.id} notes={notes} quotes={quotesOf(d.steps)}
        onAdd={(t) => { void db.addJournalEntry(q.id, t).then(() => showV3Snack({ msg: `Note added for ${first}` })); }}
        onPin={(nid, on) => {
          const others = on ? journalEntries.filter((j) => j.queryId === q.id && j.id !== nid && (j as { pinned?: boolean }).pinned) : [];
          void Promise.all([...others.map((j) => db.pinJournalEntry(j.id, false)), db.pinJournalEntry(nid, on)]).then(() => showV3Snack({ msg: on ? "Pinned to the top" : "Unpinned" }));
        }}
        onTask={(text) => { void db.addUserTask({ text, queryId: q.id, agentId: ag?.id, manuscriptId: q.manuscriptId, dueDate: today() }).then(() => showV3Snack({ msg: "On your to-do list for today" })); }}
        onCork={(text) => { void db.addUserTask({ text, queryId: q.id }).then(() => showV3Snack({ msg: "Pinned to your Corkboard" })); }}
        onEdit={async (nid, text) => {
          const was = journalEntries.find((j) => j.id === nid)?.entryText;
          try { await db.updateJournalEntry(nid, text); } catch { showV3Snack({ msg: "Couldn't save that note. Nothing was changed." }); return false; }
          showV3Snack({ msg: "Saved that note", undo: was != null ? async () => { await db.updateJournalEntry(nid, was); } : undefined });
          return true;
        }}
        onDelete={(nid) => { void db.deleteJournalEntry(nid).then(() => showV3Snack({ msg: "Note deleted" })); }} />
    </div>
  );

  const solid = foot?.button?.tone === "navy";
  const h0 = drag != null ? `${drag}px` : undefined;
  return (
    <div className={`pqs${back ? " is-back" : ""}`} data-pqs="root" data-id={id} data-h={h} data-court={vq.court} data-state={d.state} data-tab={tab}>
      <div className={`pqs-dim${shut ? "" : " on"}`} data-pqs="dim" onClick={close} />
      <div ref={sheet} className={`pqs-sheet ${h}${shut ? " shut" : ""}${drag != null ? " drag" : ""}${back ? " back" : ""}`} role="dialog" aria-modal="true" aria-label={`${name}’s query`}
        data-pqs="sheet" data-h={h} style={h0 ? { height: h0 } : undefined}>
        <div className="pqs-grab" data-pqs="grab" onPointerDown={grab} role="button" aria-label={h === "full" ? "Half height" : "Full height"}><i /></div>
        <div className="pqs-strip" data-pqs="strip" data-status={status} style={{ background: statusBand(status), color: bandInk(status) }}>
          <Track status={status} />
          <span className="stl" data-pqs="stage">{STAGE_NAME[status as QueryStatus] ?? vq.status}</span>
          <button type="button" className="cb" data-pqs="more" aria-label="More" aria-expanded={menu != null} onClick={() => setMenu((m) => (m ? null : "menu"))}>{Ic.more}</button>
          <button type="button" className="cb" data-pqs="close" aria-label="Close" onClick={close}>{Ic.x}</button>
        </div>
        {menu === "menu" ? (
          <div className="pqs-mn" role="menu" data-pqs="menu">
            {!closed ? <button type="button" role="menuitem" data-act="nudge" onClick={() => { setMenu(null); act("nudge"); }}>Log a nudge</button> : null}
            {!closed ? <button type="button" role="menuitem" data-act="close" onClick={() => { setMenu(null); act("close"); }}>Close this query</button> : null}
            <button type="button" role="menuitem" data-act="move" onClick={() => setMenu("move")}>Move to another agent</button>
            <button type="button" role="menuitem" data-act="delete" className="red" onClick={askDelete}>Delete this query</button>
          </div>
        ) : menu === "move" ? (
          <div className="pqs-mn pqs-move" role="menu" data-pqs="move-menu">
            <div className="ph">Who’s this query to?</div>
            {[...agents].map((a) => ({ id: a.id, name: agentPrimary(a) })).sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
              <button key={a.id} type="button" role="menuitemradio" aria-checked={a.id === q.agentId} data-v={a.id} onClick={() => { if (a.id !== q.agentId) void move(a.id); else setMenu(null); }}>{a.name}</button>
            ))}
          </div>
        ) : null}
        <div ref={body} className="pqs-body" data-pqs="body">
          <div className="pqs-hd" data-pqs="head">
            <span className="seal" aria-hidden="true">{initials(name)}</span>
            <span className="nm"><b data-pqs="name">{name}</b>{agency ? <i>{agency}</i> : null}</span>
            {vq.day != null ? <span className="dayn" data-pqs="day">Day {vq.day}</span> : null}
          </div>
          {ms ? (
            <div className="pqs-bk" data-pqs="book"><span className="bi">{Ic.book}</span><b>{ms.title}</b>{genre ? <span>· {genre}</span> : null}</div>
          ) : null}
          <div className="pqs-tabs" role="tablist" data-pqs="tabs">
            {TABS.map(([k, label]) => <button key={k} type="button" role="tab" aria-selected={tab === k} data-pqs="tab" data-k={k} onClick={() => setTab(k)}>{label}</button>)}
          </div>
          <div className="pqs-pane" data-pqs="pane">{pane}</div>
        </div>
        {foot ? (
          <div className="pqs-ft" data-pqs="foot" data-tone={foot.button?.tone ?? "none"}>
            <div className="stb" data-pqs="status-box">
              <span className="gd" style={{ background: statusBand(status) }}><V3Glyph status={status} size={16} label={false} /></span>
              <span><b data-pqs="lead">{foot.lead}</b>{foot.sub ? <i>{foot.sub}</i> : null}</span>
            </div>
            {foot.button ? (
              <button type="button" className={`pri${solid ? "" : " out"}`} data-pqs="primary" data-act={foot.button.act} data-tone={foot.button.tone}
                onClick={() => act(foot.button!.act)}>{foot.button.label}{solid ? Ic.arrow : null}</button>
            ) : null}
          </div>
        ) : null}
      </div>
      {jr ? <QueryJourney id={id} kind={jr} onClose={closeJ}
        onSaved={(msg, undo) => { setJr(null); setH(before.current); setTab("tracking"); setNewKey(true); setToast((o) => ({ msg, undo, n: (o?.n ?? 0) + 1 })); }} /> : null}
      {toast ? (
        <div className="pqs-toast" role="status" data-pqs="toast" key={toast.n}>
          <img src={ARCHIVIST} alt="" width={32} height={32} />
          <span>{toast.msg}</span>
          <button type="button" data-pqs="undo" onClick={() => { const u = toast.undo; setToast(null); void u(); }}>Undo</button>
        </div>
      ) : null}
      {edit ? <StepEditSheet q={q} ag={ag} ms={ms} steps={d.steps} evStore={view.evStore as unknown as Map<string, Record<string, unknown>>} activityId={edit}
        first={first} nowMs={nowMs} quietWeeks={v.quietWeeks} onClose={() => setEdit(null)} /> : null}
    </div>
  );
};
