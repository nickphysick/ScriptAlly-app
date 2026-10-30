/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RESPONSES ON A PHONE (Phone app v2, Part 7A; ref design-refs/phone-app-v2/src/respv.js `PAGES.responses` at RSQ B ·
 * WALL B). `/queries/responses` below 768px.
 *
 * ⚠️ IT DERIVES NOTHING OF ITS OWN. The model is the desktop Responses page's, call for call: `buildQcRows` over the
 * book in scope's queries → `respItems` → `pageCounts` ("Heard back from {replies} of {sent}"), `carouselOrder` (the
 * Requests, your move first), `listNos` at the page's own default (the wall, newest no first), `typicalWait` (the
 * median reply). Placement is `placeOf`'s, so Queried, Withdrawn and Signed are on neither.
 */
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { buildQcRows, STAGE_NAME, whereItStands, type QcRow } from "../../../lib/qcSummary";
import { carouselOrder, listNos, pageCounts, respItems, typicalWait, type RespAnswer, type RespItem } from "../../../lib/responses";
import { dayMonth } from "../../../lib/dates";
import { cardAct } from "../../responses/RspCarousel";
import { RspShare } from "../../responses/RspShare";
import { QueryStatus } from "../../../types";
import { usePhoneBandSlot } from "../phoneBandStore";
import { phoneFill } from "../PhoneDisc";
import { StatusDot } from "../../StatusDot";
import { PI } from "../phoneIcons";
import { MobileSheet } from "../../shell/MobileSheet";
import "./pagesPhone.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
type Item = RespItem<QcRow>;

/** the status a request kind is named by on its pill (the answer's own stage) */
const ASKED: Partial<Record<RespAnswer, QueryStatus>> = {
  partial: QueryStatus.PARTIAL_REQUESTED, full: QueryStatus.FULL_REQUESTED, rr: QueryStatus.REVISE_RESUBMIT, offer: QueryStatus.OFFER,
};
/** the court band's words and fill (ref `COURT`); the text is ink on every fill (the colour law) */
const COURT: Record<"you" | "agent" | "quiet" | "closed" | "offer", { w: string; fill: string }> = {
  you: { w: "With you", fill: "pink" }, agent: { w: "With the agent", fill: "sand" }, quiet: { w: "Gone quiet", fill: "grey" },
  closed: { w: "Closed", fill: "grey" }, offer: { w: "Offer", fill: "slate" },
};
const TILTS = [-2.5, 1.8, -1, 2.4, -1.8];
/** a card's tilt, the same on every render: the ref's five angles, chosen by the id */
export const tiltOf = (id: string): number => { let h = 0; for (let k = 0; k < id.length; k++) h = (h * 31 + id.charCodeAt(k)) | 0; return TILTS[Math.abs(h) % TILTS.length]; };
const weeksWords = (days: number) => (days < 14 ? `${days} ${days === 1 ? "day" : "days"}` : `${Math.round(days / 7)} weeks`);

export function useResponsesModel() {
  const { queries, activities, agents, manuscripts } = useScriptAllyDb();
  const location = useLocation();
  return useMemo(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(ACTIVE_MS_KEY); } catch { stored = null; }
    const ms = resolveScopedManuscript(manuscripts, stored);
    const nowMs = Date.now();
    const own = ms ? queries.filter((q) => q.manuscriptId === ms.id) : [];
    const rows = buildQcRows(own, agents, activities, nowMs);
    const items = respItems(rows);
    return {
      ms, nowMs, items, page: pageCounts(items, rows), more: carouselOrder(items),
      nos: listNos(items, { kind: null, find: "", sort: "date", desc: true }), wait: typicalWait(items),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the stored book is the switch's signal
  }, [queries, activities, agents, manuscripts, location.key]);
}

