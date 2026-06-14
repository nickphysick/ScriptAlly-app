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
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, lineHeight: 1.5, color: "#5a4034", marginBottom: 16 }}>
        {sentence}
      </p>

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
