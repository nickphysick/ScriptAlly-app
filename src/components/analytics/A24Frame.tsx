/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v24 §C — ONE QUESTION SECTION (design-refs/analytics-v24/analytics-v24.html, `section.sect.sx`): a
 * kicker, the question as the `h2`, the answer in the first sentence, then ONE white frame holding its blocks and,
 * where the section has them, three readings along its foot. Desktop and phone alike: v24's sections replace v17's
 * phone sections as well as v21's desktop ones.
 *
 * ⚠️ THE HEAD IS `heads(...)` (lib/analyticsV24): the copy is derived and unit-tested, and this file only draws it.
 * ⚠️ THE SECTION TAB AND THE PAGE'S `go` FIND A SECTION BY `[data-a17="sec"][data-sec]`, so the frame keeps v17's
 *    attributes; S1–S7 are `data-sec` 0–6.
 * ⚠️ TINTS: sections 2, 4 and 6 (`TINTED`) take v21's band construction — a background, a 100vmax spread shadow and
 *    an inset clip — so the tint runs to the sheet's edges without widening the page.
 */
import React from "react";
import { TINTED, type Head, type Run } from "../../lib/analyticsV24";

export const Runs: React.FC<{ runs: Run[] }> = ({ runs }) => (
  <>{runs.map((r, i) => (r.b ? <b key={i}>{r.t}</b> : <React.Fragment key={i}>{r.t}</React.Fragment>))}</>
);

export interface Reading { fig: string; line: string }
export const Readings24: React.FC<{ items: Reading[] }> = ({ items }) => (
  <div className="a24-r" data-a24="readings">
    {items.map((r, i) => <div key={i} data-a24="reading"><b data-a24="reading-fig">{r.fig}</b><span>{r.line}</span></div>)}
  </div>
);

/** A block inside the frame: a head with an italic aside, then its figure. A second block opens on a dashed rule. */
export const Block: React.FC<{ title?: string; aside?: string; probe?: string; children: React.ReactNode }> = ({ title, aside, probe, children }) => (
  <div className="a24-blk" data-a24={probe ?? "block"}>
    {title ? <h3>{title}{aside ? <small>{aside}</small> : null}</h3> : null}
    {children}
  </div>
);

export const Sx: React.FC<{ sec: number; head: Head; readings?: Reading[]; children?: React.ReactNode }> = ({ sec, head, readings, children }) => {
  const tint = (TINTED as readonly number[]).includes(sec);
  return (
    <section className={`a24-sx${tint ? " a24-tint" : ""}`} data-a17="sec" data-sec={sec} id={`a17-sec-${sec}`} data-a24="sec" data-a24-tint={tint ? "" : undefined}>
      <header className="a24-h">
        <p className="a24-k" data-a24="kicker">{head.kicker}</p>
        <h2 data-a24="question">{head.title}</h2>
        <p className="a24-a" data-a24="answer"><Runs runs={head.answer} /></p>
      </header>
      <div className="a24-f" data-a24="frame">
        {children}
        {readings && readings.length ? <Readings24 items={readings} /> : null}
      </div>
    </section>
  );
};
