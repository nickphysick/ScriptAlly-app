/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "We've read your file" (two-door import v1; ref design-refs/two-door-import-v1/, screen 2; first
 * built as the import summary in onboarding v5, part 2). The success mark, the file's name, one line
 * saying how it was read, two count cards (agents and queries, counted separately), "Sorted for you"
 * (what QueryHawk's rules settled, lib/importRules), and the bar that leads to the questions — or,
 * with none, imports at once.
 *
 * ⚠️ THE NUMBERS ARE `summaryModel`'s AND `reviewTallies`', READ ONCE. This file groups and draws
 * them (`lib/importSummary`); it classifies nothing. The agents total is the count before any
 * duplicate is merged, as it always was.
 *
 * IT OPENS ON THE SUCCESS MARK (onboarding v9): the file was read, and that is said first. The
 * bar's count is the gate's (`lib/reviewGate`): open duplicate sets, agent questions and query
 * questions, the same three the review's steps wait on.
 *
 * ⚠️ NO WAY OUT IS DRAWN HERE. The frame's "Skip for now" is the one way out of set-up; the
 * summary's own "Skip setup" (which was rendered disabled) is gone with its prop.
 */
import React from "react";
import "./importFlow.css";
import { SmartImportResult } from "../../types/smartImport";
import { reviewTallies, modelToResult, autoSetAsideRows } from "../../lib/smartImportReviewModel";
import { agentKey, queryCourts, duplicateSets, SUMMARY_TITLE, ruledModel } from "../../lib/importSummary";
import { SORTED_HEAD, SORTED_ASIDE, SORTED_LINES } from "../../lib/importRules";
import type { ImportSource } from "../../lib/importLabels";
import { GoMark } from "./v9/GoMark";
import { PhonePin } from "./setupParts";
import { openAgentQuestions, openQueryQuestions, gatePrimary, readBarLead, readBarAction } from "../../lib/reviewGate";
import { unresolvedDuplicateAgentIds } from "../../lib/smartImportReviewModel";

/** The one line saying how the file was read (two-door import v1). */
export const READ_LINE = {
  smart: "Read by Smart Import, then checked against QueryHawk's rules.",
  template: "Your headings matched ours, so it was read straight in and checked against QueryHawk's rules. No wait.",
} as const;

interface Props {
  result: SmartImportResult;
  manuscriptTitle: string;
  /** The file's name, under the heading. */
  fileName?: string;
  /** Which reader read the file: Smart Import, or the headings route ("template"). */
  source?: ImportSource;
  /** "Answer them": the review, where the questions are asked. */
  onContinue: () => void;
  /** With no questions the bar's button imports at once, with what the review would have handed over. */
  onImport?: (result: SmartImportResult, left?: { setAside: { status: string; sentDate: string | null }[] }) => void;
  /** A host with a way out of its own (the Import page) passes this; set-up passes none and no link is drawn. */
  onCancel?: () => void;
}

const TICK = (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4 10-11" /></svg>
);

export const ImportOverview: React.FC<Props> = ({ result, fileName, source = "smart", onContinue, onImport, onCancel }) => {
  const ruled = React.useMemo(() => ruledModel(result), [result]);
  const { agents, queries, settled } = ruled;
  const t = React.useMemo(() => reviewTallies(agents, queries), [agents, queries]);
  const key = React.useMemo(() => agentKey(agents, queries), [agents, queries]);
  const courts = React.useMemo(() => queryCourts(queries), [queries]);
  /* The questions the review will ask: every open duplicate set, every agent question (an agent in an
     open set is the set's, as before), every query question — the gate's own counts (lib/reviewGate). */
  const sets = duplicateSets(agents);
  const dupIds = React.useMemo(() => unresolvedDuplicateAgentIds(agents), [agents]);
  const agentQs = React.useMemo(() => openAgentQuestions(agents.filter((a) => !dupIds.has(a.id))), [agents, dupIds]);
  const queryQs = React.useMemo(() => openQueryQuestions(queries), [queries]);
  const asks = sets + agentQs.length + queryQs.length;
  const file = (fileName ?? "").trim();
  const open = courts.filter((c) => c.key !== "closed").reduce((n, c) => n + c.total, 0);
  const closed = courts.find((c) => c.key === "closed")?.total ?? 0;
  const live = { agents: agents.filter((a) => !a.deleted).length, queries: queries.filter((q) => !q.removed).length };
  const go = () => {
    if (asks === 0 && onImport) onImport(modelToResult(result, agents, queries), { setAside: autoSetAsideRows(agents, queries) });
    else onContinue();
  };

  return (
    <div className="im-sum im-read" data-im="summary" data-screen="overview">
      <header className="im-ohead">
        <div className="o9-markrow" data-im="markrow">
          <GoMark />
          <div className="o9-mtxt">
            <h1 className="im-h1 o9-mhead" data-im="title">{SUMMARY_TITLE}</h1>
            {file && <span data-im="file">{file}</span>}
          </div>
        </div>
        <p className="im-howread" data-im="read-line">{READ_LINE[source]}</p>
      </header>

      <div className="im-pops">
        <section className="im-pop" aria-labelledby="im-pop-a" data-im="card-agents">
          <div className="im-stack" id="im-pop-a">
            <span className="im-num" data-im="total">{t.agents.total}</span>
            <span className="im-words">agents</span>
            <span className="im-sub">{key.none > 0 ? `${key.none} not queried yet` : "for your contact list"}</span>
          </div>
        </section>
        <section className="im-pop" aria-labelledby="im-pop-q" data-im="card-queries">
          <div className="im-stack" id="im-pop-q">
            <span className="im-num" data-im="total">{t.queries.total}</span>
            <span className="im-words">queries</span>
            <span className="im-sub">{`${open} still open, ${closed} closed`}</span>
          </div>
        </section>
      </div>

      {settled.length > 0 && (
        <section className="im-list im-sorted" aria-label={SORTED_HEAD} data-im="sorted">
          <div className="im-listhead im-listhead--quiet"><b>{SORTED_HEAD}</b><span className="im-saside">{SORTED_ASIDE}</span></div>
          {settled.map((x) => (
            <div className="im-srow" key={x.kind} data-sorted={x.kind}>
              <span className="im-stick" aria-hidden="true">{TICK}</span>
              <div><b>{SORTED_LINES[x.kind].title}</b><small>{SORTED_LINES[x.kind].sub}</small></div>
              <span className="im-sn" data-im="sorted-n">{x.count}</span>
            </div>
          ))}
        </section>
      )}

      <div className="im-nextbar" data-im="nextbar">
        <p className="im-tal" data-im="asks">{asks > 0 && <><b data-im="asks-n">{asks}</b> {readBarLead(asks)}</>}</p>
        <PhonePin>
        <div className="im-nextgo">
          {onCancel && <button type="button" className="sf-link sf-link--quiet" onClick={onCancel} data-im="cancel">Cancel</button>}
          <button type="button" className="sf-btn" onClick={go} data-im="primary">
            {asks > 0 ? readBarAction(asks) : gatePrimary("queries", 0, live)}
          </button>
        </div>
        </PhonePin>
      </div>
    </div>
  );
};
