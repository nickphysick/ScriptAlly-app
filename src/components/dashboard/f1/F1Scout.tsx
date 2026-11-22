/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FEED v1 — THE SCOUT, COMING SOON (Part E; ref design-refs/dashboard-feed-v1/ screen 01, right column).
 *
 * A soft pink band ("The Scout", a white "Coming soon" pill), the Scout in a circle straddling the band's foot, what it
 * will do, a faded example suggestion, and "Tell me when it's ready".
 *
 * ⚠️ THE EXAMPLE IS AN EXAMPLE: nothing in it is focusable or pressable, and assistive tech hears one label for the whole
 * of it. ⚠️ THE REQUEST IS ONE LEAF, `notifyPrefs.scout` (Discover's own pattern, `notifyPrefs.discover`; no rules
 * change). Once asked it reads "We'll let you know" and stays that way, across reloads, because it reads the stored
 * leaf.
 */
import React, { useState } from "react";
import { DISCOVER_BIRD } from "../../agents/contact/ContactNextStep";

export const SCOUT_COPY = {
  title: "The Scout",
  soon: "Coming soon",
  head: "Find agents who take on books like yours",
  body: "The Scout looks at your comparable titles and suggests agents who've signed similar books. You'll see why each one is suggested, and no one goes on your list unless you add them.",
  example: "Example of a Scout suggestion",
  ask: "Tell me when it's ready",
  asked: "We'll let you know",
} as const;

const Bell = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1112 0v5l2 2H4z" /><path d="M10 20a2 2 0 004 0" /></svg>
);

export const F1Scout: React.FC<{
  /** the stored request (`notifyPrefs(user.notifyPrefs).scout`) */
  asked: boolean;
  /** writes `notifyPrefs.scout: true`; absent (no writer) → the button is left out rather than doing nothing */
  onAsk?: () => void | Promise<void>;
}> = ({ asked, onAsk }) => {
  const [local, setLocal] = useState(false);
  const done = asked || local;
  return (
    <section className="df1-scout" data-df1="scout" aria-label="The Scout, coming soon">
      <div className="df1-sch">
        <span className="df1-scttl">{SCOUT_COPY.title}</span>
        <span className="df1-soon">{SCOUT_COPY.soon}</span>
      </div>
      <div className="df1-scart">
        <img src={DISCOVER_BIRD.src} width={DISCOVER_BIRD.width} height={DISCOVER_BIRD.height} alt="" draggable={false} decoding="async" />
      </div>
      <div className="df1-scb">
        <h3 className="df1-sch3">{SCOUT_COPY.head}</h3>
        <p>{SCOUT_COPY.body}</p>
        <div className="df1-ghost" role="img" aria-label={SCOUT_COPY.example} data-df1="scout-example">
          <div aria-hidden="true" className="df1-ghin">
            <span className="df1-ex">Example</span>
            <div className="df1-gw"><span className="df1-gi">AL</span><div><b>Amara Lewis</b><small>Juniper &amp; Co · open to submissions</small></div></div>
            <div className="df1-gwhy">Represents two of your comparable titles</div>
            <div className="df1-gacts"><span className="is-p">Add to contacts</span><span>Not for me</span></div>
          </div>
        </div>
        {onAsk && (
          <button type="button" className="df1-notify" data-df1="scout-ask" data-asked={done ? "1" : "0"} disabled={done}
            onClick={() => { setLocal(true); void onAsk(); }}>
            <Bell />{done ? SCOUT_COPY.asked : SCOUT_COPY.ask}
          </button>
        )}
      </div>
    </section>
  );
};
