/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `#/email-drop-lab` (dev builds only): the phone email drop's two screens over a fixture proposal,
 * with the save recorded on `window.__edLab` instead of written. PLS1 L6 drives it; the harness account
 * is on the free plan, so the real flow (Pro only) cannot be reached there.
 */
import React, { useState } from "react";
import type { EmailProposal, ProposalRecord } from "../../lib/emailImport";
import { EmailPastePhone, EmailUpdatesPhone } from "./EmailDropPhone";

export const EMAIL_DROP_FIXTURE: EmailProposal = {
  subject: { kind: "matched", agentId: "seed-agent-2", queryId: "seed-query-2", agency: "Bloomsbury Quill", agentName: "Marcus Reed", manuscriptId: "seed-ms-1" },
  records: [
    { resultingStatus: "Full Requested", direction: "received", date: "2026-10-27", dateProvisional: false, sourceQuote: "I'd love to read the full manuscript.", note: null },
    { resultingStatus: "Partial Requested", direction: "received", date: "2026-10-20", dateProvisional: false, sourceQuote: "Could you send the first fifty pages?", note: null },
  ],
  unplaced: [],
} as unknown as EmailProposal;

type Lab = { saved: ProposalRecord[] | null; skipped: boolean };
declare global { interface Window { __edLab?: Lab } }

export const EmailDropLab: React.FC = () => {
  const [step, setStep] = useState<"paste" | "review">(location.hash.includes("s=review") ? "review" : "paste");
  const [text, setText] = useState("");
  window.__edLab ??= { saved: null, skipped: false };
  return step === "review"
    ? <EmailUpdatesPhone proposal={EMAIL_DROP_FIXTURE} dayN={41} busy={false} error={null}
        onSave={(acc) => { window.__edLab = { ...window.__edLab!, saved: JSON.parse(JSON.stringify(acc)) }; }}
        onSkipAll={() => { window.__edLab = { ...window.__edLab!, skipped: true }; }} onBack={() => setStep("paste")} />
    : <EmailPastePhone emailText={text} onEmailText={setText} busy={false} error={null} onRead={() => setStep("review")} onBack={() => {}} />;
};
