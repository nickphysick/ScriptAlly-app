/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v136 — THE ACTIVE AND INACTIVE BANDS (ref design-refs/query-centre/query-centre-v136.html
 * `.ag-groups`). A blush "{n} active" band holds two cards, With you and With agents; a grey "{n} inactive"
 * band holds one, Closed. Each card: its label and a month-on-month pill, a big number beside its two
 * headlines, and one row of the agents' faces.
 *
 * ⚠️ THE DATA AND THE BEHAVIOUR ARE THE DESK'S, UNCHANGED: `DeskSection` from `lib/qcDesk` (the counts, the two
 *    lines, the hot rule, the month-on-month figure from `qcCourtHistory`), and a press that chooses for
 *    "Recently updated" only — pressing again clears it. The card is a group with a full-cover button behind
 *    its contents, named as the desk's card was (`DeskSection.said`).
 * ⚠️ ACTIVE IS WITH YOU + WITH AGENTS, INACTIVE IS CLOSED — sums of the three sections' own totals, so the two
 *    labels and the header's "You've sent {N}" cannot disagree (QC136 A2, B1).
 * ⚠️ THE FACES ARE THE HEADER'S, MOVED: `lib/qcFaces`, one court a card, in that module's own order. The row is
 *    ONE line: discs are dropped from the end to fit the card's width, measured, and "+N" says how many of the
 *    court's queries are not drawn. Discs shown + N is always the card's number (B5).
 * ⚠️ A NULL MONTH-ON-MONTH FIGURE DRAWS NO PILL. `deskSections` always states one today; the component does not
 *    rely on that.
 * ⚠️ NO CHARTS AND NO ART PLACEHOLDERS (baked decision 6). The `QC_DESK_ART_*` slots stay registered in qcArt.ts
 *    and are read by nothing.
 * ⚠️ DESKTOP ONLY in practice: below 768px the page renders the v126 desk (`QcCourts`). The sheet still stacks
 *    the bands there, so the component is whole at any width.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import type { TileCourt } from "../../../lib/qcSummary";
import type { DeskSection } from "../../../lib/qcDesk";
import type { Face } from "../../../lib/qcFaces";
import { useTip } from "./QcList132";
import "./qcvPage.css";
import "./qcvGlance136.css";

/** the card's label, per court */
export const GLANCE_LABEL: Record<TileCourt, string> = { you: "With you", agent: "With agents", closed: "Closed" };
/** a section whose month-on-month figure may be absent */
export type GlanceSection = Omit<DeskSection, "mom"> & { mom: DeskSection["mom"] | null };

/** "▲ 2 on last month", "▼ 3 on last month", "No change on last month" */
export function monthPill(mom: NonNullable<GlanceSection["mom"]>): string {
  return mom.dir === "none" ? "No change on last month" : `${mom.dir === "up" ? "▲" : "▼"} ${Math.abs(mom.delta)} on last month`;
}

/** How many discs fit one row of `width`, leaving room for "+N" when some are left over. */
export function discsThatFit(width: number, have: number, total: number, disc: number, step: number, moreW: number): number {
  if (width <= 0) return Math.min(have, 4);          /* not measured yet: a few, never a second row */
  const row = (k: number) => (k <= 0 ? 0 : disc + (k - 1) * step);
  for (let k = Math.min(have, total); k >= 0; k--) {
    const rest = total - k;
    if (row(k) + (rest > 0 ? moreW : 0) <= width) return k;
  }
  return 0;
}

const FacesRow: React.FC<{ court: TileCourt; faces: readonly Face[]; total: number; loading: boolean; onPress: () => void }> = ({ court, faces, total, loading, onPress }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; disc: number }>({ w: 0, disc: 30 });
  /* the row's own width and the disc's own size, read from the page: the sheet decides 30 or 34 */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => {
      const w = el.clientWidth;
      const d = parseFloat(getComputedStyle(el).getPropertyValue("--qcg-disc")) || 30;
      if (w > 0) setBox((b) => (b.w === w && b.disc === d ? b : { w, disc: d }));
    };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const k = loading ? 0 : discsThatFit(box.w, faces.length, total, box.disc, box.disc - 4, 44);
  const rest = total - k;
  return (
    <div ref={ref} className="qcg-faces" data-qcv="court-faces" data-shown={loading ? undefined : k} aria-hidden="true">
      {faces.slice(0, k).map((f, i) => (
        <span key={f.id} className={`qcg-fc qcg-fc--${court}`} data-qcv="court-face" data-tip={f.name} data-tl={f.line} style={{ zIndex: k - i }} onClick={onPress}>{f.initials}</span>
      ))}
      {!loading && rest > 0 && <span className="qcg-more" data-qcv="court-more">+{rest}</span>}
    </div>
  );
};

