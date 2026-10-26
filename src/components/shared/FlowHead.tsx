/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.1 Part B (design-refs/contact-list-v25-1/, screens 03–09) — THE FLOW'S HEADER IS ITS BAND: a title
 * and, where there is one, a line, on the band's #f3eee8 with a hairline under it and the × at top right. It replaces
 * v25 F's cream panel with the courier or the desk hawk, and the small mono band label the flows used to carry.
 *
 *   Log a query (QcLogFlow149), both steps           "Logging new query" + its line
 *   Add an agent (AgentCardEditor, panel, new agent) "Adding new agent" + its line
 *   Record a response (QcWhoReplied149, then QcQueryCard149's respond mode)
 *                                                    "Recording response"; a line once an answer is picked
 *
 * ⚠️ THE LINE FADES IN WHEN IT CHANGES (keyed by its text): 250ms, from 3px up; none under reduced motion.
 * ⚠️ The h3 is forced to the brand serif by brand.tsx: two classes and !important take the typewriter back.
 */
import React from "react";
import "./flowHead.css";

type Data = Record<`data-${string}`, string>;

export const FLOW_WORDS = {
  log: {
    title: "Logging new query",
    line: "Another one out the door – good work. Let’s get the dates and materials added, then sit back and we’ll remind you if and when you need to nudge.",
  },
  agent: {
    title: "Adding new agent",
    line: "Fill out your agent profile with all the detail you can. A healthy list means better tracking, analysis, suggestions and reminders.",
  },
  record: { title: "Recording response" },
} as const;

/** "What did {first} say?" — the line for each answer, once one is picked. Offer's second sentence is softened to what
 *  the app does: the date asked for is the day the reply came, and the decide-by date is set two weeks on. */
export const RECORD_LINE: Record<"partial" | "full" | "pass" | "offer", string> = {
  partial: "A partial request: they want to read more, and that’s a real step forward. Add the date they asked and the send goes on your to-do list.",
  full: "A full request. They’ve read enough to want the whole book – well done. Add the date and the send goes on your to-do list.",
  pass: "It stings, but every answer gets you closer to the right agent. Add the date and we’ll close the query for you.",
  offer: "An offer of representation. Huge news. Add the date it came in and we’ll set a decision date two weeks on and keep it in front of you.",
};

export const FlowHead: React.FC<{
  title: string;
  line?: string | null;
  onClose: () => void;
  closeLabel?: string;
  /** beside the × (the log flow's Day chip) */
  right?: React.ReactNode;
  data?: Data;
  closeData?: Data;
}> = ({ title, line, onClose, closeLabel = "Close", right, data, closeData }) => (
  <div className="flh" data-flh="head" {...data}>
    <div className="flh-tx">
      <h3 className="flh-t" data-flh="title">{title}</h3>
      {line ? <p key={line} className="flh-l" data-flh="line">{line}</p> : null}
    </div>
    <span className="flh-rt">
      {right}
      <button type="button" className="flh-x" data-flh="close" aria-label={closeLabel} onClick={onClose} {...closeData}>×</button>
    </span>
  </div>
);
