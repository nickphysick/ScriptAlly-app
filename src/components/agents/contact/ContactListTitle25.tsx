/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25 Part C (design-refs/contact-list-v25/, screens 01–03) — "Every agent on file", in the shape of the
 * Query Centre v150.1's list title (`QcListTitle150`): the heading, ruled, and the count line on the left; the
 * List | Cards switch on the right, spanning both lines and level with the count line's foot. The switch moved here
 * out of the navy bar.
 *
 * ⚠️ THE COUNT LINE FOLLOWS THE LIST: "41 agents", or "19 of 41 agents" while a card, Filters or Find narrows it.
 * ⚠️ THE SWITCH WEARS `QcViewSwitch150`'s rules (qcv150.css `.qc150-vsw`, unscoped), not a copy of them.
 * ⚠️ NOT DRAWN IN FULL SCREEN (the address book's band is the list's head there).
 */
import React from "react";
import type { ContactView } from "../../../lib/contactListMemory";
import { countLine, type CountLine } from "../../../lib/contactV25";
import "../../queries/centre/qcv150.css";
import "./contactV25.css";

const LIST_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>;
const CARDS_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>;

export const ContactViewSwitch25: React.FC<{ view: ContactView; onView: (v: ContactView) => void }> = ({ view, onView }) => (
  <div className="qc150-vsw cl25-vsw" role="group" aria-label="How the agents are drawn" data-cl25="switch">
    <button type="button" aria-pressed={view === "list"} data-v="list" data-cl25="view-tab" onClick={() => onView("list")}>{LIST_ICON}List</button>
    <button type="button" aria-pressed={view === "cards"} data-v="cards" data-cl25="view-tab" onClick={() => onView("cards")}>{CARDS_ICON}Cards</button>
  </div>
);

export const ContactListTitle25: React.FC<{
  view: ContactView;
  onView: (v: ContactView) => void;
  /** null while the list settles: the line keeps its height and says nothing */
  line: CountLine | null;
}> = ({ view, onView, line }) => {
  const words = line ? countLine(line) : null;
  return (
    <div className="qc150-lt cl25-lt" data-cl25="title">
      <div className="qc150-ltt"><h2 data-cl25="title-text">Every agent on file</h2></div>
      <p className="qc150-lts" data-cl25="count-line" data-view={view}>
        {words ? (
          <>
            {words.of != null ? <><b data-cl25="count-n">{words.n}</b> of <span data-cl25="count-of">{words.of}</span> {words.agents}</> : <><b data-cl25="count-n">{words.n}</b> {words.agents}</>}
            {" "}&nbsp;·&nbsp; {words.how}
          </>
        ) : " "}
      </p>
      <ContactViewSwitch25 view={view} onView={onView} />
    </div>
  );
};
