/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PasteEmailButton — the reusable, self-contained Pro entry point. Drop it anywhere (it'll move to
 * the Record-a-response screen next prompt). It reads the current user's plan to decide behaviour:
 *   · Pro  → opens the PasteEmailFlow (paste → review).
 *   · Free → opens the calm UpsellExplainer (never calls the function).
 * The visual is the same Pro-badged button in both states (a lock hints at the gate for Free).
 *
 * The server-side gate in extractFromEmail is the real enforcement; this just reflects entitlement.
 */
import React, { useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { UserPlan } from "../../types";
import { EntryButtonView, UpsellExplainer } from "./parts";
import { PasteEmailFlow, EmailOverlay } from "./PasteEmailFlow";

interface PasteEmailButtonProps {
  /** Default manuscript for the paste screen's selector. */
  manuscriptId?: string;
  /** Routing for the upsell actions (→ the plans page) and the post-add jump to the query. */
  onNavigate?: (tab: string, subPageName?: string) => void;
  /** App-level toast after a successful add. */
  onSuccessToast?: (msg: string) => void;
  style?: React.CSSProperties;
}

export const PasteEmailButton: React.FC<PasteEmailButtonProps> = ({ manuscriptId, onNavigate, onSuccessToast, style }) => {
  const { currentUser } = useScriptAllyDb();
  const isPro = currentUser?.plan === UserPlan.PRO;

  const [flowOpen, setFlowOpen] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);

  return (
    <>
      <EntryButtonView
        locked={!isPro}
        style={style}
        onClick={() => (isPro ? setFlowOpen(true) : setUpsellOpen(true))}
      />

      {isPro && (
        <PasteEmailFlow
          isOpen={flowOpen}
          onClose={() => setFlowOpen(false)}
          initialManuscriptId={manuscriptId}
          onNavigate={onNavigate}
          onSuccessToast={onSuccessToast}
        />
      )}

      {!isPro && upsellOpen && (
        <EmailOverlay onClose={() => setUpsellOpen(false)} maxWidth={520}>
          <UpsellExplainer
            onUpgrade={() => { setUpsellOpen(false); onNavigate?.("plans"); }}
            onSeeHow={() => { setUpsellOpen(false); onNavigate?.("plans"); }}
          />
        </EmailOverlay>
      )}
    </>
  );
};
