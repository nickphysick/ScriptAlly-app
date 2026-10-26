/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25 Part B (design-refs/contact-list-v25/, screens 01 and 04) — "At a glance": four equal cards in the
 * Query Centre v150.1's format (the shared `GlanceCards`), in the Contact list's own tints and doodles.
 *
 *   List health   "{pct}%", the ring at 46, "{n} gaps →"; a press opens Housekeeping (never a filter, never pressed)
 *   Not queried · Querying · Closed   a press shows only those agents (List and Cards); a second press shows all
 *
 * ⚠️ THE FIGURES ARE `glanceCards` (lib/contactV25), over `AgentFacts.stand`; the list's group headings count the same.
 * ⚠️ THE PROBES ARE `data-cl25` (never the Query Centre's `data-qc150`: every workspace page stays mounted).
 */
import React, { useMemo } from "react";
import { GlanceCards, type GlanceItem } from "../../shared/GlanceCards";
import { HealthRing } from "./ContactLightHeader";
import { gapsWord, type GlanceCardModel, type GlanceKey } from "../../../lib/contactV25";
import "../../queries/centre/qcv150.css";
import "./contactV25.css";

/* the head doodles, the mock's `DDS`: a tick in a circle, a nib, a paper plane, an envelope in its tray */
const DOODLE: Record<GlanceKey, React.ReactNode> = {
  health: <svg className="qc150-dd" viewBox="-26 -26 52 52" aria-hidden="true"><circle cx="0" cy="0" r="15" /><path d="M-7 0 l5 5 l9 -10" /></svg>,
  none: <svg className="qc150-dd" viewBox="-26 -28 52 56" aria-hidden="true"><path d="M0 -24 L10 2 L0 22 L-10 2 Z" /><path d="M0 -4 V22" /><circle cx="0" cy="-6" r="2.2" /></svg>,
  querying: <svg className="qc150-dd" viewBox="-40 -26 70 52" aria-hidden="true"><path d="M-22 4 L24 -12 L0 22 L-3 8 Z M-3 8 L24 -12" /><path d="M-38 20 C-30 12 -26 22 -18 14" strokeDasharray="2 5" /></svg>,
  closed: <svg className="qc150-dd" viewBox="-28 -26 56 52" aria-hidden="true"><path d="M-20 -14 h40 a2 2 0 0 1 2 2 v24 a2 2 0 0 1 -2 2 h-14 v-5 h-12 v5 h-14 a2 2 0 0 1 -2 -2 v-24 a2 2 0 0 1 2 -2 Z" /><path d="M-12 -6 L12 10" /></svg>,
};
const SWATCH: Record<GlanceKey, string> = { health: "you", none: "none", querying: "agent", closed: "closed" };
const agentsN = (n: number) => `${n} ${n === 1 ? "agent" : "agents"}`;

export const ContactGlance25: React.FC<{
  cards: GlanceCardModel[];
  /** the pressed filtering card, or null */
  pressed: GlanceKey | null;
  onCard: (k: GlanceKey) => void;
  /** false while the list settles: no figure, nothing pressable */
  ready: boolean;
}> = ({ cards, pressed, onCard, ready }) => {
  const items = useMemo<GlanceItem[]>(() => cards.map((c) => {
    const health = c.key === "health";
    return {
      key: c.key, label: c.label, figure: health ? `${c.count}%` : c.count, total: c.total, faces: c.faces, tone: `cl25-${c.key}`,
      swatch: `qc149-sw cl24-sw--${SWATCH[c.key]} qc150-sw`, doodle: DOODLE[c.key], pressable: !health,
      extra: health ? (
        <span className="cl25-hx" data-cl25="health-x">
          <span className="cl25-ring" data-cl25="ring" aria-hidden="true"><HealthRing pct={ready ? c.count : null} /></span>
          {c.gaps ? <i className="cl25-gaps" data-cl25="gaps" data-n={c.gaps}>{gapsWord(c.gaps)} →</i> : null}
        </span>
      ) : undefined,
      ariaLabel: health
        ? `List health: ${c.count}%. ${c.gaps ? `${gapsWord(c.gaps)} to fill. ` : ""}Open Housekeeping`
        : `${c.label}: ${agentsN(c.count)}. ${pressed === c.key ? "Showing only these; press to show all" : "Show only these"}`,
    };
  }), [cards, pressed, ready]);
  return (
    <GlanceCards items={items} pressed={pressed} onCard={(k) => onCard(k as GlanceKey)} ready={ready} loading={!ready}
      probe="cl25" headingId="cl25-gh" className="cl25-glance" />
  );
};
