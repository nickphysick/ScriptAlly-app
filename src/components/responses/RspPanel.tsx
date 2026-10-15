/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v2 Part D — THE ANSWER IN THE SIDE PANEL. A carousel card or a list row opens here, in query panel v2's
 * own container (`shell/SidePanel`, the `.qsp` dress) and masthead, as the Contact list's agent panel does: browsing
 * is light, and acting dims the page and wears the action drawer.
 *
 * ⚠️ ONE CONTAINER, NOT A COPY OF IT. The panel is `SidePanel` with the query panel's class (`qsp`) and the query
 *    card's own class names (`qcv-open-*`), so the box, the masthead, the tabs, the scrolling body and the footer are
 *    Query panel v2's rules. This file states only what is the answer's: the top edge, the pill, the stand card's
 *    words, the feedback card and the index card.
 * ⚠️ EVERY ACTION RUNS IN THIS PANEL: the footer's primary opens the built journey with the query chosen and `panel`
 *    set, so its form steps into this panel's slot (the drawer's own mechanism). The journeys' fields, copy and
 *    writes are their own. "Edit the response" is the built correction path: the edit journey on the closing entry.
 * ⚠️ THE STAND CARD, THE INDEX CARD AND THE FOOT ARE `lib/responses` (`answerStand`, `answerIndex`, `answerFoot`):
 *    built only from recorded facts, a missing one dropped, never invented.
 * ⚠️ ONE PANEL AT A TIME: it claims the right-hand panel as "answer" and closes when another claims it.
 */
import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Agent, Query } from "../../types";
import { QueryStatus } from "../../types";
import type { QcRow } from "../../lib/qcSummary";
import { answerFoot, answerIndex, answerStand, firstNameOf, respDate, type RespItem } from "../../lib/responses";
import { claimRightPanel, releaseRightPanel, subscribeRightPanel } from "../../lib/queryPanelStore";
import { askDrawerToLeave, currentDrawerRequest, openQueryDrawer, subscribeDrawer } from "../../lib/queryActions/drawerStore";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import { SHORTCUTS, isEditableTarget, matchesShortcut } from "../../lib/shortcuts";
import { formatQueryMaterials } from "../../lib/materials";
import { SidePanel } from "../shell/SidePanel";
import { StandCard } from "../queries/panel/StandCard";
import { QueryLedger } from "../queries/panel/QueryLedger";
import { buildTimelineRows } from "../reading-pane/QueryTimeline";
import type { StandCardView } from "../../lib/standCard";
import "../queries/queryPanelHost.css";
import "../queries/centre/qcvOpenPanel.css";
import "../queries/panel/queryLedger.css";
import "./responses.css";

type Item = RespItem<QcRow>;
export type AnswerTab = "answer" | "time";
/** the 5px top edge, by the answer */
export const EDGE: Record<Item["group"], string> = { more: "#b0603e", passed: "#7c7168", noReply: "#b5aca4" };
const PILL: Record<string, string> = {
  partial: "Asked for a partial", full: "Asked for the full", rr: "Asked for a revision", offer: "Made an offer", passed: "Passed", noReply: "No reply",
};

/** what went before the answer: the query's own materials, then any pages the agent had already read */
export function theySaw(i: Item): string | null {
  const parts: string[] = [];
  const q = formatQueryMaterials(i.row.query.materialsWanted);
  if (q) parts.push(q);
  const sentBefore = (s: QueryStatus) => i.row.history.spans.some((x) => x.status === s && (i.answerMs == null || x.startMs <= i.answerMs) && !(i.state === "sent" && x.status === sentStatusOf(i)));
  if (sentBefore(QueryStatus.PARTIAL_SENT)) parts.push("A partial");
  if (sentBefore(QueryStatus.FULL_SENT)) parts.push("The full manuscript");
  return parts.length ? parts.join(" · ") : null;
}
const sentStatusOf = (i: Item): QueryStatus | null => (i.answer === "partial" ? QueryStatus.PARTIAL_SENT : i.answer === "full" ? QueryStatus.FULL_SENT : null);

