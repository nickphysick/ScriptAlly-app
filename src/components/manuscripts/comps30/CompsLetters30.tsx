/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v30 §C: "Which letter named which comps" — one card per query letter (replaces v28's "What's
 * landing"), and §D: the Scout's home at the foot of the page (replaces v25's floating tab and drawer).
 *
 * ⚠️ EVERY FIGURE IS compUsage's (`letterRate`, `averageAsked`) through `letterCards`; nothing here counts.
 * ⚠️ THE SCOUT CAN STILL REACH NOTHING: no import of lib/suggestComps. Its one button records the writer's wish to be
 *    told, as ONE leaf (`notifyPrefs.comps`) through the page's own writer.
 */
import React from "react";
import type { AskedRate } from "../../../lib/compUsage";
import type { LetterCard } from "../../../lib/compsShelf";
import { READY_AT } from "../../../lib/compsShelf";
import { Env30, Lock30, Media30 } from "./marks30";

export const SCOUT_ART = "/images/contact/discover-binoculars-bird.webp";
export const SCOUT_LINE = "The Scout will look for recent books, films and shows like yours, check they’re real and in print, and bring them here for you to add or pass on. It finds titles; choosing what goes in your letter is always yours.";

const LetterCard30: React.FC<{ l: LetterCard; onOpen: (key: string) => void; onLog: (letterId: string) => void }> = ({ l, onOpen, onLog }) => (
  <article className={`cp30-lt${l.draft ? " is-draft" : ""}`} data-cp="letter" data-letter={l.id} data-middle={l.middle} aria-label={l.name}>
    <div className="cp30-lhd">
      <span className="cp30-env" aria-hidden="true"><Env30 /></span>
      <div>
        <h3 className="cp30-ln">{l.name}</h3>
        <div className="cp30-ls" data-cp="letter-status">
          {l.draft ? "Draft · not sent yet" : <><Lock30 />Sent with {l.sent} {l.sent === 1 ? "query" : "queries"} · fixed</>}
        </div>
      </div>
    </div>
    {l.middle === "unrecorded" ? (
      <div className="cp30-lmiss" data-cp="letter-miss">
        Its comps weren&rsquo;t logged before it went out.
        <button type="button" className="cp30-btn" data-cp="letter-log" data-cx-key={`log:${l.id}`} onClick={() => onLog(l.id)}>Log its comps</button>
      </div>
    ) : l.middle === "empty" ? (
      <p className="cp30-lnone" data-cp="letter-empty">No comps chosen yet.<button type="button" className="cp30-lnk" data-cp="letter-choose" data-cx-key={`log:${l.id}`} onClick={() => onLog(l.id)}>Choose them</button></p>
    ) : l.comps.length ? (
      <ul data-cp="letter-comps">
        {l.comps.map((c) => (
          <li key={c.key}>
            <button type="button" data-cp="letter-comp" data-key={c.key} data-cx-key={`lc:${l.id}:${c.key}`} onClick={() => onOpen(c.key)}>
              <span className="cp30-mi" aria-hidden="true"><Media30 kind={c.kind} /></span>
              <span className="cp30-lc">{c.title}</span>
              {c.year ? <em>{c.year}</em> : null}
            </button>
          </li>
        ))}
      </ul>
    ) : (
      <p className="cp30-lnone" data-cp="letter-none">It named no comps.</p>
    )}
    {l.draft ? (
      <div className="cp30-lft is-quiet"><div className="cp30-k">Not sent yet</div><div className="cp30-s">Its comps can still change</div></div>
    ) : (
      <div className="cp30-lft" data-cp="letter-foot">
        <div className="cp30-k" data-cp="letter-rate">{l.rate.pct ?? 0}%<small>asked for more</small></div>
        <div className="cp30-s">{l.rate.asked} of {l.rate.sent} {l.rate.sent === 1 ? "query" : "queries"}{l.rate.sent < READY_AT ? " · early days" : ""}</div>
      </div>
    )}
  </article>
);

export const CompsLetters30: React.FC<{
  cards: LetterCard[];
  average: AskedRate;
  bandRef: React.Ref<HTMLElement>;
  onOpen: (key: string) => void;
  onLog: (letterId: string | null) => void;
}> = ({ cards, average, bandRef, onOpen, onLog }) => (
  <section className="cp30-lsec" data-cp="letters" aria-labelledby="cp30-letters-h" ref={bandRef}>
    <div className="cp30-sh">
      <div className="cp30-st">
        <h2 className="cp30-h2" id="cp30-letters-h">Which letter named which comps</h2>
        <p>Every query remembers the letter it went with, so each comp knows the queries it went out with. Once a letter has gone out, its record is fixed.</p>
      </div>
      <button type="button" className="cp30-btn is-s" data-cp="letters-log" data-cx-key="letters-log" onClick={() => onLog(null)}>Log comps in a letter</button>
    </div>
    <div className="cp30-letters" data-cp="letter-grid">
      {cards.map((l) => <LetterCard30 key={l.id} l={l} onOpen={onOpen} onLog={(id) => onLog(id)} />)}
    </div>
    <p className="cp30-fn" data-cp="letters-foot">
      {average.sent > 0 ? `Across all ${average.sent} ${average.sent === 1 ? "query" : "queries"} sent, ${average.pct ?? 0}% led to a request. ` : ""}
      A comp or letter needs about five queries before its figure means much.
    </p>
  </section>
);

export const CompsScout30: React.FC<{ asked: boolean; onToggle: () => void }> = ({ asked, onToggle }) => (
  <section className="cp30-scout" data-cp="scout" aria-labelledby="cp30-scout-h">
    <img src={SCOUT_ART} alt="" width={190} height={190} />
    <div className="cp30-tx">
      <h2 className="cp30-sh2" id="cp30-scout-h">The Scout<span className="cp30-cs">Coming soon</span></h2>
      <p>{SCOUT_LINE}</p>
      <div className="cp30-sacts">
        <button type="button" className={`cp30-btn ${asked ? "is-on" : "is-p"}`} aria-pressed={asked} data-cp="scout-btn" onClick={onToggle}>
          {asked ? "✓ We’ll tell you" : "Tell me when it’s ready"}
        </button>
      </div>
    </div>
  </section>
);
