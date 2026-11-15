/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v21 §I — THE EMPTY PAGE (design-refs/analytics-v21/analytics-v21.html, `.ae`): with no queries for the
 * manuscript, none of the desk, the sections or the tab — the steps card ("How it works.", v24 §I, `A24Steps`) and "Ways
 * to get started". (Workspace headers v1: the navy panel that opened it is the page's navy header now, in its day-one
 * state — "No queries yet", "+ Log your first query" and "Import the ones you've sent".)
 *
 * ⚠️ BUILT LIKE PACKAGES v4's AND THE QUERY CENTRE's EMPTY PAGES, PAGE-LOCAL: all three build these parts on their
 *    own (`QcEmpty138`, `PkgEmpty4`, this), and they are lift candidates together.
 * ⚠️ NOTHING HERE READS THE WRITER'S DATA BUT THE BOOK'S TITLE. The steps card's tiles are fixed sample content.
 *    (v21's example card, retired in v24, stated "37%" and "10 of 27": the sample's truth is 26%, 7 of 27.)
 * ⚠️ THE TWO WAYS ARE THE EXISTING DOORS: Smart import is the Import page, and logging by hand is the drawer's log
 *    journey. (The template's tile went on 14 Nov, overnight fixes v1.) Logging the first
 *    query switches the page to its populated state through the live data, with no reload.
 */
import React from "react";
import { openQueryDrawer } from "../../lib/queryActions/drawerStore";
import { A24Steps } from "./A24Steps";

export const A21Empty: React.FC<{ onImport: () => void }> = ({ onImport }) => {
  const log = () => openQueryDrawer({ mode: "log" });
  return (
    <section className="a21-ae" data-a21="empty" aria-label="Analytics, before any queries">
      {/* v24 §I: the steps card replaces v21's heading, example card and three points */}
      <A24Steps />

      <h2 className="a21-aeh">Ways to get started <small>Pick whichever suits you</small></h2>
      <div className="a21-aeways" data-a21="ways">
        <div className="w1" data-a21="way" data-k="import"><span className="tag">Quickest</span><h3>Smart import</h3>
          <p>Paste your spreadsheet or a list of the queries you{"’"}ve sent. QueryHawk sorts it into queries, agents and dates for you to check.</p>
          <button type="button" data-a21="way-import" onClick={onImport}>Start a Smart import</button></div>
        <div data-a21="way" data-k="log"><h3>Add one by hand</h3>
          <p>Log a query you{"’"}ve just sent, with the agent and what went with it.</p>
          <button type="button" data-a21="way-log" onClick={log}>Log a query</button></div>
      </div>
    </section>
  );
};
