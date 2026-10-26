/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v150 Part B (design-refs/query-centre-v150/, screens 01 and 03) — the four stat cards under the header:
 * Your move · With the agent · Gone quiet · Closed. They replace the quick-filter chips and the "your move" banner.
 *
 * ⚠️ A CARD IS THE OLD CHIP: pressing it sets the one "Where it stands" filter (`qcF138.where`), pressing it again
 *    clears it, and the list and Birds-eye both read that filter. The counts are the chips' (lib/qc150 `statCards`).
 * ⚠️ THE WHOLE CARD IS ONE BUTTON (`.qc150-hit`, stretched under the content). v150.1 §3 removed the detail lines,
 *    "Next" and "Show them", so nothing else on a card is pressable.
 * ⚠️ THE HEAD IS INSET FROM THE CARD ON THREE SIDES (≈5px), so the card's cream frame shows all round the tint.
 */
import React, { useMemo } from "react";
import type { WhereKey } from "../../../lib/qcSummary";
import type { StatCard } from "../../../lib/qc150";
import { GlanceCards, type GlanceItem } from "../../shared/GlanceCards";
import "./qcv150.css";

/* the head doodles, lifted from the mock's background set: a feather, a plane, a sleeping envelope, a stamp */
const DOODLE: Record<WhereKey, React.ReactNode> = {
  you: <svg className="qc150-dd" viewBox="-24 -30 48 60" aria-hidden="true"><path d="M-6 28 C-3 8 3 -10 14 -27" /><path d="M-4 16 C-17 8 -16 -10 12 -25 M-3 7 C10 2 18 -12 14 -27 M-5 22 l-6 5" /></svg>,
  agent: <svg className="qc150-dd" viewBox="-40 -26 70 52" aria-hidden="true"><path d="M-22 4 L24 -12 L0 22 L-3 8 Z M-3 8 L24 -12" /><path d="M-38 20 C-30 12 -26 22 -18 14" strokeDasharray="2 5" /></svg>,
  quiet: <svg className="qc150-dd" viewBox="-26 -26 52 52" aria-hidden="true"><rect x="-18" y="-6" width="36" height="25" rx="2" /><path d="M-18 -6 L0 8 L18 -6" /><path d="M6 -14 h7 l-7 7 h7 M14 -23 h5 l-5 5 h5" /></svg>,
  closed: <svg className="qc150-dd" viewBox="-26 -26 52 52" aria-hidden="true"><rect x="-15" y="-19" width="30" height="38" rx="1" strokeDasharray="2.4 2.4" /><rect x="-9" y="-13" width="18" height="18" /><path d="M-9 11 h18" /><circle cx="12" cy="13" r="11" strokeOpacity=".6" /></svg>,
};
const SWATCH: Record<WhereKey, string> = { you: "you", agent: "agent", quiet: "quiet", closed: "closed" };

export const QcStatCards150: React.FC<{
  cards: StatCard[] | null;
  where: WhereKey | null;
  /** a card press: set this court's filter, or clear it when it is already set */
  onCard: (k: WhereKey) => void;
  loading: boolean;
}> = ({ cards, where, onCard, loading }) => {
  /* Contact list v25 B2 — THE CARDS ARE THE SHARED `GlanceCards` (lifted from here, the DOM unchanged): this wrapper
     names the Query Centre's four courts, their doodles and swatches, and the `data-qc150` probes. */
  const items = useMemo<GlanceItem[]>(() => (cards ?? SKELETON).map((c) => ({
    key: c.key, label: c.label, figure: c.count, total: c.count, faces: c.faces, tone: c.key,
    swatch: `qc149-sw qc149-sw--${SWATCH[c.key]} qc150-sw`, doodle: DOODLE[c.key],
    ariaLabel: `${c.label}: ${c.count} ${c.count === 1 ? "query" : "queries"}. ${where === c.key ? "Showing only these; press to show all" : "Show only these"}`,
  })), [cards, where]);
  return (
    /* v150.1 §3 — "At a glance": the heading, then four equal cards, each a head over one row (the count, then the faces).
       The detail lines, Your move's "Next" and "Show them" are gone. */
    <GlanceCards items={items} pressed={where} onCard={(k) => onCard(k as WhereKey)} ready={!!cards} loading={loading}
      probe="qc150" headingId="qc1501-gh" />
  );
};

const SKELETON: StatCard[] = (["you", "agent", "quiet", "closed"] as WhereKey[]).map((k) => ({
  key: k, label: { you: "Your move", agent: "With the agent", quiet: "Gone quiet", closed: "Closed" }[k], count: 0, faces: [], more: 0, next: null, detail: null,
}));
