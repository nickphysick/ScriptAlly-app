/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2, Part E — THE EXAMPLE DASHBOARD (ref design-refs/dashboard-first-visit-v2/, screen 16).
 *
 * The real querying dashboard (`Dash58`) over sample data (`lib/dashExample`), under a yellow bar that says it is an
 * example, with "Back to yours". Escape goes back too.
 *
 * ⚠️ IT READS AND WRITES NOTHING OF THE WRITER'S. The data is the sample's; `Dash58`'s `example` flag turns off every
 * side effect it has (the tour, the stamp, the shape memory, the founding card's read), the host's writers are not
 * passed, and the whole page sits in an `inert` wrapper, so every button in it is inert except "Back to yours".
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dash58 } from "../v58/Dash58";
import { EXAMPLE_BACK, EXAMPLE_BAR, exampleData } from "../../../lib/dashExample";

const NONE: never[] = [];
const noop = () => {};

const Eye = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);

export const ExampleDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [now] = useState(() => new Date());
  const data = useMemo(() => exampleData(now), [now]);
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    backRef.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); onBack(); } };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onBack]);
  return (
    <div className="fv2-exdash" data-fv2="example">
      <div className="fv2-exbar" role="status" data-fv2="example-bar">
        <Eye />
        <span className="fv2-exbart">{EXAMPLE_BAR}</span>
        <button ref={backRef} type="button" className="fv2-exback" data-fv2="example-back" onClick={onBack}>{EXAMPLE_BACK}</button>
      </div>
      <div className="fv2-exbody" data-fv2="example-body" {...{ inert: true }}>
        <Dash58
          example
          loading={false}
          queries={data.queries} agents={data.agents} manuscripts={[data.manuscript]} activities={data.activities}
          tasks={NONE} userTasks={NONE} taskFlags={NONE}
          currentUser={data.user} activeManuscript={data.manuscript} onNavigate={noop} now={now}
        />
      </div>
    </div>
  );
};
