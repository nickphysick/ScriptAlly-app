/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v21 §I — THE EMPTY PAGE (design-refs/analytics-v21/analytics-v21.html, `.ae`): with no queries for the
 * manuscript, none of the header card, the desk, the sections or the tab — a navy panel with the Archivist
 * ("Every reply, counted"), "How it works" over one example, three points, and "Ways to get started".
 *
 * ⚠️ BUILT LIKE PACKAGES v4's AND THE QUERY CENTRE's EMPTY PAGES, PAGE-LOCAL: all three build these parts on their
 *    own (`QcEmpty138`, `PkgEmpty4`, this), and they are lift candidates together.
 * ⚠️ THE EXAMPLE IS FIXED SAMPLE CONTENT (`AN_EXAMPLE`), PLAIN WORDS IN THIS FILE: never a `Query`, never written and
 *    never counted. Nothing here reads the writer's data but the book's title.
 * ⚠️ THE THREE WAYS ARE THE EXISTING DOORS: Smart import is the Import page, the template is the same download the
 *    Query Centre and the Contact list offer, and logging by hand is the drawer's log journey. Logging the first
 *    query switches the page to its populated state through the live data, with no reload.
 */
import React from "react";
import { openQueryDrawer } from "../../lib/queryActions/drawerStore";

export const AN_EMPTY_ART = { src: "/images/analytics/analytics-archivist.webp", version: 1 };
export const AN_TEMPLATE_HREF = "/QueryHawk-pipeline-import-template.xlsx";
/** The example: fixed sample content, labelled as an example. */
export const AN_EXAMPLE = {
  note: "An example, after 27 queries",
  logged: { k: "Logged", v: "27 queries", s: "10 replies recorded" },
  figs: [
    { k: "Request rate", v: "37%", s: "10 of 27 asked for more" },
    { k: "Median wait", v: "47 days", s: "from query to reply" },
    { k: "Inside the window", v: "5 of 10", s: "replies on time" },
  ],
  key: ["Figures appear with your first answer", "Rates firm up after five answers", "Nothing is estimated: every figure comes from what you logged"],
};
const POINTS = [
  { k: "req", title: "Requests and passes", line: "How many agents asked for a partial or a full, how many passed, and how that changes month to month.",
    icon: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 4.5h13v8.5h-7.2L5.5 16v-3H3.5z" /></svg> },
  { k: "wait", title: "Wait times", line: "How long each step takes, and whether replies came inside the window each agency states.",
    icon: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l3 2" /></svg> },
  { k: "work", title: "What’s working", line: "Which letters, packages and versions went out with the queries that drew requests.",
    icon: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15V9M10 15V5M16 15v-3" /></svg> },
];

export const A21Empty: React.FC<{ title: string | null; onImport: () => void }> = ({ title, onImport }) => {
  const book = title ? <span className="a21-aems">{title}</span> : "your book";
  const log = () => openQueryDrawer({ mode: "log" });
  return (
    <section className="a21-ae" data-a21="empty" aria-label="Analytics, before any queries">
      <div className="a21-aepanel" data-a21="empty-panel" data-own-header="">
        <div className="a21-aet">
          <p className="a21-aek">&mdash; ANALYTICS &mdash;</p>
          <h1 data-page-title="" aria-label="Every reply, counted"><span aria-hidden="true">Every reply,<br />counted</span></h1>
          <p className="a21-aep">Log the queries you send for {book} and record what comes back. QueryHawk works out how often agents ask for more, how long they take, and where queries stall.</p>
          <div className="a21-aeb">
            <button type="button" className="a21-aeb1" data-a21="empty-log" onClick={log}>+ Log your first query</button>
            <button type="button" className="a21-aeb2" data-a21="empty-import" onClick={onImport}>Import the ones you{"’"}ve sent</button>
          </div>
        </div>
        <div className="a21-aeart"><img data-a21="empty-art" alt="" aria-hidden="true" src={`${AN_EMPTY_ART.src}?v=${AN_EMPTY_ART.version}`} /></div>
      </div>

      <h2 className="a21-aeh">How it works <small>Your queries, read back as numbers</small></h2>
      <div className="a21-aeex" data-a21="example">
        <div className="a21-aeexh"><b>{title ?? "Your book"}</b><em data-a21="example-label">{AN_EXAMPLE.note}</em></div>
        <div className="a21-aeflow">
          <div className="a21-aein"><span>{AN_EXAMPLE.logged.k}</span><b>{AN_EXAMPLE.logged.v}</b><small>{AN_EXAMPLE.logged.s}</small></div>
          <span className="a21-aearr" aria-hidden="true">&rarr;</span>
          {AN_EXAMPLE.figs.map((f) => <div key={f.k} className="a21-aefig"><span>{f.k}</span><b>{f.v}</b><small>{f.s}</small></div>)}
        </div>
        <div className="a21-aelg">
          {AN_EXAMPLE.key.map((k, i) => <span key={k}><i className={`k${i + 1}`} aria-hidden="true" />{k}</span>)}
        </div>
      </div>
      <div className="a21-aethree">
        {POINTS.map((p) => <div key={p.k} data-a21="point"><span className="a21-aeic" aria-hidden="true">{p.icon}</span><h3>{p.title}</h3><p>{p.line}</p></div>)}
      </div>

      <h2 className="a21-aeh">Ways to get started <small>Pick whichever suits you</small></h2>
      <div className="a21-aeways" data-a21="ways">
        <div className="w1" data-a21="way" data-k="import"><span className="tag">Quickest</span><h3>Smart import</h3>
          <p>Paste your spreadsheet or a list of the queries you{"’"}ve sent. QueryHawk sorts it into queries, agents and dates for you to check.</p>
          <button type="button" data-a21="way-import" onClick={onImport}>Start a Smart import</button></div>
        <div data-a21="way" data-k="template"><h3>Use our template</h3>
          <p>Fill in a ready-made spreadsheet at your own pace, then upload it.</p>
          <a data-a21="way-template" href={AN_TEMPLATE_HREF} download>Download the template</a></div>
        <div data-a21="way" data-k="log"><h3>Add one by hand</h3>
          <p>Log a query you{"’"}ve just sent, with the agent and what went with it.</p>
          <button type="button" data-a21="way-log" onClick={log}>Log a query</button></div>
      </div>
    </section>
  );
};
