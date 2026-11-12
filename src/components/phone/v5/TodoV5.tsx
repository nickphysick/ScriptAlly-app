/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase A — TO DO, the dock's second tab (`/todo` below 768px). For now it holds v4's grouped task list
 * (the To-do workspace's own groups, offers named apart, housekeeping folded — lib/phoneV3 `todayGroups`), which was
 * Today's pushed "See all N" page (TasksPageV4, replaced by this page). A row opens the task screen, as before.
 * Phase D replaces the body with the Up next card (design-refs/phone-app-v5/phone-hub-v5.html `todoPh`).
 *
 * The count in the header is the dock badge's count: `useV3().ordered`, the same array Today's need pill counts.
 */
import React, { useState } from "react";
import { useV3Data } from "../v3/V3Provider";
import { V3Glyph } from "../v3/V3Parts";
import { PhoneTaskScreen } from "../../todo/phone/PhoneTaskScreen";
import { taskLine } from "../../../lib/phoneV3";
import { needWords } from "../../../lib/phoneV41";
import { CAST, Chev, Hero, IconBtn, Link4 } from "../v4/V4Parts";
import { openV3 } from "../v3/v3Store";
import "../v4/phoneV4.css";
import "./phoneV5.css";

export const TodoV5: React.FC = () => {
  const v = useV3Data();
  const [open, setOpen] = useState<string | null>(null);
  const [houseOpen, setHouseOpen] = useState(false);
  const n = v.ordered.length;
  const corner = <IconBtn label="Search" n="search" pa4="search" onClick={() => openV3({ type: "search" })} />;
  return (
    <div className="pa4 pa5 pa5-todo" data-pa5="todo" data-tasks={n}>
      <Hero pa4="todo-hero" kick="To do" head={n ? needWords(n) : "Nothing needs you today."} cast={{ src: CAST.mentor, width: 112 }} corner={corner} />
      <div className="pa4-inset" style={{ paddingTop: 8, paddingBottom: 32 }} data-pa4="tasks-page">
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
        }) : <p className="pa4-b pa4-empty" style={{ padding: 24 }}>That’s everything for today.</p>}
      </div>
      {open ? <PhoneTaskScreen core={v.core} tasks={v.ordered} startKey={open} now={v.now} onClose={() => setOpen(null)} /> : null}
    </div>
  );
};
