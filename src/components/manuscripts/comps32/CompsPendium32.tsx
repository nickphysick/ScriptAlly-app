/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v32 §E: the Comp-pendium — every comp as one table, bound as a book (a navy cloth spine, a stone
 * cover band, a berry ribbon), closed by the Scout strip (the ref's `.tbl`, `.cpd`, `.ribbon`, `.scout-in`). And the
 * day-one card, "How it works" (the ref's `.first`).
 *
 * ⚠️ THE ORDER IS `pendiumOrder`, THE RATES `compRate`, THE NOTE `pendiumNote` (lib/compsShelf). Nothing here counts.
 * ⚠️ THE SCOUT CAN STILL REACH NOTHING: no import of lib/suggestComps. Its one button records the writer's wish to be
 *    told, as ONE leaf (`notifyPrefs.comps`) through the page's own writer, exactly as v30's did.
 */
import React from "react";
import type { CompRow } from "../../../lib/compsLibrary";
import { READY_AT, compRate, statOf } from "../../../lib/compsShelf";
import { HOW_FOOT, HOW_STEPS30 } from "../comps30/CompsHow30";
import { Ic32 } from "./marks32";

export const SCOUT_ART = "/images/contact/discover-binoculars-bird.webp";
export const SCOUT_LINE = "The Scout will look for recent books, films and shows like yours, check they’re real and in print, and bring them here for you to add or pass on.";

const PctCell: React.FC<{ r: CompRow }> = ({ r }) => {
  const q = r.queries.length;
  if (!q) return <em>{statOf(r).kind === "draft" ? "In a draft letter" : "Not used yet"}</em>;
  if (q < READY_AT) return <><span className="cp32-tr is-na" aria-hidden="true" /><em>Too early to say</em></>;
  const p = compRate(r)!;
  return <><span className="cp32-tr" aria-hidden="true"><i style={{ width: `${p}%` }} /></span>{p}%</>;
};

export const CompsPendium32: React.FC<{
  rows: CompRow[];
  note: { lq: number; lm: number; tot: number } | null;
  scoutAsked: boolean;
  onOpen: (key: string) => void;
  onScout: () => void;
}> = ({ rows, note, scoutAsked, onOpen, onScout }) => {
  const n = rows.length;
  return (
    <section className="cp32-rc cp32-tbl" data-cp="pendium" aria-labelledby="cp32-pendium-h">
      <div className="cp32-rc-in">
        <div className="cp32-cpd" data-cp="pendium-cover">
          <span className="cp32-cpd-ic" aria-hidden="true"><Ic32 n="open" /></span>
          <div>
            <h2 className="cp32-cpdh" id="cp32-pendium-h">The Comp-pendium</h2>
            <p data-cp="pendium-sub">{n === 1 ? "Your one comp" : `All ${n} of your comps`}, ranked ones first. A comp is ranked once it has been sent with {READY_AT} queries.</p>
          </div>
          <i className="cp32-ribbon" aria-hidden="true" data-cp="ribbon" />
        </div>
        <table>
          <thead>
            <tr>
              <th scope="col">Comp</th><th scope="col">Letters</th><th scope="col">Queries</th><th scope="col">Asked for more</th>
              <th scope="col"><span data-cp="th-pct">Percentage</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const q = r.queries.length;
              return (
                <tr key={r.key} tabIndex={0} data-cp="pendium-row" data-key={r.key} data-cx-key={`pr:${r.key}`}
                  onClick={() => onOpen(r.key)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onOpen(r.key); } }}>
                  <td>
                    <div className="cp32-who">
                      <span className="cp32-rdisc" aria-hidden="true"><Ic32 n={r.kind} /></span>
                      <div><b>{r.comp.title}</b><em>{[r.comp.author?.trim(), r.comp.year ? String(r.comp.year) : ""].filter(Boolean).join(" · ")}</em></div>
                    </div>
                  </td>
                  <td data-cp="pc-letters">{r.letters.length || "–"}</td>
                  <td data-cp="pc-queries">{q || "–"}</td>
                  <td data-cp="pc-asked">{q ? r.askedForMore : "–"}</td>
                  <td><div className="cp32-rate" data-cp="pc-pct"><PctCell r={r} /></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {note ? (
          <p className="cp32-tbln" data-cp="pendium-note">
            {note.lq} of your {note.tot} {note.tot === 1 ? "query" : "queries"} mentioned comps, and {note.lm} of those agents asked for more.
            {" "}Comps in the same letter go to the same agents, so they share that letter&rsquo;s results.
          </p>
        ) : null}
        <div className="cp32-scout" data-cp="scout">
          <img className="cp32-perch" alt="" src={SCOUT_ART} width={118} height={118} />
          <div>
            <h3 className="cp32-scth">Need more to choose from? <span>Coming soon</span></h3>
            <p>{SCOUT_LINE}</p>
          </div>
          <button type="button" className="cp32-btn" data-cp="scout-btn" aria-pressed={scoutAsked} onClick={onScout}>
            {scoutAsked ? "We’ll let you know" : "Tell me when it’s ready"}
          </button>
        </div>
      </div>
    </section>
  );
};

/** Day one: Nick's three steps in one Dashboard card, each on an oat panel with its drawing (ref screen 15). */
export const CompsFirst32: React.FC = () => (
  <section className="cp32-rc cp32-first" data-cp="how-steps" aria-labelledby="cp32-first-h">
    <div className="cp32-rc-in"><div className="cp32-first-in">
      <h2 className="cp32-firsth" id="cp32-first-h">How it works</h2>
      <ol className="cp32-steps">
        {HOW_STEPS30.map((s, i) => (
          <li key={s.art} data-cp="how-step">
            <span className="cp32-slot"><img src={`${s.art}?v=${s.v}`} width={s.w} height={s.h} alt="" /></span>
            <b><span className="cp32-stepn" aria-hidden="true">{i + 1}</span>{s.head}</b>
            {s.line}
          </li>
        ))}
      </ol>
      <p data-cp="how-foot">{HOW_FOOT}</p>
    </div></div>
  </section>
);
