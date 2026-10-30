/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ANALYTICS ON A PHONE (Phone app v2, Part 7C; ref design-refs/phone-app-v2/src/anv.js `PAGES.analytics` at ANT B ·
 * ANC B). `/queries/analytics` below 768px.
 *
 * ⚠️ IT DERIVES NOTHING OF ITS OWN. The desktop Analytics page states no "% heard back", so the band's headline is the
 * app's own one, `bandFigures(rows).heardPct` (the Query Centre's: asked for more or passed, over the rows); the median
 * wait is the Analytics glance's "Median wait" cell; the stage counts are `analyticsModel`'s own reached counts
 * (`sent`, `requests`, `fulls`, `offers` — a query that later closed still counts where it got to); the weeks are
 * `sentWeeks` (Monday weeks); the records are `model.v17.records`, and a record the app does not compute is not drawn.
 *
 * The switch: All time, or the last 90 days — the Analytics glance's own window, (now − 90 days, now] by send date.
 * The windowed figures are the same functions over the queries sent in that window. Remembered per device in
 * `sa.phoneAnalytics`, as Home remembers its range.
 */
import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { buildQcRows } from "../../../lib/qcSummary";
import { bandFigures } from "../../../lib/qc140";
import { sentWeeks } from "../../../lib/qcSentWeeks";
import { analyticsModel } from "../../../lib/analyticsModel";
import { anyToMs } from "../../../lib/qcStages";
import { dayMonth } from "../../../lib/dates";
import { inWindow, type PhoneRange } from "../../../lib/phonePages";
import { QueryStatus } from "../../../types";
import { StatusDot } from "../../StatusDot";
import { usePhoneBandSlot } from "../phoneBandStore";
import "./pagesPhone.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
export const ANALYTICS_RANGE_KEY = "sa.phoneAnalytics";
export function readRange(): PhoneRange {
  try { return localStorage.getItem(ANALYTICS_RANGE_KEY) === "d90" ? "d90" : "all"; } catch { return "all"; }
}
function writeRange(r: PhoneRange): void { try { localStorage.setItem(ANALYTICS_RANGE_KEY, r); } catch { /* private mode */ } }

const RECORD_KEYS = ["first-request", "quickest", "first-offer", "busiest", "run", "full-read"] as const;

