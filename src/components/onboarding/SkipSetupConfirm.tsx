/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Leaving set-up after a file has been read (onboarding v5, part 2).
 *
 * On the import summary and the three review steps the frame's "Skip for now" asks first: the file
 * has been read and NOTHING from it has been saved, and the words say so. "Skip for now" in the card
 * leaves; "Keep setting up", Escape and a press outside close it. Nothing is skipped without it.
 */
import React, { useEffect, useRef } from "react";
import "./importFlow.css";

export const SKIP_ASK = {
  title: "Skip set-up for now?",
  text: "Nothing from this file has been saved yet. You can import a spreadsheet or add agents by hand any time from the Import page.",
  keep: "Keep setting up",
  skip: "Skip for now",
} as const;

export const SkipSetupConfirm: React.FC<{ onKeep: () => void; onSkip: () => void }> = ({ onKeep, onSkip }) => {
  const keepRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keepRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onKeep(); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onKeep]);
  return (
    <div className="im-askdim" data-im="ask-dim" onMouseDown={(e) => { if (e.target === e.currentTarget) onKeep(); }}>
      <div className="im-ask" role="dialog" aria-modal="true" aria-labelledby="im-ask-h" data-im="ask">
        <h2 className="im-askh" id="im-ask-h">{SKIP_ASK.title}</h2>
        <p>{SKIP_ASK.text}</p>
        <div className="im-askfoot">
          <button type="button" className="sf-link" ref={keepRef} onClick={onKeep} data-im="ask-keep">{SKIP_ASK.keep}</button>
          <button type="button" className="sf-btn sf-btn--sm" onClick={onSkip} data-im="ask-skip">{SKIP_ASK.skip}</button>
        </div>
      </div>
    </div>
  );
};

/**
 * The frame's way out, for a parent that owns the frame: given the branch's exit mode, what the
 * exit button does and what to render beside the frame's children.
 */
export function useAskBeforeLeaving(mode: "open" | "ask" | "none", leave: () => void): { onExit: () => void; confirm: React.ReactNode } {
  const [asking, setAsking] = React.useState(false);
  useEffect(() => { if (mode !== "ask") setAsking(false); }, [mode]);
  return {
    onExit: () => { if (mode === "ask") setAsking(true); else if (mode === "open") leave(); },
    confirm: asking ? <SkipSetupConfirm onKeep={() => setAsking(false)} onSkip={() => { setAsking(false); leave(); }} /> : null,
  };
}
