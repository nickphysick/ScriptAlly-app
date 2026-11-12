/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — "SEE ALL N": the pushed page holding v3's grouped task list (the To-do workspace's own groups, offers
 * named apart, housekeeping folded — lib/phoneV3 `todayGroups`). A row opens the task screen, as in v3.
 */
import React, { useState } from "react";
import { useV3Data } from "../v3/V3Provider";
import { V3Glyph } from "../v3/V3Parts";
import { closeV3 } from "../v3/v3Store";
import { PhoneTaskScreen } from "../../todo/phone/PhoneTaskScreen";
import { taskLine } from "../../../lib/phoneV3";
import { V4Page } from "./V4Chrome";
import { Chev, Link4 } from "./V4Parts";
import "./phoneV4.css";

export const TasksPageV4: React.FC = () => {
  const v = useV3Data();
  const [open, setOpen] = useState<string | null>(null);
  const [houseOpen, setHouseOpen] = useState(false);
  return (
    <V4Page title={`Your ${v.ordered.length} ${v.ordered.length === 1 ? "task" : "tasks"}`} onBack={closeV3} pa4="tasks-page">
      <div className="pa4-inset" style={{ paddingTop: 8, paddingBottom: 32 }}>
        {v.groups.length ? v.groups.map((g) => {
          const shut = g.folded && !houseOpen;
          return (
            <React.Fragment key={g.id}>
              <div className="pa4-sec tight" data-pa4="group" data-k={g.id}><h2 className="pa4-h">{g.name} <span className="pa4-s">{g.tasks.length}</span></h2></div>
              <div className="pa4-card" style={{ padding: "0 24px" }} data-pa4="group-card" data-k={g.id}>
                {g.tasks.map((t) => {
                  const q = t.query ? v.byId.get(t.query.id) ?? null : null;
                  return (
                    <button key={t.key} type="button" className="pa4-tap" data-pa4="task" data-key={t.key} hidden={shut} onClick={() => setOpen(t.key)}>
                      <V3Glyph status={t.query?.status ?? null} size={40} label={false} />
                      <span className="pa4-x"><b>{t.title}</b>{taskLine(t, q) ? <span className="pa4-s">{taskLine(t, q)}</span> : null}</span>
                      <Chev />
                    </button>
                  );
                })}
                {g.folded ? <Link4 rule pa4="fold" aria-expanded={!shut} onClick={() => setHouseOpen((o) => !o)}>{shut ? `Show ${g.tasks.length}` : "Fold away"}</Link4> : null}
              </div>
            </React.Fragment>
          );
        }) : <p className="pa4-b pa4-empty" style={{ padding: 24 }}>Nothing needs you today.</p>}
      </div>
      {open ? <PhoneTaskScreen core={v.core} tasks={v.ordered} startKey={open} now={v.now} onClose={() => setOpen(null)} /> : null}
    </V4Page>
  );
};
