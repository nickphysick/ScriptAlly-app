/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Branch B — "Already querying" (capture the book, then bring the pipeline across):
 *   B2 · The book you're querying — full manuscript field set; status set to Querying silently.
 *   B3 · Bring it across — the pipeline import options (built in the Smart Import stage).
 * Presentational + local state; the manuscript write happens in Onboarding.tsx.
 */
import React, { useState } from "react";
import { Form11Card, BookMotif, InboxMotif, FONT_SANS } from "./chrome";
import { ManuscriptFields, ManuscriptFieldsState, emptyManuscriptFields } from "./ManuscriptFields";

export interface BranchBProps {
  onSkip: () => void;
  /** Back from B2 — returns to the welcome step. */
  onExit: () => void;
  /**
   * B2 Continue — parent saves the manuscript (status Querying) and resolves true on success;
   * the branch advances to the pipeline screen only when the save lands.
   */
  onSaveBook: (fields: ManuscriptFieldsState) => Promise<boolean>;
  /** Surfaced save/limit error from the parent (e.g. the Free-tier manuscript cap). */
  error?: string | null;
}

export const BranchB: React.FC<BranchBProps> = ({ onSkip, onExit, onSaveBook, error }) => {
  const [screen, setScreen] = useState<"book" | "pipeline">("book");
  const [fields, setFields] = useState<ManuscriptFieldsState>(emptyManuscriptFields());
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const shownError = error || fieldError;

  if (screen === "book") {
    return (
      <Form11Card
        dotIndex={1}
        onSkip={onSkip}
        pre="Your manuscript"
        name="The book you're querying"
        sub="We'll attach your pipeline to this"
        motif={<BookMotif />}
        onBack={onExit}
        primaryLabel="Continue →"
        primaryDisabled={saving}
        onPrimary={() => {
          if (!fields.title.trim()) {
            setFieldError("Give it a title — even a working one.");
            return;
          }
          if (!fields.genre) {
            setFieldError("Pick the primary genre — agents search by it.");
            return;
          }
          setFieldError(null);
          setSaving(true);
          void onSaveBook(fields)
            .then((ok) => { if (ok) setScreen("pipeline"); })
            .finally(() => setSaving(false));
        }}
      >
        <ManuscriptFields
          value={fields}
          onChange={(v) => { setFields(v); if (fieldError) setFieldError(null); }}
        />
        {shownError && (
          <p style={{ fontFamily: FONT_SANS, fontSize: 12, color: "#a0392a", margin: "10px 2px 0" }}>{shownError}</p>
        )}
      </Form11Card>
    );
  }

  // B3 — bring the pipeline across. Options land with the Smart Import stage.
  return (
    <Form11Card
      dotIndex={2}
      onSkip={onSkip}
      pre="Your pipeline"
      name="Bring it across"
      sub="Read it from your spreadsheet, or add by hand"
      motif={<InboxMotif />}
      onBack={() => setScreen("book")}
      primaryLabel="Continue →"
      primaryDisabled
      onPrimary={() => {}}
    >
      <p style={{ fontFamily: FONT_SANS, fontSize: 13, color: "#9c8878" }}>
        Import options arrive in the next stage.
      </p>
    </Form11Card>
  );
};
