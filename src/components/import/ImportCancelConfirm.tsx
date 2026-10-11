/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Discard this?" — leaving an import part-way, in the app (onboarding v5, part 3).
 *
 * The words are the query drawer's own (`queryActions/DrawerShell`, its discard confirm): the same
 * question for the same situation, something answered and nothing saved. They are stated here and a
 * lock reads the drawer's source for each one, so the two cannot come to differ.
 * The card is part 2's confirm card (`SkipSetupConfirm`'s dress).
 */
import React, { useEffect, useRef } from "react";

export const CANCEL_ASK = {
  title: "Discard this?",
  text: "Nothing has been saved yet.",
  keep: "Keep going",
  discard: "Discard",
} as const;

export const ImportCancelConfirm: React.FC<{ onKeep: () => void; onDiscard: () => void }> = ({ onKeep, onDiscard }) => {
  const keepRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keepRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onKeep(); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onKeep]);
  return (
    <div className="im-askdim" data-im="ask-dim" onMouseDown={(e) => { if (e.target === e.currentTarget) onKeep(); }}>
      <div className="im-ask" role="dialog" aria-modal="true" aria-labelledby="impg-ask-h" data-im="ask">
        <h2 className="im-askh" id="impg-ask-h">{CANCEL_ASK.title}</h2>
        <p>{CANCEL_ASK.text}</p>
        <div className="im-askfoot">
          <button type="button" className="sf-link" ref={keepRef} onClick={onKeep} data-im="ask-keep">{CANCEL_ASK.keep}</button>
          <button type="button" className="sf-btn sf-btn--sm" onClick={onDiscard} data-im="ask-skip">{CANCEL_ASK.discard}</button>
        </div>
      </div>
    </div>
  );
};
