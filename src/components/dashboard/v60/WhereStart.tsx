/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v60.1 — "Where do I start?" (ref design-refs/dashboard-v60-1/dashboard-v60-1.html).
 *
 * Before the first query the header's three buttons give way to this one. It opens a pop-up of three
 * answers; choosing one rings the cards and tiles that answer points to and dims the rest.
 *
 * ⚠️ PAGE-LOCAL, NOT `PageGuide` AND NOT `usePopover`. `PageGuide` is a first-visit card that stores a
 * per-page "seen" flag, and this pack forbids remembering anything. `usePopover`'s outside press is
 * wired to the shell's `.lpop` class and it neither returns focus nor clears a second state. So the
 * pop-up and the spotlight are built here, on the app's one escape stack (`ESC_LEVEL.page`).
 *
 * ⚠️ IT WRITES NOTHING AND REMEMBERS NOTHING: no storage, no route, no navigation. The table of
 * answers → targets is `startAnswers` / `spotOf` in lib/dashFirstUse, unit-tested.
 *
 * ⚠️ THE POP-UP IS PORTALLED TO `document.body`, outside `.os-root`, so its sheet reads literals and
 * `:root` tokens only (`--sp-serif`, `--sp-type`, `--clv-slate`).
 */
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import type { StartKey, StartTarget } from "../../../lib/dashFirstUse";
import { spotOf, startAnswers } from "../../../lib/dashFirstUse";
import "./whereStart.css";

export const START_LABEL = "Where do I start?";
export const START_LEDE = "Pick whichever sounds most like you.";
export const START_TAG = "START HERE";

/* ── the spotlight, read by each target ─────────────────────────────────────────────────────── */

interface SpotCtx { answer: StartKey | null; hasAgents: boolean }
const SpotContext = createContext<SpotCtx>({ answer: null, hasAgents: false });

export const SpotProvider = SpotContext.Provider;

/** A target's part in the spotlight: `data-spot` for its root, and whether it carries the tag. */
export function useSpot(target: StartTarget): { spot: "ring" | "dim" | undefined; first: boolean } {
  const { answer, hasAgents } = useContext(SpotContext);
  const s = spotOf(answer, target, hasAgents);
  const first = !!answer && startAnswers(hasAgents).find((a) => a.key === answer)?.targets[0] === target;
  return { spot: s ?? undefined, first };
}

/** "START HERE", on the first target's ring, top right. */
export const StartTag: React.FC<{ show: boolean }> = ({ show }) =>
  show ? <span className="wds-tag" data-wds="tag" aria-hidden="true">{START_TAG}</span> : null;

/* ── the button and its pop-up ──────────────────────────────────────────────────────────────── */

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);
const ICON: Record<StartKey, React.ReactNode> = {
  sent: <path d="M3 10l14-6-5 13-2-5-7-2z" />,
  agents: <><circle cx="10" cy="7" r="3.2" /><path d="M4 17c.8-3.2 3.2-5 6-5s5.2 1.8 6 5" /></>,
  materials: <path d="M4 16l1-4 8-8 3 3-8 8-4 1zM11 6l3 3" />,
};

export interface WhereStartProps {
  hasAgents: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  answer: StartKey | null;
  setAnswer: (a: StartKey | null) => void;
  disabled?: boolean;
}

export const WhereStart: React.FC<WhereStartProps> = ({ hasAgents, open, setOpen, answer, setAnswer, disabled }) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number; w: number } | null>(null);

  const close = useCallback((focus: boolean) => {
    setOpen(false);
    if (focus) btnRef.current?.focus();
  }, [setOpen]);

  /* one layer: the pop-up first, then the spotlight */
  useEscapeLayer(open || !!answer, () => {
    if (open) close(true);
    else setAnswer(null);
  }, ESC_LEVEL.page);

  /* hung from the button's right edge, 16px below it; 400 wide below 1400px of window */
  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 16, right: window.innerWidth - r.right, w: window.innerWidth < 1400 ? 400 : 460 });
  }, []);
  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, place]);

  /* a press outside: closes the pop-up; with the pop-up shut, clears the spotlight unless it lands
     inside a ringed target on something that is not an action */
  useEffect(() => {
    if (!open && !answer) return undefined;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (btnRef.current?.contains(t)) return; // the button toggles itself
      if (open) {
        if (popRef.current?.contains(t)) return;
        close(false);
        return;
      }
      const ringed = t.closest('[data-spot="ring"]');
      if (ringed && !t.closest("button, a, input, [role='button']")) return;
      setAnswer(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, answer, close, setAnswer]);

  const choose = (k: StartKey) => {
    setAnswer(k);
    setOpen(false);
    btnRef.current?.focus();
  };

  const answers = startAnswers(hasAgents);
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`wds-btn${open ? " is-open" : ""}`}
        data-wds="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? close(false) : setOpen(true))}
      >
        <span className="wds-qm" aria-hidden="true">?</span>
        {START_LABEL}
      </button>
      {open && pos && createPortal(
        <div
          ref={popRef}
          className="wds"
          data-wds="pop"
          role="dialog"
          aria-label={START_LABEL}
          style={{ top: pos.top, right: pos.right, width: pos.w }}
        >
          <div className="wds-frame">
            <div className="wds-band">
              <span>{START_LABEL}</span>
              <button type="button" className="wds-x" data-wds="close" aria-label="Close" onClick={() => close(true)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" /></svg>
              </button>
            </div>
            <div className="wds-body">
              <p className="wds-lede">{START_LEDE}</p>
              {answers.map((a) => (
                <button key={a.key} type="button" className="wds-ch" data-wds="answer" data-key={a.key} onClick={() => choose(a.key)}>
                  <span className={`wds-cd wds-cd--${a.tone}`} aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{ICON[a.key]}</svg>
                  </span>
                  <span className="wds-ct">
                    <b>{a.title}</b>
                    <small>{a.line}</small>
                    <span className="wds-dests">
                      {a.labels.map((l) => <i key={l.text} className={`wds-d--${l.tone}`}>{l.text}</i>)}
                    </span>
                  </span>
                  <span className="wds-go" aria-hidden="true"><Arrow /></span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
