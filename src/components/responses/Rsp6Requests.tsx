/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v6 Phase 4 (ref `requests` at CF "C" and `reqCard`) — AGENTS WHO WANT TO READ ON, as a row of standard query
 * cards with faded edges, round arrows on the edges, and a dot per card with "n of N" beneath.
 *
 * ⚠️ EVERY ITEM IS `shared/StandardQueryCard` (D5): no Responses-only card. Its band follows the Query Centre's groups
 *    (Your move navy, offers included; With the agent stone, `HEAD_FILL`), its pill the stage colour (`STATUS_FILL`; a
 *    revise and resubmit wears blush, D9), and its timeline the Query Centre's own story (`storySteps`).
 * ⚠️ THE ORDER IS v5's (`carouselOrder`: your move first, then the newest answer), and each card's action runs v5's
 *    journey in the panel (`cardAct`), unchanged.
 * ⚠️ ARROW KEYS STEP the row only when nothing editable has focus, the route is on screen and no answer is open.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { QueryStatus } from "../../types";
import { MONTHS_LONG, plural, type RespItem } from "../../lib/responses";
import { whereItStands, type QcRow } from "../../lib/qcSummary";
import { HEAD_FILL, STATUS_FILL, statusKind } from "../../lib/qc1512";
import { isEditableTarget } from "../../lib/shortcuts";
import type { DrawerMode } from "../../lib/queryActions/drawerStore";
import { StandardQueryCard, type StandardCardStep, type StandardQueryCardProps } from "../shared/StandardQueryCard";
import { cardAct, STEP_WORD } from "./RspCarousel";

