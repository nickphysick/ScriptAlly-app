/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138 §I — THE EMPTY PAGE (ref design-refs/query-centre-v138/query-centre-v138-empty.html). With no
 * queries: the navy header with the map courier ("Every query, in one place"), "How it works" over one example
 * query, the three points, and "Ways to get started". No list, filters or glyph row.
 *
 * ⚠️ THE EXAMPLE IS FIXED SAMPLE CONTENT, LABELLED AS AN EXAMPLE (`EXAMPLE_QUERY`): plain words in this file. It is
 *    never a `Query`, never written and never counted; nothing here reads the writer's data but the book's title.
 * ⚠️ THE YOUR-MOVE STOPS CARRY THE DASHED OUTER RING (the header's `StageGlyph`), and the band under them reads
 *    "Your move" / "With the agent", the words the list's groups use.
 * ⚠️ BUILT FROM CONTACT LIST v17's EMPTY PAGE AND ITS VALUES: "How it works" and "Ways to get started" exist on
 *    both pages now, page-local, and are lift candidates.
 * ⚠️ THE THREE WAYS ARE THE EXISTING DOORS: Smart import is the Import page, the template is the same download the
 *    Contact list offers, and logging by hand is the page's own "+ Log a query".
 */
import React from "react";
import { StageGlyph } from "./StageGlyph";
import { QC_EYEBROW } from "./QcHeader138";
import { HERO_COURIER_MAP } from "./qcArt";
import { AgentDisc } from "../../shared/AgentDisc";
import type { GlyphKey } from "../../../lib/qc138";
import "./qcvEmpty138.css";

export const QC_TEMPLATE_HREF = "/QueryHawk-pipeline-import-template.xlsx";
export const EXAMPLE_QUERY_LABEL = "An example query";
export const EXAMPLE_QUERY = {
  initials: "EW", name: "Eleanor Whitfield", agency: "Greenfield Literary",
  stops: [
    { k: "q", label: "Query sent", date: "14 Mar", yours: false },
    { k: "pr", label: "Partial requested", date: "2 Apr", yours: true },
    { k: "ps", label: "Partial sent", date: "9 Apr", yours: false },
    { k: "fr", label: "Full requested", date: "30 Apr", yours: true },
    { k: "fs", label: "Full sent", date: "3 May", yours: false },
    { k: "of", label: "An offer", date: "12 Jun", yours: true },
  ] as { k: GlyphKey; label: string; date: string; yours: boolean }[],
};
export const EMPTY_KEY = {
  yours: "Your move: something to send, decide or chase",
  agent: "With the agent: QueryHawk counts the days. Once their date passes, a nudge becomes your move",
  ring: "Dashed ring: the ball is in your court",
};
export const EMPTY_POINTS = [
  { k: "log", title: "Log it once", line: "Who you queried, when, and what went with it. Every reply after that builds the timeline for you." },
  { k: "move", title: "See whose move it is", line: "Requests, offers and overdue replies all land in Your move, so you always know which ones need you today." },
  { k: "date", title: "Never miss a date", line: "Every next step gets a date, and the list counts down to it. Past the date, it turns rust and rises to the top." },
];

const POINT_ICON: Record<string, React.ReactNode> = {
  log: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><rect x="3.5" y="6" width="17" height="12" rx="1.5" /><path d="m4 7 8 6 8-6" /></svg>,
  move: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="12" r="3.6" /><circle cx="16" cy="12" r="3.6" /></svg>,
  date: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></svg>,
};

const book = (title: string | null): React.ReactNode => (title ? <i className="qc138-ems">{title}</i> : "your book");

export const QcEmpty138: React.FC<{
  manuscriptTitle: string | null;
  onLog: () => void;
  onImport: () => void;
  logRef?: React.Ref<HTMLButtonElement>;
}> = ({ manuscriptTitle, onLog, onImport, logRef }) => (
  <div className="qc138-empty" data-qcv-empty="" data-qc138="empty">
    <header className="qc138-eh" data-qc138="empty-header" data-own-header="">
      <div className="qc138-eh-t">
        <span className="qc138-eh-ey">{QC_EYEBROW}</span>
        <h1 className="qc138-eh-title" data-page-title="" aria-label="Every query, in one place"><span aria-hidden="true">Every query,<br />in one place</span></h1>
        <p className="qc138-eh-line" data-qc138="empty-line">
          Log the queries you send for {book(manuscriptTitle)}, and QueryHawk keeps track of where each one stands and what to do next.
        </p>
        <div className="qc138-eh-acts">
          <button type="button" className="qc138-eh-b1" data-qcv="oh-log" data-qc138="empty-log" ref={logRef} onClick={onLog}>+ Log your first query</button>
          <button type="button" className="qc138-eh-b2" data-qc138="empty-import" onClick={onImport}>Import the ones you{"’"}ve sent</button>
        </div>
      </div>
      <img className="qc138-eh-art" data-qc138="empty-art" alt="" aria-hidden="true" src={`${HERO_COURIER_MAP.src}?v=${HERO_COURIER_MAP.version}`} />
    </header>

    <section className="qc138-how" data-qc138="how" aria-labelledby="qc138-how-h">
      <div className="qc138-sh"><h2 id="qc138-how-h">How it works</h2><span>One query, from send to offer</span></div>
      <div className="qc138-how-card" data-qc138="example">
        <div className="qc138-ex-who">
          <AgentDisc initials={EXAMPLE_QUERY.initials} standing="querying" size={44} />
          <span className="qc138-ex-nm"><b>{EXAMPLE_QUERY.name}</b><i>{EXAMPLE_QUERY.agency}</i></span>
          <span className="qc138-ex-k" data-qc138="example-label">{EXAMPLE_QUERY_LABEL}</span>
        </div>
        <ol className="qc138-ex-tl" data-qc138="example-timeline">
          {EXAMPLE_QUERY.stops.map((s) => (
            <li key={s.k} className="qc138-ex-st" data-qc138="example-stop" data-yours={s.yours ? "" : undefined}>
              <span className="qc138-ex-d">{s.date}</span>
              <StageGlyph k={s.k} className="qc138-ex-g" />
              <span className="qc138-ex-l">{s.label}</span>
              <span className={`qc138-ex-b${s.yours ? " you" : ""}`} data-qc138="example-band">{s.yours ? "Your move" : "With the agent"}</span>
            </li>
          ))}
        </ol>
        <div className="qc138-ex-key" data-qc138="example-key">
          <span><i className="qc138-kk-you" aria-hidden="true" />{EMPTY_KEY.yours}</span>
          <span><i className="qc138-kk-agent" aria-hidden="true" />{EMPTY_KEY.agent}</span>
          <span><StageGlyph k="key" className="qc138-kk-ring" />{EMPTY_KEY.ring}</span>
        </div>
      </div>
      <div className="qc138-points" data-qc138="points">
        {EMPTY_POINTS.map((p) => (
          <div key={p.k} className="qc138-pt" data-qc138="point">
            <span className="qc138-pt-i" aria-hidden="true">{POINT_ICON[p.k]}</span>
            <h3>{p.title}</h3>
            <p>{p.line}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="qc138-ways" data-qc138="ways" aria-labelledby="qc138-ways-h">
      <div className="qc138-sh"><h2 id="qc138-ways-h">Ways to get started</h2><span>Pick whichever suits you</span></div>
      <div className="qc138-ways-g">
        <div className="qc138-way qc138-way--pri" data-qc138="way" data-k="import">
          <em className="qc138-way-tag">Quickest</em>
          <h3>Smart import</h3>
          <p>Paste your spreadsheet or a list of the queries you{"’"}ve sent. QueryHawk sorts it into queries, agents and dates for you to check.</p>
          <button type="button" data-qc138="way-import" onClick={onImport}>Start a Smart import</button>
          <small>One free import comes with your account</small>
        </div>
        <div className="qc138-way" data-qc138="way" data-k="template">
          <h3>Use our template</h3>
          <p>Fill in a ready-made spreadsheet at your own pace, then upload it.</p>
          <a data-qc138="way-template" href={QC_TEMPLATE_HREF} download>Download the template</a>
        </div>
        <div className="qc138-way" data-qc138="way" data-k="log">
          <h3>Add one by hand</h3>
          <p>Log a query you{"’"}ve just sent, with the agent and what went with it.</p>
          <button type="button" data-qc138="way-log" onClick={onLog}>+ Log a query</button>
        </div>
      </div>
    </section>
  </div>
);
