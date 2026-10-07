/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The numbers strip (Contact list v13 §3; ref design-refs/contact-list-v13.html, `#statB .strip`):
 * one white card under the band, five equal cells divided by hairlines — a mono-caps label, a
 * Special Elite figure and an italic line under it.
 *
 * ⚠️ v14: NO CELL IS PRESSABLE. The three that filled v13's carousel are plain facts now (the carousel
 * is retired), and no figure has ever been able to reach the list's filters.
 */
import React from "react";
import type { StripFacts } from "../../../lib/contactStrip";

interface Props {
  facts: StripFacts;
}

/* ⚠️ v14 §1.3 — THE FIGURES ARE NOT PRESSABLE. They filled the carousel, which is retired; a figure is
   a fact to read, never a control, and it never filters the list (lock 2). Every cell is the same plain
   element, so nothing about one figure invites a press the others do not. */
const Cell: React.FC<{ label: string; figure: React.ReactNode; line: React.ReactNode; children?: React.ReactNode }> = ({ label, figure, line, children }) => (
  <div className="cl13-sc" data-cl13-cell={label}>
    <small className="cl13-sl">{label}</small>
    <b className="cl13-sf">{figure}</b>
    <em className="cl13-se">{line}</em>
    {children}
  </div>
);

export const ContactStrip: React.FC<Props> = ({ facts }) => {
  const peak = Math.max(1, ...facts.spark);
  return (
    <section className="cl13-strip" data-cl13="strip" aria-label="Your list in numbers">
      <Cell label="On file" figure={facts.onFile}
        line={`agents, across ${facts.agencies} ${facts.agencies === 1 ? "agency" : "agencies"}`}>
        <span className="cl13-spark" aria-hidden="true" data-cl13="spark">
          {facts.spark.map((v, i) => (
            <i key={i} style={{ height: `${Math.max(8, Math.round((v / peak) * 100))}%` }} data-v={v} />
          ))}
        </span>
      </Cell>
      <Cell label="Fit your book" figure={facts.fit} line={facts.fitLine ?? "no manuscript genre set"} />
      <Cell label="Open now" figure={facts.open} line={`${facts.closed} closed for now`} />
      <Cell label="Typical reply"
        figure={facts.medianWeeks == null ? "—" : <>{facts.medianWeeks}<i>wks</i></>}
        line={facts.fastest ? `fastest: ${facts.fastest.name}, ${facts.fastest.weeks} wk${facts.fastest.weeks === 1 ? "" : "s"}` : "no reply times recorded yet"} />
      <Cell label="Added this month" figure={`+${facts.addedThisMonth}`}
        line={facts.last ? `last: ${facts.last.name}, ${facts.last.date}` : "nothing added yet"} />
    </section>
  );
};
