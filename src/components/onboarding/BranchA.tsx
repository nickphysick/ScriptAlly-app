/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Branch A — "Just getting started" (manuscript-led setup), matching the approved sketches:
 *   A2  · Where are you with it? — three selectable readiness rows
 *   A3a · A little about it — full essentials (Ready to Query / Revising)
 *   A3b · No rush at all — lighter still-writing variant (no word count, sage helper,
 *         "Save & explore agents →")
 * Presentational + local state only; the manuscript write happens in Onboarding.tsx.
 */
import React, { useState } from "react";
import { ManuscriptStatus } from "../../types";
import { StepColumn, OpenTitle, StepCard, QLabel, OptionGroup, OptionRow, BackLink, StepFoot, FieldError } from "./setupParts";
import { ManuscriptFields, ManuscriptFieldsState, emptyManuscriptFields } from "./ManuscriptFields";

export interface BranchAResult {
  status: ManuscriptStatus;
  fields: ManuscriptFieldsState;
}

export interface BranchAProps {
  /** Back from A2 — returns to the welcome step. */
  onExit: () => void;
  /** A3a Continue (Ready to Query / Revising) — save, then on to the agents step. */
  onSaveReady: (r: BranchAResult) => void;
  /** A3b "Save & explore agents →" (Still writing) — save as Drafting, route to the agent database. */
  onSaveStillWriting: (r: BranchAResult) => void;
  /** Surfaced save/limit error from the parent (e.g. the Free-tier manuscript cap). */
  error?: string | null;
}

/** The three answers. The descriptions are as built; the titles are onboarding v5's. */
export const READINESS: { status: ManuscriptStatus; title: string; desc: string }[] = [
  { status: ManuscriptStatus.DRAFTING, title: "Still being written", desc: "I'm partway through the draft." },
  { status: ManuscriptStatus.REVISING, title: "In revision, nearly there", desc: "Drafted, working through edits." },
  { status: ManuscriptStatus.READY_TO_QUERY, title: "Ready to query", desc: "Polished and ready to send to agents." },
];

export const READINESS_TITLE = "Where are you with it?";
export const READINESS_SUB = "No wrong answer. It points us the right way.";
export const READINESS_LABEL = "Your manuscript is…";
/** ⚠️ READ BEFORE CHOOSING, NOT AFTER. This note used to appear on the details screen, once
 *  "still writing" had already been committed to. It sits under the options now, while that
 *  option is the one selected, so it informs the choice it is about. */
export const STILL_WRITING_LEAD = "Still writing?";
export const STILL_WRITING_NOTE =
  "QueryHawk comes into its own once you're ready to query. While you finish the book, you can " +
  "get a head start researching agents who'd suit it.";

export const BranchA: React.FC<BranchAProps & {
  initialScreen?: "readiness" | "details"; initialStatus?: ManuscriptStatus | null;
  /** onboarding v9: the title and readiness are asked on the page before; the details open with them */
  initialFields?: ManuscriptFieldsState; onBackFromDetails?: () => void;
}> = ({
  onExit, onSaveReady, onSaveStillWriting, error, initialScreen, initialStatus, initialFields, onBackFromDetails,
}) => {
  const [screen, setScreen] = useState<"readiness" | "details">(initialScreen ?? "readiness");
  const [status, setStatus] = useState<ManuscriptStatus | null>(initialStatus ?? null);
  const [fields, setFields] = useState<ManuscriptFieldsState>(initialFields ?? emptyManuscriptFields());
  const [fieldError, setFieldError] = useState<string | null>(null);

  const go = (s: "readiness" | "details") => setScreen(s);
  const stillWriting = status === ManuscriptStatus.DRAFTING;
  const shownError = error || fieldError;

  if (screen === "readiness") {
    return (
      <StepColumn screen="ready">
        <OpenTitle title={READINESS_TITLE} sub={READINESS_SUB} />
        <StepCard>
          <QLabel id="sf-ready-q">{READINESS_LABEL}</QLabel>
          <OptionGroup labelledBy="sf-ready-q">
            {READINESS.map((r) => (
              <OptionRow key={r.status} title={r.title} desc={r.desc} selected={status === r.status} onClick={() => setStatus(r.status)} />
            ))}
          </OptionGroup>
          {stillWriting && (
            <p className="sf-note" data-sf="still-writing"><strong>{STILL_WRITING_LEAD}</strong> {STILL_WRITING_NOTE}</p>
          )}
          <StepFoot left={<BackLink onClick={onExit} />}>
            <button type="button" className="sf-btn" disabled={!status} onClick={() => status && go("details")}>Continue</button>
          </StepFoot>
        </StepCard>
      </StepColumn>
    );
  }

  return (
    <StepColumn screen="details">
      <OpenTitle
        title={stillWriting ? "No rush at all." : "A little about it."}
        sub={stillWriting ? "We'll keep it safe for when you're ready" : "Just the essentials. You can flesh it out any time."}
      />
      <StepCard>
        <ManuscriptFields
          value={fields}
          onChange={(v) => { setFields(v); if (fieldError) setFieldError(null); }}
          titleLabel={stillWriting ? "Working title" : "Manuscript title"}
          titleOptional={stillWriting}
          showStrapline={!stillWriting}
          showWordCount={!stillWriting}
        />
        {shownError && <FieldError>{shownError}</FieldError>}
        <StepFoot left={<BackLink onClick={() => (onBackFromDetails ? onBackFromDetails() : go("readiness"))} />}>
          <button
            type="button" className="sf-btn"
            onClick={() => {
              if (!stillWriting && !fields.title.trim()) {
                setFieldError("Give it a title — even a working one.");
                return;
              }
              /* Genre is REQUIRED on the querying-bound path: Discover and the Comp Scout both match
                 on it. A still-writing book is exempt — the flow promises "no rush". */
              if (!stillWriting && !fields.genre) {
                setFieldError("Pick the primary genre — agents search by it.");
                return;
              }
              setFieldError(null);
              const result = { status: status!, fields };
              if (stillWriting) onSaveStillWriting(result);
              else onSaveReady(result);
            }}
          >
            {stillWriting ? "Save & explore agents" : "Continue"}
          </button>
        </StepFoot>
      </StepCard>
    </StepColumn>
  );
};