export const RspPanel: React.FC<{
  item: Item;
  agent: Agent | null;
  nowMs: number;
  msTitle: string | null;
  tab: AnswerTab;
  onTab: (t: AnswerTab) => void;
  onClose: () => void;
  /** ↑ ↓ J K: the list's visible rows; null where there is no neighbour (a carousel card has none) */
  walk: { prev: (() => void) | null; next: (() => void) | null };
  onOpenInQc: () => void;
  readLog: (queryId: string) => Promise<{ id: string; data: Record<string, unknown> }[]>;
}> = ({ item, agent, nowMs, msTitle, tab, onTab, onClose, walk, onOpenInQc, readLog }) => {
  const r = item.row;
  const first = firstNameOf(r.agentName);
  const stand = answerStand(item, msTitle, nowMs);
  const foot = answerFoot(item, nowMs);
  const index = answerIndex(item, nowMs, theySaw(item));
  const feedback = item.group === "passed" ? item.note : null;

  /* a journey stepped into this panel (the drawer's request carries `panel`) */
  const drawerReq = useSyncExternalStore(subscribeDrawer, currentDrawerRequest, currentDrawerRequest);
  const acting = !!drawerReq?.panel;

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEscapeLayer(!acting, () => closeRef.current(), ESC_LEVEL.pageDrawer);

  /* one right-hand panel at a time */
  useEffect(() => {
    claimRightPanel("answer");
    const off = subscribeRightPanel((o) => { if (o && o !== "answer") closeRef.current(); });
    return () => { off(); releaseRightPanel("answer"); if (currentDrawerRequest()?.panel) askDrawerToLeave(); };
  }, []);
  /* a journey belongs to the answer it was opened on: another row asks it to leave (parked with answers, else cancelled) */
  const firstId = useRef(true);
  useEffect(() => {
    if (firstId.current) { firstId.current = false; return; }
    if (currentDrawerRequest()?.panel) askDrawerToLeave();
  }, [item.id]);

  /* ↑ ↓ J K walk the list's visible rows; not while acting, in a field, or under a menu */
  const walkRef = useRef({ acting, walk });
  walkRef.current = { acting, walk };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const down = matchesShortcut(SHORTCUTS.respDown, e), up = matchesShortcut(SHORTCUTS.respUp, e);
      if ((!down && !up) || walkRef.current.acting || isEditableTarget(e.target)) return;
      if (e.target instanceof HTMLElement && e.target.closest('[role="menu"], [role="tablist"]')) return;
      const go = down ? walkRef.current.walk.next : walkRef.current.walk.prev;
      if (!go) return;
      e.preventDefault();
      go();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  /* focus arrives on the name; it returns to the row or card the answer came from when the panel closes */
  const nameRef = useRef<HTMLHeadingElement>(null);
  const idRef = useRef(item.id);
  idRef.current = item.id;
  useEffect(() => {
    const t = window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 0);
    return () => {
      window.clearTimeout(t);
      const back = [...document.querySelectorAll<HTMLElement>(`[data-rsp="row"][data-id="${idRef.current}"], [data-rsp="pcard"][data-id="${idRef.current}"] [data-rsp="pcard-open"]`)]
        .find((e) => e.getBoundingClientRect().height > 0);
      back?.focus({ preventScroll: true });
    };
  }, []);

  /* the panel starts under the shell's bar: its bottom edge, measured (Query panel v2 §A). A zero rect is refused. */
  const [top, setTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const read = () => {
      const bar = [...document.querySelectorAll<HTMLElement>(".ws-pagebar")].find((b) => b.getBoundingClientRect().height > 0);
      const b = bar?.getBoundingClientRect().bottom ?? 0;
      if (b > 0) setTop(Math.round(b * 10) / 10);
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  /* the query's own log: the Timeline tab's ledger, and the closing entry "Edit the response" corrects */
  const [log, setLog] = useState<{ id: string; data: Record<string, unknown> }[] | null>(null);
  useEffect(() => {
    let live = true;
    setLog(null);
    readLog(item.id).then((l) => { if (live) setLog(l); }).catch(() => { if (live) setLog([]); });
    return () => { live = false; };
  }, [item.id, r.query, readLog]);
  const rows = log ? buildTimelineRows(log.map((d) => ({ id: d.id, ...d.data })), r.query as Query, agent).slice().reverse() : null;
  const closingEntry = log ? [...log].reverse().find((d) => ((d.data.resultingStatus ?? d.data.type) as string) === r.status)?.id ?? null : null;

  const act = () => {
    const panel = { name: r.agentName, agency: r.agency, first, backLabel: `Back to ${first}` };
    if (foot.act === "edit") {
      if (closingEntry) openQueryDrawer({ mode: "edit", queryId: item.id, entryId: closingEntry, panel });
      else openQueryDrawer({ mode: "edit", queryId: item.id, panel });
      return;
    }
    openQueryDrawer({ mode: foot.act, queryId: item.id, panel });
  };

  const view: StandCardView = {
    tone: item.group === "more" ? "you" : "closed", heading: stand.heading, figure: stand.figure, past: stand.hot,
    paragraph: stand.paragraph, bar: null, links: [],
  } as StandCardView;
  const pillDate = item.group !== "more" && item.answerMs != null ? ` · ${respDate(item.answerMs, nowMs)}` : "";

  return (
    <SidePanel label={`${r.agentName}, answer`} step={acting} dim={acting} className="qsp rsn rsp-layer"
      style={{ ...(top != null ? { "--qsp-top": `${top}px` } : {}), "--rs-edge": EDGE[item.group] } as React.CSSProperties}
      attrs={{ "data-rsn": "panel", "data-rsn-id": item.id, "data-group": item.group, "data-rsn-acting": acting ? drawerReq?.mode ?? "step" : undefined }}>
      <aside className="qcv-open qcv-own rsn-card" data-rsn="card" data-tab={tab} aria-label={r.agentName}>
        <div className="qcv-open-fr">
          <header className="qcv-open-mast" data-rsn="mast">
            <div className="qcv-open-who">
              <span className={`qcv-open-ini rsn-ini${item.group === "more" ? "" : " is-closed"}`} data-rsn="disc" aria-hidden="true">{r.initials}</span>
              <div className="qcv-open-whotx">
                <h2 className="qcv-open-nm" data-rsn="name" ref={nameRef} tabIndex={-1}>{r.agentName}</h2>
                <span className="qcv-open-ag" data-rsn="agency">{r.agency}</span>
              </div>
              <span className="rsn-nav">
                <button type="button" aria-label="Previous answer" data-rsn="prev" disabled={!walk.prev || acting} onClick={() => walk.prev?.()}>{"↑"}</button>
                <button type="button" aria-label="Next answer" data-rsn="next" disabled={!walk.next || acting} onClick={() => walk.next?.()}>{"↓"}</button>
              </span>
              <button type="button" className="qcv-open-x" data-rsn="close" aria-label="Close this answer" onClick={onClose}><span aria-hidden="true">{"×"}</span></button>
            </div>
            <p className="qcv-open-line rsn-line">
              <span className="qcv-open-pill rsn-pill" data-rsn="pill"><i className="rsn-dot" aria-hidden="true" />{PILL[item.answer]}{pillDate}</span>
              <button type="button" className="rsn-qc" data-rsn="open-qc" onClick={onOpenInQc}>Open in the Query Centre {"↗"}</button>
            </p>
            <div className="qcv-open-tabs" role="tablist" aria-label="Answer detail">
              <button type="button" role="tab" aria-selected={tab === "answer"} data-rsn-tab="answer" onClick={() => onTab("answer")}>The answer</button>
              <button type="button" role="tab" aria-selected={tab === "time"} data-rsn-tab="time" onClick={() => onTab("time")}>{rows ? `Timeline · ${rows.length}` : "Timeline"}</button>
            </div>
          </header>

          <div className="qcv-open-body">
            <div className="qcv-open-tab rsn-body" role="tabpanel" data-rsn="body">
              {tab === "answer" ? (
                <>
                  <div className="rsn-stand" data-rsn="stand" data-group={item.group}><StandCard view={view} /></div>
                  {feedback ? (
                    <figure className="rsn-quote" data-rsn="feedback">
                      <span className="rsn-qlab">THEIR FEEDBACK</span>
                      <blockquote>{"“"}{feedback}{"”"}</blockquote>
                    </figure>
                  ) : null}
                  <dl className="rsn-index" data-rsn="index">
                    {index.map((x) => <div key={x.key} className="rsn-ir" data-rsn-row={x.key}><dt>{x.label}</dt><dd>{x.answer}</dd></div>)}
                  </dl>
                </>
              ) : rows ? (
                rows.length ? <QueryLedger rows={rows} nowMs={nowMs} /> : <p className="rsn-none">Nothing recorded on this query yet.</p>
              ) : <p className="rsn-none">Loading the timeline…</p>}
            </div>
          </div>

          <div className="qcv-open-ft" data-rsn="foot">
            <p className="qcv-open-stand rsn-status"><b data-rsn="status">{foot.status}</b>{foot.detail ? <span className={foot.hot ? "is-hot" : undefined} data-rsn="status-detail">{foot.detail}</span> : null}</p>
          </div>
          <div className="qcv-open-doors" data-rsn="doors">
            <button type="button" className="qcv-open-act" data-rsn="primary" data-act={foot.act} disabled={acting} onClick={act}>{foot.label}</button>
          </div>
        </div>
      </aside>
    </SidePanel>
  );
};
