/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import Lottie from "lottie-react";
import { Send } from "lucide-react";
import { useScriptAllyDb } from "../lib/db";
import { pickableManuscripts } from "../lib/lifecycle";
import { QueryStatus, Agent, SubmissionMethod, SubmissionStatus, QueryMaterial } from "../types";
import { FormShell, BrandDropdown, BrandDatePicker, FormField } from "./forms";
import { MaterialsField } from "./MaterialsField";
import { materialsLinkWrites, resolveActivePackage } from "../lib/packageMetrics";
import { AgentSearchField } from "./AgentSearchField";
import { EditAgentDrawer } from "./EditAgentDrawer";
import planeAnimation from "../assets/query-plane-animation.json";

interface LogQueryFocusFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (message: string) => void;
  /** Routing for the MaterialsField "Upgrade to Pro" / empty-state links (closes the form first). */
  onNavigate?: (tab: string, subPageName?: string) => void;
  /** Open with this agent preselected (the Agents page Send-query/Up-next seam; Discover reuses it
   *  later). Resolved against `agents` on open, mirroring handleAgentSelect's send-method default.
   *  Absent (or unresolvable) → behaviour is unchanged: the form opens with no agent. */
  initialAgentId?: string;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// Parse a "YYYY-MM-DD" as a LOCAL date (avoids the UTC-midnight off-by-one) and format it long.
