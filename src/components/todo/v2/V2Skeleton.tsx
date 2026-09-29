/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The To-do list's loading cover (v2) — the page's OWN containers at their loaded sizes, with
 * placeholders where the words will be, on the Query Centre's clock (`useQcLoad`: nothing for
 * 150ms, the cover for at least 400ms, then one entrance). The frames never move when it lifts:
 * three tiles, the controls row and a column of row cards, each the height its real one renders.
 */
import React from "react";

const Row: React.FC = () => (
  <div className="tdv2-row tdv2-row--sk" aria-hidden="true">
    <span className="tdv2-band tdv2-sk-band" />
    <div className="tdv2-inner">
      <span className="tdv2-sk tdv2-sk--r" style={{ width: 19, height: 19 }} />
      <span className="tdv2-sk-col"><span className="tdv2-sk" style={{ width: 90, height: 12 }} /><span className="tdv2-sk" style={{ width: "70%", height: 17, marginTop: 7 }} /></span>
      <span className="tdv2-sk-col tdv2-sk-agent"><span className="tdv2-sk tdv2-sk--r" style={{ width: 30, height: 30 }} /><span className="tdv2-sk" style={{ width: "60%", height: 12 }} /></span>
      <span className="tdv2-sk-col"><span className="tdv2-sk" style={{ width: 60, height: 9 }} /><span className="tdv2-sk" style={{ width: 96, height: 13, marginTop: 6 }} /></span>
      <span className="tdv2-sk-col tdv2-sk-act"><span className="tdv2-sk" style={{ width: 88, height: 32, borderRadius: 9 }} /></span>
    </div>
  </div>
);

export const V2Skeleton: React.FC = () => (
  <div className="tdv2-skel" data-todo-v2="skeleton" aria-label="Loading your tasks">
    <div className="tdv2-tiles">
      {[0, 1, 2].map((i) => (
        <div key={i} className="tdv2-tile tdv2-tile--sk" aria-hidden="true">
          <span className="tdv2-band tdv2-sk-band" />
          <span className="tdv2-tbody">
            <span className="tdv2-sk tdv2-sk--r" style={{ width: 34, height: 34 }} />
            <span className="tdv2-sk-col"><span className="tdv2-sk" style={{ width: 110, height: 16 }} /><span className="tdv2-sk" style={{ width: 140, height: 10, marginTop: 6 }} /></span>
            <span className="tdv2-sk" style={{ width: 30, height: 31 }} />
          </span>
        </div>
      ))}
    </div>
    <div className="tdv2-controls tdv2-controls--sk" aria-hidden="true">
      <span className="tdv2-sk" style={{ flex: 1, height: 40, borderRadius: 11 }} />
      <span className="tdv2-sk" style={{ width: 86, height: 40, borderRadius: 11 }} />
      <span className="tdv2-sk" style={{ width: 132, height: 40, borderRadius: 11 }} />
      <span className="tdv2-sk" style={{ width: 196, height: 40, borderRadius: 11 }} />
    </div>
    <div className="tdv2-rows">{[0, 1, 2, 3, 4].map((i) => <Row key={i} />)}</div>
  </div>
);
