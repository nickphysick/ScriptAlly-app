/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2 — THE EMPTY FEED (Part A; ref design-refs/dashboard-first-visit-v2/, screen 01).
 *
 * Before the first query the middle column says what will land there, offers the example dashboard (Part E), and shows
 * one faded activity card labelled "Example". There is no All activity / Agents / You switch until there is activity.
 *
 * ⚠️ THE EXAMPLE CARD IS A PICTURE, NOT A CARD: it is not interactive, and assistive tech reads it as one image named
 * "Example of an activity card" (`role="img"` makes its contents presentational).
 */
import React from "react";

export const EMPTY_FEED = {
  title: "Your activity lands here",
  text: "Every query you log, and every reply, request, offer and pass, shows up here newest first, with what you sent each agent.",
  link: "See what a busy dashboard looks like",
  example: "Example",
  exampleLabel: "Example of an activity card",
  exampleHead: "Nadia asked for the full manuscript",
  exampleSub: "Hussain Literary · 31 days to send it",
} as const;

export const EmptyFeed: React.FC<{ onExample?: () => void }> = ({ onExample }) => (
  <section className="fv2-empty" data-fv2="empty-feed" aria-label="Activity feed">
    <h2 className="fv2-et" data-fv2="empty-title">{EMPTY_FEED.title}</h2>
    <p className="fv2-ep">
      {EMPTY_FEED.text}{" "}
      {onExample && <button type="button" className="fv2-elink" data-fv2="example-link" onClick={onExample}>{EMPTY_FEED.link}</button>}
    </p>
    <div className="fv2-ex" role="img" aria-label={EMPTY_FEED.exampleLabel} data-fv2="example-card">
      <span className="fv2-extag">{EMPTY_FEED.example}</span>
      <div className="fv2-exrow">
        <span className="fv2-exdisc">NH</span>
        <span className="fv2-exw"><b>{EMPTY_FEED.exampleHead}</b><small>{EMPTY_FEED.exampleSub}</small></span>
      </div>
      <div className="fv2-extrk"><i className="is-on" /><i className="is-on" /><i className="is-now" /><i /></div>
    </div>
  </section>
);
