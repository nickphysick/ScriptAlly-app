/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v24 S1 — WHAT HAPPENED TO YOUR QUERIES? Two pies side by side: all the queries (asked to read more ·
 * no reply yet · ended without a request), and the ones who asked (made an offer · still with the agent · read it,
 * then said no). Every count is `outcomes` (lib/analyticsV24).
 *
 * ⚠️ SLICES RUN FROM 12 O'CLOCK CLOCKWISE with 2.5px white separators; a zero slice and its legend row are left out.
 *    A slice that is the whole pie is drawn as a circle, since an arc from a point to itself draws nothing.
 * ⚠️ THE FILLS: anthracite for "asked" (structure, not a status), then the locked status fills — sand for waiting,
 *    stone for closed, slate for an offer, sage for material with the agent.
 */
import React from "react";
import type { V24 } from "../../lib/analyticsV24";
import { Block, type Reading } from "./A24Frame";

export interface Slice { key: string; n: number; fill: string; ink?: string; label: string; aside?: string }
const ANTHRACITE = "#2a3a52";

/** Angles in degrees from 12 o'clock, clockwise: [start, end] for each slice. */
export function pieAngles(ns: number[]): [number, number][] {
  const total = ns.reduce((a, b) => a + b, 0);
  let at = 0;
  return ns.map((n) => { const a = at; at += total ? (n / total) * 360 : 0; return [a, at]; });
}
const pt = (c: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [c + r * Math.cos(rad), c + r * Math.sin(rad)] as const;
};

export const Pie: React.FC<{ size: number; slices: Slice[]; probe: string; label: string }> = ({ size, slices, probe, label }) => {
  const shown = slices.filter((s) => s.n > 0);
  const c = 100, r = 98;
  const angles = pieAngles(shown.map((s) => s.n));
  return (
    <svg className="a24-pie" data-a24={probe} viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={label}>
      {shown.map((s, i) => {
        const [a0, a1] = angles[i];
        const mid = (a0 + a1) / 2;
        const [tx, ty] = pt(c, r * 0.6, shown.length === 1 ? 180 : mid);
        const common = { fill: s.fill, stroke: "#fff", strokeWidth: 2.5, "data-a24": "slice", "data-k": s.key, "data-n": s.n, "data-a0": a0.toFixed(2), "data-a1": a1.toFixed(2) } as const;
        let shape: React.ReactNode;
        if (shown.length === 1) shape = <circle cx={c} cy={c} r={r} style={{ fill: s.fill }} {...common} />;
        else {
          const [x0, y0] = pt(c, r, a0), [x1, y1] = pt(c, r, a1);
          const large = a1 - a0 > 180 ? 1 : 0;
          shape = <path d={`M${c},${c} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`} style={{ fill: s.fill }} {...common} />;
        }
        return (
          <g key={s.key}>
            {shape}
            {/* a sliver too thin to hold its count leaves it to the legend beside it */}
            {a1 - a0 >= 24 ? <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" className="a24-piet" style={{ fill: s.ink ?? "#1c130f" }} aria-hidden="true">{s.n}</text> : null}
          </g>
        );
      })}
    </svg>
  );
};

const Legend: React.FC<{ slices: Slice[] }> = ({ slices }) => (
  <ul className="a24-pl" data-a24="legend">
    {slices.filter((s) => s.n > 0).map((s) => (
      <li key={s.key} data-a24="legend-row" data-k={s.key}>
        <em style={{ background: s.fill }} aria-hidden="true" />
        <b>{s.n}</b>
        <span>{s.label}{s.aside ? <small>{s.aside}</small> : null}</span>
      </li>
    ))}
  </ul>
);

export function s1Slices(v: V24): { all: Slice[]; asked: Slice[] } {
  const o = v.outcomes;
  const bits = [
    o.ended.letter ? `${o.ended.letter} said no to the letter` : "",
    o.ended.closed ? `${o.ended.closed} you closed after a long silence` : "",
    o.ended.withdrew ? `${o.ended.withdrew} you withdrew` : "",
  ].filter(Boolean);
  return {
    all: [
      { key: "asked", n: o.asked, fill: ANTHRACITE, ink: "#fff", label: "Asked to read more" },
      { key: "waiting", n: o.waiting, fill: "var(--state-queried)", label: "No reply yet" },
      { key: "ended", n: o.ended.total, fill: "var(--state-closed)", label: "Ended without a request", aside: bits.join(", ") },
    ],
    asked: [
      { key: "offer", n: o.of.offer, fill: "var(--state-offer)", label: "Made an offer" },
      { key: "open", n: o.of.open, fill: "var(--state-agent)", label: "Still with the agent" },
      { key: "saidNo", n: o.of.saidNo, fill: "var(--state-closed)", label: "Read it, then said no" },
      { key: "withdrew", n: o.of.withdrew, fill: "var(--state-closed)", label: "You withdrew" },
    ],
  };
}

export function s1Readings(v: V24): Reading[] {
  const o = v.outcomes;
  if (o.asked === 0) {
    return [
      { fig: "None", line: `asked to read more, of ${o.sent}` },
      { fig: "None", line: "asked for the whole book" },
      { fig: "None", line: "offer so far" },
    ];
  }
  const offers = o.of.offer;
  return [
    { fig: `1 in ${Math.round(o.sent / o.asked)}`, line: `agents asked to read more (${o.asked} of ${o.sent})` },
    { fig: o.full === 0 ? "None" : `${o.full} of ${o.asked}`, line: o.full === 0 ? "asked for the whole book" : "of those asked for the whole book" },
    { fig: offers === 0 ? "None" : String(offers), line: `${offers === 1 ? "offer" : "offers"} so far${o.full > 0 ? `, from the ${o.full} full ${o.full === 1 ? "read" : "reads"}` : ""}` },
  ];
}

export const S1Body: React.FC<{ v: V24 }> = ({ v }) => {
  const o = v.outcomes;
  const s = s1Slices(v);
  return (
    <div className="a24-pies" data-a24="pies">
      <Block title={`All ${o.sent} ${o.sent === 1 ? "query" : "queries"}`} probe="piebox-all">
        <div className="a24-pierow">
          <Pie size={210} slices={s.all} probe="pie-all" label={s.all.filter((x) => x.n).map((x) => `${x.n} ${x.label.toLowerCase()}`).join(", ")} />
          <Legend slices={s.all} />
        </div>
      </Block>
      <Block title={o.asked ? `The ${o.asked} who asked to read more` : undefined} probe="piebox-asked">
        {o.asked ? (
          <div className="a24-pierow">
            <Pie size={150} slices={s.asked} probe="pie-asked" label={s.asked.filter((x) => x.n).map((x) => `${x.n} ${x.label.toLowerCase()}`).join(", ")} />
            <Legend slices={s.asked} />
          </div>
        ) : <p className="a24-none" data-a24="none-asked">No agent has asked to read more yet.</p>}
      </Block>
    </div>
  );
};