export const AnalyticsPhone: React.FC = () => {
  const { queries, activities, agents, manuscripts, packages, versions } = useScriptAllyDb();
  const location = useLocation();
  const [range, setRange] = useState<PhoneRange>(readRange);
  const pick = (r: PhoneRange) => { setRange(r); writeRange(r); };

  const m = useMemo(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(ACTIVE_MS_KEY); } catch { stored = null; }
    const ms = resolveScopedManuscript(manuscripts, stored);
    const nowMs = Date.now();
    const own = ms ? queries.filter((q) => q.manuscriptId === ms.id) : [];
    const win = own.filter((q) => inWindow(anyToMs(q.dateSent), range, nowMs));
    const rows = buildQcRows(win, agents, activities, nowMs);
    const bf = bandFigures(rows, nowMs);
    const model = analyticsModel({ queries: win, activities, agents, packages, versions, range: "all", nowMs, title: ms?.title ?? "" });
    const whole = range === "all" ? model : analyticsModel({ queries: own, activities, agents, packages, versions, range: "all", nowMs, title: ms?.title ?? "" });
    const wait = whole.v17.glance.find((g) => g.key === "wait");
    const weeks = sentWeeks(buildQcRows(own, agents, activities, nowMs).map((r) => r.sentMs), nowMs, 14);
    return {
      nowMs, bf, wait: wait ? wait[range] : null,
      stages: { sent: model.sent, requests: model.requests, fulls: model.fulls, offers: model.offers },
      weeks, records: RECORD_KEYS.map((k) => whole.v17.records.find((r) => r.key === k)).filter((r): r is NonNullable<typeof r> => !!r && !r.empty),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the stored book is the switch's signal
  }, [queries, activities, agents, manuscripts, packages, versions, range, location.key]);

  const replies = m.bf.more + m.bf.passed;
  const waitWords = m.wait && m.wait.value && m.wait.value !== "–" ? `median wait ${m.wait.value}${m.wait.unit ? ` ${m.wait.unit}` : ""}` : null;
  usePhoneBandSlot("/queries/analytics", (
    <div className="pa-anband" data-pa="an-band" data-range={range}>
      <div className="pa-anrange" role="group" aria-label="Range">
        {(["all", "d90"] as const).map((r) => (
          <button key={r} type="button" className="pa-anr" aria-pressed={range === r} data-pa="an-range" data-k={r} onClick={() => pick(r)}>{r === "all" ? "All time" : "Last 90 days"}</button>
        ))}
      </div>
      {m.bf.total ? (
        <div className="pa-anhead"><b className="pa-num" data-pa="an-pct">{m.bf.heardPct}%</b><span>heard back</span></div>
      ) : <div className="pa-anhead"><span data-pa="an-none">No queries {range === "all" ? "yet" : "in the last 90 days"}</span></div>}
      {m.bf.total ? <div className="pa-pgsub" data-pa="an-sub">{[`${replies} ${replies === 1 ? "reply" : "replies"} from ${m.bf.total} ${m.bf.total === 1 ? "query" : "queries"}`, waitWords].filter(Boolean).join(" · ")}</div> : null}
    </div>
  ), [range, m.bf.heardPct, m.bf.total, replies, waitWords]);

  const st = m.stages;
  const STAGES: { k: string; w: string; n: number; status: QueryStatus }[] = [
    { k: "queried", w: "Queried", n: st.sent, status: QueryStatus.QUERIED },
    { k: "request", w: "Request", n: st.requests, status: QueryStatus.PARTIAL_SENT },
    { k: "full", w: "Full", n: st.fulls, status: QueryStatus.FULL_SENT },
    { k: "offer", w: "Offer", n: st.offers, status: QueryStatus.OFFER },
  ];
  const top = Math.max(1, ...m.weeks.map((w) => w.n));

  return (
    <div className="pa-pg" data-pa="analytics">
      <div className="pa-pgbody">
        <div className="pa-card pa-ancard" data-pa="an-track">
          <h2 className="pa-h2 pa-h17">Where your queries got to</h2>
          <div className="pa-antrack">
            {STAGES.map((s, i) => (
              <React.Fragment key={s.k}>
                {i ? <i className="pa-anlink" aria-hidden="true" /> : null}
                <div className="pa-anst" data-pa="an-stage" data-k={s.k} data-n={s.n}>
                  <span className={`pa-andisc${s.n ? " on" : ""}`}><StatusDot status={s.status} overrideSize={20} /></span>
                  <b className="pa-num">{s.n || "–"}</b><span>{s.w}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
          {st.sent ? <p className="pa-sub pa-anline" data-pa="an-line">{st.requests} of {st.sent} got a request to read more. {st.fulls} went to a full read.</p> : null}
        </div>

        <div className="pa-card pa-ancard pa-mt12" data-pa="an-weeks">
          <h2 className="pa-h2 pa-h17">Queries sent, week by week</h2>
          <p className="pa-sub pa-anweeksub">The last 14 weeks</p>
          <div className="pa-anbars">
            {m.weeks.map((w, i) => (
              <i key={w.start} className={`pa-anbar${i === m.weeks.length - 1 ? " now" : w.n ? " on" : ""}`} data-pa="an-week" data-n={w.n} data-start={w.start}
                style={{ height: w.n ? `${Math.max(6, Math.round((w.n / top) * 84))}px` : "3px" }} title={`${w.n} sent`} />
            ))}
          </div>
          <div className="pa-anaxis pa-sub"><span>{m.weeks[0] ? dayMonth(m.weeks[0].start) : ""}</span><span>This week</span></div>
        </div>

        {m.records.length ? (
          <>
            <div className="pa-shd"><h2 className="pa-h2">Firsts and records</h2></div>
            <div className="pa-hscroll" data-pa="an-records">
              {m.records.map((r) => (
                <div key={r.key} className="pa-card pa-rec" data-pa="an-record" data-k={r.key}>
                  <div className="pa-sub">{r.label}</div>
                  <div className="pa-num pa-recv">{r.value}</div>
                  {r.who ? <div className="pa-sub pa-recw">{r.who}</div> : null}
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className="pa-card pa-annote pa-mt12" data-pa="an-note">
          <b>Reading the numbers</b>
          <p className="pa-sub">Medians, not averages, so one slow reply doesn’t skew the picture. Small numbers say how many queries they come from.</p>
        </div>
      </div>
    </div>
  );
};
