/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The import summary (onboarding v5, part 2; ref design-refs/onboarding/onboarding-journey-v5.html
 * #overview). It sits in the set-up frame's sheet: an open title, the file's name, then two cards —
 * agents and queries — each led by its number, with the steps and the primary on a bar at the
 * sheet's foot.
 *
 * ⚠️ THE NUMBERS ARE `summaryModel`'s AND `reviewTallies`', READ ONCE. This file groups and draws
 * them (`lib/importSummary`); it classifies nothing. The agents total is the count before any
 * duplicate is merged, as it always was.
 *
 * IT OPENS ON THE SUCCESS MARK (onboarding v9): the file was read, and that is said first. The
 * tiers no longer call anything optional: every flagged group "needs an answer" and names the
 * step it is answered on. The counts are still `reviewTallies`'; the sentences under them are
 * built from the questions themselves (`lib/reviewGate`).
 *
 * ⚠️ NO WAY OUT IS DRAWN HERE. The frame's "Skip for now" is the one way out of set-up; the
 * summary's own "Skip setup" (which was rendered disabled) is gone with its prop.
 */
import React from "react";
import "./importFlow.css";
import { SmartImportResult } from "../../types/smartImport";
import { reviewTallies } from "../../lib/smartImportReviewModel";
import {
  agentKey, agentKeyParts, agentDiscs, queryCourts, importSteps, stepCaption, duplicateSets,
  TIER_TEXT, TIER_NAME, SUMMARY_TITLE, SUMMARY_PRIMARY,
  summaryModel,
} from "../../lib/importSummary";
import { StatusDot } from "../StatusDot";
import { Chip, Disc, Stepper } from "./ImportParts";
import { GoMark } from "./v9/GoMark";
import { openAgentQuestions, openQueryQuestions, agentsAnswerLine, queriesAnswerLine, summaryLead, readLine } from "../../lib/reviewGate";
import { unresolvedDuplicateAgentIds } from "../../lib/smartImportReviewModel";

interface Props {
  result: SmartImportResult;
  manuscriptTitle: string;
  /** The file's name, for the chip beside the title. */
  fileName?: string;
  /** The file's row count, when it is already known without reading the file again (the template
   *  path knows it; a Smart import does not). Absent, the line under the title states no count. */
  rowCount?: number | null;
  onContinue: () => void;
  /** A host with a way out of its own (the Import page) passes this; set-up passes none and no link is drawn. */
  onCancel?: () => void;
}

const TICK = (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4 10-11" /></svg>
);

const Tier: React.FC<{ tone: "ok" | "fix" | "ask"; mark: React.ReactNode; count: number; name: string; chip?: React.ReactNode; text: string }> = ({ tone, mark, count, name, chip, text }) => (
  <li className={tone} data-tier={tone}>
    <span className="im-tm" aria-hidden="true">{mark}</span>
    <b className="im-n" data-im="tier-n">{count}</b>
    <div>
      <h3 className="im-tname">{name}{chip}</h3>
      <p>{text}</p>
    </div>
  </li>
);

/** The reconciling bar: one segment per tier above zero, in proportion. */
const Recon: React.FC<{ what: string; total: number; ok: number; fix: number; sharp: number }> = ({ what, total, ok, fix, sharp }) => {
  const said = [`${ok} ready to go`, ...(fix > 0 ? [`${fix} need a quick fix`] : []), ...(sharp > 0 ? [`${sharp} need an answer`] : [])].join(", ");
  return (
    <div className="im-recon" role="img" aria-label={`Of ${total} ${what}: ${said}`} data-im="recon">
      {ok > 0 && <i className="ok" style={{ flex: ok }} />}
      {fix > 0 && <i className="fix" style={{ flex: fix }} />}
      {sharp > 0 && <i className="ask" style={{ flex: sharp }} />}
    </div>
  );
};

export const ImportOverview: React.FC<Props> = ({ result, manuscriptTitle, fileName, rowCount, onContinue, onCancel }) => {
  const { agents, queries } = React.useMemo(() => summaryModel(result), [result]);
  const t = React.useMemo(() => reviewTallies(agents, queries), [agents, queries]);
  const key = React.useMemo(() => agentKey(agents, queries), [agents, queries]);
  const faces = React.useMemo(() => agentDiscs(agents, queries), [agents, queries]);
  const courts = React.useMemo(() => queryCourts(queries), [queries]);
  const sets = duplicateSets(agents);
  /* The questions behind the two "Need an answer" tiers. An agent in an open duplicate set is the
     duplicates step's, so it is left out here, as the tally leaves it out. */
  const dupIds = React.useMemo(() => unresolvedDuplicateAgentIds(agents), [agents]);
  const agentQs = React.useMemo(() => openAgentQuestions(agents.filter((a) => !dupIds.has(a.id))), [agents, dupIds]);
  const queryQs = React.useMemo(() => openQueryQuestions(queries), [queries]);
  const lead = summaryLead({ decisions: t.agents.fix, agentAnswers: t.agents.sharpen, queryAnswers: t.queries.sharpen });

  const allClear = t.agents.fix === 0 && t.agents.sharpen === 0 && t.queries.sharpen === 0;
  const steps = importSteps(sets > 0);
  const captions = Object.fromEntries(steps.map((id) => [id, stepCaption(id, { sets, agentsOpen: t.agents.sharpen, queriesOpen: t.queries.sharpen })]));
  const title = manuscriptTitle.trim() || "your book";
  const file = (fileName ?? "").trim();

  return (
    <div className="im-sum" data-im="summary" data-screen="overview">
      <header className="im-ohead">
        <div className="o9-markrow" data-im="markrow">
          <GoMark />
          <div className="o9-mtxt">
            <h1 className="im-h1 o9-mhead" data-im="title">{SUMMARY_TITLE}</h1>
            <span data-im="read-line">{readLine(rowCount)}</span>
          </div>
        </div>
        {file && (
          <div className="im-sumchips">
            <Chip file data-im="file">{file}</Chip>
          </div>
        )}
        <p data-im="lead">
          {"clean" in lead ? lead.clean : (
            <>{lead.before}{lead.clauses.map((c, i) => (
              <React.Fragment key={c}>{i > 0 && (i === lead.clauses.length - 1 ? " and " : ", ")}<b>{c}</b></React.Fragment>
            ))}{lead.after}</>
          )}
        </p>
      </header>

      <div className="im-pops">
        <section className="im-pop" aria-labelledby="im-pop-a" data-im="card-agents">
          <div className="im-stack" id="im-pop-a">
            <span className="im-num" data-im="total">{t.agents.total}</span>
            <span className="im-words">agents</span>
            <span className="im-sub">for your contact list</span>
          </div>
          <div className="im-prev">
            <div className="im-faces" aria-hidden="true">
              {faces.discs.map((d) => <Disc key={d.id} initials={d.initials} tone={d.standing} />)}
              {faces.rest > 0 && <span className="im-faces-more">+{faces.rest}</span>}
            </div>
            <p className="im-key" data-im="key">
              {agentKeyParts(key).map((p, i) => (
                <React.Fragment key={p.text}>{i > 0 && " · "}<b data-im="key-n">{p.n}</b> {p.text}</React.Fragment>
              ))}
            </p>
          </div>
          <Recon what="agents" total={t.agents.total} ok={t.agents.ready} fix={t.agents.fix} sharp={t.agents.sharpen} />
          <ul className="im-tiers">
            <Tier tone="ok" mark={TICK} count={t.agents.ready} name={TIER_NAME.ready} text={TIER_TEXT.agentsReady} />
            {t.agents.fix > 0 && (
              <Tier tone="fix" mark="!" count={t.agents.fix} name={TIER_NAME.fix} chip={<Chip hot>Step {steps.indexOf("duplicates") + 1}</Chip>} text={TIER_TEXT.agentsFix(sets)} />
            )}
            {t.agents.sharpen > 0 && (
              <Tier tone="ask" mark="?" count={t.agents.sharpen} name={TIER_NAME.ask} chip={<Chip hot>Step {steps.indexOf("agents") + 1}</Chip>} text={agentsAnswerLine(agentQs)} />
            )}
          </ul>
        </section>

        <section className="im-pop" aria-labelledby="im-pop-q" data-im="card-queries">
          <div className="im-stack" id="im-pop-q">
            <span className="im-num" data-im="total">{t.queries.total}</span>
            <span className="im-words">queries</span>
            <span className="im-sub">for <i>{title}</i></span>
          </div>
          <div className="im-prev">
            <div className="im-courts">
              {courts.filter((c) => c.total > 0).map((c) => (
                <div className="im-court" key={c.key} data-court={c.key}>
                  <p><b data-im="court-n">{c.total}</b> {c.phrase}</p>
                  <div className="im-gl">
                    {c.statuses.map((s) => (
                      <span key={s.status} title={s.name} data-status={s.status}>
                        <StatusDot status={s.status} overrideSize={15} /> <span data-im="status-n">{s.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Recon what="queries" total={t.queries.total} ok={t.queries.ready} fix={0} sharp={t.queries.sharpen} />
          <ul className="im-tiers">
            <Tier tone="ok" mark={TICK} count={t.queries.ready} name={TIER_NAME.ready} text={TIER_TEXT.queriesReady} />
            {t.queries.sharpen > 0 && (
              <Tier tone="ask" mark="?" count={t.queries.sharpen} name={TIER_NAME.ask} chip={<Chip hot>Step {steps.indexOf("queries") + 1}</Chip>} text={queriesAnswerLine(queryQs)} />
            )}
          </ul>
        </section>
      </div>

      <div className="im-nextbar" data-im="nextbar">
        <Stepper steps={steps} current={null} captions={captions} label="What happens next" />
        <div className="im-nextgo">
          {onCancel && <button type="button" className="sf-link sf-link--quiet" onClick={onCancel} data-im="cancel">Cancel</button>}
          <button type="button" className="sf-btn" onClick={onContinue} data-im="primary">
            {allClear ? SUMMARY_PRIMARY.clear : SUMMARY_PRIMARY.work}
          </button>
        </div>
      </div>
    </div>
  );
};
