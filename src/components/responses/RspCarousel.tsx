/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v5 Phase 3 (ref `requests` / `reqCard`) — AGENTS WHO WANT TO READ ON: the request carousel in the landing
 * page's query-card grammar. the order is the reference's (your move first, then the newest answer: `carouselOrder`), and v2's card actions and its in-panel journeys are kept; the card is the reference's.
 *
 * ⚠️ THE CARD OPENS THE ANSWER IN THE PANEL (a stretched button under the content); its own button runs the journey.
 * ⚠️ NO MONO LABELS: the reference's card has none, and the page carries no eyebrows.
 * ⚠️ `ReqCard` IS ALSO THE EMPTY PAGE'S EXAMPLE (`example`: no opener, no data-id, the button out of the tab order).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { MONTHS_SHORT } from "../../lib/dates";
import { daysLeft, plural, respDate, WHAT_WANTS, type RespItem } from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";
import type { DrawerMode } from "../../lib/queryActions/drawerStore";

type Item = RespItem<QcRow>;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** the steps' words (the reference's `WORD`) */
export const STEP_WORD: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.QUERIED]: "Queried",
  [QueryStatus.PARTIAL_REQUESTED]: "Partial requested",
  [QueryStatus.PARTIAL_SENT]: "Partial sent",
  [QueryStatus.FULL_REQUESTED]: "Full requested",
  [QueryStatus.FULL_SENT]: "Full sent",
  [QueryStatus.REVISE_RESUBMIT]: "Revise & resubmit",
  [QueryStatus.RESUBMITTED]: "Resubmitted",
  [QueryStatus.OFFER]: "Offer",
  [QueryStatus.REJECTED]: "Passed",
  [QueryStatus.NO_RESPONSE]: "No reply",
};
export const SHORT_DATE = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toUpperCase()}`; };

/**
 * The card's own action and the journey it runs. ⚠️ A revise and resubmit runs `sent`: the Query Centre's own door for
 * an owed revision (`cardDoors`), which records the resubmission. An offer runs `offer`; everything else `resp`.
 */
export function cardAct(i: Item): { label: string; mode: DrawerMode; navy: boolean } {
  if (i.state === "toSend") return { label: `Mark ${i.answer === "full" ? "full" : "partial"} sent`, mode: "sent", navy: true };
  if (i.state === "offer") return { label: "Answer the offer", mode: "offer", navy: true };
  if (i.state === "rr") return { label: "Record the resubmission", mode: "sent", navy: true };
  return { label: "Record a response", mode: "resp", navy: false };
}

/** "Asked 20 Oct, after the partial": after the partial when a partial came first, else after the query; null undated */
export function askedLine(i: Item, nowMs: number): string | null {
  if (i.answerMs == null) return null;
  const partialFirst = i.answer !== "partial" && i.row.history.spans.some((s) => s.status === QueryStatus.PARTIAL_REQUESTED || s.status === QueryStatus.PARTIAL_SENT);
  return `Asked ${respDate(i.answerMs, nowMs)}, ${partialFirst ? "after the partial" : "after the query"}`;
}

/**
 * The foot's left: the label, the date and the days. ⚠️ A DATE THAT HAS PASSED SHOWS NO DAYS FIGURE: "n days over"
 * is a verdict, and the date already says when it was.
 */
export function footFacts(i: Item, nowMs: number): { label: string; date: string | null; days: string | null } {
  const label = i.state === "toSend" ? "Send by" : i.state === "offer" ? "Answer by" : i.state === "rr" ? "Resubmit by" : "Reply expected by";
  if (i.dueMs == null) return { label, date: i.state === "rr" ? "No date set" : null, days: null };
  const { n, over } = daysLeft(i.dueMs, nowMs);
  return { label, date: respDate(i.dueMs, nowMs), days: over ? null : `${plural(n, "day", "days")} ${i.state === "sent" ? "to go" : "left"}` };
}

const tone = (i: Item): "you" | "agt" | "of" => (i.state === "offer" ? "of" : i.yourMove ? "you" : "agt");

export const ReqCard: React.FC<{ i: Item; nowMs: number; selected?: boolean; onOpen?: () => void; onAct?: () => void; example?: boolean }> = ({ i, nowMs, selected, onOpen, onAct, example }) => {
  const act = cardAct(i);
  const asked = askedLine(i, nowMs);
  const foot = footFacts(i, nowMs);
  const steps = i.row.history.spans.filter((s) => s.status !== QueryStatus.QUERIED && STEP_WORD[s.status]).slice(-3);
  const what = WHAT_WANTS[i.answer as "partial"];
  return (
    <article className="rsp5-rc" data-rsp5="req" data-id={example ? undefined : i.id} data-c={tone(i)} data-state={i.state ?? undefined}
      data-sel={selected ? "" : undefined} data-example={example ? "" : undefined}>
      {onOpen ? <button type="button" className="rsp5-rcopen" data-rsp5="req-open"
        aria-label={`${i.row.agentName}: ${what}${i.yourMove ? ", your move" : ", with the agent"}. Open.`} onClick={onOpen} /> : null}
      <div className="rsp5-rch"><span>{i.yourMove ? "Your move" : "With the agent"}</span>{i.row.dayN != null ? <small>day {i.row.dayN}</small> : null}</div>
      <div className="rsp5-rcb">
        <div className="rsp5-who">
          <span className="rsp5-disc" aria-hidden="true">{i.row.initials}</span>
          <span><b>{i.row.agentName}</b><i>{i.row.agency}</i></span>
        </div>
        <div className="rsp5-ask" data-rsp5="req-what">
          <span className="rsp5-lbl">{i.answer === "offer" ? "Has made" : i.yourMove ? "Wants to read" : "Is reading"}</span>
          <b>{what}</b>
          {asked ? <small data-rsp5="req-asked">{asked}</small> : null}
        </div>
        {i.note ? <p className="rsp5-quote" data-rsp5="req-quote">{"“"}{i.note}{"”"}</p> : null}
        <div className="rsp5-steps" data-rsp5="req-steps">
          {i.queriedMs != null ? <span className="rsp5-st"><StatusDot status={QueryStatus.QUERIED} overrideSize={13} decorative />Queried <small>{SHORT_DATE(i.queriedMs)}</small></span> : null}
          {steps.map((s, k) => (
            <span key={`${s.status}-${k}`} className="rsp5-st"><StatusDot status={s.status} overrideSize={13} decorative />{STEP_WORD[s.status]} <small>{SHORT_DATE(s.startMs)}</small></span>
          ))}
        </div>
      </div>
      <div className="rsp5-rcf" data-rsp5="req-foot">
        <span>
          {foot.date ? <><span className="rsp5-lbl">{foot.label}</span><b data-rsp5="req-date">{foot.date}</b>{foot.days ? <em className={i.yourMove ? undefined : "is-calm"} data-rsp5="req-days">{foot.days}</em> : null}</> : null}
        </span>
        <button type="button" className={`rsp5-sb${act.navy ? "" : " rsp5-sb--w"}`} data-rsp5="req-act" data-mode={act.mode}
          tabIndex={example ? -1 : undefined} onClick={onAct}>{act.label}</button>
      </div>
    </article>
  );
};

export const RspCarousel = React.forwardRef<HTMLElement, {
  items: Item[];
  nowMs: number;
  msTitle: string | null;
  selectedId: string | null;
  onOpen: (i: Item) => void;
  onAct: (i: Item, mode: DrawerMode) => void;
}>(({ items, nowMs, msTitle, selectedId, onOpen, onAct }, ref) => {
  const track = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState({ start: true, end: true });
  const ym = items.filter((i) => i.yourMove).length;
  const step = () => {
    const c = track.current?.querySelector<HTMLElement>(".rsp5-rc");
    return c ? c.offsetWidth + 18 : 400;
  };
  const sync = useCallback(() => {
    const t = track.current;
    if (t) setAt({ start: t.scrollLeft < 4, end: t.scrollLeft + t.clientWidth >= t.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    const t = track.current;
    if (!t) return undefined;
    sync();
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); };
    t.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { t.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [sync, items.length]);
  const by = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * step(), behavior: reduced() ? "auto" : "smooth" });
  const book = msTitle || "your book";
  return (
    <section className="rsp5-sec" data-rsp5="requests" data-rsp5-sec="more" aria-labelledby="rsp5-more-h" ref={ref}>
      <div className="rsp5-h2row">
        <div className="rsp5-h2">
          <span className="rsp5-art rsp5-art--sm" aria-hidden="true">Art: hawk reading pages</span>
          <div>
            <h2 id="rsp5-more-h" className="rsp5-h2t">Agents who want to read on</h2>
            <p className="rsp5-sub" data-rsp5="requests-line">
              {items.length
                ? <><b>{plural(items.length, "agent", "agents")}</b> asked to read more of {book}. <b className="is-rust" data-rsp5="requests-move">{ym}</b> {ym === 1 ? "is" : "are"} waiting on you.</>
                : <>No requests yet. When an agent asks for pages, they&rsquo;ll be here, with what they asked for and when it&rsquo;s due.</>}
            </p>
          </div>
        </div>
        {items.length ? (
          <div className="rsp5-carctl" data-rsp5="arrows">
            <button type="button" className="rsp5-rb" aria-label="Previous" data-rsp5="prev" disabled={at.start} onClick={() => by(-1)}>{"←"}</button>
            <button type="button" className="rsp5-rb" aria-label="Next" data-rsp5="next" disabled={at.end} onClick={() => by(1)}>{"→"}</button>
          </div>
        ) : null}
      </div>
      {items.length ? (
        <div className="rsp5-car" ref={track} data-rsp5="track" tabIndex={0} aria-label="Requests, scroll sideways"
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
            e.preventDefault();
            by(e.key === "ArrowRight" ? 1 : -1);
          }}>
          {items.map((i) => <ReqCard key={i.id} i={i} nowMs={nowMs} selected={selectedId === i.id} onOpen={() => onOpen(i)} onAct={() => onAct(i, cardAct(i).mode)} />)}
        </div>
      ) : null}
    </section>
  );
});
RspCarousel.displayName = "RspCarousel";
