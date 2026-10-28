/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v5 Phase 8 (ref `openAnswer`, the answer drawer) — THE ANSWER IN THE SIDE PANEL. A request card, a quote, a
 * timing bar's agent or a list row opens here, in query panel v2's own container (`shell/SidePanel`), as v2 did.
 *
 * ⚠️ THE CONTAINER, THE DEEP LINK AND THE JOURNEYS ARE v2's: `SidePanel` with the query panel's class, `?answer=`, ↑ ↓
 *    J K walking the list's visible rows, one right-hand panel at a time, focus returned to where the answer came from,
 *    and every action opening the built journey in this panel's slot ("Edit the response" is the edit journey on the
 *    closing entry). What changed is what is inside: the reference's navy masthead, a status strip in the state's
 *    colour, What they said, six facts and The journey.
 * ⚠️ EVERY LINE IS A RECORDED FACT: a date nothing records is a dash, never a guess; "as their guidelines say" appears
 *    only where the agent's own record says no reply means no.
 */
import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Agent } from "../../types";
import { QueryStatus } from "../../types";
import type { QcRow } from "../../lib/qcSummary";
import { FAR_WORDS, firstAnswer, firstNameOf, hasNote, plural, respDate, type RespItem } from "../../lib/responses";
import { claimRightPanel, releaseRightPanel, subscribeRightPanel } from "../../lib/queryPanelStore";
import { askDrawerToLeave, currentDrawerRequest, openQueryDrawer, subscribeDrawer, type DrawerMode } from "../../lib/queryActions/drawerStore";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import { SHORTCUTS, isEditableTarget, matchesShortcut } from "../../lib/shortcuts";
import { StatusDot } from "../StatusDot";
import { SidePanel } from "../shell/SidePanel";
import { cardAct, STEP_WORD } from "./RspCarousel";
import "../queries/queryPanelHost.css";
import "./responses5.css";

type Item = RespItem<QcRow>;

/** the status strip's colour, by the answer (the reference's `col`) */
export const stripTone = (i: Item): "of" | "you" | "ag" | "cl" =>
  i.group !== "more" ? "cl" : i.state === "offer" ? "of" : i.yourMove ? "you" : "ag";

/** the footer's primary and the journey it runs: a request's own card action, else Edit the response */
export function panelAct(i: Item): { label: string; mode: DrawerMode } {
  if (i.group === "more") { const a = cardAct(i); return { label: a.label, mode: a.mode }; }
  return { label: "Edit the response", mode: "edit" };
}

/** What they said, when there is no note: one sentence of what the record says */
export function saidPlain(i: Item, f: { weeks: number | null; nrmn: boolean }): string {
  if (i.group === "noReply") {
    const w = i.waitDays != null ? Math.round(i.waitDays / 7) : null;
    return `No reply.${w != null ? ` Closed after ${plural(w, "week", "weeks")}${f.nrmn ? ", as their guidelines say no reply means no" : ""}.` : ""}`;
  }
  if (i.group === "passed") return "A form reply, with no personal note.";
  const asked = i.answer === "partial" ? "Asked for a partial." : i.answer === "full" ? "Asked for the full manuscript." : i.answer === "offer" ? "Made an offer of representation." : "Asked for a revision.";
  return `${asked} No note recorded.`;
}

