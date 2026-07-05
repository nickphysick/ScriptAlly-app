/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record-a-response screen — the dashboard hero's "Record a response" entry. A focused overlay
 * (reusing the email-import `sa-overlay` chrome + MountPanel, NOT FormShell) that hosts two ways
 * to record what came back:
 *   1. the Pro Paste-email fast lane (the relocated PasteEmailButton — Pro opens the paste flow,
 *      Free shows the upsell; it handles brand-new agents too),
 *   2. a manual flow: pick an awaiting query → choose the incoming outcome (the likely next steps
 *      pulse; a step out of order asks to confirm) → pick the date → optional note → Log it.
 *
 * Writes go through the single canonical path `recordQueryResponse` (which appends the incoming
 * rung to both activity stores and calls recomputeQuery) — never re-rolled here.
 */
import React, { useEffect, useMemo, useState } from "react";
import { CornerUpLeft, Mail, ArrowRight, Check } from "lucide-react";
import { useScriptAllyDb } from "../lib/db";
import { agentPrimary, AGENT_NOT_SPECIFIED } from "../lib/agentDisplay";
import { recordQueryResponse } from "../lib/recordResponse";
import type { RecordResponseData } from "../lib/recordResponse";
import { EXPECTED_NEXT_STEPS } from "../lib/statusOrder";
import { QueryStatus } from "../types";
import { MountPanel } from "./MountPanel";
import { FadeScroll } from "./FadeScroll";
import { StatusDot } from "./StatusDot";
import { BrandDatePicker } from "./forms";
import { EmailBandHeader } from "./emailImport/parts";
import { EmailOverlay } from "./emailImport/PasteEmailFlow";
import { PasteEmailButton } from "./emailImport/PasteEmailButton";
import {
  burgundy,
  headingInk,
  bodyInk,
  mutedInk,
  sageText,
  parchment,
  buttonPinkBg,
  buttonPinkBorder,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
} from "../lib/designTokens";

/** Outgoing states a query sits in while AWAITING a response (the manual picker's contents). */
const AWAITING_STATES: QueryStatus[] = [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT];

/** The incoming outcomes the manual flow can record, mapped to recordQueryResponse's responseType. */
const OUTCOMES: { status: QueryStatus; responseType: RecordResponseData["responseType"] }[] = [
  { status: QueryStatus.PARTIAL_REQUESTED, responseType: "partial" },
  { status: QueryStatus.FULL_REQUESTED, responseType: "full" },
  { status: QueryStatus.REVISE_RESUBMIT, responseType: "rr" },
  { status: QueryStatus.OFFER, responseType: "offer" },
  { status: QueryStatus.REJECTED, responseType: "rejected" },
];
/** Outcomes whose note has a home in the write path (rr/offer/rejected). Requests carry no note. */
const NOTE_OUTCOMES = new Set<QueryStatus>([QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.REJECTED]);

const pad = (n: number) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fieldLabel: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: "#9c8878",
  margin: "0 0 8px",
  display: "block",
};

interface RecordResponseScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string, subPageName?: string) => void;
  onSuccessToast?: (msg: string) => void;
}

