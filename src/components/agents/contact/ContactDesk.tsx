/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v15.2 §2 — THE DESK: three white cards in one row, each with an ink disc icon breaking out of its
 * top-left corner, one line, a month-on-month line and a small chart (a line, a ring, a bar). Its figures come from
 * `lib/contactDesk` (pure); the cards are the shared `shell/desk/DeskCard`.
 *
 * ⚠️ PRESSES: Queried sets the list to "Queried" and scrolls to it; Profiles opens Housekeeping; On file is not pressable.
 * ⚠️ PROFILES' ICON IS LIVE: its ring's filled arc is the real share complete.
 */
import React from "react";
import { BarChart, DeskCard, LineChart, RingChart } from "../../shell/desk/DeskCard";
import type { DeskModel } from "../../../lib/contactDesk";

const ICON = { viewBox: "0 0 64 64", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const HeadIcon: React.FC = () => (
  <svg {...ICON}><circle cx="32" cy="23" r="10.5" /><path d="M12.5 53c2.4-10.2 10.4-16 19.5-16s17.1 5.8 19.5 16" /></svg>
);
const BubbleIcon: React.FC = () => (
  <svg {...ICON}><path d="M10 13h44v28H30l-11 9v-9h-9z" /><path d="M21 24h22M21 31h14" /></svg>
);
/** the completion ring: a 5-unit ring at 18%, its filled arc the real share */
const RingIcon: React.FC<{ share: number }> = ({ share }) => {
  const c = 2 * Math.PI * 22;
  return (
    <svg viewBox="0 0 64 64" fill="none" strokeWidth="5" strokeLinecap="round">
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeOpacity=".18" />
      {share > 0 && <circle data-dk-part="icon-arc" cx="32" cy="32" r="22" stroke="currentColor" strokeDasharray={`${(c * Math.min(1, share)).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 32 32)" />}
    </svg>
  );
};

export const ContactDesk: React.FC<{
  model: DeskModel;
  onQueried: () => void;
  onProfiles: () => void;
}> = ({ model, onQueried, onProfiles }) => {
  const { file, queried, profiles } = model;
  return (
    <div className="cl15-desk dsk-row-grid" data-cl15="desk">
      <DeskCard probe="file" icon={<HeadIcon />} figure={file.figure} rest={file.rest} label={file.label} mom={file.mom}
        chart={<LineChart values={file.trend.values} caption={`${file.trend.startLabel} → now`} />} />
      <DeskCard probe="queried" icon={<BubbleIcon />} figure={queried.figure} rest={queried.rest} label={queried.label} mom={queried.mom}
        onPress={onQueried} pressLabel={`${queried.label}. Show them in the list`}
        chart={<RingChart active={queried.active} closed={queried.closed} total={queried.total} caption="active · closed" />} />
      <DeskCard probe="profiles" icon={<RingIcon share={profiles.pct / 100} />} figure={profiles.figure} rest={profiles.rest} label={profiles.label} mom={profiles.mom}
        onPress={onProfiles} pressLabel={`${profiles.label}. Open Housekeeping`}
        chart={<BarChart pct={profiles.pct} caption={`${profiles.filled} of ${profiles.total}`} />} />
    </div>
  );
};
