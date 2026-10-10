/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The dead ends of "Your list" (onboarding v5, part 1): Smart Import used (free, and Pro's month),
 * file unreadable, nothing imported, step didn't load. Each is ONE card on the sheet under the
 * tab — a chip, a title, the text, the foot — with no open title above it.
 *
 * ⚠️ NONE OF THEM SELLS. The free "already used" card used to lead with "Upgrade to Pro"; it leads
 * with the template now, which is always free and is what a writer in that position can do next.
 *
 * ⚠️ THE UNREADABLE-FILE CARD DOES NOT SAY WHETHER THE SMART IMPORT WAS SPENT. A read that timed out
 * here may still finish on the server, so "hasn't been used" would be a guess stated as a fact.
 *
 * Every component here is pure: it is handed a handler for each press and decides nothing.
 */

import React from "react";
import "./onboarding.css";
import { BackLink } from "./setupParts";

export const CHIP_USED = "Smart Import already used";
export const CHIP_UNREADABLE = "File couldn't be read";
export const CHIP_NOTHING = "Nothing imported";
export const CHIP_UNLOADED = "Step didn't load";

export const USED_FREE_TITLE = "You've used your Smart Import.";
export const USED_FREE_TEXT = "The template is always free, and reads your sheet exactly. Or add your agents by hand for now.";
export const USED_PRO_TITLE = "Next Smart Import next month";
export const UNREADABLE_TITLE = "We couldn't read that one.";
export const UNREADABLE_TEXT = "Use the template, or add your agents by hand. Nothing has been saved.";
export const NOTHING_TITLE = "That didn't work.";
export const UNLOADED_TITLE = "That step didn't load.";
export const UNLOADED_TEXT = "Something didn't load on our side. Your file hasn't been imported and nothing has been saved.";

/** The one card. `fail` chips report that something did not happen; the rest are neutral. */
export const DeadEndCard: React.FC<{
  kind: string;
  chip: string;
  fail?: boolean;
  title: string;
  children: React.ReactNode;
  left?: React.ReactNode;
  actions: React.ReactNode;
}> = ({ kind, chip, fail, title, children, left, actions }) => (
  <div className="sf-col sf-col--dead" data-screen={kind}>
    <section className="sf-card sf-dead" data-dead={kind}>
      <p className={`sf-chip${fail ? " sf-chip--fail" : ""}`} data-sf="chip">{chip}</p>
      <h1 className="sf-deadh">{title}</h1>
      <div className="sf-deadtx">{children}</div>
      <div className={`sf-cfoot${left ? "" : " sf-cfoot--end"}`}>
        {left}
        <span className="sf-footr">{actions}</span>
      </div>
    </section>
  </div>
);

const Quiet: React.FC<{ act: string; onClick: () => void; children: React.ReactNode }> = ({ act, onClick, children }) => (
  <button type="button" className="sf-link" data-act={act} onClick={onClick}>{children}</button>
);
const Primary: React.FC<{ act: string; onClick: () => void; children: React.ReactNode }> = ({ act, onClick, children }) => (
  <button type="button" className="sf-btn" data-act={act} onClick={onClick}>{children}</button>
);

/** Free tier, Smart Import already used. Leads with the template; no Upgrade. */
export const UsedFree: React.FC<{ onBack: () => void; onAddByHand: () => void; onUseTemplate: () => void }> = ({ onBack, onAddByHand, onUseTemplate }) => (
  <DeadEndCard kind="used-free" chip={CHIP_USED} title={USED_FREE_TITLE}
    left={<BackLink onClick={onBack} />}
    actions={<><Quiet act="byhand" onClick={onAddByHand}>Add by hand</Quiet><Primary act="template" onClick={onUseTemplate}>Use the template</Primary></>}>
    <p>{USED_FREE_TEXT}</p>
  </DeadEndCard>
);

/** Pro, this month's Smart Import already used. The built words and date. */
export const UsedProMonth: React.FC<{ nextLabel: string; onBack: () => void; onAddByHand: () => void }> = ({ nextLabel, onBack, onAddByHand }) => (
  <DeadEndCard kind="used-pro" chip={CHIP_USED} title={USED_PRO_TITLE}
    left={<BackLink onClick={onBack} />}
    actions={<Primary act="byhand" onClick={onAddByHand}>Add them by hand</Primary>}>
    <p>You've used this month's Smart Import. Your next one is available on <strong>{nextLabel}</strong>. You can add agents by hand in the meantime.</p>
  </DeadEndCard>
);

export const Unreadable: React.FC<{ onBack: () => void; onAddByHand: () => void; onDownload: () => void }> = ({ onBack, onAddByHand, onDownload }) => (
  <DeadEndCard kind="unreadable" chip={CHIP_UNREADABLE} fail title={UNREADABLE_TITLE}
    left={<BackLink onClick={onBack} />}
    actions={<><Quiet act="byhand" onClick={onAddByHand}>Add by hand</Quiet><Primary act="download" onClick={onDownload}>Download the template</Primary></>}>
    <p>{UNREADABLE_TEXT}</p>
  </DeadEndCard>
);

export interface ImportCounts {
  queriesImported: number;
  agentsCreated: number;
  agentsMerged: number;
  queriesSkipped: number;
  errors: string[];
}

/** The built counts line, skipped-rows line and errors box — the words unchanged, in the new dress. */
export const ImportCountsBody: React.FC<{ outcome: ImportCounts; skippedReasons: string[] }> = ({ outcome, skippedReasons }) => (
  <>
    <p>
      <strong>{outcome.queriesImported}</strong> {outcome.queriesImported === 1 ? "query" : "queries"} imported ·{" "}
      <strong>{outcome.agentsCreated}</strong> {outcome.agentsCreated === 1 ? "agent" : "agents"} added
      {outcome.agentsMerged > 0 && <> · <strong>{outcome.agentsMerged}</strong> merged with existing</>}
    </p>
    {(outcome.queriesSkipped > 0 || skippedReasons.length > 0) && (
      <p className="sf-deadquiet">
        {outcome.queriesSkipped} {outcome.queriesSkipped === 1 ? "row was" : "rows were"} skipped
        {skippedReasons.length > 0 && <>: {skippedReasons.join("; ").toLowerCase()}</>}.
      </p>
    )}
    {outcome.errors.length > 0 && (
      <div className="sf-note sf-deaderrs">
        {outcome.errors.slice(0, 4).map((err, i) => <p key={i}>{err}</p>)}
        {outcome.errors.length > 4 && <p>…and {outcome.errors.length - 4} more.</p>}
      </div>
    )}
  </>
);

export const NothingImported: React.FC<{ outcome: ImportCounts; skippedReasons: string[]; onBackToReview: () => void }> = ({ outcome, skippedReasons, onBackToReview }) => (
  <DeadEndCard kind="nothing" chip={CHIP_NOTHING} fail title={NOTHING_TITLE}
    actions={<Primary act="review" onClick={onBackToReview}>Back to the review</Primary>}>
    <ImportCountsBody outcome={outcome} skippedReasons={skippedReasons} />
  </DeadEndCard>
);

export const Unloaded: React.FC<{ onAddByHand: () => void; onRestart: () => void }> = ({ onAddByHand, onRestart }) => (
  <DeadEndCard kind="unloaded" chip={CHIP_UNLOADED} title={UNLOADED_TITLE}
    left={<Quiet act="byhand" onClick={onAddByHand}>Add by hand</Quiet>}
    actions={<Primary act="restart" onClick={onRestart}>Start this step again</Primary>}>
    <p>{UNLOADED_TEXT}</p>
  </DeadEndCard>
);
