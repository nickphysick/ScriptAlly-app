/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The peek's FOURTH container — a popover anchored to the contact button in List and Board.
 *
 * ⚠️ IT IS A FRAME, NOT AN IMPLEMENTATION. Everything inside is `ContactPeek`, the same component
 * the card back and the drawer render; this file owns the anchoring, the dismissal and a heading,
 * and knows nothing about email, socials or location. A "simplified peek for narrow containers"
 * is how two renderings of one fact are born.
 *
 * ⚠️ IT IS ANCHORED THROUGH `useFixedMenu`, the app's own anchored-fixed utility, and the VIEW
 * holds the hook rather than this component — because the hook anchors to a TRIGGER, and the
 * trigger is the contact button inside a row. Taking the computed style as a prop is the same
 * contract `F12Popover` has for the same reason. The hook decides the flip by MEASUREMENT, which
 * is the half that is genuinely hard and the half a hand-rolled `rect.bottom + 8` gets wrong at
 * the bottom of a list.
 *
 * ⚠️ AND IT IS PORTALLED. The List view is a horizontal scroller (`overflow-x: auto`), which clips
 * BOTH axes; a popover parented inside a row would be cut off by the very container that makes
 * the columns reachable — the same reason the material slots' tooltip portals.
 */
import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Agent } from "../../types";
import { ContactPeek } from "./ContactPeek";
import { agentInitials, agentPrimary } from "../../lib/agentDisplay";

export const ContactPeekPopover: React.FC<{
  agent: Agent;
  onClose: () => void;
  /** Opens the drawer on Contact in edit — the popover's own way out, as on the card back. */
  onEdit: (agentId: string) => void;
  /** Anchored position from the view's `useFixedMenu(open)` — REQUIRED for the portalled placement. */
  style: React.CSSProperties;
  /** The panel's own element, for the hook's measured flip. */
  panelRef: React.MutableRefObject<HTMLElement | null>;
}> = ({ agent, onClose, onEdit, style, panelRef }) => {

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = panelRef.current;
      const t = e.target as Node;
      /* the trigger's own click toggles, so a click there is not "outside" */
      if (!el || el.contains(t) || (t instanceof Element && t.closest("[data-peek-trigger]"))) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="agl-peekpop"
      role="dialog"
      aria-label={`Contact details for ${agentPrimary(agent)}`}
      ref={(n) => { panelRef.current = n; }}
      style={style}
    >
      <div className="agl-peekpop-head">
        <span className="agl-av agl-av-sm"><span className="ini">{agentInitials(agent)}</span></span>
        <b>{agentPrimary(agent)}</b>
        <span className="agl-sp" />
        <button type="button" className="agl-cbtn" onClick={onClose} aria-label="Close">
          <X width={11} height={11} aria-hidden="true" />
        </button>
      </div>
      <ContactPeek
        agent={agent}
        variant="pop"
        footer={
          <button type="button" className="agl-btn agl-btn-ghost" onClick={() => { onClose(); onEdit(agent.id); }}>
            Edit contact details
          </button>
        }
      />
    </div>,
    document.body,
  );
};