const Card: React.FC<{ s: GlanceSection; faces: readonly Face[]; active: boolean; loading: boolean; onCourt: (k: TileCourt) => void }> = ({ s, faces, active, loading, onCourt }) => (
  <section role="group" aria-label={loading ? `${s.label}: loading` : s.said}
    className={`qcg-card qcg-card--${s.key}${active ? " is-on" : ""}`} data-qcv="court" data-court={s.key} data-loading={loading ? "true" : "false"}>
    <button type="button" className="qcg-hit" data-qcv="court-pick" aria-pressed={active} disabled={loading}
      aria-label={loading ? `${s.label}: loading` : `${s.said}. Show them in Recently updated`} onClick={() => onCourt(s.key)} />
    <div className="qcg-top">
      <span className="qcg-lb" data-qcv="court-title">{GLANCE_LABEL[s.key]}</span>
      {/* ⚠️ WHILE LOADING THE PILL HOLDS ITS BOX AND SAYS NOTHING; with no figure there is no pill at all */}
      {loading
        ? <span className="qcg-pill qcg-blank" aria-hidden="true">{"▲ 0 on last month"}</span>
        : s.mom && <span className="qcg-pill" data-qcv="court-mom" data-dir={s.mom.dir} data-delta={s.mom.delta}>{monthPill(s.mom)}</span>}
    </div>
    <b className={`qcg-num${loading ? " qcg-blank" : ""}`} data-qcv="court-count">{loading ? "0" : s.total}</b>
    <ul className="qcg-lines">
      {s.lines.map((l, i) => (
        <li key={i} className={`qcg-line${!loading && l.hot ? " is-hot" : ""}`} data-qcv="court-line" data-hot={!loading && l.hot ? "true" : "false"}>
          <b className={loading ? "qcg-blank" : undefined} data-qcv="court-tile">{loading ? "0" : l.n}</b>
          <span className={loading ? "qcg-blank" : undefined} data-qcv="court-label">{loading ? "requests to send" : l.text}</span>
        </li>
      ))}
    </ul>
    <FacesRow court={s.key} faces={faces} total={s.total} loading={loading} onPress={() => onCourt(s.key)} />
  </section>
);

export const QcGlance: React.FC<{
  sections: readonly GlanceSection[];
  /** every drawable face, in `lib/qcFaces`'s order; the cards take their own court's */
  faces?: readonly Face[];
  active?: TileCourt | null;
  onCourt: (key: TileCourt) => void;
  loading?: boolean;
}> = ({ sections, faces = [], active = null, onCourt, loading = false }) => {
  const ref = useRef<HTMLDivElement>(null);
  const tip = useTip(ref);
  const by = (k: TileCourt) => sections.find((s) => s.key === k);
  const you = by("you"), agent = by("agent"), closed = by("closed");
  const nActive = (you?.total ?? 0) + (agent?.total ?? 0), nInactive = closed?.total ?? 0;
  const card = (s: GlanceSection | undefined) => s && (
    <Card key={s.key} s={s} faces={faces.filter((f) => f.court === s.key)} active={active === s.key} loading={loading} onCourt={onCourt} />
  );
  return (
    <div ref={ref} className="qcg" data-qcv="courts" data-v="136" {...tip.handlers}>
      <section className="qcg-group qcg-group--active" data-qcv="glance-group" data-group="active" aria-label={loading ? "Active: loading" : `${nActive} active`}>
        <p className="qcg-gl" data-qcv="glance-label"><b className={loading ? "qcg-blank" : undefined} data-qcv="glance-n">{loading ? "00" : nActive}</b> active</p>
        <div className="qcg-cards">{card(you)}{card(agent)}</div>
      </section>
      <section className="qcg-group qcg-group--inactive" data-qcv="glance-group" data-group="inactive" aria-label={loading ? "Inactive: loading" : `${nInactive} inactive`}>
        <p className="qcg-gl" data-qcv="glance-label"><b className={loading ? "qcg-blank" : undefined} data-qcv="glance-n">{loading ? "00" : nInactive}</b> inactive</p>
        <div className="qcg-cards">{card(closed)}</div>
      </section>
      {tip.node}
    </div>
  );
};
