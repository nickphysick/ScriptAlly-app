/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v17 — the figures (design-refs/analytics-v17.html), ported from the ref's SVG, each drawn
 * TWICE: a desktop drawing (`.a17-d`) and a phone drawing (`.a17-m`) that is REDRAWN for 390px rather than
 * scaled down — its labels stay at their reference sizes (AN17-17).
 *
 * ⚠️ A MARK THAT IS A QUERY TAKES THAT QUERY'S STATUS FILL — the five `--state-*` tokens, through the
 * `a17-f-<bucket>` classes, and nothing else. Anthracite and rust are STRUCTURE ONLY (baked decision 4):
 * funnel bars, weekly bars, the stated window, median ticks, the today line, the sparkline dot, the
 * requests line and the busiest week. Colours are CLASSES, never `fill` attributes — a presentation
 * attribute loses to any CSS rule, and the v13 build lost a stroke that way.
 *
 * ⚠️ EVERY MARK CARRIES A TOOLTIP (`useMark`): hover on a desktop, a tap on a phone.
 */
import React from "react";
import { QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { DAY_MS as DAY } from "../../lib/analytics";
import { MONTHS_SHORT } from "../../lib/dates";
import { AnalyticsModel, StateBucket, V17Query, dayMonth, monthYearLong } from "../../lib/analyticsModel";
import { useMark } from "./A17Frame";

const when = (ms: number | null) => (ms === null ? "undated" : dayMonth(ms));
const titleOf = (q: V17Query) => (q.agency ? `${q.agent} · ${q.agency}` : q.agent);
const short = (q: V17Query) => { const p = q.agent.trim().split(/\s+/); return p[p.length - 1] || q.agency || "—"; };
const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
const queryLine = (q: V17Query, nowMs: number) =>
  `Queried ${when(q.sentMs)} · ${q.state}${q.endMs !== null ? ` · ended ${when(q.endMs)}` : q.sentMs !== null ? ` · ${days(Math.floor((nowMs - q.sentMs) / DAY))} so far` : ""}`;

/** A figure: a typewriter title, a small grey note, then the drawing and its key. */
export const Fig: React.FC<{ k: string; title?: string; note?: string; population: number; extra?: Record<string, string>; children: React.ReactNode; keyItems?: React.ReactNode; className?: string }> = ({ k, title, note, population, extra, children, keyItems, className }) => (
  <div className={`a17-fig${className ? ` ${className}` : ""}`} data-a17="fig" data-a17-fig="" data-key={k} data-population={population} {...extra}>
    {title ? <div className="a17-fh"><h3 className="a17-tw">{title}</h3>{note ? <small>{note}</small> : null}</div> : null}
    {children}
    {keyItems ? <div className="a17-key">{keyItems}</div> : null}
  </div>
);

export const Sw: React.FC<{ c: string }> = ({ c }) => <i className={`a17-sw ${c}`} />;
export const StateKey: React.FC<{ waiting?: string; read?: string; closed?: string; today?: boolean }> = ({ waiting = "Still waiting for a reply", read = "Material sent", closed = "Closed", today }) => (
  <>
    <span><Sw c="a17-f-queried" />{waiting}</span>
    <span><Sw c="a17-f-requested" />Material requested</span>
    <span><Sw c="a17-f-sent" />{read}</span>
    <span><Sw c="a17-f-offer" />Offer</span>
    <span><Sw c="a17-f-closed" />{closed}</span>
    {today ? <span><Sw c="a17-sw--med" />Today</span> : null}
  </>
);

/* ═════════════ 1 · where the queries got to ═════════════ */
export const Funnel: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const mark = useMark();
  const v = model.v17;
  const rows = v.funnel.rows;
  const total = Math.max(1, rows[0].count);
  const W = 1200, H = 360, x0 = 340, x1 = W - 10, rowH = H / 4, bh = 34;
  const widthOf = (n: number) => Math.max(28, ((x1 - x0) * n) / total);
  return (
    <Fig k="funnel" title="Queries by the furthest stage reached" note={`${v.sent === 1 ? "1 query" : `${v.sent} queries`} · bar length to scale`} population={v.sent}
      extra={{ "data-counts": rows.map((r) => r.count).join(",") }}>
      <svg className="a17-d" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Queries by the furthest stage reached">
        {rows.map((r, i) => {
          const y = i * rowH, mid = y + rowH / 2, w = widthOf(r.count);
          const next = i < 3 ? widthOf(rows[i + 1].count) : 0;
          return (
            <g key={r.name}>
              {/* a zero is a word ("None"), and a word at the count's 46 runs into the stage's label */}
              <text className="a17-n" x={0} y={/^\d+$/.test(r.display) ? mid + 16 : mid + 8} fontSize={/^\d+$/.test(r.display) ? 46 : 22} data-a17="fcount" data-population={r.population}>{r.display}</text>
              <text className="a17-ax" x={92} y={mid - 6}>{r.name.toUpperCase()}</text>
              <text className="a17-nm" x={92} y={mid + 14}>{r.desc}</text>
              <rect {...mark(`${r.count} · ${r.name}`, [r.desc, ...(i > 0 && rows[i - 1].count > 0 ? [`${Math.round((r.count / rows[i - 1].count) * 100)}% of the previous stage`] : [])])}
                className="a17-anth" data-a17="fbar" x={x0} y={mid - bh / 2} width={w} height={bh} rx={4}
                opacity={r.count === 0 ? 0.25 : 1 - i * 0.18} data-count={r.count} />
              {i === 0 && v.funnel.since ? (
                <text className="a17-tw a17-creamfill" x={x0 + w - 10} y={mid + 5} textAnchor="end" fontSize={14}>{v.funnel.since}</text>
              ) : null}
              {i > 0 && r.went ? (
                <text x={x0 + w + 16} y={mid + 5}>
                  <tspan className="a17-tw a17-rust" fontSize={15} data-a17="went">{r.went}</tspan>
                  {r.note ? <tspan className="a17-nm a17-ink50" dx={12}>{r.note}</tspan> : null}
                </text>
              ) : null}
              {i < 3 ? (
                <>
                  <path d={`M${x0} ${mid + bh / 2} L${x0} ${y + rowH * 1.5 - bh / 2}`} className="a17-faint" />
                  <path d={`M${x0 + w} ${mid + bh / 2 + 2} L${x0 + next} ${y + rowH * 1.5 - bh / 2 - 2}`} className="a17-dotjoin" />
                </>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="a17-m a17-mfun" data-a17="m-fun">
        {rows.map((r, i) => (
          <div className="a17-mrow" key={r.name} data-a17="m-funrow">
            <div className={`a17-mn a17-tw${/^\d+$/.test(r.display) ? "" : " a17-mn--word"}`}>{r.display}</div>
            <div>
              <div className="a17-mk">{r.name}</div>
              <div className="a17-md">{r.desc}</div>
              <div className="a17-mbar a17-anthbg" style={{ width: `${Math.max(6, (r.count / total) * 100)}%`, opacity: r.count === 0 ? 0.25 : 1 - i * 0.18 }} />
              <div className="a17-mon a17-tw">
                {i === 0 ? (v.funnel.since ?? "") : r.went ?? ""}
                {i > 0 && r.note ? <span> · {r.note}</span> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Fig>
  );
};

/* ═════════════ 2 · queries sent: the training log ═════════════ */
const DAYS = ["MON", "", "WED", "", "FRI", "", "SUN"];
export const TrainingLog: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const mark = useMark();
  const v = model.v17;
  const { weeks, busiest, months } = v.log;
  const n = Math.max(1, weeks.length);
  const G = 40, W = 1100, H = 300, top = 22, cell = (H - top - 84) / 7, cw = W / n;
  const max = Math.max(1, ...weeks.map((w) => w.count));
  const firstSend = v.lanes.startMs;
  const firstDay = firstSend === null ? Infinity : new Date(firstSend).setHours(0, 0, 0, 0);
  const now = v.lanes.nowMs;
  const base = H - 6;
  const [all, setAll] = React.useState(false);
  const shown = all ? weeks.slice().reverse() : weeks.slice(-12).reverse();
  return (
    <Fig k="log" title="Training log" note="one dot per query" population={v.dated}
      keyItems={<StateKey waiting="Still waiting for a reply" />}>
      <svg className="a17-d" viewBox={`0 0 ${G + W} ${H}`} width="100%" role="img" aria-label="Training log">
        {DAYS.map((d, i) => d ? <text key={i} className="a17-ax" x={0} y={top + i * cell + cell / 2 + 4}>{d}</text> : null)}
        <text className="a17-ax" x={0} y={base - 4}>WEEK</text>
        {months.map((m) => (
          <g key={m.index}>
            <text className="a17-ax" x={G + m.index * cw + 2} y={12}>{m.label.toUpperCase()}</text>
            <line x1={G + m.index * cw} y1={16} x2={G + m.index * cw} y2={H} className="a17-faint" />
          </g>
        ))}
        {weeks.map((w, wi) => w.days.map((qs, d) => {
          const dayMs = w.startMs + d * DAY;
          /* the faint dots run from the day of the first send to today; a sent query always draws */
          if (qs.length === 0 && (dayMs < firstDay || dayMs > now)) return null;
          const cx = G + wi * cw + cw / 2, cy = top + d * cell + cell / 2;
          if (qs.length === 0) return <circle key={`${wi}-${d}`} cx={cx} cy={cy} r={1.6} className="a17-daydot" />;
          const r0 = Math.min(cw, cell) * 0.42;
          const r = qs.length === 1 ? r0 : Math.min(r0, (cw * 0.9) / (2 * qs.length));
          return qs.map((q, j) => (
            <circle key={q.id} {...mark(titleOf(q), [queryLine(q, now)])} data-a17="logdot" data-bucket={q.bucket}
              cx={cx + (j - (qs.length - 1) / 2) * 2 * r} cy={cy} r={r} className={`a17-f-${q.bucket} a17-inkrule`} />
          ));
        }))}
        {weeks.map((w, wi) => {
          if (!w.count) return null;
          const h = (w.count / max) * 48;
          return (
            <rect key={wi} {...mark(`Week of ${dayMonth(w.startMs)}`, [`${w.count} ${w.count === 1 ? "query" : "queries"} sent`])}
              data-a17="wkbar" data-count={w.count} x={G + wi * cw + cw * 0.2} y={base - h} width={cw * 0.6} height={h} rx={2}
              className={wi === busiest ? "a17-rustfill" : "a17-anth"} />
          );
        })}
        <line x1={G} y1={base + 0.5} x2={G + W} y2={base + 0.5} className="a17-axis" />
      </svg>
      <div className="a17-m">
        <div className="a17-mlog" data-a17="m-log">
          <span />
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="a17-mh">{d}</span>)}
          <span className="a17-mh">#</span>
          {(() => {
            const out: React.ReactNode[] = [];
            let lastM = "";
            shown.forEach((w) => {
              const d = new Date(w.startMs);
              const mLabel = monthYearLong(d.getFullYear() * 12 + d.getMonth()).toUpperCase();
              if (mLabel !== lastM) { out.push(<div key={`m${w.startMs}`} className="a17-mo">{mLabel}</div>); lastM = mLabel; }
              const wi = weeks.indexOf(w);
              out.push(<span key={`w${w.startMs}`} className="a17-wk" data-a17="m-week">{w.label}</span>);
              w.days.forEach((qs, di) => {
                out.push(
                  <span key={`c${w.startMs}-${di}`} className="a17-mc">
                    {qs.length ? <b {...mark(titleOf(qs[0]), [queryLine(qs[0], now), ...(qs.length > 1 ? [`and ${qs.length - 1} more that day`] : [])])} className={`a17-f-${qs[0].bucket}`} /> : <i />}
                  </span>,
                );
              });
              out.push(<span key={`t${w.startMs}`} className={`a17-mt a17-tw${wi === busiest ? " top" : ""}`}>{w.count || ""}</span>);
            });
            return out;
          })()}
        </div>
        <button type="button" className="a17-mmore a17-tw" data-a17="m-more" onClick={() => setAll((a) => !a)}>
          {all ? "Show the last 12 weeks" : `Show all ${weeks.length} ${weeks.length === 1 ? "week" : "weeks"}`}
        </button>
      </div>
    </Fig>
  );
};

/* ═════════════ 3 · response rate: two 100% bars ═════════════ */
const ShareFig: React.FC<{ k: string; title: string; note: string; segs: { key: string; label: string; count: number; bucket: StateBucket }[] }> = ({ k, title, note, segs }) => {
  const mark = useMark();
  const total = segs.reduce((a, s) => a + s.count, 0);
  const W = 1200, h = 40;
  let x = 0;
  return (
    <Fig k={k} title={title} note={note} population={total}>
      {total === 0 ? <p className="a17-none">None yet</p> : (
        <>
          <svg className="a17-d" viewBox={`0 0 ${W} 96`} width="100%" role="img" aria-label={title} data-a17="share" data-total={total}>
            {segs.map((s) => {
              const w = (W * s.count) / total, x0 = x;
              x += w;
              return (
                <g key={s.key}>
                  <rect {...mark(`${s.count} · ${s.label}`, [`${Math.round((s.count / total) * 100)}% of ${total}`])} data-a17="seg" data-count={s.count} data-bucket={s.bucket}
                    x={x0 + 1} y={0} width={Math.max(0, w - 2)} height={h} rx={3} className={`a17-f-${s.bucket} a17-hairrule`} />
                  {w > 30 ? <text className="a17-n" x={x0 + 12} y={h / 2 + 9} fontSize={24}>{s.count}</text> : null}
                  {w > 80 ? <text className="a17-ax" x={x0 + 1} y={h + 26}>{s.label.toUpperCase()}</text> : null}
                </g>
              );
            })}
          </svg>
          <div className="a17-m a17-mshare" data-a17="m-share">
            <div className="a17-mstack" data-a17="m-stack">
              {segs.map((s) => <i key={s.key} className={`a17-f-${s.bucket}`} style={{ width: `${(s.count / total) * 100}%` }} />)}
            </div>
            <ul>
              {segs.map((s) => (
                <li key={s.key}><i className={`a17-f-${s.bucket}`} /><b className="a17-tw">{s.count}</b><span>{s.label.charAt(0).toUpperCase() + s.label.slice(1)}</span><em>{Math.round((s.count / total) * 100)}%</em></li>
              ))}
            </ul>
          </div>
        </>
      )}
    </Fig>
  );
};
export const ShareBars: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const r = model.v17.rate;
  return (
    <>
      <ShareFig k="share-all" title={r.allTitle} note="share of all queries" segs={r.all} />
      <ShareFig k="share-req" title={r.reqTitle} note="share of all requests" segs={r.req} />
    </>
  );
};

