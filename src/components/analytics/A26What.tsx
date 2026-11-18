/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v26 §C — "What happened to your {sent} queries?": where they are now (`nowGroups`, one mark per query) and
 * how far they got (`pathSteps`, every bar measured against the sent).
 */
import React from "react";
import { A26Card, A26Mark } from "./A26Bits";
import type { NowGroups, PathStep, GroupKey } from "../../lib/analyticsV26";

const LABEL: Record<GroupKey, (n: number) => string> = {
  waiting: () => "waiting for a reply",
  reading: () => "being read",
  offer: (n) => (n === 1 ? "offer" : "offers"),
  ended: () => "ended",
};
function groupLine(k: GroupKey, g: NowGroups): string | null {
  switch (k) {
    case "waiting": return "No answer yet.";
    case "reading": return g.counts.reading === 1 ? "This agent asked to read more." : "These agents asked to read more.";
    case "offer": return null;
    case "ended": {
      const bits = [`${g.passed} passed`, `${g.closedByYou} you closed after a long silence`];
      if (g.withdrew) bits.push(`${g.withdrew} you withdrew`);
      return `${bits.join(", ")}.`;
    }
    default: { const unhandled: never = k; return unhandled; }
  }
}
const BAR: Record<PathStep["key"], string> = { sent: "var(--a26-bar-1)", replied: "var(--a26-bar-2)", asked: "var(--a26-bar-3)", full: "var(--a26-bar-4)", offer: "var(--a26-bar-5)" };

export const A26What: React.FC<{ sent: number; now: NowGroups; path: PathStep[] }> = ({ sent, now, path }) => (
  <div className="a26-sec" data-a26="what">
    <A26Card band="sd" probe="what" title={`What happened to your ${sent} ${sent === 1 ? "query" : "queries"}?`} aside="Each mark is one query">
      <div className="a26-wh">
        <div>
          <h3 className="a26-h3">Where they are now</h3>
          <p className="a26-h3s">Hover a mark to see whose it is.</p>
          <div className="a26-groups">
            {now.groups.map((g) => {
              const line = groupLine(g.key, now);
              return (
                <div className="a26-grp" key={g.key} data-a26="group" data-a26-group={g.key} data-a26-n={g.marks.length}>
                  <span className="a26-grp-h"><b>{g.marks.length}</b><span>{LABEL[g.key](g.marks.length)}</span></span>
                  {line ? <span className="a26-grp-s">{line}</span> : null}
                  <span className="a26-mks">{g.marks.map((m) => <A26Mark key={m.id} mark={m} />)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <h3 className="a26-h3">How far they got</h3>
          <p className="a26-h3s">Every bar is measured against the {sent} you sent.</p>
          <div className="a26-path">
            {path.map((p) => (
              <div className={`a26-pr${p.count ? "" : " a26-pr--dim"}`} key={p.key} data-a26="step" data-a26-step={p.key} data-a26-n={p.count}>
                <span>{p.label}</span>
                <b>{p.count || "None yet"}</b>
                <em data-a26="track">{p.count ? <i data-a26="bar" style={{ width: `${(p.count / sent) * 100}%`, background: BAR[p.key] }} /> : null}</em>
                {p.note ? <small>{p.note}</small> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </A26Card>
  </div>
);