const formatExpectedDate = (d: string): string => {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export const LogQueryFocusForm: React.FC<LogQueryFocusFormProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
  onNavigate,
  initialAgentId,
}) => {
  const { manuscripts, agents, queries, packages, addQuery, addAgent, currentUser } = useScriptAllyDb();

  // ── Save-path state — read verbatim by handleFormSubmit (unchanged) ──
  const [selectedManuscriptId, setSelectedManuscriptId] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [dateSent, setDateSent] = useState<string>("");
  const [sendMethod, setSendMethod] = useState<SubmissionMethod>(SubmissionMethod.EMAIL);
  const [personalizationNotes, setPersonalizationNotes] = useState<string>("");
  // Materials actually sent — structured (type + quantity per material), written verbatim to
  // materialsWanted. Each entry is a plain label when unquantified, or a QueryMaterial when it
  // carries a type/quantity ("50 pages").
  const [materialsSent, setMaterialsSent] = useState<(string | QueryMaterial)[]>([]);
  // The attached submission package, saved as packageId (mutually exclusive with free-text
  // materialsWanted — see the materialsLinkWrites guard on save). "" === free text.
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [responseDeadlineDate, setResponseDeadlineDate] = useState<string>("");
  const [ifNoResponseAction, setIfNoResponseAction] = useState<"nudge" | "close" | "nothing">("nudge");
  // Nudge timing — shown when "If no response" = nudge. Drives the nudgeDate calc in
  // handleFormSubmit (week_before → −7d, day_before → −1d, on_deadline → the deadline itself,
  // custom → the date the user picks in customNudgeDate).
  const [nudgeReminderWhen, setNudgeReminderWhen] = useState<"week_before" | "day_before" | "on_deadline" | "custom">("week_before");
  const [customNudgeDate, setCustomNudgeDate] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // Stub-completion: opens EditAgentDrawer OVER this form so a writer can fill a quick-added agent's
  // missing fields (chiefly responseTimeWeeks) without leaving the log flow.
  const [completeStubOpen, setCompleteStubOpen] = useState<boolean>(false);

  // Manuscripts offered for a NEW query — shelved books are hidden (their queries/stats are kept,
  // they're just not query-able targets). lifecycle.ts.
  const pickable = useMemo(() => pickableManuscripts(manuscripts), [manuscripts]);

  // Reset on open (initialAgentId, when provided AND resolvable, preselects that agent with the
  // same send-method default handleAgentSelect applies — otherwise byte-for-byte the old reset).
  useEffect(() => {
    if (isOpen) {
      const preselected = initialAgentId ? agents.find((a) => a.id === initialAgentId) ?? null : null;
      setSelectedManuscriptId(pickable.length > 0 ? pickable[0].id : "");
      setSelectedAgent(preselected);
      setDateSent(new Date().toISOString().split("T")[0]);
      setSendMethod(
        preselected && preselected.submissionMethod === "Online Form"
          ? SubmissionMethod.ONLINE_FORM
          : SubmissionMethod.EMAIL
      );
      setPersonalizationNotes("");
      setMaterialsSent([]);
      setSelectedPackageId("");
      setResponseDeadlineDate("");
      setIfNoResponseAction("nudge");
      setNudgeReminderWhen("week_before");
      setCustomNudgeDate("");
      setFormError(null);
      setIsSubmitting(false);
      setCompleteStubOpen(false);
    }
  }, [isOpen, pickable, initialAgentId]);

  // Packages are per-manuscript. When the target manuscript changes (and on open), pre-fill the
  // attached package from that manuscript's chosen ACTIVE package — resolveActivePackage returns ""
  // when there's no active one (or it's retired/missing), so a query never links a stale or
  // cross-manuscript package. The writer can still detach to free text in MaterialsField.
  useEffect(() => {
    const m = manuscripts.find((mm) => mm.id === selectedManuscriptId);
    setSelectedPackageId(resolveActivePackage(m, packages)?.id ?? "");
  }, [selectedManuscriptId, manuscripts, packages]);

  // Re-sync the selected agent from live state: after the stub-completion drawer saves through
  // saveAgentEdits, the agents array updates and the freshly-filled responseTimeWeeks flows back in,
  // re-arming the deadline effect + clearing the "no response time" notice. A just-quick-added agent
  // may not be in `agents` yet — keep the local snapshot until its row lands.
  useEffect(() => {
    if (!selectedAgent) return;
    const fresh = agents.find((a) => a.id === selectedAgent.id);
    if (fresh && fresh !== selectedAgent) setSelectedAgent(fresh);
  }, [agents, selectedAgent]);

  // Auto-calculate the expected response deadline from the agent + date sent (unchanged)
  useEffect(() => {
    if (selectedAgent) {
      const weeks = selectedAgent.responseTimeWeeks || 6;
      const targetDate = new Date(dateSent || new Date());
      targetDate.setDate(targetDate.getDate() + (weeks * 7));
      setResponseDeadlineDate(targetDate.toISOString().split("T")[0]);
    }
  }, [selectedAgent, dateSent]);

  // Agents already queried — scoped to the selected manuscript (per-manuscript "already queried");
  // falls back to global only when no manuscript exists. Recomputes when the manuscript changes.
  const queriedAgentIds = useMemo(() => {
    const ids = new Set<string>();
    queries.forEach((qq) => {
      if (!selectedManuscriptId || qq.manuscriptId === selectedManuscriptId) ids.add(qq.agentId);
    });
    return ids;
  }, [queries, selectedManuscriptId]);

  if (!isOpen) return null;

  // The form holds real work once the user has picked an agent, ticked materials, written notes,
  // or moved any field off its reset default — gates FormShell's discard confirm on close. When
  // initialAgentId seeded the open, the SEEDED agent + its send-method default ARE the reset
  // baseline (the user typed nothing), so only a change away from them counts as dirty.
  const seededAgent = initialAgentId ? agents.find((a) => a.id === initialAgentId) ?? null : null;
  const seededMethod =
    seededAgent && seededAgent.submissionMethod === "Online Form"
      ? SubmissionMethod.ONLINE_FORM
      : SubmissionMethod.EMAIL;
  const isDirty =
    (selectedAgent?.id ?? null) !== (seededAgent?.id ?? null) ||
    materialsSent.length > 0 ||
    personalizationNotes.trim() !== "" ||
    sendMethod !== seededMethod ||
    ifNoResponseAction !== "nudge" ||
    nudgeReminderWhen !== "week_before" ||
    customNudgeDate !== "";

  // Select an agent OBJECT directly (works for both the search list and a just-quick-added agent
  // whose row may not be in `agents` state yet). Auto-populates the agent's default delivery method.
  const handleAgentSelect = (agent: Agent | null) => {
    setSelectedAgent(agent);
    setFormError(null);
    if (agent) {
      setSendMethod(
        agent.submissionMethod === "Online Form" ? SubmissionMethod.ONLINE_FORM : SubmissionMethod.EMAIL
      );
    }
  };

  // Quick-add: build a SCHEMA-COMPATIBLE agent (full isValidAgent payload with sensible defaults for
  // every omitted required field) so the agents database + its filters don't break. Returns the new
  // agent for immediate selection. A blank response time → 0, which the "Response expected by" line
  // surfaces as the "no response time yet" fallback. The Free-tier cap error bubbles up verbatim.
  const handleCreateAgent = async (draft: {
    name: string;
    agency: string;
    email: string;
    responseTimeWeeks?: number;
    starRating?: number;
  }): Promise<{ ok: boolean; error?: string; agent?: Agent }> => {
    const weeks = draft.responseTimeWeeks ?? 0;
    const rating = (draft.starRating ?? 3) as 1 | 2 | 3 | 4 | 5;
    const payload = {
      name: draft.name.trim(),
      agency: draft.agency.trim(),
      email: draft.email.trim(),
      website: "",
      genres: [] as string[],
      mswlNotes: "",
      starRating: rating,
      submissionStatus: SubmissionStatus.OPEN,
      responseTimeWeeks: weeks,
      noResponseMeansNo: false,
      submissionMethod: SubmissionMethod.EMAIL,
      materialsWanted: ["Query Letter"],
      notes: "",
      agentNotes: "",
    };
    const result = await addAgent(payload);
    if (!result.success || !result.id) return { ok: false, error: result.error };
    const agent: Agent = {
      ...payload,
      id: result.id,
      userId: currentUser?.id || "",
      dateAdded: new Date().toISOString(),
      lastCheckedDate: new Date().toISOString(),
    };
    return { ok: true, agent };
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

    // Calc nudgeDate when a reminder is wanted. Presets are relative to the response deadline
    // (week_before −7d / day_before −1d / on_deadline = the deadline); "custom" uses the exact
    // date the user picked in the BrandDatePicker — fed into the same nudgeDate value.
    let nudgeDate: string | undefined = undefined;
    if (ifNoResponseAction === "nudge") {
      if (nudgeReminderWhen === "custom") {
        if (customNudgeDate) nudgeDate = new Date(customNudgeDate).toISOString();
      } else if (responseDeadlineDate) {
        const d = new Date(responseDeadlineDate);
        if (nudgeReminderWhen === "week_before") {
          d.setDate(d.getDate() - 7);
        } else if (nudgeReminderWhen === "day_before") {
          d.setDate(d.getDate() - 1);
        }
        nudgeDate = d.toISOString();
      }
    }

    // Materials for the query record. Written verbatim from the structured editor: each entry is
    // a canonical label ("Query Letter") or a QueryMaterial carrying type+quantity ("50 pages").
    // Screens that read materialsWanted route every item through formatQueryMaterial.
    const materials = materialsSent;

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
        // Guard #1: write the package link OR the free-text materials, never both.
        ...materialsLinkWrites({ packageId: selectedPackageId, materials }),
        personalisationNotes: personalizationNotes,
        sendMethod,
        dateSent: new Date(dateSent).toISOString(),
        responseDeadline: new Date(responseDeadlineDate).toISOString(),
        nudgeDate,
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
  // Manuscript the queried/not-queried tags reflect — only surfaced when there's more than one.
  const manuscriptLabel =
    pickable.length > 1 ? pickable.find((m) => m.id === selectedManuscriptId)?.title : undefined;
  const manuscriptOptions = pickable.map((m) => ({ value: m.id, label: m.title }));
  const methodOptions = [
    { value: SubmissionMethod.EMAIL, label: "Email" },
    { value: SubmissionMethod.ONLINE_FORM, label: "Online form" },
    { value: SubmissionMethod.QUERY_MANAGER, label: "Query Manager" },
    { value: SubmissionMethod.POST, label: "Post" },
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
    { value: "custom", label: "Set custom date" },
  ];

  // Defined once so it can render full-width on its own (close/nothing) or paired with the nudge
  // timing (nudge) without duplicating the control.
  const ifNoResponseField = (
    <FormField label="If no response">
      <BrandDropdown
        value={ifNoResponseAction}
        options={ifNoResponseOptions}
        onChange={(v) => setIfNoResponseAction(v as "nudge" | "close" | "nothing")}
      />
    </FormField>
  );

  return (
    <>
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
      onClose={onClose}
      dirty={isDirty}
    >
          <AgentSearchField
            agents={agents}
            value={selectedAgent?.id || ""}
            queriedAgentIds={queriedAgentIds}
            onSelect={handleAgentSelect}
            manuscriptLabel={manuscriptLabel}
            onCreateAgent={handleCreateAgent}
          />

          <FormField label="Manuscript">
            <BrandDropdown
              value={selectedManuscriptId}
              options={manuscriptOptions}
              onChange={setSelectedManuscriptId}
              placeholder="Select a manuscript"
            />
          </FormField>

          <FormField label="Materials sent">
            <MaterialsField
              materials={materialsSent}
              onMaterialsChange={setMaterialsSent}
              packageId={selectedPackageId}
              onPackageChange={setSelectedPackageId}
              manuscriptId={selectedManuscriptId}
              palette={["Query Letter", "Synopsis", "Sample Pages"]}
              onNavigate={onNavigate ? (tab, sub) => { onClose(); onNavigate(tab, sub); } : undefined}
            />
          </FormField>

          {/* Paired row: Date sent | Send method */}
          <div className="sa-row2">
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
          </div>

          {/* "Response expected by" — stays BETWEEN the two paired rows. Surfaces the same
              responseDeadlineDate the nudge presets count back from (single source); recomputes via
              the deadline effect when the agent OR date sent changes. When the agent has no response
              time on record, say so rather than show the ||6 guess. */}
          {selectedAgent && (
            <div className="sa-expect">
              {selectedAgent.responseTimeWeeks ? (
                <>Response expected by <strong>{formatExpectedDate(responseDeadlineDate)}</strong></>
              ) : (
                <>
                  No response time on record for this agent yet.{" "}
                  <button
                    type="button"
                    className="sa-expect-action"
                    onClick={() => setCompleteStubOpen(true)}
                  >
                    Add their details
                  </button>
                </>
              )}
            </div>
          )}

          {/* Paired row: If no response | When should we remind you? — paired only when a nudge is
              wanted; otherwise "If no response" stays full-width (no half-empty row). */}
          {ifNoResponseAction === "nudge" ? (
            <div className="sa-row2">
              {ifNoResponseField}
              <FormField label="When to remind">
                <BrandDropdown
                  value={nudgeReminderWhen}
                  options={nudgeWhenOptions}
                  onChange={(v) => {
                    const next = v as "week_before" | "day_before" | "on_deadline" | "custom";
                    setNudgeReminderWhen(next);
                    // Seed the custom picker with the response deadline as a sensible starting point.
                    if (next === "custom" && !customNudgeDate) setCustomNudgeDate(responseDeadlineDate);
                  }}
                />
              </FormField>
            </div>
          ) : (
            ifNoResponseField
          )}

          {ifNoResponseAction === "nudge" && nudgeReminderWhen === "custom" && (
            <FormField label="Reminder date">
              <BrandDatePicker
                value={customNudgeDate}
                onChange={setCustomNudgeDate}
                placeholder="Pick a reminder date"
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

    {/* Stub-completion drawer — mounted OVER the form (position:fixed, z1000+). Saves through
        saveAgentEdits (deadline fan-out included); the re-sync effect pulls the filled agent back
        into selectedAgent so "Response expected by" lights up without leaving the log flow. */}
    {selectedAgent && (
      <EditAgentDrawer
        agent={selectedAgent}
        isOpen={completeStubOpen}
        onClose={() => setCompleteStubOpen(false)}
        onOpenQuery={() => setCompleteStubOpen(false)}
        onSavedToast={onSuccessToast}
      />
    )}
    </>
  );
};
