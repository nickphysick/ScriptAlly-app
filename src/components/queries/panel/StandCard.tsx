/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StandCard — "where things stand", closing the panel's ledger across all three columns (Query panel v2 §C;
 * ref `#qdroot .now`). It draws `lib/standCard`'s view and decides nothing: the court's tint, a heading, a
 * figure (rust once its date has gone), one paragraph, and — for a query with the agent — a 6px bar with a label
 * at each end.
 *
 * It replaces the timeline's trailing verdict lines and its loose "Mark closed": the footer's doors act, this
 * card only says.
 */
import React from "react";
import { STAND_LINK_LABEL, type StandCardView, type StandLink } from "../../../lib/standCard";

/**
 * The links under the paragraph are quiet text (ruling 3): each is wired by the page to the control that
 * already did that job. "Set a date" opens its slider in place — `renderSetDate` draws it, and the link
 * stands down while it is open.
 */
export const StandCard: React.FC<{
  view: StandCardView;
  onLink?: (link: StandLink, anchor: HTMLElement) => void;
  renderSetDate?: (close: () => void) => React.ReactNode;
}> = ({ view, onLink, renderSetDate }) => {
  const [setting, setSetting] = React.useState(false);
  const links = onLink ? view.links.filter((l) => l !== "setDate" || (!!renderSetDate && !setting)) : [];
  return (
  <section className={`qsc qsc--${view.tone}`} data-qp="stand" data-tone={view.tone} data-past={view.past ? "true" : undefined} aria-label="Where things stand">
    <div className="qsc-h">
      {/* not a heading element: brand.tsx forces h1–h3 into the brand serif */}
      <b role="heading" aria-level={3} data-qp="stand-heading">{view.heading}</b>
      {view.figure ? <span className={view.past ? "hot" : undefined} data-qp="stand-figure">{view.figure}</span> : null}
    </div>
    <p data-qp="stand-text">{view.paragraph.map((p, i) => (p.em ? <i key={i}>{p.text}</i> : <React.Fragment key={i}>{p.text}</React.Fragment>))}</p>
    {links.length > 0 ? (
      <div className="qsc-links" data-qp="stand-links">
        {links.map((l) => (
          <button key={l} type="button" className="qsc-link" data-qp="stand-link" data-link={l}
            onClick={(e) => (l === "setDate" ? setSetting(true) : onLink!(l, e.currentTarget))}>{STAND_LINK_LABEL[l]}</button>
        ))}
      </div>
    ) : null}
    {setting && renderSetDate && view.links.includes("setDate") ? <div className="qsc-set" data-qp="stand-setdate" ref={(el) => el?.scrollIntoView({ block: "nearest" })}>{renderSetDate(() => setSetting(false))}</div> : null}
    {view.bar ? (
      <>
        <div className={`qsc-bar${view.bar.hot ? " hot" : ""}`} data-qp="stand-bar" aria-hidden="true"><i style={{ width: `${view.bar.pct}%` }} /></div>
        <div className="qsc-bl"><span>{view.bar.left}</span><span>{view.bar.right}</span></div>
      </>
    ) : null}
  </section>
  );
};
