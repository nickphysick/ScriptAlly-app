/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The numbers strip (Contact list v13 §3; ref design-refs/contact-list-v13.html, `#statB .strip`):
 * one white card under the band, five equal cells divided by hairlines — a mono-caps label, a
 * Special Elite figure and an italic line under it.
 *
 * ⚠️ THREE CELLS ARE PRESSABLE AND THEY FILL THE CAROUSEL — NEVER THE LIST (§1.3, lock 3). Fit your
 * book, Open now and Added this month hand a key up; the page decides what the carousel shows. This
 * component has no way to reach the list's filters, which is the structural half of that lock.
 * On file and Typical reply are statements, not doors, and render as plain cells.
 */
import React from "react";
import type { StripFacts } from "../../../lib/contactStrip";

export type FigureKey = "fit" | "open" | "added";

interface Props {
  facts: StripFacts;
  /** the pressed figure, or null */
  selected: FigureKey | null;
  onPress: (k: FigureKey) => void;
}

const Cell: React.FC<{
  label: string; figure: React.ReactNode; line: React.ReactNode; k?: FigureKey;
  selected?: boolean; onPress?: (k: FigureKey) => void; children?: React.ReactNode;
}> = ({ label, figure, line, k, selected, onPress, children }) => {
  const body = (
    <>
      <small className="cl13-sl">{label}</small>
      <b className="cl13-sf">{figure}</b>
      <em className="cl13-se">{line}</em>
      {children}
    </>
  );
  if (!k || !onPress) return <div className="cl13-sc" data-cl13-cell={label}>{body}</div>;
  return (
    <button
      type="button"
      className={`cl13-sc cl13-sc--pr${selected ? " is-on" : ""}`}
      data-cl13-cell={label}
      data-cl13-fig={k}
      aria-pressed={!!selected}
      title={selected ? "In the carousel" : "Show in carousel"}
      onClick={() => onPress(k)}
    >
      {body}
    </button>
  );
};

export const ContactStrip: React.FC<Props> = ({ facts, selected, onPress }) => {
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
      <Cell label="Fit your book" figure={facts.fit} line={facts.fitLine ?? "no manuscript genre set"}
        k="fit" selected={selected === "fit"} onPress={onPress} />
      <Cell label="Open now" figure={facts.open} line={`${facts.closed} closed for now`}
        k="open" selected={selected === "open"} onPress={onPress} />
      <Cell label="Typical reply"
        figure={facts.medianWeeks == null ? "—" : <>{facts.medianWeeks}<i>wks</i></>}
        line={facts.fastest ? `fastest: ${facts.fastest.name}, ${facts.fastest.weeks} wk${facts.fastest.weeks === 1 ? "" : "s"}` : "no reply times recorded yet"} />
      <Cell label="Added this month" figure={`+${facts.addedThisMonth}`}
        line={facts.last ? `last: ${facts.last.name}, ${facts.last.date}` : "nothing added yet"}
        k="added" selected={selected === "added"} onPress={onPress} />
    </section>
  );
};
