/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NudgeModal — "Send a nudge" content inside the locked FormShell. Opened from the OverToYou
 * nudge_overdue row's "Nudge" button. Collects an optional note + a check-back date; on submit the
 * caller runs logNudge (db.tsx). Purely a surface: no Firestore writes happen here.
 */
import React, { useState } from "react";
import { ConciergeBell } from "lucide-react";
import { FormShell } from "./forms/FormShell";
import { CheckBackSlider } from "./forms/CheckBackSlider";

const DAY_MS = 24 * 60 * 60 * 1000;
const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

export interface NudgeModalProps {
  agentName: string | null; // null when no agent is on record → "They've …"
  agency: string;
  dateSent?: string;
  responseDeadline?: string;
  onClose: () => void;
  onConfirm: (args: { checkBackDate: string; note?: string }) => Promise<void>;
  /** The quiet "Close this query instead →" route (existing close / no-response flow). */
  onCloseInstead: () => void;
}

export const NudgeModal: React.FC<NudgeModalProps> = ({
  agentName,
  agency,
  dateSent,
  responseDeadline,
  onClose,
  onConfirm,
  onCloseInstead,
}) => {
  const [note, setNote] = useState("");
  const [days, setDays] = useState(14); // default "2 weeks"
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const firstName = agentName ? agentName.split(" ")[0] : null;
  const subjectClause = firstName ? `${firstName} has` : "They've";
  const subLine = [agentName, agency].filter(Boolean).join(" · ");

  // Context sentence — "X weeks and Y days" since sent; "Z days overdue" from the deadline.
  const now = Date.now();
  const sentenceParts: string[] = [];
  if (dateSent) {
    const d = Math.max(0, Math.floor((now - new Date(dateSent).getTime()) / DAY_MS));
    const weeks = Math.floor(d / 7);
    const rem = d % 7;
    const waited = weeks > 0 ? `${plural(weeks, "week")} and ${plural(rem, "day")}` : plural(rem, "day");
    sentenceParts.push(`${subjectClause} had your query for ${waited}.`);
  } else {
    sentenceParts.push(`${subjectClause} had your query for a while now.`);
  }
  if (responseDeadline) {
    const overdueDays = Math.max(0, Math.floor((now - new Date(responseDeadline).getTime()) / DAY_MS));
    sentenceParts.push(`Their response is ${plural(overdueDays, "day")} overdue.`);
  }
  const sentence = sentenceParts.join(" ");

  // A copyable follow-up draft — the user pastes it into their own email client (5c). Deliberately
  // brief and warm; built from what we know (agent first name + send date). We never send it.
  const followUpDraft = [
    `Dear ${firstName || "there"},`,
    "",
    `I hope this finds you well. I'm writing to gently follow up on my query${dateSent ? `, sent on ${new Date(dateSent).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""}. I remain very enthusiastic about the possibility of working together, and would be grateful for any update when you have a moment.`,
    "",
    "With thanks for your time,",
  ].join("\n");
  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(followUpDraft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked — the draft is still visible to select manually */ }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const target = new Date();
    target.setHours(0, 0, 0, 0);
    target.setDate(target.getDate() + days);
    try {
      await onConfirm({ checkBackDate: target.toISOString(), note: note.trim() || undefined });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormShell
      preLabel="Response overdue"
      name="Send a nudge"
      subLine={subLine || undefined}
      avatarIcon={<ConciergeBell className="w-[18px] h-[18px]" />}
      buttonLabel="Log nudge"
      onSubmit={handleSubmit}
      submitting={submitting}
      onClose={onClose}
      dirty={note.trim().length > 0}
    >
      <p style={{ fontFamily: "'Source Sans Pro', sans-serif", fontSize: 13, lineHeight: 1.5, color: "#5a4034", marginBottom: 14 }}>
        {sentence}
      </p>

      {/* Copyable follow-up draft — a starting point to paste into your own email (5c). */}
      <div style={{ border: "1px solid #e6dccd", borderRadius: 10, background: "#fdfaf5", padding: "11px 13px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a89a8a" }}>Follow-up draft</span>
          <button type="button" onClick={copyDraft} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, color: copied ? "#3f5340" : "#7c3a2a", background: copied ? "#eef2ec" : "#f6cfc9", border: "none", borderRadius: 99, padding: "5px 12px", cursor: "pointer" }}>
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <pre style={{ fontFamily: "'Source Sans Pro', sans-serif", fontSize: 12.5, lineHeight: 1.5, color: "#5a4034", whiteSpace: "pre-wrap", margin: 0 }}>{followUpDraft}</pre>
      </div>

      <label className="sa-label" htmlFor="nudge-note">
        Add a note <span className="sa-opt">optional</span>
      </label>
      <textarea
        id="nudge-note"
        className="sa-input sa-textarea"
        placeholder="Paste the note you sent, if you'd like to keep it on record."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <CheckBackSlider valueDays={days} onChangeDays={setDays} />

      <button
        type="button"
        className="sa-notspec-link"
        style={{ textAlign: "left", marginTop: 2, marginBottom: 0 }}
        onClick={onCloseInstead}
      >
        Close this query instead →
      </button>
    </FormShell>
  );
};
