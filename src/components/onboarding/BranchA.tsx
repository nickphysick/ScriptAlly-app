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
import { Form11Card, SelectRow, BookMotif, FONT_SANS } from "./chrome";
import { ManuscriptFields, ManuscriptFieldsState, emptyManuscriptFields } from "./ManuscriptFields";

export interface BranchAResult {
  status: ManuscriptStatus;
  fields: ManuscriptFieldsState;
}

export interface BranchAProps {
  onSkip: () => void;
  /** Back from A2 — returns to the welcome step. */
  onExit: () => void;
  /** A3a Continue (Ready to Query / Revising) — save, then on to the agents step. */
  onSaveReady: (r: BranchAResult) => void;
  /** A3b "Save & explore agents →" (Still writing) — save as Drafting, route to the agent database. */
  onSaveStillWriting: (r: BranchAResult) => void;
  /** Surfaced save/limit error from the parent (e.g. the Free-tier manuscript cap). */
  error?: string | null;
}

const READINESS: { status: ManuscriptStatus; title: string; desc: string; icon: React.ReactNode }[] = [
  {
    status: ManuscriptStatus.DRAFTING,
    title: "Still writing it",
    desc: "I'm partway through the draft.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    status: ManuscriptStatus.REVISING,
    title: "Revising — nearly there",
    desc: "Drafted, working through edits.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4v16h16v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    status: ManuscriptStatus.READY_TO_QUERY,
    title: "Ready to query",
    desc: "Polished and ready to send to agents.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" />
      </svg>
    ),
  },
];

export const BranchA: React.FC<BranchAProps> = ({ onSkip, onExit, onSaveReady, onSaveStillWriting, error }) => {
  const [screen, setScreen] = useState<"readiness" | "details">("readiness");
  const [status, setStatus] = useState<ManuscriptStatus | null>(null);
  const [fields, setFields] = useState<ManuscriptFieldsState>(emptyManuscriptFields());
  const [fieldError, setFieldError] = useState<string | null>(null);

  const go = (s: "readiness" | "details") => setScreen(s);

  const stillWriting = status === ManuscriptStatus.DRAFTING;
  const shownError = error || fieldError;

  if (screen === "readiness") {
    return (
      <Form11Card
        dotIndex={1}
        onSkip={onSkip}
        pre="Your manuscript"
        name="Where are you with it?"
        sub="No wrong answer — it points us the right way"
        motif={<BookMotif />}
        onBack={onExit}
        primaryLabel="Continue →"
        primaryDisabled={!status}
        onPrimary={() => status && go("details")}
      >
        {READINESS.map((r) => (
          <SelectRow
            key={r.status}
            icon={r.icon}
            title={r.title}
            desc={r.desc}
            selected={status === r.status}
            onClick={() => setStatus(r.status)}
          />
        ))}
      </Form11Card>
    );
  }

  // A3 — details, in the variant the readiness answer picked.
  return (
    <Form11Card
      dotIndex={1}
      onSkip={onSkip}
      pre="Your manuscript"
      name={stillWriting ? "No rush at all" : "A little about it"}
      sub={stillWriting ? "We'll keep it safe for when you're ready" : "Just the essentials — flesh it out anytime"}
      motif={<BookMotif />}
      onBack={() => go("readiness")}
      primaryLabel={stillWriting ? "Save & explore agents →" : "Continue →"}
      onPrimary={() => {
        if (!stillWriting && !fields.title.trim()) {
          setFieldError("Give it a title — even a working one.");
          return;
        }
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
      <ManuscriptFields
        value={fields}
        onChange={(v) => { setFields(v); if (fieldError) setFieldError(null); }}
        titleLabel={stillWriting ? "Working title" : "Manuscript title"}
        titleOptional={stillWriting}
        showStrapline={!stillWriting}
        showWordCount={!stillWriting}
      />

      {stillWriting && (
        <div
          style={{
            display: "flex", gap: 10, background: "#e7ece1", border: "0.5px solid #c4d0bc",
            borderRadius: 9, padding: "12px 13px", marginTop: 2,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a6e58" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" />
          </svg>
          <p style={{ fontFamily: FONT_SANS, fontSize: 12, lineHeight: 1.55, color: "#44563a", margin: 0 }}>
            ScriptAlly comes into its own once you're ready to query. While you finish the book, get a
            head start by researching agents who'd suit it — your manuscript stays right here.
          </p>
        </div>
      )}

      {shownError && (
        <p style={{ fontFamily: FONT_SANS, fontSize: 12, color: "#a0392a", margin: "10px 2px 0" }}>{shownError}</p>
      )}
    </Form11Card>
  );
};
