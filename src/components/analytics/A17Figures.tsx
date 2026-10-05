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

