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

/* ═════════════ 4 · response window honesty ═════════════ */
export const ReplyWindow: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const mark = useMark();
  const rp = model.v17.reply;
  const rows = rp.rows;
  const maxW = rp.maxWeeks;
  const step = maxW > 24 ? 8 : 4;
  const W = 1200, x0 = 96, x1 = W - 30, per = (x1 - x0) / maxW;
  const rowH = Math.max(22, Math.min(40, 350 / Math.max(1, rows.length)));
  const H = rows.length * rowH + 50;
  const ticks = Array.from({ length: Math.floor(maxW / step) }, (_, i) => (i + 1) * step);
  /* phone */
  const MW = 330, mper = (MW - 6) / maxW, mRow = 38;
  const tipOf = (r: (typeof rows)[number]) => [`Said ${r.windowWeeks} ${r.windowWeeks === 1 ? "week" : "weeks"} · replied in ${Math.round(r.replyWeeks * 10) / 10} (${r.inside ? "inside" : "after"} the window)`, r.query.state];
  return (
    <Fig k="reply" title="Stated window and actual reply" note={rp.note + (rp.agents ? ` · ${rp.stated} of ${rp.agents} agents state a response time` : "")} population={rows.length}
      keyItems={<><span><Sw c="a17-sw--win" />Stated window the agent gives</span><span><Sw c="a17-f-requested a17-sw--dot" />Reply, coloured by what it was</span><span><Sw c="a17-sw--dash" />How late it came</span></>}>
      {rows.length === 0 ? <p className="a17-none">No replies against a stated window yet</p> : (
        <>
          <svg className="a17-d" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Stated window and actual reply">
            {ticks.map((w) => (
              <g key={w}>
                <line x1={x0 + w * per} y1={0} x2={x0 + w * per} y2={H - 34} className="a17-faint" />
                <text className="a17-ax" x={x0 + w * per} y={H - 12} textAnchor="middle">{w} WEEKS</text>
              </g>
            ))}
            {rows.map((r, i) => {
              const y = 6 + i * rowH + rowH / 2;
              return (
                <g key={r.id} data-a17="rrow" data-late={r.inside ? "false" : "true"}>
                  <text className="a17-nm" x={0} y={y + 4}>{short(r.query)}</text>
                  <rect {...mark(titleOf(r.query), [`States ${r.windowWeeks} ${r.windowWeeks === 1 ? "week" : "weeks"}`])} x={x0} y={y - 7} width={r.windowWeeks * per} height={14} rx={7} className="a17-win" />
                  {!r.inside ? <line data-a17="leader" x1={x0 + r.windowWeeks * per} y1={y} x2={x0 + r.replyWeeks * per} y2={y} className="a17-leader" /> : null}
                  <circle {...mark(titleOf(r.query), tipOf(r))} data-a17="rdot" cx={x0 + r.replyWeeks * per} cy={y} r={8} className={`a17-f-${r.bucket} a17-inkrule16`} />
                </g>
              );
            })}
          </svg>
          <svg className="a17-m" viewBox={`0 0 ${MW} ${rows.length * mRow + 30}`} width="100%" data-a17="m-reply" role="img" aria-label="Stated window and actual reply">
            {ticks.map((w) => (
              <g key={w}>
                <line x1={w * mper} y1={4} x2={w * mper} y2={rows.length * mRow + 6} className="a17-faint" />
                <text className="a17-axm" x={Math.min(w * mper, MW - 4)} y={rows.length * mRow + 22} textAnchor={w === maxW ? "end" : "middle"}>{w}W</text>
              </g>
            ))}
            {rows.map((r, i) => {
              const y = i * mRow;
              return (
                <g key={r.id}>
                  <text className="a17-lbm" x={0} y={y + 13}>{short(r.query)}</text>
                  <text className="a17-axm" x={MW} y={y + 13} textAnchor="end">{`SAID ${r.windowWeeks}W · ${Math.round(r.replyWeeks)}W`}</text>
                  <rect x={0} y={y + 19} width={r.windowWeeks * mper} height={10} rx={5} className="a17-win" />
                  {!r.inside ? <line x1={r.windowWeeks * mper} y1={y + 24} x2={r.replyWeeks * mper} y2={y + 24} className="a17-leader" /> : null}
                  <circle {...mark(titleOf(r.query), tipOf(r))} cx={Math.min(r.replyWeeks * mper, MW - 7)} cy={y + 24} r={7} className={`a17-f-${r.bucket} a17-inkrule14`} />
                </g>
              );
            })}
          </svg>
        </>
      )}
    </Fig>
  );
};

