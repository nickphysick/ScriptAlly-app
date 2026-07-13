/**
 * ToastProvider — the app's ONE optimistic-write feedback surface (interaction layer, Stage 2).
 *
 * Every optimistic write in the new interaction layer fires a toast; where the action is
 * reversible the caller supplies a GENUINE inverse via `undo` — for activity records that means
 * deleting the record that was just created (deleteActivity), NEVER appending a compensating one.
 *
 * The split, per the spec:
 *  - reversible action → `showToast({ message, undo })` (UNDO button, ~6s auto-expire).
 *  - action that can't be cleanly undone (deleting a record with children) → `showConfirm(...)`
 *    BEFORE the write — a modal, never a toast. Never both for the same action.
 *
 * Portalled to document.body inside a `.t-f12` wrapper so its tokens resolve regardless of which
 * theme root (or none) is mounted. aria-live=polite; reduced motion honoured in toast.css.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./toast.css";

export interface ToastOptions {
  message: string;
  /** A genuine inverse of the action just taken (e.g. () => deleteActivity(id)). Omit for a
   *  plain confirmation toast (no UNDO button). */
  undo?: () => void | Promise<void>;
  /** Overrides the "UNDO" button label (upper-cased in the chip). */
  undoLabel?: string;
  /** ms before auto-dismiss; default 6000. */
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions (delete). */
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface ToastItem extends ToastOptions { id: number; }
interface ConfirmState extends ConfirmOptions { id: number; }

export interface NotifyApi {
  showToast: (opts: ToastOptions) => void;
  showConfirm: (opts: ConfirmOptions) => void;
}

const NotifyContext = createContext<NotifyApi | null>(null);

/** Fire toasts / confirms from anywhere under <ToastProvider>. */
export function useToast(): NotifyApi {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const seq = useRef(0);
  const timers = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const h = timers.current.get(id);
    if (h !== undefined) { window.clearTimeout(h); timers.current.delete(id); }
  }, []);

  const showToast = useCallback((opts: ToastOptions) => {
    const id = ++seq.current;
    setToasts((prev) => [...prev, { ...opts, id }]);
    const handle = window.setTimeout(() => dismiss(id), opts.duration ?? 6000);
    timers.current.set(id, handle);
  }, [dismiss]);

  const runUndo = useCallback(async (t: ToastItem) => {
    dismiss(t.id);
    try {
      await t.undo?.();
      showToast({ message: "Undone" });
    } catch {
      showToast({ message: "Couldn't undo that — please try again." });
    }
  }, [dismiss, showToast]);

  const showConfirm = useCallback((opts: ConfirmOptions) => {
    setConfirm({ ...opts, id: ++seq.current });
  }, []);
  const closeConfirm = useCallback(() => setConfirm(null), []);
  const runConfirm = useCallback(async () => {
    const c = confirm;
    setConfirm(null);
    if (c) await c.onConfirm();
  }, [confirm]);

  // Escape closes the confirm dialog (cancel).
  useEffect(() => {
    if (!confirm) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeConfirm(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm, closeConfirm]);

  // Clear any pending timers on unmount.
  useEffect(() => () => { timers.current.forEach((h) => window.clearTimeout(h)); }, []);

  return (
    <NotifyContext.Provider value={{ showToast, showConfirm }}>
      {children}
      {createPortal(
        <div className="t-f12">
          <div className="sa-toasts" role="status" aria-live="polite">
            {toasts.map((t) => (
              <div key={t.id} className="sa-toast">
                <span>{t.message}</span>
                {t.undo && (
                  <button type="button" className="sa-toast-undo" onClick={() => runUndo(t)}>
                    {(t.undoLabel ?? "UNDO").toUpperCase()}
                  </button>
                )}
                <button type="button" className="sa-toast-x" aria-label="Dismiss" onClick={() => dismiss(t.id)}>✕</button>
              </div>
            ))}
          </div>
          {confirm && (
            <div
              className="sa-confirm-scrim"
              onMouseDown={(e) => { if (e.target === e.currentTarget) closeConfirm(); }}
            >
              <div className="sa-confirm" role="dialog" aria-modal="true" aria-label={confirm.title}>
                <h2>{confirm.title}</h2>
                {confirm.body && <div className="sa-confirm-body">{confirm.body}</div>}
                <div className="sa-confirm-actions">
                  <button type="button" className="sa-confirm-cancel" autoFocus onClick={closeConfirm}>
                    {confirm.cancelLabel ?? "Cancel"}
                  </button>
                  <button
                    type="button"
                    className={`sa-confirm-ok${confirm.danger ? " sa-danger" : ""}`}
                    onClick={runConfirm}
                  >
                    {confirm.confirmLabel ?? "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </NotifyContext.Provider>
  );
};