type Item = RespItem<QcRow>;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const GAP = 22;
const longDate = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`; };

/** D9 — the pill's stage colour: the Query Centre's `STATUS_FILL`, except that a revise and resubmit wears blush */
export const pillFill = (s: QueryStatus): string =>
  s === QueryStatus.REVISE_RESUBMIT || s === QueryStatus.RESUBMITTED ? STATUS_FILL.pink : STATUS_FILL[statusKind(s)];

/** the band: Your move (navy, white) when the writer has the next move or the Query Centre puts it with them; else stone */
export function bandOf(i: Item, nowMs: number): StandardQueryCardProps["band"] {
  const you = i.yourMove || whereItStands(i.row, nowMs) === "you";
  return you
    ? { label: "Your move", bg: HEAD_FILL.navy, fg: "#ffffff", right: i.row.dayN != null ? `Day ${i.row.dayN}` : null }
    : { label: "With the agent", bg: HEAD_FILL.stone, fg: "#5b4f47", right: i.row.dayN != null ? `Day ${i.row.dayN}` : null };
}

/** the foot's deadline: the ref's words, with the date the item holds (`dueMs`, the Query Centre's expected date) */
export function dueLine(i: Item): { text: string; late: boolean } {
  const d = i.dueMs != null ? longDate(i.dueMs) : null;
  const late = i.yourMove;
  if (i.state === "offer") return { text: d ? `Answer the offer by ${d}` : "Answer the offer", late };
  if (i.state === "toSend") { const w = i.answer === "full" ? "full" : "partial"; return { text: d ? `Send the ${w} by ${d}` : `Send the ${w}`, late }; }
  if (i.state === "rr") return { text: d ? `Resubmit by ${d}` : "No resubmit date set", late };
  return { text: d ? `Response expected by ${d}` : "No reply date given", late: false };
}

export function requestCardProps(i: Item, o: { nowMs: number; msTitle: string | null; bookChips: string[]; steps: StandardCardStep[] }): Omit<StandardQueryCardProps, "foot" | "onOpen"> & { foot: { text: string; late: boolean } } {
  const steps = o.steps.slice();
  /* the ref's task chip: the request still owed carries "✓ Task created" on its last step (not on a revision) */
  if (i.yourMove && i.state !== "rr" && steps.length) {
    const last = steps[steps.length - 1];
    steps[steps.length - 1] = { ...last, chips: [...(last.chips ?? []), { label: "✓ Task created", task: true }] };
  }
  return {
    band: bandOf(i, o.nowMs),
    agent: { initials: i.row.initials, name: i.row.agentName, agency: i.row.agency },
    pill: { status: i.row.status, label: STEP_WORD[i.row.status] ?? "", bg: pillFill(i.row.status) },
    book: { title: o.msTitle || "Your book", chips: o.bookChips },
    steps, foot: dueLine(i),
  };
}

export const Rsp6Requests: React.FC<{
  items: Item[];
  nowMs: number;
  msTitle: string | null;
  bookChips: string[];
  stepsOf: (i: Item) => StandardCardStep[];
  keysOn: boolean;
  onOpen: (i: Item) => void;
  onAct: (i: Item, mode: DrawerMode) => void;
}> = ({ items, nowMs, msTitle, bookChips, stepsOf, keysOn, onOpen, onAct }) => {
  const track = useRef<HTMLDivElement | null>(null);
  const [st, setSt] = useState({ start: true, end: true, at: 0 });
  const ym = items.filter((i) => i.yourMove).length;
  const pitch = () => { const c = track.current?.querySelector<HTMLElement>(".sqc"); return c ? c.offsetWidth + GAP : 462; };
  const sync = useCallback(() => {
    const t = track.current;
    if (!t) return;
    const c = t.querySelector<HTMLElement>(".sqc");
    const w = c ? c.offsetWidth + GAP : 462;
    setSt({ start: t.scrollLeft < 4, end: t.scrollLeft + t.clientWidth >= t.scrollWidth - 4, at: Math.min(items.length - 1, Math.max(0, Math.round(t.scrollLeft / w))) });
  }, [items.length]);
  useEffect(() => {
    const t = track.current;
    if (!t) return undefined;
    sync();
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); };
    t.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { t.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [sync]);
  const by = useCallback((dir: 1 | -1) => track.current?.scrollBy({ left: dir * pitch(), behavior: reduced() ? "auto" : "smooth" }), []);
  const toCard = (k: number) => track.current?.scrollTo({ left: k * pitch(), behavior: reduced() ? "auto" : "smooth" });
  useEffect(() => {
    if (!keysOn || !items.length) return undefined;
    const key = (e: KeyboardEvent) => {
      if ((e.key !== "ArrowRight" && e.key !== "ArrowLeft") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target) || isEditableTarget(document.activeElement)) return;
      e.preventDefault();
      by(e.key === "ArrowRight" ? 1 : -1);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [keysOn, items.length, by]);
  if (!items.length) return null;
  const book = msTitle || "your book";
  return (
    <section className="rsp5-sec rsp6-req" data-rsp6="requests" data-rsp5-sec="more" aria-labelledby="rsp6-more-h">
      <div className="rsp5-h2row">
        <div className="rsp5-h2">
          <div>
            <h2 id="rsp6-more-h" className="rsp5-h2t">Agents who want to read on</h2>
            <p className="rsp5-sub" data-rsp6="requests-line">
              {plural(items.length, "agent", "agents")} asked to read more of {book}. {ym} {ym === 1 ? "is" : "are"} waiting on you.
            </p>
          </div>
        </div>
      </div>
      <div className="rsp6-cx">
        <div className="rsp6-car" ref={track} data-rsp6="track" aria-label="Requests, scroll sideways">
          {items.map((i) => {
            const p = requestCardProps(i, { nowMs, msTitle, bookChips, steps: stepsOf(i) });
            const act = cardAct(i);
            return (
              <StandardQueryCard key={i.id} {...p} className="rsp6-lc"
                data={{ "data-rsp6": "req", "data-id": i.id, "data-ym": i.yourMove ? "" : undefined }}
                openLabel={`${i.row.agentName}: ${STEP_WORD[i.row.status] ?? ""}${i.yourMove ? ", your move" : ", with the agent"}. Open.`}
                onOpen={() => onOpen(i)}
                foot={{ ...p.foot, action: { label: act.label, onClick: () => onAct(i, act.mode), data: { "data-rsp6": "req-act", "data-mode": act.mode } } }} />
            );
          })}
        </div>
        <button type="button" className="rsp6-cxe rsp6-cxe--l" aria-label="Previous" data-rsp6="edge-prev" disabled={st.start} onClick={() => by(-1)}>{"←"}</button>
        <button type="button" className="rsp6-cxe rsp6-cxe--r" aria-label="Next" data-rsp6="edge-next" disabled={st.end} onClick={() => by(1)}>{"→"}</button>
      </div>
      <div className="rsp6-cxn" data-rsp6="dots-row">
        <button type="button" className="rsp6-cxs" aria-label="Previous" data-rsp6="prev" onClick={() => by(-1)}>{"←"}</button>
        <span className="rsp6-cxd">
          {items.map((i, k) => (
            <button key={i.id} type="button" aria-label={i.row.agentName} data-rsp6="dot" className={i.yourMove ? "is-ym" : undefined}
              aria-current={k === st.at ? "true" : undefined} onClick={() => toCard(k)} />
          ))}
        </span>
        <span className="rsp6-cxc" data-rsp6="count"><b>{st.at + 1}</b> of {items.length}</span>
        <button type="button" className="rsp6-cxs" aria-label="Next" data-rsp6="next" onClick={() => by(1)}>{"→"}</button>
      </div>
    </section>
  );
};
