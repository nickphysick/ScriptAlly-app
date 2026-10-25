/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — Results (ref `.rs`, `renderRs`): which packages, letters, synopses and versions get agents
 * asking for more. A recessed well, a segmented switch, the ranked list and a detail card.
 *
 * ⚠️ EVERY FIGURE IS packageReplies' (see lib/packagesV26): "asked for more" is requests, the share is over the
 *    queries that have been answered, and an item under MIN_SENDS_FOR_CLAIM answers is shown hatched, "Too early",
 *    and never ranked. Packages compare ALL editions here; the builder's header bar states the current one.
 */
import React, { useMemo, useState } from "react";
import type { SubmissionPackage } from "../../../types";
import { MIN_SENDS_FOR_CLAIM } from "../../../lib/packageReplies";
import {
  askRate, detailFigures, earlyWarning, iconOf, pctOf, resultRows, resultsFoot, resultsLead, RESULTS_NOUN, type ResultsKind,
} from "../../../lib/packagesV26";
import { Mark, Pic } from "./icons";
import type { Pk26Model, VersionRow } from "./usePk26Model";

const TABS: [ResultsKind, string][] = [["pk", "Packages"], ["let", "Query letters"], ["syn", "Synopses"], ["ver", "Versions"]];

export const Pk26Results: React.FC<{ model: Pk26Model; onSeeQueries: (ids: string[]) => void; empty: boolean }> = ({ model, onSeeQueries, empty }) => {
  const [kind, setKind] = useState<ResultsKind>("pk");
  const [sel, setSel] = useState<string | null>(null);
  const items = useMemo(() => model.resultItems(kind), [model, kind]);
  const rows = useMemo(() => resultRows(items), [items]);
  const total = items.reduce((a, x) => a + x.s.sent, 0);
  const lead = resultsLead(rows, kind);
  const pick = rows.find((r) => r.item.id === sel) ?? rows.find((r) => !r.early && !r.notSent) ?? rows[0] ?? null;
  const iconFor = (it: (typeof items)[number]) => kind === "pk"
    ? <span className="p6-rs-ic p6-pk"><Pic ic={iconOf(it.ref as SubmissionPackage)} /></span>
    : kind === "ver"
      ? <span className="p6-rs-ic p6-v">{it.ref ? ((it.ref as VersionRow).original ? "O" : (it.ref as VersionRow).num) : "–"}</span>
      : <span className="p6-rs-ic p6-m"><Mark k={kind} /></span>;
  const noun = RESULTS_NOUN[kind];

  return (
    <section className="p6-rs" aria-labelledby="p6-rsT" data-pk26="results">
      <div className="p6-rs-in">
        <div className="p6-rs-h">
          <div className="p6-rs-art" aria-hidden="true"><span>Art<small>Hawk with a magnifying glass over a bar chart</small></span></div>
          <div><p className="p6-rs-k">Results</p><h2 className="p6-id-rsT" id="p6-rsT">What gets agents asking for more</h2></div>
          <div className="p6-rs-seg" role="tablist" aria-label="Compare">
            {TABS.map(([k, l]) => <button type="button" key={k} role="tab" aria-selected={kind === k} onClick={() => { setKind(k); setSel(null); }}>{l}</button>)}
          </div>
        </div>
        <div className="p6-rs-b" data-pk26="rs-body">
          {empty || !total || !pick ? (
            <div className="p6-rs-empty"><b>Nothing to compare yet.</b><span>Once a {noun} has had {MIN_SENDS_FOR_CLAIM} answers from agents, you’ll see how often they ask for more, and how it compares with the others.</span></div>
          ) : (
            <>
              <div className="p6-rs-list">
                <p className="p6-rs-lead">{lead.best ? <b>{lead.best}</b> : null}{lead.text}</p>
                <div className="p6-rs-ax"><span>Asked for more</span><span>Sent</span></div>
                {rows.map((r) => (
                  <button type="button" key={r.item.id} className={`p6-rs-r${r.item.id === pick.item.id ? " p6-on" : ""}${r.early ? " p6-early" : ""}`}
                    data-rsel={r.item.id} title={`${r.item.name}: ${r.item.s.requests} of ${r.item.s.answered} answered asked for more`} onClick={() => setSel(r.item.id)}>
                    <span className="p6-rs-n">{iconFor(r.item)}<b>{r.item.name}</b></span>
                    <span className="p6-rs-bar"><span className="p6-rs-trk"><i style={{ width: `${r.bar}%` }} /></span><em>{r.label}</em></span>
                    <span className="p6-rs-s">{r.item.s.sent}</span>
                  </button>
                ))}
                <p className="p6-rs-foot">{resultsFoot(model.overallSplit, kind)}</p>
              </div>
              <Detail model={model} kind={kind} item={pick.item} icon={iconFor(pick.item)} onSeeQueries={onSeeQueries} />
            </>
          )}
        </div>
      </div>
    </section>
  );
};

const Detail: React.FC<{
  model: Pk26Model; kind: ResultsKind; item: ReturnType<Pk26Model["resultItems"]>[number]; icon: React.ReactNode; onSeeQueries: (ids: string[]) => void;
}> = ({ model, kind, item, icon, onSeeQueries }) => {
  const s = item.s;
  const qs = model.resultQueries(kind, item.id);
  const { full, days } = detailFigures(qs, model.rowsById);
  const rate = askRate(s);
  const all = askRate(model.overallSplit);
  const warn = earlyWarning(s);
  const bars: [string, number][] = [["Sent", s.sent], ["Replied", s.replies], ["Asked for more", s.requests], ["Full requests", full]];
  return (
    <aside className="p6-rs-d" data-pk26="rs-detail">
      <div className="p6-rs-dh">{icon}<div><b>{item.name}</b><small>{s.sent ? `Sent to ${s.sent} agent${s.sent === 1 ? "" : "s"}` : "Not sent yet"}</small></div></div>
      {s.sent ? (
        <>
          <div className="p6-rs-fn">
            {bars.map(([l, v]) => <div key={l} className="p6-fn-r"><span>{l}</span><span className="p6-fn-b"><i style={{ width: `${(v / s.sent) * 100}%` }} /></span><b>{v}</b></div>)}
          </div>
          <div className="p6-rs-t">
            <div><b>{pctOf(rate)}</b><span>asked for more{warn || all == null ? "" : ` · you average ${pctOf(all)}`}</span></div>
            <div><b>{days ?? "–"}</b><span>days to a reply, on average</span></div>
          </div>
          {warn ? <p className="p6-rs-warn">{warn}</p> : null}
          <button type="button" className="p6-cx-lnk p6-rs-go" onClick={() => onSeeQueries(qs.map((q) => q.id))}>{qs.length === 1 ? "See this query" : `See these ${qs.length} queries`} in the Query Centre</button>
        </>
      ) : <p className="p6-rs-warn">Nothing has gone out with this {RESULTS_NOUN[kind]} yet.</p>}
    </aside>
  );
};