/* ═════════════ 5 · wait times by stage ═════════════ */
const GAP_ORDER = ["q-r", "r-s", "s-f", "f-o"] as const;
const GAP_LABEL: Record<string, string> = { "q-r": "Queried → requested", "r-s": "Requested → sent", "s-f": "Sent → full requested", "f-o": "Full → offer" };
const END_LABEL: Record<string, string> = { rejected: "Rejected", noresponse: "No response", withdrawn: "Withdrawn", offer: "Offer" };
const qn = (n: number) => `${n} ${n === 1 ? "QUERY" : "QUERIES"}`;

export const StageGaps: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const mark = useMark();
  const gaps = GAP_ORDER.map((k) => model.v17.waits.gaps.find((g) => g.key === k)!);
  const maxD = model.stages.maxDays;
  const ticks = [maxD / 3, (2 * maxD) / 3, maxD].map(Math.round);
  const W = 600, H = 260, x0 = 196, x1 = W - 84, per = (x1 - x0) / maxD, rowH = (H - 40) / 4;
  const MW = 330, mper = (MW - 40) / maxD, mRow = 54;
  const pop = gaps.reduce((a, g) => a + g.days.length, 0);
  return (
    <Fig k="stage" title="Stage to stage" note="in days" population={pop}
      keyItems={<><span><Sw c="a17-sw--win" />Fastest to slowest</span><span><Sw c="a17-sw--med" />Median</span></>}>
      <svg className="a17-d" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Stage to stage">
        {ticks.map((d) => (
          <g key={d}><line x1={x0 + d * per} y1={0} x2={x0 + d * per} y2={H - 34} className="a17-faint" /><text className="a17-ax" x={x0 + d * per} y={H - 12} textAnchor="middle">{d} DAYS</text></g>
        ))}
        {gaps.map((g, i) => {
          const y = 10 + i * rowH + rowH / 2;
          return (
            <g key={g.key}>
              <text className="a17-nm" x={0} y={y + 4}>{GAP_LABEL[g.key]}</text>
              {g.medianDays === null ? <text className="a17-ax" x={x0} y={y + 4}>NOT YET</text> : (
                <>
                  <rect {...mark(GAP_LABEL[g.key], [`Fastest ${g.lo} · median ${g.medianDays} · slowest ${g.hi} days`, qn(g.days.length).toLowerCase()])}
                    x={x0 + (g.lo as number) * per} y={y - 8} width={Math.max(4, ((g.hi as number) - (g.lo as number)) * per)} height={16} rx={8} className="a17-win a17-o55" />
                  <line x1={x0 + g.medianDays * per} y1={y - 12} x2={x0 + g.medianDays * per} y2={y + 12} className="a17-median" />
                  <text className="a17-n a17-rustfill" x={x0 + g.medianDays * per + 8} y={y - 14} fontSize={13}>{g.medianDays}d</text>
                  {g.days.length < 5 ? <text className="a17-ax" x={x0 + (g.hi as number) * per + 10} y={y + 4}>{qn(g.days.length)}</text> : null}
                </>
              )}
            </g>
          );
        })}
      </svg>
      <svg className="a17-m" viewBox={`0 0 ${MW} ${gaps.length * mRow + 14}`} width="100%" role="img" aria-label="Stage to stage">
        {gaps.map((g, i) => {
          const y = i * mRow;
          return (
            <g key={g.key}>
              <text className="a17-lbm" x={0} y={y + 14}>{GAP_LABEL[g.key]}</text>
              <text className="a17-axm a17-rustfill" x={MW} y={y + 14} textAnchor="end">{g.medianDays === null ? "NOT YET" : `${g.medianDays} DAYS${g.days.length < 5 ? ` · ${qn(g.days.length)}` : ""}`}</text>
              {g.medianDays !== null ? (
                <>
                  <rect x={(g.lo as number) * mper} y={y + 24} width={Math.max(4, ((g.hi as number) - (g.lo as number)) * mper)} height={14} rx={7} className="a17-win a17-o55" />
                  <line x1={g.medianDays * mper} y1={y + 20} x2={g.medianDays * mper} y2={y + 42} className="a17-median" />
                </>
              ) : null}
            </g>
          );
        })}
        {ticks.map((d) => <text key={d} className="a17-axm" x={d * mper} y={gaps.length * mRow + 8} textAnchor="middle">{d}D</text>)}
      </svg>
    </Fig>
  );
};