export const RecordResponseScreen: React.FC<RecordResponseScreenProps> = ({ isOpen, onClose, onNavigate, onSuccessToast }) => {
  const { queries, agents, manuscripts, currentUser } = useScriptAllyDb();

  const [selectedQueryId, setSelectedQueryId] = useState("");
  const [outcome, setOutcome] = useState<QueryStatus | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<QueryStatus | null>(null); // out-of-order, awaiting confirm
  const [dateReceived, setDateReceived] = useState(todayISO());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedQueryId("");
    setOutcome(null);
    setPendingOutcome(null);
    setDateReceived(todayISO());
    setNote("");
    setSaving(false);
    setError(null);
  }, [isOpen]);

  const agentFor = (q: any) => agents.find((a) => a.id === q.agentId) || null;
  const msTitleFor = (q: any) => manuscripts.find((m) => m.id === q.manuscriptId)?.title || "Untitled";

  // Queries awaiting a response, most-recently-sent first.
  const awaiting = useMemo(
    () =>
      queries
        .filter((q) => AWAITING_STATES.includes(q.status))
        .sort((a, b) => (b.dateSent || "").localeCompare(a.dateSent || "")),
    [queries]
  );

  if (!isOpen) return null;

  const selectedQuery = queries.find((q) => q.id === selectedQueryId) || null;
  const expected = selectedQuery ? EXPECTED_NEXT_STEPS[selectedQuery.status] || [] : [];

  const selectQuery = (id: string) => {
    setSelectedQueryId(id);
    setOutcome(null);
    setPendingOutcome(null);
    setError(null);
  };

  // Reopen the picker to choose a different query (clears the in-progress outcome).
  const reopenList = () => {
    setSelectedQueryId("");
    setOutcome(null);
    setPendingOutcome(null);
    setError(null);
  };

  // Row content (StatusDot + agent · agency + manuscript · status), shared by the list and the
  // collapsed "selected" row.
  const queryRowInner = (q: any) => {
    const a = agentFor(q);
    return (
      <>
        <StatusDot status={q.status} size={20} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: FONT_SANS, fontSize: 13, color: bodyInk, fontWeight: 500 }}>
            {a ? agentPrimary(a) : AGENT_NOT_SPECIFIED}
            {a?.name?.trim() && a?.agency ? <span style={{ fontWeight: 400, color: mutedInk }}> · {a.agency}</span> : null}
          </span>
          <span style={{ display: "block", fontFamily: FONT_SANS, fontSize: 11.5, color: mutedInk, marginTop: 1 }}>
            {msTitleFor(q)} · {q.status}
          </span>
        </span>
      </>
    );
  };

  const pickOutcome = (o: QueryStatus) => {
    setError(null);
    if (!selectedQuery) return;
    if (expected.includes(o)) {
      setOutcome(o);
      setPendingOutcome(null);
    } else {
      setPendingOutcome(o); // gentle confirm before logging a step out of order
    }
  };

  const noteApplies = !!outcome && NOTE_OUTCOMES.has(outcome);
  const canLog = !!selectedQuery && !!outcome && !pendingOutcome && !saving;

  const logIt = async () => {
    if (!canLog || !currentUser || !selectedQuery || !outcome) return;
    const responseType = OUTCOMES.find((o) => o.status === outcome)!.responseType;
    const agent = agentFor(selectedQuery);
    const manuscript = manuscripts.find((m) => m.id === selectedQuery.manuscriptId) || null;
    const trimmedNote = note.trim();

    const data: RecordResponseData = {
      responseType,
      materialsType: "Pages",
      materialsQuantity: 0,
      materialsOtherText: "",
      fullVersionSent: "",
      expectedBy: "",
      sendReminderDate: "",
      dateReceived,
      rrNotes: outcome === QueryStatus.REVISE_RESUBMIT ? trimmedNote : "",
      feedbackType: outcome === QueryStatus.REJECTED && trimmedNote ? "Yes" : "Form",
      feedbackText: outcome === QueryStatus.REJECTED ? trimmedNote : "",
      privateReflection: "",
      rejectionLesson: "",
      requeryPreference: "",
      offerDate: outcome === QueryStatus.OFFER ? dateReceived : "",
      offerDeadline: "",
      offerNotes: outcome === QueryStatus.OFFER ? trimmedNote : "",
      closingReason: "No response after expected window",
      closingNotes: "",
    };

    setSaving(true);
    setError(null);
    try {
      const result = await recordQueryResponse(
        { userId: currentUser.id, query: selectedQuery, agent, manuscript },
        data
      );
      const who = agent?.name?.trim() || agent?.agency?.trim() || "your query";
      onSuccessToast?.(`Logged ${result.newStatus} — ${who}`);
      onClose();
    } catch (e) {
      setError("Couldn't log that response — please try again.");
      setSaving(false);
    }
  };

  const goSendQuery = () => {
    onClose();
    onNavigate?.("queries", "Send a query");
  };

  return (
    <EmailOverlay onClose={onClose} maxWidth={560}>
      <style>{`
        @keyframes rrPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,200,188,0); border-color: ${buttonPinkBorder}; }
          50% { box-shadow: 0 0 0 4px rgba(232,200,188,0.5); border-color: #d8a89a; }
        }
        .rr-pulse { animation: rrPulse 1.7s ease-in-out infinite; }
      `}</style>

      <MountPanel style={{ width: "100%" }}>
        <EmailBandHeader title="Record a response" meta="Log what an agent sent back" Emblem={CornerUpLeft} />
        <div style={{ padding: "18px 18px 18px" }}>
          {/* ── Paste-email fast lane (soft-pink box) ── */}
          <div style={{ background: "#fbeee7", border: `1px solid ${buttonPinkBorder}`, borderRadius: 12, padding: "14px 15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Mail size={15} strokeWidth={1.9} style={{ color: burgundy }} aria-hidden="true" />
              <span style={{ fontFamily: FONT_SERIF, fontSize: 15.5, fontWeight: 500, color: headingInk }}>Paste the email</span>
            </div>
            <p style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: bodyInk, lineHeight: 1.5, margin: "6px 0 12px" }}>
              Drop in an agent's reply and I'll log the response for you — even from someone new to your list.
            </p>
            <PasteEmailButton onNavigate={onNavigate} onSuccessToast={onSuccessToast} style={{ width: "100%", justifyContent: "center" }} />
          </div>

          {/* ── Divider ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
            <span style={{ flex: 1, height: 1, background: "#ece3d6" }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.06em", color: mutedInk }}>or record it by hand</span>
            <span style={{ flex: 1, height: 1, background: "#ece3d6" }} />
          </div>

          {awaiting.length === 0 ? (
            <p style={{ fontFamily: FONT_SANS, fontSize: 13, color: mutedInk, lineHeight: 1.5, margin: "4px 0 0" }}>
              No queries are awaiting a response right now.
            </p>
          ) : (
            <>
              {/* ── Which query? ── Once one is picked the list collapses to just that row + a
                  "select a different query" button, to keep the container compact. ── */}
              <label style={fieldLabel}>Which query?</label>
              {!selectedQuery ? (
                <FadeScroll maxHeight={330} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {awaiting.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => selectQuery(q.id)}
                        className="cursor-pointer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 11,
                          textAlign: "left",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid #e6ddd0",
                          background: parchment,
                          transition: "background .12s, border-color .12s",
                        }}
                      >
                        {queryRowInner(q)}
                      </button>
                    ))}
                  </div>
                </FadeScroll>
              ) : (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 10, border: "1px solid #d8a89a", background: "#fdf3ee" }}>
                    {queryRowInner(selectedQuery)}
                    <Check size={15} strokeWidth={2.4} style={{ color: burgundy, flexShrink: 0 }} aria-hidden="true" />
                  </div>
                  <button
                    type="button"
                    onClick={reopenList}
                    className="cursor-pointer"
                    style={{ marginTop: 8, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.05em", color: sageText, background: "transparent", border: "none", padding: "2px 0", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <CornerUpLeft size={12} strokeWidth={2} aria-hidden="true" /> Select a different query
                  </button>
                </div>
              )}

              {/* ── What came back? ── */}
              {selectedQuery && (
                <>
                  <label style={fieldLabel}>What came back?</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: pendingOutcome ? 10 : 18 }}>
                    {OUTCOMES.map(({ status }) => {
                      const isExpected = expected.includes(status);
                      const isSel = outcome === status;
                      const isPending = pendingOutcome === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => pickOutcome(status)}
                          className={`cursor-pointer${isExpected && !isSel && !pendingOutcome ? " rr-pulse" : ""}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 7,
                            padding: "8px 12px",
                            borderRadius: 9,
                            border: `1px solid ${isSel || isPending ? "#d8a89a" : "#e6ddd0"}`,
                            background: isSel ? "#fdf3ee" : parchment,
                            fontFamily: FONT_SANS,
                            fontSize: 12.5,
                            color: bodyInk,
                          }}
                        >
                          <StatusDot status={status} size={18} />
                          {status}
                        </button>
                      );
                    })}
                  </div>

                  {/* Out-of-order confirm */}
                  {pendingOutcome && (
                    <div style={{ background: "#f7eddb", border: "1px solid #e2c98f", borderRadius: 10, padding: "11px 13px", marginBottom: 18 }}>
                      <p style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: "#7a5a2e", lineHeight: 1.5, margin: "0 0 10px" }}>
                        <strong>{pendingOutcome}</strong> is a step out of the usual order for a query at <strong>{selectedQuery.status}</strong> — log it anyway?
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => { setOutcome(pendingOutcome); setPendingOutcome(null); }}
                          className="cursor-pointer"
                          style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.05em", color: burgundy, background: buttonPinkBg, border: `0.5px solid ${buttonPinkBorder}`, borderRadius: 8, padding: "7px 13px" }}
                        >
                          Log it anyway
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPendingOutcome(null); setOutcome(null); }}
                          className="cursor-pointer"
                          style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.05em", color: mutedInk, background: "transparent", border: "none", padding: "7px 6px" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── When? + Note ── (after an outcome is settled) */}
              {selectedQuery && outcome && !pendingOutcome && (
                <>
                  <label style={fieldLabel}>When did it arrive?</label>
                  <div style={{ marginBottom: noteApplies ? 16 : 18, maxWidth: 260 }}>
                    <BrandDatePicker value={dateReceived} onChange={setDateReceived} placeholder="Pick the date" />
                  </div>

                  {noteApplies && (
                    <>
                      <label style={fieldLabel}>Note (optional)</label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={outcome === QueryStatus.OFFER ? "Offer terms, deadline…" : outcome === QueryStatus.REVISE_RESUBMIT ? "What they'd like revised…" : "Any feedback they gave…"}
                        style={{ width: "100%", minHeight: 64, background: "#fff", border: "0.5px solid #e0d5c8", borderRadius: 10, padding: "10px 13px", fontFamily: FONT_SANS, fontSize: 13, lineHeight: 1.5, color: bodyInk, outline: "none", resize: "vertical", marginBottom: 18 }}
                      />
                    </>
                  )}
                </>
              )}

              {error && <div style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: "#a14434", margin: "0 2px 12px" }}>{error}</div>}

              {/* ── Log it ── */}
              <button
                type="button"
                onClick={logIt}
                disabled={!canLog}
                className={canLog ? "cursor-pointer" : undefined}
                style={{
                  width: "100%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: burgundy,
                  background: buttonPinkBg,
                  border: `0.5px solid ${buttonPinkBorder}`,
                  borderRadius: 10,
                  padding: "12px 0",
                  opacity: canLog ? 1 : 0.55,
                  cursor: canLog ? "pointer" : "not-allowed",
                }}
              >
                {saving ? "Logging…" : "Log it"}
              </button>
            </>
          )}

          {/* ── Footer escape ── */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #ece3d6", textAlign: "center" }}>
            <button
              type="button"
              onClick={goSendQuery}
              className="cursor-pointer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.05em", color: sageText, background: "transparent", border: "none" }}
            >
              Agent not in your list yet? Send a query <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>
      </MountPanel>
    </EmailOverlay>
  );
};
