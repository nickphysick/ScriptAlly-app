/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v153 — THE FILTER RAIL: the framed card in the left column, sticky. A sand header ("Filter", "n on",
 * Reset), then four folding sections: Most used (a radio), Where it stands (four set tiles, then a row per stage),
 * What you sent (checkboxes), More (switches; starts folded). The export of what the list shows sits at its foot.
 *
 * ⚠️ IT IS A PRESENTATION OF THE PAGE'S ONE FILTER STATE (`Qc138Filters`), never a second model: every control writes
 *    through `onFilters`. Counts are faceted (lib/qc153Rail); an option at 0 that is not on fades and cannot be pressed.
 */
import React, { useState } from "react";
import { SENT_NONE, type Qc138Filters } from "../../../lib/qc138";
import { QUICK_PICKS, STAND_ROWS, exportLabel, standOn, toggleStand } from "../../../lib/qc140";
import { WHERE_KEYS, WHERE_LABEL } from "../../../lib/qcSummary";
import { MORE_ROWS_153, pickQuick, quickOn, railOn, type RailCounts } from "../../../lib/qc153Rail";
import { StageGlyph } from "./StageGlyph";
import "../../containers/framedSlip.css";
import "./qcv153.css";

export interface RailSent { key: string; name: string; line?: string }
export interface QcRail153Props {
  filters: Qc138Filters;
  onFilters: (f: Qc138Filters) => void;
  counts: RailCounts;
  sent: readonly RailSent[];
  onReset: () => void;
  /** the export of exactly what the list shows */
  showing: number;
  total: number;
  onExport: () => void;
  loading?: boolean;
}

const glyphKey = (k: string) => (k === "rj" ? "cl" : k) as Parameters<typeof StageGlyph>[0]["k"];
type Sec = "quick" | "where" | "sent" | "more";

