/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v15 §3 — THE DESK: three ledger cards in one row, replacing v13's numbers strip. Its figures come from
 * `lib/contactDesk` (pure); the cards are the shared `shell/desk/DeskCard`.
 *
 * ⚠️ PRESSES (§3): Queried sets the list to "Queried" and scrolls to it; Profiles complete opens Housekeeping; On file is
 *    not pressable.
 * ⚠️ TITLES ARE INK; each card's colour shows only in its icon circle, stamp and chart (§1.6).
 */
import React from "react";
import { DeskCard, HatchedTrend, ProgressChart, WeekBarChart } from "../../shell/desk/DeskCard";
import type { DeskModel } from "../../../lib/contactDesk";

/** the cards' colours and their 12%-on-white tints, pre-computed */
const INK = { c: "#2a3a52", t: "#e5e7ea" };
const BLUE = { c: "#2f5f86", t: "#e6ecf1" };
const TERRA = { c: "#a0633f", t: "#f4ece8", c2: "#b4744f" };

const HeadIcon: React.FC = () => (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="9" cy="6.5" r="3" /><path d="M3.5 15.5c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
  </svg>
);
const BubbleIcon: React.FC = () => (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5v6a1.5 1.5 0 0 1-1.5 1.5H8l-3.5 3v-3h0A1.5 1.5 0 0 1 3 10.5z" />
  </svg>
);
/** the completion ring, partly filled to the share complete */
const RingIcon: React.FC<{ share: number }> = ({ share }) => {
  const r = 6, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 18 18" fill="none" strokeWidth="2.2">
      <circle cx="9" cy="9" r={r} stroke="currentColor" opacity=".25" />
      <circle cx="9" cy="9" r={r} stroke="currentColor" strokeDasharray={`${c * Math.min(1, Math.max(0, share))} ${c}`} transform="rotate(-90 9 9)" strokeLinecap="round" />
    </svg>
  );
};

export const ContactDesk: React.FC<{
  model: DeskModel;
  onQueried: () => void;
  onProfiles: () => void;
}> = ({ model, onQueried, onProfiles }) => {
  const { file, queried, profiles } = model;
  const share = profiles.bar.total ? profiles.bar.filled / profiles.bar.total : 0;
  return (
    <div className="cl15-desk dsk-row-grid" data-cl15="desk">
      <DeskCard probe="file" title={file.title} icon={<HeadIcon />} colour={INK.c} tint={INK.t}
        stamp={file.stamp} big={file.big} small={file.small} rows={file.rows}
        chart={<HatchedTrend values={file.trend.values} startLabel={file.trend.startLabel}
          label={`Agents on file at each month end since ${file.trend.startLabel}: ${file.trend.values.join(", ")}`} />} />
      <DeskCard probe="queried" title={queried.title} icon={<BubbleIcon />} colour={BLUE.c} tint={BLUE.t}
        stamp={queried.stamp} big={queried.big} small={queried.small} rows={queried.rows}
        onPress={onQueried} pressLabel={`Queried: ${queried.big} ${queried.small}. Show them in the list`}
        chart={<WeekBarChart values={queried.bars.values} startLabel={queried.bars.startLabel} middle="Queries per week"
          label={`Queries sent per week since ${queried.bars.startLabel}: ${queried.bars.values.join(", ")}`} />} />
      <DeskCard probe="profiles" title={profiles.title} icon={<RingIcon share={share} />} colour={TERRA.c} tint={TERRA.t} colour2={TERRA.c2}
        stamp={profiles.stamp} big={profiles.big} small={profiles.small} rows={profiles.rows}
        onPress={onProfiles} pressLabel={`Profiles complete: ${profiles.big}. Open Housekeeping`}
        chart={<ProgressChart filled={profiles.bar.filled} total={profiles.bar.total} label={profiles.bar.label} />} />
    </div>
  );
};
