/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DashEmailDrop — the quick actions' "Smart email drop", as its own module (stage 3, 17 Sep).
 *
 * ⚠️ LOADED LAZILY, AND ONLY WHEN PRESSED. The paste flow reads the database context, and `lib/db`
 * initialises Firebase when it is imported — which the node test environment cannot do, and which
 * would put the SDK on the dashboard's import path for a panel most visits never open. The same
 * reason `OneScreenDashboard` loads `lib/firebase` in an effect.
 *
 * ⚠️ PORTALLED TO THE BODY. It is opened from inside a dashboard card, and a card is a stacking context
 * (`z-index: 1`) that clips (`overflow: hidden`): rendered in place, the overlay would sit under the
 * cards after it in the row however high its own z-index.
 *
 * ⚠️ THE GATE IS THE EXISTING BUTTON'S, NOT A NEW ONE. Pro opens the flow; everyone else gets the same
 * calm explainer `PasteEmailButton` shows, and the function refuses a free user server-side regardless.
 */
import React from "react";
import { createPortal } from "react-dom";
import { PasteEmailFlow, EmailOverlay } from "../emailImport/PasteEmailFlow";
import { UpsellExplainer } from "../emailImport/parts";

const DashEmailDrop: React.FC<{
  isPro: boolean;
  manuscriptId?: string;
  onClose: () => void;
  onNavigate: (tab: string, sub?: string) => void;
}> = ({ isPro, manuscriptId, onClose, onNavigate }) => createPortal(
  isPro ? (
    <PasteEmailFlow isOpen onClose={onClose} initialManuscriptId={manuscriptId} onNavigate={onNavigate} />
  ) : (
    <EmailOverlay onClose={onClose} maxWidth={520}>
      <UpsellExplainer
        onUpgrade={() => { onClose(); onNavigate("plans"); }}
        onSeeHow={() => { onClose(); onNavigate("plans"); }}
      />
    </EmailOverlay>
  ),
  document.body,
);

export default DashEmailDrop;
