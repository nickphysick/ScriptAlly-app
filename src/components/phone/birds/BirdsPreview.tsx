/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye first look v1 §B — TODAY'S PREVIEW: THE NEXT THREE WEEKS (ref `smartPreview()`, "win"), in place of
 * Phone app v5's Birds-eye block (BirdsBlockV5, retired) on the phone's Today page.
 *
 * A white card: "Birds-eye" with "See it all ›"; "The next three weeks"; an axis from a fortnight ago to three weeks
 * ahead with the navy Today pill; up to four rows (lib/birdsPreview `previewPick`: Birds-eye's own order, in the window);
 * "+ N more queries". A tap anywhere opens Birds-eye (which plays the day's first look or fades in); a row opens it and
 * flies to that row (`?fly=<id>`, as search does).
 */
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useV3Data } from "../v3/V3Provider";
import { DEFAULT_QUIET_WEEKS } from "../../../lib/queryState";
import { bandOf, dm } from "../../../lib/birdsWorld";
import { PV_FROM, PV_TO, previewPick, pvPieces, pvSay, pvX } from "../../../lib/birdsPreview";
import { beViewPath } from "../../../lib/phoneV5";
import { bwRowsOf } from "./bwRows";
import "./birdsPreview.css";

export const BirdsPreview: React.FC = () => {
  const v = useV3Data();
  const navigate = useNavigate();
  const now = v.now;
  const quietDays = (v.quietWeeks ?? DEFAULT_QUIET_WEEKS) * 7;
  const rows = useMemo(() => bwRowsOf(v.qs, now), [v.qs, now]);
  const pv = useMemo(() => previewPick(rows, quietDays), [rows, quietDays]);
  const dmd = (d: number) => dm(d, now);
  const open = (id?: string) => navigate(id ? `${beViewPath(null)}&fly=${encodeURIComponent(id)}` : beViewPath(null));
  return (
    <div className="ps-card bwp" data-bwp="card" data-n={pv.rows.length} data-open={pv.open} onClick={() => open()}>
      <div className="bwp-hd">
        <div className="bwp-h" role="heading" aria-level={2}>Birds-eye</div>
        <button type="button" className="bwp-all" data-bwp="all" onClick={(e) => { e.stopPropagation(); open(); }}>See it all ›</button>
      </div>
      <div className="bwp-t">The next three weeks</div>
      {pv.rows.length ? (
        <div className="bwp-w">
          <div className="bwp-ax" data-bwp="axis" data-ps-cap="" aria-hidden="true">
            <span>{dmd(PV_FROM)}</span>
            <b style={{ left: pvX(0) }}>Today</b>
            <span>{dmd(PV_TO)}</span>
          </div>
          <div className="bwp-rows" data-bwp="rows">
            {pv.rows.map((r) => {
              const past = r.due != null && r.due < 0;
              return (
                <button key={r.id} type="button" className="bwp-r" data-bwp="row" data-id={r.id} data-you={r.you ? 1 : 0} data-due={r.due ?? ""}
                  onClick={(e) => { e.stopPropagation(); open(r.id); }}>
                  <b className="bwp-nm">{r.name}</b>
                  <span className="bwp-b" data-ps-cap="" aria-hidden="true">
                    {pvPieces(r, quietDays).map((p, i) => <i key={i} style={{ left: p.l, width: p.w, background: bandOf(p.st) }} />)}
                    <u style={{ left: pvX(0) }} />
                    {past ? <em data-bwp="mark" style={{ left: pvX(r.due!) }}>!</em> : null}
                  </span>
                  <small className="bwp-say" data-ps-cap="">{pvSay(r, dmd)}</small>
                </button>
              );
            })}
          </div>
        </div>
      ) : <p className="bwp-none" data-bwp="none">Nothing due in the next three weeks</p>}
      {pv.more > 0 ? <div className="bwp-more" data-bwp="more" data-n={pv.more}>+ {pv.more} more {pv.more === 1 ? "query" : "queries"}</div> : null}
    </div>
  );
};
