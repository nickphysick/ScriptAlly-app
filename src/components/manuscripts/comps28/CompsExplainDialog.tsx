/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comps v28 §A · "What makes a good comp?": the add form's explainer card at pop-up size. ONE component with the
 * form's (`CompExplainer`, passed `noHide`). Centred, min(640px, 100% − 48), paper, the light ✕; on the escape stack;
 * focus to ✕ as it opens and back to its opener as it closes.
 *
 * ⚠️ THE SCRIM CLOSES ON `click`, NOT `pointerdown` (v27's finding): a press moves focus to the body after a
 *    pointerdown handler has run, so a focus return made there would be lost.
 */
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { CompExplainer } from "../comps25/CompExplainer";
import { CloseButton } from "../comps25/marks";
import { openerOf, refocus } from "./refocus";

const HEADING_ID = "cx-explain-h";

export const CompsExplainDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const opener = openerOf();
    closeRef.current?.focus();
    return () => refocus(opener);
  }, [open]);
  useEscapeLayer(open, onClose, ESC_LEVEL.pageModal);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="cv-layer cv-hwdim" data-cx="explain-dim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cv-hwpop cx-xpop" role="dialog" aria-modal="true" aria-labelledby={HEADING_ID} data-cx="explain-pop">
        <CloseButton size={36} className="cv-hwx" data-cx="explain-close" ref={closeRef} onClick={onClose} />
        <CompExplainer open first={false} noHide headingId={HEADING_ID} onToggle={() => undefined} />
      </div>
    </div>,
    document.body,
  );
};