export const Endings: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const mark = useMark();
  const w = model.v17.waits;
  const lanes = w.endings;
  const maxW = model.endings.maxWeeks;
  const ticks = [maxW / 3, (2 * maxW) / 3, maxW].map(Math.round);
  const W = 600, H = 260, x0 = 116, x1 = W - 10, per = (x1 - x0) / maxW, rowH = (H - 40) / 4;
  const MW = 330, mper = (MW - 14) / maxW, mRow = 50;
  const pop = lanes.reduce((a, l) => a + l.weeks.length, 0);
  return (
    <Fig k="endings" title="Weeks to an ending" note="one dot per closed query" population={pop}
      keyItems={<><span><Sw c="a17-f-closed a17-sw--dot" />Closed</span><span><Sw c="a17-f-offer a17-sw--dot" />Offer</span><span><Sw c="a17-sw--med" />Median</span></>}>
      <svg className="a17-d" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Weeks to an ending">
        {ticks.map((t) => (
          <g key={t}><line x1={x0 + t * per} y1={0} x2={x0 + t * per} y2={H - 34} className="a17-faint" /><text className="a17-ax" x={x0 + t * per} y={H - 12} textAnchor="middle">{t} WEEKS</text></g>
        ))}
        {lanes.map((l, i) => {
          const y = 10 + i * rowH + rowH / 2;
          const pts = w.points[l.key] ?? [];
          return (
            <g key={l.key}>
              <text className="a17-nm" x={0} y={y + 4}>{END_LABEL[l.key]}</text>
              <line x1={x0} y1={y} x2={x1} y2={y} className="a17-faint" />
              {pts.length === 0 ? <text className="a17-ax" x={x0 + 6} y={y - 8}>NONE YET</text> : pts.map((p, j) => (
                <circle key={`${p.q.id}-${j}`} {...mark(END_LABEL[l.key], [`${titleOf(p.q)}`, `${p.weeks} weeks from query to ending`])} cx={x0 + p.weeks * per} cy={y} r={7}
                  className={`${l.key === "offer" ? "a17-f-offer" : "a17-f-closed"} a17-inkrule14`} />
              ))}
              {l.medianWeeks !== null ? <line x1={x0 + l.medianWeeks * per} y1={y - 12} x2={x0 + l.medianWeeks * per} y2={y + 12} className="a17-median" /> : null}
            </g>
          );
        })}
      </svg>
      <svg className="a17-m" viewBox={`0 0 ${MW} ${lanes.length * mRow + 12}`} width="100%" role="img" aria-label="Weeks to an ending">
        {lanes.map((l, i) => {
          const y = i * mRow;
          const pts = w.points[l.key] ?? [];
          return (
            <g key={l.key}>
              <text className="a17-lbm" x={0} y={y + 14}>{END_LABEL[l.key]}</text>
              <text className="a17-axm" x={MW} y={y + 14} textAnchor="end">{pts.length === 0 ? "NONE YET" : qn(pts.length)}</text>
              <line x1={0} y1={y + 32} x2={MW} y2={y + 32} className="a17-faint" />
              {pts.map((p, j) => <circle key={`${p.q.id}-${j}`} {...mark(END_LABEL[l.key], [titleOf(p.q), `${p.weeks} weeks from query to ending`])} cx={7 + p.weeks * mper} cy={y + 32} r={7} className={`${l.key === "offer" ? "a17-f-offer" : "a17-f-closed"} a17-inkrule13`} />)}
              {l.medianWeeks !== null ? <line x1={7 + l.medianWeeks * mper} y1={y + 21} x2={7 + l.medianWeeks * mper} y2={y + 43} className="a17-median" /> : null}
            </g>
          );
        })}
        {ticks.map((t) => <text key={t} className="a17-axm" x={7 + t * mper} y={lanes.length * mRow + 6} textAnchor="middle">{t}W</text>)}
      </svg>
    </Fig>
  );
};

/* ═════════════ 6 · firsts and records ═════════════ */
const ICONS: Record<string, React.ReactNode> = {
  quickest: <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.6" fill="none" /></svg>,
  busiest: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 15h14M5 15V9M9 15V5M13 15V8" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>,
  run: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>,
  "full-read": <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 3h6M7 17h6M8 3c0 4 4 4 4 7s-4 3-4 7M12 3c0 4-4 4-4 7" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>,
};
export const Records: React.FC<{ model: AnalyticsModel }> = ({ model }) => (
  <div className="a17-recs">
    {model.v17.records.map((r) => (
      <div className="a17-rec" key={r.key} data-a17="rec" data-a17-fig="" data-key={r.key}>
        <div className="a17-medal" data-a17="medal">
          {/* ⚠️ THE TWO STATUS RECORDS IMPORT `StatusDot` — the glyph is never recreated (AN17-11) */}
          {r.key === "first-request" ? <StatusDot status={QueryStatus.PARTIAL_REQUESTED} overrideSize={22} />
            : r.key === "first-offer" ? <StatusDot status={QueryStatus.OFFER} overrideSize={22} />
            : ICONS[r.key]}
        </div>
        <div>
          <div className="a17-reck">{r.label}</div>
          <div className="a17-recv a17-tw" data-a17="rec-v">{r.value}</div>
          <div className="a17-who">{r.who}{r.aside ? <i> · {r.aside}</i> : null}</div>
        </div>
      </div>
    ))}
  </div>
);

