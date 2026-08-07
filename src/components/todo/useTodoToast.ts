/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useTodoToast — the undo toast, extracted (To-do workspace pack · extraction E1).
 *
 * ⚠️ EXTRACTED SO FOUR PAGES CAN SHARE ONE TOAST, not to tidy ToDoPage. The list page, Today, the
 * board and the Noteboard all perform the same reversible actions; a toast per page would mean
 * four takeback windows that could be open at once, each with its own timer, and an Undo that
 * reversed whichever one you happened to click.
 *
 * THE MODEL, unchanged from the page it came from:
 *   · Quick actions never confirm — they UNDO. The write fires immediately; the pill slides up
 *     with a 6-second window (2.6s when there is nothing to undo).
 *   · Hover PAUSES on a remaining-time model, so a toast you are reaching for does not expire
 *     under the cursor.
 *   · ONE toast at a time. A new action REPLACES the current one, which COMMITS it — the previous
 *     write already happened, so replacement ends the takeback rather than cancelling anything.
 *   · Escape dismisses, which also commits.
 *
 * ⚠️ UNDO REVERSES THROUGH EACH ACTION'S EXISTING INVERSE. This hook stores a function; it does not
 * know how to reverse anything itself, and it must not learn — the primitives are already
 * reversible through the derivation layer, and a second inverse here would be the one that drifts.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export interface ToastAction {
  label: string;
  fn: () => void | Promise<void>;
}

export interface TodoToast {
  msg: string;
  action?: ToastAction;
}

export interface TodoToastApi {
  toast: TodoToast | null;
  /** Show a message, optionally with a takeback. */
  flash: (msg: string, action?: ToastAction, ms?: number) => void;
  /** Dismiss now — which COMMITS, because the write already happened. */
  dismiss: () => void;
  /** Hover handlers for the pill: the timer holds while the cursor is on it. */
  pause: () => void;
  resume: () => void;
  /**
   * ⚠️ THE SESSION'S REDO READS THIS. It can offer "Undo handled" on a card it stamped, and it
   * calls back to THE SAME inverse the toast already carries, remembered by card key. There is no
   * parallel undo store anywhere in the app and there must not be one.
   */
  remember: (key: string, fn: () => Promise<void>) => void;
  recall: (key: string) => (() => Promise<void>) | undefined;
}

const WITH_UNDO_MS = 6000;
const PLAIN_MS = 2600;

export function useTodoToast(): TodoToastApi {
  const [toast, setToast] = useState<TodoToast | null>(null);
  const timer = useRef<number | null>(null);
  const deadline = useRef(0);
  const undos = useRef(new Map<string, () => Promise<void>>());

  const clear = useCallback(() => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
  }, []);

  const arm = useCallback((ms: number) => {
    clear();
    deadline.current = Date.now() + ms;
    timer.current = window.setTimeout(() => setToast(null), ms);
  }, [clear]);

  const flash = useCallback((msg: string, action?: ToastAction, ms?: number) => {
    setToast({ msg, action });
    // tasks-pages P4: an explicit window may override the defaults (the Noteboard's delete undo
    // holds 8s — user content deserves the longest way back).
    arm(ms ?? (action ? WITH_UNDO_MS : PLAIN_MS));
  }, [arm]);

  const dismiss = useCallback(() => { clear(); setToast(null); }, [clear]);

  // The remaining-time model: pausing banks what is left rather than restarting the window, so a
  // toast hovered at five seconds does not get a fresh six on leave.
  const pause = useCallback(() => {
    deadline.current = Math.max(600, deadline.current - Date.now());
    clear();
  }, [clear]);

  const resume = useCallback(() => arm(deadline.current || WITH_UNDO_MS), [arm]);

  const remember = useCallback((key: string, fn: () => Promise<void>) => {
    undos.current.set(key, fn);
  }, []);
  const recall = useCallback((key: string) => undos.current.get(key), []);

  useEffect(() => {
    if (!toast) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toast, dismiss]);

  // A page that unmounts mid-window must not leave a timer to fire into nothing.
  useEffect(() => clear, [clear]);

  return { toast, flash, dismiss, pause, resume, remember, recall };
}
