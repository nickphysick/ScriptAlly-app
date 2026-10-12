/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The "How comp tracking works" pop-up (Comparable titles v27): the steps, one click from the header
 * of a page that has comps. A centred dialog, portalled, on the escape stack; built as the comp
 * letter picker is, because the app has no shared centred-dialog part.
 *
 * Focus goes to ✕ as it opens. When it closes by ✕, Escape or a click on the scrim, focus returns to
 * whatever opened it (the header's link). When "Log the comps in a letter" closes it, focus is left
 * for the picker that opens in its place.
 *
 * ⚠️ THE SCRIM CLOSES ON `click`, NOT `pointerdown`. A press on the scrim moves focus to the body as
 * its default action, AFTER a pointerdown handler has run, so a focus return made there is lost.
 */
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { CompsSteps } from "./CompsSteps";
import { CloseIcon } from "./marks";

const HEADING_ID = "cv-how-pop-h";

export const CompsHowDialog: React.FC<{ open: boolean; onClose: () => void; onPick: () => void }> = ({ open, onClose, onPick }) => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  /** false once the door into the picker has been pressed: the picker takes focus, not the link */
  const giveBack = useRef(true);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    giveBack.current = true;
    closeRef.current?.focus();
    return () => {
      if (!giveBack.current || !opener || !opener.isConnected) return;
      opener.focus({ preventScroll: true });
    };
  }, [open]);
  useEscapeLayer(open, onClose, ESC_LEVEL.pageModal);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="cv-layer cv-hwdim" data-cv="how-dim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cv-hwpop" role="dialog" aria-modal="true" aria-labelledby={HEADING_ID} data-cv="how-pop">
        <button type="button" className="cv-hwx" aria-label="Close" data-cv="how-close" ref={closeRef} onClick={onClose}><CloseIcon /></button>
        <CompsSteps headingId={HEADING_ID} onPick={() => { giveBack.current = false; onPick(); }} />
      </div>
    </div>,
    document.body,
  );
};
