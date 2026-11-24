/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v6 Phase 7 (ref `emptyPage`, v7.1 and v7.2) — NOTHING BACK YET: While you wait (three figures and the "When
 * replies are due" timeline) and What this page will show you (three preview cards).
 *
 * ⚠️ D6 — THE TIMELINE IS `waitTimeline` (lib/responses): each disc's date is the row's own `expectedMs` and its blush is
 *    the Query Centre's `goneQuiet`. Nothing here dates or classifies a query. Lanes are `stackLanes` over the lane's
 *    MEASURED width, so two discs never overlap whatever the width.
 * ⚠️ A DISC OPENS THE ANSWER PANEL for that query (`onOpen`), as a waiting item (`waitingItem`).
 * ⚠️ THE EXAMPLES ARE FIXED, CLEARLY FAKE AND NEVER THE WRITER'S (v5's `exampleRequest` / `exampleNote`), inert.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { QueryStatus } from "../../types";
import { MONTHS_LONG, plural, respDate, stackLanes, waitTimeline, type WaitDisc } from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";
import { StandardQueryCard, type StandardCardStep } from "../shared/StandardQueryCard";
import { requestCardProps } from "./Rsp6Requests";
import { exampleNote, exampleRequest } from "./RspEmpty";
import { NoteCard } from "./Rsp5Words";
import { Tally } from "./RspNos";
import { STEP_WORD } from "./RspCarousel";

