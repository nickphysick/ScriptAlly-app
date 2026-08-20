/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel — the Analytics page's one container: a sage band header over a white body.
 *
 * ⚠️ ONE COMPONENT, NOT A CLASS CONVENTION. Every panel on the page shares a band colour, an icon
 * size, a title face and a right-aligned note slot; nine hand-rolled headers agreeing by copy-paste
 * is how the tenth comes out a pixel different and nobody can say which one is right.
 *
 * ⚠️ THE NOTE IS THE PANEL'S OWN TALLY, and it belongs in the band rather than above the chart.
 * It is where a reader looks for "how many of these are there", so a panel that puts it inside the
 * body has the figure moving as the body's content changes.
 */
import React from "react";
import { PanelIcon, PanelIconName } from "./panelIcons";

export const Panel: React.FC<{
  icon: PanelIconName;
  title: string;
  /** Right-aligned in the band: the panel's own count or median. Absent → nothing drawn. */
  note?: React.ReactNode;
  /** A control in the band, left of the note (the journey's Share card). */
  action?: React.ReactNode;
  /** 12-column grid span. */
  span: 4 | 5 | 6 | 7 | 8 | 12;
  children: React.ReactNode;
}> = ({ icon, title, note, action, span, children }) => (
  <section className={`an-panel an-span${span}`}>
    <div className="an-ph">
      <PanelIcon name={icon} />
      <h2>{title}</h2>
      {action}
      {note ? <span className="an-note">{note}</span> : null}
    </div>
    <div className="an-pb">{children}</div>
  </section>
);

/** A row of panels. The grid is twelve columns; each panel states its own span. */
export const PanelRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="an-grid">{children}</div>
);