/* ═════════════ 7 · the campaign over time ═════════════ */
const SERIES = [
  { k: "sent", label: "Sent", cls: "a17-s-sent" },
  { k: "requests", label: "Requests for more", cls: "a17-s-req" },
  { k: "ended", label: "Ended", cls: "a17-s-end" },
] as const;
export const OverTime: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const o = model.v17.overTime;
  const [at, setAt] = React.useState<number | null>(null);
  if (o.startMs === null) return <p className="a17-none">No dated query sent yet</p>;
  const start = o.startMs, span = Math.max(DAY, o.nowMs - start);
  const t = at ?? o.nowMs;
  const cnt = (xs: number[], u: number) => { let n = 0; for (const x of xs) if (x <= u) n++; return n; };
  const vals = SERIES.map((s) => cnt(o[s.k], t));
  const max = o.max;
  const yTicks = [0, Math.round(max / 3), Math.round((2 * max) / 3), max].filter((v, i, a) => a.indexOf(v) === i);
  const monthTicks = (every: number) => {
    const out: { ms: number; label: string }[] = [];
    const d = new Date(start); d.setDate(1); d.setHours(0, 0, 0, 0);
    let i = 0;
    while (d.getTime() <= o.nowMs) { if (d.getTime() >= start && i % every === 0) out.push({ ms: d.getTime(), label: MONTHS_SHORT[d.getMonth()].toUpperCase() }); d.setMonth(d.getMonth() + 1); i++; }
    return out;
  };
  const draw = (W: number, H: number, x0: number, x1: number, top: number, bot: number, every: number, mobile: boolean) => {
    const per = (x1 - x0) / span;
    const y = (v: number) => bot - (v / max) * (bot - top);
    const xOf = (ms: number) => x0 + (ms - start) * per;
    const step = (xs: number[]) => { let d = `M${x0} ${y(0)}`; xs.forEach((v, i) => { d += ` H${xOf(v).toFixed(1)} V${y(i + 1).toFixed(1)}`; }); return `${d} H${x1}`; };
    const gx = xOf(t);
    const toT = (e: React.PointerEvent<SVGSVGElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      return start + Math.max(0, Math.min(span, (px - x0) / per));
    };
    return (
      <svg className={mobile ? "a17-m a17-scrubsvg" : "a17-d a17-scrubsvg"} viewBox={`0 0 ${W} ${H}`} width="100%" data-a17="scrub" role="img" aria-label="The campaign over time"
        onPointerMove={(e) => setAt(toT(e))} onPointerDown={(e) => setAt(toT(e))} onPointerLeave={() => setAt(null)}>
        {yTicks.map((v) => (
          <g key={v}><line x1={x0} y1={y(v)} x2={x1} y2={y(v)} className="a17-faint" /><text className={mobile ? "a17-axm" : "a17-ax"} x={x0 - (mobile ? 5 : 8)} y={y(v) + 4} textAnchor="end">{v}</text></g>
        ))}
        {monthTicks(every).map((m) => <text key={m.ms} className={mobile ? "a17-axm" : "a17-ax"} x={xOf(m.ms)} y={H - (mobile ? 6 : 8)}>{m.label}</text>)}
        <path d={`${step(o.sent)} V${bot} H${x0} Z`} className="a17-s-area" />
        {SERIES.map((s) => <path key={s.k} d={step(o[s.k])} className={`a17-sline ${s.cls}`} />)}
        <line data-a17="guide" x1={gx} y1={top} x2={gx} y2={bot} className="a17-guide" />
        {SERIES.map((s, i) => <circle key={s.k} cx={gx} cy={y(vals[i])} r={mobile ? 4 : 4.5} className={`a17-sdot ${s.cls}`} />)}
        <rect x={x0} y={top} width={x1 - x0} height={bot - top} fill="transparent" />
      </svg>
    );
  };
  return (
    <div className="a17-scrubwrap">
      <div className="a17-sread" data-a17="sread">
        <span className="a17-dt" data-a17="sread-date">{at === null || at >= o.nowMs - DAY / 2 ? "Today" : dayMonth(at)}</span>
        {SERIES.map((s, i) => <div key={s.k}><b className="a17-tw">{vals[i]}</b><span><i className={`${s.cls}-sw`} />{s.label}</span></div>)}
      </div>
      {draw(1200, 300, 36, 1188, 12, 270, 2, false)}
      {draw(330, 230, 22, 324, 10, 206, 4, true)}
    </div>
  );
};

