/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * #/plans-lab — the Plans page for any viewer, outside the shell (plans v3). Non-production only: App.tsx gates the
 * call site on MODE. `?v=founding|trial|free|pro` (default founding), `&days=N` (trial), `&sell=1` (the selling flag
 * as a test flag — PLANS_ON_SALE itself is untouched).
 */
import React from "react";
import { PlansView, type PlansViewer } from "../PlansPage";

const VIEWERS: PlansViewer[] = ["founding", "trial", "free", "pro"];

export function plansLabParams(hash: string): { viewer: PlansViewer; days: number | null; sell: boolean } {
  const q = new URLSearchParams(hash.split("?")[1] ?? "");
  const v = q.get("v") as PlansViewer | null;
  const d = Number(q.get("days"));
  return { viewer: v && VIEWERS.includes(v) ? v : "founding", days: Number.isFinite(d) && d > 0 ? d : null, sell: q.get("sell") === "1" };
}

export const PlansLab: React.FC<{ hash: string }> = ({ hash }) => {
  const { viewer, days, sell } = plansLabParams(hash);
  return (
    <div className="pl-lab" style={{ height: "100vh", background: "#f2eee8", display: "flex", flexDirection: "column" }}>
      <PlansView key={`${viewer}-${sell}`} viewer={viewer} trialDaysLeft={days} selling={sell} onBack={() => {}} />
    </div>
  );
};
