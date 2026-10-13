/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v17 §F — THE EMPTY PAGE. With no agents on file: the full navy header ("Every agent, in one
 * place"), "How it works" over one example agent, and "Ways to get started". No list, filters or pinned row.
 *
 * ⚠️ THE EXAMPLE AGENT IS FIXED SAMPLE CONTENT, LABELLED AS AN EXAMPLE (`EXAMPLE_AGENT`): plain words in this
 *    file, drawn with the agent panel's own index-card styles. It is never an `Agent`, never written anywhere
 *    and never counted; nothing here reads the writer's data except the manuscript's title.
 * ⚠️ THE THREE WAYS ARE WIRED TO THE EXISTING DOORS: Smart import is the Import page (one free Smart Import
 *    comes with every account: lib/smartImportConfirm), the template is the same download `ContactWays` offers,
 *    and adding by hand is the page's own "+ Add an agent".
 * ⚠️ PAGE-LOCAL. The Query Centre has no empty page in this shape to share; "How it works" and "Ways to get
 *    started" are lift candidates (the v17 report lists them).
 */
import React from "react";
import { CONTACT_DISC_HAWK } from "./ContactOpenHeader";
import { CONTACT_TEMPLATE_HREF } from "./ContactWays";
import { CONTACT_EYEBROW } from "./ContactLightHeader";
import "../panel/agentPanel.css";
import "./contactV17.css";

export const EXAMPLE_LABEL = "An example agent";
export const EXAMPLE_AGENT = {
  initials: "HV", name: "Harriet Vale", place: "Vale & Moss Literary · London", door: "Open to queries",
  rows: [
    { key: "wishlist", label: "Looking for", answer: "“Pacy crime with a strong sense of place.”" },
    { key: "genres", label: "Genres", chips: [{ label: "Thriller", hit: true }, { label: "Crime", hit: false }] },
    { key: "replies", label: "Replies", answer: "In about 6 weeks", note: "No reply means no" },
    { key: "send", label: "Send them", answer: "Query letter · Synopsis · First 3 chapters" },
  ],
} as const;

const book = (title: string | null): React.ReactNode => (title ? <i className="cl17-ems">{title}</i> : "your book");

export const ContactEmptyPage: React.FC<{
  manuscriptTitle: string | null;
  onAdd: () => void;
  onImport: () => void;
  addRef?: React.Ref<HTMLButtonElement>;
}> = ({ manuscriptTitle, onAdd, onImport, addRef }) => (
  <div className="clv-group cl17-empty" data-clv-empty="" data-cl17="empty">
    <header className="cl17-eh" data-cl17="empty-header" data-own-header="">
      <div className="cl17-eh-t">
        <span className="cl17-eh-ey">{CONTACT_EYEBROW}</span>
        <h1 className="cl17-eh-title" data-page-title="" aria-label="Every agent, in one place"><span aria-hidden="true">Every agent,<br />in one place</span></h1>
        <p className="cl17-eh-line" data-cl17="empty-line">
          Keep the agents you might query for {book(manuscriptTitle)} together. QueryHawk tracks who{"’"}s open, what each one wants, and where every query stands.
        </p>
        <div className="cl17-eh-acts">
          <button type="button" className="cl17-eh-b1" data-cl15="add" data-cl17="empty-add" ref={addRef} onClick={onAdd}>+ Add your first agent</button>
          <button type="button" className="cl17-eh-b2" data-cl17="empty-import" onClick={onImport}>Import your list</button>
        </div>
      </div>
      <img className="cl17-eh-art" data-cl17="empty-art" alt="" aria-hidden="true" src={`${CONTACT_DISC_HAWK.src}?v=${CONTACT_DISC_HAWK.version}`} />
    </header>

    <section className="cl17-how" data-cl17="how" aria-labelledby="cl17-how-h">
      <div className="cl17-sh"><h2 id="cl17-how-h">How it works</h2><span>One agent, everything you need to query them</span></div>
      <div className="cl17-how-card">
        <div className="cl17-ex" data-cl17="example">
          <span className="cl17-ex-k" data-cl17="example-label">{EXAMPLE_LABEL}</span>
          <div className="cl17-ex-who">
            <span className="cl17-ex-disc" aria-hidden="true">{EXAMPLE_AGENT.initials}</span>
            <span className="cl17-ex-nm"><b>{EXAMPLE_AGENT.name}</b><i>{EXAMPLE_AGENT.place}</i></span>
            <span className="cl17-ex-door"><i aria-hidden="true" />{EXAMPLE_AGENT.door}</span>
          </div>
          <div className="apn cl17-ex-index">
            <dl className="apn-index">
              {EXAMPLE_AGENT.rows.map((r) => (
                <div key={r.key} className="apn-ir" data-cl17-row={r.key}>
                  <dt>{r.label}</dt>
                  <dd>
                    {"chips" in r ? (
                      <span className="apn-chips">{r.chips.map((g) => <span key={g.label} className={`apn-chip${g.hit ? " is-hit" : ""}`}>{g.hit ? "✓ " : ""}{g.label}</span>)}</span>
                    ) : r.key === "wishlist" ? <i className="apn-wish">{r.answer}</i> : r.answer}
                    {"note" in r ? <small className="apn-note">{r.note}</small> : null}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="cl17-notes" data-cl17="notes">
          <div className="cl17-note" data-cl17="note">
            <span className="cl17-note-g" aria-hidden="true">{"✓"}</span>
            <div><h3>Does it fit your book?</h3>
              <p>Each agent{"’"}s genres are checked against {book(manuscriptTitle)}. A tick means they take what you{"’"}ve written.</p></div>
          </div>
          <div className="cl17-note" data-cl17="note">
            <span className="cl17-note-g" aria-hidden="true">{"✉"}</span>
            <div><h3>How to query them</h3>
              <p>Reply time, how they take queries and what to send, kept in one place and ready when you log the query.</p></div>
          </div>
          <div className="cl17-note" data-cl17="note">
            <span className="cl17-note-g" aria-hidden="true">{"◐"}</span>
            <div><h3>Where you stand</h3>
              <p>Every agent is not queried yet, querying, or closed. The list shows it at a glance.</p>
              <div className="cl17-mini" aria-hidden="true"><i className="cl17-sg--n" style={{ flex: "5 1 0" }} /><i className="cl17-sg--a" style={{ flex: "3 1 0" }} /><i className="cl17-sg--c" style={{ flex: "2 1 0" }} /></div>
              <div className="cl17-mini-k" aria-hidden="true"><span><i className="cl17-sg--n" />Not queried</span><span><i className="cl17-sg--a" />Querying</span><span><i className="cl17-sg--c" />Closed</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="cl17-ways" data-cl17="ways" aria-labelledby="cl17-ways-h">
      <div className="cl17-sh"><h2 id="cl17-ways-h">Ways to get started</h2><span>Pick whichever suits you</span></div>
      <div className="cl17-ways-g">
        <div className="cl17-way cl17-way--pri" data-cl17="way" data-k="import">
          <em className="cl17-way-tag">Quickest</em>
          <h3>Smart import</h3>
          <p>Paste your spreadsheet or a list of agents. QueryHawk sorts it into agents, agencies and anything you{"’"}ve queried, for you to check.</p>
          <button type="button" data-cl17="way-import" onClick={onImport}>Start a Smart import</button>
          <small>One free import comes with your account</small>
        </div>
        <div className="cl17-way" data-cl17="way" data-k="template">
          <h3>Use our template</h3>
          <p>Fill in a ready-made spreadsheet at your own pace, then upload it.</p>
          <a data-cl17="way-template" href={CONTACT_TEMPLATE_HREF} download>Download the template</a>
        </div>
        <div className="cl17-way" data-cl17="way" data-k="add">
          <h3>Add one by hand</h3>
          <p>Add an agent you{"’"}ve found, with what they want and how they take queries.</p>
          <button type="button" data-cl17="way-add" onClick={onAdd}>+ Add an agent</button>
        </div>
      </div>
    </section>
  </div>
);