export const RspPanel: React.FC<{
  item: Item;
  agent: Agent | null;
  nowMs: number;
  onClose: () => void;
  /** ↑ ↓ J K: the list's visible rows; null where there is no neighbour (a carousel card has none) */
  walk: { prev: (() => void) | null; next: (() => void) | null };
  onOpenInQc: () => void;
  readLog: (queryId: string) => Promise<{ id: string; data: Record<string, unknown> }[]>;
}> = ({ item, agent, nowMs, onClose, walk, onOpenInQc, readLog }) => {
  const r = item.row;
  const first = firstNameOf(r.agentName);
  const facts = { weeks: agent?.responseTimeWeeks && agent.responseTimeWeeks > 0 ? agent.responseTimeWeeks : null, nrmn: !!agent?.noResponseMeansNo };
  const fa = firstAnswer(item);
  const act = panelAct(item);
  const note = hasNote(item) ? item.note : null;

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
  /* a journey belongs to the answer it was opened on: another row asks it to leave */
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
      if (e.target instanceof HTMLElement && e.target.closest('[role="menu"], [role="dialog"]:not([data-rsn="panel"])')) return;
      const go = down ? walkRef.current.walk.next : walkRef.current.walk.prev;
      if (!go) return;
      e.preventDefault();
      go();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  /* focus arrives on the close button; it returns to the row, card or quote the answer came from when the panel closes */
  const closeBtn = useRef<HTMLButtonElement>(null);
  const idRef = useRef(item.id);
  idRef.current = item.id;
  useEffect(() => {
    const t = window.setTimeout(() => closeBtn.current?.focus({ preventScroll: true }), 60);
    return () => {
      window.clearTimeout(t);
      const id = idRef.current;
      const back = [...document.querySelectorAll<HTMLElement>(`[data-rsp5="row"][data-id="${id}"], [data-rsp5="req"][data-id="${id}"] [data-rsp5="req-open"], [data-rsp5="note"][data-id="${id}"]`)]
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

  /* the query's own log: the closing entry "Edit the response" corrects */
  const [log, setLog] = useState<{ id: string; data: Record<string, unknown> }[] | null>(null);
  useEffect(() => {
    let live = true;
    setLog(null);
    readLog(item.id).then((l) => { if (live) setLog(l); }).catch(() => { if (live) setLog([]); });
    return () => { live = false; };
  }, [item.id, r.query, readLog]);
  const closingEntry = log ? [...log].reverse().find((d) => ((d.data.resultingStatus ?? d.data.type) as string) === r.status)?.id ?? null : null;
  const run = () => {
    const panel = { name: r.agentName, agency: r.agency, first, backLabel: `Back to ${first}` };
    if (act.mode === "edit" && closingEntry) openQueryDrawer({ mode: "edit", queryId: item.id, entryId: closingEntry, panel });
    else openQueryDrawer({ mode: act.mode, queryId: item.id, panel });
  };

  const d = (ms: number | null) => (ms == null ? "–" : respDate(ms, nowMs));
  const answerWord = note ? "With a note" : item.group === "noReply" ? "No reply" : item.group === "passed" ? "Form reply" : "Request";
  const journey: { status: QueryStatus; ms: number }[] = [
    ...(item.queriedMs != null ? [{ status: QueryStatus.QUERIED, ms: item.queriedMs }] : []),
    ...r.history.spans.filter((s) => s.status !== QueryStatus.QUERIED && STEP_WORD[s.status]).map((s) => ({ status: s.status, ms: s.startMs })),
  ];
  return (
    <SidePanel label={`${r.agentName}, answer`} step={acting} dim={acting} className="qsp rsn rsp5-layer"
      style={{ ...(top != null ? { "--qsp-top": `${top}px` } : {}) } as React.CSSProperties}
      attrs={{ "data-rsn": "panel", "data-rsn-id": item.id, "data-group": item.group, "data-rsn-acting": acting ? drawerReq?.mode ?? "step" : undefined }}>
      <aside className="rsp5-drw" data-rsn="card" aria-label={r.agentName}>
        <header className="rsp5-dmh" data-rsn="mast">
          <span className="rsp5-disc rsp5-disc--w" aria-hidden="true">{r.initials}</span>
          <span className="rsp5-dwho"><b data-rsn="name">{r.agentName}</b><i data-rsn="agency">{r.agency}</i></span>
          <span className="rsp5-dnav">
            <button type="button" aria-label="Previous answer" data-rsn="prev" disabled={!walk.prev || acting} onClick={() => walk.prev?.()}>{"↑"}</button>
            <button type="button" aria-label="Next answer" data-rsn="next" disabled={!walk.next || acting} onClick={() => walk.next?.()}>{"↓"}</button>
          </span>
          <button type="button" className="rsp5-dx" ref={closeBtn} data-rsn="close" aria-label="Close this answer" onClick={onClose}>{"×"}</button>
        </header>
        <div className="rsp5-dst" data-rsn="status" data-tone={stripTone(item)}>
          <StatusDot status={r.status} overrideSize={16} decorative />{STEP_WORD[r.status] ?? r.status}
        </div>
        <div className="rsp5-dbody" data-rsn="body">
          <div>
            <h5>What they said</h5>
            {note ? <p className="rsp5-dq" data-rsn="said">{"“"}{note}{"”"}</p> : <p className="rsp5-dplain" data-rsn="said">{saidPlain(item, facts)}</p>}
          </div>
          <div className="rsp5-dfacts" data-rsn="facts">
            <div><small>Queried</small><b>{d(item.queriedMs)}</b></div>
            <div><small>{item.group === "noReply" ? "Closed" : "Answered"}</small><b>{d(item.answerMs)}</b></div>
            <div><small>First answer took</small><b>{fa ? plural(fa.days, "day", "days") : "–"}</b></div>
            <div><small>They give</small><b>{facts.weeks ? plural(facts.weeks, "week", "weeks") : "Not saved"}</b></div>
            <div><small>Got as far as</small><b>{FAR_WORDS[item.furthest].replace("The full manuscript", "The full")}</b></div>
            <div><small>Answer</small><b>{answerWord}</b></div>
          </div>
          {journey.length ? (
            <div>
              <h5>The journey</h5>
              <ol className="rsp5-djo" data-rsn="journey">
                {journey.map((j, k) => (
                  <li key={`${j.status}-${k}`}><StatusDot status={j.status} overrideSize={15} decorative /><span>{STEP_WORD[j.status]}</span><small>{respDate(j.ms, nowMs).toUpperCase()}</small></li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
        <div className="rsp5-dfoot" data-rsn="doors">
          <button type="button" className="rsp5-sb" data-rsn="primary" data-act={act.mode} disabled={acting} onClick={run}>{act.label}</button>
          <button type="button" className="rsp5-sb rsp5-sb--w" data-rsn="open-qc" onClick={onOpenInQc}>Open in the Query Centre</button>
        </div>
      </aside>
    </SidePanel>
  );
};
