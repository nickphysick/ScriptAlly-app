/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v1, Part B — "Which letter is landing?" (design-refs/query-letters-v1, 03). A full-width navy band with
 * a white table of every letter that has gone out. Never hidden (the versions ruling, 23 Oct): with no letter sent it
 * says so, and with one it shows that row and says when the comparison begins.
 */
import React from "react";
import { changedLine, howSure, LETTER_MIN_SENT, type LetterFacts } from "../../lib/queryLetters";

export const LANDING_LINE = "Every query remembers the letter it went with. Here's how each one is doing with agents.";
export const LANDING_NOTE = "“Asked for more” counts partial and full requests. A letter needs about 15 queries before its rate means much.";
export const LANDING_ONE = "Once a second letter goes out, you'll see them side by side here.";
export const LANDING_NONE = "Once a letter goes out with a query, you'll see how agents respond to it here.";

export const LandingBand: React.FC<{
  facts: readonly LetterFacts[];
  inUseId: string | null;
  firstId: string | null;
  onOpen: (id: string) => void;
}> = ({ facts, inUseId, firstId, onOpen }) => {
  const sent = facts.filter((f) => f.sent > 0).sort((a, b) => (a.letter.id === inUseId ? -1 : b.letter.id === inUseId ? 1 : b.sent - a.sent));
  return (
    <section className="qlb" id="ql-landing" data-ql="landing" aria-labelledby="ql-landing-h">
      <div className="qlb-in">
        <div className="qlb-h">
          <img src="/images/qc/qc-inkwell.png" alt="" />
          <div>
            <h2 className="qlb-title" id="ql-landing-h">Which letter is landing?</h2>
            <p className="qlb-line">{LANDING_LINE}</p>
          </div>
        </div>
        <div className="qlb-card">
          {sent.length === 0 ? (
            <p className="qlb-empty" data-ql="landing-none">{LANDING_NONE}</p>
          ) : (
            <table className="qlb-table" data-ql="table">
              <thead>
                <tr><th scope="col">Letter</th><th scope="col">Sent with</th><th scope="col">Replies</th><th scope="col">Asked for more</th><th scope="col">How sure</th></tr>
              </thead>
              <tbody>
                {sent.map((f) => {
                  const line = changedLine(f.letter, f.letter.id === firstId);
                  return (
                    <tr key={f.letter.id} data-ql="row" data-id={f.letter.id} tabIndex={0} onClick={() => onOpen(f.letter.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(f.letter.id); } }}>
                      <th scope="row">
                        <span className="qlb-tn">{f.letter.versionName}</span>
                        {f.letter.id === inUseId && <span className="qlb-tuse">In use</span>}
                        {line && <small>{line}</small>}
                      </th>
                      <td>{f.sent}</td>
                      <td>{f.replies} <small>({f.repliesPct}%)</small></td>
                      <td className="qlb-tmore">
                        <b>{f.more}</b>
                        <span className="qlb-tbar"><i style={{ width: `${f.morePct}%` }} /></span>
                        <span className="qlb-tpc">{f.morePct}%</span>
                      </td>
                      <td>
                        {f.sent < LETTER_MIN_SENT
                          ? <span className="qlb-early" data-ql="early">{howSure(f.sent)}</span>
                          : <span className="qlb-ok">{howSure(f.sent)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {sent.length === 1 && <p className="qlb-one" data-ql="landing-one">{LANDING_ONE}</p>}
          {sent.length > 0 && <p className="qlb-note">{LANDING_NOTE}</p>}
        </div>
      </div>
    </section>
  );
};
