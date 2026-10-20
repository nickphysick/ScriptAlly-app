/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v21 §I — THE EMPTY PAGE (design-refs/analytics-v21/analytics-v21.html, `.ae`): with no queries for the
 * manuscript, none of the header card, the desk, the sections or the tab — a navy panel with the Archivist
 * ("Every reply, counted"), the steps card ("How it works.", v24 §I, `A24Steps`), and "Ways to get started".
 *
 * ⚠️ BUILT LIKE PACKAGES v4's AND THE QUERY CENTRE's EMPTY PAGES, PAGE-LOCAL: all three build these parts on their
 *    own (`QcEmpty138`, `PkgEmpty4`, this), and they are lift candidates together.
 * ⚠️ NOTHING HERE READS THE WRITER'S DATA BUT THE BOOK'S TITLE. The steps card's tiles are fixed sample content.
 *    (v21's example card, retired in v24, stated "37%" and "10 of 27": the sample's truth is 26%, 7 of 27.)
 * ⚠️ THE THREE WAYS ARE THE EXISTING DOORS: Smart import is the Import page, the template is the same download the
 *    Query Centre and the Contact list offer, and logging by hand is the drawer's log journey. Logging the first
 *    query switches the page to its populated state through the live data, with no reload.
 */
import React from "react";
import { openQueryDrawer } from "../../lib/queryActions/drawerStore";
import { A24Steps } from "./A24Steps";

export const AN_EMPTY_ART = { src: "/images/analytics/analytics-archivist.webp", version: 1 };
export const AN_TEMPLATE_HREF = "/QueryHawk-pipeline-import-template.xlsx";
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

      {/* v24 §I: the steps card replaces v21's heading, example card and three points */}
      <A24Steps />

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