export const ResponsesPhone: React.FC = () => {
  const navigate = useNavigate();
  const m = useResponsesModel();
  const [share, setShare] = useState(false);
  const open = (id: string) => navigate({ pathname: "/queries", search: `?q=${encodeURIComponent(id)}` });
  const { page } = m;
  const sub = [`${page.more} ${page.more === 1 ? "request" : "requests"}`, `${page.passed} ${page.passed === 1 ? "pass" : "passes"}`, m.wait != null ? `median reply ${weeksWords(m.wait)}` : null].filter(Boolean).join(" · ");

  usePhoneBandSlot("/queries/responses", (
    <div className="pa-pgfig" data-pa="resp-band">
      <div className="pa-pgk">Heard back from</div>
      <div className="pa-pgnum"><b className="pa-num" data-pa="resp-replies">{page.replies}</b><span>of <span data-pa="resp-sent">{page.sent}</span> agents</span></div>
      <div className="pa-pgsub" data-pa="resp-sub">{sub}</div>
    </div>
  ), [page.replies, page.sent, sub]);

  return (
    <div className="pa-pg" data-pa="responses">
      <div className="pa-pgbody">
        <div className="pa-shd"><h2 className="pa-h2">Requests</h2><span className="pa-shn" data-pa="resp-reqn">{m.more.length}</span></div>
        {m.more.length ? (
          <div className="pa-hscroll" data-pa="resp-reqs">
            {m.more.map((i) => <ReqMini key={i.id} i={i} nowMs={m.nowMs} onOpen={() => open(i.id)} />)}
          </div>
        ) : <p className="pa-pgnone" data-pa="resp-noreqs">No requests yet.</p>}

        <div className="pa-shd">
          <h2 className="pa-h2">Wall of no</h2>
          {m.nos.length ? <button type="button" className="pa-link" data-pa="resp-share" onClick={() => setShare(true)}>{PI.share}Share</button> : null}
        </div>
        {/* the desktop's own words (RspBanner): a fact, never a verdict */}
        <div className="pa-banner" data-pa="resp-banner">
          Rejection is part of querying. Every no below is one most published writers have had too.
          <small>Share your wall when you’re ready. It may help a writer at the start of theirs.</small>
        </div>
        {m.nos.length ? (
          <div className="pa-wall" data-pa="resp-wall">
            <div className="pa-wallc">
              {m.nos.map((i) => (
                <button key={i.id} type="button" className="pa-nocard" data-pa="resp-no" data-id={i.id} data-group={i.group}
                  style={{ transform: `rotate(${tiltOf(i.id)}deg)` }} onClick={() => open(i.id)}>
                  <span className="pa-wallk">{i.group === "passed" ? "Passed" : "No response"}</span>
                  <b className="pa-noag">{i.row.agency}</b>
                  {i.answerMs != null ? <span className="pa-nod">{dayMonth(i.answerMs)}</span> : null}
                </button>
              ))}
            </div>
            <div className="pa-wallf"><span className="pa-num" data-pa="resp-walln">{m.nos.length}</span> on the wall</div>
          </div>
        ) : <p className="pa-pgnone" data-pa="resp-nowall">Nothing on the wall.</p>}
      </div>
      <MobileSheet open={share} onClose={() => setShare(false)} ariaLabel="Share your wall" pa={{ height: "92%", white: true, className: "pa-sharesheet" }}>
        {share ? <RspShare nos={m.nos} title={m.ms?.title ?? null} /> : null}
      </MobileSheet>
    </div>
  );
};

const ReqMini: React.FC<{ i: Item; nowMs: number; onOpen: () => void }> = ({ i, nowMs, onOpen }) => {
  const c = i.row.status === QueryStatus.OFFER ? COURT.offer : COURT[whereItStands(i.row, nowMs)];
  const asked = ASKED[i.answer] ?? i.row.status;
  const askedMs = i.answerMs;
  return (
    <button type="button" className="pa-card pa-rqc" data-pa="resp-req" data-id={i.id} data-court={c.w} onClick={onOpen}>
      <span className={`pa-qband pa-fill-${c.fill}`} data-pa="resp-court"><span>{c.w}</span>{askedMs != null ? <span>{dayMonth(askedMs)}</span> : null}</span>
      <span className="pa-rqb">
        <span className="pa-rqrow">
          <span className="pa-av">{i.row.initials}</span>
          <span className="pa-rqwho"><span className="pa-rqname">{i.row.agentName}</span><span className="pa-sub">{i.row.agency}</span></span>
        </span>
        <span className={`pa-stp pa-fill-${phoneFill(asked)}`} data-pa="resp-pill"><StatusDot status={asked} overrideSize={18} />{STAGE_NAME[asked] ?? String(asked)}</span>
        <span className="pa-sub pa-rqnow" data-pa="resp-now">Now: {cardAct(i).label}</span>
      </span>
    </button>
  );
};
