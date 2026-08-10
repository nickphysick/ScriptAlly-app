/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADD AN AGENT, INLINE — lifted out of `AgentSearchField`.
 *
 * ⚠️ THIS COMPONENT EXISTS SO THE LEGACY FIELD CAN DIE. The form was living inside a combobox, so
 * the only way to reach it was to mount the combobox — which put a second "Search by name or
 * agency…" on stage 1 whose popup opened on focus, and made the panel's "Add a new agent" appear
 * to open a list of existing agents (it was scrolling to that field). Two attempts to delete the
 * duplicate field failed because the form was trapped behind it. Extracting the form is what
 * actually removes the blocker.
 *
 * ⚠️ IT OWNS NO SEARCH, and must not grow one. The picker searches; this records. A field here
 * would put the page back where it started.
 *
 * The write path is UNCHANGED — `onCreateAgent` is the same contract the popup called, so an agent
 * added here is born with exactly the shape it always was. Every field the old form collected is
 * kept: dropping the email, the response time or the rating would quietly reduce what an inline
 * add records, and the rating in particular is the writer stating their own judgement (which is
 * why it survived the no-stars rule — that banned the app RANKING agents, not the writer rating
 * one).
 */
import React, { useRef, useState } from "react";
import type { Agent } from "../../types";

export interface AgentQuickAddProps {
  /** Prefills the name when the writer typed something that matched nothing. */
  initialName?: string;
  onCreateAgent: (d: { name: string; agency: string; email: string; responseTimeWeeks?: number; starRating?: number }) => Promise<{ ok: boolean; error?: string; agent?: Agent }>;
  /** Called with the new agent once it is saved — the caller selects it. */
  onCreated: (a: Agent) => void;
  /** Esc and Cancel both land here; the caller returns focus to the search field. */
  onCancel: () => void;
}

export const AgentQuickAdd: React.FC<AgentQuickAddProps> = ({
  initialName = "", onCreateAgent, onCreated, onCancel,
}) => {
  const [name, setName] = useState(initialName);
  const [agency, setAgency] = useState("");
  const [email, setEmail] = useState("");
  const [weeks, setWeeks] = useState("");
  const [rating, setRating] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError("Please enter the agent's name.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await onCreateAgent({
        name: name.trim(),
        agency: agency.trim(),
        email: email.trim(),
        responseTimeWeeks: weeks.trim() === "" ? undefined : parseInt(weeks, 10),
        starRating: rating,
      });
      if (!res.ok) { setError(res.error || "Could not add that agent."); return; }
      if (res.agent) onCreated(res.agent);
    } finally {
      setSaving(false);
    }
  };

  return (
    /* ⚠️ ESC IS HANDLED HERE AND STOPPED HERE. The pane behind this has its own Escape — it
       discards the whole draft — so letting the key through would turn "I have changed my mind
       about adding an agent" into "I have thrown away the query I was writing". */
    <div
      className="qc-qa"
      ref={formRef}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); }
      }}
    >
      <div className="qc-qahead">Add a new agent</div>
      <input className="qc-qain" autoFocus placeholder="Agent name" aria-label="Agent name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="qc-qain" placeholder="Agency" aria-label="Agency" value={agency} onChange={(e) => setAgency(e.target.value)} />
      <input className="qc-qain" placeholder="Email (optional)" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="qc-qarow">
        <input
          className="qc-qain"
          inputMode="numeric"
          placeholder="Response wks (optional)"
          aria-label="Response time in weeks"
          value={weeks}
          onChange={(e) => setWeeks(e.target.value.replace(/[^0-9]/g, ""))}
        />
        {/* ⚠️ THE WRITER'S OWN RATING, NOT THE APP'S. The no-stars rule banned the app ORDERING or
            scoring agents; recording what you think of one is the opposite of that. */}
        <div className="qc-qastars" role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={rating === s}
              aria-label={`${s} star${s === 1 ? "" : "s"}`}
              className={`qc-qastar${rating >= s ? " on" : ""}`}
              onClick={() => setRating(s)}
            >★</button>
          ))}
        </div>
      </div>
      {error && <div className="qc-qaerr">{error}</div>}
      <div className="qc-qaacts">
        <button type="button" className="qc-back" onClick={onCancel}>Cancel</button>
        <button type="button" className="qc-next" disabled={saving} onClick={submit}>
          {saving ? "Adding…" : "Add and select"}
        </button>
      </div>
    </div>
  );
};
