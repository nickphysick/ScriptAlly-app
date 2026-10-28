/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v2 Part B — ASKED FOR MORE: every request, offer and revise-and-resubmit as a carousel of large cards on
 * a paper-white band, your move first (`carouselOrder`).
 *
 * ⚠️ THE GUTTER IS THE HEADER TITLE'S LEFT EDGE, by construction: the band bleeds from the page column to the sheet
 *    by `--rs-bleed`, and its heading and its track are padded by that bleed plus the header's own `--rs-inset`.
 *    One figure, two readers; B1 measures the two edges against each other.
 * ⚠️ COPY IS BUILT ONLY FROM REAL FIELDS: a card whose answer date, due date or step dates are not recorded drops the
 *    line that would have stated them. There is no request note in the data model except a revision's (`rrNotes`),
 *    so only a revise-and-resubmit card can carry a quote.
 * ⚠️ A STATUS IS DRAWN ONLY BY `StatusDot` (the trail's glyphs, at 16).
 * ⚠️ THE CARD IS A BUTTON UNDER ITS BUTTON: a full-card `.rsp-pcopen` opens the answer in the panel; the foot's own
 *    button sits above it (z-index) and runs the card's journey.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { MONTHS_SHORT } from "../../lib/dates";
import { daysLeft, plural, respDate, WHAT_WANTS, type RespItem } from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";

type Item = RespItem<QcRow>;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** the trail's words for each step (the reference's) */
const STEP_WORD: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.QUERIED]: "Queried",
  [QueryStatus.PARTIAL_REQUESTED]: "Partial asked for",
  [QueryStatus.PARTIAL_SENT]: "Partial sent",
  [QueryStatus.FULL_REQUESTED]: "Full asked for",
  [QueryStatus.FULL_SENT]: "Full sent",
  [QueryStatus.REVISE_RESUBMIT]: "Revision asked for",
  [QueryStatus.RESUBMITTED]: "Revision sent",
  [QueryStatus.OFFER]: "Offer",
};
const SHORT_DATE = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toUpperCase()}`; };

/** the button a card's foot carries, and the journey it runs */
export function cardAct(i: Item): { label: string; mode: "sent" | "resp" | "offer"; navy: boolean } {
  if (i.state === "toSend") return { label: `Mark ${i.answer === "full" ? "full" : "partial"} sent`, mode: "sent", navy: true };
  if (i.state === "offer") return { label: "Record your answer", mode: "offer", navy: true };
  return { label: "Record a response", mode: "resp", navy: false };
}

/** "Asked 1 Oct, after the partial" / "Offered 12 Sep" — null when the date is not recorded */
export function askedLine(i: Item, nowMs: number): string | null {
  if (i.answerMs == null) return null;
  const d = respDate(i.answerMs, nowMs);
  if (i.answer === "offer") return `Offered ${d}`;
  if (i.answer === "rr") return `Asked ${d}`;
  if (i.answer === "full") return `Asked ${d}, ${i.afterPartial ? "after the partial" : "after the query"}`;
  return `Asked ${d}, after the query`;
}

/** the foot's left: label, date, and its days line (rust when it is the writer's and counting, or over) */
export function footFacts(i: Item, nowMs: number): { label: string; date: string | null; days: string | null; hot: boolean } {
  if (i.state === "rr") return { label: "ASKED", date: i.answerMs != null ? respDate(i.answerMs, nowMs) : null, days: null, hot: false };
  const label = i.state === "toSend" ? "SEND BY" : i.state === "offer" ? "ANSWER BY" : "REPLY EXPECTED BY";
  if (i.dueMs == null) return { label, date: null, days: null, hot: false };
  const { n, over } = daysLeft(i.dueMs, nowMs);
  const days = over ? `${plural(n, "day", "days")} over` : i.state === "sent" ? `${plural(n, "day", "days")} to go` : `${plural(n, "day", "days")} left`;
  return { label, date: respDate(i.dueMs, nowMs), days, hot: i.state !== "sent" || over };
}

const ReqCard: React.FC<{ i: Item; nowMs: number; selected: boolean; onOpen: () => void; onAct: () => void }> = ({ i, nowMs, selected, onOpen, onAct }) => {
  const act = cardAct(i);
  const asked = askedLine(i, nowMs);
  const foot = footFacts(i, nowMs);
  const spans = i.row.history.spans.filter((s) => STEP_WORD[s.status]);
  const sent = i.state === "sent";
  return (
    <article className={`rsp-pc${i.yourMove ? " rsp-pc--you" : " rsp-pc--agt"}`} data-rsp="pcard" data-id={i.id} data-state={i.state ?? undefined}
      data-sel={selected ? "" : undefined}>
      <button type="button" className="rsp-pcopen" data-rsp="pcard-open"
        aria-label={`${i.row.agentName}: ${WHAT_WANTS[i.answer as "partial"]}${i.yourMove ? ", your move" : ", with the agent"}. Open.`} onClick={onOpen} />
      <div className="rsp-pctop" data-rsp="pcard-strip"><span>{i.yourMove ? "YOUR MOVE" : "WITH THE AGENT"}</span>{i.row.dayN != null ? <span>DAY {i.row.dayN}</span> : null}</div>
      <div className="rsp-pcb">
        <div className="rsp-pcag">
          <span className="rsp-dsc rsp-dsc--more" aria-hidden="true">{i.row.initials}</span>
          <span className="rsp-pcwho"><b>{i.row.agentName}</b><i>{i.row.agency}</i></span>
        </div>
        <div className="rsp-pcreq" data-rsp="pcard-what">
          <span className="rsp-mono">{i.answer === "offer" ? "HAS MADE" : sent ? "IS READING" : "WANTS TO READ"}</span>
          <b>{WHAT_WANTS[i.answer as "partial"]}</b>
          {asked ? <i data-rsp="pcard-asked">{asked}</i> : null}
        </div>
        {i.note ? <blockquote className="rsp-pcq" data-rsp="pcard-quote">{"“"}{i.note}{"”"}</blockquote> : null}
        {spans.length ? (
          <ol className="rsp-pcsteps" aria-label="So far" data-rsp="pcard-trail">
            {spans.map((s, k) => (
              <li key={`${s.status}-${k}`} className={k === spans.length - 1 ? "is-now" : undefined}>
                <StatusDot status={s.status} overrideSize={16} decorative />
                <span>{STEP_WORD[s.status]}<small>{SHORT_DATE(s.startMs)}</small></span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
      <div className="rsp-pcf" data-rsp="pcard-foot">
        <div>
          {foot.date ? (
            <>
              <span className="rsp-mono">{foot.label}</span>
              <b data-rsp="pcard-date">{foot.date}</b>{" "}
              {foot.days ? <small className={foot.hot ? "is-hot" : undefined} data-rsp="pcard-days">{foot.days}</small> : null}
            </>
          ) : null}
        </div>
        <button type="button" className={`rsp-btn rsp-btn--sm ${act.navy ? "rsp-btn--navy" : "rsp-btn--wht"}`} data-rsp="pcard-act" data-mode={act.mode}
          onClick={onAct}>{act.label}</button>
      </div>
    </article>
  );
};

export const RspCarousel = React.forwardRef<HTMLElement, {
  items: Item[];
  nowMs: number;
  msTitle: string | null;
  stillOut: number;
  selectedId: string | null;
  onOpen: (i: Item) => void;
  onAct: (i: Item) => void;
  onRecord: () => void;
}>(({ items, nowMs, msTitle, stillOut, selectedId, onOpen, onAct, onRecord }, ref) => {
  const track = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState({ i: 0, start: true, end: true });
  const toSend = items.filter((i) => i.yourMove).length;

  const step = () => {
    const c = track.current?.querySelector<HTMLElement>(".rsp-pc, .rsp-pcadd");
    if (!c) return 400;
    return c.getBoundingClientRect().width + parseFloat(getComputedStyle(track.current!).columnGap || "22");
  };
  const sync = useCallback(() => {
    const t = track.current;
    if (!t) return;
    const s = step();
    setAt({ i: Math.min(items.length - 1, Math.max(0, Math.round(t.scrollLeft / s))), start: t.scrollLeft < 4, end: t.scrollLeft + t.clientWidth >= t.scrollWidth - 4 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const by = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * step(), behavior: reduced() ? "auto" : "smooth" });
  const goTo = (k: number) => track.current?.scrollTo({ left: k * step(), behavior: reduced() ? "auto" : "smooth" });

  const many = items.length >= 2;
  return (
    <section className="rsp-pos" data-rsp="carousel" data-rsp5-sec="more" aria-labelledby="rsp-pos-h" ref={ref}>
      <div className="rsp-poshd">
        <div>
          <div className="rsp-plab">ASKED FOR MORE</div>
          {/* not a heading element for its face: brand.tsx forces h2 into the brand serif */}
          <h2 id="rsp-pos-h" className="rsp-posh">Agents who want to read on</h2>
          <p className="rsp-posl" data-rsp="pos-line">
            {items.length ? (
              <><b>{items.length}</b> {items.length === 1 ? "agent wants" : "agents want"} to read more of <i>{msTitle || "your book"}</i>
                {toSend ? <>. <b className="is-hot" data-rsp="pos-move">{toSend}</b> waiting on you.</> : ", and everything asked for has been sent."}</>
            ) : <>When an agent asks for a partial or the full manuscript, it appears here with what to send and when.</>}
          </p>
        </div>
        {many ? (
          <div className="rsp-arrows" data-rsp="arrows">
            <button type="button" aria-label="Previous" data-rsp="prev" disabled={at.start} onClick={() => by(-1)}>{"←"}</button>
            <button type="button" aria-label="Next" data-rsp="next" disabled={at.end} onClick={() => by(1)}>{"→"}</button>
          </div>
        ) : null}
      </div>
      <div className="rsp-track" ref={track} data-rsp="track" tabIndex={0} aria-label="Requests, scroll sideways"
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
          e.preventDefault();
          by(e.key === "ArrowRight" ? 1 : -1);
        }}>
        {items.length ? (
          <>
            {items.map((i) => <ReqCard key={i.id} i={i} nowMs={nowMs} selected={selectedId === i.id} onOpen={() => onOpen(i)} onAct={() => onAct(i)} />)}
            <button type="button" className="rsp-pcadd" data-rsp="record-request" onClick={onRecord}>
              <b>+ Record a request</b><span>Asked for pages by email or on a call? Record it so it shows here.</span>
            </button>
          </>
        ) : (
          <div className="rsp-pcnone" data-rsp="no-requests">
            <span className="rsp-pcnone-ico" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M5 2.5h7l3.5 3.5v11.5H5z" /><path d="M7.5 9h5M7.5 11.5h5M7.5 14h3" /></svg>
            </span>
            <div>
              <b>No requests yet</b>
              <p data-rsp="no-requests-line">Agents often take six to twelve weeks to reply. You have {stillOut} {stillOut === 1 ? "query" : "queries"} out with agents.</p>
            </div>
          </div>
        )}
      </div>
      {many ? (
        <div className="rsp-dots" data-rsp="dots" aria-hidden="true">
          {items.map((it, k) => <i key={it.id} data-rsp="dot" data-on={k === at.i ? "" : undefined} onClick={() => goTo(k)} />)}
        </div>
      ) : null}
    </section>
  );
});
RspCarousel.displayName = "RspCarousel";
