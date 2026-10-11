/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "The book you're querying." — set-up's book step, as its own component (onboarding v5, part 3).
 *
 * It was inline in `BranchB`. The Import page needs the SAME screen when a writer with no manuscript
 * starts an import, so it lives here and both mount it: one screen, one set of fields
 * (`ManuscriptFields`), one pair of requirements (a title, a primary genre). Nothing is written
 * here: the host holds what `onContinue` hands it and creates the manuscript later, once.
 */
import React, { useState } from "react";
import { ManuscriptFields, ManuscriptFieldsState } from "./ManuscriptFields";
import { StepColumn, OpenTitle, StepCard, BackLink, StepFoot, FieldError } from "./setupParts";

export const BOOK_TITLE = "The book you're querying.";
export const BOOK_SUB = "Just the essentials. Your agents and queries attach to this, and you can flesh it out any time.";

export interface BookStepProps {
  /** The fields to open with (a held draft, or empty). */
  initial: ManuscriptFieldsState;
  /** A save or limit error from the host. */
  error?: string | null;
  onBack: () => void;
  /** The fields are valid: the host holds them and moves on. */
  onContinue: (fields: ManuscriptFieldsState) => void | Promise<void>;
}

export const BookStep: React.FC<BookStepProps> = ({ initial, error, onBack, onContinue }) => {
  const [fields, setFields] = useState<ManuscriptFieldsState>(initial);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const shownError = error || fieldError;
  return (
    <StepColumn screen="book">
      <OpenTitle title={BOOK_TITLE} sub={BOOK_SUB} />
      <StepCard>
        <ManuscriptFields value={fields} onChange={(v) => { setFields(v); if (fieldError) setFieldError(null); }} />
        {shownError && <FieldError>{shownError}</FieldError>}
        <StepFoot left={<BackLink onClick={onBack} />}>
          <button
            type="button" className="sf-btn" disabled={saving}
            onClick={() => {
              if (!fields.title.trim()) { setFieldError("Give it a title — even a working one."); return; }
              /* Required for the reason BranchA requires it: an agent's fit is matched on genre. */
              if (!fields.genre) { setFieldError("Pick the primary genre — agents search by it."); return; }
              setFieldError(null);
              setSaving(true);
              void Promise.resolve(onContinue(fields)).finally(() => setSaving(false));
            }}
          >
            Continue
          </button>
        </StepFoot>
      </StepCard>
    </StepColumn>
  );
};
