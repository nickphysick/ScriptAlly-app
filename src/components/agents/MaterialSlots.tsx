/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The card footer's material slots — what the agency asks for with a query, at a glance.
 *
 * ⚠️ THE TOOLTIP IS THE FEATURE, NOT FURNITURE. Four small glyphs cannot say "first fifty pages"
 * or carry a writer's own free text, so pointing at one is how the slot is read; the icons are
 * the index and the tip is the entry. That is why this is a component with focus handling rather
 * than a `title` attribute — `title` never appears on keyboard focus and never appears on touch.
 *
 * ⚠️ AND IT PORTALS TO THE BODY. The List view puts these inside a horizontal scroller with
 * `overflow-x: auto`, which clips both axes; a tip positioned inside the row would be cut off by
 * the very container that makes the columns reachable.
 *
 * ⚠️ IT BORROWS THE MATHS AND NOT THE COMPONENT, which is `RowTip`'s own recorded ruling for the
 * same situation one page over. `lib/deskTooltip`'s `placeTooltip` is pure, unit-tested, and the
 * genuinely hard half — the slots sit at the footer's RIGHT edge, so the last one's tip would
 * hang off the viewport without its clamp. What is NOT borrowed is `RowTip` itself: it lives in
 * `components/todo/`, so importing it would make the Contact list depend on the To-do page's
 * component folder AND its stylesheet to draw a 30px tip, and it renders a keyboard-hint chip
 * these slots have no key for. Behaviour matches deliberately.
 *
 * ⚠️ THE HONEST CONSOLIDATION IS A SHARED TIP IN `components/shared/`, alongside `SlideOver`,
 * `StatTiles` and `ToolbarButton` — three tips is one too many and this is the third. It is not
 * done here because it means moving `RowTip.tsx`, a file another stream is actively editing, and
 * a lost update there costs more than a duplicated 30px tooltip. Flagged rather than taken.
 */
import React from "react";
import { createPortal } from "react-dom";
import { MaterialSlot, materialSlots, slotTip } from "../../lib/agentMaterials";
import { placeTooltip } from "../../lib/deskTooltip";
import { Agent } from "../../types";

const ICON: Record<MaterialSlot["key"], React.ReactNode> = {
  queryLetter: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.6 6.4 8.4 6 8.4-6" /></>,
  synopsis: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h6" /></>,
  sample: <><path d="M12 6.5C10.5 5 8 4.5 4 4.8v13c4-.3 6.5.2 8 1.7 1.5-1.5 4-2 8-1.7v-13c-4-.3-6.5.2-8 1.7z" /><path d="M12 6.5v13" /></>,
  other: <path d="M20 11.5 12.4 19a4.2 4.2 0 0 1-6-6l7.6-7.5a2.8 2.8 0 0 1 4 4l-7.5 7.5a1.4 1.4 0 0 1-2-2l7-7" />,
};

const Tip: React.FC<{ text: string; anchor: HTMLElement | null }> = ({ text, anchor }) => {
  const el = React.useRef<HTMLSpanElement | null>(null);
  const [pos, setPos] = React.useState<{ left: number; top: number } | null>(null);

  React.useLayoutEffect(() => {
    if (!anchor || !el.current) return;
    const a = anchor.getBoundingClientRect();
    const t = el.current.getBoundingClientRect();
    setPos(placeTooltip(a, { width: t.width, height: t.height }, { width: window.innerWidth, height: window.innerHeight }));
  }, [anchor, text]);

  return createPortal(
    <span
      ref={el}
      className="agl-tip"
      role="tooltip"
      /* measured before it is placed, so it must be laid out and invisible rather than absent */
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, opacity: 0 }}
    >
      {text}
    </span>,
    document.body,
  );
};

export const MaterialSlots: React.FC<{ agent: Pick<Agent, "materialsWanted"> }> = ({ agent }) => {
  const slots = materialSlots(agent.materialsWanted);
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const anchors = React.useRef(new Map<string, HTMLElement>());

  return (
    <span className="agl-mslots">
      {slots.map((s) => {
        const tip = slotTip(s);
        return (
          <span key={s.key} className="agl-mslotwrap">
            <span
              className={`agl-mslot${s.asked ? "" : " agl-mslot-off"}`}
              /* hover AND focus both show it — see the header: this is the slot's only reading */
              tabIndex={0}
              role="img"
              aria-label={tip}
              ref={(n) => { if (n) anchors.current.set(s.key, n); else anchors.current.delete(s.key); }}
              onMouseEnter={() => setOpenKey(s.key)}
              onMouseLeave={() => setOpenKey((k) => (k === s.key ? null : k))}
              onFocus={() => setOpenKey(s.key)}
              onBlur={() => setOpenKey((k) => (k === s.key ? null : k))}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {ICON[s.key]}
              </svg>
            </span>
            {openKey === s.key && <Tip text={tip} anchor={anchors.current.get(s.key) ?? null} />}
          </span>
        );
      })}
    </span>
  );
};
