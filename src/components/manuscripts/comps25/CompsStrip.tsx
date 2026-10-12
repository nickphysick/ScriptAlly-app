/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v25, Part B: the four "At a glance" cells, over the shared strip.
 * A cell filters the list and never scrolls the page.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { GlanceStrip } from "../../shell/strip/GlanceStrip";
import type { CompFilter, CompRow, Glance } from "../../../lib/compsLibrary";
import { KindIcon } from "./marks";

/** As many 30px discs as the foot's width holds (overlap 6), then "+rest". */
const Discs: React.FC<{ rows: readonly CompRow[]; ring?: boolean; probe: string }> = ({ rows, ring, probe }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(rows.length);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const all = Math.floor((w - 30) / 24) + 1;
      /* when some are left over, the "+N" needs its own room */
      setFit(rows.length <= all ? rows.length : Math.max(1, Math.floor((w - 30 - 44) / 24) + 1));
    };
    read();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(read) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [rows.length]);
  const shown = rows.slice(0, fit);
  return (
    <div className="cv-discs" ref={ref} data-cv={probe}>
      {shown.map((r) => <i key={r.key} className={ring ? "is-ring" : undefined} title={r.comp.title} data-cv="disc"><KindIcon kind={r.kind} /></i>)}
      {rows.length > shown.length && <em data-cv="disc-more">+{rows.length - shown.length}</em>}
    </div>
  );
};

export const CompsStrip: React.FC<{
  g: Glance;
  rows: readonly CompRow[];
  filter: CompFilter | null;
  loading: boolean;
  onFilter: (f: CompFilter | null) => void;
}> = ({ g, rows, filter, loading, onFilter }) => {
  const a = g.attachment;
  const not = a.sent - a.logged;
  const top = g.top[0];
  const max = Math.max(1, top?.n ?? 0);
  const n = a.bars.length;
  return (
    <GlanceStrip probe="comps" heading="At a glance" tag="Your comps and your letters" hint="Choose a card to filter the list" loading={loading}
      cells={[
        {
          k: "all", label: "Comps on file", cue: "Show all", pressed: false, onPress: () => onFilter(null),
          figure: g.total,
          line: <><b>{g.books}</b> {g.books === 1 ? "book" : "books"}, <b>{g.screen}</b> film or TV</>,
          foot: <Discs rows={rows} probe="discs-all" />,
        },
        {
          k: "rate", label: "Attachment rate", cue: "Show these ↓", pressed: filter === "sent", onPress: () => onFilter("sent"),
          figure: a.rate === null ? "—" : `${a.rate}%`,
          line: a.sent === 0
            ? <>No queries sent yet</>
            : <><b>{a.logged}</b> of {a.sent} sent {a.sent === 1 ? "query" : "queries"} logged, <b className={not > 0 ? "is-hot" : undefined}>{not}</b> not yet</>,
          foot: (
            <svg className="cv-bars" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" data-cv="bars">
              {a.bars.map((on, i) => (
                <rect key={i} data-cv="rate-bar" data-on={on ? "true" : "false"} x={(i * 100) / n + Math.min(0.9, 30 / n)} y={on ? 14 : 30}
                  width={Math.max(0.4, 100 / n - Math.min(2, 60 / n))} height={on ? 26 : 10} rx={Math.min(1.2, 20 / n)}
                  fill={on ? "#2d3a50" : "rgba(162,69,42,.35)"} />
              ))}
            </svg>
          ),
        },
        {
          k: "used", label: "Most used", cue: "Show these ↓", pressed: false, onPress: () => onFilter("sent"),
          figure: top?.n ?? 0,
          line: top && top.n > 0 ? <>{top.n === 1 ? "query" : "queries"} named <b>{top.title}</b></> : <>No comp has gone out yet</>,
          foot: (
            <div className="cv-rank" data-cv="rank">
              {g.top.map((t, i) => (
                <div key={`${t.title}-${i}`} className={t.n ? undefined : "is-zero"}>
                  <span>{i + 1}</span><span>{t.title}</span><i><b style={{ width: `${(t.n / max) * 100}%` }} /></i><em>{t.n}</em>
                </div>
              ))}
            </div>
          ),
        },
        {
          k: "none", label: "Not in a letter", cue: "Show these ↓", pressed: filter === "none", onPress: () => onFilter("none"),
          figure: g.notInLetter.length,
          line: g.notInLetter.length === 0
            ? <>Every comp is in a letter</>
            : <><b className={g.needFirst > 0 ? "is-hot" : undefined}>{g.needFirst}</b> {g.needFirst === 1 ? "needs" : "need"} a publisher first</>,
          foot: <Discs rows={g.notInLetter} ring probe="discs-none" />,
        },
      ]}
    />
  );
};
