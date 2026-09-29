/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Analytics loading cover — the page's own containers at their loaded sizes, placeholders inside.
 *
 * ⚠️ THE FRAMES NEVER MOVE (the Query Centre's rule). The cover renders the same card classes the
 * page does, so when the data lands the placeholders are swapped for content inside boxes that were
 * already the right shape, and nothing below them jumps. `useQcLoad` decides when it shows: never
 * for a load under 150ms, and for at least 400ms once it has.
 */
import React from "react";
import { PageRail } from "../containers/PageRail";

const Sk: React.FC<{ w?: string | number; h: number; style?: React.CSSProperties }> = ({ w = "100%", h, style }) => (
  <span className="anv-sk" style={{ width: w, height: h, ...style }} />
);

export const AnvSkeleton: React.FC = () => (
  <>
    <div className="anv-main" data-anv="main" data-anv-state="skeleton">
      <div data-anv="skeleton" aria-hidden="true">
        <div className="anv-card anv-hero">
          <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 12 }}>
            <Sk w="62%" h={30} /><Sk w="70%" h={30} /><Sk w="30%" h={30} /><Sk w="48%" h={14} style={{ marginTop: 6 }} />
          </div>
        </div>
        <div className="anv-controls"><Sk w={330} h={36} /></div>
        <div className="anv-card" data-anv="journey-sk">
          <div className="anv-cap"><Sk w={180} h={18} /></div>
          <div className="anv-inner anv-jgrid anv-jgrid--sk">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="anv-jstage">
                <div className="anv-jring"><Sk w={80} h={80} style={{ borderRadius: "50%" }} /></div>
                <Sk w={54} h={48} style={{ margin: "0 auto" }} />
                <Sk w="70%" h={11} style={{ margin: "10px auto 0" }} />
                <Sk w="90%" h={40} style={{ margin: "10px auto 0" }} />
                <Sk w="100%" h={36} style={{ marginTop: 12 }} />
              </div>
            ))}
          </div>
        </div>
        <div className="anv-facts"><Sk h={64} /></div>
        <div className="anv-card"><div className="anv-inner"><Sk h={300} /></div></div>
      </div>
    </div>
    <PageRail
      label="The story so far"
      className="anv-rail"
      trayClassName="anv-railtray"
      fill
      dataAttrs={{ "data-anv": "rail" }}
      tray={<h2 className="anv-tw anv-railtitle">The story so far</h2>}
    >
      <div className="anv-railbody" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: "grid", gap: 6, marginBottom: 22 }}>
            <Sk w={70} h={10} /><Sk w="80%" h={15} /><Sk w="55%" h={12} />
          </div>
        ))}
      </div>
    </PageRail>
  </>
);
