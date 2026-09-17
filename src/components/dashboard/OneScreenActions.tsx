/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenActions — the quick actions card (dashboard stage 3, 17 Sep).
 *
 * One hero button — Log a new query, with the quill — four quieter actions beneath it, and a foot
 * naming the manuscript being queried and how long that has been going on.
 *
 * ⚠️ EVERY ACTION IS AN EXISTING FLOW, REACHED THE WAY THE SHELL REACHES IT. Log, record and add-agent
 * go through `invokeCapture` — the same capture contracts the sidebar's New menu uses — so the card is
 * a second doorway, never a second door. Smart email drop is the paste flow the Record screen already
 * carries; New package opens the packages page on its Builder tab, because there is no "start a
 * package" action to call — the page's own New package button only scrolls to the builder.
 *
 * ⚠️ DAY N IS ABSENT BEFORE THE FIRST QUERY, NEVER "DAY 0".
 */
import React, { Suspense, useState } from "react";
import { FileText, Folder, Mail, UserPlus, type LucideIcon } from "lucide-react";
import { invokeCapture } from "../shell/railNav";
import { QUICK_ACTIONS_ART, artUrl } from "../../lib/dashArt";
import { QUICK_ACTIONS, type QuickActionKey } from "../../lib/dashActions";
import { OneScreenPanel } from "./OneScreenPanel";

const DashEmailDrop = React.lazy(() => import("./DashEmailDrop"));

const ICON: Record<QuickActionKey, LucideIcon> = { record: Mail, agent: UserPlus, email: FileText, package: Folder };

export const OneScreenActions: React.FC<{
  loading: boolean;
  manuscriptTitle: string | null;
  manuscriptId?: string;
  /** days since this manuscript's first query, that day being day 1; null before it */
  day: number | null;
  isPro: boolean;
  onNavigate: (tab: string, sub?: string) => void;
}> = ({ loading, manuscriptTitle, manuscriptId, day, isPro, onNavigate }) => {
  const [emailOpen, setEmailOpen] = useState(false);
  /* ⚠️ EXHAUSTIVE — an action added to the list does not compile until it says what it does */
  const act = (key: QuickActionKey): void => {
    switch (key) {
      case "record": invokeCapture("record", onNavigate); return;
      case "agent": invokeCapture("agent", onNavigate); return;
      case "email": setEmailOpen(true); return;
      case "package": onNavigate("manuscripts", "New package"); return;
      default: { const unhandled: never = key; void unhandled; }
    }
  };
  return (
    <OneScreenPanel variant="os-qa" probe="quick-actions" loading={loading} skel={["h", "", "", "", ""]} lift={false}>
      <button type="button" className="os-mount os-mount--hero os-qahero" onClick={() => invokeCapture("query", onNavigate)}>
        <span className="os-mount-in os-qahero-in">
          <img
            className="os-qaart"
            src={artUrl(QUICK_ACTIONS_ART)}
            width={QUICK_ACTIONS_ART.width}
            height={QUICK_ACTIONS_ART.height}
            alt=""
            decoding="async"
          />
          <span className="os-qaherot">Log a new query</span>
        </span>
      </button>
      <div className="os-qalist">
        {QUICK_ACTIONS.map((a) => {
          const Icon = ICON[a.key];
          return (
            <button key={a.key} type="button" className="os-qaitem" data-action={a.key} onClick={() => act(a.key)}>
              <Icon className={`os-qaic os-qaic--${a.tone}`} aria-hidden="true" />
              <span>{a.label}</span>
              {/* the paste flow is Pro's; a free writer sees the mark, and the flow explains it */}
              {a.key === "email" && !isPro && <span className="os-protag">Pro</span>}
            </button>
          );
        })}
      </div>
      <div className="os-qafoot" data-probe="quick-actions-foot">
        <span className="os-qaq">
          Querying{manuscriptTitle ? <> <span className="os-qatitle">{manuscriptTitle}</span></> : null}
        </span>
        {day !== null && !loading && <span className="os-qaday" data-probe-text="querying-day">Day {day.toLocaleString("en-GB")}</span>}
      </div>
      {emailOpen && (
        <Suspense fallback={null}>
          <DashEmailDrop
            isPro={isPro}
            manuscriptId={manuscriptId}
            onClose={() => setEmailOpen(false)}
            onNavigate={onNavigate}
          />
        </Suspense>
      )}
    </OneScreenPanel>
  );
};
