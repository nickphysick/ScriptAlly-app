/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PasteEmailFlow — the focused overlay that hosts the Pro email-import flow: paste → (loading) →
 * review, with a graceful error/upsell path. Reuses the app's focused-flow chrome (the `sa-overlay`
 * dimmed backdrop + centred inner from forms.css, with Escape/backdrop close) and drops a MountPanel
 * card inside, so it matches the mockup's band+frame rather than FormShell's avatar band.
 *
 * Calls the live `extractFromEmail` via runEmailImport. It does NOT write — the review ends at
 * accept/skip; committing records is the next prompt.
 */
import React, { useEffect, useMemo, useState } from "react";
import "../forms/forms.css";
import { useScriptAllyDb } from "../../lib/db";
import { pickableManuscripts } from "../../lib/lifecycle";
import { runEmailImport, EmailImportError } from "../../lib/emailImport";
import type { EmailDirection, EmailProposal } from "../../lib/emailImport";
import { PasteScreen } from "./PasteScreen";
import { EmailImportReview } from "./EmailImportReview";
import { UpsellExplainer } from "./parts";

/** The dimmed focused overlay (reused chrome), closing on Escape or a backdrop click. */
export const EmailOverlay: React.FC<{ onClose: () => void; maxWidth?: number; children: React.ReactNode }> = ({
  onClose,
  maxWidth = 560,
  children,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sa-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sa-overlay-inner" style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
};

interface PasteEmailFlowProps {
  isOpen: boolean;
  onClose: () => void;
  /** Default manuscript for the selector (falls back to the first pickable manuscript). */
  initialManuscriptId?: string;
  /** Routing for the upsell's actions (e.g. → the plans page). */
  onNavigate?: (tab: string, subPageName?: string) => void;
}

export const PasteEmailFlow: React.FC<PasteEmailFlowProps> = ({ isOpen, onClose, initialManuscriptId, onNavigate }) => {
  const { manuscripts } = useScriptAllyDb();
  const pickable = useMemo(() => pickableManuscripts(manuscripts), [manuscripts]);
  const msOptions = useMemo(() => pickable.map((m) => ({ id: m.id, title: m.title })), [pickable]);

  const [step, setStep] = useState<"paste" | "review" | "upsell">("paste");
  const [emailText, setEmailText] = useState("");
  const [direction, setDirection] = useState<EmailDirection>("received");
  const [manuscriptId, setManuscriptId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<EmailProposal | null>(null);

  // Reset to a clean paste screen each time the flow opens.
  useEffect(() => {
    if (!isOpen) return;
    setStep("paste");
    setEmailText("");
    setDirection("received");
    setManuscriptId(initialManuscriptId || pickable[0]?.id || "");
    setBusy(false);
    setError(null);
    setProposal(null);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const submit = async () => {
    if (!emailText.trim()) {
      setError("Paste an email first.");
      return;
    }
    if (!manuscriptId) {
      setError("Choose a manuscript first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const p = await runEmailImport({ manuscriptId, direction, emailText });
      setProposal(p);
      setStep("review");
    } catch (e) {
      // Server enforces the Pro gate too — if it ever denies, show the upsell rather than an error.
      if (e instanceof EmailImportError && e.code === "permission-denied") {
        setStep("upsell");
      } else {
        // Unavailable / not-yet-deployed / network — the graceful path until the function is live.
        setError("Couldn't reach the importer — please try again in a moment.");
      }
    } finally {
      setBusy(false);
    }
  };

  const manuscriptTitle = pickable.find((m) => m.id === manuscriptId)?.title;

  return (
    <EmailOverlay onClose={onClose} maxWidth={step === "review" ? 580 : 540}>
      {step === "paste" && (
        <PasteScreen
          manuscripts={msOptions}
          manuscriptId={manuscriptId}
          onManuscriptChange={setManuscriptId}
          direction={direction}
          onDirectionChange={setDirection}
          emailText={emailText}
          onEmailTextChange={(t) => {
            setEmailText(t);
            if (error) setError(null);
          }}
          busy={busy}
          error={error}
          onSubmit={submit}
          onClose={onClose}
        />
      )}
      {step === "review" && proposal && (
        <EmailImportReview proposal={proposal} manuscriptTitle={manuscriptTitle} onDiscard={() => setStep("paste")} />
      )}
      {step === "upsell" && (
        <UpsellExplainer
          onUpgrade={() => { onClose(); onNavigate?.("plans"); }}
          onSeeHow={() => { onClose(); onNavigate?.("plans"); }}
        />
      )}
    </EmailOverlay>
  );
};