export const QcRail153: React.FC<QcRail153Props> = ({ filters: f, onFilters, counts, sent, onReset, showing, total, onExport, loading = false }) => {
  const [open, setOpen] = useState<Record<Sec, boolean>>({ quick: true, where: true, sent: true, more: false });
  const on = railOn(f);
  const filtered = on > 0;
  const head = (k: Sec, title: string) => (
    <h3 className="qc153-rh5">
      <button type="button" aria-expanded={open[k]} data-qc153="rail-fold" data-k={k} onClick={() => setOpen((o) => ({ ...o, [k]: !o[k] }))}>
        {title}<i aria-hidden="true">⌄</i>
      </button>
    </h3>
  );
  const standMax = Math.max(1, ...STAND_ROWS.map((r) => counts.stand[r.key] ?? 0));
  return (
    <aside className="qc153-rail sa-slip" aria-label="Filter queries" data-qc153="rail">
      <div className="sa-slip-in">
        <div className="qc153-rbd" data-qc153="rail-head">
          <b>Filter</b>
          {on > 0 ? <span className="qc153-ron" data-qc153="rail-on">{on} on</span> : null}
          <button type="button" className="qc153-rst" data-qc153="rail-reset" disabled={!filtered || loading} onClick={onReset}>Reset</button>
        </div>

        <section className={`qc153-rsec${open.quick ? " is-open" : ""}`} data-qc153="rail-sec" data-k="quick">
          {head("quick", "Most used")}
          {open.quick ? (
            <div className="qc153-rbody" role="radiogroup" aria-label="Most used">
              {QUICK_PICKS.map((p) => {
                const isOn = quickOn(f, p.key);
                const n = counts.quick[p.key] ?? 0;
                return (
                  <button key={p.key} type="button" role="radio" aria-checked={isOn} className={`qc153-fr${isOn ? " is-on" : ""}${!isOn && n === 0 ? " is-zero" : ""}`}
                    data-qc153="quick" data-k={p.key} data-n={n} disabled={loading || (!isOn && n === 0)} onClick={() => onFilters(pickQuick(f, p.key))}>
                    <span className="qc153-rd" aria-hidden="true" />
                    <span className="qc153-tx">{p.title}<small>{p.line}</small></span>
                    <span className="qc153-n">{n}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className={`qc153-rsec${open.where ? " is-open" : ""}`} data-qc153="rail-sec" data-k="where">
          {head("where", "Where it stands")}
          {open.where ? (
            <div className="qc153-rbody">
              <div className="qc153-courts" role="radiogroup" aria-label="Who it's with">
                {WHERE_KEYS.map((k) => {
                  const isOn = f.where === k;
                  const n = counts.where[k] ?? 0;
                  return (
                    <button key={k} type="button" role="radio" aria-checked={isOn} className={`qc153-court${isOn ? " is-on" : ""}${!isOn && n === 0 ? " is-zero" : ""}`}
                      data-qc153="court" data-k={k} data-n={n} title={WHERE_LABEL[k].title} disabled={loading || (!isOn && n === 0)}
                      onClick={() => onFilters({ ...f, where: isOn ? null : k })}>
                      <b>{n}</b><span>{WHERE_LABEL[k].label}</span>
                    </button>
                  );
                })}
              </div>
              {STAND_ROWS.map((row) => {
                const isOn = standOn(f, row);
                const n = counts.stand[row.key] ?? 0;
                return (
                  <button key={row.key} type="button" aria-pressed={isOn} className={`qc153-fr${isOn ? " is-on" : ""}${!isOn && n === 0 ? " is-zero" : ""}`}
                    data-qc153="stand" data-k={row.key} data-n={n} disabled={loading || (!isOn && n === 0)} onClick={() => onFilters(toggleStand(f, row))}>
                    <span className="qc153-gl" aria-hidden="true"><StageGlyph k={glyphKey(row.key)} ring="peek" /></span>
                    <span className="qc153-tx">{row.label}</span>
                    <span className="qc153-pbar" aria-hidden="true"><i style={{ width: `${Math.round((n / standMax) * 100)}%` }} /></span>
                    <span className="qc153-n">{n}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className={`qc153-rsec${open.sent ? " is-open" : ""}`} data-qc153="rail-sec" data-k="sent">
          {head("sent", "What you sent")}
          {open.sent ? (
            <div className="qc153-rbody">
              {sent.map((o) => {
                const isOn = f.sent.includes(o.key);
                const n = counts.sent[o.key] ?? 0;
                return (
                  <button key={o.key} type="button" role="checkbox" aria-checked={isOn} className={`qc153-fr${isOn ? " is-on" : ""}${!isOn && n === 0 ? " is-zero" : ""}`}
                    data-qc153="sent" data-k={o.key === SENT_NONE ? "none" : o.key} data-n={n} title={o.line} disabled={loading || (!isOn && n === 0)}
                    onClick={() => onFilters({ ...f, sent: isOn ? f.sent.filter((x) => x !== o.key) : [...f.sent, o.key] })}>
                    <span className="qc153-ckb" aria-hidden="true" />
                    <span className="qc153-tx">{o.name}</span>
                    <span className="qc153-n">{n}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className={`qc153-rsec${open.more ? " is-open" : ""}`} data-qc153="rail-sec" data-k="more">
          {head("more", "More")}
          {open.more ? (
            <div className="qc153-rbody">
              {MORE_ROWS_153.map((r) => {
                const isOn = f[r.key];
                const n = counts.more[r.key] ?? 0;
                return (
                  <button key={r.key} type="button" role="switch" aria-checked={isOn} className={`qc153-fr qc153-fr--sw${isOn ? " is-on" : ""}${!isOn && n === 0 ? " is-zero" : ""}`}
                    data-qc153="more" data-k={r.key} data-n={n} disabled={loading || (!isOn && n === 0)} onClick={() => onFilters({ ...f, [r.key]: !isOn })}>
                    <span className="qc153-tx">{r.label}</span>
                    <span className="qc153-n">{n}</span>
                    <span className="qc153-sw2" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        <div className="qc153-rft" data-qc153="rail-foot">
          <button type="button" className="qc153-exp" data-qc153="export" disabled={loading || showing === 0} onClick={onExport}>{exportLabel(showing, total, showing !== total)}</button>
        </div>
      </div>
    </aside>
  );
};
