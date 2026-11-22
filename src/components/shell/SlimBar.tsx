/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE COLLAPSED HEADER — extracted from Query Centre v156's `QcSlim156` (markup unchanged) for Contact list — QC layout
 * v1.1, so both pages mount one bar: 60px, sticky at the page root's top, taking no space; the title and its subline on
 * the left; a right-hand slot; one navy button. Its ground reaches the sheet's full width (`--qc156-bl` / `--qc156-br`,
 * measured here) with a hairline at its foot; its content stays inset to the page content's edges.
 *
 * ⚠️ THE READER AND THE OFFSET ARE `shell/slimReveal`: shown once the page's header has gone under the bar's line, and
 *    while shown it writes `--pin-cover` on `cover` (its bottom + `extra`), so the page's pinned rows sit under it.
 * ⚠️ HIDDEN IS INERT: `inert` and `aria-hidden` while it is not shown, so its button is not in the Tab order.
 * ⚠️ IT RENDERS THE QUERY CENTRE'S OWN CLASSES (`qc156-slim`, `qc156-st`, `qc156-sa`, `qc156-sb`; qcv156.css §3), whose
 *    rules name `.cl27` beside the Query Centre's page. `QcSlim156` renders through this, byte-identical.
 * ⚠️ THE `data-*` PROBES ARE THE CALLER'S (`hook`).
 */
import React, { useLayoutEffect, useRef } from "react";
import { useSlimReveal } from "./slimReveal";

export interface SlimBarProps {
  /** the probe attribute (`data-qc156`, `data-clq`) */
  hook: `data-${string}`;
  /** the header this bar stands in for, and where the pinned rows read `--pin-cover`, found from the bar */
  header: (row: HTMLElement) => HTMLElement | null | undefined;
  cover: (row: HTMLElement) => HTMLElement | null | undefined;
  extra?: number;
  title: React.ReactNode;
  /** the subline beside the title (its probe value), or none */
  sub?: { node: React.ReactNode; probe: string } | null;
  /** before the button */
  right?: React.ReactNode;
  button: { label: string; onClick: () => void; disabled?: boolean; probe: string };
}

export const SlimBar: React.FC<SlimBarProps> = ({ hook, header, cover, extra = 0, title, sub = null, right = null, button }) => {
  const ref = useRef<HTMLDivElement>(null);
  const h = (v: string) => ({ [hook]: v });
  const shown = useSlimReveal(ref, { header, cover, extra });
  /* the ground's reach: from the page content's edges out to the scroller's (the sheet's) */
  useLayoutEffect(() => {
    const row = ref.current;
    const sc = row?.closest<HTMLElement>(".wpg-scroll");
    if (!row || !sc) return undefined;
    const put = () => {
      const r = row.getBoundingClientRect(), s = sc.getBoundingClientRect();
      row.style.setProperty("--qc156-bl", `${Math.max(0, r.left - s.left)}px`);
      row.style.setProperty("--qc156-br", `${Math.max(0, s.left + sc.clientWidth - r.right)}px`);
    };
    put();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(put);
    ro?.observe(sc);
    window.addEventListener("resize", put);
    return () => { ro?.disconnect(); window.removeEventListener("resize", put); };
  }, []);
  return (
    <div ref={ref} className="qc156-slim" {...h("slim")} data-shown={shown ? "" : undefined}
      inert={!shown || undefined} aria-hidden={!shown || undefined}>
      <p className="qc156-st">
        <b {...h("slim-title")}>{title}</b>
        {sub ? <i {...h(sub.probe)}>{sub.node}</i> : null}
      </p>
      <div className="qc156-sa">
        {right}
        <button type="button" className="qc156-sb" {...h(button.probe)} disabled={button.disabled ?? false} onClick={button.onClick}>{button.label}</button>
      </div>
    </div>
  );
};
