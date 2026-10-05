/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent card's frame (Agent card v1 §2): the overlay, the backdrop, the white rim and the
 * burgundy line, and the entrance and exit. What is INSIDE — the quick view's band and body, or the
 * editor's tabs — is the caller's; going from one to the other is this one frame changing width.
 *
 * ⚠️ THE OVERLAY'S OBLIGATIONS ARE THE SHELL'S, NOT A NEW COPY: `useOverlay` traps focus, seals the
 * page behind it (counted `inert` on #root), locks the stage's scroll and returns focus on close.
 * Its Escape is NOT used — the card's Escape is a layer on the app's one stack, owned by whatever
 * is inside, because only the inside knows what is open within it.
 *
 * ⚠️ THE ENTRANCE IS MEASURED, SO IT RUNS IN A LAYOUT EFFECT: the card grows out of the row's (or
 * button's) box — 260ms, the mock's ease — or, with no box to grow from, lifts from 8px below. The
 * exit shrinks back into the row if the row is on screen, else falls 8px and fades (180ms). Reduced
 * motion: none of it.
 *
 * ⚠️ DOCKED IS STILL OPEN (Agent card v1 §6.1). While a query journey runs in the drawer the card
 * steps aside — scales to .97 and fades over 160ms, then takes no clicks and leaves the
 * accessibility tree — but it stays MOUNTED, so it comes back exactly where the writer left it:
 * opacity and .97 back to whole over 200ms (the Continuity table's numbers).
 */
import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useOverlay } from "../../shell/useOverlay";
import type { AgentCardOrigin } from "../../../lib/agentCardStore";
import "./agentCard.css";

export interface AgentCardFrameHandle {
  /** Play the exit — into `to` when it is on screen, else down and out — and resolve when done. */
  leave: (to: AgentCardOrigin | null) => Promise<void>;
  /** Fade the body in — the contents swapped while the box stayed (the card widening or narrowing). */
  fade: (ms: number) => void;
}

interface Props {
  /** the editor's width (780); the quick view is 548 */
  big?: boolean;
  /** the element naming the dialog */
  labelledBy?: string;
  /** the dialog's name where no element on the card states it (the editor) */
  ariaLabel?: string;
  originRect?: AgentCardOrigin | null;
  /** false when the card is already open and only its contents changed (back from the editor) */
  entrance?: boolean;
  /** a query journey is running in the drawer: the card steps aside, and comes back when false */
  docked?: boolean;
  /** a click on the backdrop itself */
  onScrim: () => void;
  children: React.ReactNode;
}

const reduced = (): boolean =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const EASE_IN = "cubic-bezier(.22,.8,.3,1)";
const EASE_OUT = "cubic-bezier(.4,0,.8,.4)";
const CENTRE = "translate(-50%,-50%)";

/** The keyframe that puts the card's centre on a box's centre at the box's size. */
const toBox = (card: DOMRect, box: AgentCardOrigin): string => {
  const dx = box.x + box.width / 2 - (card.left + card.width / 2);
  const dy = box.y + box.height / 2 - (card.top + card.height / 2);
  return `${CENTRE} translate(${dx}px,${dy}px) scale(${box.width / card.width},${box.height / card.height})`;
};

export const AgentCardFrame = forwardRef<AgentCardFrameHandle, Props>(function AgentCardFrame(
  { big = false, labelledBy, ariaLabel, originRect = null, entrance = true, docked = false, onScrim, children },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { trapTab, scrimClick } = useOverlay(rootRef, { scrimClasses: ["ac-scrim"], onScrimClick: onScrim });

  /* stepping aside and coming back — the class is what takes the card out of reach, so it lands
     AFTER the step-aside and comes off BEFORE the return */
  const wasDocked = useRef(docked);
  useLayoutEffect(() => {
    if (wasDocked.current === docked) return;
    wasDocked.current = docked;
    const root = rootRef.current;
    const el = cardRef.current;
    const scrim = root?.querySelector<HTMLElement>(".ac-scrim");
    if (!root || !el) return;
    const still = reduced() || typeof el.animate !== "function";
    if (docked) {
      if (still) { root.classList.add("is-docked"); return; }
      scrim?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" });
      const a = el.animate([{ transform: CENTRE, opacity: 1 }, { transform: `${CENTRE} scale(.97)`, opacity: 0 }], { duration: 160, easing: EASE_OUT, fill: "forwards" });
      a.onfinish = () => { if (wasDocked.current) root.classList.add("is-docked"); a.cancel(); scrim?.getAnimations().forEach((x) => x.cancel()); };
      return;
    }
    root.classList.remove("is-docked");
    el.getAnimations().forEach((x) => x.cancel());
    /* back where it was — keyboard included: the drawer that held focus has gone */
    root.focus({ preventScroll: true });
    if (still) return;
    scrim?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    el.animate([{ transform: `${CENTRE} scale(.97)`, opacity: 0 }, { transform: CENTRE, opacity: 1 }], { duration: 200, easing: EASE_IN });
  }, [docked]);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!entrance || !el || reduced() || typeof el.animate !== "function") return;
    const card = el.getBoundingClientRect();
    const grow = originRect && originRect.width > 0 && originRect.height > 0 && card.width > 0 && card.height > 0;
    el.animate(
      grow
        ? [{ transform: toBox(card, originRect), opacity: 0.4 }, { transform: CENTRE, opacity: 1 }]
        : [{ transform: "translate(-50%,calc(-50% + 8px))", opacity: 0 }, { transform: CENTRE, opacity: 1 }],
      { duration: 260, easing: EASE_IN },
    );
    /* the contents arrive after the box, so a scaled card never shows squashed text */
    el.querySelector<HTMLElement>(".ac-frame")?.animate([{ opacity: 0 }, { opacity: 0, offset: 0.3 }, { opacity: 1 }], { duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the entrance plays once, at the open
  }, []);

  useImperativeHandle(ref, () => ({
    leave: (to) => new Promise<void>((resolve) => {
      const el = cardRef.current;
      rootRef.current?.classList.add("is-leaving");
      if (!el || reduced() || typeof el.animate !== "function") { resolve(); return; }
      const card = el.getBoundingClientRect();
      const onScreen = !!to && to.width > 0 && to.height > 0 && to.y + to.height > 0 && to.y < window.innerHeight;
      const a = el.animate(
        onScreen
          ? [{ transform: CENTRE, opacity: 1 }, { transform: toBox(card, to!), opacity: 0 }]
          : [{ transform: CENTRE, opacity: 1 }, { transform: "translate(-50%,calc(-50% + 8px))", opacity: 0 }],
        { duration: 180, easing: EASE_OUT, fill: "forwards" },
      );
      a.onfinish = () => resolve();
      a.oncancel = () => resolve();
    }),
    fade: (ms) => {
      const body = cardRef.current?.querySelector<HTMLElement>('[data-ac="body"]');
      if (!body || reduced() || typeof body.animate !== "function") return;
      body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms });
    },
  }), []);

  return createPortal(
    <div className="ac-ov" ref={rootRef} tabIndex={-1} onKeyDown={trapTab} onClick={scrimClick} data-ac="overlay" data-docked={docked || undefined}>
      <div className="ac-scrim" data-ac="scrim" />
      <div
        ref={cardRef}
        className={`ac agent-card${big ? " big" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        data-ac="card"
      >
        <div className="ac-frame">{children}</div>
      </div>
    </div>,
    document.body,
  );
});
