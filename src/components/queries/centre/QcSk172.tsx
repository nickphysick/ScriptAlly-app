/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172 — the loading shell for the ledger list and the smart filter panel. Inert shapes on the page's own
 * frames: the list keeps its card and heading row, the panel keeps its navy header and section lines. No figure is drawn
 * until the data has landed.
 */
import React from "react";

const W1 = [72, 58, 80, 64, 70, 54];
const W2 = [48, 62, 40, 56, 44, 60];

const Row: React.FC<{ i: number }> = ({ i }) => (
  <div className="sk172-row">
    <i className="sk172-seal" />
    <span className="sk172-who"><i style={{ width: `${W1[i % 6]}%` }} /><i className="sm" style={{ width: `${W2[i % 6]}%` }} /></span>
    <span className="sk172-trk"><i className="d" /><i className="ln" /><i className="d" /><i className="ln" /><i className="d" /><i className="ln" /><i className="d" /></span>
    <span><i style={{ width: 58 }} /></span>
    <span />
    <span className="sk172-nx"><i style={{ width: 112 }} /><i className="sm" style={{ width: 84 }} /></span>
  </div>
);

export const Skeleton172: React.FC = () => (
  <div className="sk172" data-qc172="skeleton" aria-hidden="true">
    {[5, 3].map((n, g) => (
      <section key={g} className="sk172-grp">
        <div className="sk172-sec"><i style={{ width: g ? 168 : 128 }} /><i className="n" /></div>
        {Array.from({ length: n }, (_, i) => <Row key={i} i={i + g * 5} />)}
      </section>
    ))}
  </div>
);

export const RailSk172: React.FC = () => (
  <aside className="qs172 sk172-rail" aria-hidden="true">
    <header className="qs172-h"><b>Filter</b></header>
    <div className="qs172-q">
      <div className="qs172-seg">{[0, 1, 2].map((k) => <span key={k} className="sk172-qp"><i className="big" /><i className="sm" /></span>)}</div>
      <span className="sk172-ck"><i className="box" /><i style={{ width: 96 }} /></span>
    </div>
    <section className="qs172-s"><i className="sk172-t" /><span className="sk172-stg">{[0, 1, 2, 3].map((k) => <i key={k} className="d" />)}</span></section>
    <section className="qs172-s"><i className="sk172-t" /><span className="sk172-base" /><i className="sk172-track" /></section>
    <section className="qs172-s"><i className="sk172-t" style={{ width: 132 }} /><span className="sk172-base" /><i className="sk172-track" /></section>
    <section className="qs172-s"><i className="sk172-t" style={{ width: 140 }} /><span className="sk172-base" /><i className="sk172-track" /></section>
    <section className="qs172-s"><i className="sk172-t" style={{ width: 96 }} /><i className="sm" style={{ width: "80%" }} /></section>
  </aside>
);
