/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Lottie from "lottie-react";
import { Send } from "lucide-react";
import { useScriptAllyDb } from "../lib/db";
import { QueryStatus, Agent, SubmissionMethod } from "../types";
import { FormShell, BrandDropdown, BrandDatePicker, FormField } from "./forms";
import planeAnimation from "../assets/query-plane-animation.json";

interface LogQueryFocusFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (message: string) => void;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const LogQueryFocusForm: React.FC<LogQueryFocusFormProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const { manuscripts, agents, addQuery } = useScriptAllyDb();

  // ── Save-path state — read verbatim by handleFormSubmit (unchanged) ──
  const [selectedManuscriptId, setSelectedManuscriptId] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [dateSent, setDateSent] = useState<string>("");
  const [sendMethod, setSendMethod] = useState<SubmissionMethod>(SubmissionMethod.EMAIL);
  const [personalizationNotes, setPersonalizationNotes] = useState<string>("");
  const [queryLetterChecked, setQueryLetterChecked] = useState<boolean>(false);
  const [synopsisChecked, setSynopsisChecked] = useState<boolean>(false);
  const [samplePagesChecked, setSamplePagesChecked] = useState<boolean>(false);
  // Saved as packageId. The package browser is deferred; the field keeps its default so the
  // payload is unchanged (a query logged without a package saves packageId: "").
  const [selectedPackageId] = useState<string>("");
  const [responseDeadlineDate, setResponseDeadlineDate] = useState<string>("");
  const [ifNoResponseAction, setIfNoResponseAction] = useState<"nudge" | "close" | "nothing">("nudge");
  // Nudge timing — shown when "If no response" = nudge. Drives the nudgeDate calc in
  // handleFormSubmit (week_before → −7d, day_before → −1d, on_deadline → the deadline itself).
  const [nudgeReminderWhen, setNudgeReminderWhen] = useState<"week_before" | "day_before" | "on_deadline">("week_before");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSelectedManuscriptId(manuscripts.length > 0 ? manuscripts[0].id : "");
      setSelectedAgent(null);
      setDateSent(new Date().toISOString().split("T")[0]);
      setSendMethod(SubmissionMethod.EMAIL);
      setPersonalizationNotes("");
      setQueryLetterChecked(false);
      setSynopsisChecked(false);
      setSamplePagesChecked(false);
      setResponseDeadlineDate("");
      setIfNoResponseAction("nudge");
      setNudgeReminderWhen("week_before");
      setFormError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, manuscripts]);

  // Auto-calculate the expected response deadline from the agent + date sent (unchanged)
  useEffect(() => {
    if (selectedAgent) {
      const weeks = selectedAgent.responseTimeWeeks || 6;
      const targetDate = new Date(dateSent || new Date());
      targetDate.setDate(targetDate.getDate() + (weeks * 7));
      setResponseDeadlineDate(targetDate.toISOString().split("T")[0]);
    }
  }, [selectedAgent, dateSent]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAgentChange = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId) || null;
    setSelectedAgent(agent);
    setFormError(null);
    // Auto-populate the agent's default delivery method.
    if (agent) {
      setSendMethod(
        agent.submissionMethod === "Online Form" ? SubmissionMethod.ONLINE_FORM : SubmissionMethod.EMAIL
      );
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  //  SAVE PATH — byte-for-byte the version we just fixed. Builds materialsWanted
  //  from the canonical vocabulary, maps the if-no-response choice into the shared
  //  ifNoResponse field (which drives auto-close), and sets QueryStatus.QUERIED.
  //  Presentation never touches this.
  // ───────────────────────────────────────────────────────────────────────────
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) {
      setFormError("Agent is required.");
      return;
    }
    if (!selectedManuscriptId) {
      setFormError("Manuscript selection is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    // Calc custom nudgeDate if selected
    let nudgeDate: string | undefined = undefined;
    if (ifNoResponseAction === "nudge" && responseDeadlineDate) {
      const d = new Date(responseDeadlineDate);
      if (nudgeReminderWhen === "week_before") {
        d.setDate(d.getDate() - 7);
      } else if (nudgeReminderWhen === "day_before") {
        d.setDate(d.getDate() - 1);
      }
      nudgeDate = d.toISOString();
    }

    // Combine materials list for the query record. Values use the app's canonical vocabulary
    // ("Query Letter" / "Synopsis" / "Sample Pages") so the screens that read materialsWanted
    // (RecordResponseModal, the query detail, etc.) display and filter them consistently.
    const materials: string[] = [];
    if (queryLetterChecked) materials.push("Query Letter");
    if (synopsisChecked) materials.push("Synopsis");
    if (samplePagesChecked) materials.push("Sample Pages");

    // Persist the "if no response" choice in the existing ifNoResponse field/vocabulary used by
    // the query edit form, so both forms read/write the same field and the auto-close mechanism
    // (db.tsx) can key off "Mark as no response automatically".
    const ifNoResponseValue =
      ifNoResponseAction === "nudge"
        ? "Remind me to nudge"
        : ifNoResponseAction === "close"
        ? "Mark as no response automatically"
        : "Do nothing";

    try {
      const newQueryPayload = {
        manuscriptId: selectedManuscriptId,
        agentId: selectedAgent.id,
        packageId: selectedPackageId,
        personalisationNotes: personalizationNotes,
        sendMethod,
        dateSent: new Date(dateSent).toISOString(),
        responseDeadline: new Date(responseDeadlineDate).toISOString(),
        nudgeDate,
        materialsWanted: materials,
        ifNoResponse: ifNoResponseValue,
        status: QueryStatus.QUERIED
      };

      const result = await addQuery(newQueryPayload);

      if (result.success) {
        setIsSubmitting(false);
        onSuccessToast("Query logged successfully");
        onClose();
      } else {
        setFormError(result.error || "An error occurred while saving the query.");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  // ── Presentation (Form 11 shell + foundation components) ──
  const agentOptions = agents.map((a) => ({ value: a.id, label: a.name }));
  const manuscriptOptions = manuscripts.map((m) => ({ value: m.id, label: m.title }));
  const methodOptions = [
    { value: SubmissionMethod.EMAIL, label: "Email" },
    { value: "Query Manager", label: "Query Manager" },
    { value: SubmissionMethod.ONLINE_FORM, label: "Online form" },
  ];
  const ifNoResponseOptions = [
    { value: "nudge", label: "Remind me to send a nudge" },
    { value: "close", label: "Mark as closed" },
    { value: "nothing", label: "Do nothing" },
  ];
  const nudgeWhenOptions = [
    { value: "week_before", label: "One week before the deadline" },
    { value: "day_before", label: "The day before the deadline" },
    { value: "on_deadline", label: "On the deadline" },
  ];

  return (
    <div
      className="sa-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sa-overlay-inner">
        <FormShell
          preLabel="Logging a query to"
          name={selectedAgent ? selectedAgent.name : "Select an agent"}
          subLine={selectedAgent ? selectedAgent.agency : "Choose who you're querying"}
          avatarInitials={selectedAgent ? getInitials(selectedAgent.name) : undefined}
          avatarIcon={selectedAgent ? undefined : <Send size={16} strokeWidth={2} />}
          cornerMotif={<Lottie animationData={planeAnimation} loop autoplay style={{ width: 84, height: 84 }} />}
          buttonLabel="Log this query"
          onSubmit={() => void handleFormSubmit({ preventDefault() {} } as React.FormEvent)}
          submitting={isSubmitting}
        >
          <FormField label="Agent">
            <BrandDropdown
              value={selectedAgent?.id || ""}
              options={agentOptions}
              onChange={handleAgentChange}
              placeholder="Search literary agents…"
            />
          </FormField>

          <FormField label="Manuscript">
            <BrandDropdown
              value={selectedManuscriptId}
              options={manuscriptOptions}
              onChange={setSelectedManuscriptId}
              placeholder="Select a manuscript"
            />
          </FormField>

          <FormField label="Materials sent">
            <div className="sa-chips">
              {[
                { label: "Query Letter", on: queryLetterChecked, toggle: () => setQueryLetterChecked((v) => !v) },
                { label: "Synopsis", on: synopsisChecked, toggle: () => setSynopsisChecked((v) => !v) },
                { label: "Sample Pages", on: samplePagesChecked, toggle: () => setSamplePagesChecked((v) => !v) },
              ].map((chip) => (
                <div
                  key={chip.label}
                  className={`sa-chip${chip.on ? " sel" : ""}`}
                  role="button"
                  aria-pressed={chip.on}
                  onClick={chip.toggle}
                >
                  {chip.label}
                </div>
              ))}
            </div>
          </FormField>

          <FormField label="Date sent">
            <BrandDatePicker value={dateSent} onChange={setDateSent} />
          </FormField>

          <FormField label="Send method">
            <BrandDropdown
              value={sendMethod}
              options={methodOptions}
              onChange={(v) => setSendMethod(v as SubmissionMethod)}
            />
          </FormField>

          <FormField label="If no response">
            <BrandDropdown
              value={ifNoResponseAction}
              options={ifNoResponseOptions}
              onChange={(v) => setIfNoResponseAction(v as "nudge" | "close" | "nothing")}
            />
          </FormField>

          {ifNoResponseAction === "nudge" && (
            <FormField label="When should we remind you?">
              <BrandDropdown
                value={nudgeReminderWhen}
                options={nudgeWhenOptions}
                onChange={(v) => setNudgeReminderWhen(v as "week_before" | "day_before" | "on_deadline")}
              />
            </FormField>
          )}

          <FormField label="Personalisation notes">
            <textarea
              className="sa-input sa-textarea"
              value={personalizationNotes}
              onChange={(e) => setPersonalizationNotes(e.target.value)}
              placeholder="e.g. Referenced her MSWL post about gothic fiction…"
            />
          </FormField>

          {formError && <div className="sa-error">{formError}</div>}
        </FormShell>
      </div>
    </div>
  );
};