const DAY = 86_400_000;
const DISC = 30, LANE = 36;
const dayMon = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_LONG[d.getMonth()].slice(0, 3)}`; };

type Hl = "all" | "next" | "quiet" | null;

export const Rsp6Empty: React.FC<{
  rows: readonly QcRow[];
  nowMs: number;
  weeksOf: (r: QcRow) => number | null;
  onOpen: (r: QcRow) => void;
  onTodo: () => void;
}> = ({ rows, nowMs, weeksOf, onOpen, onTodo }) => {
  const tl = waitTimeline(rows, nowMs, weeksOf);
  const waiting = rows.filter((r) => r.status === QueryStatus.QUERIED).length;
  const quiet = tl.discs.filter((d) => d.quiet).length;
  const lane = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = lane.current;
    if (!el) return undefined;
    const read = () => setW(el.clientWidth);
    read();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(read) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const lanes = stackLanes(tl.discs.map((d) => d.at), w > 0 ? (DISC + 6) / w : 0.042);
  const nLanes = Math.max(1, ...lanes.map((l) => l + 1));
  const [hov, setHov] = useState<number | null>(null);
  const [hl, setHl] = useState<Hl>(null);
  const pct = (a: number) => `${a * 100}%`;
  const hd: WaitDisc<QcRow> | null = hov != null ? tl.discs[hov] ?? null : null;
  const hdLane = hov != null ? lanes[hov] : 0;

  const ex = <span className="rsp6-exm">Example</span>;
  const req = exampleRequest(nowMs), note = exampleNote(nowMs);
  const reqSteps: StandardCardStep[] = [
    ...(req.queriedMs != null ? [{ key: "q", status: QueryStatus.QUERIED, title: "Query sent", qualifier: "by email", date: respDate(req.queriedMs, nowMs), chips: [{ label: "Letter" }, { label: "Synopsis" }, { label: "10 pages" }] }] : []),
    ...req.row.history.spans.filter((s) => s.status !== QueryStatus.QUERIED).map((s) => ({ key: s.status, status: s.status, title: STEP_WORD[s.status] ?? "", date: respDate(s.startMs, nowMs) })),
  ];
  const reqCard = requestCardProps(req, { nowMs, msTitle: "Murphy’s Day Out", bookChips: ["Adult", "Cosy crime", "82,000 words"], steps: reqSteps });
  return (
    <div className="rsp6-empty" data-rsp6="empty">
      <section className="rsp5-sec rsp6-card rsp6-card--oat rsp6-ew" data-rsp6="wait" aria-labelledby="rsp6-wait-h">
        <div className="rsp6-cin">
          <div className="rsp6-cbh"><h2 id="rsp6-wait-h">While you wait</h2><span className="rsp6-cbr">{waiting} out with agents</span></div>
          <div className="rsp6-cbb">
            <div className="rsp6-ewst">
              <div className="rsp6-ews" data-rsp6="fig" data-hl="all" onMouseEnter={() => setHl("all")} onMouseLeave={() => setHl(null)}>
                <b>{waiting}</b><span className="rsp6-ewl">{waiting === 1 ? "query out" : "queries out"}</span>
                {tl.firstSentMs != null ? <small>The first went out on {respDate(tl.firstSentMs, nowMs)}.</small> : null}
              </div>
              {tl.next ? (
                <div className="rsp6-ews" data-rsp6="fig" data-hl="next" onMouseEnter={() => setHl("next")} onMouseLeave={() => setHl(null)}>
                  <b>{dayMon(tl.next.ms)}</b><span className="rsp6-ewl">next reply due</span>
                  <small>{tl.next.row.agentName} at {tl.next.row.agency} gives {plural(weeksOf(tl.next.row) ?? 0, "week", "weeks")}.</small>
                </div>
              ) : null}
              <div className={`rsp6-ews${quiet ? " is-hot" : ""}`} data-rsp6="fig" data-hl="quiet" data-n={quiet} onMouseEnter={() => setHl("quiet")} onMouseLeave={() => setHl(null)}>
                <b>{quiet}</b><span className="rsp6-ewl">{quiet === 1 ? "has" : "have"} gone quiet</span>
                <small>{quiet
                  ? <>Past the reply time they give. <button type="button" className="rsp6-r0l" data-rsp6="to-todo" onClick={onTodo}>Open your To-do list {"→"}</button></>
                  : "Nobody is past the reply time they give."}</small>
              </div>
            </div>
            <h3 className="rsp6-ewh">When replies are due</h3>
            <p className="rsp6-ewp">Each agent sits on the date their stated reply time runs out. Hover one to see how long they&rsquo;ve had your query.</p>
            <div className={`rsp6-ewtl${hov != null ? " is-focus" : ""}`} data-rsp6="timeline" data-hl={hov == null ? hl ?? undefined : undefined}>
              <div className="rsp6-ewlane" ref={lane} style={{ height: nLanes * LANE + 6 }} data-rsp6="lane">
                <span className="rsp6-ewwk" style={{ left: pct(tl.weekFrom), width: pct(tl.weekTo - tl.weekFrom) }} data-rsp6="week"><i>This week{tl.weekCount ? ` · ${tl.weekCount}` : ""}</i></span>
                {hd && hd.from != null ? (
                  <span className={`rsp6-ewspan is-on${hd.quiet ? " is-late" : ""}`} data-rsp6="span"
                    style={{ left: pct(hd.from), width: pct(Math.max(0, hd.at - hd.from)), top: hdLane * LANE + DISC / 2 - 1.5 }} />
                ) : null}
                <span className="rsp6-ewtoday" style={{ left: pct(tl.today) }} data-rsp6="today"><i>Today</i></span>
                {tl.discs.map((d, k) => (
                  <button key={d.row.id} type="button" data-rsp6="disc" data-id={d.row.id} data-ms={d.ms} data-quiet={d.quiet ? "" : undefined}
                    className={`rsp6-ewdot${d.quiet ? " is-past" : ""}${d.next ? " is-next" : ""}${hov === k ? " is-hov" : ""}`}
                    style={{ left: pct(d.at), top: lanes[k] * LANE }} aria-label={`${d.row.agentName}, reply due ${dayMon(d.ms)}. Open the query.`}
                    onMouseEnter={() => setHov(k)} onMouseLeave={() => setHov(null)} onFocus={() => setHov(k)} onBlur={() => setHov(null)}
                    onClick={() => onOpen(d.row)}>
                    {d.row.initials}
                  </button>
                ))}
                {hd ? (
                  <div className="rsp6-ewpop is-on" role="tooltip" data-rsp6="pop" style={{ left: pct(hd.at), top: hdLane * LANE - 10 }}>
                    <b>{hd.row.agentName}</b>
                    <span className="rsp6-pa">{hd.row.agency}</span>
                    <span className="rsp6-pr">Queried {hd.row.sentMs != null ? respDate(hd.row.sentMs, nowMs) : "–"} · gives {plural(weeksOf(hd.row) ?? 0, "week", "weeks")}</span>
                    {hd.ms > nowMs
                      ? <span className="rsp6-ps">Reply due {dayMon(hd.ms)} · in {plural(Math.max(1, Math.ceil((hd.ms - nowMs) / DAY)), "day", "days")}</span>
                      : <span className="rsp6-ps is-late">Reply time ran out {plural(Math.max(0, Math.floor((nowMs - hd.ms) / DAY)), "day", "days")} ago{hd.quiet ? " · nudge or close" : ""}</span>}
                    <span className="rsp6-ph">Click to open the query</span>
                  </div>
                ) : null}
              </div>
              <div className="rsp6-ewaxis" aria-hidden="true">
                {tl.ticks.map((t) => <span key={t.at} className="rsp6-ewtk" style={{ left: pct(t.at) }}>{t.label}</span>)}
              </div>
            </div>
            {tl.noTime.length ? (
              <div className="rsp6-ewnt" data-rsp6="no-time">
                <span>No reply time given</span>
                {tl.noTime.map((r) => (
                  <button key={r.id} type="button" className="rsp6-ewchip" data-rsp6="no-time-chip" data-id={r.id} onClick={() => onOpen(r)}>
                    <span className="rsp6-ewmini" aria-hidden="true">{r.initials}</span>{r.agentName} <i>· queried {r.sentMs != null ? respDate(r.sentMs, nowMs) : "–"}</i>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rsp5-sec" data-rsp6="previews" aria-labelledby="rsp6-pv-h">
        <div className="rsp5-h2row"><div className="rsp5-h2"><div>
          <h2 id="rsp6-pv-h" className="rsp5-h2t">What this page will show you</h2>
          <p className="rsp5-sub">Once agents start answering, every reply lands here.</p>
        </div></div></div>
        <div className="rsp6-eps">
          <div className="rsp6-ep" data-rsp6="preview" data-k="requests"><div className="rsp6-epin">
            <div className="rsp6-eph" style={{ background: "#f5e6df" }}>Track your requests</div>
            <div className="rsp6-eppic rsp6-eppic--sc" aria-hidden="true">{ex}<StandardQueryCard {...reqCard} example /></div>
            <p>See who asked for pages, what they want and when to send it.</p>
          </div></div>
          <div className="rsp6-ep" data-rsp6="preview" data-k="notes"><div className="rsp6-epin">
            <div className="rsp6-eph" style={{ background: "#f1efec" }}>Keep their notes</div>
            <div className="rsp6-eppic rsp6-eppic--qp" aria-hidden="true">{ex}<NoteCard i={note} nowMs={nowMs} example /></div>
            <p>Every personal note from an agent, saved in one place.</p>
          </div></div>
          <div className="rsp6-ep" data-rsp6="preview" data-k="tally"><div className="rsp6-epin">
            <div className="rsp6-eph" style={{ background: "#f1efec" }}>Your wall of no</div>
            <div className="rsp6-eppic rsp6-eppic--tp" aria-hidden="true">{ex}<div className="rsp5-extally"><Tally n={13} ghosts={false} /><div className="rsp5-tcap">10 passes, 3 no reply</div></div></div>
            <p>Each no adds a mark to your wall. Share it when you&rsquo;re ready.</p>
          </div></div>
        </div>
      </section>
    </div>
  );
};
