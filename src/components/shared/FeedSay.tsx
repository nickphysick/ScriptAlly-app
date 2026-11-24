/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FEED WORDING v1.1 (Part 3) — the ONE renderer for a feed sentence's runs: the dashboard feed, the feed drawer and the
 * Manuscripts shelf all draw `FeedSeg[]` through it, so a name is a link in all three or in none.
 *
 * The person (`who`) is semibold, a title (`em`) italic. A run with `to` is a real <a> that inherits the text's colour
 * and weight, underlines on hover and takes the one focus ring (feedSay.css). `to` is set only where the subject is still
 * on its list (lib/dashFeed `linkRuns`), so a deleted agent's name is plain semibold text. No link opens a new tab.
 *
 * ⚠️ A CLICK ON A LINK STOPS THERE: the row around it may open a query or a card on a click, and a link must never do
 * both. Outside a router (a source test's renderToString) the link is a plain <a href>, so nothing here needs one.
 */
import React from "react";
import { Link, useInRouterContext } from "react-router-dom";
import type { FeedSeg } from "../../lib/dashFeed";
import "./feedSay.css";

const stop = (e: React.MouseEvent) => e.stopPropagation();

const Go: React.FC<{ to: string; kind: string; children: React.ReactNode }> = ({ to, kind, children }) => {
  const routed = useInRouterContext();
  return routed
    ? <Link to={to} className="fs-lk" data-feed-link={kind} onClick={stop}>{children}</Link>
    : <a href={to} className="fs-lk" data-feed-link={kind} onClick={stop}>{children}</a>;
};

export const FeedSay: React.FC<{ say: readonly FeedSeg[] }> = ({ say }) => (
  <>
    {say.map((s, i) => {
      const kind = s.who ? "who" : s.em ? "em" : "text";
      const inner = s.to ? <Go to={s.to} kind={kind}>{s.t}</Go> : s.t;
      return s.who ? <b key={i}>{inner}</b> : s.em ? <i key={i}>{inner}</i> : <React.Fragment key={i}>{inner}</React.Fragment>;
    })}
  </>
);
