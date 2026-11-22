/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v26 §B — "What to do next" (Everyday only): up to three cards from `findings`, in order, each with a link
 * to the page where the writer acts on it. In Early, one card instead: "Patterns appear after 5 replies", with five
 * segments filled to the reply count. Every figure is counted from the writer's own queries.
 */
import React from "react";
import { Clock, Bell, Send } from "lucide-react";
import { A26Go } from "./A26Bits";
import { EVERYDAY_REPLIES, ROUND_NAMES, ROUND_ORDINALS, wk, type Finding } from "../../lib/analyticsV26";

export interface A26Links {
  /** Queries (unfiltered: the Query Centre has no filter a link can set today) */
  queries: () => void;
  /** Settings → Preferences, where "A query goes quiet after" lives */
  quiet: () => void;
  /** the Contact list (unfiltered, as above) */
  agents: () => void;
}

/** The typical card's sentence: "sooner" only when it is; a kind with no replies is dropped. */
export function typicalSentence(a: number | null, p: number | null, quiet: number): string {
  const tail = ` Your queries are set to go quiet after ${wk(quiet)}.`;
  if (a !== null && p !== null) {
    return (a < p
      ? `Requests have come a little sooner (about ${wk(a)}) than passes (about ${wk(p)}).`
      : `Requests have come after about ${wk(a)}, passes after about ${wk(p)}.`) + tail;
  }
  if (a !== null) return `Requests have come after about ${wk(a)}.${tail}`;
  if (p !== null) return `Passes have come after about ${wk(p)}.${tail}`;
  return tail.trim();
}

const Disc: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="a26-disc" aria-hidden="true">{children}</span>;

const Card: React.FC<{ f: Finding; links: A26Links }> = ({ f, links }) => {
  let icon: React.ReactNode, fig: React.ReactNode, unit: string, bold: string, line: string, go: React.ReactNode;
  switch (f.key) {
    case "beyond":
      icon = <Clock size={22} strokeWidth={1.7} />; fig = f.n; unit = "";
      bold = `${f.n === 1 ? "query has" : "queries have"} waited longer than any reply has taken`;
      line = `Your slowest reply so far came after ${wk(f.slowest)}. ${f.n === 1 ? "This one has" : "These have"} been out longer than that.`;
      go = <A26Go probe="beyond" onClick={links.queries}>{f.n === 1 ? "See it in Queries →" : `See those ${f.n} in Queries →`}</A26Go>;
      break;
    case "typical":
      icon = <Bell size={22} strokeWidth={1.7} />; fig = f.typical; unit = f.typical === 1 ? " week" : " weeks";
      bold = "is how long a reply usually takes you";
      line = typicalSentence(f.typicalAsked, f.typicalPassed, f.quietWeeks);
      go = <A26Go probe="quiet" onClick={links.quiet}>Change when queries go quiet →</A26Go>;
      break;
    case "bestRound":
      icon = <Send size={22} strokeWidth={1.7} />; fig = f.best.asked; unit = ` of ${f.best.ids.length}`;
      bold = `asked for more in your ${ROUND_ORDINALS[f.best.index]} round, your best so far`;
      line = `${f.all.map((r) => `${ROUND_NAMES[r.index]} ${r.ids.length}: ${r.asked} of ${r.ids.length}`).join(". ")}. Rounds with queries still waiting can go up.`;
      go = <A26Go probe="best-round" onClick={links.queries}>See what went out with those queries →</A26Go>;
      break;
    default: { const unhandled: never = f; return unhandled; }
  }
  return (
    <div className="a26-rc" data-a26="finding" data-a26-finding={f.key}>
      <div className="a26-rc-in">
        <div className="a26-find">
          <div className="a26-f-top"><Disc>{icon}</Disc><span className="a26-f-fig" data-a26="finding-fig">{fig}<small>{unit}</small></span></div>
          <h3>{bold}</h3>
          <p>{line}</p>
          {go}
        </div>
      </div>
    </div>
  );
};

export const A26Next: React.FC<{ findings: Finding[]; links: A26Links }> = ({ findings, links }) => (
  <section className="a26-sec" data-a26="next">
    <div className="a26-sec-h"><h2>What to do next</h2><p>Worked out from your own queries.</p></div>
    <div className="a26-three">{findings.map((f) => <Card key={f.key} f={f} links={links} />)}</div>
  </section>
);

/** Early: fewer than five replies. */
export const A26Early: React.FC<{ replies: number }> = ({ replies }) => {
  const n = Math.min(replies, EVERYDAY_REPLIES);
  return (
    <section className="a26-sec" data-a26="early">
      <div className="a26-rc"><div className="a26-rc-in"><div className="a26-warm">
        <div>
          <h2>Patterns appear after 5 replies</h2>
          <p>Once five agents have answered, this page shows which rounds, agents and nudges got results. Until then, everything below is a plain picture of where your queries are.</p>
        </div>
        <div>
          <div className="a26-segs" role="img" aria-label={`${n} of 5 replies`} data-a26="segs">
            {Array.from({ length: EVERYDAY_REPLIES }, (_, i) => <i key={i} className={i < n ? "on" : ""} data-a26-seg={i < n ? "on" : "off"} />)}
          </div>
          <p className="a26-segs-c">{n} of 5 replies so far</p>
        </div>
      </div></div></div>
    </section>
  );
};
