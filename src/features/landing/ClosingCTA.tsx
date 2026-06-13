/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from "react";

const Check: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const ClosingCTA: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <section className="closing" id="sa-closing">
    <div className="trust">
      <span><Check /> No card needed</span>
      <span><Check /> Your data is yours</span>
      <span><Check /> Export any time</span>
      <span><Check /> Private to you</span>
    </div>
    <div className="letter">
      <div className="dear">Dear&nbsp;Writer,</div>
      <p>
        You've poured years into a manuscript. The querying that follows shouldn't feel like a second,
        colder job — spreadsheets, sticky notes, half-remembered deadlines.
      </p>
      <p>
        Let us hold the records. The agents, the dates, the nudges, the quiet hope of a full request —
        all kept safe and warm, so you can keep your attention where it belongs. <em>Your story starts here.</em>
      </p>
      <div className="sign">— ScriptAlly</div>
      <div className="letter-cta">
        <button type="button" className="wax-btn" onClick={onStart}>
          <span className="wax"><span>S</span></span>
          <span className="wax-txt">
            <span className="l1">Start free</span>
            <span className="l2">No card needed · import your spreadsheet</span>
          </span>
        </button>
      </div>
    </div>
  </section>
);
