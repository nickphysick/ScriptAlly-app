/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ConfirmAsk (hero-pair P4) — the styled blocking-choice dialog that retired window.confirm
 * from the To-do scope. Promise-based: ask(message, opts) resolves true (confirm) or false
 * (cancel / Esc / scrim). One dialog at a time; the buttons ride the button law (quiet
 * cancel · emphasised confirm). Used for TRUE blocking choices only — notifications stay on
 * the undo toast.
 */
import React, { useCallback, useEffect, useState } from "react";

interface AskState {
  msg: string;
  confirmLabel: string;
  cancelLabel: string;
  resolve: (v: boolean) => void;
}

export function useConfirmAsk(): {
  ask: (msg: string, opts?: { confirmLabel?: string; cancelLabel?: string }) => Promise<boolean>;
  node: React.ReactNode;
} {
  const [st, setSt] = useState<AskState | null>(null);
  const ask = useCallback(
    (msg: string, opts?: { confirmLabel?: string; cancelLabel?: string }) =>
      new Promise<boolean>((resolve) => {
        setSt({ msg, confirmLabel: opts?.confirmLabel ?? "Confirm", cancelLabel: opts?.cancelLabel ?? "Cancel", resolve });
      }),
    []
  );
  const settle = useCallback((v: boolean) => {
    setSt((cur) => {
      cur?.resolve(v);
      return null;
    });
  }, []);
  useEffect(() => {
    if (!st) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        settle(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [st, settle]);
  const node = st ? (
    <div className="tdb-askwrap" role="dialog" aria-modal="true" aria-label="Confirm">
      <div className="tdb-askscrim" onClick={() => settle(false)} />
      <div className="tdb-askcard">
        <p>{st.msg}</p>
        <div className="tdb-askrow">
          <button type="button" className="tdb-btnh" onClick={() => settle(false)}>{st.cancelLabel}</button>
          <button type="button" className="tdb-btnh em" onClick={() => settle(true)}>{st.confirmLabel}</button>
        </div>
      </div>
    </div>
  ) : null;
  return { ask, node };
}
